import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { GOLD_BELT, MILK_FX, SMOKE_BREAK } from '../config/animation';
import { PICKUP_VISUALS } from '../config/pickups';
import { css, FONT } from '../config/style';
import {
  Events,
  listen,
  type BossDefeatedPayload,
  type CrowImpactPayload,
  type EnemyKilledPayload,
  type ExplosionPayload,
  type JokePayload,
  type PickupPayload,
  type PointPayload,
  type ShoutPayload,
} from '../core/events';
import { CROW_MISS_LINES, CROW_SCREAM, HIT_WORDS, PICKUP_LABELS, SMOKE_LINES, pick } from '../content/lines';
import { createDrops, createPuddles } from './belt/gooEmitters';

/**
 * All the "juice": screen shake, particles, floating words.
 * It listens to the event bus, so enemies and the belt never know about it.
 * Everything here is code-drawn, so it needs no art.
 */
export class Effects {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fur: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly feathers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milkPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldMilk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];

  /** `isGolden`: true while the golden belt is active, so hits splash thick yellowish goo instead of milk. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isGolden: () => boolean = () => false,
  ) {
    this.sparks = this.emitter(300, { min: 90, max: 260 }, 0.55, [0xffffff, 0xf5c518]);
    this.fur = this.emitter(550, { min: 60, max: 200 }, 0.9, [0xf59a3c, 0xfff3d6, 0xd9731a]);
    this.smoke = this.emitter(500, { min: 30, max: 140 }, 1.1, [0x7a4fb5, 0x2e2e3d]);
    this.feathers = this.scene.add
      .particles(0, 0, Tex.Feather, {
        emitting: false,
        lifespan: { min: 600, max: 1000 },
        speed: { min: 80, max: 260 },
        rotate: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0.25 },
        alpha: { start: 1, end: 0 },
        tint: [0x2e2e3d, 0x4a4a63, 0xffffff],
      })
      .setDepth(40);
    this.milk = createDrops(this.scene, MILK_FX.splash, false, 41);
    this.milkPuddles = createPuddles(this.scene, false);
    this.goldMilk = createDrops(this.scene, MILK_FX.splash, true, 41);
    this.goldPuddles = createPuddles(this.scene, true);

    this.off.push(
      listen<PointPayload>(Events.EnemyHit, ({ x, y }) => {
        this.sparks.explode(6, x, y);
        if (MILK_FX.enabled) this.splashMilk(x, y);
        this.floatText(x, y - 24, pick(HIT_WORDS), '#fff3d6', 26);
        this.shake(70, 0.0025);
      }),
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ x, y }) => {
        this.fur.explode(14, x, y);
        this.shake(110, 0.005);
      }),
      listen<PointPayload>(Events.PlayerHurt, ({ x, y }) => {
        this.sparks.explode(10, x, y);
        this.shake(160, 0.008);
      }),
      listen<PointPayload>(Events.SmokeBreak, ({ x, y }) => this.floatText(x, y + SMOKE_BREAK.textOffsetY, pick(SMOKE_LINES), '#e6e6ee', 26)),
      listen<PointPayload>(Events.Teleport, ({ x, y }) => this.smoke.explode(12, x, y)),
      listen<PointPayload>(Events.ProjectileBlocked, ({ x, y }) => {
        this.sparks.explode(5, x, y);
        this.floatText(x, y - 14, 'PLAF!', '#ffb3cf', 20);
      }),
      listen<ExplosionPayload>(Events.Explosion, (e) => this.explosion(e)),
      listen<PickupPayload>(Events.PickupCollected, ({ kind, x, y }) => {
        this.sparks.explode(14, x, y);
        this.floatText(x, y - 34, PICKUP_LABELS[kind], css(PICKUP_VISUALS[kind].color), 30);
      }),
      listen<CrowImpactPayload>(Events.CrowImpact, (e) => this.crowImpact(e)),
      // Jokes for the 'float' channel rise from the spot; the 'toast' ones are shown by the HUD.
      listen<JokePayload>(Events.Joke, ({ channel, x, y, text, color, size }) => {
        if (channel === 'float') this.floatText(x, y, text, color, size);
      }),
      listen<PointPayload>(Events.ProjectileDeflected, ({ x, y }) => {
        this.sparks.explode(10, x, y);
        this.floatText(x, y - 16, 'RETUR!', '#a8ffb0', 26);
        this.shake(60, 0.003);
      }),
      listen<PointPayload>(Events.BossStunned, ({ x, y }) => {
        this.sparks.explode(18, x, y);
        this.floatText(x, y - 90, 'AMEȚIT!', '#ffe066', 46);
        this.shake(200, 0.01);
      }),
      listen<ShoutPayload>(Events.BossShout, ({ x, y, text }) => this.floatText(x, y, text, '#ffd9a8', 36)),
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ x, y }) => {
        this.fur.explode(40, x, y);
        this.feathers.explode(24, x, y);
        this.sparks.explode(24, x, y);
        this.floatText(x, y - 70, 'K.O.!', '#ffffff', 64);
        this.shake(550, 0.016);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  shake(durationMs: number, intensity: number): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 28): void {
    const label = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(60);
    this.scene.tweens.add({
      targets: label, y: y - 46, alpha: 0, duration: 650, ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Crow landing juice. Damage is handled by CrowRainSystem; this is only the show. */
  private crowImpact({ x, y, variant }: CrowImpactPayload): void {
    switch (variant) {
      case 'normal':
        this.feathers.explode(12, x, y);
        this.shake(90, 0.004);
        this.floatText(x, y - 28, 'BONK!', '#fff3d6', 30);
        break;
      case 'golden':
        this.feathers.explode(18, x, y);
        this.sparks.explode(14, x, y);
        this.shake(160, 0.008);
        this.floatText(x, y - 30, 'BONK!!', '#f5c518', 44);
        break;
      case 'kamikaze':
        this.feathers.explode(22, x, y);
        this.floatText(x, y - 44, CROW_SCREAM, '#ff8a8a', 34);
        break; // the blast ring + shake come from the Explosion event
      case 'miss':
        this.floatText(x, y - 40, pick(CROW_MISS_LINES), '#d9c8ff', 22);
        break;
    }
  }

  /** Expanding ring + fur burst. The ring is the visible blast radius. */
  private explosion({ x, y, radius }: ExplosionPayload): void {
    this.fur.explode(32, x, y);
    this.sparks.explode(16, x, y);
    this.shake(220, 0.012);
    this.floatText(x, y - 30, 'BUM!', '#ffd166', 38);

    const ring = this.scene.add.circle(x, y, 10, 0xfff3d6, 0.25).setStrokeStyle(6, 0xfff3d6, 1).setDepth(45);
    this.scene.tweens.add({
      targets: ring, scale: radius / 10, alpha: 0, duration: 380, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Gooey splash: teardrops that sag as they fly, plus a few puddles left on the ground. */
  private splashMilk(x: number, y: number): void {
    const gold = GOLD_BELT.enabled && this.isGolden();
    const milk = gold ? this.goldMilk : this.milk;
    const puddles = gold ? this.goldPuddles : this.milkPuddles;
    milk.explode(MILK_FX.splash.count * (gold ? GOLD_BELT.drops.countMult : 1), x, y);
    const spread = MILK_FX.splash.puddleSpread;
    for (let i = 0; i < MILK_FX.splash.puddles; i++) {
      puddles.emitParticleAt(x + Phaser.Math.FloatBetween(-spread, spread), y + Phaser.Math.FloatBetween(-spread, spread), 1);
    }
  }

  private emitter(lifespan: number, speed: { min: number; max: number }, startScale: number, tint: number[]) {
    return this.scene.add.particles(0, 0, Tex.Particle, {
      emitting: false, lifespan, speed,
      scale: { start: startScale, end: 0 }, alpha: { start: 1, end: 0 }, tint,
    }).setDepth(40);
  }
}
