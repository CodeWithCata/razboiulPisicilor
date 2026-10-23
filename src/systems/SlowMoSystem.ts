/** @file The last cat of a wave dies in slow motion for the WHOLE game (Varu, cats, physics, timers, tweens, particles) with a camera zoom, then it speeds back up. */
import Phaser from 'phaser';
import { isBossType } from '../config/balance';
import { BOSS_KILL, SLOW_MO } from '../config/slowMo';
import { gameClock } from '../core/clock';
import { bus, Events, listen, type BossDefeatedPayload, type BossKillBurstPayload, type EnemyKilledPayload } from '../core/events';
import type { Effects } from './Effects';

/**
 * Wave cleared right after a kill = that kill was the last cat. One number (`scale`, 1 = normal) slows everything in the scene:
 *  - game time (`gameClock.timeScale`): deadlines, cooldowns and every system GameScene feeds a scaled `dt`, Varu's and the cats' animation;
 *  - the arcade physics step (so Varu, the cats and everything flying move slowly too, not only the timers);
 *  - the scene's timers and tweens, and every particle emitter.
 * The beat itself is driven by REAL frame time (so it is the same length at any speed) and zooms the camera in a little.
 * Bosses have their own moment and are skipped. GameScene calls `stop()` when the run ends so nothing stays slowed.
 * The HUD (UIScene) is a different scene and stays at full speed on purpose.
 */
/** The numbers of one beat: the last cat of a wave (`SLOW_MO`) and a boss kill (`BOSS_KILL`) both have this shape. */
interface Beat {
  readonly minScale: number;
  readonly zoom: number;
  readonly focus: number;
  readonly inMs: number;
  readonly holdMs: number;
  readonly outMs: number;
}

