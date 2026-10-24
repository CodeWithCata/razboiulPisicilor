/** @file Custom game: every row of the setup screen (what can be changed, the choices of each), the quick presets and the numbers the wave builder uses. No Phaser. */
import type { BossType, EnemyType } from './balance';
import type { DifficultyStats } from './difficulty';

/** The pages of the setup screen. `quick` holds the presets, the other three hold rows. */
export type CustomTabId = 'quick' | 'cats' | 'bosses' | 'rules';
export const CUSTOM_TABS: readonly CustomTabId[] = ['quick', 'cats', 'bosses', 'rules'];

/** The cat kinds the setup can switch on. The lucky cat comes by herself and the three bosses have rows of their own. */
export const CUSTOM_CATS = ['normal', 'fat', 'ninja', 'kamikaze', 'flying', 'tennis', 'bomber'] as const satisfies readonly EnemyType[];
export type CustomCat = (typeof CUSTOM_CATS)[number];

/** The fields of `DifficultyStats` that hold a plain number: a row can multiply them. */
export type NumericStat = { [K in keyof DifficultyStats]: DifficultyStats[K] extends number ? K : never }[keyof DifficultyStats];

/** One row of the setup screen. The setup stores the INDEX of the chosen value, so the choices can change without breaking a saved setup. */
export interface CustomRowDef {
  /** The page the row sits on. */
  readonly tab: Exclude<CustomTabId, 'quick'>;
  /** The choices, in the order the arrows step through them. Their words are in `content/customGame.ts` (same order). */
  readonly values: readonly number[];
  /** Index of the choice a fresh setup starts on. */
  readonly start: number;
  /** Fields of the run's difficulty that this row multiplies by the chosen value (see `core/customRules.ts`). */
  readonly scales?: readonly NumericStat[];
}

/** How many cats of one kind: none, a few, as usual, many, a flood. Multiplies `CUSTOM_WAVES.base`. */
const AMOUNT = [0, 0.5, 1, 1.6, 2.5] as const;
/** The wave a boss comes in (0 = the boss is off). */
const BOSS_WAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30] as const;

const ROWS = {
  // ---- cats ----
  catNormal: { tab: 'cats', values: AMOUNT, start: 2 },
  catFat: { tab: 'cats', values: AMOUNT, start: 1 },
  catNinja: { tab: 'cats', values: AMOUNT, start: 1 },
  catKamikaze: { tab: 'cats', values: AMOUNT, start: 1 },
  catFlying: { tab: 'cats', values: AMOUNT, start: 0 },
  catTennis: { tab: 'cats', values: AMOUNT, start: 0 },
  catBomber: { tab: 'cats', values: AMOUNT, start: 0 },
  /** Index into `CUSTOM_WAVES.paces`: how the crowd changes from the first wave to the last. */
  pace: { tab: 'cats', values: [0, 1, 2], start: 1 },
  // ---- bosses ----
  bossQueen: { tab: 'bosses', values: BOSS_WAVES, start: 5 },
  bossMafia: { tab: 'bosses', values: BOSS_WAVES, start: 0 },
  bossFederer: { tab: 'bosses', values: BOSS_WAVES, start: 9 },
  /** A boss that has come comes again every N waves (0 = once only). */
  bossRepeat: { tab: 'bosses', values: [0, 3, 5, 8], start: 0 },
  /** Share of the normal crowd that comes along with a boss. */
  bossCrowd: { tab: 'bosses', values: [0, 0.35, 0.7, 1], start: 1 },
  bossHp: { tab: 'bosses', values: [0.5, 0.75, 1, 1.5, 2.2], start: 2, scales: ['bossHp'] },
  /** Below 1 = the boss attacks again sooner (`DifficultyStats.bossPace`). */
  bossPace: { tab: 'bosses', values: [1.5, 1.2, 1, 0.8, 0.6], start: 2, scales: ['bossPace'] },
  // ---- rules ----
  /** Number of waves (0 = it never ends). */
  waves: { tab: 'rules', values: [3, 5, 8, 10, 15, 20, 30, 0], start: 3 },
  /** A belt upgrade pick after every N waves (0 = never). */
  upgrades: { tab: 'rules', values: [0, 1, 2, 3, 5], start: 3 },
  damage: { tab: 'rules', values: [0.4, 0.7, 1, 1.5, 2.5], start: 2, scales: ['damageTaken'] },
  heal: { tab: 'rules', values: [0.5, 1, 1.5, 2.5], start: 1, scales: ['heal'] },
  pickups: { tab: 'rules', values: [0.5, 1, 1.5, 2.5], start: 1, scales: ['pickups'] },
  /** Random bad luck: the curse rolls and the chance of a bad prize from a ?. */
  curses: { tab: 'rules', values: [0, 0.5, 1, 1.6], start: 2, scales: ['curses', 'mysteryBad'] },
  catHp: { tab: 'rules', values: [0.5, 0.75, 1, 1.5, 2.2], start: 2, scales: ['catHp'] },
  catSpeed: { tab: 'rules', values: [0.8, 1, 1.2, 1.4], start: 1, scales: ['catSpeed'] },
} as const satisfies Record<string, CustomRowDef>;

