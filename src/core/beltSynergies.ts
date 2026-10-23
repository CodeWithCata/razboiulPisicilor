/** @file The belt synergies of the current run: which ones are owned, which can be offered, and the multipliers they give. */
import { BELT_SYNERGIES, BELT_SYNERGY_IDS, BELT_SYNERGY_OFFER, type BeltSynergyId, type SynergyEffectId } from '../config/beltSynergies';
import { beltUpgradeLevel } from './beltUpgrades';

const owned = new Set<BeltSynergyId>();
/** Picks where a synergy was possible but did not show (drives the guarantee). */
let misses = 0;

/** A new run starts with no synergies (GameScene calls this next to `resetBeltUpgrades`). */
export function resetBeltSynergies(): void {
  owned.clear();
  misses = 0;
}

export const hasBeltSynergy = (id: BeltSynergyId): boolean => owned.has(id);

export const ownedBeltSynergies = (): readonly BeltSynergyId[] => [...owned];

/** Is `value` one of the synergy ids? (Event payloads and saved data carry plain strings.) */
export const isBeltSynergyId = (value: string): value is BeltSynergyId => (BELT_SYNERGY_IDS as readonly string[]).includes(value);

/** Both upgrades of this synergy are owned and the synergy is not yet. */
export function synergyEligible(id: BeltSynergyId): boolean {
  if (owned.has(id)) return false;
  const [a, b] = BELT_SYNERGIES[id].needs;
  return beltUpgradeLevel(a) >= 1 && beltUpgradeLevel(b) >= 1;
}

export const eligibleSynergies = (): BeltSynergyId[] => BELT_SYNERGY_IDS.filter(synergyEligible);

/** Take the synergy (the rare card was picked). */
export function addBeltSynergy(id: BeltSynergyId): void {
  owned.add(id);
  misses = 0;
}

/**
 * The rare card for this pick, or null. Shows with `BELT_SYNERGY_OFFER.chance`, and always after
 * `guaranteeAfterMisses` picks where it could have shown and did not. Call it ONCE per pick (it keeps count).
 */
export function rollSynergy(random: () => number = Math.random): BeltSynergyId | null {
  const pool = eligibleSynergies();
  if (pool.length === 0) return null;
  if (misses < BELT_SYNERGY_OFFER.guaranteeAfterMisses && random() >= BELT_SYNERGY_OFFER.chance) {
    misses += 1;
    return null;
  }
  return pool[Math.floor(random() * pool.length)] ?? null;
}

/** The product of every owned synergy's multiplier for this number (1 when none touches it). */
export function synergyEffect(effect: SynergyEffectId): number {
  let value = 1;
  for (const id of owned) value *= BELT_SYNERGIES[id].effects[effect] ?? 1;
  return value;
}
