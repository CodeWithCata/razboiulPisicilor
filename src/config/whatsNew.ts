/** @file Look and timing of the "what's new" card shown once after an update. Sizes in game pixels (1280x720). No Phaser. */
import { COLORS } from './style';

export const WHATS_NEW_LOOK = {
  depth: 600,
  dimColor: 0x14182b,
  dimAlpha: 0.8,
  card: { w: 780, padX: 46, padTop: 30, padBottom: 28, radius: 26, fill: 0x14182b, alpha: 0.98, borderColor: COLORS.gold, borderWidth: 5, innerInset: 10, innerAlpha: 0.18, shadowDy: 10, shadowAlpha: 0.4 },
  title: { size: 54, stroke: 10, angleDeg: -2, color: '#f5c518' },
  tag: { size: 20, gap: 14, color: '#c9cfe6' },
  line: { size: 24, gap: 14, lineSpacing: 2, bulletR: 7, bulletGap: 20, color: '#fff3d6' },
  button: { w: 380, h: 62, size: 30, gapTop: 22 },
  hint: { size: 16, gap: 12, color: '#c9cfe6' },
  introMs: 320,
  lineStaggerMs: 90,
  fadeOutMs: 160,
  /** Taps and keys are ignored this long after the card opens (nobody reads a card in 0.5 s, and a stray tap must not drop it). */
  graceMs: 500,
  /** The menu ignores taps and keys this long after the card closed (the same tap must not also start the game; a held Enter repeats). */
  menuGraceMs: 450,
} as const;
