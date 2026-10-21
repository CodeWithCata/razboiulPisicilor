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

/**
 * Smooth keyframes: `times` (0..1, rising) and `values` have the same length; between two keys the value glides with a smoothstep.
 * Before the first key and after the last one it holds the first / last value.
 */
export function sampleKeys(u: number, times: readonly number[], values: readonly number[]): number {
  const last = times.length - 1;
  if (last < 0) return 0;
  if (u <= times[0]!) return values[0]!;
  if (u >= times[last]!) return values[last]!;
  let i = 0;
  while (i < last - 1 && u > times[i + 1]!) i++;
  const span = times[i + 1]! - times[i]!;
  const k = span > 0 ? (u - times[i]!) / span : 1;
  const eased = k * k * (3 - 2 * k);
  return values[i]! + (values[i + 1]! - values[i]!) * eased;
}

/** Names of the easings the cutscenes (and other scripts written as data) can ask for. */
export type EaseName = 'linear' | 'smooth' | 'in' | 'out' | 'back';

/** One easing by name: 0..1 in, 0..1 out ('back' overshoots 1 a little before it settles). */
export function applyEase(name: EaseName, t: number): number {
  const x = clamp01(t);
  switch (name) {
    case 'in':
      return x * x;
    case 'out':
      return 1 - (1 - x) * (1 - x);
    case 'smooth':
      return x * x * (3 - 2 * x);
    case 'back': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    default:
      return x;
  }
}
