/** @file The ice cream power-up: who it freezes, for how long, and how the ice block on a frozen cat looks. */

export const ICE_CREAM = {
  /** Every cat (not a boss) this close to Varu (px) is frozen solid. The screen is about 1280 x 720, so this covers most of what he sees. */
  radiusPx: 380,
  /** How long a cat stays frozen (game ms). A cat that is hit while frozen is still knocked back, and goes back to being frozen where it lands. */
  freezeMs: 3000,
  /** The ring that spreads from Varu. */
  blast: { ringMs: 420, color: 0x9fe4ff, alpha: 0.8, startPx: 20, sparks: 18 },
  /** The ice block drawn over a frozen cat. */
  block: {
    /** Its size as a share of the cat's size. */
    sizeShare: 1.3,
    alpha: 0.62,
    /** Above the cats and their loose parts (wings, rackets). */
    depth: 28,
    /** Pops in from this fraction of its size, in this many ms. */
    popFrom: 0.5,
    popMs: 160,
    /** The last stretch blinks: it is about to melt. */
    blinkMs: 700,
    blinkEveryMs: 110,
  },
  /** The flash on the cat when the ice breaks. */
  thawFlash: { color: 0xbfeaff, ms: 120 },
} as const;
