/** @file Pisica de Tenis (the tennis cat): a walking ranged cat that keeps her distance, winds up (toss, swing, pop) and serves tennis balls the belt can swat back. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { WORLD } from '../../config/arena';
import { PROJECTILES, TENNIS } from '../../config/balance';
import { TENNIS_POSE_MS as MS } from '../../config/tennisRig';
import { gameClock } from '../../core/clock';
import { bus, Events, type SpawnProjectilePayload } from '../../core/events';
import { hasClearLine } from '../../core/steering';
import { Enemy, type EnemyContext } from '../Enemy';
import type { Player } from '../Player';
import type { Projectile } from '../../systems/ProjectileSystem';
import { TennisCatRig } from './TennisCatRig';

type TennisPhase = 'move' | 'windup';
/** What she decided to do about a ball Varu swatted back at her. */
type BallPlan = 'return' | 'dodge' | 'stand';

/**
 * Numbers: `TENNIS` in config/balance.ts. She walks to a comfortable distance from Varu, stops, winds up (flash) and serves one ball,
 * then moves again. She never serves through a wall, always faces Varu, and follows the laser dot like the other ground cats.
 * Her racket arm, racket and ball are loose layers animated by `TennisCatRig`: the ball is tossed up during the windup, the racket
 * swings and pops at the serve.
 *
 * She is a bit clever (numbers in `TENNIS`): she circles Varu sideways while she waits, aims ahead of a walking Varu, and when Varu swats
 * her ball back she may smash it right back at him (a rally), jump out of the way, or take it. A ball she could not answer makes her angry:
 * her next serve is the red fireball (it cannot be swatted back). She also throws a fireball now and then by chance.
 */
