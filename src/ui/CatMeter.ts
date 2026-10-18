import Phaser from 'phaser';
import { poly } from '../assets/paint';
import { CAT_METER as C } from '../config/catMeter';
import { PLAYER } from '../config/balance';
import { FONT } from '../config/style';
import { superEllipse, type Pt } from '../core/polyClip';

type Mood = 'happy' | 'worried' | 'scared' | 'dead';

const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [-x, y]);

/** The face's shapes, built once. */
const HEAD: Pt[] = superEllipse(0, C.head.cy, C.head.halfW, C.head.halfH, C.head.roundness, C.head.segments);
const EARS: Pt[][] = [C.ear.outer as unknown as Pt[], mirror(C.ear.outer as unknown as Pt[])];
const EAR_INNERS: Pt[][] = [C.ear.inner as unknown as Pt[], mirror(C.ear.inner as unknown as Pt[])];
const MUZZLE: Pt[] = superEllipse(0, C.mask.muzzle.cy, C.mask.muzzle.halfW, C.mask.muzzle.halfH, 2, 24);
const BRIDGE: Pt[] = C.mask.bridge as unknown as Pt[];
const SILHOUETTE: Pt[][] = [HEAD, ...EARS];
const OUTLINE_SHIFTS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/**
 * Varu's health (HUD, top left): a Siamese cat face, a heart and a health bar.
 * The bar shows the health (green, then yellow, then red). A pale chunk shows what was just lost and drains after a moment.
 * The face shows the mood (happy, worried, scared), blinks now and then, flashes and shrinks when hit, pops when healed.
 * Drawn in code on purpose, like the rest of the characters: real art can replace it later.
 */
