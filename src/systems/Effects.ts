/** @file The juice: screen shake, particles, floating words (listens to the bus). */
import { texArgs, texRef } from '../assets/atlas';
import { FX_SHOCK_R } from '../assets/art/fx';
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { BALL_FX, ENERGY_FLIP, GOLD_BELT, IDLE_HABITS, KAMIKAZE_BLAST, MILK_FX, NINJA_POOF, SMOKE_BREAK, TENNIS_RETURN_FX } from '../config/animation';
import { DODGE } from '../config/dodge';
import { ICE_CREAM } from '../config/iceCream';
import { ARENA } from '../config/arena';
import { LUCKY, SURRENDER } from '../config/balance';
import { STACK_FX } from '../config/buffStacks';
import { BAD_PICKUP_FX, PICKUP_VISUALS } from '../config/pickups';
import { css, FONT, FONT_SFX } from '../config/style';
import {
  Events,
  listen,
  type BallLandedPayload,
  type CatBumpPayload,
  type CatJailedPayload,
  type CatSurrenderPayload,
  type IdleHabitPayload,
  type BossDefeatedPayload,
  type BossWeakPayload,
  type BuffStackedPayload,
  type CrowImpactPayload,
  type DodgeRollPayload,
  type EnemyKilledPayload,
  type ExplosionPayload,
  type JokePayload,
  type IceBlastPayload,
  type PickupPayload,
  type PointPayload,
  type SmokeBreakPayload,
  type TeleportPayload,
} from '../core/events';
import { gameClock } from '../core/clock';
import { JAIL_WORDS, BACKFLIP_WORDS, BALL_LAND_WORDS, BUMP_WORDS, IDLE_HABIT_WORDS, CROW_MISS_LINES, CROW_SCREAM, HIT_WORDS, BAD_LUCK_WORD, MONSTER_STACK_WORDS, PICKUP_LABELS, POOF_WORDS, SMOKE_LINES, SURRENDER_LINES, LUCKY_ESCAPE_LINES, LUCKY_TEXT, UMBRELLA_WORDS, DODGE_WORDS, SCOOTER_WORDS, ICE_WORDS, pick } from '../content/lines';
import { BELT_CHAIN } from '../config/finisher';
import { WEAK_POINT } from '../config/weakPoint';
import { FINISHER_WORDS, WEAK_POINT_TEXT } from '../content/juice';
import { createDrops, createPuddles } from './belt/gooEmitters';
import { flatDisc } from './flatShapes';

/**
 * All the "juice": screen shake, particles, floating words.
 * It listens to the event bus, so enemies and the belt never know about it.
 * Everything here is code-drawn, so it needs no art.
 */
/** How many finished floating words are kept for reuse (more than ever float at once in a normal fight). */
const TEXT_POOL_MAX = 16;

