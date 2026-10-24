/** @file The squash of a cat that survives a hit: how far it is pressed along the direction of the blow, and the lean. Pure math, no Phaser (testable with plain node). */
import { HIT_SQUASH } from '../config/hitFeel';

/** What `hitSquash` writes: the scale to multiply the sprite's own x / y scale with, and the extra turn in radians. Reused, so a frame allocates nothing. */
export interface SquashOut {
  x: number;
  y: number;
  lean: number;
}

/**
 * How deep the squash is `elapsedMs` after the hit: 0 before and after it, 1 at the deepest point, a little below 0 once while it springs
 * back past rest (the cat stretches for a moment), then it settles. Quick press (an ease-out), then a damped swing.
 */
export function squashEnvelope(elapsedMs: number): number {
  const H = HIT_SQUASH;
  if (elapsedMs <= 0 || elapsedMs >= H.ms) return 0;
  const attackMs = H.ms * H.attackShare;
  if (elapsedMs < attackMs) {
    const u = elapsedMs / attackMs;
    return 1 - (1 - u) * (1 - u); // ease-out: most of the press happens in the first frames
  }
  const u = (elapsedMs - attackMs) / (H.ms - attackMs);
  const fade = 1 - u * u * (3 - 2 * u); // smoothstep to 0 so it ends exactly at rest, with no snap
  return Math.exp(-H.settle.damping * u) * Math.cos(2 * Math.PI * H.settle.cycles * u) * fade;
}

/** The power of a blow from its knockback (before the cat's resistance): a plain swing is 1, a finisher more, clamped. */
export const squashPower = (knockback: number): number => Math.min(HIT_SQUASH.maxPower, Math.max(HIT_SQUASH.minPower, knockback / HIT_SQUASH.refKnockback));

/**
 * The scale and lean of a cat `elapsedMs` after a blow that travelled along (`dirX`, `dirY`) (a unit vector, attacker toward the cat).
 * `heading` = the way the cat faces in the world (radians; the sprite's local up). `weight` = 1 for a plain cat, lower for a heavy one.
 * Local x = across the body, local y = along its facing, so a blow from the side flattens it sideways and a blow from the front or back
 * shortens it. A diagonal blow gets a milder flatten on both axes plus the lean, so no angle ever reads as "nothing happened".
 * Returns false (and writes nothing) when there is nothing to draw.
 */
export function hitSquash(out: SquashOut, elapsedMs: number, dirX: number, dirY: number, heading: number, power: number, weight: number): boolean {
  const H = HIT_SQUASH;
  const env = squashEnvelope(elapsedMs);
  if (env === 0) return false;
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  const across = -dirX * sin + dirY * cos; // the blow's share along the body's right side
  const along = dirX * cos + dirY * sin; // ... and along the way it faces
  const a = H.press * env * power * weight;
  const across2 = across * across;
  const along2 = along * along;
  out.x = 1 - a * across2 + a * H.bulge * along2;
  out.y = 1 - a * along2 + a * H.bulge * across2;
  out.lean = (H.leanDeg * Math.PI) / 180 * env * power * weight * across;
  return true;
}
