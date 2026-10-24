/** @file Score, kills and the saved best (campaign and endless kept apart; a custom game has no record). */
import Phaser from 'phaser';
import { bus, Events, listen, type CatJailedPayload, type EnemyKilledPayload, type ScorePayload } from '../core/events';
import { recordModeOf, type RecordMode, type RunMode } from '../core/run';
import { getDifficulty, getDifficultyId } from '../core/difficulty';
import { loadBest, saveBest } from '../core/storage';

/** Tracks score, kills and the saved best score. UI and game over read it via events. */
export class ScoreSystem {
  score = 0;
  kills = 0;
  readonly bestAtStart: number;
  /** Which record this run competes for, or null (a custom game has none: its rules change every time). */
  private readonly recordMode: RecordMode | null;
  private readonly off: Array<() => void> = [];

  /** Campaign and endless keep separate records; a custom game keeps none. */
  constructor(
    scene: Phaser.Scene,
    mode: RunMode = 'campaign',
    /** The combo's score factor (1 = none), read at every kill. */
    private readonly comboMultiplier: () => number = () => 1,
  ) {
    this.recordMode = recordModeOf(mode);
    this.bestAtStart = this.recordMode ? loadBest(this.recordMode, getDifficultyId()) : 0;
    this.off.push(
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ score }) => {
        this.score += Math.round(score * getDifficulty().score * this.comboMultiplier());
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
    if (!this.recordMode) return false;
    const isNewBest = this.score > this.bestAtStart;
    if (isNewBest) saveBest(this.score, this.recordMode, getDifficultyId());
    return isNewBest;
  }

  private emit(): void {
    const payload: ScorePayload = { score: this.score, best: this.best, kills: this.kills };
    bus.emit(Events.ScoreChanged, payload);
  }
}
