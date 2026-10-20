/** @file Joke timing: categories, per-category chance and cooldown, toast and boss-card looks (no Phaser). */
import { shiftRight } from './balance';
/**
 * Joke numbers. WHEN a joke may appear lives here; WHAT it says lives in content/jokes.ts.
 * No Phaser imports on purpose, so this stays easy to test with plain node.
 */
export const JOKE_CATEGORIES = [
  'lowHp',
  'killStreak',
  'waveStart',
  'waveCleared',
  'bossIntro',
  'bossPhase2',
  'pickup',
  'nearDeath',
  'gameOver',
] as const;
export type JokeCategory = (typeof JOKE_CATEGORIES)[number];

/** `float` = text that rises from the spot (over Varu), `toast` = a small bar on the HUD. */
export type JokeChannel = 'float' | 'toast';

export interface JokeRule {
  channel: JokeChannel;
  /** The same category can't fire again sooner than this. */
  cooldownMs: number;
  /** 0..1, rolled every time the situation happens. */
  chance: number;
  /** Priority jokes ignore the global gap (a boss intro should never be swallowed by a pickup joke). */
  priority: boolean;
  color: string;
  size: number;
}

export const JOKE_RULES: Record<JokeCategory, JokeRule> = {
  lowHp: { channel: 'float', cooldownMs: 14000, chance: 0.9, priority: false, color: '#ff8a8a', size: 30 },
  killStreak: { channel: 'float', cooldownMs: 3500, chance: 1, priority: false, color: '#ffe066', size: 34 },
  waveStart: { channel: 'toast', cooldownMs: 0, chance: 0.6, priority: false, color: '#fff3d6', size: 26 },
  waveCleared: { channel: 'toast', cooldownMs: 0, chance: 0.7, priority: false, color: '#9be28f', size: 26 },
  bossIntro: { channel: 'toast', cooldownMs: 0, chance: 1, priority: true, color: '#ffd9a8', size: 28 },
  bossPhase2: { channel: 'toast', cooldownMs: 0, chance: 1, priority: true, color: '#ff8a8a', size: 28 },
  pickup: { channel: 'toast', cooldownMs: 9000, chance: 0.35, priority: false, color: '#d9c8ff', size: 24 },
  nearDeath: { channel: 'float', cooldownMs: 25000, chance: 1, priority: false, color: '#9be28f', size: 32 },
  gameOver: { channel: 'toast', cooldownMs: 0, chance: 1, priority: true, color: '#ffd9a8', size: 28 },
};

export const JOKE_TUNING = {
  /** Below this share of max HP Varu is "low". */
  lowHpRatio: 0.3,
  /** Below this share he is "almost dead"; getting back above lowHpRatio afterwards = survived. */
  nearDeathRatio: 0.15,
  /** Kills within this time of the previous one keep the streak alive. */
  streakWindowMs: 2200,
  /** A streak joke fires when the streak reaches exactly one of these. */
  streakMilestones: [5, 10, 20, 35, 50],
  /** Two normal jokes never appear closer than this. */
  globalGapMs: 1500,
  /** Floating jokes rise from this far above Varu. */
  floatOffsetY: -92,
} as const;

/** The toast bar (ui/Toast.ts). */
export const TOAST = {
  /** Distance of the toast from the bottom edge of the screen. */
  bottom: 96,
  /** Phones: higher up and narrower, so it never covers the thumb buttons. */
  bottomTouch: 200,
  maxWidthTouch: 640,
  holdMs: 2300,
  fadeInMs: 220,
  fadeOutMs: 380,
  /** At most this many wait in line; older ones are dropped so it never lags behind the game. */
  maxQueue: 2,
  maxWidth: 900,
  /** Graffiti look: no card, just big chunky letters in the joke's color with a thick navy outline and a hard shadow. */
  sizeFactor: 1.15,
  strokeFactor: 0.3,
  shadow: { x: 4, y: 6 },
  /** Paint drips hanging under the letters: how many, how wide and how long (random in the range). */
  drips: { count: 3, w: [4, 7], len: [8, 26], outline: 2.5 },
  /** Each toast leans, alternating left and right, like it was sprayed on in a hurry. */
  tiltDeg: 3,
  popFromScale: 1.35,
  popMs: 260,
} as const;

/** Boss intro card with the friend photo (ui/BossIntroCard.ts). */
export const BOSS_CARD = {
  x: 170,
  y: 330,
  photoSize: 168,
  slideMs: 380,
  holdMs: 2400,
  tiltDeg: -4,
  /** The card appears this long after the boss spawns, so it doesn't fight the "boss name" banner. */
  delayMs: 250,
} as const;

/** Photo frames on the end screens. */
export const PHOTO_FRAME = {
  border: 8,
  captionSize: 22,
  placeholderLabel: 'FOTO',
  labelSize: 26,
  gameOver: { get x() { return shiftRight(1100); }, y: 380, size: 200, tiltDeg: 5 },
  ending: { get x() { return shiftRight(1100); }, y: 330, size: 220, tiltDeg: 4 },
} as const;
