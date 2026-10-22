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
   * stays slower than `slowMs` for `slowSamples` measurements in a row, the number of animated fans shrinks one `step`
   * (never below `minScale`); when it stays faster than `fastMs` for `fastSamples` in a row it grows back. A phone that keeps
   * 50+ fps never feels it (fans just rest where they stand when over the limit, the same look as the existing limit).
   */
  adapt: { slowMs: 24, fastMs: 19, slowSamples: 2, fastSamples: 8, step: 0.25, minScale: 0.25 },

  /** The little card: top left, under the health meter. */
  panel: { x: 12, y: 96, size: 18, padX: 8, padY: 6, lineSpacing: 2, radius: 8, backAlpha: 0.62, depth: 400, color: '#b6f5a8' },
  back: COLORS.navy,
} as const;
