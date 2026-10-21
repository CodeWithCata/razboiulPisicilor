/** @file Dev-only: the options of the debug card's pickers (cat type, boss, wave, pickup, speed...), and how to read the chosen one. */
import { BAD_PICKUPS, ENEMIES, isBossType, BOSS_TYPES, type BossType, type EnemyType, type MysteryPrize } from '../config/balance';
import { DEBUG, type DebugId } from '../config/debug';
import { PICKUP_KINDS } from '../config/pickups';
import { FINAL_WAVE, getWave } from '../config/waves';
import { debugState } from '../core/debugState';
import { BOSS_TEXT } from './bosses';

export interface DebugOption {
  /** What the cheat reads (a type, a number, a mood...). */
  value: string;
  /** What the card shows. Short: it has to fit in the little picker. */
  label: string;
}

const CAT_NAMES: Partial<Record<EnemyType, string>> = {
  normal: 'Normală',
  kamikaze: 'Kamikaze',
  fat: 'Grasă',
  ninja: 'Ninja',
  flying: 'Zburătoare',
  lucky: 'Norocoasă',
  tennis: 'Tenis',
  queen: 'Regina',
  mafia: 'Mafia',
  federer: 'Federer',
};
const catName = (type: EnemyType): string => CAT_NAMES[type] ?? type;

/** Short names of the prizes the question mark can give (good and bad), for the two ghinion pickers. */
const PRIZE_NAMES: Record<MysteryPrize, string> = {
  crochete: 'Crochete',
  lapte: 'Lapte',
  monster: 'Monster',
  goldenBelt: 'Cureaua de aur',
  laser: 'Laser',
  crow: 'Ciori',
  snail: 'Melc',
  dumbbell: 'Gantera',
  emo: 'Emo',
  rusty: 'Rugină',
  big: 'Varu Mare',
  smoke: 'Țigară',
};

/** The cat types in the order of the keys 1-7 (every type that is not a boss). */
export const DEBUG_CAT_TYPES = (Object.keys(ENEMIES) as EnemyType[]).filter((t) => !isBossType(t));

const waveOptions = (): DebugOption[] => {
  const list: DebugOption[] = [];
  for (let n = 1; n <= FINAL_WAVE + DEBUG.extraWaves; n++) {
    const boss = (Object.keys(getWave(n)) as EnemyType[]).find(isBossType);
    list.push({ value: String(n), label: boss ? `Val ${n} (${catName(boss)})` : `Val ${n}` });
  }
  return list;
};

/**
 * Pickers. `spawnCat`: which cat 1-7 / the card spawn. `spawnCount`: how many at once. `boss`: which boss. `jumpWave`: which wave. `pickup`: which pickup.
 * `weather`: the weather to set now (fog / rain). `endBuff`: which good buff runs out now (Monster = energy crash, golden belt = goo). `badLuck`: which bad pickup hits Varu at once. `mysteryPrize`: what the question mark gives (random gamble, always bad, always good, or one exact prize). `crowd`: which mood. `fanThrow`: what the fan throws (`gift` = a random pickup, `gift:<kind>` = that pickup, `bad` = a petard). `setHp`: Varu's health share. `speed`: game speed.
 */
