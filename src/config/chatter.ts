/** @file Cat chatter numbers: how often a cat says something, how long the words stay, how they look. No Phaser. */
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
  /** A cat must be this far inside the screen edge to speak (px), so its words are never cut off. */
  screenMargin: 90,
  /** A cat bumped by a flung cat (pinball) answers with this chance, at most once per `bumpCooldownMs`. */
  bumpChance: 0.5,
  bumpCooldownMs: 1800,
  look: { size: 24, color: '#fff3d6', stroke: '#1b2340', strokeThickness: 5, depth: 59, riseMs: 1200, risePx: 14, gapAboveHead: 6 },
} as const;
