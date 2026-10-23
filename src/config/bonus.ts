/** @file Bonus points and milestones: perfect wave, quick clear, perfect dodge, flawless boss, kill milestones. No Phaser. */

/**
 * Extra points on top of kills (systems/BonusSystem.ts). Wave and boss bonuses are multiplied by the difficulty's score factor.
 * Texts are Romanian like the rest of the game and sit here next to their numbers.
 */
export const BONUS = {
  enabled: true,
  /** A wave cleared without a single hit on Varu: `perWave` x the wave number. */
  perfectWave: { perWave: 50, word: 'VAL PERFECT!', color: '#9be28f' },
  /** A normal wave (not a boss) cleared within `ms` of its start: `perWave` x the wave number. */
  quickWave: { ms: 45000, perWave: 25, word: 'RAPID!', color: '#6ec6ff' },
  /** A dodge roll that made a hit miss. Small and silent: the "Ratat!" word is already shown. */
  perfectDodge: { points: 15 },
  /** A boss beaten without being hit once since it appeared. */
  flawlessBoss: { points: 300, word: 'FĂRĂ O ZGÂRIETURĂ!', color: '#f5c518' },
  /** Kills in one run that earn a shout. */
  milestones: [25, 50, 100, 250, 500, 1000, 2000] as readonly number[],
  milestoneColor: '#fff3d6',
  /** The words float up over Varu: second line goes this many px higher than the first. */
  lineGap: 34,
} as const;

/** "{n} pisici învinse!" for a kill milestone. */
export const milestoneWord = (n: number): string => `${n} de pisici învinse!`;
