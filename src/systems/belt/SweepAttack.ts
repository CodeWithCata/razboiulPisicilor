import Phaser from 'phaser';
import { BELT_FX } from '../../config/style';
import { GOLD_BELT, MILK_FX } from '../../config/animation';
import { easeInOutBack } from '../../core/ease';
import { bus } from '../../core/events';
import { isSwept } from '../../core/sweep';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { Projectile } from '../ProjectileSystem';
import type { SweepDef } from './attacks';
import { drawStrap, drawTrail } from './beltVisual';
import { createDrops, createPuddles } from './gooEmitters';
import { swatProjectile } from './swat';

const TAU = Math.PI * 2;

/**
 * Runs one sweeping attack (swing or spin) described by a SweepDef.
 * The belt tip turns around Varu; each cat is hit at most once, the moment the tip passes it.
 * The arcs are PLACEHOLDER visuals; replace with a swoosh sprite later.
 */
export class SweepAttack {
  private def: SweepDef | null = null;
  private startTime = 0;
  private startAngle = 0;
  private arcRad = 0;
  /** Last frame's turn (radians) and time, to get the turn speed that bends the strap and sizes the streak. */
  private lastTurn = 0;
  private lastTime = 0;
  private turnSpeed = 0;
  private lag = 0;
  private readonly hand = new Phaser.Math.Vector2();
  private readonly milk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly puddles: Phaser.GameObjects.Particles.ParticleEmitter;
  /** The same two for the golden belt: expired milk, thicker and stickier. */
  private readonly goldMilk: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly goldPuddles: Phaser.GameObjects.Particles.ParticleEmitter;
  private milkTimer = 0;
  private milkClock = 0;
  private lastTip = 0;
  private lastLength = 0;
  private bursts = 0;
  private lap = 0;
  private readonly alreadyHit = new Set<Enemy>();

  constructor(
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly gfx: Phaser.GameObjects.Graphics,
  ) {
    const scene = gfx.scene;
    this.milk = createDrops(scene, MILK_FX.spin, false, 29);
    this.puddles = createPuddles(scene, false);
    this.goldMilk = createDrops(scene, MILK_FX.spin, true, 29);
    this.goldPuddles = createPuddles(scene, true);
  }

  get running(): boolean {
    return this.def !== null;
  }

  /** How far the body has turned with the belt (radians). Only the spin turns him; 0 otherwise. */
  get bodyTurn(): number {
    return this.def?.spinsBody ? this.lastTurn : 0;
  }

  /** Reach, including power-ups (golden belt). */
  private get range(): number {
    return (this.def?.range ?? 0) * this.player.rangeMultiplier;
  }

  begin(def: SweepDef, time: number, aimAngle: number): void {
    this.def = def;
    this.startTime = time;
    this.arcRad = Phaser.Math.DegToRad(def.arcDeg);
    // The aim is locked for the whole attack: only the start angle is kept.
    this.startAngle = def.centered ? aimAngle - this.arcRad / 2 : aimAngle;
    this.alreadyHit.clear();
    this.lap = 0;
    this.lastTurn = 0;
    this.lastTime = time;
    this.milkClock = time;
    this.milkTimer = 0;
    this.turnSpeed = 0;
    this.lag = 0;
    bus.emit(def.event, { x: this.player.x, y: this.player.y, angle: aimAngle });
  }

  /** Advance the sweep. Returns false once it has finished. */
  update(time: number): boolean {
    const def = this.def;
    if (!def) return false;

    const t = (time - this.startTime) / def.durationMs;
    if (t >= 1) {
      this.cancel();
      return false;
    }
    // The drawn turn winds up, whips through and follows through (easing). Hits only count the real arc 0..arc,
    // so what you see and what hits stay the same.
    const turn = easeInOutBack(t, def.back) * this.arcRad;
    const total = Phaser.Math.Clamp(turn, 0, this.arcRad);
    // Every full turn is a fresh pass: cats can be hit again, and `swept` counts from the start of the current turn.
    const lap = Math.floor(total / TAU);
    if (lap > this.lap) {
      this.lap = lap;
      this.alreadyHit.clear();
    }
    const swept = total - lap * TAU;
    this.hitEnemies(def, swept);
    this.swatProjectiles(swept);
    this.track(turn, time);
    this.draw(def, turn, t);
    if (def.milk) this.flingMilk(time);
    return true;
  }

  cancel(): void {
    this.def = null;
    this.gfx.clear();
  }

