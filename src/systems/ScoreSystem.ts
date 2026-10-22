/** @file Score, kills and the saved best (campaign and endless kept apart). */
import Phaser from 'phaser';
import { bus, Events, listen, type CatJailedPayload, type EnemyKilledPayload, type ScorePayload } from '../core/events';
import type { RunMode } from '../core/run';
import { loadBest, saveBest } from '../core/storage';

/** Tracks score, kills and the saved best score. UI and game over read it via events. */
export class ScoreSystem {
  score = 0;
  kills = 0;
  readonly bestAtStart: number;
  private readonly off: Array<() => void> = [];

  /** Campaign and endless keep separate records. */
  constructor(
    scene: Phaser.Scene,
    private readonly mode: RunMode = 'campaign',
  ) {
    this.bestAtStart = loadBest(mode);
    this.off.push(
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ score }) => {
        this.score += score;
        this.kills += 1;
        this.emit();
      }),
      // A cat left in a bed cage when the wave ended: its bonus, but it is not a kill.
      listen<CatJailedPayload>(Events.CatJailed, ({ points }) => this.add(points)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
    this.emit();
  }

  /** Add points without a kill: the debug key J, and the bonus when the last cats surrender (SURRENDER.score). */
  add(points: number): void {
    this.score += points;
    this.emit();
  }

  get best(): number {
    return Math.max(this.bestAtStart, this.score);
  }

  /** Call once at game over. Saves a new best and tells you if it was one. */
  finish(): boolean {
    const isNewBest = this.score > this.bestAtStart;
    if (isNewBest) saveBest(this.score, this.mode);
    return isNewBest;
  }

  private emit(): void {
    const payload: ScorePayload = { score: this.score, best: this.best, kills: this.kills };
    bus.emit(Events.ScoreChanged, payload);
  }
}
