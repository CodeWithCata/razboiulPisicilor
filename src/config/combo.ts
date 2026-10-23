/** @file Combo numbers: how long a chain lasts, the score tiers and their words, the HUD look. No Phaser. */

export interface ComboTier {
  /** Kills in a row needed for this tier. */
  at: number;
  /** Every kill is worth this many times its normal points while the tier lasts. */
  mult: number;
  /** The word shown when the tier is reached (empty = none). Romanian, like the rest of the game. */
  word: string;
  /** CSS color of the HUD text for this tier. */
  color: string;
}

/**
 * The combo: kill cats one after the other and every kill is worth more. Each kill gives you `windowMs` to make the next one
 * (the bar under the counter drains); the chain breaks when the bar runs out or when a hit lands on Varu (a dodge roll that
 * saves him does NOT break it, and gives `dodgeSaveMs` back). The bar waits while no wave is running, so the chain survives the breather.
 * The difficulty changes the window (`comboWindow` in config/difficulty.ts).
 */
export const COMBO = {
  enabled: true,
  windowMs: 3500,
  /** A hit that would have landed but missed because of the dodge roll adds this much time to the bar (never above a full bar). */
  dodgeSaveMs: 1200,
  /** The chain shows on the HUD from this many kills (the first kills are quiet). */
  showFrom: 3,
  /** Sorted by `at`. The first one is the starting point (x1). */
  tiers: [
    { at: 0, mult: 1, word: '', color: '#fff3d6' },
    { at: 5, mult: 1.5, word: 'COMBO!', color: '#9be28f' },
    { at: 10, mult: 2, word: 'SUPER!', color: '#f5c518' },
    { at: 20, mult: 3, word: 'NEBUN!', color: '#ffb347' },
    { at: 35, mult: 4, word: 'DE NEOPRIT!', color: '#ff7a59' },
    { at: 50, mult: 5, word: 'LEGENDAR!', color: '#ff5ac8' },
  ] as readonly ComboTier[],
  /** Only a chain this long gets the "Combo pierdut!" word when it breaks. */
  breakWordFrom: 5,
  hud: {
    /** Right edge, and the top of the counter (under the mute badge). Phones: lower, under the pause button. */
    right: 24,
    y: 150,
    touchY: 200,
    multSize: 34,
    countSize: 20,
    barW: 170,
    barH: 8,
    popFromScale: 1.25,
    popMs: 120,
    /** The tier word banner (centre of the screen, a little above the middle). */
    bannerYOffset: -150,
    bannerSize: 46,
    /** The chain broke: how long the counter shakes red before it hides. */
    breakMs: 450,
    /**
     * A new tier: the counter pops bigger and shakes. The strength grows with the tier (multiplier 1.5 = weakest, 5 = strongest):
     * pop scale = popFromScale + extraScale * strength, shake = shakePx * (0.4 + 0.6 * strength) fading over shakeMs.
     */
    tierPop: { extraScale: 0.9, ms: 260, shakePx: 9, shakeMs: 420, shakeHz: 38 },
  },
} as const;

/** The tier a chain of `count` kills is in. */
export function comboTier(count: number): ComboTier {
  let tier = COMBO.tiers[0]!;
  for (const t of COMBO.tiers) if (count >= t.at) tier = t;
  return tier;
}
