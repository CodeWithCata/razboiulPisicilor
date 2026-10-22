/** @file Rainbow event numbers: when it comes, how it looks, how many bonus pickups drop under it. No Phaser. */
import type { PickupKind } from './balance';
import { DAY_NIGHT } from './dayNight';

/**
 * After a RAINY wave the next wave starts clear with a rainbow over the arena (`Weather` forces it, `systems/Rainbow.ts` shows it).
 * Under it `drops` bonus pickups fall near Varu. It is an event, not a pickup. It only shows for a few seconds (fade in, hold, fade out), then it is hidden.
 */
export const RAINBOW = {
  enabled: true,
  /** Chance (0..1) that a wave after rain gets the rainbow (and is forced clear). 1 = always. */
  chance: 1,
  /** Bonus pickups: this many (random in the range). Good ones only: never the question mark, never the same kind twice. */
  drops: { min: 2, max: 3 },
  excludeKinds: ['mystery'] as readonly PickupKind[],
  /** Where they land: inside the view (share of its width / height from the top left), at least `minFromVaruPx` from Varu. */
  area: { x: [0.2, 0.8], y: [0.35, 0.7] } as const,
  minFromVaruPx: 120,
  /** First drop this long after the rainbow starts to appear, then one every `dropGapMs`. */
  firstDropMs: 1100,
  dropGapMs: 450,
  /** A short show, then it is gone (the pickups keep dropping): pops in over `fadeInMs`, stays `holdMs`, fades out over `fadeOutMs`. */
  fadeInMs: 800,
  holdMs: 2000,
  fadeOutMs: 1200,
  /** It starts this much smaller (0.9 = 90 percent) and grows to full size while it pops in. */
  popFrom: 0.9,
  /** The picture (drawn once): size and band colors, outer to inner. It is stretched to `widthShare` of the screen width. */
  art: {
    key: 'rainbow_arc',
    w: 1200,
    h: 560,
    bandW: 26,
    outline: 5,
    navy: '#1b2340',
    bands: ['#ff5a4f', '#ff9a3c', '#ffe066', '#7ddc6a', '#4fb3ff', '#8f6bff'],
    cloud: '#fff6e0',
  },
  widthShare: 0.92,
  /** Screen position of the arc's top edge (share of the screen height) and how see-through it is (the shimmer swings around `alpha`). */
  topShare: 0.04,
  alpha: 0.6,
  shimmer: { amount: 0.08, periodMs: 2600 },
  /** Above the night sheet, under the fog and the rain. */
  depth: DAY_NIGHT.depth + 0.2,
} as const;
