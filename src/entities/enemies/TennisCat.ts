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
import { TennisCatRig } from './TennisCatRig';

type TennisPhase = 'move' | 'windup';

/**
 * Numbers: `TENNIS` in config/balance.ts. She walks to a comfortable distance from Varu, stops, winds up (flash) and serves one ball,
 * then moves again. She never serves through a wall, always faces Varu, and follows the laser dot like the other ground cats.
 * Her racket arm, racket and ball are loose layers animated by `TennisCatRig`: the ball is tossed up during the windup, the racket
 * swings and pops at the serve.
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tennis', Tex.CatTennis);
    this.rig = new TennisCatRig(scene, this);
    this.nextShotAt = gameClock.now + Phaser.Math.Between(TENNIS.firstShotMs.min, TENNIS.firstShotMs.max);
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
          this.rig.hit();
          this.phase = 'move';
          this.nextShotAt = time + Phaser.Math.Between(TENNIS.shotMinMs, TENNIS.shotMaxMs);
        }
      }
      return;
    }

    if (canServe && time >= this.nextShotAt) {
      this.phase = 'windup';
      this.fireAt = time + TENNIS.windUpMs;
      this.setVelocity(0, 0);
      this.swung = false;
      this.rig.toss(TENNIS.windUpMs - MS.smash);
      this.flash(TENNIS.windUpColor, TENNIS.windUpMs);
      return;
    }

    // Too far (or no clear line): walk closer. Too close: back off. Otherwise hold the spot.
    if (dist > TENNIS.preferredDistance + TENNIS.band || !this.clearLine) {
      this.chase(ctx, speed);
    } else if (dist < TENNIS.preferredDistance - TENNIS.band) {
      this.backOff(player, speed * TENNIS.retreatSpeedFactor);
    } else {
      this.setVelocity(0, 0);
    }
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

  /** One ball toward Varu, a little off (the spread), leaving her racket. The belt can swat it back (`PROJECTILES.tennis.deflectable`). */
  private serve(player: Player): void {
    const aimed = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const angle = aimed + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-TENNIS.spreadDeg, TENNIS.spreadDeg));
    const ball: SpawnProjectilePayload = {
      kind: 'tennis',
      x: this.x + Math.cos(angle) * TENNIS.muzzle,
      y: this.y + Math.sin(angle) * TENNIS.muzzle,
      angle,
      speed: TENNIS.projectileSpeed,
    };
    bus.emit(Events.SpawnProjectile, ball);
  }
}
