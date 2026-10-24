/** @file Easter egg numbers: the mustard barrel joke (every cat asks who "belit mauștarul" in a bubble, and a voice says it). No Phaser. */

/**
 * The FIRST mustard barrel that breaks in a run (not by a boss) makes every cat on screen ask the question (words: `content/easterEgg.ts`),
 * and the device's speech voice says it out loud. Once per run. Bubbles come from `systems/CatChatter.ts`, the voice from `systems/AudioSystem.ts`.
 */
export const MUSTARD_EGG = {
  enabled: true,
  /** The cats start asking this long after the barrel bursts (game ms), so the splash is seen first. */
  delayMs: 350,
  /** How long the bubbles stay (game ms). */
  lifeMs: 3400,
  /** At most this many bubbles (the cats nearest to the middle of the screen): every bubble is a drawing, a huge crowd must not stall the game. */
  maxBubbles: 24,
  /**
   * The spoken line. `lang` picks a Romanian voice when the device has one; `pitch` above 1 makes it a little squeaky, like a cat;
   * `volume` is multiplied by the sound balance (`AUDIO.masterVolume`) and the player's effects volume, and mute silences it.
   */
  voice: { lang: 'ro-RO', rate: 0.95, pitch: 1.35, volume: 1 },
} as const;
