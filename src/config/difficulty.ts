/** @file Difficulty presets (Ușor / Normal / Greu / Coșmar): the multipliers every run reads. No Phaser. */

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface DifficultyStats {
  /** Menu name (Romanian, like the rest of the game). */
  name: string;
  /** Short line under the name on the menu card. */
  blurb: string;
  /** CSS color of the name on the menu button. */
  color: string;
  /** Every hit on Varu (cat touch, shots, bombs, bosses) is multiplied by this. */
  damageTaken: number;
  /** Health of every normal cat / of the three bosses. */
  catHp: number;
  bossHp: number;
  /**
   * v222, bosses only: the pause after every boss attack (the recover time and the cooldown before the next one) is multiplied by this.
   * Below 1 = she attacks again sooner. The warnings stay as they are, so every attack is just as dodgeable (a fast boss, not an unfair one).
   */
  bossPace: number;
  /** v222, bosses only: walking pace (circling, chasing, backing off). Charges, dashes and other attack moves keep their own numbers. */
  bossSpeed: number;
  /** Walking speed of normal cats (bosses keep their own pace so their attacks stay readable). */
  catSpeed: number;
  /** Varu's dodge roll recharge (ms). */
  dodgeCooldownMs: number;
  /** Points per kill are multiplied by this, so a harder run is worth more. */
  score: number;

  // ---- the crowd (WaveSystem) ----
  /** How many cats each wave has (bosses are never multiplied; at least one of every kind the wave has stays). */
  count: number;
  /** Time between two spawns inside a wave: below 1 = cats pour in faster. */
  spawnGap: number;
  /** How many cats may be alive at once (`WAVE_TIMING.maxAlive`). */
  crowdCap: number;
  /** The breather between waves: below 1 = less time to catch your breath. */
  breather: number;
  /** Endless mode only: how fast the waves keep growing (`ENDLESS.growthPerWave`). */
  endless: number;

  // ---- help (health and pickups) ----
  /** Health restored when a wave is cleared and by a crochete. */
  heal: number;
  /** How often pickups show up: the spawn timers, the golden belt timer and the chance a dead cat drops one (above 1 = more). */
  pickups: number;
  /** After a hit Varu cannot be hit for `PLAYER.invincibleMs` times this. */
  invincible: number;

  // ---- bad luck ----
  /** Chance of a bad prize from a ? (multiplied with `MYSTERY.badChance`, 0.9 at most). */
  mysteryBad: number;
  /** How long the combo bar lasts (above 1 = more time to make the next kill). */
  comboWindow: number;
  /** Every random curse roll (cat hits, costly rewards, cursed barrels) is multiplied by this before the usual wave ramp and gates. */
  curses: number;
}

/**
 * Normal = the numbers the game was balanced on (all 1, same dodge cooldown as `DODGE.cooldownMs`), so nothing changes for anyone who
 * leaves it on Normal. The other three only scale around it. Boss numbers in `BOSS` / `QUEEN` / `MAFIA` / `FEDERER` stay untouched
 * (`npm run balance` still describes Normal); the difficulty scales them from outside: health (`bossHp`), how soon the next attack comes (`bossPace`),
 * walking pace (`bossSpeed`), and every hit they land (`damageTaken`).
 */
export const DIFFICULTIES: Record<DifficultyId, DifficultyStats> = {
  easy: { name: 'Ușor', blurb: 'Mai puține pisici, mai multă viață', color: '#7ee081', damageTaken: 0.6, catHp: 0.75, bossHp: 0.75, bossPace: 1.25, bossSpeed: 0.9, catSpeed: 0.92, dodgeCooldownMs: 1700, score: 0.75, count: 0.75, spawnGap: 1.25, crowdCap: 0.8, breather: 1.4, endless: 0.75, heal: 1.5, pickups: 1.4, invincible: 1.3, mysteryBad: 0.6, curses: 0.6, comboWindow: 1.3 },
  normal: { name: 'Normal', blurb: 'Cum a fost gândit jocul', color: '#fff3d6', damageTaken: 1, catHp: 1, bossHp: 1, bossPace: 1, bossSpeed: 1, catSpeed: 1, dodgeCooldownMs: 2300, score: 1, count: 1, spawnGap: 1, crowdCap: 1, breather: 1, endless: 1, heal: 1, pickups: 1, invincible: 1, mysteryBad: 1, curses: 1, comboWindow: 1 },
  hard: { name: 'Greu', blurb: 'Mai multe pisici, mai tari și mai iuți', color: '#ffb347', damageTaken: 1.3, catHp: 1.3, bossHp: 1.25, bossPace: 0.85, bossSpeed: 1.08, catSpeed: 1.1, dodgeCooldownMs: 2700, score: 1.35, count: 1.25, spawnGap: 0.85, crowdCap: 1.1, breather: 0.8, endless: 1.25, heal: 0.75, pickups: 0.85, invincible: 0.85, mysteryBad: 1.25, curses: 1.3, comboWindow: 0.85 },
  nightmare: { name: 'Coșmar', blurb: 'Potop de pisici, puțin ajutor', color: '#ff6b6b', damageTaken: 1.7, catHp: 1.6, bossHp: 1.5, bossPace: 0.7, bossSpeed: 1.15, catSpeed: 1.2, dodgeCooldownMs: 3100, score: 2, count: 1.5, spawnGap: 0.7, crowdCap: 1.2, breather: 0.6, endless: 1.5, heal: 0.5, pickups: 0.7, invincible: 0.7, mysteryBad: 1.5, curses: 1.6, comboWindow: 0.7 },
};

export const DIFFICULTY_ORDER: readonly DifficultyId[] = ['easy', 'normal', 'hard', 'nightmare'];
export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';
export const isDifficultyId = (value: unknown): value is DifficultyId => typeof value === 'string' && value in DIFFICULTIES;

/** The difficulty button on the main menu (under the almanac button). `touchW` / `touchH`: bigger on phones. */
export const DIFFICULTY_MENU = { x: 118, y: 110, w: 188, h: 50, touchW: 220, touchH: 62, size: 24 } as const;
