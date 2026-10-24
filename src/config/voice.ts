/** @file Voice-over numbers: where the recorded lines live, how loud they are, how many files may be preloaded. */

export const VOICE = {
  /** Folder of the recorded lines, inside `public/` (BASE_URL is added in front). */
  dir: 'assets/audio/voice/',
  /** Loudness of a recorded line before the player's effects volume (0..1). */
  volume: 1,
  /** With at most this many voice files, all are fetched and decoded at start, so a line never waits for the network. More files load on first use. */
  preloadMaxFiles: 30,
} as const;