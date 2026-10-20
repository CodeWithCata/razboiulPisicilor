/** @file "Predarea pisicilor": decides WHEN the last cats of a wave give up (rare, funny, never the normal way to win). */
import Phaser from 'phaser';
import { WORLD } from '../config/arena';
import { SURRENDER } from '../config/balance';
import type { Point } from '../core/arena';
import { Events, listen, type EnemyKilledPayload, type WavePayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { WaveSystem } from './WaveSystem';

/** What the system needs from the scene (GameScene hands these over; it only wires). */
export interface SurrenderSources {
  enemies: Phaser.Physics.Arcade.Group;
  player: Player;
  waves: WaveSystem;
  /** Cats still hiding in a bush or box: they are not in the group yet, but the wave still owns them. */
  pendingHides: () => number;
  /** The map's enemy spawn points: a cat that gives up walks to the nearest one. Empty = the nearest world edge. */
  exits: readonly Point[];
  addScore: (points: number) => void;
}

/**
 * Decides WHEN the cats give up (numbers: `SURRENDER` in config/balance.ts); `Enemy.surrender()` is the cat itself, and Effects, Audio
 * and the HUD only listen to `Events.CatSurrender`. It never clears a wave: the cats walk off and are really removed, then WaveSystem
 * sees `aliveCount() === 0` like always. Runs on the game clock (the `now` GameScene passes in), so the pause menu stops it.
 *
 * One roll per wave, at the first moment every condition is true. Waves that can never roll (first wave, boss, final wave, the wave
 * after a surrender, past the per-run limit) are decided once when the wave starts.
 */
export class SurrenderSystem {
  /** Waves started in this run (an endless run counts from its own first wave). */
  private runWaves = 0;
  private count = 0;
  private lastWave = -Infinity;
  /** Cats Varu killed in the current wave. */
  private waveKills = 0;
  /** The current wave may still roll (not rolled yet, and it is allowed to). */
  private canRoll = false;

  constructor(
    scene: Phaser.Scene,
    private readonly src: SurrenderSources,
  ) {
    const off = [
      listen<WavePayload>(Events.WaveStarted, ({ wave }) => this.onWaveStarted(wave)),
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ type }) => {
        if (type !== 'lucky') this.waveKills += 1; // the lucky cat is a bonus, not part of the wave
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  private onWaveStarted(wave: number): void {
    const { waves } = this.src;
    this.runWaves += 1;
    this.waveKills = 0;
    this.canRoll =
      SURRENDER.enabled &&
      this.runWaves >= SURRENDER.minRunWave &&
      !waves.isBossWave &&
      !waves.isFinalWave &&
      wave !== this.lastWave + 1 && // never two waves in a row
      this.count < SURRENDER.maxPerRun;
  }

  update(now: number): void {
    if (!this.canRoll) return;
    const { waves, player } = this.src;
    if (!waves.allSpawned || this.src.pendingHides() > 0) return; // queue empty and nobody still hiding
    if (now - waves.waveStartedAt < SURRENDER.minWaveMs) return; // not instantly
    if (this.waveKills < SURRENDER.minKills) return;
    if (player.hp < player.maxHp * SURRENDER.minVaruHpFraction) return; // never while Varu is dying

    const cats = this.aliveCats();
    if (cats.length === 0 || cats.length > SURRENDER.maxAlive) return;
    if (cats.some((cat) => cat.isBoss || !cat.hittable)) return; // not while a cat is mid-teleport (ninja)

    this.canRoll = false; // the one roll of this wave, win or lose
    if (Math.random() >= SURRENDER.chance) return;

    this.count += 1;
    this.lastWave = waves.wave;
    for (const cat of cats) cat.surrender(this.exitFor(cat));
    this.src.addScore(SURRENDER.score);
  }

  /**
   * Dev only (debug key O): every cat on the field gives up right now, whatever the conditions. Does not count toward the
   * per-run limit and gives no score. Bosses and ninjas mid-teleport stay as they are.
   */
  force(): void {
    for (const cat of this.aliveCats()) {
      if (!cat.isBoss && cat.hittable) cat.surrender(this.exitFor(cat));
    }
  }

  private aliveCats(): Enemy[] {
    return (this.src.enemies.getChildren() as Enemy[]).filter((cat) => cat.active && cat.alive && !cat.surrendering && !cat.isBonus);
  }

  /** The nearest enemy spawn point; without any, the nearest world edge (a little inside it). */
  private exitFor(cat: Enemy): Point {
    const dist = (p: Point): number => Phaser.Math.Distance.Between(cat.x, cat.y, p.x, p.y);
    const spots: readonly Point[] =
      this.src.exits.length > 0
        ? this.src.exits
        : [
            { x: SURRENDER.edgeInset, y: cat.y },
            { x: WORLD.width - SURRENDER.edgeInset, y: cat.y },
            { x: cat.x, y: SURRENDER.edgeInset },
            { x: cat.x, y: WORLD.height - SURRENDER.edgeInset },
          ];
    return spots.reduce((best, p) => (dist(p) < dist(best) ? p : best));
  }
}