export class TennisCat extends Enemy {
  private phase: TennisPhase = 'move';
  private nextShotAt: number;
  private fireAt = 0;
  private lineCheckedAt = -Infinity;
  private clearLine = false;
  /** True once the racket swing of this windup has started (it starts `MS.smash` before the ball leaves). */
  private swung = false;
  private readonly rig: TennisCatRig;
  /** The serve she is winding up is a fireball. */
  private fireNext = false;
  /** She could not answer a ball Varu sent back: her next serve is a fireball. */
  private angry = false;
  private fireReadyAt = 0;
  /** A ball boy of Federer's: serves only the green ball (no fireball, no anger), returns and dodges swatted balls like every tennis cat. */
  private ballBoy = false;
  /** The wave number (from the context, every frame): her chances grow with it. */
  private wave = 1;
  /** Which way she circles Varu (1 / -1) and when she turns the other way. */
  private strafeDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private strafeFlipAt = 0;
  /** The swatted ball she has decided about, and what she decided. */
  private planBall: Projectile | null = null;
  private plan: BallPlan = 'stand';
  private returnSwung = false;
  private returnReadyAt = 0;
  private dodgeUntil = 0;
  private dodgeX = 0;
  private dodgeY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tennis', Tex.CatTennis);
    this.rig = new TennisCatRig(scene, this);
    this.nextShotAt = gameClock.now + Phaser.Math.Between(TENNIS.firstShotMs.min, TENNIS.firstShotMs.max);
  }

  /** Federer calls her as a ball boy (`FEDERER.ballBoys`): from now on she never throws the red fireball. */
  setBallBoy(): void {
    this.ballBoy = true;
  }

  protected override get facesVelocity(): boolean {
    return false; // she always faces her target instead of where she walks
  }

  /** Crouch on the toss, stretch on the swing: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    const { player, lure } = ctx;
    const speed = this.stats.speed;
    this.wave = ctx.wave ?? this.wave;

    // Distracted by the laser: walk to the dot like the other cats, no serving.
    if (lure) {
      this.callOff();
      this.chase(ctx, speed);
      this.faceTowards(lure.x ?? this.x, lure.y ?? this.y);
      return;
    }

    this.faceTowards(player.x, player.y);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.updateSight(time, player);
    if (this.watchBalls(time, ctx)) return; // busy with a ball Varu sent back: returning it or jumping aside
    const canServe = this.clearLine && dist >= TENNIS.minShotRange && dist <= TENNIS.maxShotRange;

    if (this.phase === 'windup') {
      this.setVelocity(0, 0);
      if (!canServe) {
        this.callOff(); // Varu moved out of line or range: call it off and try again soon
        this.nextShotAt = time + TENNIS.windUpMs;
      } else {
        if (!this.swung && time >= this.fireAt - MS.smash) {
          this.swung = true;
          this.rig.swing();
        }
        if (time >= this.fireAt) {
          this.serve(player);
          if (this.fireNext) this.fireReadyAt = time + TENNIS.fire.minGapMs;
          this.fireNext = false;
          this.angry = false;
          this.rig.hit();
          this.phase = 'move';
          this.nextShotAt = time + Phaser.Math.Between(TENNIS.shotMinMs, TENNIS.shotMaxMs);
        }
      }
      return;
    }

    if (canServe && time >= this.nextShotAt) {
      this.phase = 'windup';
      this.fireNext = !this.ballBoy && (this.angry || (time >= this.fireReadyAt && Math.random() < this.scaled(TENNIS.fire.chance)));
      const windUpMs = this.fireNext ? TENNIS.fire.windUpMs : TENNIS.windUpMs;
      this.fireAt = time + windUpMs;
      this.setVelocity(0, 0);
      this.swung = false;
      this.rig.toss(windUpMs - MS.smash);
      this.flash(this.fireNext ? TENNIS.fire.windUpColor : TENNIS.windUpColor, windUpMs); // red = the fireball is coming
      return;
    }

    // Too far (or no clear line): walk closer. Too close: back off. Otherwise hold the spot.
    if (dist > TENNIS.preferredDistance + TENNIS.band || !this.clearLine) {
      this.chase(ctx, speed);
    } else if (dist < TENNIS.preferredDistance - TENNIS.band) {
      this.backOff(player, speed * TENNIS.retreatSpeedFactor);
    } else {
      this.strafe(time, player, speed);
    }
  }

  /** Holding her spot: walk sideways around Varu (a moving target), turning the other way now and then. */
  private strafe(time: number, player: Player, speed: number): void {
    const S = TENNIS.strafe;
    if (time >= this.strafeFlipAt) {
      this.strafeDir = this.strafeDir === 1 ? -1 : 1;
      this.strafeFlipAt = time + Phaser.Math.Between(S.flipMs.min, S.flipMs.max);
    }
    const side = Math.atan2(player.y - this.y, player.x - this.x) + (this.strafeDir * Math.PI) / 2;
    this.steerTo({ x: this.x + Math.cos(side) * S.stepPx, y: this.y + Math.sin(side) * S.stepPx }, speed * S.speedFactor);
  }

  /**
   * Looks for a ball Varu swatted back that is flying at her. Once per ball she decides: smash it back (she stands and waits for it to
   * come in reach), jump aside, or take it. Returns true while she is busy with it (the caller skips the rest of her thinking).
   */
  private watchBalls(time: number, ctx: EnemyContext): boolean {
    const R = TENNIS.ret;
    if (time < this.dodgeUntil) {
      this.setVelocityFrom(this.dodgeX, this.dodgeY, this.stats.speed * R.dodgeSpeedFactor);
      return true;
    }
    const ball = this.incomingBall(ctx.projectiles);
    if (!ball) {
      this.planBall = null;
      return false;
    }
    if (ball !== this.planBall) this.decide(time, ball);
    if (this.plan === 'return') {
      this.setVelocity(0, 0);
      const dist = Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y);
      if (!this.returnSwung && dist <= R.reachPx + R.swingLeadPx) {
        this.returnSwung = true;
        this.rig.swing();
      }
      if (dist <= R.reachPx) this.smashBack(time, ball, ctx.player);
      return true;
    }
    return false; // 'dodge' is handled by `dodgeUntil` above, 'stand' just takes the ball
  }

  /** The closest swatted tennis ball that flies at her (inside `senseRange`, aimed within `lateralPx` of her middle), or null. */
  private incomingBall(group: Phaser.Physics.Arcade.Group | undefined): Projectile | null {
    if (!group) return null;
    const R = TENNIS.ret;
    let best: Projectile | null = null;
    let bestDist: number = R.senseRange;
    for (const child of group.getChildren()) {
      const p = child as Projectile;
      if (!p.active || !p.friendly || p.kind !== 'tennis' || !p.body) continue;
      const v = (p.body as Phaser.Physics.Arcade.Body).velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed < 50) continue;
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= bestDist) continue;
      if ((v.x * dx + v.y * dy) / speed <= 0) continue; // flying away from her
      if (Math.abs(v.x * dy - v.y * dx) / speed > R.lateralPx) continue; // will miss her
      best = p;
      bestDist = dist;
    }
    return best;
  }

  /** Once per ball: smash it back, jump aside, or take it. A ball she does not return makes her angry (fireball next). */
  private decide(time: number, ball: Projectile): void {
    const R = TENNIS.ret;
    this.planBall = ball;
    this.returnSwung = false;
    const roll = Math.random();
    const returnChance = this.scaled(R.chance);
    if (ball.returns < R.maxReturns && time >= this.returnReadyAt && roll < returnChance) {
      this.plan = 'return';
      this.callOff(); // a serve she was winding up is dropped: the ball comes first
      this.nextShotAt = Math.max(this.nextShotAt, time + TENNIS.windUpMs);
      return;
    }
    this.angry = !this.ballBoy;
    if (roll < returnChance + R.dodgeChance) {
      this.plan = 'dodge';
      this.callOff();
      const v = (ball.body as Phaser.Physics.Arcade.Body).velocity;
      const speed = Math.hypot(v.x, v.y) || 1;
      // Sideways to the ball's flight, to the side she already stands on.
      const nx = -v.y / speed;
      const ny = v.x / speed;
      const side = nx * (this.x - ball.x) + ny * (this.y - ball.y) >= 0 ? 1 : -1;
      this.dodgeX = nx * side;
      this.dodgeY = ny * side;
      this.dodgeUntil = time + R.dodgeMs;
    } else {
      this.plan = 'stand';
    }
  }

  /** The ball is in reach: the racket meets it and it flies back at Varu (a bit faster), as a normal ball he can swat again. */
  private smashBack(time: number, ball: Projectile, player: Player): void {
    const R = TENNIS.ret;
    const body = ball.body as Phaser.Physics.Arcade.Body;
    ball.sendBack(this.aimAngle(player, Math.min(Math.max(body.speed, 300) * R.speedFactor, R.maxSpeed)), R.speedFactor, R.maxSpeed);
    this.rig.hit();
    this.plan = 'stand';
    this.returnReadyAt = time + R.cooldownMs;
    this.nextShotAt = Math.max(this.nextShotAt, time + TENNIS.windUpMs);
    bus.emit(Events.TennisReturn, { x: ball.x, y: ball.y });
  }

  /** A chance that grows with the waves: `base` at her first wave, `perWave` more for each wave after it, never above `max`. */
  private scaled(c: { readonly base: number; readonly perWave: number; readonly max: number }): number {
    return Math.min(c.max, c.base + c.perWave * Math.max(0, this.wave - TENNIS.scale.fromWave));
  }

  /** Walk in the direction (dx, dy) (a unit vector) at `speed`. */
  private setVelocityFrom(dx: number, dy: number, speed: number): void {
    this.setVelocity(dx * speed, dy * speed);
  }

  /** Where a ball of this speed should be aimed: a bit ahead of Varu if he is walking (`TENNIS.lead`). */
  private aimAngle(player: Player, ballSpeed: number): number {
    const L = TENNIS.lead;
    let tx = player.x;
    let ty = player.y;
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    if (body && ballSpeed > 0) {
      const flightSec = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) / ballSpeed;
      let ox = body.velocity.x * flightSec * L.factor;
      let oy = body.velocity.y * flightSec * L.factor;
      const len = Math.hypot(ox, oy);
      if (len > L.maxPx) {
        ox = (ox / len) * L.maxPx;
        oy = (oy / len) * L.maxPx;
      }
      tx += ox;
      ty += oy;
    }
    return Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
  }

  /** A serve that does not happen after all: back to walking, the ball comes down and the racket relaxes. */
  private callOff(): void {
    if (this.phase !== 'windup') return;
    this.phase = 'move';
    this.rig.relax();
  }

  /** The loose parts follow her body after it has moved this frame (same trick as Federer's racket arm). */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
  }

  /** A cat that gives up stops mid-serve: the ball comes down and the racket relaxes while she waves her flag. */
  override surrender(exit: Phaser.Types.Math.Vector2Like): void {
    super.surrender(exit);
    if (this.surrendering) this.rig.relax();
  }

  override destroy(fromScene?: boolean): void {
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: the racket flies off
    super.destroy(fromScene);
  }

  /** Re-checks the line to Varu now and then (not every frame). A ball is as wide as its hit radius. */
  private updateSight(time: number, player: Player): void {
    if (time - this.lineCheckedAt < TENNIS.sightMs) return;
    this.lineCheckedAt = time - Math.random() * 40; // spread the checks of several cats over different frames
    this.clearLine = hasClearLine(this.x, this.y, player.x, player.y, PROJECTILES.tennis.hitRadius, this.obstacles);
  }

  private faceTowards(x: number, y: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle + Math.PI / 2, TENNIS.turnRate);
  }

  /** Walks away from Varu to a point behind her, kept inside the world (steerTo turns around walls). */
  private backOff(player: Player, speed: number): void {
    const away = Math.atan2(this.y - player.y, this.x - player.x);
    const m = TENNIS.wallMargin;
    const target = {
      x: Phaser.Math.Clamp(this.x + Math.cos(away) * TENNIS.retreatStep, m, WORLD.width - m),
      y: Phaser.Math.Clamp(this.y + Math.sin(away) * TENNIS.retreatStep, m, WORLD.height - m),
    };
    this.steerTo(target, speed);
  }

  /**
   * One ball toward Varu (a bit ahead of him if he walks), a little off (the spread), leaving her racket. A green tennis ball the belt can
   * swat back (`PROJECTILES.tennis.deflectable`), or the red fireball (`fireNext`) that the belt can only break.
   */
  private serve(player: Player): void {
    const fire = this.fireNext;
    const speed = fire ? TENNIS.fire.projectileSpeed : TENNIS.projectileSpeed;
    const spread = fire ? TENNIS.fire.spreadDeg : TENNIS.spreadDeg;
    const angle = this.aimAngle(player, speed) + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-spread, spread));
    const ball: SpawnProjectilePayload = {
      kind: fire ? 'fireball' : 'tennis',
      x: this.x + Math.cos(angle) * TENNIS.muzzle,
      y: this.y + Math.sin(angle) * TENNIS.muzzle,
      angle,
      speed,
    };
    bus.emit(Events.SpawnProjectile, ball);
  }
}
