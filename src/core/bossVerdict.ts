/** @file Turns a BossFightLog into a FightReport with a verdict (balanced / boring / brutal) and the reasons, and sums many reports per boss. Pure; thresholds in config/debug.ts BOSS_LAB. */
import type { BossType } from '../config/balance';
import { BOSS_LAB } from '../config/debug';
import type { BossFightLog, LogMode } from './bossLog';

export type FightResult = 'won' | 'lost' | 'live';
export type VerdictLabel = 'balanced' | 'boring' | 'brutal' | 'mixed' | 'unclear';
export type FlagCode = 'tooEasy' | 'downtime' | 'slowPace' | 'narrow' | 'dominant' | 'toothless' | 'drag' | 'stunlock' | 'lostEarly' | 'tooHarsh' | 'unfair' | 'relentless';

/** Flags that make a boss boring (too soft) and flags that make it brutal (too hard). */
export const BORING_FLAGS: readonly FlagCode[] = ['tooEasy', 'downtime', 'slowPace', 'narrow', 'dominant', 'toothless', 'drag', 'stunlock'];
export const BRUTAL_FLAGS: readonly FlagCode[] = ['lostEarly', 'tooHarsh', 'unfair', 'relentless'];

export interface AttackRow {
  id: string;
  used: number;
  hits: number;
  damage: number;
}

/** What the run knew about the fight that the log does not. */
export interface FightContext {
  result: FightResult;
  varuMaxHp: number;
  /** The lowest health Varu reached during the fight. */
  varuMinHp: number;
  bossHp: number;
  bossMaxHp: number;
  /** Cheats used during the fight (words): a fight with any of these is not comparable. */
  tainted: string[];
}

export interface FightReport {
  boss: BossType;
  result: FightResult;
  fightSec: number;
  varuHpLostPct: number;
  varuMinHpPct: number;
  bossLeftPct: number;
  hitsTaken: number;
  damageTaken: number;
  hitsPerMin: number;
  attacksPerMin: number;
  uses: number;
  kinds: number;
  /** 0..1, how evenly the attacks are spread (1 = all equally often). */
  variety: number;
  /** Share of the not-stunned fight spent idle or recovering. */
  downtimeShare: number;
  stunShare: number;
  stuns: number;
  /** Share of the boss's lost health that came from returned balls. */
  ballShare: number;
  /** Share of the fight per mode (without the entrance). */
  modeShare: Record<LogMode, number>;
  tierSec: [number, number, number];
  attacks: AttackRow[];
  other: Array<{ id: string; hits: number; damage: number }>;
  flags: FlagCode[];
  label: VerdictLabel;
  /** False when cheats touched the fight. */
  clean: boolean;
  tainted: string[];
}

const L = BOSS_LAB;

