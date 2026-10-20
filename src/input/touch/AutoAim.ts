/** @file Nearest-cat aim + auto-swing helper for touch (only used when the pause-menu switch is on). */
import type Phaser from 'phaser';
import { PROJECTILES } from '../../config/balance';
import { TOUCH } from '../../config/touch';
import type { Enemy } from '../../entities/Enemy';
import type { Projectile } from '../../systems/ProjectileSystem';

/** What the belt should face right now. */
export interface AimTarget {
  x: number;
  y: number;
  /** Close enough for a swing to land (the belt's reach plus a little slack). */
  inReach: boolean;
}

export interface AutoAimSources {
  enemies: Phaser.Physics.Arcade.Group;
  /** Every projectile in flight (the ones the belt already sent back are skipped). */
  projectiles: Phaser.Physics.Arcade.Group;
  /** How far the belt reaches right now (the golden belt makes it longer). */
  reach: () => number;
}

interface Candidate {
  object: Enemy | Projectile;
  x: number;
  y: number;
  /** Distance from Varu to the edge of the target. */
  gap: number;
  /** Lower is better. */
  score: number;
}

/**
 * Picks what Varu looks at on a phone: the nearest cat in range, or an enemy ball that is about to arrive.
 * It sticks to its pick for a moment (`stickyGain`) so Varu does not flick between two cats that are about equally far.
 * Pure picking: TouchInput turns the answer into the aim direction and the swing.
 */
export class AutoAim {
  private locked: Enemy | Projectile | null = null;

  constructor(private readonly sources: AutoAimSources) {}

  /** The target for Varu standing at (fromX, fromY), or null when nothing is near. */
  pick(fromX: number, fromY: number): AimTarget | null {
    const A = TOUCH.autoAim;
    const found: Candidate[] = [];

    for (const child of this.sources.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (!enemy.active || !enemy.alive || !enemy.hittable) continue;
      const dist = Math.hypot(enemy.x - fromX, enemy.y - fromY);
      if (dist > A.range) continue;
      const gap = dist - enemy.hitRadius;
      found.push({ object: enemy, x: enemy.x, y: enemy.y, gap, score: gap });
    }

    for (const child of this.sources.projectiles.getChildren()) {
      const ball = child as Projectile;
      if (!ball.active || ball.friendly) continue;
      const dist = Math.hypot(ball.x - fromX, ball.y - fromY);
      if (dist > A.projectileRange) continue;
      const gap = dist - PROJECTILES[ball.kind].hitRadius;
      found.push({ object: ball, x: ball.x, y: ball.y, gap, score: gap - A.projectileBias });
    }

    if (found.length === 0) {
      this.locked = null;
      return null;
    }

    let best = found[0]!;
    for (const candidate of found) if (candidate.score < best.score) best = candidate;
    const kept = found.find((candidate) => candidate.object === this.locked);
    if (kept && kept.score <= best.score + A.stickyGain) best = kept;

    this.locked = best.object;
    return { x: best.x, y: best.y, inReach: best.gap <= this.sources.reach() + A.swingMargin };
  }
}
