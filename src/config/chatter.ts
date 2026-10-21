/** @file Cat chatter numbers: how often a cat says something, how long its speech bubble stays, where it sits. The bubble's own look is `config/bubble.ts`. No Phaser. */
export const CHATTER = {
  enabled: true,
  /** The first line comes this long after the run starts (game ms), then one every `gapMs` (random between min and max). */
  firstDelayMs: 5000,
  gapMs: { min: 4500, max: 9000 },
  /** At most this many lines on screen at once. */
  maxAtOnce: 2,
  /** How long a line stays and how long it takes to fade at the end (game ms). */
  lifeMs: 2400,
  fadeMs: 450,
  /** A cat must be this far inside the screen edge to speak (px), so its bubble is never cut off. The top needs more room: the bubble sits above the head. */
  screenMargin: 90,
  screenMarginTop: 150,
  /** A cat bumped by a flung cat (pinball) answers with this chance, at most once per `bumpCooldownMs`. */
  bumpChance: 0.5,
  bumpCooldownMs: 1800,
  /** Bubble layer, and the gap between the top of the head and the tail tip (px). */
  look: { depth: 59, gapAboveHead: 4 },
  /** A boss shout (an attack name, "Fault!") is a bigger bubble that follows the boss. It replaces the previous shout, so they never pile up. */
  shout: { lifeMs: 1500, fadeMs: 350, followRangePx: 420 },
} as const;
