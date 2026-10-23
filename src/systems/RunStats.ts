/** @file Numbers of one run for the end screens: time, hits taken, damage, dodge rolls, perfect dodges, bosses beaten. */
import Phaser from 'phaser';
import { gameClock } from '../core/clock';
import { Events, listen, type PlayerHurtPayload } from '../core/events';

/** Counts what happened in the run by listening to the event bus. The scene reads it once, at the end. */
export class RunStats {
  hits = 0;
  damage = 0;
  dodges = 0;
  perfectDodges = 0;
  bosses = 0;
  private readonly startedAt = gameClock.now;
  private readonly off: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.off.push(
      listen<PlayerHurtPayload>(Events.PlayerHurt, ({ amount }) => {
        this.hits += 1;
        this.damage += amount;
      }),
      listen(Events.DodgeRoll, () => (this.dodges += 1)),
      listen(Events.DodgeSave, () => (this.perfectDodges += 1)),
      listen(Events.BossDefeated, () => (this.bosses += 1)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  /** Game time since the run started (ms). Pauses and slow-mo are already out of the game clock. */
  get timeMs(): number {
    return Math.max(0, gameClock.now - this.startedAt);
  }
}
