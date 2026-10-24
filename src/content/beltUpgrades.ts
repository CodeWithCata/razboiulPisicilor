/** @file Words of the belt upgrade screen (Romanian). */
import type { BeltUpgradeId } from '../config/beltUpgrades';
import { BELT_SYNERGIES, type BeltSynergyId } from '../config/beltSynergies';

export const BELT_UPGRADE_TEXT: Record<BeltUpgradeId, { name: string; text: string }> = {
  heavy: { name: 'Cataramă grea', text: 'Fiecare lovitură doare mai tare: curea, învârtire și aruncare.' },
  long: { name: 'Curea lungă', text: 'Cureaua ajunge mai departe: lovitură, învârtire și aruncare.' },
  quick: { name: 'Mână iute', text: 'Pauza dintre lovituri e mai scurtă. Mai multe curele pe secundă.' },
  tornado: { name: 'Tornadă', text: 'Învârtirea și aruncarea se reîncarcă mai repede.' },
  knock: { name: 'Lovitură de bou', text: 'Pisicile zboară mai departe când le nimerești.' },
};

export const BELT_UPGRADE_UI = {
  title: 'ALEGE UN UPGRADE',
  subtitle: (wave: number): string => `Valul ${wave} a trecut. Cureaua ta, regulile tale.`,
  hint: (count: number): string => `← →  alege   ·   Enter  confirmă   ·   sau tasta ${Array.from({ length: count }, (_, i) => i + 1).join(' ')}`,
  hintTouch: 'Atinge o carte ca s-o alegi',
  level: (from: number, to: number): string => (from === 0 ? `Nivel nou: ${to}` : `Nivel ${from} → ${to}`),
  picked: (name: string, level: number): string => `${name}! Nivel ${level}`,
  max: 'MAXIM',
} as const;

/** The rare 4th card: two matching upgrades fused into one bonus. */
export const BELT_SYNERGY_TEXT: Record<BeltSynergyId, { name: string; text: string }> = {
  cyclone: { name: 'Ciclon', text: 'Învârtire mai mare și mai tare.' },
  bombard: { name: 'Bombardă', text: 'Finalul doare și aruncă mult mai tare.' },
  ironBeat: { name: 'Ritm de fier', text: 'Ritm mai larg, iar finalul lovește mai tare.' },
  eagleEye: { name: 'Ochi de vultur', text: 'Punct slab de șef deschis mai mult timp.' },
  cowboy: { name: 'Cowboy', text: 'Lovitura și finalul ajung mai departe.' },
};

export const BELT_SYNERGY_UI = {
  tag: 'SINERGIE',
  picked: (name: string): string => `Sinergie: ${name}!`,
} as const;

/** The names of the two upgrades a synergy needs (read from the upgrade texts, so they can never drift apart). */
export const synergyNeedNames = (id: BeltSynergyId): readonly [string, string] => {
  const [a, b] = BELT_SYNERGIES[id].needs;
  return [BELT_UPGRADE_TEXT[a].name, BELT_UPGRADE_TEXT[b].name];
};
