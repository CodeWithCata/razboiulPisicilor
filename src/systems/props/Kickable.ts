/** @file Cans and the ball: small kick physics (hop, bounce, wall hits). */
import Phaser from 'phaser';
import { tileKey } from '../../assets/propTextures';
import { Tex } from '../../assets/keys';
import { ARENA } from '../../config/arena';
import { KICKABLE, type KickDef, type KickKind } from '../../config/props';
import type { ArenaQuery } from '../../core/arena';
import { hyp } from '../../core/hyp';

/** What a kickable tells the system around it. */
export interface KickHost {
  /** It came down from a hop. `power` 0..1 is how hard. */
  landed(kick: Kickable, power: number): void;
  /** It ran into something solid, going `speed` px/s toward the unit direction (dirX, dirY). */
  hitWall(kick: Kickable, dirX: number, dirY: number, speed: number): void;
}

/**
 * A can pile or the ball lying on the floor, with a little physics once it is kicked:
 * it slides (cans) or rolls (ball), hops, bounces, spins, bounces off walls, and falls asleep when it stops.
 * Sleeping ones cost nothing per frame. It never blocks anything: Varu and the cats walk over it (and kick it).
 */
export class Kickable {
  x: number;
  y: number;
  readonly radius: number;
  /** The belt sweep that kicked it last. */
  sweepKey = -1;
  /** Soft touches (walking over it) wait for this (game ms). */
  readyAt = 0;

  private vx = 0;
  private vy = 0;
  private z = 0;
  private vz = 0;
  private rot = 0;
  private spin = 0;
  private asleep = true;
  /** Where it lay at the start (it comes back there after a cat smashed it). */
  readonly homeX: number;
  readonly homeY: number;
  private readonly cfg: KickDef;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly kind: KickKind,
    readonly tile: number,
    x: number,
    y: number,
    private readonly walls: ArenaQuery,
    private readonly host: KickHost,
  ) {
    this.cfg = KICKABLE[kind];
    this.radius = this.cfg.radius;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.shadow = scene.add
      .image(x, y + this.cfg.shadow.drop, Tex.Shadow)
      .setDepth(ARENA.depth.decor + KICKABLE.shadowDepthLift)
      .setAlpha(0);
    this.sprite = scene.add.image(x, y, tileKey(tile)).setDepth(ARENA.depth.decor + KICKABLE.depthLift);
  }

  get speed(): number {
    return hyp(this.vx, this.vy);
  }

  /** How far above the floor it is right now (px). */
  get height(): number {
    return this.z;
  }

  /** It hit something soft (a cat): it flies back along (dirX, dirY) with `keep` of its speed. */
  rebound(dirX: number, dirY: number, keep: number): void {
    const speed = this.speed * keep;
    this.vx = dirX * speed;
    this.vy = dirY * speed;
    if (this.z === 0) this.vz = Math.max(this.vz, this.cfg.pop * 0.5);
  }

  /** Grows in from nothing (it came back after a cat smashed it). */
  appear(ms: number): void {
    this.sprite.setAlpha(0);
    this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: ms });
  }

  /** Gone for good (PropSystem makes a new one at home later). */
  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    this.shadow.destroy();
  }

  /** Speed up to `speed` px/s along the unit direction (dirX, dirY); `pop` is the little hop it gets. Already faster: unchanged. */
  kick(dirX: number, dirY: number, speed: number, pop: number): void {
    const along = this.vx * dirX + this.vy * dirY;
    if (along < speed) {
      this.vx += dirX * (speed - along);
      this.vy += dirY * (speed - along);
    }
    if (pop > 0 && this.z === 0) this.vz = Math.max(this.vz, pop);
    if (this.cfg.spin > 0) this.spin = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.FloatBetween(this.cfg.spin * 0.4, this.cfg.spin);
    this.asleep = false;
  }

  update(dt: number): void {
    if (this.asleep) return;
    const cfg = this.cfg;

    if (this.z > 0 || this.vz !== 0) this.fly(dt);

    const damp = Math.exp(-(this.z > 0 ? KICKABLE.airDrag : cfg.friction) * dt);
    this.vx *= damp;
    this.vy *= damp;
    this.spin *= Math.exp(-cfg.spinDamp * dt);
    this.move(dt);

    if (this.kind === 'ball') this.rot += (this.speed / this.radius) * dt * (this.vx >= 0 ? 1 : -1); // it rolls
    else this.rot += this.spin * dt;

    if (this.z === 0 && this.vz === 0 && this.speed < KICKABLE.sleepSpeed && Math.abs(this.spin) < 0.5) {
      this.vx = 0;
      this.vy = 0;
      this.spin = 0;
      this.asleep = true;
    }
    this.draw();
  }

  /** Up, down, and a smaller hop each time it lands. */
  private fly(dt: number): void {
    this.vz -= KICKABLE.gravity * dt;
    this.z += this.vz * dt;
    if (this.z > 0) return;
    const impact = -this.vz;
    this.z = 0;
    if (impact > this.cfg.minBounce) {
      this.vz = impact * this.cfg.restitution;
      this.host.landed(this, Math.min(1, impact / KICKABLE.loudImpact));
    } else {
      this.vz = 0;
    }
  }

  /** Slide in small steps, so a fast ball cannot skip through a wall. */
  private move(dt: number): void {
    const speed = this.speed;
    if (speed === 0) return;
    const steps = Math.max(1, Math.ceil((speed * dt) / (this.radius * 0.6)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + this.vx * h;
      if (this.walls.isCircleFree(nx, this.y, this.radius)) {
        this.x = nx;
      } else {
        this.host.hitWall(this, Math.sign(this.vx), 0, Math.abs(this.vx));
        this.vx = -this.vx * this.cfg.wall;
      }
      const ny = this.y + this.vy * h;
      if (this.walls.isCircleFree(this.x, ny, this.radius)) {
        this.y = ny;
      } else {
        this.host.hitWall(this, 0, Math.sign(this.vy), Math.abs(this.vy));
        this.vy = -this.vy * this.cfg.wall;
      }
    }
  }

  private draw(): void {
    this.sprite.setPosition(this.x, this.y - this.z).setRotation(this.rot);
    const lift = Math.min(1, this.z / 10); // the ground shadow only shows once it is off the floor (on the floor the tile's own shadow is enough)
    const shrink = 1 - 0.3 * Math.min(1, this.z / 40);
    const { w, h, drop } = this.cfg.shadow;
    this.shadow.setPosition(this.x, this.y + drop).setScale((w / 64) * shrink, (h / 32) * shrink).setAlpha(lift * 0.9);
  }
}
