/** @file The thrown belt as a boomerang: out, pierce, turn at range or wall, back. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { GOLD_BELT, MILK_FX } from '../../config/animation';
import { WORLD } from '../../config/arena';
import { BELT_THROW, PROJECTILES } from '../../config/balance';
import type { ArenaQuery } from '../../core/arena';
import { bus, Events, type BeltFlightPayload } from '../../core/events';
import { snapshotInto } from '../../core/snapshot';
import { distToSegment } from '../../core/sweep';
import { fitToSize } from '../../core/sprite';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { Projectile } from '../ProjectileSystem';
import { createDrops, createPuddles, gooLifeMs } from './gooEmitters';
import { swatProjectile } from './swat';

type Leg = 'out' | 'back';

/**
 * The belt as a boomerang: flies out, pierces everything, turns at max range (or at an arena edge or wall),
 * flies back to Varu's current position. Each cat can be hit once per leg, so up to twice per throw.
 * Placeholder look: a spinning brown strap with a gold buckle (Tex.BeltThrown).
 */
export class ThrownBelt {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly milk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private milkTimer = 0;
  private drips = 0;
  private readonly dir: Phaser.Math.Vector2;
  /** Reused copies of the cat and shot lists for the per-frame loops (see `snapshotInto`). */
  private readonly catScratch: Phaser.GameObjects.GameObject[] = [];
  private readonly shotScratch: Phaser.GameObjects.GameObject[] = [];
  private readonly maxRange: number;
  private readonly alreadyHit = new Set<Enemy>();
  /** Tough projectiles (the emo cat's hearts: `throwHits` 2) this leg has already hit: one hit per leg, so out and back = 2 hits. */
  private readonly alreadyCracked = new Set<Projectile>();
  private leg: Leg = 'out';
  private travelled = 0;
  private legMs = 0;
  private finished = false;
  private readonly scene: Phaser.Scene;
  /** The golden belt was active when it was thrown: gold strap, gooier drops. */
  private readonly gold: boolean;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly arena: ArenaQuery,
    aimAngle: number,
  ) {
    this.dir = new Phaser.Math.Vector2(Math.cos(aimAngle), Math.sin(aimAngle));
    this.maxRange = BELT_THROW.maxRange * player.rangeMultiplier; // golden belt throws farther
    this.gold = GOLD_BELT.enabled && player.goldenBelt;
    this.sprite = scene.add.sprite(player.x, player.y, ...texArgs(this.gold ? Tex.BeltThrownGold : Tex.BeltThrown)).setDepth(31);
    fitToSize(this.sprite, BELT_THROW.size);
    this.scene = scene;
    this.milk = createDrops(scene, MILK_FX.trail, this.gold, 30);
    this.puddles = createPuddles(scene, this.gold);
  }

  /** Move the belt and hit whatever it passes through. Returns true once Varu has caught it. */
  update(deltaMs: number): boolean {
    if (this.finished) return true;
    const stepMs = Math.min(deltaMs, BELT_THROW.maxFrameMs);
    const dt = stepMs / 1000;
    this.legMs += stepMs;
    this.sprite.angle += BELT_THROW.spinDegPerSec * dt;

    const prevX = this.sprite.x;
    const prevY = this.sprite.y;
    if (this.leg === 'out') this.flyOut(dt);
    else if (this.flyBack(dt)) return true;

    this.dripMilk(stepMs);
    this.hitEnemies(prevX, prevY);
    this.swatProjectiles(prevX, prevY);
    const flight: BeltFlightPayload = { x: this.sprite.x, y: this.sprite.y, prevX, prevY, radius: BELT_THROW.hitRadius };
    bus.emit(Events.BeltFlight, flight); // the arena reacts to the belt flying through it
    return false;
  }

  /** Remove the belt without a catch (Varu died, scene ending). */
  destroy(): void {
    this.finished = true;
    this.sprite.destroy();
    this.retireMilk();
  }

  /** Small white drops behind the flying belt, like it is dripping milk. */
  private dripMilk(stepMs: number): void {
    if (!MILK_FX.enabled) return;
    this.milkTimer += stepMs;
    if (this.milkTimer < MILK_FX.trail.everyMs) return;
    this.milkTimer -= MILK_FX.trail.everyMs;
    const j = MILK_FX.trail.jitter;
    const count = MILK_FX.trail.count * (this.gold ? GOLD_BELT.drops.countMult : 1);
    for (let i = 0; i < count; i++) {
      this.milk.emitParticleAt(this.sprite.x + Phaser.Math.FloatBetween(-j, j), this.sprite.y + Phaser.Math.FloatBetween(-j, j), 1);
    }
    this.drips += 1;
    if (this.drips % MILK_FX.trail.puddleEvery === 0) this.puddles.emitParticleAt(this.sprite.x, this.sprite.y, 1);
  }

  /** Stop emitting and remove the emitter once the last drops have faded. */
  private retireMilk(): void {
    this.milk.stop();
    this.puddles.stop();
    this.scene.time.delayedCall(gooLifeMs(this.gold), () => {
      this.milk.destroy();
      this.puddles.destroy();
    });
  }

  private flyOut(dt: number): void {
    const step = BELT_THROW.outSpeed * dt;
    this.sprite.x += this.dir.x * step;
    this.sprite.y += this.dir.y * step;
    this.travelled += step;

    const outside = this.sprite.x < 0 || this.sprite.x > WORLD.width || this.sprite.y < 0 || this.sprite.y > WORLD.height;
    const hitWall = this.arena.isSolidAt(this.sprite.x, this.sprite.y); // a wall turns the belt around too
    if (this.travelled >= this.maxRange || this.legMs >= BELT_THROW.maxOutMs || outside || hitWall) this.turnAround();
  }

  /** Returns true when caught. */
  private flyBack(dt: number): boolean {
    const step = BELT_THROW.backSpeed * dt;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y);
    if (dist <= BELT_THROW.catchRadius + step || this.legMs >= BELT_THROW.maxBackMs) {
      this.finished = true;
      this.sprite.destroy();
      this.retireMilk();
      return true;
    }
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.player.x, this.player.y);
    this.sprite.x += Math.cos(angle) * step;
    this.sprite.y += Math.sin(angle) * step;
    return false;
  }

  private turnAround(): void {
    this.leg = 'back';
    this.legMs = 0;
    this.alreadyHit.clear(); // every cat can be hit again on the way back
    this.alreadyCracked.clear();
  }

  private hitEnemies(prevX: number, prevY: number): void {
    const damage = BELT_THROW.damage * this.player.damageMultiplier;
    // A copy: a cat that dies is removed from the group in the middle of the loop, which would skip the next one.
    const cats = snapshotInto(this.enemies.getChildren(), this.catScratch);
    for (let i = 0; i < cats.length; i++) {
      const enemy = cats[i] as Enemy;
      if (!enemy.active || !enemy.hittable || this.alreadyHit.has(enemy)) continue;
      const reach = BELT_THROW.hitRadius + enemy.hitRadius;
      if (distToSegment(enemy.x, enemy.y, prevX, prevY, this.sprite.x, this.sprite.y) > reach) continue;

      this.alreadyHit.add(enemy);
      enemy.takeDamage(damage, this.sprite.x, this.sprite.y, BELT_THROW.knockback * this.player.knockbackMultiplier);
    }
    this.catScratch.length = 0;
  }

  private swatProjectiles(prevX: number, prevY: number): void {
    const shots = snapshotInto(this.projectiles.getChildren(), this.shotScratch);
    for (let i = 0; i < shots.length; i++) {
      const proj = shots[i] as Projectile;
      if (!proj.active || proj.friendly) continue;
      const reach = BELT_THROW.hitRadius + PROJECTILES[proj.kind].hitRadius;
      if (distToSegment(proj.x, proj.y, prevX, prevY, this.sprite.x, this.sprite.y) > reach) continue;
      if (proj.throwHitsLeft > 1) {
        if (this.alreadyCracked.has(proj)) continue; // the belt is still passing through it: one hit per leg
        this.alreadyCracked.add(proj);
        proj.throwHitsLeft -= 1;
        proj.crack();
        continue;
      }
      swatProjectile(proj, this.enemies, true);
    }
    this.shotScratch.length = 0;
  }
}
