/** @file Round badges for active power-ups: a ring that drains clockwise, seconds left underneath. */
import { texArgs } from '../assets/atlas';
import Phaser from 'phaser';
import { poly } from '../assets/paint';
import { BUFF_BADGES as B } from '../config/buffBadges';
import { stackRule } from '../config/buffStacks';
import { PICKUP_VISUALS } from '../config/pickups';
import { FONT } from '../config/style';
import type { Pt } from '../core/polyClip';
import { fitToSize } from '../core/sprite';
import type { BuffInfo } from '../core/events';

const DEG = Math.PI / 180;

interface Badge {
  info: BuffInfo;
  gfx: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Sprite;
  iconScale: number;
  seconds: Phaser.GameObjects.Text;
  /** The "x2" label of a stacked buff (empty at x1). */
  stackLabel: Phaser.GameObjects.Text;
  /** Counts down while the badge pops in / bumps (0 = idle). */
  popInMs: number;
  bumpMs: number;
  /** What the ring was last painted for (see `drawBadge`): -1 = never. The ring is only repainted when this changes. */
  paintKey: number;
  /** The last seconds text and blink state set on the label: a Text re-renders its canvas on every `setText` / `setColor` that changes it, so they are only set on a change. */
  lastSeconds: string;
  lastBlink: boolean | null;
}

/**
 * Round timer badges for the active power-ups (HUD, top left under the cat meter).
 * Each looks like its pickup in the arena: a glow disc and a ring in its color (draining clockwise) around its picture,
 * with the seconds left under it. In the last stretch the ring blinks red and the badge shakes a little.
 */
export class BuffBadges {
  private badges: Badge[] = [];
  private clockMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** The list of buffs changed (a new one, a refreshed one, or one ended). */
  setBuffs(buffs: readonly BuffInfo[]): void {
    const old = new Map(this.badges.map((b) => [b.info.kind, b]));
    const next = buffs.map((info): Badge => {
      const prev = old.get(info.kind);
      if (!prev) return this.create({ ...info });
      old.delete(info.kind);
      if (info.remainingMs > prev.info.remainingMs + 50 || info.stacks > prev.info.stacks) prev.bumpMs = B.bump.ms; // picked up again: more time or one more stack
      prev.info = { ...info };
      this.setStackLabel(prev);
      return prev;
    });
    old.forEach((b) => {
      b.gfx.destroy();
      b.icon.destroy();
      b.seconds.destroy();
      b.stackLabel.destroy();
    });
    this.badges = next;
    this.draw();
  }

  update(delta: number): void {
    if (this.badges.length === 0) return;
    this.clockMs += delta;
    for (const b of this.badges) {
      b.info.remainingMs = Math.max(0, b.info.remainingMs - delta);
      b.popInMs = Math.max(0, b.popInMs - delta);
      b.bumpMs = Math.max(0, b.bumpMs - delta);
    }
    this.draw();
  }

