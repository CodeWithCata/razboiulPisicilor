import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { byPhase, MAFIA } from '../../config/bosses';
import { bus, Events, type ExplosionPayload, type SpawnProjectilePayload } from '../../core/events';
import { telegraphCircle } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';

/**
 * MID BOSS. Keeps his distance and puffs fans of smoke rings (the belt destroys them),
 * slams the ground around himself (run out of the red circle), and calls bodyguards.
 */
export class MafiaCat extends Boss {
  private readonly strafeDir = Math.random() < 0.5 ? 1 : -1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mafia', Tex.BossMafia);
  }

  protected cooldown(): number {
    return byPhase(MAFIA.cooldownMs, this.phase);
  }

  protected idleMove(): void {
    this.orbit(MAFIA.keepDistance, this.strafeDir);
  }

  protected override onPhaseTwo(): void {
    this.summon('ninja', MAFIA.phase2Summon, 130);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'rings',
        telegraphMs: 600,
        activeMs: () => (this.phase >= 2 ? MAFIA.secondVolleyDelayMs + 50 : 0),
        recoverMs: 1000,
        onTelegraph: () => this.flash(0xcfcfd8, 500),
        onFire: () => {
          this.volley();
          // Phase 2: a second volley right behind the first one.
          if (this.phase >= 2) {
            this.scene.time.delayedCall(MAFIA.secondVolleyDelayMs, () => {
              if (this.attackingId === 'rings') this.volley();
            });
          }
        },
      },
      {
        id: 'slam',
        telegraphMs: MAFIA.slamTelegraphMs,
        activeMs: 0,
        recoverMs: 1200,
        onTelegraph: () => {
          this.track(telegraphCircle(this.scene, this.x, this.y, MAFIA.slamRadius, MAFIA.slamTelegraphMs));
        },
        onFire: () => {
          const blast: ExplosionPayload = { x: this.x, y: this.y, radius: MAFIA.slamRadius, damage: MAFIA.slamDamage };
          bus.emit(Events.Explosion, blast);
        },
      },
      {
        id: 'guards',
        telegraphMs: MAFIA.guardTelegraphMs,
        activeMs: 0,
        recoverMs: 900,
        onTelegraph: () => this.flash(0x6fa8dc, 600),
        onFire: () => {
          this.summon('ninja', 2, 140);
          if (this.phase >= 2) this.summon('kamikaze', 2, 170);
        },
      },
    ];
  }

  /** A fan of smoke rings aimed at Varu. */
  private volley(): void {
    const count = byPhase(MAFIA.ringCount, this.phase);
    const spread = Phaser.Math.DegToRad(MAFIA.ringSpreadDeg);
    const base = this.angleToPlayer();
    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1) - 0.5) * spread;
      const ring: SpawnProjectilePayload = { kind: 'smoke', x: this.x, y: this.y, angle: base + offset, speed: MAFIA.ringSpeed };
      bus.emit(Events.SpawnProjectile, ring);
    }
  }
}
