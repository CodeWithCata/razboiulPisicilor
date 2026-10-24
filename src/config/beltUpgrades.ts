/** @file Belt upgrades picked between waves: when they are offered, what each level gives, and the look of the pick screen. */
import { COLORS } from './style';

export const BELT_UPGRADE_IDS = ['heavy', 'long', 'quick', 'tornado', 'knock'] as const;
export type BeltUpgradeId = (typeof BELT_UPGRADE_IDS)[number];

/**
 * What each upgrade gives. `values[i]` is the multiplier at level i + 1 (level 0 = 1). The number of values is the max level.
 * heavy = belt damage (swing, spin, throw, props), long = reach (swing, spin and throw distance), quick = swing pause (lower is faster),
 * tornado = spin and throw recharge (lower is faster), knock = how far a hit throws a cat.
 */
export const BELT_UPGRADE_VALUES: Record<BeltUpgradeId, readonly number[]> = {
  heavy: [1.2, 1.4, 1.6],
  long: [1.12, 1.24, 1.36],
  quick: [0.82, 0.68, 0.56],
  tornado: [0.8, 0.65, 0.52],
  knock: [1.3, 1.6, 1.9],
};

/** When a pick is offered and how it feels. */
export const BELT_UPGRADE_OFFER = {
  /**
   * The wave numbers after which the pick screen shows. The campaign ends when wave 15 (Federer) is beaten and never reaches a
   * "between waves" after it, so the fifth pick comes after wave 14: the last chance before the final boss.
   */
  afterWaves: [3, 6, 9, 12, 14] as readonly number[],
  /** Endless mode (waves past the campaign): a pick after every this-many waves. */
  endlessEvery: 4, // v233: was 3 (endless maxed every upgrade too fast)
  /** How many cards are offered (fewer when most upgrades are at their top level). */
  choices: 3,
  /** The screen opens this long after the wave is cleared, so the fanfare and the heal are seen first (game time passes meanwhile). */
  delayMs: 1500,
  /** After the pick the next wave waits at least this long (game time), so Varu can look at what he got. */
  breatherMs: 1800,
} as const;

/** Look of the pick screen (sizes in game pixels, 1280x720). Same poster style as the pause menu (config/pause.ts). */
export const BELT_UPGRADE_LOOK = {
  depth: 200,
  dimColor: 0x14182b,
  dimAlpha: 0.7,
  rayAlpha: 0.07,
  /** Clicks, taps and keys are ignored this long after it opens (a held attack button must not pick by accident). */
  graceMs: 650,
  title: { y: 86, size: 84, stroke: 13, angleDeg: -2, introMs: 380 },
  subtitle: { y: 158, size: 26 },
  card: {
    w: 296,
    h: 396,
    gap: 28,
    top: 205,
    radius: 24,
    fill: 0x14182b,
    alpha: 0.97,
    borderColor: COLORS.gold,
    borderWidth: 5,
    innerInset: 10,
    innerAlpha: 0.18,
    shadowDy: 10,
    shadowAlpha: 0.4,
    /** The chosen card is a solid gold card with navy text, like the selected pause row. */
    selectedFill: COLORS.gold,
    selectedLift: 14,
    selectedScale: 1.04,
    introMs: 320,
    introStaggerMs: 110,
  },
  name: { y: 158, size: 34, wrapPad: 26 },
  text: { y: 190, size: 22, lineSpacing: 2, wrapPad: 34 },
  /**
   * Top to bottom, all offsets from the card top (the card is 396 tall): the picture (`UPGRADE_ART.stage`: 14 to 126), the name (one line, middle 158),
   * the description (from 190, up to 3 lines), the "0% -> +12%" line, the pips, the level text, then the key. v245: the description moved up 16 px
   * (it was 206) so three lines end above the "0% -> +12%" line.
   */
  change: { y: 308, size: 30 },
  pips: { y: 336, w: 40, h: 12, gap: 10, radius: 5, offColor: 0x4a5275 },
  levelText: { y: 366 },
  key: { fromBottom: 20, size: 20 },
  hint: { y: 664, size: 22 },
  colors: { normal: '#fff3d6', selected: '#1b2340', dim: '#c9cfe6', up: '#9be28f', upSelected: '#1d6b2f' },
  /**
   * v246: what Varu already owns, as a row of small chips along the bottom of the screen under the hint: the upgrade's name and its level
   * pips (gold = level reached, dark = still to come), one chip per upgrade he has, then a pink chip per synergy. Nothing owned = no row.
   * Sizes are game pixels; the row shrinks (never grows) until it fits `maxWidthShare` of the screen width.
   */
  owned: {
    y: 698,
    h: 26,
    radius: 13,
    padX: 11,
    nameGap: 8,
    gap: 10,
    size: 15,
    strokeThickness: 3,
    fill: 0x14182b,
    fillAlpha: 0.9,
    border: 3,
    maxWidthShare: 0.94,
    pip: { w: 12, h: 8, gap: 4, radius: 3, offColor: 0x4a5275, onColor: COLORS.gold },
    /** The row fades in after the cards, and the chip that just changed pops (scale, ms up; it comes back down by itself). */
    introMs: 260,
    introDelayMs: 420,
    pop: { scale: 1.22, ms: 150 },
    /** The accent (border) of each upgrade's chip. */
    accents: { heavy: 0xff7a59, long: 0x6ee7ff, quick: 0xf5c518, tornado: 0xc9a7ff, knock: 0x9be28f },
  },
} as const;