  private create(info: BuffInfo): Badge {
    const visual = PICKUP_VISUALS[info.kind];
    const gfx = this.scene.add.graphics();
    const icon = this.scene.add.sprite(0, 0, ...texArgs(visual.tex));
    fitToSize(icon, B.iconSize);
    const seconds = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${B.seconds.size}px`, color: B.colors.seconds, stroke: B.colors.secondsStroke, strokeThickness: B.seconds.strokeThickness }).setOrigin(0.5);
    const stackLabel = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${B.stack.size}px`, color: B.stack.color, stroke: B.stack.stroke, strokeThickness: B.stack.strokeThickness }).setOrigin(0.5).setVisible(false);
    const badge: Badge = { info, gfx, icon, iconScale: icon.scale, seconds, stackLabel, popInMs: B.popIn.ms, bumpMs: 0, paintKey: -1, lastSeconds: '', lastBlink: null };
    this.setStackLabel(badge);
    return badge;
  }

  /** Text and color of the stack label; only when the stack changes (not every frame). Hidden at x1. */
  private setStackLabel(b: Badge): void {
    const stacks = b.info.stacks;
    b.stackLabel.setVisible(stacks > 1);
    if (stacks <= 1) return;
    const atMax = stacks >= (stackRule(b.info.kind)?.max ?? Infinity);
    b.stackLabel.setText(`x${stacks}`).setColor(atMax ? B.stack.maxColor : B.stack.color);
  }

  /** Centre x of badge `i` (the row runs left to right); all badges share `centerY`. */
  private centerX(i: number): number {
    return B.x + B.r + i * (B.r * 2 + B.gap);
  }

  private readonly centerY = B.y + B.r;

  private draw(): void {
    for (let i = 0; i < this.badges.length; i++) this.drawBadge(this.badges[i], i);
  }

  private drawBadge(b: Badge, index: number): void {
    const g = b.gfx;
    const cx = this.centerX(index);
    const cy = this.centerY;
    const color = PICKUP_VISUALS[b.info.kind].color;
    const ratio = Phaser.Math.Clamp(b.info.remainingMs / b.info.durationMs, 0, 1);
    const warning = b.info.remainingMs <= B.warn.ms;
    const blinkOn = warning && Math.floor(this.clockMs / B.warn.blinkMs) % 2 === 0;
    const shake = warning ? Math.sin(this.clockMs / 28) * B.warn.shakePx : 0;

    const popIn = b.popInMs > 0 ? Phaser.Math.Easing.Back.Out(1 - b.popInMs / B.popIn.ms) : 1;
    const bump = 1 + B.bump.grow * Math.sin((b.bumpMs / B.bump.ms) * Math.PI);
    const scale = Math.max(0.01, popIn * bump);
    const r = B.r;
    const rr = r - B.ringW / 2;

    g.setPosition(cx + shake, cy).setScale(scale); // moving and scaling are cheap and happen every frame

    // The shapes (glow disc, track, draining ring) are only repainted when what they show changed: the ring end moves in
    // `ringSteps` steps (a fraction of a pixel each), or the warning blink flipped. Repainting every frame rebuilt the same
    // path again and again.
    const q = Math.round(ratio * B.ringSteps);
    const paintKey = q * 2 + (blinkOn ? 1 : 0);
    if (paintKey !== b.paintKey) {
      b.paintKey = paintKey;
      g.clear();
      // Glow disc, then the ring: a faint track with the part still left drawn over it, draining clockwise from the top.
      const ringColor = blinkOn ? B.colors.warn : color;
      const shown = q / B.ringSteps;
      g.fillStyle(color, B.glowAlpha).fillCircle(0, 0, r);
      g.lineStyle(B.ringW, color, B.trackAlpha).strokeCircle(0, 0, rr);
      if (q > 0) {
        g.lineStyle(B.ringW, ringColor, B.ringAlpha);
        if (shown >= 0.999) g.strokeCircle(0, 0, rr);
        else g.strokePoints(poly(this.arc(rr, -90 * DEG, (-90 + 360 * shown) * DEG, Math.max(3, Math.ceil(B.arcSegments * shown)))), false);
      }
    }

    // The pickup's picture.
    b.icon.setPosition(cx + shake, cy).setScale(b.iconScale * scale).setAlpha(blinkOn ? B.warn.iconAlpha : 1);

    // The stack label (x2..x4): follows the badge's pop and bump.
    if (b.stackLabel.visible) b.stackLabel.setScale(scale).setPosition(cx + shake + B.stack.dx * scale, cy + B.stack.dy * scale);

    // Seconds left, under the badge.
    const textY = cy + (r + B.seconds.gap) * scale;
    // A Text redraws its whole canvas (and re-uploads it) on every `setText` / `setColor`, so only call them when the value changed.
    const seconds = (Math.ceil(b.info.remainingMs / 100) / 10).toFixed(1);
    if (seconds !== b.lastSeconds) {
      b.lastSeconds = seconds;
      b.seconds.setText(seconds);
    }
    if (blinkOn !== b.lastBlink) {
      b.lastBlink = blinkOn;
      b.seconds.setColor(blinkOn ? B.colors.warnText : B.colors.seconds);
    }
    b.seconds.setScale(scale).setPosition(cx + shake, textY);
  }

  private arc(r: number, from: number, to: number, steps: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
}
