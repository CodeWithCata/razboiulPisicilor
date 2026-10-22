/** @file Numbers for the first-run tutorial card (ui/Tutorial.ts): when it starts, how long each step waits, where the card sits. Words are in content/lines.ts (TUTORIAL_TEXT). No Phaser. */
import { COLORS } from './style';

/**
 * The little tutorial before the very first wave (the cats wait, `WaveSystem.tutorialHold`): a card at the bottom of the screen walks Varu through move, hit, spin and throw, one step at a time,
 * and each step is done when he really does it. It never stops the game. It shows once per device (saved when it is finished or skipped), only in the
 * campaign, and `?tutorial=1` in the address shows it again (for testing).
 */
export const TUTORIAL = {
  enabled: true,
  /** The first wave is held back while the card teaches. The card slides in this long after the opening scene ends (or after the run starts when there is none) (ms). */
  startDelayMs: 900,
  /** Safety: if the card never says it is over, the first wave starts after this long anyway (ms). */
  safetyMs: 90000,
  /** Keyboard: the move step is done after a movement key was held this long (ms). Touch: after a finger was down on the left half this long. */
  moveHoldMs: 900,
  /** After a step is done: how long the green "Bravo" stays before the next step slides in (ms). */
  doneHoldMs: 900,
  /** A step the player never does moves on by itself after this long (ms), so the card can never get stuck. */
  maxStepMs: 14000,
  /** The last card (a quick tip, no action to wait for) stays this long (ms). */
  tipMs: 5200,
  slideMs: 260,
  /** Layout (game px). The card hugs the bottom edge: `bottom` px above it on a keyboard (over the controls reminder), `bottomTouch` on a phone (between the thumbs). */
  card: { width: 600, widthTouch: 520, height: 92, bottom: 112, bottomTouch: 36, radius: 18, outline: 4, depth: 80, alpha: 0.96 },
  text: { titleSize: 26, titleSizeTouch: 24, hintSize: 16, stepSize: 16, doneSize: 30 },
  colors: { done: '#5fd35f', hint: '#8d7a52', step: '#8d7a52', title: '#1b2340', fill: COLORS.cream, lip: 0xd9bd84 },
} as const;
