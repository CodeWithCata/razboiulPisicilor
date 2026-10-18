/**
 * Pure easing math (no Phaser import, testable with plain node).
 */
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/**
 * Ease-in-out with "back": the value first dips below 0 (wind-up), speeds through the middle,
 * then overshoots 1 a little (follow-through) before settling. Returns 0 at t=0 and 1 at t=1.
 * `back` is the strength: 0 = plain smooth ease, 1.70158 = classic (about 10% dip and overshoot).
 */
export function easeInOutBack(t: number, back = 1.70158): number {
  const x = clamp01(t);
  const c2 = back * 1.525;
  if (x < 0.5) return (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2;
  return (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (2 * x - 2) + c2) + 2) / 2;
}
