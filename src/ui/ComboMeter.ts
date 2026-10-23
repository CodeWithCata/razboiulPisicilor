/** @file The combo counter on the HUD (right side): multiplier, kills in a row and a time bar that drains. */
import Phaser from 'phaser';
import { COMBO } from '../config/combo';
import { GAME } from '../config/balance';
import { FONT } from '../config/style';
import { COMBO_TEXT } from '../content/lines';
import type { ComboPayload } from '../core/events';

/** Shows from `COMBO.showFrom` kills, shakes red and hides when the chain breaks. `update` drains the bar between events. */
export class ComboMeter {
  private readonly mult: Phaser.GameObjects.Text;
  private readonly count: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly x: number;
  private readonly y: number;
  private remainingMs = 0;
  private windowMs = 1;
  private frozen = false;
  private color = 0xfff3d6;
  private active = false;
  private breakLeftMs = 0;
  /** Time left of the tier shake and how hard it is (px); 0 = still. */
  private shakeLeftMs = 0;
  private shakePx = 0;

  constructor(private readonly scene: Phaser.Scene, touch: boolean) {
    const H = COMBO.hud;
    this.x = GAME.width - H.right;
    this.y = touch ? H.touchY : H.y;
    const style = { fontFamily: FONT, color: '#fff3d6', stroke: '#1b2340' };
    this.mult = scene.add.text(this.x, this.y, '', { ...style, fontSize: `${H.multSize}px`, strokeThickness: 6 }).setOrigin(1, 0).setVisible(false);
    this.count = scene.add.text(this.x, this.y + H.multSize + 4, '', { ...style, fontSize: `${H.countSize}px`, strokeThickness: 4 }).setOrigin(1, 0).setVisible(false);
    this.bar = scene.add.graphics().setVisible(false);
  }

  /** `Events.ComboChanged`. */
  set(p: ComboPayload): void {
    this.remainingMs = p.remainingMs;
    this.windowMs = Math.max(1, p.windowMs);
    this.frozen = p.frozen;
    if (p.count === 0) {
      if (p.broken) this.breakLeftMs = COMBO.hud.breakMs;
      else this.hide();
      this.active = false;
      return;
    }
    if (p.count < COMBO.showFrom) return;
    const css = p.color;
    this.color = Phaser.Display.Color.HexStringToColor(css).color;
    this.active = true;
    this.breakLeftMs = 0;
    this.mult.setText(`${COMBO_TEXT.label} x${p.multiplier}`).setColor(css).setVisible(true).setX(this.x);
    this.count.setText(`${p.count} ${COMBO_TEXT.kills}`).setVisible(true).setX(this.x);
    this.bar.setVisible(true);
    if (p.tierUp) this.tierPop(p.multiplier);
    else this.scene.tweens.add({ targets: this.mult, scale: { from: COMBO.hud.popFromScale, to: 1 }, duration: COMBO.hud.popMs });
    this.draw();
  }

  /** A new tier: the counter pops bigger and shakes, both stronger the higher the multiplier (1.5 = weakest, 5 = strongest). */
  private tierPop(multiplier: number): void {
    const H = COMBO.hud;
    const T = H.tierPop;
    const strength = Phaser.Math.Clamp((multiplier - 1) / 4, 0, 1);
    this.scene.tweens.killTweensOf([this.mult, this.count]);
    this.scene.tweens.add({ targets: this.mult, scale: { from: H.popFromScale + T.extraScale * strength, to: 1 }, duration: T.ms, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.count, scale: { from: 1 + (T.extraScale * strength) / 2, to: 1 }, duration: T.ms, ease: 'Back.easeOut' });
    this.shakeLeftMs = T.shakeMs;
    this.shakePx = T.shakePx * (0.4 + 0.6 * strength);
  }

  /** Shake the counter while a tier shake runs: it fades out, and the text goes back to its place when it ends. */
  private shakeStep(delta: number): void {
    if (this.shakeLeftMs <= 0) return;
    const T = COMBO.hud.tierPop;
    this.shakeLeftMs = Math.max(0, this.shakeLeftMs - delta);
    const fade = this.shakeLeftMs / T.shakeMs;
    const t = this.shakeLeftMs / 1000;
    const dx = Math.sin(t * T.shakeHz * Math.PI * 2) * this.shakePx * fade;
    const dy = Math.cos(t * T.shakeHz * 1.3 * Math.PI * 2) * this.shakePx * 0.5 * fade;
    this.mult.setPosition(this.x + dx, this.y + dy);
    this.count.setPosition(this.x - dx * 0.6, this.y + COMBO.hud.multSize + 4 - dy * 0.6);
  }

  update(delta: number): void {
    this.shakeStep(delta);
    if (this.breakLeftMs > 0) {
      this.shakeLeftMs = 0;
      this.breakLeftMs -= delta;
      this.mult.setColor('#ff5a5a').setX(this.x + Math.sin(this.breakLeftMs * 0.08) * 4);
      this.mult.setText(COMBO_TEXT.broken);
      this.count.setVisible(false);
      this.bar.setVisible(false);
      if (this.breakLeftMs <= 0) this.hide();
      return;
    }
    if (!this.active) return;
    if (!this.frozen) this.remainingMs = Math.max(0, this.remainingMs - delta);
    this.draw();
  }

  private hide(): void {
    this.shakeLeftMs = 0;
    this.mult.setVisible(false).setPosition(this.x, this.y);
    this.count.setVisible(false).setPosition(this.x, this.y + COMBO.hud.multSize + 4);
    this.bar.setVisible(false);
  }

  private draw(): void {
    const H = COMBO.hud;
    const share = Phaser.Math.Clamp(this.remainingMs / this.windowMs, 0, 1);
    const top = this.y + H.multSize + H.countSize + 12;
    this.bar.clear();
    this.bar.fillStyle(0x1b2340, 0.8).fillRoundedRect(this.x - H.barW, top, H.barW, H.barH, H.barH / 2);
    if (share > 0) this.bar.fillStyle(share < 0.25 ? 0xff5a5a : this.color, 1).fillRoundedRect(this.x - H.barW, top, H.barW * share, H.barH, H.barH / 2);
  }
}
