/** @file Emo mid boss: keeps distance, fans of broken hearts, screamo shockwave, calls a crew of ninjas. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { EMO_POSE_MS as MS, EMO_POSES as POSE, EMO_RIG } from '../../config/animation';
import { byPhase, MAFIA } from '../../config/bosses';
import { bus, Events, type ExplosionPayload, type SpawnProjectilePayload } from '../../core/events';
import { telegraphCircle } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';
import { EmoRig } from './EmoRig';
import { gameClock } from '../../core/clock';

/**
 * MID BOSS (the emo cat). Keeps his distance and throws fans of broken hearts (the belt destroys them),
 * screams a shockwave around himself (run out of the pink circle), and calls his crew: ninjas, always.
 * He is sad the whole time: slumped, trudging, crying, with a little rain cloud over his head (see EmoRig).
 */
export class MafiaCat extends Boss {
  private readonly strafeDir = Math.random() < 0.5 ? 1 : -1;
  private readonly rig: EmoRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mafia', Tex.BossMafia);
    this.rig = new EmoRig(scene, this);
  }

  /** The slump, sobs and attack poses squash him; the rig works out how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  /** Slow, heavy, hunched shuffle instead of the normal boss gait. */
  protected override get gaitLook(): { readonly swayDeg: number; readonly squash: number; readonly stride: number } {
    return EMO_RIG.gait;
  }

  /** The loose bits (tears, cloud, sighs) follow his body after it has moved this frame. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
  }

  /** Getting hit makes him jolt and spurt tears. */
  protected override applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
    const killed = super.applyHit(effective, fromX, fromY, knockback);
    if (!killed) this.rig.hurt();
    return killed;
  }

  protected override onStunned(): void {
    this.rig.to(POSE.stunned, MS.stunned, 'out');
    this.rig.spray(8);
  }

  protected override onStunEnd(): void {
    this.rig.to(POSE.slump, MS.stunBack, 'out');
  }

  override destroy(fromScene?: boolean): void {
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: he bursts into tears
    super.destroy(fromScene);
  }

  protected cooldown(): number {
    return byPhase(MAFIA.cooldownMs, this.phase);
  }

  protected idleMove(): void {
    this.orbit(MAFIA.keepDistance, this.strafeDir);
  }

  protected override onPhaseTwo(): void {
    // Emotional breakdown: he shakes and bawls, tears fly everywhere, and the cloud turns into a storm.
    this.rig.setStorm(true);
    this.rig.to(POSE.breakdown, MS.breakdown, 'out');
    this.rig.to(POSE.slump, MS.breakdownBack, 'out', MS.breakdownBackDelay);
    this.rig.spray(16, true);
    this.summon('ninja', MAFIA.phase2Summon, MAFIA.crewRadius - 10);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'hearts',
        telegraphMs: 600,
        activeMs: () => (this.phase >= 2 ? MAFIA.secondVolleyDelayMs + 50 : 0),
        recoverMs: 1000,
        onTelegraph: () => {
          this.flash(MAFIA.heartFlash, 500);
          this.rig.to(POSE.heartsWind, MS.heartsWind, 'out'); // hunched over, sobbing
        },
        onFire: () => {
          this.rig.to(POSE.heartsFire, MS.heartsFire, 'out'); // the throw
          this.rig.to(POSE.slump, MS.heartsBack, 'out', 140);
          this.volley();
          // Phase 2: a second volley right behind the first one.
          if (this.phase >= 2) {
            this.scene.time.delayedCall(MAFIA.secondVolleyDelayMs, () => {
              if (this.attackingId === 'hearts') this.volley();
            });
          }
        },
      },
      {
        id: 'scream',
        telegraphMs: MAFIA.screamTelegraphMs,
        activeMs: 0,
        recoverMs: 1200,
        onTelegraph: () => {
          this.track(telegraphCircle(this.scene, this.x, this.y, MAFIA.screamRadius, MAFIA.screamTelegraphMs, MAFIA.screamColor));
          this.rig.to(POSE.screamWind, MS.screamWind, 'inOut'); // curls up, shaking, tears pouring
        },
        onFire: () => {
          this.rig.to(POSE.screamFire, MS.screamFire, 'out'); // the big open-mouth scream
          this.rig.to(POSE.slump, MS.screamBack, 'out', 220);
          this.rig.spray(18, true);
          const blast: ExplosionPayload = { x: this.x, y: this.y, radius: MAFIA.screamRadius, damage: MAFIA.screamDamage, fromBoss: true };
          bus.emit(Events.Explosion, blast);
        },
      },
      {
        id: 'crew',
        telegraphMs: MAFIA.crewTelegraphMs,
        activeMs: 0,
        recoverMs: 900,
        onTelegraph: () => {
          this.flash(MAFIA.crewFlash, 600);
          this.rig.to(POSE.crewWind, MS.crewWind, 'out'); // sulky lean
        },
        onFire: () => {
          this.rig.to(POSE.crewFire, MS.crewFire, 'out'); // limp wave of the paw
          this.rig.to(POSE.slump, MS.crewBack, 'out', 200);
          this.summon('ninja', byPhase(MAFIA.crewCount, this.phase), MAFIA.crewRadius);
        },
      },
    ];
  }

  /** A fan of broken hearts aimed at Varu. */
  private volley(): void {
    const count = byPhase(MAFIA.heartCount, this.phase);
    const spread = Phaser.Math.DegToRad(MAFIA.heartSpreadDeg);
    const base = this.angleToPlayer();
    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1) - 0.5) * spread;
      const heart: SpawnProjectilePayload = { kind: 'heart', x: this.x, y: this.y, angle: base + offset, speed: MAFIA.heartSpeed };
      bus.emit(Events.SpawnProjectile, heart);
    }
  }
}
