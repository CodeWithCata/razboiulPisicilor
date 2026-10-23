/** @file Belt upgrade synergies: a rare 4th card when two matching upgrades are owned. What each gives and how often it shows. No Phaser. */
import type { BeltUpgradeId } from './beltUpgrades';

/** The numbers a synergy can change. 1 = nothing. Each is a multiplier read by the system that uses it. */
export type SynergyEffectId = 'spinRange' | 'spinDamage' | 'swingRange' | 'finisherDamage' | 'finisherKnock' | 'chainWindow' | 'weakWindow';

export const BELT_SYNERGY_IDS = ['cyclone', 'bombard', 'ironBeat', 'eagleEye', 'cowboy'] as const;
export type BeltSynergyId = (typeof BELT_SYNERGY_IDS)[number];

export interface SynergyDef {
  /** The two upgrades that must both be owned (level 1 or more). */
  readonly needs: readonly [BeltUpgradeId, BeltUpgradeId];
  readonly effects: Readonly<Partial<Record<SynergyEffectId, number>>>;
}

export const BELT_SYNERGIES: Record<BeltSynergyId, SynergyDef> = {
  /** Curea lungă + Tornadă: a bigger spin. */
  cyclone: { needs: ['long', 'tornado'], effects: { spinRange: 1.3, spinDamage: 1.25 } },
  /** Cataramă grea + Lovitură de bou: the finisher hits and flings much harder. */
  bombard: { needs: ['heavy', 'knock'], effects: { finisherDamage: 1.4, finisherKnock: 1.5 } },
  /** Mână iute + Cataramă grea: a roomier beat and a stronger finisher. */
  ironBeat: { needs: ['quick', 'heavy'], effects: { chainWindow: 1.6, finisherDamage: 1.2 } },
  /** Mână iute + Tornadă: boss weak-point windows stay open longer. */
  eagleEye: { needs: ['quick', 'tornado'], effects: { weakWindow: 1.5 } },
  /** Curea lungă + Lovitură de bou: the plain swing and the finisher reach farther. */
  cowboy: { needs: ['long', 'knock'], effects: { swingRange: 1.18, finisherKnock: 1.25 } },
};

/** How the rare card is offered. */
export const BELT_SYNERGY_OFFER = {
  /** Chance that an eligible synergy shows up in a pick. */
  chance: 0.5,
  /** After this many eligible picks without it showing, the next one always has it (never a long wait). */
  guaranteeAfterMisses: 1,
} as const;

/** Look of the synergy card (the rest of the card follows `BELT_UPGRADE_LOOK`). */
export const BELT_SYNERGY_LOOK = {
  borderColor: 0xff5ac8,
  selectedFill: 0xff9bdc,
  badgeSize: 26,
  /** The pink "SINERGIE" pill that straddles the top edge of the card. */
  tag: { y: 0, w: 150, h: 34, size: 22, radius: 17, fill: 0xff5ac8, ink: '#1b2340' },
  /** The two fused upgrades, as two lines in the spot where a plain card shows its level numbers (offset from the card top). */
  fuse: { y: 306, size: 22 },
  colors: { fuse: '#ff9bdc', fuseSelected: '#8a1260' },
  /** With a 4th card the cards shrink to fit: never wider than this share of the screen. */
  maxRowShare: 0.96,
} as const;
