/** @file Cat pinball: a cat flung by the belt that slams into another cat hurts it and shoves it on (a spin can start a chain). */
import { PINBALL } from '../config/balance';
import { bus, Events, type CatBumpPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';

interface Bump {
  flung: Enemy;
  victim: Enemy;
  speed: number;
}

/**
 * GameScene calls `check` from the cat-vs-cat collision test (before the physics separates them, so the speeds are still the real ones).
 * The damage itself waits for `update`, because killing a cat in the middle of the physics step is asking for trouble.
 */
export class PinballSystem {
  private queue: Bump[] = [];

  /** Two ground cats are touching: if one of them is flying through the air from a hit, the other one gets bumped. */
  check(a: Enemy, b: Enemy): void {
    if (!PINBALL.enabled) return;
    const speedA = a.flungSpeed;
    const speedB = b.flungSpeed;
    const speed = Math.max(speedA, speedB);
    if (speed < PINBALL.minSpeed) return;
    const [flung, victim] = speedA >= speedB ? [a, b] : [b, a];
    this.queue.push({ flung, victim, speed });
  }

  update(): void {
    if (this.queue.length === 0) return;
    const bumps = this.queue;
    this.queue = [];
    for (const { flung, victim, speed } of bumps) {
      if (!flung.active || !victim.active) continue;
      const at = { x: (flung.x + victim.x) / 2, y: (flung.y + victim.y) / 2 };
      const payload: CatBumpPayload = { ...at, victimType: victim.enemyType };
      // Only a bump that really landed gets the show (not a boss, not mid-teleport, not bumped a moment ago).
      if (victim.takeBump(PINBALL.damage, flung.x, flung.y, speed * PINBALL.transfer, PINBALL.victimGapMs)) {
        bus.emit(Events.CatBump, payload);
      }
    }
  }
}
