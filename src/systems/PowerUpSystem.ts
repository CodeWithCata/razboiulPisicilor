/** @file Timed buffs (best value wins) and the laser pointer dot cats chase. */
import Phaser from 'phaser';
import { WORLD } from '../config/arena';
import { BUFFS, LASER, type BuffKind } from '../config/balance';
import { bus, Events, type BuffInfo, type BuffsPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';
import { gameClock } from '../core/clock';

/**
 * Timed buffs. Several can be active; for each stat the BEST active value wins
 * (so energy drink + golden belt don't multiply into something absurd).
 * Also owns the laser pointer: while active, `lure` is the red dot that cats chase.
 */
export class PowerUpSystem {
  private readonly endsAt = new Map<BuffKind, number>();
  private readonly dot: Phaser.GameObjects.Graphics;
  private readonly lurePoint = new Phaser.Math.Vector2();
  private dotDrawn = false;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
  ) {
    this.dot = scene.add.graphics().setDepth(35);
  }

  /** The laser dot while the laser is active, otherwise null. */
  get lure(): Phaser.Types.Math.Vector2Like | null {
    return this.endsAt.has('laser') ? this.lurePoint : null;
  }

  /** Start or refresh a buff. */
  addBuff(kind: BuffKind): void {
    this.endsAt.set(kind, gameClock.now + BUFFS[kind].durationMs);
    this.applyStats();
    this.emit();
  }

  update(time: number, input: InputSource): void {
    let expired = false;
    for (const [kind, end] of this.endsAt) {
      if (time >= end) {
        this.endsAt.delete(kind);
        expired = true;
      }
    }
    if (expired) {
      this.applyStats();
      this.emit();
    }
    this.updateLaser(time, input);
  }

  private applyStats(): void {
    let speed = 1;
    let damage = 1;
    let range = 1;
    for (const kind of this.endsAt.keys()) {
      const b = BUFFS[kind];
      speed = Math.max(speed, b.speed ?? 1);
      damage = Math.max(damage, b.damage ?? 1);
      range = Math.max(range, b.range ?? 1);
    }
    this.player.speedMultiplier = speed;
    this.player.damageMultiplier = damage;
    this.player.rangeMultiplier = range;
    this.player.goldenBelt = this.endsAt.has('goldenBelt');
    this.player.milkTrail = this.endsAt.has('lapte');
    this.player.energyTrail = this.endsAt.has('monster');
  }

  private emit(): void {
    const now = gameClock.now;
    const buffs: BuffInfo[] = [...this.endsAt].map(([kind, end]) => ({
      kind,
      remainingMs: Math.max(0, end - now),
      durationMs: BUFFS[kind].durationMs,
    }));
    const payload: BuffsPayload = { buffs };
    bus.emit(Events.BuffsChanged, payload);
  }

  /** The dot follows the cursor. Placeholder visual: a pulsing red circle. */
  private updateLaser(time: number, input: InputSource): void {
    input.setLaserAiming(this.lure !== null);
    if (!this.lure) {
      if (this.dotDrawn) {
        this.dot.clear();
        this.dotDrawn = false;
      }
      return;
    }
    this.lurePoint.set(
      Phaser.Math.Clamp(input.aimPoint.x, 0, WORLD.width),
      Phaser.Math.Clamp(input.aimPoint.y, 0, WORLD.height),
    );
    const pulse = 1 + 0.25 * Math.sin(time / 90);
    this.dot.clear();
    this.dot.fillStyle(0xff2222, 0.22).fillCircle(this.lurePoint.x, this.lurePoint.y, LASER.dotRadius * 2.6 * pulse);
    this.dot.fillStyle(0xff2222, 1).fillCircle(this.lurePoint.x, this.lurePoint.y, LASER.dotRadius);
    this.dot.fillStyle(0xffffff, 0.9).fillCircle(this.lurePoint.x - 2, this.lurePoint.y - 2, 3);
    this.dotDrawn = true;
  }
}
