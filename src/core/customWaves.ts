/** @file The custom game's waves: the last wave, in which wave each boss comes (and comes back), how many cats of each kind a wave has, and when a belt upgrade is due. Pure numbers, no Phaser. */
import type { BossType, EnemyType } from '../config/balance';
import { BOSS_ROW, CAT_ROW, CUSTOM_CATS, CUSTOM_WAVES, type CustomSetup } from '../config/customGame';
import type { WaveDef } from '../config/waves';
import { customValue } from './customGame';

/** The bosses in the order they win a tie. */
const BOSS_ORDER = Object.keys(BOSS_ROW) as BossType[];

/** The last wave of the game (clearing it wins), or null when the game never ends. */
export function customFinalWave(setup: CustomSetup): number | null {
  const waves = customValue(setup, 'waves');
  return waves > 0 ? waves : null;
}

/**
 * A free wave for a boss that wants `wave`: that one, else the next ones up to the last wave, else the ones before it (so a boss that asks for
 * wave 30 in a 10 wave game comes in wave 10, or in 9 if a boss has 10), else none. A game without a last wave only ever bumps forward.
 */
function freeWave(wave: number, final: number | null, taken: ReadonlySet<number>): number | null {
  const last = final ?? Number.POSITIVE_INFINITY;
  for (let n = wave; n <= last; n++) if (!taken.has(n)) return n;
  for (let n = Math.min(wave, last + 1) - 1; n >= 1; n--) if (!taken.has(n)) return n;
  return null;
}

/**
 * The wave each boss comes in for the first time. Every boss gets a wave of its own (the one asked for, or the nearest free one: see `freeWave`);
 * a boss that finds no room is dropped. Bosses are placed from the earliest wanted wave on, and a tie goes to the Queen, then the emo cat.
 */
export function bossFirstWaves(setup: CustomSetup): Partial<Record<BossType, number>> {
  const final = customFinalWave(setup);
  const wanted = BOSS_ORDER.map((boss) => ({ boss, wave: customValue(setup, BOSS_ROW[boss]) }))
    .filter((entry) => entry.wave > 0)
    .sort((a, b) => a.wave - b.wave);
  const taken = new Set<number>();
  const out: Partial<Record<BossType, number>> = {};
  for (const { boss, wave } of wanted) {
    const at = freeWave(wave, final, taken);
    if (at === null) continue;
    taken.add(at);
    out[boss] = at;
  }
  return out;
}

/**
 * The bosses of one wave: NEVER more than one. A boss is due in its first wave and then every `bossRepeat` waves (never, when that is 0).
 * If two are due in the same wave, a boss that is coming for the FIRST time wins (so no boss is left out of the game by a clash), and between
 * bosses that are only repeating the wave number picks, so they take turns.
 */
export function customBossesAt(setup: CustomSetup, wave: number): BossType[] {
  const first = bossFirstWaves(setup);
  const repeat = customValue(setup, 'bossRepeat');
  const due: BossType[] = [];
  let debut: BossType | null = null;
  for (const boss of BOSS_ORDER) {
    const start = first[boss];
    if (start === undefined) continue;
    if (wave === start) debut = boss;
    else if (repeat > 0 && wave > start && (wave - start) % repeat === 0) due.push(boss);
  }
  if (debut) return [debut];
  const pick = due.length > 0 ? due[wave % due.length] : undefined;
  return pick ? [pick] : [];
}

/** The crowd's share (of `CUSTOM_WAVES.base`) in a wave: from the pace's first value to its last over the game, then (a game without end) growing. */
function crowdShare(setup: CustomSetup, wave: number, final: number | null): number {
  const pace = CUSTOM_WAVES.paces[customValue(setup, 'pace')] ?? CUSTOM_WAVES.paces[0]!;
  const span = final ?? CUSTOM_WAVES.infiniteRampWaves;
  const along = Math.min(1, Math.max(0, (wave - 1) / Math.max(1, span - 1)));
  const share = pace.from + (pace.to - pace.from) * along;
  if (final !== null || pace.to <= pace.from) return share;
  return share * (1 + CUSTOM_WAVES.infiniteGrowth * Math.max(0, wave - span));
}

/**
 * What one wave of the custom game holds: the bosses of the wave (one of each, at most one in all) and, for every cat kind that is switched on,
 * `max(1, round(base x amount x share))` cats, where `share` follows the pace (and is multiplied by "pisici cu bossul" in a wave with a boss).
 * A wave can come out empty (everything off in that wave): it is then cleared at once.
 */
export function customWaveDef(setup: CustomSetup, wave: number): WaveDef {
  const final = customFinalWave(setup);
  const bosses = customBossesAt(setup, wave);
  let share = crowdShare(setup, wave, final);
  if (bosses.length > 0) share *= customValue(setup, 'bossCrowd');

  const def: WaveDef = {};
  for (const boss of bosses) def[boss as EnemyType] = 1;
  if (share <= 0) return def;
  for (const cat of CUSTOM_CATS) {
    const amount = customValue(setup, CAT_ROW[cat]);
    if (amount <= 0) continue;
    def[cat] = Math.max(1, Math.round(CUSTOM_WAVES.base[cat] * amount * share));
  }
  return def;
}

/** Is a belt upgrade pick due after this wave was cleared? Every N waves; never at or after the last wave (the game is over by then). */
export function customUpgradeDue(setup: CustomSetup, wave: number): boolean {
  const every = customValue(setup, 'upgrades');
  if (every <= 0) return false;
  const final = customFinalWave(setup);
  if (final !== null && wave >= final) return false;
  return wave % every === 0;
}
