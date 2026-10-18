import { BELT, BELT_SPIN, type BeltAttackId } from '../../config/balance';
import { BELT_FX } from '../../config/style';
import { Events } from '../../core/events';

export type SweepId = Exclude<BeltAttackId, 'throw'>;

/**
 * A sweeping belt attack described as data. To add another one (say a "super spin"),
 * add numbers in config/balance.ts and one more object here. No new code needed.
 */
export interface SweepDef {
  readonly id: SweepId;
  readonly range: number;
  readonly arcDeg: number;
  readonly durationMs: number;
  readonly cooldownMs: number;
  readonly damage: number;
  readonly knockback: number;
  /** true: the arc is centered on the aim direction. false: it starts at the aim and turns clockwise. */
  readonly centered: boolean;
  /** Length of the white streak behind the belt tip (visual only). */
  readonly trailDeg: number;
  /** Wind-up / follow-through strength of the swing easing (visual only, see core/ease.ts). */
  readonly back: number;
  /** Varu turns around with the belt (the spin). */
  readonly spinsBody: boolean;
  /** Fling lots of milk from the strap while sweeping (the spin). */
  readonly milk: boolean;
  /** Also draw a faint full circle while sweeping (visual only). */
  readonly ring: boolean;
  /** Event emitted when the attack starts (so audio and jokes can react later). */
  readonly event: string;
}

export const SWING: SweepDef = {
  id: 'swing',
  range: BELT.range,
  arcDeg: BELT.arcDeg,
  durationMs: BELT.swingMs,
  cooldownMs: BELT.cooldownMs,
  damage: BELT.damage,
  knockback: BELT.knockback,
  centered: true,
  trailDeg: BELT_FX.swingTrailDeg,
  back: BELT_FX.swingBack,
  spinsBody: false,
  milk: false,
  ring: false,
  event: Events.BeltSwing,
};

export const SPIN: SweepDef = {
  id: 'spin',
  range: BELT_SPIN.range,
  arcDeg: BELT_SPIN.arcDeg,
  durationMs: BELT_SPIN.spinMs,
  cooldownMs: BELT_SPIN.cooldownMs,
  damage: BELT_SPIN.damage,
  knockback: BELT_SPIN.knockback,
  centered: false,
  trailDeg: BELT_FX.spinTrailDeg,
  back: BELT_FX.spinBack,
  spinsBody: true,
  milk: true,
  ring: true,
  event: Events.BeltSpin,
};
