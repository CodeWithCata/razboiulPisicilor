/** @file Phone vibration for the big moments: dodge, being hit, finisher, boss weak hit, picks, combo tiers, a boss going down. */
import Phaser from 'phaser';
import { TOUCH } from '../config/touch';
import { Events, listen, type ComboPayload } from '../core/events';
import { buzz } from '../core/haptics';

/**
 * Only LISTENS to the bus and calls `buzz` (core/haptics.ts, which already ignores computers, the pause-menu switch and bursts).
 * The plain belt hit does NOT buzz: at 8 hits a second it would hum and drain the battery. Button presses buzz in TouchInput.
 * The pick screens (UpgradeScene) are a different scene but emit on the same bus, so this one system covers them.
 */
export class HapticsSystem {
  constructor(scene: Phaser.Scene) {
    const H = TOUCH.haptics;
    const off = [
      listen(Events.PlayerHurt, () => buzz(H.hurtMs)),
      listen(Events.DodgeRoll, () => buzz(H.dodgeMs)),
      listen(Events.DodgeSave, () => buzz(H.dodgeSave)),
      listen(Events.FinisherHit, () => buzz(H.finisherMs)),
      listen(Events.BossWeakHit, () => buzz(H.weakHitMs)),
      listen(Events.BeltUpgradePicked, () => buzz(H.pickMs)),
      listen(Events.BeltSynergyPicked, () => buzz(H.synergy)),
      listen(Events.PickupCollected, () => buzz(H.pickupMs)),
      listen(Events.BossDefeated, () => buzz(H.bossDefeated)),
      listen<ComboPayload>(Events.ComboChanged, (p) => {
        if (p.tierUp) buzz(H.tierMs);
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }
}