  private hitEnemies(def: SweepDef, swept: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const damage = def.damage * this.player.damageMultiplier;

    // A copy: a cat that dies is removed from the group in the middle of the loop, which would skip the next one.
    for (const child of this.enemies.getChildren().slice()) {
      const enemy = child as Enemy;
      if (!enemy.active || !enemy.hittable || this.alreadyHit.has(enemy)) continue;

      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) - enemy.hitRadius;
      if (dist > this.range) continue;
      if (!isSwept(Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y), this.startAngle, swept)) continue;

      this.alreadyHit.add(enemy);
      enemy.takeDamage(damage, px, py, def.knockback); // armor is applied inside takeDamage
    }
    // EnemyHit / EnemyKilled events fire from the enemy, so effects and score react on their own.
  }

  private swatProjectiles(swept: number): void {
    const px = this.player.x;
    const py = this.player.y;
    for (const child of this.projectiles.getChildren().slice()) {
      const proj = child as Projectile;
      if (!proj.active || proj.friendly) continue;
      if (Phaser.Math.Distance.Between(px, py, proj.x, proj.y) > this.range) continue;
      if (!isSwept(Phaser.Math.Angle.Between(px, py, proj.x, proj.y), this.startAngle, swept)) continue;
      swatProjectile(proj, this.enemies);
    }
  }

  /** Turn speed (rad/s) from the last two frames, and the strap bend that follows from it (smoothed, so it never pops). */
  private track(turn: number, time: number): void {
    const dt = (time - this.lastTime) / 1000;
    if (dt > 0) {
      this.turnSpeed = (turn - this.lastTurn) / dt;
      this.lastTurn = turn;
      this.lastTime = time;
    }
    const maxLag = Phaser.Math.DegToRad(BELT_FX.maxLagDeg);
    const target = Phaser.Math.Clamp(this.turnSpeed * BELT_FX.lagSec, -maxLag, maxLag);
    this.lag += (target - this.lag) * 0.5;
  }

  /** Lots of milk: drops from random spots along the strap, and puddles where it passes. Uses the pose from `draw`. */
  private flingMilk(time: number): void {
    if (!MILK_FX.enabled) return;
    const gold = GOLD_BELT.enabled && this.player.goldenBelt;
    const milk = gold ? this.goldMilk : this.milk;
    const puddles = gold ? this.goldPuddles : this.puddles;
    const count = MILK_FX.spin.count * (gold ? GOLD_BELT.drops.countMult : 1);
    const dt = time - this.milkClock;
    this.milkClock = time;
    this.milkTimer += Math.min(dt, 50);
    while (this.milkTimer >= MILK_FX.spin.everyMs) {
      this.milkTimer -= MILK_FX.spin.everyMs;
      this.bursts += 1;
      for (let i = 0; i < count; i++) {
        const u = Phaser.Math.FloatBetween(0.35, 1);
        milk.emitParticleAt(this.hand.x + Math.cos(this.lastTip) * this.lastLength * u, this.hand.y + Math.sin(this.lastTip) * this.lastLength * u, 1);
      }
      if (this.bursts % MILK_FX.spin.puddleEvery === 0) {
        puddles.emitParticleAt(this.hand.x + Math.cos(this.lastTip) * this.lastLength, this.hand.y + Math.sin(this.lastTip) * this.lastLength, 1);
      }
    }
  }

  private draw(def: SweepDef, turn: number, t: number): void {
    const { x, y } = this.player;
    const ringRadius = this.range * BELT_FX.radiusFactor;
    const length = this.range * BELT_FX.beltLengthFactor;
    const hand = this.player.handPosition(this.hand);
    const tip = this.startAngle + turn;
    this.lastTip = tip;
    this.lastLength = length;
    const alpha = 1 - t * BELT_FX.fadeAmount;
    const buffed = this.player.damageMultiplier > 1;
    const golden = GOLD_BELT.enabled && this.player.goldenBelt;

    this.gfx.clear();
    if (def.ring) {
      this.gfx.lineStyle(BELT_FX.innerWidth, buffed ? BELT_FX.buffedInner : BELT_FX.normalInner, BELT_FX.spinRingAlpha * alpha);
      this.gfx.strokeCircle(x, y, ringRadius);
    }
    // The streak is as long as the belt is fast: nothing at the wind-up, full at the whip, short again at the end.
    const speed = Phaser.Math.Clamp(Math.abs(this.turnSpeed) / BELT_FX.fullTrailSpeed, 0, 1);
    const trail = Phaser.Math.DegToRad(def.trailDeg) * speed;
    if (trail > 0.02) drawTrail(this.gfx, hand.x, hand.y, length, tip - Math.sign(this.turnSpeed) * trail, tip, alpha, buffed, golden);
    drawStrap(this.gfx, { x: hand.x, y: hand.y, tip, lag: this.lag, radius: length, golden });
  }
}
