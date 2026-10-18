import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { byPhase, QUEEN } from '../../config/bosses';
import type { EnemyContext } from '../Enemy';
import { telegraphLine } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';

/**
 * MID BOSS. Slow and regal: calls her royal guard, and charges in a straight line
 * (watch the red lane). Phase 2: bigger guard, faster charges, shorter pauses.
 */
export class QueenCat extends Boss {
  private chargeAngle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'queen', Tex.BossQueen);
  }

  protected cooldown(): number {
    return byPhase(QUEEN.cooldownMs, this.phase);
  }

  protected idleMove(ctx: EnemyContext): void {
    this.steerTo(ctx.player, this.stats.speed, QUEEN.preferredDistance);
    this.faceTarget();
  }

  protected override onPhaseTwo(): void {
    this.summon('normal', QUEEN.phase2Summon, QUEEN.summonRadius);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'decree',
        telegraphMs: 700,
        activeMs: 0,
        recoverMs: 900,
        onTelegraph: () => this.flash(0xf5c518, 650),
        onFire: () => this.summon('normal', byPhase(QUEEN.summonCount, this.phase), QUEEN.summonRadius),
      },
      {
        id: 'charge',
        telegraphMs: QUEEN.chargeTelegraphMs,
        activeMs: QUEEN.chargeMs,
        recoverMs: 1100,
        lockFacing: true,
        onTelegraph: () => {
          this.chargeAngle = this.angleToPlayer();
          this.rotation = this.chargeAngle + Math.PI / 2;
          this.track(telegraphLine(this.scene, this.x, this.y, this.chargeAngle, 780, this.stats.hitRadius * 2, QUEEN.chargeTelegraphMs));
        },
        onFire: () => {
          const speed = byPhase(QUEEN.chargeSpeed, this.phase);
          this.setVelocity(Math.cos(this.chargeAngle) * speed, Math.sin(this.chargeAngle) * speed);
          this.contactOverride = QUEEN.chargeDamage;
        },
      },
    ];
  }
}
