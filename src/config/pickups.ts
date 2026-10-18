import { Tex, type TexKey } from '../assets/keys';
import type { PickupKind } from './balance';

/** How each pickup looks. `color` is its glow ring and HUD color; `size` overrides PICKUPS.size. */
export const PICKUP_VISUALS: Record<PickupKind, { tex: TexKey; color: number; size?: number }> = {
  crochete: { tex: Tex.PickupCrochete, color: 0xff5a6e, size: 60 }, // a detailed pack, drawn a bit bigger
  lapte: { tex: Tex.PickupLapte, color: 0x9fd3ff },
  monster: { tex: Tex.PickupMonster, color: 0xb4ff1a, size: 60 }, // a detailed can, drawn a bit bigger,
  goldenBelt: { tex: Tex.PickupGoldenBelt, color: 0xf5c518 },
  laser: { tex: Tex.PickupLaser, color: 0xff4d4d },
  crow: { tex: Tex.PickupCrow, color: 0xa88bff, size: 66 }, // the logo is detailed, so it is drawn a bit bigger
};

export const PICKUP_KINDS = Object.keys(PICKUP_VISUALS) as PickupKind[];
