/** @file Low-health heartbeat: while Varu is under the low-HP line it emits a beat now and then (faster the closer to death). */
import Phaser from 'phaser';
import { LOW_HP } from '../config/lowHp';
import { bus, Events, listen, type HeartbeatPayload, type PlayerHealthPayload } from '../core/events';

/**
 * Only keeps the time. The thump is played by AudioSystem and the red edge pulse is drawn by ui/LowHpVignette.ts;
 * both just listen for Events.Heartbeat. Runs on the game clock, so the beat stops while the game is paused.
 */
export class LowHpSystem {
  private ratio = 1;
  private nextBeatAt = 0;

  constructor(scene: Phaser.Scene) {
    const off = listen<PlayerHealthPayload>(Events.PlayerHealth, ({ hp, maxHp }) => {
      const before = this.ratio;
      this.ratio = maxHp > 0 ? hp / maxHp : 1;
      // Just fell under the line: the first beat comes right away.
      if (before > LOW_HP.ratio && this.ratio <= LOW_HP.ratio) this.nextBeatAt = 0;
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  update(now: number): void {
    if (!LOW_HP.enabled || this.ratio <= 0 || this.ratio > LOW_HP.ratio || now < this.nextBeatAt) return;
    const intensity = Phaser.Math.Clamp(1 - this.ratio / LOW_HP.ratio, 0, 1);
    this.nextBeatAt = now + Phaser.Math.Linear(LOW_HP.beatMs.slow, LOW_HP.beatMs.fast, intensity);
    const payload: HeartbeatPayload = { intensity };
    bus.emit(Events.Heartbeat, payload);
  }
}
