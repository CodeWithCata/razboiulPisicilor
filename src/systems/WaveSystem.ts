/** @file Wave loop: countdown -> cats trickle in -> all dead -> next wave (campaign and endless). */
import Phaser from 'phaser';
import { isBossType, WAVE_TIMING, type EnemyType } from '../config/balance';
import { ENDLESS, FINAL_WAVE, getWave } from '../config/waves';
import type { RunMode } from '../core/run';
import { bus, Events, type WavePayload } from '../core/events';
import { gameClock } from '../core/clock';
import { getDifficulty } from '../core/difficulty';

/**
 * Runs the wave loop: countdown -> cats trickle in -> all dead -> pause -> next wave.
 * In endless mode it starts after the campaign and never wins. It only decides WHEN and WHAT to spawn. `spawn` and `aliveCount` come from the scene.
 */
export class WaveSystem {
  wave: number;
  private queue: EnemyType[] = [];
  private nextSpawnAt = 0;
  private nextWaveAt: number;
  private waitingForNextWave = true;
  private running = true;
  /** Game time the current wave began (0 before the first wave). */
  private startedAt = 0;
  private bossWave = false;
  /** Dev only: no new wave starts, nothing more spawns and the wave never ends (debug card). */
  debugHold = false;
  /** The first-run tutorial is on: the first wave waits (nothing spawns) until `endTutorialHold`. */
  tutorialHold = false;

  constructor(
    private readonly spawn: (type: EnemyType) => void,
    private readonly aliveCount: () => number,
    private readonly mode: RunMode = 'campaign',
  ) {
    this.wave = mode === 'endless' ? ENDLESS.startWave - 1 : 0;
    this.nextWaveAt = gameClock.now + WAVE_TIMING.firstWaveDelayMs;
  }

  /** The tutorial is over: the first wave starts after its usual short wait. */
  endTutorialHold(time: number): void {
    if (!this.tutorialHold) return;
    this.tutorialHold = false;
    this.nextWaveAt = time + WAVE_TIMING.firstWaveDelayMs;
  }

  /** Between waves: the next wave does not start before `time + ms` (never earlier than it already would). */
  postpone(time: number, ms: number): void {
    if (this.waitingForNextWave) this.nextWaveAt = Math.max(this.nextWaveAt, time + ms);
  }

  stop(): void {
    this.running = false;
  }

  /** Game time (game clock) the current wave began. Read it after `Events.WaveStarted`. */
  get waveStartedAt(): number {
    return this.startedAt;
  }

  /** A wave is going right now (false during the countdown to the next one). */
  get inWave(): boolean {
    return this.running && !this.waitingForNextWave;
  }

  /** True once the current wave has put EVERY cat into the arena (nothing left in the queue). False between waves. */
  get allSpawned(): boolean {
    return !this.waitingForNextWave && this.queue.length === 0;
  }

  /** The current wave has a boss in it. */
  get isBossWave(): boolean {
    return this.bossWave;
  }

  /** The last wave of the campaign (endless mode has none). */
  get isFinalWave(): boolean {
    return this.mode === 'campaign' && this.wave >= FINAL_WAVE;
  }

  /** Dev only (debug key L): drop what is left of this wave and start the next one on the next frame. The campaign stops at the last wave. */
  skipToNextWave(time: number): void {
    if (!this.running || (this.mode === 'campaign' && this.wave >= FINAL_WAVE)) return;
    this.queue = [];
    this.waitingForNextWave = true;
    this.nextWaveAt = time;
  }

  /** Dev only (debug card): drop what is left of this wave and start wave `n` on the next frame (the campaign stops at its last wave). */
  jumpToWave(n: number, time: number): void {
    if (!this.running) return;
    const target = this.mode === 'campaign' ? Math.min(n, FINAL_WAVE) : n;
    this.queue = [];
    this.wave = Math.max(1, target) - 1;
    this.waitingForNextWave = true;
    this.nextWaveAt = time;
  }

  update(time: number): void {
    if (!this.running || this.debugHold || this.tutorialHold) return;

    if (this.waitingForNextWave) {
      if (time >= this.nextWaveAt) this.startWave(time);
      return;
    }

    if (this.queue.length > 0) {
      if (time >= this.nextSpawnAt && this.aliveCount() < Math.round(WAVE_TIMING.maxAlive * getDifficulty().crowdCap)) {
        this.spawn(this.queue.shift()!);
        this.nextSpawnAt = time + WAVE_TIMING.spawnIntervalMs * getDifficulty().spawnGap;
      }
      return;
    }

    if (this.aliveCount() === 0) this.finishWave(time);
  }

  private startWave(time: number): void {
    this.wave += 1;
    this.waitingForNextWave = false;
    this.queue = this.buildQueue(this.wave);
    this.startedAt = time;
    this.bossWave = this.queue.some(isBossType);
    this.nextSpawnAt = time + 700; // a short beat so the banner can show first
    const payload: WavePayload = { wave: this.wave };
    bus.emit(Events.WaveStarted, payload);
  }

  private finishWave(time: number): void {
    if (this.mode === 'campaign' && this.wave >= FINAL_WAVE) {
      this.running = false;
      bus.emit(Events.Victory);
      return;
    }
    this.waitingForNextWave = true;
    this.nextWaveAt = time + WAVE_TIMING.betweenWavesMs * getDifficulty().breather;
    const payload: WavePayload = { wave: this.wave };
    bus.emit(Events.WaveCleared, payload);
  }

  /** Flatten { normal: 5, ninja: 2 } into a shuffled list of spawns. Bosses always come first. */
  private buildQueue(wave: number): EnemyType[] {
    const list: EnemyType[] = [];
    const D = getDifficulty();
    for (const [type, count] of Object.entries(getWave(wave, D.endless)) as Array<[EnemyType, number]>) {
      // The difficulty scales the crowd, never a boss, and a kind that is in the wave never drops to none.
      const n = isBossType(type) ? count : Math.max(1, Math.round(count * D.count));
      for (let i = 0; i < n; i++) list.push(type);
    }
    const bosses = list.filter(isBossType);
    const rest = Phaser.Utils.Array.Shuffle(list.filter((t) => !isBossType(t)));
    return [...bosses, ...rest];
  }
}
