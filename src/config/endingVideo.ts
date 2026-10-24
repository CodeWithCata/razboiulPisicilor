/** @file The ending video: which file, when it plays, and how long the black overlay holds. No Phaser. */

/** Played in the campaign after the last boss falls, before the victory screen. Skippable. Not in the service worker precache (streamed, like the opening videos). */
export const ENDING_VIDEO = {
  /** false = go straight to the victory screen. */
  enabled: true,
  /** File in `public/videos/` (848x480 H.264 + AAC, about 32 s, 7 MB). */
  clip: 'videos/ending-1.mp4',
  /** Black wait before the clip starts, so the boss's last confetti is gone and the file can load. */
  startDelayMs: 900,
  /** A clip that has not started playing after this long is skipped, so the game never waits forever. */
  stallMs: 9000,
  /** The black overlay fades in over this long, and the clip fades in and out over `clipFadeMs`. */
  fadeMs: 500,
  clipFadeMs: 700,
  /** After the clip the overlay stays black this long (the victory screen starts under it), then fades away. Must be longer than the 1300 ms delay in `GameScene.finishVictory`. */
  releaseMs: 1700,
  /** Same layer as the opening videos. */
  zIndex: 8,
  background: '#000000',
  /** Thin progress strip along the bottom. */
  progress: { height: 5, margin: 10, back: 'rgba(255,255,255,0.25)', fill: '#f5c518' },
} as const;
