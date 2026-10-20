/** @file Decides WHEN the lucky cat (Pisica Norocoasă) shows up: a rare golden cat that runs from Varu and drops a pile of pickups when caught. */
import Phaser from 'phaser';
import { LUCKY } from '../config/balance';
import { gameClock } from '../core/clock';
import { Events, listen, type WavePayload } from '../core/events';
import type { WaveSystem } from './WaveSystem';

export interface LuckySources {
  waves: WaveSystem;
  /** Puts the lucky cat into the arena (GameScene: `spawn('lucky')`, away from Varu). */
  spawn: () => void;
}

/**
 * One roll per wave, at the start of the wave (numbers: `LUCKY` in config/balance.ts). If it hits, she appears a few seconds later,
 * but only if that wave is still going. Runs on the game clock, so the pause menu stops it. The cat itself is entities/enemies/LuckyCat.ts.
 */
export class LuckyCatSystem {
  /** Waves started in this run (an endless run counts from its own first wave). */
  private runWaves = 0;
  private visits = 0;
  private lastWave = -Infinity;
  /** Game time she is due; Infinity = not this wave. */
  private dueAt = Infinity;

  constructor(
    scene: Phaser.Scene,
    private readonly src: LuckySources,
  ) {
    const off = listen<WavePayload>(Events.WaveStarted, ({ wave }) => this.onWaveStarted(wave));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private onWaveStarted(wave: number): void {
    const { waves } = this.src;
    this.runWaves += 1;
    this.dueAt = Infinity;
    const allowed =
      LUCKY.enabled &&
      this.runWaves >= LUCKY.minRunWave &&
      !waves.isBossWave &&
      !waves.isFinalWave &&
      wave - this.lastWave > LUCKY.minWavesBetween &&
      this.visits < LUCKY.maxPerRun;
    if (!allowed || Math.random() >= LUCKY.chance) return;
    this.dueAt = gameClock.now + Phaser.Math.Between(LUCKY.delayMs.min, LUCKY.delayMs.max);
  }

  update(now: number): void {
    if (now < this.dueAt) return;
    this.dueAt = Infinity;
    if (!this.src.waves.inWave) return; // that wave is over already: she never comes between waves
    this.visits += 1;
    this.lastWave = this.src.waves.wave;
    this.src.spawn();
  }
}
