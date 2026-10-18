import Phaser from 'phaser';
import type { TexKey } from '../assets/keys';
import { ANIM } from '../config/animation';
import { ARENA_RULES } from '../config/arena';
import { ENEMIES, LASER, type EnemyStats, type EnemyType } from '../config/balance';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, type EnemyKilledPayload } from '../core/events';
import { gameClock } from '../core/clock';
import type { FlowField } from '../core/flowField';
import { hasClearLine, steerAround } from '../core/steering';
import { NO_OBSTACLES } from '../world/SolidGrid';
import { Actor } from './Actor';
import type { Player } from './Player';

/** What a cat needs to know each frame. `lure` is set while the laser pointer is active. */
export interface EnemyContext {
  player: Player;
  lure: Phaser.Types.Math.Vector2Like | null;
}

/**
 * Base class for every cat and boss. A new cat = a small subclass that sets its
 * texture + type and overrides `think()`. Stats live in config/balance.ts.
 */
export abstract class Enemy extends Actor {
  readonly enemyType: EnemyType;
  readonly stats: EnemyStats;
  /** The walls. GameScene hands the real arena over right after the cat is created. */
  protected obstacles: ArenaQuery = NO_OBSTACLES;
  /** Walking distances to Varu (or the laser dot), set by GameScene. Null = no pathfinding, only wall avoidance. */
  private flow: FlowField | null = null;
  private sightCheckedAt = -Infinity;
  private seesTarget = true;
  /** Walk-cycle animation state (see config/animation.ts). */
  private baseScale = 1;
  private gaitPhase = Math.random() * Math.PI * 2;
  private swayApplied = 0;
  /** Which way this cat turns first when a wall is in its way. */
  private readonly avoidSide: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

