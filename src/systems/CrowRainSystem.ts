import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { CROW_FALL } from '../config/animation';
import { ARENA_RULES, WORLD } from '../config/arena';
import { CROW_RAIN, type CrowVariant } from '../config/balance';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, type CrowImpactPayload, type ExplosionPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import { gameClock } from '../core/clock';

/** Each crow has three wing poses: open (gliding), flap (wings raised) and fold (tucked for the dive and the landing). */
interface CrowFrames {
  open: TexKey;
  flap: TexKey;
  fold: TexKey;
}
const NORMAL: CrowFrames = { open: Tex.Crow, flap: Tex.CrowFlap, fold: Tex.CrowFold };
const FRAMES: Record<CrowVariant, CrowFrames> = {
  normal: NORMAL,
  golden: { open: Tex.CrowGold, flap: Tex.CrowGoldFlap, fold: Tex.CrowGoldFold },
  kamikaze: { open: Tex.CrowKamikaze, flap: Tex.CrowKamikazeFlap, fold: Tex.CrowKamikazeFold },
  miss: NORMAL,
};
const FEATHER_TINT: Record<CrowVariant, number[]> = {
  normal: [0x3d3d52, 0x2e2e3d, 0x6b6b8c],
  golden: [0xf5c518, 0xffe066, 0xfff6bf],
  kamikaze: [0x3d3d52, 0x2e2e3d, 0xd93a3a],
  miss: [0x3d3d52, 0x2e2e3d, 0x6b6b8c],
};

/**
 * The Crow Rain power-up: for a few seconds, crows drop from the sky.
 * Each one shows a growing shadow (the warning), then lands and bonks every cat nearby.
 * Crows never hurt Varu. All visuals here are code-drawn (assets/art/crows.ts); how they fall is CROW_FALL.
 */
