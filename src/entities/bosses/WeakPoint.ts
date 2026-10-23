/** @file The ring that pulses on a boss while its weak-point window is open (config/weakPoint.ts). Drawing only, the damage rule is in Boss. */
import Phaser from 'phaser';
import { FX_HOOP_R } from '../../assets/art/fx';
import { texArgs } from '../../assets/atlas';
import { Tex } from '../../assets/keys';
import { WEAK_POINT } from '../../config/weakPoint';

const TAU = Math.PI * 2;

/** One gold ring that follows the boss, pulses, blinks near the end and flashes white when a hit lands. Created on demand, removed when the window closes. */
export class WeakPoint {
  private ring: Phaser.GameObjects.Image | null = null;
  private until = 0;
  private totalMs = 1;
  private flashUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Radius of the ring in game pixels (the boss's size decides). */
    private readonly radius: number,
  ) {}

  /** Is the window open at game time `now`? */
  isOpen(now: number): boolean {
    return now < this.until;
  }

  open(now: number, ms: number, x: number, y: number): void {
    this.until = now + ms;
    this.totalMs = Math.max(1, ms);
    const M = WEAK_POINT.marker;
    this.ring ??= this.scene.add.image(x, y, ...texArgs(Tex.FxHoop)).setDepth(M.depth).setTint(M.color);
    this.ring.setPosition(x, y).setVisible(true);
  }

  /** A hit landed inside the window: the ring flashes white for a moment. */
  hit(now: number): void {
    this.flashUntil = now + 140;
  }

  /** Every frame (game time). Follows the boss, pulses, blinks near the end, and closes itself when the time is up. */
  update(now: number, x: number, y: number): void {
    const ring = this.ring;
    if (!ring) return;
    if (now >= this.until) {
      this.close();
      return;
    }
    const M = WEAK_POINT.marker;
    const left = (this.until - now) / this.totalMs;
    const pulse = 1 + M.pulse * Math.sin((now / M.pulseMs) * TAU);
    const blink = left < M.blinkShare && Math.floor(now / 90) % 2 === 0;
    ring
      .setPosition(x, y)
      .setScale((this.radius / FX_HOOP_R) * pulse)
      .setAlpha(blink ? M.alpha * 0.35 : M.alpha)
      .setTint(now < this.flashUntil ? M.hitColor : M.color);
  }

  close(): void {
    this.until = 0;
    this.ring?.destroy();
    this.ring = null;
  }

  destroy(): void {
    this.close();
  }
}
