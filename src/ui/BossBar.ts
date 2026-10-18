import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { HUD } from '../config/hud';
import { COLORS, FONT, css } from '../config/style';

/**
 * The boss's health (HUD, top center). Slides in when the boss appears and out when it falls.
 * The fill follows the real health smoothly; a pale "just lost" chunk drains after a short hold (like Varu's meter).
 * A hit flashes the bar white and jolts it. A notch marks where phase 2 starts, and in phase 2 the bar changes color and breathes.
 * Numbers: HUD.boss in config/hud.ts.
 */
export class BossBar {
  private readonly box: Phaser.GameObjects.Container;
  private readonly deco: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private leaveTimer: Phaser.Time.TimerEvent | null = null;
  private active = false;
  /** The real health, 0..1. */
  private target = 1;
  /** What the fill shows: follows `target`. */
  private fill = 1;
  /** The pale chunk: never below `fill`, drains slowly after a hold. */
  private ghost = 1;
  private ghostHoldMs = 0;
  private hitMs = 0;
  private pulseMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const b = HUD.boss;
    this.deco = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.name = scene.add
      .text(0, b.nameY, '', { fontFamily: FONT, fontSize: `${b.nameSize}px`, color: '#ffffff', stroke: css(COLORS.navy), strokeThickness: 5 })
      .setOrigin(0.5, 0);
    this.box = scene.add.container(GAME.width / 2, 0, [this.deco, this.bar, this.name]).setVisible(false);
  }

  /** A boss appeared: set the name and health, slide in. */
  show(name: string, hp: number, maxHp: number): void {
    const b = HUD.boss;
    this.leaveTimer?.remove();
    this.scene.tweens.killTweensOf(this.box);
    this.active = true;
    this.target = this.fill = this.ghost = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.ghostHoldMs = this.hitMs = this.pulseMs = 0;
    this.name.setText(name);
    this.drawDeco();
    this.box.setVisible(true).setPosition(GAME.width / 2, b.slideFromY).setAlpha(0);
    this.scene.tweens.add({ targets: this.box, y: 0, alpha: 1, duration: b.slideInMs, ease: 'Back.easeOut' });
    this.draw();
  }

  /** The boss took damage (or healed). */
  setHealth(hp: number, maxHp: number): void {
    if (!this.active) return;
    const b = HUD.boss;
    const next = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    if (next < this.target) {
      this.hitMs = b.hitFlashMs;
      this.ghostHoldMs = b.ghostHoldMs;
    }
    this.target = next;
  }

  /** The boss fell: the bar empties, rests a moment, then slides away. */
  defeat(): void {
    if (!this.active) return;
    const b = HUD.boss;
    this.target = 0;
    this.ghostHoldMs = b.ghostHoldMs;
    this.leaveTimer?.remove();
    this.leaveTimer = this.scene.time.delayedCall(b.defeatHoldMs, () => {
      this.scene.tweens.add({
        targets: this.box,
        y: b.slideFromY,
        alpha: 0,
        duration: b.slideOutMs,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.active = false;
          this.box.setVisible(false);
        },
      });
    });
  }

  update(delta: number): void {
    if (!this.active) return;
    const b = HUD.boss;
    this.fill += (this.target - this.fill) * (1 - Math.exp(-delta / b.fillCatchUpMs));
    if (Math.abs(this.target - this.fill) < 0.0005) this.fill = this.target;
    if (this.ghost < this.fill) this.ghost = this.fill;
    else if (this.ghostHoldMs > 0) this.ghostHoldMs -= delta;
    else this.ghost = Math.max(this.fill, this.ghost - (b.ghostDrainPerSec * delta) / 1000);
    this.hitMs = Math.max(0, this.hitMs - delta);
    this.pulseMs += delta;
    // A hit jolts the whole bar sideways, less and less.
    this.box.x = GAME.width / 2 + (this.hitMs > 0 ? (Math.random() * 2 - 1) * b.hitShake * (this.hitMs / b.hitFlashMs) : 0);
    this.draw();
  }

  private draw(): void {
    const b = HUD.boss;
    const g = this.bar;
    const left = -b.barW / 2;
    const rect = (x: number, w: number, y: number = b.barY, h: number = b.barH, r: number = b.radius): void => {
      g.fillRoundedRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    };
    g.clear();

    // Frame and empty track.
    g.fillStyle(COLORS.navy, 0.92);
    g.fillRoundedRect(left - b.frame, b.barY - b.frame, b.barW + b.frame * 2, b.barH + b.frame * 2, b.frameRadius);
    g.lineStyle(2, COLORS.gold, 0.6).strokeRoundedRect(left - b.frame, b.barY - b.frame, b.barW + b.frame * 2, b.barH + b.frame * 2, b.frameRadius);
    g.fillStyle(b.trackColor, 1);
    rect(left, b.barW);

    // What was just lost.
    if (this.ghost > this.fill) {
      g.fillStyle(b.ghostColor, 0.9);
      rect(left, Math.max(b.minW, b.barW * this.ghost));
    }

    // The health itself, with a lighter strip on top and a darker one underneath so it looks chunky.
    if (this.fill > 0.001) {
      const w = Math.max(b.minW, b.barW * this.fill);
      const phase2 = this.target <= b.lowAt;
      g.fillStyle(phase2 ? b.lowColor : b.color, 1);
      rect(left, w);
      if (w > 14) {
        g.fillStyle(COLORS.white, 0.3);
        rect(left + 3, w - 6, b.barY + 2, b.barH * 0.32, b.radius / 2);
        g.fillStyle(0x000000, 0.16);
        rect(left + 3, w - 6, b.barY + b.barH * 0.72, b.barH * 0.22, b.radius / 2);
      }
      if (phase2) {
        g.fillStyle(COLORS.white, b.pulseBright * (0.5 + 0.5 * Math.sin((this.pulseMs / b.pulseMs) * Math.PI * 2)));
        rect(left, w);
      }
      if (this.hitMs > 0) {
        g.fillStyle(COLORS.white, 0.85 * (this.hitMs / b.hitFlashMs));
        rect(left, w);
      }
    }

    // The phase 2 notch.
    g.fillStyle(COLORS.navy, 1).fillRect(left + b.barW * b.lowAt - 1.5, b.barY - 1, 3, b.barH + 2);

  }

  /** Short gold lines with a diamond on each side of the name. */
  private drawDeco(): void {
    const b = HUD.boss;
    const y = b.nameY + b.nameSize * 0.6;
    const inner = this.name.width / 2 + 14;
    this.deco.clear();
    this.deco.lineStyle(3, COLORS.gold, 0.75);
    for (const side of [-1, 1]) {
      this.deco.lineBetween(side * inner, y, side * (inner + b.nameLineW), y);
      this.deco.fillStyle(COLORS.gold, 1).fillPoints(
        [new Phaser.Math.Vector2(side * inner, y - 5), new Phaser.Math.Vector2(side * (inner - 6), y), new Phaser.Math.Vector2(side * inner, y + 5), new Phaser.Math.Vector2(side * (inner + 6), y)],
        true,
      );
    }
  }
}