  protected constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType, texture: TexKey) {
    const stats: EnemyStats = ENEMIES[type];
    super(scene, x, y, texture, { maxHp: stats.hp, size: stats.size, hitRadius: stats.hitRadius });
    this.enemyType = type;
    this.stats = stats;
    this.baseScale = this.scaleX; // Actor already fitted the sprite to its size
  }

  setObstacles(arena: ArenaQuery): void {
    this.obstacles = arena;
  }

  setFlow(flow: FlowField): void {
    this.flow = flow;
  }

  /** Flying cats don't bump into other cats (or walls). */
  get flies(): boolean {
    return false;
  }

  /** False while a cat can't be hit (e.g. a ninja mid-teleport). */
  get hittable(): boolean {
    return true;
  }

  get isBoss(): boolean {
    return false;
  }

  /** Damage dealt to Varu when this cat touches him. */
  get contactDamage(): number {
    return this.stats.contactDamage;
  }

  /** Multiplier on damage from the belt and crows. Bosses use it for armor. */
  protected get damageFactor(): number {
    return 1;
  }

  /** Cats turn toward where they walk. Override to false to steer rotation yourself. */
  protected get facesVelocity(): boolean {
    return true;
  }

  /** Movement / attack logic. Runs every frame unless the cat is being knocked back. */
  protected abstract think(time: number, delta: number, ctx: EnemyContext): void;

  tick(time: number, delta: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    this.rotation -= this.swayApplied; // undo last frame's sway so think() steers from the true heading
    this.swayApplied = 0;
    if (!this.isKnockedBack) this.think(time, delta, ctx);
    // think() may destroy the cat (kamikaze explosion): body and shadow are gone then.
    if (!this.active || !this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.facesVelocity && body.enable && body.speed > 10) {
      const facing = Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, facing, 0.25);
    }
    this.animate(delta, body.speed);
    this.syncShadow();
  }

  /** Sway and squash. Scale changes the hitbox by a few percent at most, which is fine. */
  private animate(delta: number, speed: number): void {
    if (!ANIM.enabled) return;
    let squash: number;
    let swayRad = 0;
    if (speed < ANIM.idleSpeed) {
      this.gaitPhase += delta * ANIM.idle.rate;
      squash = Math.sin(this.gaitPhase) * ANIM.idle.squash;
    } else if (this.flies) {
      this.gaitPhase += delta * ANIM.flyer.rate;
      squash = Math.sin(this.gaitPhase) * ANIM.flyer.squash;
      swayRad = Math.sin(this.gaitPhase * 0.5) * Phaser.Math.DegToRad(ANIM.flyer.swayDeg);
    } else {
      const look = this.isBoss ? ANIM.boss : ANIM.walk;
      this.gaitPhase += (speed * delta) / 1000 * ANIM.stridePerPx * (this.isBoss ? 0.6 : 1);
      squash = Math.sin(this.gaitPhase * 2) * look.squash;
      swayRad = Math.sin(this.gaitPhase) * Phaser.Math.DegToRad(look.swayDeg);
    }
    this.setScale(this.baseScale * (1 + squash), this.baseScale * (1 - squash));
    this.swayApplied = swayRad;
    this.rotation += swayRad;
  }

  /** Walk toward a point (turning away from walls in the way). Stops within `stopRadius` of it. */
  protected steerTo(point: Phaser.Types.Math.Vector2Like, speed: number, stopRadius = 0): void {
    const dx = (point.x ?? 0) - this.x;
    const dy = (point.y ?? 0) - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= stopRadius || dist === 0) {
      this.setVelocity(0, 0);
      return;
    }
    let heading = Math.atan2(dy, dx);
    const probe = this.hitRadius + ARENA_RULES.probeMargin;
    if (!this.flies && dist > probe) {
      const around = this.pathAround(point, dist);
      if (around) heading = Math.atan2(around.y - this.y, around.x - this.x);
      else heading = steerAround(this.x, this.y, heading, probe, this.obstacles, this.avoidSide, ARENA_RULES.avoidAnglesDeg);
    }
    this.setVelocity(Math.cos(heading) * speed, Math.sin(heading) * speed);
  }

  /**
   * Smarter than turning away from walls: if a wall blocks the straight line to the target, return the
   * next tile center on the shortest walking route. Returns null when the cat can just walk straight
   * (or there is no route, or this is not the flow field's target), so the cheap wall avoidance takes over.
   */
  private pathAround(point: Phaser.Types.Math.Vector2Like, dist: number): { x: number; y: number } | null {
    const flow = this.flow;
    const tx = point.x ?? 0;
    const ty = point.y ?? 0;
    if (!flow || dist < ARENA_RULES.directRange || !flow.isTarget(tx, ty)) return null;

    const now = gameClock.now;
    if (now - this.sightCheckedAt >= ARENA_RULES.sightCheckMs) {
      this.sightCheckedAt = now - Math.random() * 40; // spread the checks of many cats over different frames
      const radius = Math.min(this.hitRadius, ARENA_RULES.sightRadiusMax);
      this.seesTarget = hasClearLine(this.x, this.y, tx, ty, radius, this.obstacles);
    }
    return this.seesTarget ? null : flow.nextPoint(this.x, this.y);
  }

  /** Chase Varu, or the laser dot if there is one (cats bunch up around the dot). */
  protected chase(ctx: EnemyContext, speed: number): void {
    if (ctx.lure) this.steerTo(ctx.lure, speed, LASER.stopRadius);
    else this.steerTo(ctx.player, speed);
  }

  /** Belt / crow hit. Returns true if it killed the cat. */
  takeDamage(amount: number, fromX: number, fromY: number, knockback: number): boolean {
    if (!this.alive || !this.hittable) return false;
    return this.applyHit(amount * this.damageFactor, fromX, fromY, knockback);
  }

  /** A deflected tennis ball hit this cat. Bosses override this (stun!). */
  onDeflectedHit(damage: number, fromX: number, fromY: number): void {
    if (this.alive && this.hittable) this.applyHit(damage, fromX, fromY, 300);
  }

  /** Subtract HP, flash, knock back, die. `effective` is the final damage (armor already applied). */
  protected applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
    this.hp -= effective;
    this.flash();
    bus.emit(Events.EnemyHit, { x: this.x, y: this.y });

    if (this.hp <= 0) {
      const payload: EnemyKilledPayload = { x: this.x, y: this.y, type: this.enemyType, score: this.stats.score };
      bus.emit(Events.EnemyKilled, payload);
      this.destroy();
      return true;
    }
    this.applyKnockback(fromX, fromY, knockback * (1 - this.stats.knockbackResist));
    return false;
  }
}
