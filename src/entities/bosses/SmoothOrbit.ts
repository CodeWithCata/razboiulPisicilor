/** @file Smooth circling for ranged bosses: keeps a distance from Varu with an eased push in or out, a lagging velocity, direction flips and a wall push. */
import Phaser from 'phaser';
import { gameClock } from '../../core/clock';

/** The numbers (they live in config/bosses.ts: `MAFIA`, `FEDERER`). Times in ms, distances in px. */
export interface OrbitTuning {
  /** Share of his speed that goes into circling Varu. */
  readonly strafeShare: number;
  /** Width of the band around the keep distance over which the push in or out grows from 0 to full. */
  readonly distanceBandPx: number;
  /** How slowly the velocity follows the wish (bigger = smoother, lazier). */
  readonly steerMs: number;
  /** The circling direction flips after a random time in this range. */
  readonly flipMs: { readonly min: number; readonly max: number };
  /** At most one \"stuck\" flip per this long. */
  readonly blockedFlipGapMs: number;
  /** Within this distance of the arena edge he is pushed back to the middle, by `wallPush` x his speed at the very edge. */
  readonly wallMarginPx: number;
  readonly wallPush: number;
}

/** One per boss. `step` sets the boss's velocity; the caller turns it to face Varu. */
export class SmoothOrbit {
  private dir = Math.random() < 0.5 ? 1 : -1;
  private nextFlipAt = 0;
  private blockedFlipAt = 0;

  /** Call every frame while the boss is idle. `frameMs` is the frame length (at most 50). `bias` is an extra velocity wish added to the circling (optional). */
  step(owner: Phaser.Physics.Arcade.Sprite, tune: OrbitTuning, keepDistance: number, target: { x: number; y: number }, speed: number, frameMs: number, bias?: { x: number; y: number }): void {
    const body = owner.body as Phaser.Physics.Arcade.Body;
    const now = gameClock.now;
    const bounds = owner.scene.physics.world.bounds;
    const edge = Math.min(owner.x - bounds.x, bounds.right - owner.x, owner.y - bounds.y, bounds.bottom - owner.y);
    const edgeness = Phaser.Math.Clamp((tune.wallMarginPx - edge) / tune.wallMarginPx, 0, 1);

    if (now >= this.nextFlipAt) {
      if (this.nextFlipAt > 0) this.dir = -this.dir;
      this.nextFlipAt = now + Phaser.Math.Between(tune.flipMs.min, tune.flipMs.max);
    }
    if ((!body.blocked.none || edgeness > 0.8) && now >= this.blockedFlipAt) {
      this.dir = -this.dir; // stuck on a wall or prop: go the other way round
      this.blockedFlipAt = now + tune.blockedFlipGapMs;
    }

    const toTarget = Phaser.Math.Angle.Between(owner.x, owner.y, target.x, target.y);
    const dist = Phaser.Math.Distance.Between(owner.x, owner.y, target.x, target.y);
    const radial = Phaser.Math.Clamp((dist - keepDistance) / tune.distanceBandPx, -1, 1);
    const side = toTarget + (Math.PI / 2) * this.dir;
    let wx = Math.cos(side) * speed * tune.strafeShare + Math.cos(toTarget) * speed * radial;
    let wy = Math.sin(side) * speed * tune.strafeShare + Math.sin(toTarget) * speed * radial;
    if (edgeness > 0) {
      const home = Phaser.Math.Angle.Between(owner.x, owner.y, bounds.centerX, bounds.centerY);
      wx += Math.cos(home) * speed * tune.wallPush * edgeness;
      wy += Math.sin(home) * speed * tune.wallPush * edgeness;
    }
    if (bias) {
      wx += bias.x; // an extra wish of the owner (Federer: away from the corners), in px/s
      wy += bias.y;
    }
    const k = 1 - Math.exp(-frameMs / tune.steerMs);
    owner.setVelocity(body.velocity.x + (wx - body.velocity.x) * k, body.velocity.y + (wy - body.velocity.y) * k);
  }
}
