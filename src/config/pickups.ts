/** @file How each pickup looks (texture, optional alternate looks, glow color, size), `pickLook`, and the list of pickup kinds. */
import { Tex, type TexKey } from '../assets/keys';
import type { PickupKind } from './balance';

/** How each pickup looks. `color` is its glow ring and HUD color; `size` overrides PICKUPS.size. */
export const PICKUP_VISUALS: Record<PickupKind, { tex: TexKey; color: number; size?: number; looks?: readonly TexKey[] }> = {
  crochete: { tex: Tex.PickupCrochete, looks: [Tex.PickupCrochete, Tex.PickupCigarettes, Tex.PickupVape], color: 0xff5a6e, size: 60 }, // a detailed pack, drawn a bit bigger. Looks like the pack, loose cigarettes or a vape (a third each, visual only)
  lapte: { tex: Tex.PickupLapte, looks: [Tex.PickupLapte, Tex.PickupMilkBottle], color: 0x9fd3ff, size: 60 }, // the milk plate or a bottle of milk (50 / 50, visual only); a bit bigger so the bottle reads
  monster: { tex: Tex.PickupMonster, looks: [Tex.PickupMonster, Tex.PickupRedBull], color: 0xb4ff1a, size: 60 }, // a detailed can, drawn a bit bigger. Looks like a Monster or like a Red Bull (50 / 50, visual only)
  goldenBelt: { tex: Tex.PickupGoldenBelt, color: 0xf5c518 },
  laser: { tex: Tex.PickupLaser, color: 0xff4d4d },
  umbrella: { tex: Tex.PickupUmbrella, color: 0x4aa8ff, size: 60 }, // blue glow: rain of balls, shots and petards bounce off it
  scooter: { tex: Tex.PickupScooter, color: 0x22b8a6, size: 60 }, // teal glow: Varu rides a scooter and bumps cats away
  iceCream: { tex: Tex.PickupIceCream, color: 0x9fe4ff, size: 60 }, // ice-blue glow: freezes the cats around him for 3 s
  crow: { tex: Tex.PickupCrow, color: 0xa88bff, size: 66 }, // the logo is detailed, so it is drawn a bit bigger
  mystery: { tex: Tex.PickupMystery, looks: [Tex.PickupMystery, Tex.PickupRoulette], color: 0xc4c8d0, size: 58 }, // the question mark: a random other pickup, good or bad. Looks like a ? or like a roulette wheel (50 / 50, visual only)
  snail: { tex: Tex.PickupSnail, color: 0xe5484d, size: 58 }, // BAD (slows Varu): red glow like the dumbbell, so the HUD badge reads as a curse
  dumbbell: { tex: Tex.PickupDumbbell, color: 0xe5484d, size: 58 }, // BAD (weakens the belt)
  emo: { tex: Tex.PickupEmo, color: 0xe5484d, size: 58 }, // BAD (slow swings and specials, hood up)
  rusty: { tex: Tex.PickupRusty, color: 0xe5484d, size: 58 }, // BAD (spin and throw cooldowns)
  big: { tex: Tex.PickupBig, color: 0xe5484d, size: 58 }, // BAD (Varu grows: easier to hit)
  smoke: { tex: Tex.PickupSmoke, color: 0xe5484d, size: 58 }, // BAD one-off (he freezes for a drag of his cigarette)
};

/**
 * Which picture one pickup shows. A pickup with `looks` picks one at random every time it appears (all equally likely), so the same
 * power-up can have different aspects: that is purely visual, it always does the same thing. Without `looks` it is just `tex`.
 */
export function pickLook(kind: PickupKind): TexKey {
  const visual = PICKUP_VISUALS[kind];
  const looks = visual.looks;
  if (!looks || looks.length === 0) return visual.tex;
  return looks[Math.floor(Math.random() * looks.length)] ?? visual.tex;
}

export const PICKUP_KINDS = Object.keys(PICKUP_VISUALS) as PickupKind[];

/** The show when a BAD pickup comes out of the question mark (`Events.BadPickup`, handled in `systems/Effects.ts`). */
export const BAD_PICKUP_FX = {
  sparks: 18,
  shake: { ms: 260, intensity: 0.008 },
  word: { size: 44, offsetY: -78, color: '#ff6b6b' },
  /** The sad sound: the `bonk` sound at this pitch. */
  pitch: 0.5,
} as const;