export class CatMeter {
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  /** The real health, 0..1. */
  private target = 1;
  /** What the bar fill shows: follows `target` quickly. */
  private fill = 1;
  /** The pale "just lost" chunk: never below `fill`, drains slowly after a short hold. */
  private ghost = 1;
  private ghostHoldMs = 0;
  private hurtMs = 0;
  private healMs = 0;
  private blinkUntil = 0;
  private nextBlinkAt = 0;
  private clock = 0;

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.graphics();
    this.face = scene.add.graphics({ x: C.x, y: C.y });
    this.label = scene.add
      .text(C.bar.x + C.bar.w / 2, C.bar.y + C.bar.h / 2, '', {
        fontFamily: FONT,
        fontSize: `${C.bar.label.size}px`,
        color: '#ffffff',
        stroke: '#1b2340',
        strokeThickness: C.bar.label.strokeThickness,
      })
      .setOrigin(0.5);
    this.label.setText(String(PLAYER.maxHp));
    this.nextBlinkAt = this.randomBlinkGap();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
    this.draw();
  }

  /** Call whenever Varu's health changes. */
  setHealth(hp: number, maxHp: number): void {
    const next = Phaser.Math.Clamp(hp / Math.max(maxHp, 1), 0, 1);
    if (next > this.target) this.healMs = C.heal.ms;
    if (next < this.target) {
      this.ghost = Math.max(this.ghost, this.fill);
      this.ghostHoldMs = C.bar.ghostHoldMs;
    }
    this.target = next;
    this.label.setText(String(Math.ceil(Math.max(hp, 0))));
  }

  /** Varu got hit: flash white, shake and shrink for a moment. */
  hurt(): void {
    this.hurtMs = C.hurt.ms;
  }

  private update(_time: number, delta: number): void {
    this.clock += delta;
    this.fill = this.ease(this.fill, this.target, C.bar.fillEasePerMs, delta);
    this.ghostHoldMs = Math.max(0, this.ghostHoldMs - delta);
    if (this.ghost < this.fill) this.ghost = this.fill;
    else if (this.ghostHoldMs <= 0) this.ghost = this.ease(this.ghost, this.fill, C.bar.ghostEasePerMs, delta);
    this.hurtMs = Math.max(0, this.hurtMs - delta);
    this.healMs = Math.max(0, this.healMs - delta);
    if (this.clock >= this.nextBlinkAt) {
      this.blinkUntil = this.clock + C.blink.holdMs;
      this.nextBlinkAt = this.blinkUntil + this.randomBlinkGap();
    }
    this.draw();
  }

  private ease(from: number, to: number, perMs: number, delta: number): number {
    const next = from + (to - from) * (1 - Math.exp(-perMs * delta));
    return Math.abs(to - next) < 0.002 ? to : next;
  }

  private randomBlinkGap(): number {
    return Phaser.Math.Between(C.blink.minMs, C.blink.maxMs);
  }

  private mood(): Mood {
    if (this.target <= 0) return 'dead';
    if (this.target >= C.happyAt) return 'happy';
    if (this.target >= C.worriedAt) return 'worried';
    return 'scared';
  }

  private draw(): void {
    const g = this.face;
    const hurt = this.hurtMs / C.hurt.ms;
    const heal = this.healMs / C.heal.ms;
    const mood = this.mood();
    const shake = hurt > 0 ? Phaser.Math.FloatBetween(-C.hurt.shakePx, C.hurt.shakePx) * hurt : 0;

    g.clear();
    g.setScale(C.scale * (1 - C.hurt.shrink * hurt + C.heal.grow * Math.sin(heal * Math.PI)));
    g.setPosition(C.x + shake, C.y);
    this.drawBody(g, hurt, mood);
    this.drawFace(g, mood);

    this.drawBar(shake, hurt, heal, mood);
  }

  // ---- The bar ----

  private barColor(): number {
    if (this.fill >= C.happyAt) return C.colors.barHigh;
    if (this.fill >= C.worriedAt) return C.colors.barMid;
    return C.colors.barLow;
  }

  private drawBar(shake: number, hurt: number, heal: number, mood: Mood): void {
    const b = C.bar;
    const g = this.bar;
    const x = b.x + shake;
    const pulse = 0.5 + 0.5 * Math.sin((this.clock / C.dangerPulseMs) * Math.PI * 2);
    g.clear();

    g.fillStyle(C.colors.outline, 1);
    g.fillRoundedRect(x - b.frame, b.y - b.frame, b.w + b.frame * 2, b.h + b.frame * 2, b.frameRadius);
    g.fillStyle(C.colors.track, 1);
    g.fillRoundedRect(x, b.y, b.w, b.h, b.radius);

    if (this.ghost > this.fill) {
      g.fillStyle(C.colors.ghost, 1);
      this.fillBarPart(g, x, this.ghost);
    }

    if (this.fill > 0) {
      g.fillStyle(this.barColor(), 1);
      const w = this.fillBarPart(g, x, this.fill);
      if (w > 6) {
        g.fillStyle(C.colors.flash, b.shineAlpha);
        g.fillRoundedRect(x + 3, b.y + 2, w - 6, b.h * b.shineShare, Math.min(b.radius - 3, (w - 6) / 2));
      }
      if (hurt > 0) {
        g.fillStyle(C.colors.flash, C.hurt.flashAlpha * hurt);
        this.fillBarPart(g, x, this.fill);
      }
      if (mood === 'scared') {
        g.fillStyle(C.colors.flash, C.dangerAlpha * pulse * 0.8);
        this.fillBarPart(g, x, this.fill);
      }
    }

    // Dividers on top, so the bar looks like a meter.
    g.lineStyle(b.tickW, C.colors.outline, b.tickAlpha);
    for (let i = 1; i < b.segments; i++) {
      const tx = x + (b.w * i) / b.segments;
      g.lineBetween(tx, b.y + 1, tx, b.y + b.h - 1);
    }

    const beat = mood === 'scared' ? C.heart.beatGrow * Math.max(0, Math.sin((this.clock / C.heart.beatMs) * Math.PI * 2)) : 0;
    const pop = C.heal.grow * Math.sin(heal * Math.PI);
    this.drawHeart(g, C.heart.x + shake, C.heart.y, C.heart.size * (1 + beat + pop), mood === 'dead' ? C.colors.heartEmpty : C.colors.heart);
  }

  /** Fill the bar from its left end up to `ratio` (rounded ends). Returns the width drawn. */
  private fillBarPart(g: Phaser.GameObjects.Graphics, x: number, ratio: number): number {
    const b = C.bar;
    const w = Math.max(b.minW, b.w * ratio);
    g.fillRoundedRect(x, b.y, w, b.h, Math.min(b.radius, w / 2));
    return w;
  }

  private drawHeart(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number): void {
    const parts = (dx: number, dy: number) => {
      g.fillCircle(cx + dx - s * 0.5, cy + dy - s * 0.3, s * 0.58);
      g.fillCircle(cx + dx + s * 0.5, cy + dy - s * 0.3, s * 0.58);
      g.fillPoints(poly([[cx + dx - s * 1.05, cy + dy - s * 0.1], [cx + dx + s * 1.05, cy + dy - s * 0.1], [cx + dx, cy + dy + s * 1.05]]), true);
    };
    const r = C.heart.outlineReach;
    g.fillStyle(C.colors.outline, 1);
    for (const [ox, oy] of OUTLINE_SHIFTS) parts(ox * r, oy * r);
    g.fillStyle(color, 1);
    parts(0, 0);
    if (color === C.colors.heart) {
      g.fillStyle(C.colors.heartShine, 1);
      g.fillCircle(cx - s * 0.62, cy - s * 0.48, s * 0.2);
    }
  }

  // ---- The face ----

  private drawBody(g: Phaser.GameObjects.Graphics, hurt: number, mood: Mood): void {
    const r = C.outlineReach;
    g.fillStyle(C.colors.outline, 1);
    for (const [dx, dy] of OUTLINE_SHIFTS) {
      for (const shape of SILHOUETTE) g.fillPoints(poly(shape.map(([x, y]) => [x + dx * r, y + dy * r] as const)), true);
    }

    g.fillStyle(C.colors.fur, 1);
    g.fillPoints(poly(HEAD), true);
    g.fillStyle(C.colors.earOuter, 1);
    for (const ear of EARS) g.fillPoints(poly(ear), true);
    g.fillStyle(C.colors.earInner, 1);
    for (const ear of EAR_INNERS) g.fillPoints(poly(ear), true);

    // The dark Siamese mask: rings around the eyes, the nose bridge and the muzzle.
    g.fillStyle(C.colors.mask, 1);
    for (const side of [-1, 1]) g.fillCircle(side * C.eyes.x, C.eyes.y, C.mask.eyeRing);
    g.fillPoints(poly(BRIDGE), true);
    g.fillPoints(poly(MUZZLE), true);

    // Hit flash (white) and, when health is low, a red pulse over the whole face.
    if (hurt > 0) this.tint(g, C.colors.flash, C.hurt.flashAlpha * hurt);
    if (mood === 'scared') {
      const pulse = 0.5 + 0.5 * Math.sin((this.clock / C.dangerPulseMs) * Math.PI * 2);
      this.tint(g, C.colors.danger, C.dangerAlpha * pulse);
    }
  }

  private tint(g: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    for (const shape of SILHOUETTE) g.fillPoints(poly(shape), true);
  }

  private drawFace(g: Phaser.GameObjects.Graphics, mood: Mood): void {
    const e = C.eyes;
    const blinking = this.clock < this.blinkUntil && (mood === 'happy' || mood === 'worried');
    for (const side of [-1, 1]) {
      const x = side * e.x;
      if (mood === 'dead') this.drawCross(g, x, e.y);
      else if (blinking) this.drawOutlinedLine(g, [[x - e.white, e.y], [x + e.white, e.y]], C.colors.brow, e.lineW, e.lineW + 2);
      else this.drawEye(g, x, mood);
    }
    if (mood === 'worried' || mood === 'scared') this.drawBrows(g, mood);

    g.fillStyle(C.colors.nose, 1);
    g.fillPoints(poly(C.nose), true);
    this.drawMouth(g, mood);
    this.drawWhiskers(g);
    if (mood === 'scared') {
      g.fillStyle(C.colors.sweat, 1);
      g.fillCircle(C.sweat.x, C.sweat.y, C.sweat.r);
      g.fillPoints(poly([[C.sweat.x - C.sweat.r * 0.8, C.sweat.y - C.sweat.r * 0.5], [C.sweat.x, C.sweat.y - C.sweat.r * 2.4], [C.sweat.x + C.sweat.r * 0.8, C.sweat.y - C.sweat.r * 0.5]]), true);
    }
  }

  /** Siamese blue eyes: white rim, blue iris, small dark pupil, a shine when happy. */
  private drawEye(g: Phaser.GameObjects.Graphics, x: number, mood: Mood): void {
    const e = C.eyes;
    const white = mood === 'scared' ? e.whiteScared : e.white;
    const pupil = mood === 'happy' ? e.pupil : mood === 'worried' ? e.pupilWorried : e.pupilScared;
    const iris = white * e.iris;
    g.fillStyle(C.colors.ink, 1);
    g.fillCircle(x, e.y, white + 1.4);
    g.fillStyle(C.colors.eyeWhite, 1);
    g.fillCircle(x, e.y, white);
    g.fillStyle(C.colors.irisRim, 1);
    g.fillCircle(x, e.y + 0.3, iris);
    g.fillStyle(C.colors.iris, 1);
    g.fillCircle(x, e.y + 0.3, iris - 1);
    g.fillStyle(C.colors.ink, 1);
    g.fillCircle(x, e.y + 0.3, pupil);
    if (mood === 'happy') {
      g.fillStyle(C.colors.eyeWhite, 1);
      g.fillCircle(x + 1.8, e.y - 1.6, e.shine);
    }
  }

  private drawBrows(g: Phaser.GameObjects.Graphics, mood: 'worried' | 'scared'): void {
    const b = C.brow[mood];
    const ey = C.eyes.y;
    for (const side of [-1, 1]) {
      const line: Pt[] = [[side * -b.outer[0]!, ey + b.outer[1]!], [side * -b.inner[0]!, ey + b.inner[1]!]];
      this.drawOutlinedLine(g, line, C.colors.brow, C.brow.lineW, C.brow.underlayW);
    }
  }

  private drawMouth(g: Phaser.GameObjects.Graphics, mood: Mood): void {
    const line = C.colors.mouth;
    if (mood === 'happy') {
      const half: Pt[] = [[0, 16.5], [-3, 19.6], [-7, 19.6], [-9.5, 17]];
      this.drawLine(g, half, line, C.mouthLineW);
      this.drawLine(g, mirror(half), line, C.mouthLineW);
    } else if (mood === 'worried') {
      this.drawLine(g, [[-6, 20.5], [-3, 18.8], [3, 18.8], [6, 20.5]], line, C.mouthLineW);
    } else {
      g.fillStyle(C.colors.ink, 1);
      g.fillEllipse(0, 20, 8, 7);
      g.fillStyle(C.colors.nose, 1);
      g.fillEllipse(0, 22, 4.5, 2.6);
    }
  }

  private drawWhiskers(g: Phaser.GameObjects.Graphics): void {
    const w = C.whisker;
    for (const side of [-1, 1]) {
      w.ys.forEach((y, i) => {
        const tip = (i - 1) * w.fan; // the top whisker points up, the bottom one down
        const line: Pt[] = [[side * w.inner, y], [side * w.outer, y + tip]];
        this.drawOutlinedLine(g, line, C.colors.whisker, w.lineW, w.underlayW);
      });
    }
  }

  private drawCross(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const s = C.eyes.white * 0.8;
    const w = C.eyes.lineW + 0.6;
    this.drawOutlinedLine(g, [[x - s, y - s], [x + s, y + s]], C.colors.brow, w, w + 2);
    this.drawOutlinedLine(g, [[x - s, y + s], [x + s, y - s]], C.colors.brow, w, w + 2);
  }

  /** A line with a navy underlay, so it reads on any color behind it. */
  private drawOutlinedLine(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], color: number, width: number, underlayWidth: number): void {
    this.drawLine(g, pts, C.colors.outline, underlayWidth);
    this.drawLine(g, pts, color, width);
  }

  private drawLine(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], color: number, width: number): void {
    g.lineStyle(width, color, 1);
    g.strokePoints(poly(pts), false);
  }
}