export class Effects {
  /** Hidden floating words waiting to be reused by `floatText`. The scene destroys the objects itself on shutdown. */
  private readonly textPool: Phaser.GameObjects.Text[] = [];
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fur: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly feathers: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Green dust of the back flip's landing. */
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Pale dust kicked up at the start of a dodge roll. */
  private readonly rollDust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly milkPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldMilk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];
  private lastPoofAt = -Infinity;
  private lastBallWordAt = -Infinity;
  private lastWeakWordAt = -Infinity;
  /** Strength and end (scene time) of the camera shake that runs now (see `shake`). */
  private shakePower = 0;
  private shakeUntil = 0;

  /** `isGolden`: true while the golden belt is active, so hits splash thick yellowish goo instead of milk. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly isGolden: () => boolean = () => false,
  ) {
    this.sparks = this.emitter(300, { min: 90, max: 260 }, 0.55, [0xffffff, 0xf5c518]);
    this.fur = this.emitter(550, { min: 60, max: 200 }, 0.9, [0xf59a3c, 0xfff3d6, 0xd9731a]);
    this.smoke = this.emitter(500, { min: 30, max: 140 }, 1.1, [0x7a4fb5, 0x2e2e3d]);
    this.dust = this.emitter(450, { min: 50, max: 150 }, 0.9, [0xb4ff1a, 0xe6ffa8, 0xffffff]);
    this.rollDust = this.emitter(380, { min: 40, max: 120 }, 0.8, [0xe6d9b3, 0xf5ecd0, 0xffffff]);
    this.feathers = this.scene.add
      .particles(0, 0, texRef(Tex.Feather).key, { frame: texRef(Tex.Feather).frame,
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
        this.floatText(x, y - 24, pick(HIT_WORDS), '#fff3d6', 26, FONT_SFX); // the shake of a hit is in systems/HitFeel.ts
      }),
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ x, y, type }) => {
        this.fur.explode(14, x, y);
        if (type === 'lucky') {
          this.sparks.explode(LUCKY.fx.catchSparks, x, y); // caught the lucky cat: a golden burst
          this.floatText(x, y - 50, LUCKY_TEXT.catchWord, '#f5c518', 50);
          this.shake(LUCKY.fx.catchShakeMs, LUCKY.fx.catchShake);
        }
      }),
      // The finisher swings (a word over Varu) and a boss opens its weak point (a word and a ring of sparks; the ring itself belongs to the boss).
      listen<PointPayload>(Events.BeltFinisher, ({ x, y }) => this.floatText(x, y - 64, pick(FINISHER_WORDS), BELT_CHAIN.word.color, BELT_CHAIN.word.size)),
      listen<PointPayload>(Events.FinisherHit, ({ x, y }) => this.sparks.explode(8, x, y)),
      listen<BossWeakPayload>(Events.BossWeakPoint, ({ x, y }) => this.floatText(x, y - 110, WEAK_POINT_TEXT.open, WEAK_POINT.fx.wordColor, WEAK_POINT.fx.openSize)),
      listen<BossWeakPayload>(Events.BossWeakHit, ({ x, y }) => {
        this.sparks.explode(WEAK_POINT.fx.sparks, x, y);
        const now = gameClock.now;
        if (now - this.lastWeakWordAt < WEAK_POINT.fx.wordGapMs) return;
        this.lastWeakWordAt = now;
        this.floatText(x, y - 90, WEAK_POINT_TEXT.hit, WEAK_POINT.fx.wordColor, WEAK_POINT.fx.wordSize);
      }),
      listen<PointPayload>(Events.BomberArrived, () => this.shake(200, 0.004)), // she is an event
      listen<PointPayload>(Events.LuckySpawn, ({ x, y }) => {
        this.sparks.explode(LUCKY.fx.appearSparks, x, y);
        this.floatText(x, y - 50, LUCKY_TEXT.spawnWord, '#f5c518', 36);
      }),
      listen<PointPayload>(Events.LuckyGone, ({ x, y }) => this.floatText(x, y - 50, pick(LUCKY_ESCAPE_LINES), '#f5c518', 26, FONT, 500)), // she got away
      // A cat is jailed for good (the wave ended while it was locked in a bed): a sparkle, the word and the bonus.
      listen<CatJailedPayload>(Events.CatJailed, ({ x, y, points }) => {
        this.sparks.explode(10, x, y);
        this.floatText(x, y - 50, pick(JAIL_WORDS), '#ffb3cf', 30, FONT_SFX);
        this.floatText(x, y - 84, `+${points}`, '#f5c518', 30);
      }),
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
      listen<PointPayload>(Events.RainbowDrop, ({ x, y }) => this.sparks.explode(16, x, y)),
      listen<DodgeRollPayload>(Events.DodgeLaunch, ({ x, y }) => this.rollDust.explode(DODGE.dust.count, x, y)),
      listen<PointPayload>(Events.DodgeSave, ({ x, y }) => {
        this.sparks.explode(6, x, y);
        this.floatText(x, y - 44, pick(DODGE_WORDS), '#9fd3ff', 26, FONT_SFX);
      }),
      listen<PointPayload>(Events.UmbrellaBlock, ({ x, y }) => {
        this.sparks.explode(7, x, y);
        this.floatText(x, y - 40, pick(UMBRELLA_WORDS), '#9fd3ff', 24, FONT_SFX);
      }),
      listen<PointPayload>(Events.ScooterBump, ({ x, y }) => {
        this.sparks.explode(5, x, y);
        this.floatText(x, y - 36, pick(SCOOTER_WORDS), '#7ff0de', 24, FONT_SFX);
      }),
      listen<IceBlastPayload>(Events.IceBlast, ({ x, y, radius, frozen }) => this.iceBlast(x, y, radius, frozen)),
      listen<ExplosionPayload>(Events.Explosion, (e) => this.explosion(e)),
      listen<PickupPayload>(Events.PickupCollected, ({ kind, x, y }) => {
        this.sparks.explode(14, x, y);
        this.floatText(x, y - 34, PICKUP_LABELS[kind], css(PICKUP_VISUALS[kind].color), 30);
      }),
      listen<BuffStackedPayload>(Events.BuffStacked, ({ kind, stacks, max, x, y }) => {
        const S = STACK_FX;
        const atMax = stacks >= max;
        this.sparks.explode(atMax ? S.sparks.max : S.sparks.stack, x, y);
        const word = kind === 'monster' ? MONSTER_STACK_WORDS[stacks] : undefined;
        if (word) this.floatText(x, y + S.word.offsetY, word, atMax ? S.word.maxColor : S.word.color, atMax ? S.word.maxSize : S.word.size);
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
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off.forEach((f) => f());
      this.textPool.length = 0;
    });
  }

  /** Slow-motion (systems/SlowMoSystem.ts): the burst particles run at this speed too (1 = normal). Particle emitters have a `timeScale`. */
  setSlowMo(scale: number): void {
    for (const emitter of [this.sparks, this.fur, this.smoke, this.feathers, this.dust]) {
      (emitter as unknown as { timeScale: number }).timeScale = scale;
    }
  }

  /**
   * Camera shake. One arbiter for the whole game: a new shake replaces the one running only when it is at least as strong
   * (Phaser alone would ignore every new shake while one runs, so a tiny hit shake could swallow a boss's K.O. shake, or the other way round).
   */
  shake(durationMs: number, intensity: number): void {
    const cam = this.scene.cameras?.main;
    if (!cam) return;
    const now = this.scene.time.now;
    if (now < this.shakeUntil && intensity < this.shakePower) return;
    this.shakePower = intensity;
    this.shakeUntil = now + durationMs;
    cam.shake(durationMs, intensity, true);
  }

  /** Floating word. Jokes and big shouts use the normal font; pass FONT_SFX for the small hit / environment words. `holdMs` = how long it stays put, fully visible, before it floats up and fades (a line that must be read). */
  floatText(x: number, y: number, text: string, color = '#ffffff', size = 28, font = FONT, holdMs = 0): void {
    // A finished word goes back to a small pool instead of being destroyed: a new Text means a new canvas and a new GPU texture, which is what makes a frame stutter in a busy fight.
    const label = this.textPool.pop() ?? this.scene.add.text(0, 0, '').setOrigin(0.5).setDepth(60);
    label
      .setStyle({ fontFamily: font, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 5 })
      .setText(text)
      .setPosition(x, y)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);
    this.scene.tweens.add({
      targets: label, y: y - 46, alpha: 0, duration: 650, delay: holdMs, ease: 'Cubic.easeOut',
      onComplete: () => this.recycleText(label),
    });
  }

  /** A floating word finished: hide it and keep it for the next one (at most `TEXT_POOL_MAX`, the rest are destroyed). */
  private recycleText(label: Phaser.GameObjects.Text): void {
    if (this.textPool.length >= TEXT_POOL_MAX) {
      label.destroy();
      return;
    }
    label.setVisible(false).setActive(false);
    this.textPool.push(label);
  }

  /** Varu lands his back flip: a green ring spreads on the floor, a puff of dust, a small shake and a word. */
  private backflipLand({ x, y }: PointPayload): void {
    const L = ENERGY_FLIP.land;
    const ring = this.scene.add.image(x, y, ...texArgs(Tex.FxShock)).setTint(L.ring.color).setAlpha(L.ring.alpha).setDepth(11).setScale(L.ring.startPx / FX_SHOCK_R);
    this.scene.tweens.add({
      targets: ring, scale: L.ring.endPx / FX_SHOCK_R, alpha: 0, duration: L.ring.ms, ease: 'Cubic.easeOut',
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

  /** The ice cream: a pale-blue ring spreads from Varu out to the freeze radius, frost sparks, a word over him. */
  private iceBlast(x: number, y: number, radius: number, frozen: number): void {
    const B = ICE_CREAM.blast;
    const ring = this.scene.add.image(x, y, ...texArgs(Tex.FxShock)).setTint(B.color).setAlpha(B.alpha).setDepth(45).setScale(B.startPx / FX_SHOCK_R);
    this.scene.tweens.add({ targets: ring, scale: radius / FX_SHOCK_R, alpha: 0, duration: B.ringMs, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.sparks.explode(B.sparks, x, y);
    this.floatText(x, y - 64, frozen > 0 ? pick(ICE_WORDS) : 'Nimeni nu-i aproape...', '#9fe4ff', 30, FONT_SFX);
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

    const ring = this.scene.add.image(x, y, ...texArgs(Tex.FxShock)).setTint(0xfff3d6).setDepth(45).setScale(10 / FX_SHOCK_R);
    this.scene.tweens.add({
      targets: ring, scale: radius / FX_SHOCK_R, alpha: 0, duration: 380, ease: 'Cubic.easeOut',
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
    const mark = flatDisc(this.scene, x, y, radius * S.radiusFactor, S.color, S.alpha).setDepth(ARENA.depth.decor + 0.3);
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
    const puff = flatDisc(this.scene, x, y, P.puff.radius, P.puff.color, P.puff.alpha).setDepth(44);
    this.scene.tweens.add({ targets: puff, scale: puff.scale * P.puff.grow, alpha: 0, duration: P.puff.ms, ease: 'Cubic.easeOut', onComplete: () => puff.destroy() });
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
    return this.scene.add.particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
      emitting: false, lifespan, speed,
      scale: { start: startScale, end: 0 }, alpha: { start: 1, end: 0 }, tint,
    }).setDepth(40);
  }
}