export const DEBUG_CHOICES: Partial<Record<DebugId, readonly DebugOption[]>> = {
  spawnCat: DEBUG_CAT_TYPES.map((t) => ({ value: t, label: catName(t) })),
  spawnCount: [1, 3, 5, 10, 25].map((n) => ({ value: String(n), label: `×${n}` })),
  boss: BOSS_TYPES.map((t) => ({ value: t, label: catName(t) })),
  jumpWave: waveOptions(),
  pickup: PICKUP_KINDS.map((k) => ({ value: k, label: k })),
  badLuck: BAD_PICKUPS.map((k) => ({ value: k, label: PRIZE_NAMES[k] })),
  mysteryPrize: [
    { value: 'random', label: 'La întâmplare' },
    { value: 'bad', label: 'Mereu rău' },
    { value: 'good', label: 'Mereu bun' },
    ...(Object.keys(PRIZE_NAMES) as MysteryPrize[]).map((k) => ({ value: k, label: PRIZE_NAMES[k] })),
  ],
  weather: [
    { value: 'clear', label: 'Senin' },
    { value: 'fog', label: 'Ceață' },
    { value: 'rain', label: 'Ploaie' },
  ],
  endBuff: (['monster', 'goldenBelt', 'lapte', 'laser'] as const).map((k) => ({ value: k, label: PRIZE_NAMES[k] })),
  crowd: [
    { value: 'cheer', label: 'Ovație' },
    { value: 'roar', label: 'Urlet + Ola' },
    { value: 'gloom', label: 'Tristețe' },
    { value: 'boo', label: 'Huiduieli' },
    { value: 'calm', label: 'Liniște' },
  ],
  fanThrow: [
    { value: 'gift', label: 'Cadou (la întâmplare)' },
    { value: 'bad', label: 'Petardă' },
    ...PICKUP_KINDS.map((k) => ({ value: `gift:${k}`, label: `Cadou: ${k}` })),
  ],
  setHp: [
    { value: '1', label: '100%' },
    { value: '0.75', label: '75%' },
    { value: '0.5', label: '50%' },
    { value: '0.3', label: '30%' },
    { value: '0.25', label: '25%' },
    { value: '0.1', label: '10%' },
    { value: '0.001', label: '1 HP' },
  ],
  speed: [0.1, 0.25, 0.5, 1, 2, 3].map((n) => ({ value: String(n), label: `×${n}` })),
  // Boss lab. `bossAttack` is filled live by `debugOptions` (it depends on the boss picker), the empty list only says "this row is a picker".
  bossAttack: [],
  bossHp: [1, 0.75, 0.5, 0.35, 0.25, 0.1].map((n) => ({ value: String(n), label: `${Math.round(n * 100)}%` })), // 50% = phase 2, 25% = rage
  bossReport: [
    { value: 'off', label: 'Ascuns' },
    { value: 'live', label: 'Live' },
    { value: 'book', label: 'Clasament' },
  ],
};

/** Where a picker starts (normal speed, not slow-mo). */
const DEFAULT_INDEX: Partial<Record<DebugId, number>> = { speed: 3, bossReport: 1 };

/** The options a picker offers right now: `bossAttack` is "any" plus the attacks of the boss the boss picker holds. */
export function debugOptions(id: DebugId): readonly DebugOption[] {
  if (id === 'bossAttack') {
    const boss = debugChoice('boss').value as BossType;
    return [{ value: 'all', label: 'Oricare' }, ...Object.keys(BOSS_TEXT[boss].attacks).map((a) => ({ value: a, label: a }))];
  }
  return DEBUG_CHOICES[id] ?? [];
}

/** The index of the option a picker holds now. */
export function debugChoiceIndex(id: DebugId): number {
  const list = debugOptions(id);
  if (list.length === 0) return 0;
  const i = debugState.choice[id] ?? DEFAULT_INDEX[id] ?? 0;
  return ((i % list.length) + list.length) % list.length;
}

/** The option a picker holds now. */
export function debugChoice(id: DebugId): DebugOption {
  const list = debugOptions(id);
  return list[debugChoiceIndex(id)] ?? { value: '', label: '' };
}

/** Moves a picker by `step` options (wraps around) and returns the option it holds now. */
export function debugStepChoice(id: DebugId, step: number): DebugOption {
  const list = debugOptions(id);
  if (list.length === 0) return debugChoice(id);
  debugState.choice[id] = (debugChoiceIndex(id) + step + list.length * 4) % list.length;
  debugState.active = id;
  return debugChoice(id);
}

/** Puts a picker on the option with this value (a key like 3 picks the cat type directly). */
export function debugSetChoice(id: DebugId, value: string): void {
  const i = debugOptions(id).findIndex((o) => o.value === value);
  if (i >= 0) debugState.choice[id] = i;
  debugState.active = id;
}
