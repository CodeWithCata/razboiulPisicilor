/** @file Projectile sprite (yarn, tennis, broken heart) and the group that updates and expires them. */
import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { WORLD } from '../config/arena';
import { PROJECTILES, type ProjectileKind } from '../config/balance';
import { fitToSize, setCircleHitbox } from '../core/sprite';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, listen, type SpawnProjectilePayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { gameClock } from '../core/clock';

/** Placeholder texture per kind. */
const TEXTURES: Record<ProjectileKind, TexKey> = { yarn: Tex.Yarn, tennis: Tex.Tennis, heart: Tex.Heart };

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly kind: ProjectileKind;
  readonly damage: number;
  readonly deflectable: boolean;
  /** True once the belt has sent it back: it now hurts cats and bosses instead of Varu. */
  friendly = false;
  expiresAt: number;
  private readonly spinPerSec: number;

  constructor(scene: Phaser.Scene, kind: ProjectileKind, x: number, y: number, angle: number, speed: number) {
    super(scene, x, y, TEXTURES[kind]);
    const stats = PROJECTILES[kind];
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = kind;
    this.damage = stats.damage;
    this.deflectable = stats.deflectable;
    this.spinPerSec = stats.spinPerSec;
    this.expiresAt = gameClock.now + stats.lifetimeMs;
    this.setDepth(25);
    fitToSize(this, stats.size);
    setCircleHitbox(this, stats.hitRadius);
    this.launch(angle, speed);
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
  }

  tick(deltaMs: number): void {
    this.angle += this.spinPerSec * (deltaMs / 1000);
  }
}

/** Owns every projectile in flight: spawns them from events, hurts Varu, cleans up. */
export class ProjectileSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly off: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    private readonly arena: ArenaQuery,
  ) {
    this.group = scene.physics.add.group();

    // Enemy projectiles hurt Varu. A yarn ball is spent even if Varu had i-frames.
    scene.physics.add.overlap(
      player,
      this.group,
      (_p, proj) => {
        const p = proj as Projectile;
        player.takeDamage(p.damage, p.x, p.y);
        p.destroy();
      },
      (_p, proj) => !(proj as Projectile).friendly,
    );

    // Deflected projectiles hurt whatever they hit. Bosses get stunned by them.
    scene.physics.add.overlap(
      this.group,
      enemies,
      (proj, enemy) => {
        const p = proj as Projectile;
        (enemy as Enemy).onDeflectedHit(p.damage, p.x, p.y);
        p.destroy();
      },
      (proj, enemy) => (proj as Projectile).friendly && (enemy as Enemy).hittable,
    );

    this.off.push(
      listen<SpawnProjectilePayload>(Events.SpawnProjectile, ({ kind, x, y, angle, speed }) => {
        const proj = new Projectile(this.scene, kind, x, y, angle, speed);
        this.group.add(proj);
        proj.launch(angle, speed); // the group's add reset the velocity to 0: set it again now

      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  update(time: number, delta: number): void {
    const margin = 80;
    for (const child of this.group.getChildren().slice()) {
      const p = child as Projectile;
      p.tick(delta);
      const outside = p.x < -margin || p.x > WORLD.width + margin || p.y < -margin || p.y > WORLD.height + margin;
      if (outside || time >= p.expiresAt) {
        p.destroy();
      } else if (this.arena.isSolidAt(p.x, p.y)) {
        bus.emit(Events.ProjectileBlocked, { x: p.x, y: p.y }); // walls stop everything, yarn and tennis balls alike
        p.destroy();
      }
    }
  }
}
