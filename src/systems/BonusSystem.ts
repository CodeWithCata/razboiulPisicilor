/** @file Bonus points: perfect wave, quick clear, perfect dodge, flawless boss, and the kill milestone shouts. */
import Phaser from 'phaser';
import { BONUS, milestoneWord } from '../config/bonus';
import { gameClock } from '../core/clock';
import { getDifficulty } from '../core/difficulty';
import { Events, listen, type WavePayload } from '../core/events';

export interface BonusDeps {
  /** Adds points to the score (ScoreSystem.add). */
  addScore: (points: number) => void;
  /** A floating word over Varu: (line 0 = first, 1 = above it, text, color, size). */
  say: (line: number, text: string, color: string, size: number) => void;
  /** The wave that is running now has a boss in it. */
  isBossWave: () => boolean;
}

/**
 * Listens to the event bus and hands out the extra points of `config/bonus.ts`. It never changes how the game plays:
 * it only adds score and floating words. Hits are tracked per wave and per boss fight.
 */
export class BonusSystem {
  private hitThisWave = false;
  private hitThisBoss = false;
  private waveStartedAt = 0;
  private kills = 0;
  private readonly off: Array<() => void> = [];

  constructor(scene: Phaser.Scene, private readonly deps: BonusDeps) {
    if (!BONUS.enabled) return;
    this.off.push(
      listen<WavePayload>(Events.WaveStarted, () => {
        this.hitThisWave = false;
        this.waveStartedAt = gameClock.now;
      }),
      listen<WavePayload>(Events.WaveCleared, ({ wave }) => this.waveCleared(wave)),
      listen(Events.PlayerHurt, () => {
        this.hitThisWave = true;
        this.hitThisBoss = true;
      }),
      listen(Events.BossSpawned, () => (this.hitThisBoss = false)),
      listen(Events.BossDefeated, () => {
        if (this.hitThisBoss) return;
        this.award(BONUS.flawlessBoss.points, 0, BONUS.flawlessBoss.word, BONUS.flawlessBoss.color, 34);
      }),
      listen(Events.DodgeSave, () => this.deps.addScore(BONUS.perfectDodge.points)),
      listen(Events.EnemyKilled, () => {
        this.kills += 1;
        if (BONUS.milestones.includes(this.kills)) this.deps.say(0, milestoneWord(this.kills), BONUS.milestoneColor, 30);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  private waveCleared(wave: number): void {
    let line = 0;
    if (!this.hitThisWave) {
      this.award(BONUS.perfectWave.perWave * wave, line, BONUS.perfectWave.word, BONUS.perfectWave.color, 32);
      line += 1;
    }
    if (!this.deps.isBossWave() && gameClock.now - this.waveStartedAt <= BONUS.quickWave.ms) {
      this.award(BONUS.quickWave.perWave * wave, line, BONUS.quickWave.word, BONUS.quickWave.color, 30);
    }
  }

  private award(points: number, line: number, word: string, color: string, size: number): void {
    const scaled = Math.round(points * getDifficulty().score);
    this.deps.addScore(scaled);
    this.deps.say(line, `${word} +${scaled}`, color, size);
  }
}
