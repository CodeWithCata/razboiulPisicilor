/** @file The juice: screen shake, particles, floating words (listens to the bus). */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { BALL_FX, ENERGY_FLIP, GOLD_BELT, IDLE_HABITS, KAMIKAZE_BLAST, MILK_FX, NINJA_POOF, SMOKE_BREAK, TENNIS_RETURN_FX } from '../config/animation';
import { ARENA } from '../config/arena';
import { LUCKY, SURRENDER } from '../config/balance';
import { BAD_PICKUP_FX, PICKUP_VISUALS } from '../config/pickups';
import { css, FONT, FONT_SFX } from '../config/style';
import {
  Events,
  listen,
  type BallLandedPayload,
  type CatBumpPayload,
  type CatSurrenderPayload,
  type IdleHabitPayload,
  type BossDefeatedPayload,
  type CrowImpactPayload,
  type EnemyKilledPayload,
  type ExplosionPayload,
  type JokePayload,
  type PickupPayload,
  type PointPayload,
  type SmokeBreakPayload,
  type TeleportPayload,
} from '../core/events';
import { gameClock } from '../core/clock';
import { BACKFLIP_WORDS, BALL_LAND_WORDS, BUMP_WORDS, IDLE_HABIT_WORDS, CROW_MISS_LINES, CROW_SCREAM, HIT_WORDS, BAD_LUCK_WORD, PICKUP_LABELS, POOF_WORDS, SMOKE_LINES, SURRENDER_LINES, LUCKY_ESCAPE_LINES, LUCKY_TEXT, pick } from '../content/lines';
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
  /** Green dust of the back flip's landing. */
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milkPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldMilk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];
  private lastPoofAt = -Infinity;
  private lastBallWordAt = -Infinity;

  /** `isGolden`: true while the golden belt is active, so hits splash thick yellowish goo instead of milk. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isGolden: () => boolean = () => false,
  ) {
    this.sparks = this.emitter(300, { min: 90, max: 260 }, 0.55, [0xffffff, 0xf5c518]);
    this.fur = this.emitter(550, { min: 60, max: 200 }, 0.9, [0xf59a3c, 0xfff3d6, 0xd9731a]);
    this.smoke = this.emitter(500, { min: 30, max: 140 }, 1.1, [0x7a4fb5, 0x2e2e3d]);
    this.dust = this.emitter(450, { min: 50, max: 150 }, 0.9, [0xb4ff1a, 0xe6ffa8, 0xffffff]);
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
        this.floatText(x, y - 24, pick(HIT_WORDS), '#fff3d6', 26, FONT_SFX);
        this.shake(70, 0.0025);
      }),
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ x, y, type }) => {
        this.fur.explode(14, x, y);
        this.shake(110, 0.005);
        if (type === 'lucky') {
          this.sparks.explode(LUCKY.fx.catchSparks, x, y); // caught the lucky cat: a golden burst
          this.floatText(x, y - 50, LUCKY_TEXT.catchWord, '#f5c518', 50);
          this.shake(LUCKY.fx.catchShakeMs, LUCKY.fx.catchShake);
        }
      }),
      listen<PointPayload>(Events.LuckySpawn, ({ x, y }) => {
        this.sparks.explode(LUCKY.fx.appearSparks, x, y);
        this.floatText(x, y - 50, LUCKY_TEXT.spawnWord, '#f5c518', 36);
      }),
      listen<PointPayload>(Events.LuckyGone, ({ x, y }) => this.floatText(x, y - 50, pick(LUCKY_ESCAPE_LINES), '#f5c518', 26, FONT, 500)), // she got away
      listen<CatBumpPayload>(Events.CatBump, ({ x, y }) => {
        this.sparks.explode(8, x, y);
        this.floatText(x, y - 44, pick(BUMP_WORDS), '#ffd9a8', 24, FONT_SFX);
      }),
      // A cat gave up (Enemy.surrender): its line floats above its head for a good while, so it can be read. The flag itself belongs to the cat.
      listen<CatSurrenderPayload>(Events.CatSurrender, ({ x, y }) => {
        const L = SURRENDER.line;
        this.floatText(x, y + L.offsetY, pick(SURRENDER_LINES), L.color, L.size, FONT, L.holdMs);
      }),
      listen<IdleHabitPayload>(Events.IdleHabit, ({ x, y, habit }) => {
        if (habit === 'belt') this.sparks.explode(IDLE_HABITS.glintCount, x, y); // a glint on the buckle
        this.floatText(x, y - 56, pick(IDLE_HABIT_WORDS[habit]), '#e6e6ee', 22, habit === 'neck' ? FONT_SFX : FONT);
      }),
      listen<PointPayload>(Events.PlayerHurt, ({ x, y }) => {
        this.sparks.explode(10, x, y);
        this.shake(160, 0.008);
      }),
      listen<SmokeBreakPayload>(Events.SmokeBreak, ({ x, y, quiet }) => {
        if (!quiet) this.floatText(x, y + SMOKE_BREAK.textOffsetY, pick(SMOKE_LINES), '#e6e6ee', 26);
      }),
      listen<TeleportPayload>(Events.Teleport, (e) => this.teleport(e)),
      listen<PointPayload>(Events.BackflipLand, (e) => this.backflipLand(e)),
      listen<PointPayload>(Events.ProjectileBlocked, ({ x, y }) => {
        this.sparks.explode(5, x, y);
        this.floatText(x, y - 14, 'PLAF!', '#ffb3cf', 20, FONT_SFX);
      }),
      listen<ExplosionPayload>(Events.Explosion, (e) => this.explosion(e)),
      listen<PickupPayload>(Events.PickupCollected, ({ kind, x, y }) => {
        this.sparks.explode(14, x, y);
        this.floatText(x, y - 34, PICKUP_LABELS[kind], css(PICKUP_VISUALS[kind].color), 30);
      }),
      listen<PickupPayload>(Events.BadPickup, ({ kind, x, y }) => {
        const B = BAD_PICKUP_FX;
        const color = css(PICKUP_VISUALS[kind].color);
        this.sparks.explode(B.sparks, x, y);
        this.shake(B.shake.ms, B.shake.intensity);
        this.floatText(x, y + B.word.offsetY, BAD_LUCK_WORD, B.word.color, B.word.size);
        this.floatText(x, y - 34, PICKUP_LABELS[kind], color, 30);
      }),
      listen<CrowImpactPayload>(Events.CrowImpact, (e) => this.crowImpact(e)),
      listen<BallLandedPayload>(Events.BallLanded, (e) => this.ballLanded(e)),
      // Jokes for the 'float' channel rise from the spot; the 'toast' ones are shown by the HUD.
      listen<JokePayload>(Events.Joke, ({ channel, x, y, text, color, size }) => {
        if (channel === 'float') this.floatText(x, y, text, color, size);
      }),
      listen<PointPayload>(Events.ProjectileDeflected, ({ x, y }) => {
        this.sparks.explode(10, x, y);
        this.floatText(x, y - 16, 'RETUR!', '#a8ffb0', 26, FONT_SFX);
        this.shake(60, 0.003);
      }),
      listen<PointPayload>(Events.TennisReturn, ({ x, y }) => {
        const R = TENNIS_RETURN_FX;
        this.sparks.explode(R.sparks, x, y);
        this.floatText(x, y - 16, R.word.text, R.word.color, R.word.size, FONT_SFX);
        this.shake(R.shake.ms, R.shake.intensity);
      }),
      listen<PointPayload>(Events.BossStunned, ({ x, y }) => {
        this.sparks.explode(18, x, y);
        this.floatText(x, y - 90, 'AMEȚIT!', '#ffe066', 46);
        this.shake(200, 0.01);
      }),
      // Boss shouts are speech bubbles now: systems/CatChatter.ts listens to Events.BossShout.
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

  /** Slow-motion (systems/SlowMoSystem.ts): the burst particles run at this speed too (1 = normal). Particle emitters have a `timeScale`. */
  setSlowMo(scale: number): void {
    for (const emitter of [this.sparks, this.fur, this.smoke, this.feathers, this.dust]) {
      (emitter as unknown as { timeScale: number }).timeScale = scale;
    }
  }

  shake(durationMs: number, intensity: number): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** Floating word. Jokes and big shouts use the normal font; pass FONT_SFX for the small hit / environment words. `holdMs` = how long it stays put, fully visible, before it floats up and fades (a line that must be read). */
  floatText(x: number, y: number, text: string, color = '#ffffff', size = 28, font = FONT, holdMs = 0): void {
    const label = this.scene.add
      .text(x, y, text, { fontFamily: font, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(60);
    this.scene.tweens.add({
      targets: label, y: y - 46, alpha: 0, duration: 650, delay: holdMs, ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  /** Varu lands his back flip: a green ring spreads on the floor, a puff of dust, a small shake and a word. */
  private backflipLand({ x, y }: PointPayload): void {
    const L = ENERGY_FLIP.land;
    const ring = this.scene.add.circle(x, y, L.ring.startPx, L.ring.color, 0.12).setStrokeStyle(L.ring.width, L.ring.color, L.ring.alpha).setDepth(11);
    this.scene.tweens.add({
      targets: ring, scale: L.ring.endPx / L.ring.startPx, alpha: 0, duration: L.ring.ms, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    this.dust.explode(L.dust.count, x, y);
    this.sparks.explode(6, x, y);
    this.shake(L.shake.ms, L.shake.intensity);
    this.floatText(x, y + L.word.offsetY, pick(BACKFLIP_WORDS), L.word.color, L.word.size);
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

  /** A tennis ball of the ball rain landed: a small shake and a word (the dust and fuzz come from BallLobSystem). Words are spaced out, the balls come in bunches. */
  private ballLanded({ x, y }: BallLandedPayload): void {
    this.shake(BALL_FX.shake.ms, BALL_FX.shake.intensity);
    const now = gameClock.now;
    if (now - this.lastBallWordAt < BALL_FX.word.gapMs) return;
    this.lastBallWordAt = now;
    this.floatText(x, y - BALL_FX.word.offsetY, pick(BALL_LAND_WORDS), BALL_FX.word.color, BALL_FX.word.size, FONT_SFX);
  }

  /** Expanding ring + fur burst. The ring is the visible blast radius. */
  private explosion({ x, y, radius, shockwave, fur }: ExplosionPayload): void {
    if (fur !== false) this.fur.explode(32, x, y);
    this.sparks.explode(16, x, y);
    if (shockwave) {
      const B = KAMIKAZE_BLAST;
      this.shake(B.shake.ms, B.shake.intensity);
      this.floatText(x, y + B.word.offsetY, B.word.text, B.word.color, B.word.size, FONT_SFX);
      this.shockwaveRings(x, y, radius);
      this.scorch(x, y, radius);
    } else {
      this.shake(220, 0.012);
      this.floatText(x, y - 30, 'BUM!', '#ffd166', 38);
    }

    const ring = this.scene.add.circle(x, y, 10, 0xfff3d6, 0.25).setStrokeStyle(6, 0xfff3d6, 1).setDepth(45);
    this.scene.tweens.add({
      targets: ring, scale: radius / 10, alpha: 0, duration: 380, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Two thin rings that race outward and thin out as they go: the shockwave of a kamikaze cat. */
  private shockwaveRings(x: number, y: number, radius: number): void {
    const B = KAMIKAZE_BLAST;
    const g = this.scene.add.graphics().setDepth(46);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: B.ringMs, ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const v = tween.getValue() ?? 0;
        g.clear();
        g.lineStyle(Math.max(2, B.outerWidth * (1 - v)), B.outerColor, 1 - v);
        g.strokeCircle(x, y, radius * B.outerReach * v);
        g.lineStyle(Math.max(1, B.innerWidth * (1 - v)), B.innerColor, (1 - v) * 0.9);
        g.strokeCircle(x, y, radius * B.innerReach * v);
      },
      onComplete: () => g.destroy(),
    });
  }

  /** A dark mark on the floor where the blast was. It fades away. */
  private scorch(x: number, y: number, radius: number): void {
    const S = KAMIKAZE_BLAST.scorch;
    const mark = this.scene.add.circle(x, y, radius * S.radiusFactor, S.color, S.alpha).setDepth(ARENA.depth.decor + 0.3);
    this.scene.tweens.add({ targets: mark, alpha: 0, duration: S.fadeMs, ease: 'Quad.easeIn', onComplete: () => mark.destroy() });
  }

  /** Smoke at the spot. A ninja cat gets a bigger puff at both ends and a little word where it lands. */
  private teleport({ x, y, ninja }: TeleportPayload): void {
    if (!ninja) {
      this.smoke.explode(12, x, y);
      return;
    }
    const P = NINJA_POOF;
    this.smoke.explode(P.smokeCount, x, y);
    const puff = this.scene.add.circle(x, y, P.puff.radius, P.puff.color, P.puff.alpha).setDepth(44);
    this.scene.tweens.add({ targets: puff, scale: P.puff.grow, alpha: 0, duration: P.puff.ms, ease: 'Cubic.easeOut', onComplete: () => puff.destroy() });
    const now = gameClock.now;
    if (ninja === 'in' && now - this.lastPoofAt >= P.wordGapMs) {
      this.lastPoofAt = now;
      this.floatText(x, y + P.word.offsetY, pick(POOF_WORDS), P.word.color, P.word.size, FONT_SFX);
    }
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
