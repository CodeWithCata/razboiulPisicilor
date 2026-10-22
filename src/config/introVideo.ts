/** @file Opening videos (backstory + intro): which files, in what order, how often, and how the player looks. No Phaser. */

/** The videos played after the first "start" tap. Files live in `public/videos/` (compressed 720p H.264 + AAC, ~1.5-3 MB each). */
export const INTRO_VIDEO = {
  /** false = never play the videos. */
  enabled: true,
  /** 'save' = once per device (finished or skipped); 'always' = every run start. Add `?intro` to the page address to force it once. */
  repeat: 'always' as 'save' | 'always',
  /** In this order. `{ clip }` = a video file; `{ card, ms }` = a black title card showing the text `INTRO_TEXT[card]` (content/lines.ts) for `ms`. Swap lines to reorder. */
  sequence: [
    { clip: 'videos/story-2.mp4' },
    { clip: 'videos/story-1.mp4' },
    { card: 'nightCard', ms: 4800 },
    { clip: 'videos/intro-1.mp4' },
  ] as readonly ({ clip: string } | { card: string; ms: number })[],
  /** The URL parameter that forces the videos to play. */
  forceParam: 'intro',
  /** A clip that has not started playing after this long is skipped (bad connection / broken file), so the game never waits forever. */
  stallMs: 9000,
  /** Fade of the black overlay at the very start and when it finally lifts off the game. */
  fadeMs: 350,
  /** Each clip / card fades in and out over this long. */
  itemFadeMs: 600,
  /** Black wait after the start tap, while the first clip loads and renders, before it begins. */
  startDelayMs: 2200,
  /** Black pause between two clips / cards. */
  pauseMs: 1300,
  /** Title card look. */
  card: { color: '#ffffff', outline: '#1b2340', size: 'clamp(22px, 4.4vw, 58px)', maxWidth: '82%', lineHeight: 1.3 },
  /** Above the install button (5), under the "turn your phone" page (10). */
  zIndex: 8,
  background: '#000000',
  /** The "Sari peste" button, top right (CSS px), same look as the cutscene button. */
  skip: { margin: 14, padX: 20, padY: 9, size: 22, fill: '#f5c518', outline: '#1b2340', border: 4, shadow: 4, text: '#1b2340', idleAlpha: 0.92 },
  /** Thin progress strip along the bottom: one segment per clip. */
  progress: { height: 5, gap: 4, margin: 10, back: 'rgba(255,255,255,0.25)', fill: '#f5c518' },
} as const;
