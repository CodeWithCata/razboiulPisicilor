/** @file Fast 2D length `hyp(dx, dy)`: the cheap stand-in for `Math.hypot` in per-frame code. Pure math, no Phaser. */

/**
 * Length of the vector (dx, dy). `Math.hypot` is several times slower than this in V8 (it guards against overflow and
 * rounding, which a game with coordinates under a few thousand never needs), and the game calls it for every cat, every frame.
 */
export function hyp(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}
