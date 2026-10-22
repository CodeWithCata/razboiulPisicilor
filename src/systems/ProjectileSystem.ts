/** @file Projectile sprite (yarn, tennis, fireball, broken heart) and the group that updates and expires them. */
import { texArgs, texRef } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { WORLD } from '../config/arena';
import { FIREBALL_FX } from '../config/animation';
import { PROJECTILES, type ProjectileKind, type ProjectileStats } from '../config/balance';
import { fitToSize, setCircleHitbox } from '../core/sprite';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, listen, type PointPayload, type ProjectileSmashPayload, type RallyHitPayload, type SpawnProjectilePayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { gameClock } from '../core/clock';
import { snapshotInto } from '../core/snapshot';
import { swatProjectile } from './belt/swat';

/** Placeholder texture per kind. */
const TEXTURES: Record<ProjectileKind, TexKey> = { yarn: Tex.Yarn, tennis: Tex.Tennis, fireball: Tex.Fireball, heart: Tex.Heart, sparkle: Tex.Star };

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ProjectileKind;
  readonly damage: number;
  readonly deflectable: boolean;
  /** The belt cannot touch it (the tennis cat's fireball). */
  readonly indestructible: boolean;
  /** v172: only the thrown belt can break it (the emo cat's hearts). */
  readonly rangedOnly: boolean;
  private shrugReadyAt = 0;
  /** True once the belt has sent it back: it now hurts cats and bosses instead of Varu. */
  friendly = false;
  /** How many times a tennis cat or Federer has smashed this ball back at Varu (a ball is returned only so often). */
  returns = 0;
  /** How many times Varu's belt has swatted this ball back. With `returns` it is the length of the rally (`hits`). */
  swats = 0;
  /** Hits of the thrown belt still needed to break it (`PROJECTILES.heart.throwHits`). */
  throwHitsLeft: number;
  /** A homing heart follows Varu until this game time (0 = not homing). */
  homeUntil = 0;
  /** v171: damage to props, barrels and lamps in its way (Federer's ball machines); 0 = it does not smash. */
  smashDamage = 0;
  /** Where it was last frame (the smash test sweeps the way it flew). */
  lastX: number;
  lastY: number;
  /** Time left (ms) until the fireball's next puff of embers. */
  flameMs = 0;
  expiresAt: number;
  private readonly spinPerSec: number;

  constructor(scene: Phaser.Scene, kind: ProjectileKind, x: number, y: number, angle: number, speed: number) {
    super(scene, x, y, ...texArgs(TEXTURES[kind]));
    const stats: ProjectileStats = PROJECTILES[kind];
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.lastX = x;
    this.lastY = y;
    this.kind = kind;
    this.damage = stats.damage;
    this.deflectable = stats.deflectable;
    this.indestructible = stats.indestructible ?? false;
    this.rangedOnly = stats.rangedOnly ?? false;
    this.throwHitsLeft = stats.throwHits ?? 1;
    this.spinPerSec = stats.spinPerSec;
    this.expiresAt = gameClock.now + stats.lifetimeMs;
    this.setDepth(25);
    fitToSize(this, stats.size);
    setCircleHitbox(this, stats.hitRadius);
    this.launch(angle, speed);
  }

  /** Hits on this ball so far: Varu's swats plus the returns by a cat or Federer. */
  get hits(): number {
    return this.swats + this.returns;
  }

  private announceRally(): void {
    const rally: RallyHitPayload = { x: this.x, y: this.y, hits: this.hits };
    bus.emit(Events.RallyHit, rally);
  }

  /**
   * Set its flight. Must also run AFTER the sprite joins the physics group: adding a body to a group resets its velocity to 0
   * (the group's defaults), which made the balls hang in place and just spin.
   */
  launch(angle: number, speed: number): void {
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /** Send it flying back toward (toX, toY), a bit faster. */
  deflect(toX: number, toY: number, speedFactor = 1.35): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.max(body.speed, 300) * speedFactor;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, toX, toY);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.friendly = true;
    this.setTint(0xa8ffb0);
    this.expiresAt = gameClock.now + 3000;
    this.swats += 1;
    this.announceRally();
  }

  /** A tennis cat smashed it back at Varu: it hurts Varu again, a bit faster (never faster than `maxSpeed`). Varu can swat it again. */
  sendBack(angle: number, speedFactor: number, maxSpeed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = Math.min(Math.max(body.speed, 300) * speedFactor, maxSpeed);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.friendly = false;
    this.returns += 1;
    this.clearTint();
    this.expiresAt = gameClock.now + 3500;
    this.announceRally();
  }

  /** Make it a homing heart: purple, slower to forget, and it turns toward Varu for `followMs` (numbers in `PROJECTILES.heart.homing`). */
  makeHoming(): void {
    const stats: ProjectileStats = PROJECTILES[this.kind];
    const homing = stats.homing;
    if (!homing) return;
    this.homeUntil = gameClock.now + homing.followMs;
    this.expiresAt = gameClock.now + homing.lifetimeMs;
    this.setTint(0xc9a0ff);
  }

  /** Turn the flight a little toward (x, y) (a homing heart, every frame). `deltaMs` is game time. */
  steer(x: number, y: number, deltaMs: number): void {
    const stats: ProjectileStats = PROJECTILES[this.kind];
    const homing = stats.homing;
    if (!homing || gameClock.now >= this.homeUntil || this.friendly) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = body.speed;
    if (speed < 1) return;
    const now = Math.atan2(body.velocity.y, body.velocity.x);
    const next = Phaser.Math.Angle.RotateTo(now, Phaser.Math.Angle.Between(this.x, this.y, x, y), homing.turnRadPerSec * (deltaMs / 1000));
    this.setVelocity(Math.cos(next) * speed, Math.sin(next) * speed);
  }

  /** The thrown belt hit it but did not break it yet: a white flash and a pop. */
  crack(): void {
    this.setTint(0xffffff);
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.3, duration: 70, yoyo: true });
    this.scene.time.delayedCall(90, () => this.restoreTint());
  }

  /** A swing or spin touched a ranged-only heart: a quick white flash, nothing else (at most one per 250 ms). */
  shrug(): void {
    if (gameClock.now < this.shrugReadyAt) return;
    this.shrugReadyAt = gameClock.now + 250;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(70, () => this.restoreTint());
  }

  private restoreTint(): void {
    if (!this.active) return;
    if (this.homeUntil > 0) this.setTint(0xc9a0ff);
    else this.clearTint();
  }

  tick(deltaMs: number): void {
    this.angle += this.spinPerSec * (deltaMs / 1000);
  }
}

