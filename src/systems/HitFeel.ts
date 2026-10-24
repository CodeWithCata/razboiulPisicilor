/** @file Hit feel: screen shake and tiny freezes on kills, finishers and boss weak hits, scaled by the combo tier (config/hitFeel.ts). */
import Phaser from 'phaser';
import { COMBO, comboTier } from '../config/combo';
import { HIT_FEEL } from '../config/hitFeel';
import { HIT_STOP } from '../config/hitstop';
import type { Effects } from './Effects';
import { gameClock } from '../core/clock';
import { bus, Events, listen, type ComboPayload, type EnemyKilledPayload, type HitFreezePayload } from '../core/events';

/**
 * Only LISTENS to the bus (hits, kills, finisher, weak point, combo) and turns each into a camera shake and, for the big ones, a freeze
 * request that HitStop carries out (`Events.HitFreeze`). The shakes go through `Effects.shake`, which keeps the strongest one running.
 */
export class HitFeel {
  /** Index of the combo tier the chain is in (0 = none). */
  private tier = 0;
  private shutDown = false;
  /** When the last finisher freeze was asked for (the hit event comes once per cat, the freeze only once per swing). */
  private lastFinisherFreezeAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly effects: Effects,
  ) {
    if (!HIT_FEEL.enabled) return;
    const K = HIT_FEEL.kill;
    const off = [
      listen<ComboPayload>(Events.ComboChanged, (p) => {
        this.tier = COMBO.tiers.indexOf(comboTier(p.count));
        if (p.tierUp) {
          const T = HIT_FEEL.tierUp;
          this.shake(T.shakeMs, T.shake + T.shakePerTier * this.tier);
          this.freeze(T.freezeMs);
        }
      }),
      listen(Events.EnemyHit, () => this.shake(HIT_FEEL.hit.shakeMs, HIT_FEEL.hit.shake)),
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ type }) => {
        if (HIT_STOP.heavyKills.includes(type)) {
          this.shake(HIT_FEEL.heavyKill.shakeMs, HIT_FEEL.heavyKill.shake); // HitStop freezes for it on its own
          return;
        }
        this.shake(K.shakeMs, K.shake + K.shakePerTier * this.tier);
        this.freeze(K.freezeByTier[Math.min(this.tier, K.freezeByTier.length - 1)] ?? 0);
      }),
      listen(Events.FinisherHit, () => {
        this.shake(HIT_FEEL.finisher.shakeMs, HIT_FEEL.finisher.shake);
        const now = gameClock.now;
        if (now - this.lastFinisherFreezeAt < HIT_FEEL.finisher.freezeOnceMs) return;
        this.lastFinisherFreezeAt = now;
        this.freeze(HIT_FEEL.finisher.freezeMs);
      }),
      listen(Events.BossWeakHit, () => {
        this.shake(HIT_FEEL.weakHit.shakeMs, HIT_FEEL.weakHit.shake);
        this.freeze(HIT_FEEL.weakHit.freezeMs);
      }),
      listen(Events.BossWeakPoint, () => this.shake(HIT_FEEL.weakOpen.shakeMs, HIT_FEEL.weakOpen.shake)),
    ];
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shutDown = true;
      off.forEach((f) => f());
    });
  }

  private shake(ms: number, intensity: number): void {
    if (!this.shutDown) this.effects.shake(ms, intensity);
  }

  private freeze(ms: number): void {
    if (ms <= 0) return;
    const payload: HitFreezePayload = { ms: Math.min(ms, HIT_FEEL.maxFreezeMs) };
    bus.emit(Events.HitFreeze, payload);
  }
}
