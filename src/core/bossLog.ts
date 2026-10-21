/** @file Pure counters for one boss fight: time per mode and tier, attacks used and how often each hit Varu, damage both ways, stuns. Fed by Boss and BossLab. */
import type { BossType } from '../config/balance';

/** What a boss is doing (the same names as `BossMode` in entities/bosses/Boss.ts). */
export type LogMode = 'intro' | 'idle' | 'telegraph' | 'active' | 'recover' | 'stunned';

export interface AttackTally {
  used: number;
  /** Times it hurt Varu (a spin can hit twice). */
  hits: number;
  damage: number;
}

export interface OtherTally {
  hits: number;
  damage: number;
}

/** One fight, counted in game time (it stops during pause and follows the slow-mo). Cheap arithmetic: always on. */
export class BossFightLog {
  readonly boss: BossType;
  readonly modeMs: Record<LogMode, number> = { intro: 0, idle: 0, telegraph: 0, active: 0, recover: 0, stunned: 0 };
  /** Time per tier: phase 1, phase 2, rage. */
  readonly tierMs: [number, number, number] = [0, 0, 0];
  readonly attacks: Record<string, AttackTally> = {};
  /** Hits that were not an attack: touching the boss while it idles ('touch'), its summoned cats ('minions'), unknown. */
  readonly other: Record<string, OtherTally> = {};
  stuns = 0;
  /** Health the boss lost (after armor), and the part of it that came from returned tennis balls. */
  bossDamage = 0;
  ballDamage = 0;
  varuHits = 0;
  varuDamage = 0;

  constructor(boss: BossType) {
    this.boss = boss;
  }

  /** The entrance does not count as fight time. */
  get fightMs(): number {
    const m = this.modeMs;
    return m.idle + m.telegraph + m.active + m.recover + m.stunned;
  }

  tick(mode: LogMode, ms: number, tier: number): void {
    this.modeMs[mode] += ms;
    if (mode !== 'intro') this.tierMs[Math.min(Math.max(tier, 1), 3) - 1] += ms;
  }

  attackStarted(id: string): void {
    const t = (this.attacks[id] ??= { used: 0, hits: 0, damage: 0 });
    t.used += 1;
  }

  bossHit(effective: number): void {
    this.bossDamage += effective;
  }

  ballHit(effective: number): void {
    this.ballDamage += effective;
  }

  stunned(): void {
    this.stuns += 1;
  }

  /** Varu got hurt. `label` = the attack the boss was in (or 'touch', 'minions'); an unknown attack counts as 'other'. */
  varuHurt(label: string, amount: number, isAttack: boolean): void {
    this.varuHits += 1;
    this.varuDamage += amount;
    const attack = isAttack ? this.attacks[label] : undefined;
    if (attack) {
      attack.hits += 1;
      attack.damage += amount;
      return;
    }
    const key = label || '?';
    const o = (this.other[key] ??= { hits: 0, damage: 0 });
    o.hits += 1;
    o.damage += amount;
  }
}
