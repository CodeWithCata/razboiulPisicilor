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

/**
 * The difficulty button on the main menu (under the almanac button): a cat's FACE whose look follows the level, with the level name under it.
 * `y` is the middle of face + name together (`touchY` on phones, where everything is bigger). `faceW` = width of the face's 96x96 art canvas.
 * `captionW` = width of the blurb under it.
 */
export const DIFFICULTY_MENU = { x: 118, y: 214, touchY: 231, faceW: 116, touchFaceW: 132, size: 26, touchSize: 30, captionW: 190 } as const;

/** What one level's cat looks like: fur, the darker stripes, the inside of the ears, the muzzle, the nose, the blush, and the soft glow behind it. */
export interface CatFaceLook {
  fur: number;
  dark: number;
  inner: number;
  muzzle: number;
  nose: number;
  /** Pink cheeks (only the gentle levels have them). */
  blush: number | null;
  aura: number;
}

/**
 * The cat-face button of that menu (`ui/DifficultyCat.ts`, the face is drawn by `assets/art/difficultyCat.ts` with the same flat-and-navy-outline
 * toolkit as the game's cats). Ușor = a cream kitten with a happy open smile; Normal = the game's orange tabby; Greu = a burnt-orange tabby with
 * angry eyes and fangs; Coșmar = a purple-black cat with horns, glowing slit eyes and a jagged grin.
 */
export const DIFFICULTY_CAT = {
  /** The art is drawn on a 96x96 canvas (like the other cats) and scaled to `faceW`. The cat covers this share of that height (ear tips to chin). */
  heightShare: 0.92,
  /** Space between the face and the name under it. */
  labelGap: 4,
  /** A new face pops in: scale from `from` to 1 in `ms`. */
  pop: { from: 0.8, ms: 240 },
  /** The glow behind the face: radius (share of `faceW`) and alpha. */
  aura: { radius: 0.56, alpha: 0.22 },
  looks: {
    easy: { fur: 0xffe3b0, dark: 0xe3b66a, inner: 0xffb3c1, muzzle: 0xffffff, nose: 0xff9fb3, blush: 0xff8fa3, aura: 0x7ee081 },
    normal: { fur: 0xf59a3c, dark: 0xd9731a, inner: 0xf4a5a0, muzzle: 0xffe9c9, nose: 0xf4a5a0, blush: 0xff8fa3, aura: 0xfff3d6 },
    hard: { fur: 0xe0672a, dark: 0xa8421a, inner: 0xf08a7a, muzzle: 0xffd2a8, nose: 0xd9534f, blush: null, aura: 0xffb347 },
    nightmare: { fur: 0x4c3a68, dark: 0x251a3d, inner: 0xd93a3a, muzzle: 0x6d5a8c, nose: 0xd93a3a, blush: null, aura: 0xff6b6b },
  } as Record<DifficultyId, CatFaceLook>,
} as const;
