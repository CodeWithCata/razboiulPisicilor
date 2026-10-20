/** @file Mid boss Regina Pisicilor: calls her royal guard, charges in a lane, whirls her scepter around her. Her loose parts are animated by QueenRig. */
import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { QUEEN_POSE_MS as MS, QUEEN_POSES as POSE } from '../../config/animation';
import { byPhase, QUEEN } from '../../config/bosses';
import { gameClock } from '../../core/clock';
import { bus, Events, type ExplosionPayload } from '../../core/events';
import type { EnemyContext } from '../Enemy';
import { telegraphCircle, telegraphLine } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';
import { QueenRig } from './QueenRig';

/**
 * MID BOSS. Slow and regal: calls her royal guard, charges in a straight line (watch the red lane) and whirls her
 * scepter around her (stay out of the ring, she is dizzy afterwards: hit her then).
 * Phase 2: bigger guard, faster charges, longer spins, shorter pauses, red glow.
 */
export class QueenCat extends Boss {
  private chargeAngle = 0;
  private spinNextTickAt = 0;
  private readonly rig: QueenRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'queen', Tex.BossQueen);
    this.rig = new QueenRig(scene, this);
  }

  protected cooldown(): number {
    return byPhase(QUEEN.cooldownMs, this.phase);
  }

  protected idleMove(ctx: EnemyContext): void {
    this.steerTo(ctx.player, this.stats.speed, QUEEN.preferredDistance);
    this.faceTarget();
  }

  /** Crouch and lunge on top of the walk cycle: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.pose.squash;
  }

  protected override onPhaseTwo(): void {
    this.rig.reset(MS.furyPop);
    this.rig.setFury(true);
    this.rig.to(POSE.furyPop, MS.furyPop, 'out');
    this.rig.to(POSE.relaxed, MS.furyBack, 'out', MS.furyBackDelay);
    this.rig.burst();
    this.rig.pulse(QUEEN.summonRadius * 2);
    this.summon('normal', QUEEN.phase2Summon, QUEEN.summonRadius);
  }

  /** The loose parts follow her body after it has moved this frame (same trick as Varu's legs). */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
  }

  override destroy(fromScene?: boolean): void {
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: the crown flies off
    super.destroy(fromScene);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'decree',
        telegraphMs: 700,
        activeMs: 0,
        recoverMs: 900,
        onTelegraph: () => this.rig.to(POSE.decreeRaise, MS.decreeRaise, 'out'),
        onFire: () => {
          this.summon('normal', byPhase(QUEEN.summonCount, this.phase), QUEEN.summonRadius);
          this.rig.to(POSE.decreeSlam, MS.decreeSlam, 'in');
          this.rig.to(POSE.relaxed, MS.decreeBack, 'out', MS.decreeBackDelay);
          this.rig.pulse(QUEEN.summonRadius * 1.6);
          this.rig.burst(6);
        },
      },
      {
        id: 'charge',
        telegraphMs: QUEEN.chargeTelegraphMs,
        activeMs: QUEEN.chargeMs,
        recoverMs: 1100,
        lockFacing: true,
        onTelegraph: () => {
          this.chargeAngle = this.angleToPlayer();
          this.rotation = this.uprightRotation(this.chargeAngle);
          this.track(telegraphLine(this.scene, this.x, this.y, this.chargeAngle, 780, this.stats.hitRadius * 2, QUEEN.chargeTelegraphMs));
          this.rig.setAlarm(true);
          this.rig.to(POSE.chargeWindup, MS.chargeWindup, 'out');
        },
        onFire: () => {
          const speed = byPhase(QUEEN.chargeSpeed, this.phase);
          this.setVelocity(Math.cos(this.chargeAngle) * speed, Math.sin(this.chargeAngle) * speed);
          this.contactOverride = QUEEN.chargeDamage;
          this.rig.to(POSE.chargeRush, MS.chargeRush, 'out');
          this.rig.setDust(true);
        },
        onEnd: () => {
          this.rig.setDust(false);
          this.rig.setAlarm(false);
          this.rig.to(POSE.relaxed, MS.chargeEnd, 'out');
        },
      },
      {
        id: 'spin',
        telegraphMs: QUEEN.spinTelegraphMs,
        activeMs: () => byPhase(QUEEN.spinMs, this.phase),
        recoverMs: QUEEN.spinRecoverMs,
        lockFacing: true,
        onTelegraph: () => {
          this.track(telegraphCircle(this.scene, this.x, this.y, QUEEN.spinRadius, QUEEN.spinTelegraphMs));
          this.rig.to(POSE.spinWindup, MS.spinWindup, 'inOut');
        },
        onFire: () => {
          this.spinNextTickAt = gameClock.now + QUEEN.spinFirstHitMs;
          this.rig.to(POSE.spinGo, MS.spinGo, 'out');
          this.rig.setDust(true);
          this.rig.setRing(true, QUEEN.spinRadius);
        },
        onActive: (time, delta) => this.spinStep(time, delta),
        onEnd: () => {
          this.rotation = Math.atan2(Math.sin(this.rotation), Math.cos(this.rotation)); // back to -PI..PI, so she turns the short way afterwards
          this.rig.setDust(false);
          this.rig.setRing(false);
          this.rig.to(POSE.relaxed, MS.spinEnd, 'out');
          this.rig.pulse(QUEEN.spinRadius);
          // Visual blast only (and it smashes props around her): the spin itself hurts through `spinStep`.
          const blast: ExplosionPayload = { x: this.x, y: this.y, radius: QUEEN.spinRadius, damage: 0, harmsPlayer: false, fromBoss: true };
          bus.emit(Events.Explosion, blast);
          this.rig.setDizzy(QUEEN.spinRecoverMs);
        },
      },
    ];
  }

  /** One frame of the spin: turn, slide toward Varu, and hurt him every tick while he is inside the ring. */
  private spinStep(time: number, delta: number): void {
    const turns = byPhase(QUEEN.spinTurns, this.phase);
    const ms = byPhase(QUEEN.spinMs, this.phase);
    this.rotation += ((turns * Math.PI * 2) / ms) * delta;
    this.steerTo(this.ctx.player, QUEEN.spinDriftSpeed, QUEEN.spinStopDistance);
    if (time < this.spinNextTickAt) return;
    this.spinNextTickAt = time + QUEEN.spinTickMs;
    const player = this.ctx.player;
    if (Math.hypot(player.x - this.x, player.y - this.y) <= QUEEN.spinRadius + player.hitRadius) {
      player.takeDamage(QUEEN.spinDamage, this.x, this.y);
    }
  }
}
