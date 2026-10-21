/** @file The last cat of a wave dies in slow motion for the WHOLE game (Varu, cats, physics, timers, tweens, particles) with a camera zoom, then it speeds back up. */
import Phaser from 'phaser';
import { isBossType } from '../config/balance';
import { SLOW_MO } from '../config/slowMo';
import { gameClock } from '../core/clock';
import { Events, listen, type EnemyKilledPayload } from '../core/events';
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
export class SlowMoSystem {
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
      listen(Events.WaveCleared, () => {
        if (SLOW_MO.enabled && !this.lastKillWasBoss && gameClock.now - this.lastKillAt <= SLOW_MO.windowMs) this.elapsed = 0;
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      // The scene's camera manager is already torn down by the time this runs, so only reset speed (never touch the camera here).
      this.elapsed = -1;
      this.shutDown = true;
      this.debugScale = 1; // a restarted run starts at normal speed
      this.apply(1);
    });
  }

  /** `realDelta` = the frame time from Phaser's update (not scaled by anything). */
  update(realDelta: number): void {
    if (this.elapsed < 0) return;
    this.elapsed += realDelta;
    const { inMs, holdMs, outMs, minScale, zoom } = SLOW_MO;
    let scale: number;
    if (this.elapsed < inMs) {
      scale = 1 - (this.elapsed / inMs) * (1 - minScale);
    } else if (this.elapsed < inMs + holdMs) {
      scale = minScale;
    } else if (this.elapsed < inMs + holdMs + outMs) {
      const u = (this.elapsed - inMs - holdMs) / outMs;
      scale = minScale + (1 - minScale) * (u * u * (3 - 2 * u));
    } else {
      this.stop();
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

  /** Back to normal speed and zoom right now. */
  stop(): void {
    this.elapsed = -1;
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
    const f = SLOW_MO.focus * k;
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