export class SlowMoSystem {
  /** The numbers of the beat that runs now. */
  private beat: Beat = SLOW_MO;
  /** The beat that runs is a boss kill (confetti bursts go off, the victory screen waits for it). */
  private bossBeat = false;
  /** How many of `BOSS_KILL.bursts` have gone off. */
  private burstsDone = 0;
  /** Run when the boss kill beat ends by itself (the final boss: the victory screen). */
  private afterBeat: Array<() => void> = [];
  private lastKillAt = -Infinity;
  private lastKillWasBoss = false;
  private lastKillX = 0;
  private lastKillY = 0;
  /** Real ms since the beat started; -1 = not running. */
  private elapsed = -1;
  /** True once the scene has shut down: the camera is gone, so nothing may zoom it any more. */
  private shutDown = false;
  /** How fast the physics step runs (1 = normal). Read by `stepPhysics`. */
  private physicsScale = 1;
  /** Dev only (debug card): the speed the player picked; it multiplies whatever the slow-mo beat does. */
  private debugScale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly effects: Effects,
    private readonly player: { x: number; y: number },
  ) {
    this.apply(1);
    this.takeOverPhysicsStep();
    const off = [
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ type, x, y }) => {
        this.lastKillAt = gameClock.now;
        this.lastKillX = x;
        this.lastKillY = y;
        this.lastKillWasBoss = isBossType(type);
      }),
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ x, y }) => {
        this.lastKillX = x;
        this.lastKillY = y;
        this.lastKillWasBoss = true;
        this.startBossBeat();
      }),
      listen(Events.WaveCleared, () => {
        if (SLOW_MO.enabled && !this.lastKillWasBoss && gameClock.now - this.lastKillAt <= SLOW_MO.windowMs) this.startBeat(SLOW_MO, false);
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      // The scene's camera manager is already torn down by the time this runs, so only reset speed (never touch the camera here).
      this.elapsed = -1;
      this.afterBeat.length = 0;
      this.shutDown = true;
      this.debugScale = 1; // a restarted run starts at normal speed
      this.apply(1);
    });
  }

  /** `realDelta` = the frame time from Phaser's update (not scaled by anything). */
  update(realDelta: number): void {
    if (this.elapsed < 0) return;
    this.elapsed += realDelta;
    if (this.bossBeat) this.fireBursts();
    const { inMs, holdMs, outMs, minScale, zoom } = this.beat;
    let scale: number;
    if (this.elapsed < inMs) {
      scale = 1 - (this.elapsed / inMs) * (1 - minScale);
    } else if (this.elapsed < inMs + holdMs) {
      scale = minScale;
    } else if (this.elapsed < inMs + holdMs + outMs) {
      const u = (this.elapsed - inMs - holdMs) / outMs;
      scale = minScale + (1 - minScale) * (u * u * (3 - 2 * u));
    } else {
      const done = this.afterBeat.splice(0);
      this.stop();
      done.forEach((f) => f());
      return;
    }
    this.apply(scale);
    const k = (1 - scale) / (1 - minScale); // 0 = normal, 1 = deepest
    this.setZoom(1 + (zoom - 1) * k);
    this.setFocus(k);
  }

  /** Dev only (debug card): runs the whole game at this speed (1 = normal) until it is set again. */
  setDebugSpeed(scale: number): void {
    this.debugScale = scale;
    if (this.elapsed < 0) this.apply(1);
  }

  /** A boss kill beat is running (the final boss's victory screen waits for it). */
  get bossBeatActive(): boolean {
    return this.bossBeat && this.elapsed >= 0;
  }

  /** Run `done` when the boss kill beat has ended by itself. (A `stop()` from a game over or a restart drops it.) */
  whenBossBeatEnds(done: () => void): void {
    this.afterBeat.push(done);
  }

  private startBeat(beat: Beat, boss: boolean): void {
    this.beat = beat;
    this.bossBeat = boss;
    this.burstsDone = 0;
    this.elapsed = 0;
  }

  /** The boss is down: slow-mo, push-in on it, confetti. With `BOSS_KILL.enabled` off the burst just goes off at once. */
  private startBossBeat(): void {
    if (!BOSS_KILL.enabled) {
      this.emitBurst(BOSS_KILL.bursts[0]?.confetti ?? 0);
      return;
    }
    this.startBeat(BOSS_KILL, true);
    this.fireBursts();
  }

  /** Set off every burst whose time has come (real ms since the beat started). */
  private fireBursts(): void {
    const bursts = BOSS_KILL.bursts;
    while (this.burstsDone < bursts.length && this.elapsed >= bursts[this.burstsDone]!.atMs) {
      this.emitBurst(bursts[this.burstsDone]!.confetti);
      this.burstsDone += 1;
    }
  }

  private emitBurst(confetti: number): void {
    const payload: BossKillBurstPayload = { x: this.lastKillX, y: this.lastKillY, confetti };
    bus.emit(Events.BossKillBurst, payload);
  }

  /** Back to normal speed and zoom right now. */
  stop(): void {
    this.elapsed = -1;
    this.bossBeat = false;
    this.apply(1);
    this.setZoom(1);
    this.setFocus(0);
  }

  /** Slide the camera from Varu toward the last cat that fell (follow offset: camera centre = Varu - offset). */
  private setFocus(k: number): void {
    if (this.shutDown) return;
    const cam = this.scene.cameras?.main;
    const player = this.player;
    if (!cam) return;
    if (k <= 0) {
      cam.setFollowOffset(0, 0);
      return;
    }
    const f = this.beat.focus * k;
    cam.setFollowOffset((player.x - this.lastKillX) * f, (player.y - this.lastKillY) * f);
  }

  /** Zoom the main camera, but only while it still exists (win/lose switches scenes and destroys it). */
  private setZoom(zoom: number): void {
    if (this.shutDown) return;
    this.scene.cameras?.main?.setZoom(zoom);
  }

  /**
   * The arcade world normally steps itself on the scene's UPDATE event with the real frame time. To slow it we take that one listener
   * over and call `world.update` ourselves with a scaled time (the game runs with `fixedStep: false`, so the step is just that time).
   * If the listener cannot be found and removed we leave physics alone (it stays at full speed): never step it twice.
   */
  private takeOverPhysicsStep(): void {
    const world = this.scene.physics?.world;
    if (!world) return;
    const events = this.scene.events;
    const UPDATE = Phaser.Scenes.Events.UPDATE;
    events.off(UPDATE, world.update, world);
    if (events.listeners(UPDATE).includes(world.update)) return;
    const stepPhysics = (time: number, delta: number): void => world.update(time, delta * this.physicsScale);
    events.on(UPDATE, stepPhysics);
    events.once(Phaser.Scenes.Events.SHUTDOWN, () => events.off(UPDATE, stepPhysics));
  }

  private apply(beat: number): void {
    const scale = beat * this.debugScale;
    gameClock.timeScale = scale;
    this.physicsScale = scale;
    if (this.scene.tweens) this.scene.tweens.timeScale = scale;
    if (this.scene.time) this.scene.time.timeScale = scale;
    if (this.shutDown) return;
    this.effects.setSlowMo(scale);
    this.slowEmitters(scale);
  }

  /** Every particle emitter in the scene (Varu's smoke and goo, the belt's milk, the crows' feathers, tears...) runs at the same speed. */
  private slowEmitters(scale: number): void {
    const list = this.scene.children?.list;
    if (!list) return;
    for (const child of list) {
      if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) (child as unknown as { timeScale: number }).timeScale = scale; // not in the typings (same cast as Effects.setSlowMo)
    }
  }
}