/** Owns every projectile in flight: spawns them from events, hurts Varu, cleans up. */
export class ProjectileSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly off: Array<() => void> = [];
  /** Reused copy of the shot list for the per-frame loop (see `snapshotInto`). */
  private readonly scratch: Phaser.GameObjects.GameObject[] = [];
  /** The fireball's embers (FIREBALL_FX), one emitter for all of them. */
  private readonly flames: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly arena: ArenaQuery,
  ) {
    this.group = scene.physics.add.group();
    const F = FIREBALL_FX;
    this.flames = scene.add
      .particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
        emitting: false,
        lifespan: F.lifespanMs,
        speed: F.speed,
        gravityY: F.gravityY,
        scale: F.scale,
        alpha: F.alpha,
        tint: [...F.tint],
      })
      .setDepth(F.depth);

    // Enemy projectiles hurt Varu. A yarn ball is spent even if Varu had i-frames.
    scene.physics.add.overlap(
      player,
      this.group,
      (_p, proj) => {
        const p = proj as Projectile;
        if (player.umbrella) {
          this.umbrellaStop(p); // the umbrella bounces balls back and swallows everything else
          return;
        }
        player.takeDamage(p.damage, p.x, p.y, p.kind);
        p.destroy();
      },
      (_p, proj) => !(proj as Projectile).friendly && !player.rolling, // a roll lets shots fly through (they are not spent)
    );

    // Deflected projectiles hurt whatever they hit. Bosses get stunned by them.
    scene.physics.add.overlap(
      this.group,
      enemies,
      (proj, enemy) => {
        const p = proj as Projectile;
        (enemy as Enemy).onDeflectedHit(p.damage, p.x, p.y, p.returns);
        p.destroy();
      },
      (proj, enemy) => (proj as Projectile).friendly && (enemy as Enemy).hittable,
    );

    this.off.push(
      listen<SpawnProjectilePayload>(Events.SpawnProjectile, ({ kind, x, y, angle, speed, homing, smashDamage }) => {
        const proj = new Projectile(this.scene, kind, x, y, angle, speed);
        this.group.add(proj);
        proj.launch(angle, speed); // the group's add reset the velocity to 0: set it again now
        if (homing) proj.makeHoming();
        if (smashDamage && smashDamage > 0) proj.smashDamage = smashDamage;
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  /** The umbrella meets a shot: a ball that can be deflected flies back like a belt swat, anything else (yarn, hearts, fireballs) is stopped. */
  private umbrellaStop(p: Projectile): void {
    const at: PointPayload = { x: p.x, y: p.y };
    bus.emit(Events.UmbrellaBlock, at);
    if (p.deflectable && !p.indestructible) {
      swatProjectile(p, this.enemies, true);
    } else {
      p.destroy();
    }
  }

  /** Dev (boss duel): every shot in the air vanishes. */
  clearAll(): void {
    for (const child of this.group.getChildren().slice()) (child as Projectile).destroy();
  }

  update(time: number, delta: number): void {
    const margin = 80;
    const shots = snapshotInto(this.group.getChildren(), this.scratch);
    for (let i = 0; i < shots.length; i++) {
      const p = shots[i] as Projectile;
      p.tick(delta);
      if (p.homeUntil > 0) p.steer(this.player.x, this.player.y, delta);
      if (p.kind === 'fireball') this.emitFlames(p, delta);
      const outside = p.x < -margin || p.x > WORLD.width + margin || p.y < -margin || p.y > WORLD.height + margin;
      if (outside || time >= p.expiresAt) {
        p.destroy();
        continue;
      }
      // v171: a smashing ball (Federer's ball machines) breaks what stands in its way. What breaks lets it fly on, what survives stops it.
      if (p.smashDamage > 0 && !p.friendly && this.smashThings(p)) {
        bus.emit(Events.ProjectileBlocked, { x: p.x, y: p.y });
        p.destroy();
        continue;
      }
      p.lastX = p.x;
      p.lastY = p.y;
      if (this.arena.isSolidAt(p.x, p.y)) {
        bus.emit(Events.ProjectileBlocked, { x: p.x, y: p.y }); // walls stop everything, yarn and tennis balls alike
        p.destroy();
      }
    }
    shots.length = 0;
  }

  /** Tells the props, barrels and lamps that a smashing ball flew through them this frame. True when something survived the hit (the ball is spent). */
  private smashThings(p: Projectile): boolean {
    const hit: ProjectileSmashPayload = { prevX: p.lastX, prevY: p.lastY, x: p.x, y: p.y, radius: PROJECTILES[p.kind].hitRadius, damage: p.smashDamage, absorbed: false };
    bus.emit(Events.ProjectileSmash, hit);
    return hit.absorbed;
  }

  /** A few embers behind the fireball, a little late and scattered, so it trails a short flame. */
  private emitFlames(p: Projectile, delta: number): void {
    const F = FIREBALL_FX;
    p.flameMs -= delta;
    if (p.flameMs > 0) return;
    p.flameMs = F.everyMs;
    const body = p.body as Phaser.Physics.Arcade.Body | null;
    const speed = body ? body.speed : 0;
    const backX = speed > 1 && body ? (-body.velocity.x / speed) * F.backPx : 0;
    const backY = speed > 1 && body ? (-body.velocity.y / speed) * F.backPx : 0;
    for (let i = 0; i < F.perTick; i++) {
      this.flames.emitParticleAt(p.x + backX + Phaser.Math.FloatBetween(-F.jitterPx, F.jitterPx), p.y + backY + Phaser.Math.FloatBetween(-F.jitterPx, F.jitterPx), 1);
    }
  }
}
