/** @file The belt upgrades of the current run: levels, the multipliers they give, and which ones to offer. */
import { BELT_UPGRADE_IDS, BELT_UPGRADE_OFFER, BELT_UPGRADE_VALUES, type BeltUpgradeId } from '../config/beltUpgrades';
import type { RunMode } from './run';

const levels: Record<BeltUpgradeId, number> = { heavy: 0, long: 0, quick: 0, tornado: 0, knock: 0 };

/** A new run starts with no upgrades (GameScene calls this first thing in `create`). */
export function resetBeltUpgrades(): void {
  for (const id of BELT_UPGRADE_IDS) levels[id] = 0;
}

export const beltUpgradeLevel = (id: BeltUpgradeId): number => levels[id];

export const beltUpgradeMaxLevel = (id: BeltUpgradeId): number => BELT_UPGRADE_VALUES[id].length;

/** The multiplier an upgrade gives right now (1 while it is at level 0). */
export function beltUpgradeValue(id: BeltUpgradeId): number {
  const level = levels[id];
  return level <= 0 ? 1 : BELT_UPGRADE_VALUES[id][level - 1]!;
}

/** The multiplier an upgrade would give at `level` (for the card's "next level" line). */
export const beltUpgradeValueAt = (id: BeltUpgradeId, level: number): number => (level <= 0 ? 1 : BELT_UPGRADE_VALUES[id][Math.min(level, beltUpgradeMaxLevel(id)) - 1]!);

/** One level up (never past the top). Returns the new level. */
export function addBeltUpgrade(id: BeltUpgradeId): number {
  levels[id] = Math.min(beltUpgradeMaxLevel(id), levels[id] + 1);
  return levels[id];
}

/** The upgrades that can still go up, in random order, at most `count` of them. */
export function rollBeltChoices(count: number = BELT_UPGRADE_OFFER.choices): BeltUpgradeId[] {
  const open = BELT_UPGRADE_IDS.filter((id) => levels[id] < beltUpgradeMaxLevel(id));
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j]!, open[i]!];
  }
  return open.slice(0, count);
}

/** Is a pick due after this wave was cleared? Campaign: the listed waves. Endless: every `endlessEvery` waves past the campaign table. */
export function beltUpgradeDue(wave: number, mode: RunMode, finalCampaignWave: number): boolean {
  if (mode === 'campaign') return BELT_UPGRADE_OFFER.afterWaves.includes(wave);
  return wave > finalCampaignWave && (wave - finalCampaignWave) % BELT_UPGRADE_OFFER.endlessEvery === 0;
}

/** Is there anything to offer right now? (Pure: it does not roll the rare card, so it can be asked as often as needed.) */
export const anyUpgradeOpen = (): boolean => BELT_UPGRADE_IDS.some((id) => levels[id] < beltUpgradeMaxLevel(id));
