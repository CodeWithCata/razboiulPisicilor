/** @file Cat chatter numbers: how often a cat says something, how long its speech bubble stays, where it sits. The bubble's own look is `config/bubble.ts`. No Phaser. */
export const CHATTER = {
  enabled: true,
  /** The first line comes this long after the run starts (game ms), then one every `gapMs` (random between min and max). */
  firstDelayMs: 5000,
  gapMs: { min: 4500, max: 9000 },
  /** At most this many lines on screen at once. */
  maxAtOnce: 2,
  /** How long a line stays and how long the pop-away at the end takes (game ms). */
  lifeMs: 2400,
  fadeMs: 450,
  /** When the cat a bubble follows dies (or leaves), the bubble pops away this fast instead of waiting for its time (game ms). */
  deathPopMs: 140,
  /** v183: a bubble only shows while the spot it points at (the speaker's head) is at least this far inside the screen edge (px). A speaker off screen gets no bubble, and a bubble hides while its speaker is off screen. */
  visiblePadPx: 12,
  /** A cat must be this far inside the screen edge to speak (px), so its bubble is never cut off. The top needs more room: the bubble sits above the head. */
  screenMargin: 90,
  screenMarginTop: 150,
  /** A cat bumped by a flung cat (pinball) answers with this chance, at most once per `bumpCooldownMs`. */
  bumpChance: 0.5,
  bumpCooldownMs: 1800,
  /** Bubble layer, and the gap between the top of the head and the tail tip (px). */
  look: { depth: 59, gapAboveHead: 4 },
  /** A cat that just jumped out of a hideout is found by looking for the nearest cat within this many px of the point above its head, so its bubble can follow it. */
  popFollowRangePx: 120,
  /** A boss shout (an attack name, "Fault!") is a bigger bubble that follows the boss. It replaces the previous shout, so they never pile up. */
  shout: { lifeMs: 1500, fadeMs: 350, followRangePx: 420 },
} as const;
