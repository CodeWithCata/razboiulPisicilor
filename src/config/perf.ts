/** @file Numbers for the on-phone fps panel (ui/PerfPanel.ts, systems/PerfMonitor.ts). */
import { COLORS } from './style';

/** The fps / debug numbers shown on phones when the pause-menu switch "Date debug" is on (ui/PerfPanel.ts, systems/PerfMonitor.ts). */
export const PERF = {
  /** How often the numbers refresh (and the measuring window restarts). */
  everyMs: 500,
  /** A frame longer than this counts as slow (25 ms = under 40 fps). */
  slowFrameMs: 25,
  /** Frames longer than this (a pause, a tab switch) are not measured at all. */
  ignoreFrameMs: 500,
  /** While Varu walks, a frame where he moved less than this counts as \"stalled\" (the picture did not advance, which looks like lag). */
  stallStepPx: 0.05,

  /**
   * Automatic relief for slow phones (the crowd is the biggest per-frame cost that is only decoration): when the average frame
   * stays slower than `slowMs` (15 ms = under ~66 fps) for `slowSamples` measurements in a row, the number of animated fans
   * shrinks one `step` (never below `minScale`); when it stays faster than `fastMs` (12.5 ms = over 80 fps) for `fastSamples`
   * in a row it grows back. Fans just rest where they stand when over the limit (the same look as the existing limit).
   * Caveat: a phone locked at 60 Hz averages about 16.7 ms, so it counts as slow and sheds fans too. If that is too eager,
   * raise `slowMs` to about 18.
   */
  adapt: { slowMs: 15, fastMs: 12.5, slowSamples: 1, fastSamples: 6, step: 0.25, minScale: 0.25 },

  /**
   * The WebGL context settings passed to Phaser (main.ts). `antialiasGL` is the MSAA of the context (smooths the edges of
   * every shape): it costs fill rate on phones. `true` = the Phaser default, so the look does not change. Set it to `false`
   * to test the speed; `ui/PerfPanel.ts` shows the value the context really got (`aa on` / `aa off`).
   * `powerPreference`: asks laptops with two GPUs for the fast one. It is only a hint; phones ignore it. If `npm run check`
   * says Phaser's typings do not know this name, delete it here and in main.ts.
   */
  render: { antialiasGL: true, powerPreference: 'high-performance' as const },

  /** The little card: top left, under the health meter. */
  panel: { x: 12, y: 96, size: 18, padX: 8, padY: 6, lineSpacing: 2, radius: 8, backAlpha: 0.62, depth: 400, color: '#b6f5a8' },
  back: COLORS.navy,

  /**
   * Big pictures (the fog's edge image, the laser zone) are drawn at this alpha for a few frames when a run starts, so the GPU has their
   * texture before a wave needs it. A picture is only uploaded the first time it is drawn: if it stays hidden until the fog or the laser
   * comes, that first frame stalls. At this alpha it is invisible.
   */
  warm: { frames: 2, alpha: 0.001 },
} as const;