/** Builds the report. `live` reports only judge what does not need an ending. */
export function buildReport(log: BossFightLog, ctx: FightContext): FightReport {
  const fightMs = log.fightMs;
  const sec = fightMs / 1000;
  const minutes = Math.max(sec / 60, 1e-6);
  const rows: AttackRow[] = Object.entries(log.attacks)
    .map(([id, t]) => ({ id, used: t.used, hits: t.hits, damage: t.damage }))
    .sort((a, b) => b.used - a.used);
  const used = rows.filter((r) => r.used > 0);
  const uses = used.reduce((sum, r) => sum + r.used, 0);
  const kinds = used.length;
  let variety = 0;
  if (kinds > 1) {
    const entropy = used.reduce((sum, r) => sum - (r.used / uses) * Math.log(r.used / uses), 0);
    variety = entropy / Math.log(kinds);
  }
  const m = log.modeMs;
  const stunMs = m.stunned;
  const awakeMs = fightMs - stunMs;
  const downtimeShare = awakeMs > 0 ? (m.idle + m.recover) / awakeMs : 0;
  const stunShare = fightMs > 0 ? stunMs / fightMs : 0;
  const share = (ms: number): number => (fightMs > 0 ? ms / fightMs : 0);
  const varuHpLostPct = (100 * log.varuDamage) / Math.max(ctx.varuMaxHp, 1);
  const bossLeftPct = (100 * Math.max(ctx.bossHp, 0)) / Math.max(ctx.bossMaxHp, 1);

  const flags: FlagCode[] = [];
  if (fightMs >= L.minFightMs) {
    if (downtimeShare > L.downtime[1]) flags.push('downtime');
    if (downtimeShare < L.downtime[0]) flags.push('relentless');
    if (uses / minutes < L.minAttacksPerMin) flags.push('slowPace');
    if (kinds < L.minKinds) flags.push('narrow');
    if (uses >= L.dominantMinUses && used[0] && used[0].used / uses > L.dominantShare) flags.push('dominant');
    const toothless = used.filter((r) => r.used >= L.toothlessUses && r.hits === 0).length;
    if (kinds >= 2 && toothless / kinds >= L.toothlessShare) flags.push('toothless');
    if (used.some((r) => r.used >= L.unfairUses && r.hits / r.used >= L.unfairHitRate)) flags.push('unfair');
    if (stunShare > L.stunShareMax) flags.push('stunlock');
    if (ctx.result === 'won') {
      if (varuHpLostPct < L.hpLostPct[0]) flags.push('tooEasy');
      if (varuHpLostPct > L.hpLostPct[1]) flags.push('tooHarsh');
      if (sec > L.lengthSec[1] && varuHpLostPct < 50) flags.push('drag');
    } else if (ctx.result === 'lost') {
      if (bossLeftPct > L.lostBossLeftPct || sec < L.lengthSec[0]) flags.push('lostEarly');
    }
  }
  const boring = flags.filter((f) => BORING_FLAGS.includes(f)).length;
  const brutal = flags.filter((f) => BRUTAL_FLAGS.includes(f)).length;
  let label: VerdictLabel;
  if (fightMs < L.minFightMs) label = 'unclear';
  else if (boring === 0 && brutal === 0) label = 'balanced';
  else if (boring > brutal) label = 'boring';
  else if (brutal > boring) label = 'brutal';
  else label = 'mixed';

  return {
    boss: log.boss,
    result: ctx.result,
    fightSec: sec,
    varuHpLostPct,
    varuMinHpPct: (100 * ctx.varuMinHp) / Math.max(ctx.varuMaxHp, 1),
    bossLeftPct,
    hitsTaken: log.varuHits,
    damageTaken: log.varuDamage,
    hitsPerMin: log.varuHits / minutes,
    attacksPerMin: uses / minutes,
    uses,
    kinds,
    variety,
    downtimeShare,
    stunShare,
    stuns: log.stuns,
    ballShare: log.bossDamage > 0 ? log.ballDamage / log.bossDamage : 0,
    modeShare: { intro: 0, idle: share(m.idle), telegraph: share(m.telegraph), active: share(m.active), recover: share(m.recover), stunned: share(m.stunned) },
    tierSec: [log.tierMs[0] / 1000, log.tierMs[1] / 1000, log.tierMs[2] / 1000],
    attacks: rows,
    other: Object.entries(log.other).map(([id, t]) => ({ id, hits: t.hits, damage: t.damage })),
    flags,
    label,
    clean: ctx.tainted.length === 0,
    tainted: ctx.tainted,
  };
}

/** The scoreboard line of one boss, over its clean duels that were long enough. */
export interface BossSummary {
  boss: BossType;
  fights: number;
  wins: number;
  /** Duels left out: cheats used, or too short. */
  skipped: number;
  avgSec: number;
  avgHpLostPct: number;
  avgHitsPerMin: number;
  avgDowntime: number;
  avgAttacksPerMin: number;
  counts: Record<VerdictLabel, number>;
  /** The verdict most duels agree on ('mixed' when they disagree, 'unclear' with fewer than 2 duels). */
  headline: VerdictLabel;
  /** Reasons that came up in at least half of the duels (most common first, at most 3). */
  topFlags: FlagCode[];
}

export function summarizeBook(book: readonly FightReport[], boss: BossType): BossSummary {
  const mine = book.filter((r) => r.boss === boss);
  const good = mine.filter((r) => r.clean && r.fightSec * 1000 >= L.minFightMs);
  const avg = (pick: (r: FightReport) => number): number => (good.length > 0 ? good.reduce((s, r) => s + pick(r), 0) / good.length : 0);
  const counts: Record<VerdictLabel, number> = { balanced: 0, boring: 0, brutal: 0, mixed: 0, unclear: 0 };
  const flagCount = new Map<FlagCode, number>();
  for (const r of good) {
    counts[r.label] += 1;
    for (const f of r.flags) flagCount.set(f, (flagCount.get(f) ?? 0) + 1);
  }
  let headline: VerdictLabel = 'unclear';
  if (good.length >= 2) {
    const order: VerdictLabel[] = ['balanced', 'boring', 'brutal', 'mixed'];
    const top = Math.max(...order.map((l) => counts[l]));
    const winners = order.filter((l) => counts[l] === top);
    headline = winners.length === 1 ? winners[0]! : 'mixed';
  }
  const topFlags = [...flagCount.entries()]
    .filter(([, n]) => n * 2 >= good.length)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f]) => f);
  return {
    boss,
    fights: good.length,
    wins: good.filter((r) => r.result === 'won').length,
    skipped: mine.length - good.length,
    avgSec: avg((r) => r.fightSec),
    avgHpLostPct: avg((r) => r.varuHpLostPct),
    avgHitsPerMin: avg((r) => r.hitsPerMin),
    avgDowntime: avg((r) => r.downtimeShare),
    avgAttacksPerMin: avg((r) => r.attacksPerMin),
    counts,
    headline,
    topFlags,
  };
}