export type CustomRowId = keyof typeof ROWS;

/** Every row by its id. */
export const CUSTOM_ROWS: Readonly<Record<CustomRowId, CustomRowDef>> = ROWS;
/** The ids in the order the rows are listed on screen. */
export const CUSTOM_ROW_ORDER = Object.keys(ROWS) as CustomRowId[];

/** A setup: for every row, the index of the chosen value. Never changed in place (a new object per change), so a run can keep the one it started with. */
export type CustomSetup = Readonly<Record<CustomRowId, number>>;

/** The rows of one page, in screen order. */
export const rowsOfTab = (tab: CustomTabId): CustomRowId[] => CUSTOM_ROW_ORDER.filter((id) => CUSTOM_ROWS[id].tab === tab);

/** Which row holds each cat kind / each boss. */
export const CAT_ROW = {
  normal: 'catNormal',
  fat: 'catFat',
  ninja: 'catNinja',
  kamikaze: 'catKamikaze',
  flying: 'catFlying',
  tennis: 'catTennis',
  bomber: 'catBomber',
} as const satisfies Record<CustomCat, CustomRowId>;

export const BOSS_ROW = { queen: 'bossQueen', mafia: 'bossMafia', federer: 'bossFederer' } as const satisfies Record<BossType, CustomRowId>;

/** Why a setup cannot be played (the words are in `content/customGame.ts`): no cats and no bosses at all, or no cats and nothing that ends the game. */
export type CustomProblem = 'nothing' | 'noCatsForever';

/** The numbers the wave builder (`core/customWaves.ts`) uses. */
export const CUSTOM_WAVES = {
  /** Cats of each kind in one wave at "Normal" amount and full pace (about a wave from the middle of the campaign). */
  base: { normal: 14, fat: 4, ninja: 7, kamikaze: 8, flying: 7, tennis: 4, bomber: 2 } satisfies Record<CustomCat, number>,
  /** The crowd's share (of `base`) in the first and in the last wave; in between it grows in a straight line. */
  paces: [
    { from: 1, to: 1 }, // constant
    { from: 0.4, to: 1.15 }, // grows, like the campaign
    { from: 0.6, to: 2 }, // brutal
  ] as readonly { from: number; to: number }[],
  /** A game that never ends has no last wave to grow toward: it grows over this many waves... */
  infiniteRampWaves: 20,
  /** ...and past them by this share of the crowd per extra wave (only if the pace grows at all). */
  infiniteGrowth: 0.06,
} as const;

/** How the custom game looks in the HUD and on the difficulty (the colour is only a label colour). */
export const CUSTOM_LOOK = { color: '#c9a7ff' } as const;

/** A quick setup. It starts from the default setup and sets the listed rows to the given VALUES (not indexes; a value that is not a choice of its row is ignored). */
export interface CustomPresetDef {
  readonly id: string;
  readonly values: Readonly<Partial<Record<CustomRowId, number>>>;
}

export const CUSTOM_PRESETS = [
  {
    id: 'bossRush',
    values: { catNormal: 0, catFat: 0, catNinja: 0, catKamikaze: 0, waves: 3, bossQueen: 1, bossMafia: 2, bossFederer: 3, bossCrowd: 0, upgrades: 1 },
  },
  {
    id: 'invasion',
    values: { waves: 10, catNormal: 1.6, catFat: 1.6, catNinja: 1.6, catKamikaze: 1.6, catFlying: 1.6, catTennis: 1, catBomber: 1, pace: 2, bossQueen: 0, bossMafia: 0, bossFederer: 0, upgrades: 2, pickups: 1.5 },
  },
  {
    id: 'chill',
    values: { waves: 8, catNormal: 1, catFat: 0, catNinja: 0.5, catKamikaze: 0.5, pace: 0, bossQueen: 8, bossMafia: 0, bossFederer: 0, damage: 0.4, heal: 2.5, curses: 0 },
  },
  {
    id: 'chaos',
    values: {
      waves: 0, catNormal: 1.6, catFat: 1.6, catNinja: 1.6, catKamikaze: 1.6, catFlying: 1.6, catTennis: 1.6, catBomber: 1.6,
      pace: 2, bossQueen: 5, bossMafia: 10, bossFederer: 15, bossRepeat: 8, bossCrowd: 0.7, upgrades: 3, curses: 1.6, pickups: 2.5,
    },
  },
] as const satisfies readonly CustomPresetDef[];

export type CustomPresetId = (typeof CUSTOM_PRESETS)[number]['id'];
