/** @file The almanac: which entries it has and in what order, the picture of each cat, the speed words and the layout of the screen. No Phaser. */
import { Tex, type TexKey } from '../assets/keys';
import { ENEMIES, type EnemyType, type PickupKind } from './balance';
import { PICKUP_VISUALS } from './pickups';

/** An entry of the almanac: a cat type (bosses too) or a pickup kind. The two sets of names never overlap. */
export type AlmanacId = EnemyType | PickupKind;

/** The order of the cards (left to right, top to bottom): the cats, the three bosses, the good pickups, then the bad ones. */
export const ALMANAC_ORDER = [
  'normal', 'fat', 'ninja', 'kamikaze', 'flying', 'tennis', 'bomber', 'lucky',
  'queen', 'mafia', 'federer',
  'crochete', 'lapte', 'monster', 'goldenBelt', 'laser', 'umbrella', 'scooter', 'iceCream', 'crow', 'mystery',
  'snail', 'dumbbell', 'emo', 'rusty', 'big', 'smoke',
] as const satisfies readonly AlmanacId[];

export const isCatId = (id: AlmanacId): id is EnemyType => id in ENEMIES;

const CAT_PICTURES: Record<EnemyType, TexKey> = {
  normal: Tex.CatNormal,
  fat: Tex.CatFat,
  ninja: Tex.CatNinja,
  kamikaze: Tex.CatKamikaze,
  flying: Tex.CatFlying,
  lucky: Tex.CatLucky,
  tennis: Tex.CatTennis,
  bomber: Tex.CatBomber,
  queen: Tex.BossQueen,
  mafia: Tex.BossMafia,
  federer: Tex.BossFederer,
};

/** The picture an entry shows (a cat's own picture, or the pickup's icon). */
export const almanacTex = (id: AlmanacId): TexKey => (isCatId(id) ? CAT_PICTURES[id] : PICKUP_VISUALS[id].tex);

/** Speed words by walking speed (px/s): a cat is "slow" below the first number, "medium" below the second, "fast" below the third, otherwise "very fast". */
export const ALMANAC_SPEED_BANDS = [100, 160, 230] as const;

/** Pickup spawn weight words: from this weight up = "often", "sometimes"; below = "rare". */
export const ALMANAC_RARITY = { often: 4, sometimes: 2 } as const;

/** The almanac screen, laid out on a 1280x720 base and centred when the canvas is bigger. */
export const ALMANAC = {
  base: { w: 1280, h: 720 },
  titleY: 56,
  cols: 8,
  grid: { x: 44, y: 128, cardW: 80, cardH: 96, gapX: 10, gapY: 12, icon: 60 },
  card: { radius: 10, border: 3, fill: 0xe3f3c8, fillLocked: 0x8b93a8, borderSelected: 0xf5c518, selectedScale: 1.07, hoverScale: 1.04, popMs: 110 },
  panel: { x: 786, y: 112, w: 450, h: 510, radius: 16, fill: 0xc9965a, inner: 0xfff3d6, innerAlpha: 0.96 },
  preview: { x: 20, y: 18, w: 410, h: 186, fill: 0x3f9a3a, iconFit: 150 },
  name: { y: 226, size: 38 },
  desc: { y: 252, h: 118, size: 19 },
  quote: { y: 378, h: 62, size: 18 },
  stats: { y: 452, rowH: 28, size: 20, colX: [24, 238] as const },
  back: { x: 190, y: 668, w: 320, h: 54, size: 26 },
  counter: { x: 44, y: 596, size: 26 },
} as const;
