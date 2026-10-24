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

/**
 * The almanac button on the main menu (top left): the almanac's picture (`assets/art/almanacBook.ts`) bobbing a little, a pill with how many
 * entries were found, and the name under it. `y` is the middle of book + name together (`touchY` on phones). `bookH` = height of the picture.
 */
export const ALMANAC_MENU = {
  x: 118,
  y: 71,
  touchY: 75,
  bookH: 92,
  touchBookH: 96,
  size: 24,
  touchSize: 26,
  labelGap: 4,
  /** Click area: wider than the book so a thumb finds it. */
  hitW: 140,
  /** The "found / total" pill that sits on the lower right corner of the book. */
  pill: { w: 60, h: 24, size: 17, border: 3, color: 0x1b2340, textColor: '#f5c518', doneColor: '#7ee081' },
  /** The idle wiggle: the book sways `deg` degrees and bobs `px` pixels. */
  bob: { px: 3, deg: 3, swayMs: 1300, bobMs: 900 },
  /** Two sparkles that twinkle round the book: [x, y] as shares of the book's height from its middle, and the delay of each. */
  sparkles: [
    { x: -0.5, y: -0.34, scale: 0.8, delayMs: 0 },
    { x: 0.52, y: -0.12, scale: 0.6, delayMs: 700 },
  ] as readonly { x: number; y: number; scale: number; delayMs: number }[],
  sparkleMs: 900,
  /**
   * Hover (desktop): the cover swings open round the spine. `endScale` = the cover's sideways scale once open (negative = flipped over, its
   * inside showing), `shift` = how far (art pixels) the whole book slides right meanwhile, `dip` = how much the cover tips toward you in the middle.
   */
  open: { ms: 320, closeMs: 200, endScale: -0.62, shift: 15, dip: 0.08 },
} as const;

/** The book on the almanac screen's title: its height and how far it stands from the title's ends. */
export const ALMANAC_TITLE_BOOK = { h: 72, gap: 52 } as const;
