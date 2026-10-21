/** @file Which drawing a boss shows (front, back or side) for the way it faces; a little hysteresis so it never flickers on a diagonal. Pure logic, no Phaser. */
import type { TexKey } from '../../assets/keys';
import { ANIM } from '../../config/animation';

/** The three drawings: `front` = we see its face, `back` = we see its back, `side` = in profile (the art faces RIGHT, a boss looking left is mirrored). */
export type BossLook = 'front' | 'back' | 'side';

/** One texture per look. `base` is the look the boss's loose layers (rigs) are drawn for: the rig is hidden in the other looks. */
export interface BossLooks {
  readonly base: BossLook;
  readonly front: TexKey;
  readonly back: TexKey;
  readonly side: TexKey;
}

/** The look for a heading in radians (0 = right, +PI/2 = down on screen, as in Phaser). `prev` is the look now. */
export function lookFor(heading: number, prev: BossLook): BossLook {
  const across = Math.abs(Math.cos(heading));
  const along = Math.abs(Math.sin(heading));
  const ratio = prev === 'side' ? ANIM.views.sideExit : ANIM.views.sideEnter;
  if (across > along * ratio) return 'side';
  return Math.sin(heading) < 0 ? 'back' : 'front';
}
