/** @file How long a written line must stay on screen to be read in the middle of a fight (reading-time numbers). No Phaser. */

/**
 * Every message in the game (the graffiti toast, cat speech bubbles, long floating words, banners) used to stay a FIXED time, so a long
 * joke vanished before it could be read while a short one hung around. Now the time follows the text: `baseMs + chars * msPerChar`,
 * never shorter than that message's own minimum and never longer than `maxMs`. `msPerChar` is slow on purpose (about 15 characters
 * a second): the player is looking at the cats, not at the text.
 */
export const READING = {
  baseMs: 800,
  msPerChar: 65,
  maxMs: 8000,
  /** A floating word longer than this many characters is a line to read, not a hit sound: it stays long enough (short words keep their quick float). */
  floatFromChars: 14,
  floatMaxMs: 5000,
  /** The graffiti toast: when other messages are already waiting in line, this share of the reading time is kept (so the line never falls far behind the fight). */
  toastBackedUpShare: 0.6,
  /** Cat speech bubbles and boss shouts: the longest a bubble may stay. */
  bubbleMaxMs: 6000,
  /** Banners (big centered words): only text longer than this many characters is stretched, and never beyond `bannerMaxMs`. */
  bannerFromChars: 12,
  bannerMaxMs: 3500,
} as const;
