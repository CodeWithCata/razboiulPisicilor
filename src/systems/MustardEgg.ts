/** @file The mustard Easter egg trigger: the first barrel that breaks in a run (not smashed by a boss) fires `Events.MustardEgg` once, a moment after the splash. Run-lifetime. */
import Phaser from 'phaser';
import { MUSTARD_EGG } from '../config/easterEgg';
import { MUSTARD_EGG_LINE } from '../content/easterEgg';
import { bus, Events, listen, type MustardEggPayload, type PropDestroyedPayload } from '../core/events';

/** It only decides WHEN. What happens (bubbles, a voice) is up to the listeners, so the joke can change without touching the barrels. */
export class MustardEgg {
  private fired = false;

  constructor(scene: Phaser.Scene) {
    const off = listen<PropDestroyedPayload>(Events.PropDestroyed, ({ kind, byBoss }) => {
      if (this.fired || !MUSTARD_EGG.enabled || kind !== 'barrel' || byBoss) return;
      this.fired = true; // only the first one, even if the line has not gone out yet
      scene.time.delayedCall(MUSTARD_EGG.delayMs, () => {
        const payload: MustardEggPayload = { line: MUSTARD_EGG_LINE };
        bus.emit(Events.MustardEgg, payload);
      });
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }
}
