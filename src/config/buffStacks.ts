/** @file Stacking buffs: which timed buffs can be grabbed again to stack (Monster x1..x4) and the belt damage of each stack. No Phaser. */
import type { BuffKind } from './balance';

export interface BuffStack {
  /** Most stacks at once. A pickup at the max only refreshes the timer. */
  max: number;
  /** Belt damage multiplier per stack: index 0 = x1, index 1 = x2... Same length as `max`. Replaces `BUFFS[kind].damage` while the buff runs. */
  damage: readonly number[];
}

/**
 * Grabbing the same buff again while it still runs adds one stack (and refreshes the timer to the full length).
 * When the time runs out ALL stacks end at once (one `BuffEnded`). The "best value wins" rule of `PowerUpSystem` still holds
 * between DIFFERENT buffs: x4 Monster (3.5) beats the golden belt (2.5), they do not multiply.
 * Numbers are first guesses (never played): tune after a few runs.
 */
export const BUFF_STACKS: Partial<Record<BuffKind, BuffStack>> = {
  monster: { max: 4, damage: [2, 2.2, 2.4, 2.6] }, // (v242: was [2, 2.5, 3, 3.5]: x3 and x4 beat the golden belt by 20-40% and x3 one-shot base cats; now x2 = golden belt, x4 only +18%)
};

/** The floating word and the HUD badge label. */
export const STACK_FX = {
  /** Sparks on every stack after the first, and one extra at the max. */
  sparks: { stack: 10, max: 24 },
  word: { size: 34, maxSize: 46, offsetY: -70, color: '#b4ff1a', maxColor: '#ffe14a' },
} as const;

/** Safe lookup: the stack numbers of a buff, or null when it does not stack. */
export function stackRule(kind: BuffKind): BuffStack | null {
  return BUFF_STACKS[kind] ?? null;
}