export class CrowRainSystem {
  private endsAt = 0;
  private nextDropAt = 0;
  private readonly feathers: Record<CrowVariant, Phaser.GameObjects.Particles.ParticleEmitter>;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly arena: ArenaQuery,
  ) {
    const feather = (tint: number[]): Phaser.GameObjects.Particles.ParticleEmitter =>
      scene.add
        .particles(0, 0, Tex.Feather, {
          emitting: false,
          lifespan: { min: 650, max: 1100 },
          speed: { min: 14, max: 70 },
          rotate: { min: 0, max: 360 },
          scale: { start: 0.9, end: 0.35 },
          alpha: { start: 1, end: 0 },
          tint,
        })
        .setDepth(49);
    this.feathers = {
      normal: feather(FEATHER_TINT.normal),
      golden: feather(FEATHER_TINT.golden),
      kamikaze: feather(FEATHER_TINT.kamikaze),
      miss: feather(FEATHER_TINT.miss),
    };
    this.dust = scene.add
      .particles(0, 0, Tex.Particle, {
        emitting: false,
        lifespan: { min: 380, max: 700 },
        speed: { min: 40, max: 150 },
        scale: { start: 1.1, end: 0.15 },
        alpha: { start: 0.85, end: 0 },
        tint: [...CROW_FALL.dust.tint],
      })
      .setDepth(11);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Object.values(this.feathers).forEach((e) => e.destroy());
      this.dust.destroy();
    });
  }

  get raining(): boolean {
    return gameClock.now < this.endsAt;
  }

  /** Start the rain, or refresh it if it's already going (it doesn't stack). */
  start(): void {
    const now = gameClock.now;
    if (now >= this.endsAt) this.nextDropAt = now + 300;
    this.endsAt = Math.max(this.endsAt, now + CROW_RAIN.durationMs);
  }

  update(time: number): void {
    if (time >= this.endsAt || time < this.nextDropAt) return;
    this.nextDropAt = time + CROW_RAIN.dropIntervalMs;
    this.drop();
  }

  private drop(): void {
    const variant = this.rollVariant();
    const target = this.pickTarget(variant);
    this.strike(variant, target.x, target.y);
  }

  private rollVariant(): CrowVariant {
    const { miss, golden, kamikaze } = CROW_RAIN.chances;
    const roll = Math.random();
    if (roll < miss) return 'miss';
    if (roll < miss + golden) return 'golden';
    if (roll < miss + golden + kamikaze) return 'kamikaze';
    return 'normal';
  }

  /** Most crows aim at a cat (with some wobble); the rest land anywhere. */
  private pickTarget(variant: CrowVariant): Phaser.Math.Vector2 {
    const alive = this.enemies.getChildren().filter((e) => e.active);
    if (variant !== 'miss' && alive.length > 0 && Math.random() < CROW_RAIN.targetEnemyChance) {
      const e = Phaser.Utils.Array.GetRandom(alive) as Enemy;
      const j = CROW_RAIN.targetJitter;
      return new Phaser.Math.Vector2(
        Phaser.Math.Clamp(e.x + Phaser.Math.Between(-j, j), 40, WORLD.width - 40),
        Phaser.Math.Clamp(e.y + Phaser.Math.Between(-j, j), 40, WORLD.height - 40),
      );
    }
    // "Anywhere" means anywhere Varu can see: inside a box around the middle of the view, kept inside the world.
    const { nearbyHalfWidth: hw, nearbyHalfHeight: hh } = ARENA_RULES;
    const view = this.scene.cameras.main.midPoint;
    const spot = this.arena.nearestOpen(
      Phaser.Math.Clamp(view.x + Phaser.Math.Between(-hw, hw), 60, WORLD.width - 60),
      Phaser.Math.Clamp(view.y + Phaser.Math.Between(-hh, hh), 60, WORLD.height - 60),
    );
    return new Phaser.Math.Vector2(spot.x, spot.y);
  }

  private strike(variant: CrowVariant, x: number, y: number): void {
    const { telegraphMs, size } = CROW_RAIN;
    const fall = CROW_FALL;
    const radius = CROW_RAIN.variants[variant].radius;
    const frames = FRAMES[variant];

    const shadow = this.scene.add.image(x, y, Tex.Shadow).setDepth(6).setAlpha(0.4);
    const ring =
      radius > 0
        ? this.scene.add.circle(x, y, radius, 0xff4d4d, 0.08).setStrokeStyle(3, 0xff4d4d, 0.55).setDepth(6).setAlpha(0)
        : null;

    // The crow swoops in from above and to one side, head first along its path.
    const side = Math.random() < 0.5 ? -1 : 1;
    const sx = x + side * fall.fromSide;
    const sy = y - fall.fromAbove;
    const heading = Math.atan2(y - sy, x - sx) - Math.PI / 2; // the picture dives head-down
    const crow = this.scene.add.image(sx, sy, frames.open).setDepth(50).setAlpha(0).setRotation(heading);
    const base = size / Math.max(crow.frame.realWidth, crow.frame.realHeight);
    crow.setScale(base * fall.startScale);

    const startedAt = gameClock.now;
    let nextFeatherAt = 0;
    let wings: TexKey = frames.open;

    // It gets smaller (farther from the camera) as it nears the ground while its shadow grows: that's the warning.
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: telegraphMs,
      ease: 'Quad.easeIn',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const elapsed = gameClock.now - startedAt;
        crow.setPosition(sx + (x - sx) * t, sy + (y - sy) * t);
        crow.setScale(base * (fall.startScale - (fall.startScale - 1) * t));
        crow.setAlpha(Math.min(1, t * 9));
        crow.setRotation(heading + Math.sin(elapsed / fall.swayMs) * fall.swayRad * (1 - t));

        // Flap while gliding, tuck the wings in for the last part of the dive.
        const want = t >= fall.tuckAt ? frames.fold : Math.floor(elapsed / fall.flapMs) % 2 === 0 ? frames.open : frames.flap;
        if (want !== wings) {
          wings = want;
          crow.setTexture(want);
        }

        if (t < 0.9 && elapsed >= nextFeatherAt) {
          nextFeatherAt = elapsed + fall.featherEveryMs;
          this.feathers[variant].emitParticleAt(crow.x, crow.y, 1);
        }

        const s = 0.25 + 0.75 * t;
        shadow.setDisplaySize(size * 1.1 * s, size * 0.55 * s).setAlpha(0.35 + 0.5 * t);
        ring?.setAlpha(t);
      },
      onComplete: () => {
        shadow.destroy();
        ring?.destroy();
        this.impact(variant, x, y, radius, crow, base, frames);
      },
    });
  }

  private impact(variant: CrowVariant, x: number, y: number, radius: number, crow: Phaser.GameObjects.Image, base: number, frames: CrowFrames): void {
    const impact: CrowImpactPayload = { x, y, variant, radius };
    const sq = CROW_FALL.squash;
    crow.setPosition(x, y).setTexture(frames.fold).setAlpha(1).setScale(base);
    this.dust.explode(CROW_FALL.dust.count, x, y);
    this.feathers[variant].explode(variant === 'miss' ? 5 : 9, x, y);

    if (variant === 'miss') {
      // Lands in the wrong place, stands there awkwardly (a dazed wobble), then leaves.
      bus.emit(Events.CrowImpact, impact);
      this.scene.tweens.add({ targets: crow, scaleX: base * sq.x, scaleY: base * sq.y, duration: sq.ms, yoyo: true });
      this.scene.tweens.add({ targets: crow, angle: crow.angle + 12, duration: 160, yoyo: true, repeat: 3, delay: 200, ease: 'Sine.easeInOut' });
      this.scene.tweens.add({ targets: crow, alpha: 0, delay: 1100, duration: 350, onComplete: () => crow.destroy() });
      return;
    }

    const stats = CROW_RAIN.variants[variant];
    for (const child of this.enemies.getChildren().slice()) {
      const enemy = child as Enemy;
      if (!enemy.active || !enemy.hittable) continue;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) - enemy.hitRadius;
      if (dist <= stats.radius) enemy.takeDamage(stats.damage, x, y, CROW_RAIN.knockback);
    }

    bus.emit(Events.CrowImpact, impact);
    if (variant === 'kamikaze') {
      const blast: ExplosionPayload = { x, y, radius, damage: 0, harmsPlayer: false };
      bus.emit(Events.Explosion, blast);
    }

    // The thud: squash flat for a moment, then fade away.
    this.scene.tweens.add({
      targets: crow,
      scaleX: base * sq.x,
      scaleY: base * sq.y,
      duration: sq.ms,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: crow, alpha: 0, delay: sq.fadeDelayMs, duration: sq.fadeMs, onComplete: () => crow.destroy() });
      },
    });
  }
}
