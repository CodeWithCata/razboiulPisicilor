/** @file Bad luck (ghinion) numbers: the curse cooldown, the wave ramp, mercy, and which cat hit gives which curse. No Phaser. */
import type { BadKind } from './balance';

/**
 * Bad luck is a set of EXTRA ways the six bad pickups (snail, dumbbell, emo, rusty, big, smoke break) reach Varu.
 * `systems/CurseSystem.ts` is the one gate every random source goes through: it checks the cooldown, the wave and mercy, rolls the chance
 * and gives the curse. All times are game ms (the pause menu stops them).
 */
export const CURSE = {
  enabled: true,
  /** Minimum time between two curses, from any source (the question mark counts too, it only starts the timer). */
  cooldownMs: 12000,
  /** No curses before this wave (waves 1 to 3 stay clean). */
  firstWave: 4,
  /**
   * The wave ramp: a chance is multiplied by `startShare` on the first cursed wave, growing in a straight line to 1 at `fullWave`
   * (and staying at 1 after it, endless mode included).
   */
  ramp: { startShare: 0.3, fullWave: 15 },
  /** Below this share of his health the random curses stop (the fans' petards use the same pity). */
  mercyHpShare: 0.3,
  /** Chance (0..1) that a hit from a listed cat gives its curse. Multiplied by the wave ramp. */
  catHitChance: 0.08,
  /** The funny line a boss curse floats over Varu (the text is `BOSS_CURSE_LINES`; the curses themselves are `BOSS_CURSE` in config/bosses.ts). */
  boss: { lineLiftPx: 90, lineColor: '#ff9a8a', lineSize: 28 },
  /**
   * Greed: while `minBuffs` or more GOOD buffs are active (milk, Monster, golden belt, laser), every random curse roll (`CurseSystem.roll`:
   * cats on hit, later the costly rewards) has its chance multiplied by `multiplier`. Fan drops, bosses and barrels are not random rolls: no greed.
   */
  greed: { minBuffs: 2, multiplier: 1.5 },
  /**
   * Cursed barrels: each barrel that appears from the first cursed wave on has this `chance` to be cursed (a purple glow and tint). Breaking it,
   * with the belt, a blast or a cat, releases a purple cloud of `radius` px; Varu inside it gets a random bad pickup (gate: cooldown, wave, mercy).
   * Barrels that were standing before that wave roll once when it starts.
   */
  barrel: {
    chance: 0.25,
    radius: 110,
    tint: 0xd9b8ff,
    glow: { color: 0xa24bff, radiusPx: 36, offsetY: -24, alphaMin: 0.12, alphaMax: 0.42, pulseMs: 700 },
    cloud: { startPx: 20, ms: 800, color: 0xa24bff, alpha: 0.4 },
    word: { offsetY: -64, size: 26, color: '#c9a0ff' },
  },
} as const;

/**
 * Which hit gives which curse. The key is the `source` of the hit (`Player.takeDamage`): a cat type for a touch, a projectile kind for a
 * thrown thing, or a blast source. Hits from anything not listed here never curse: the normal cat (and the lucky cat, who never hurts) are left out on purpose; bosses curse through their own rings (`BOSS_CURSE`).
 */
export const CAT_HIT_CURSES: Readonly<Record<string, BadKind>> = {
  fat: 'snail', // the fat cat sits on him: he crawls
  kamikaze: 'smoke', // the blast leaves him coughing: a smoke break
  heart: 'emo', // the emo cat's broken heart
  ninja: 'rusty', // his dirty blade: the belt rusts
  flying: 'big', // her wind puffs him up (touch)
  yarn: 'big', // the flying cat's yarn ball (same curse as her touch)
  tennis: 'dumbbell', // the tennis cat's touch or green ball: the belt feels heavy (Federer's green balls too)
  fireball: 'dumbbell', // the tennis cat's red serve
};

/**
 * WAVE-STATE curses (`systems/WeatherCurses.ts`): not random rolls. While the weather lasts (or on Marți 13) Varu is cursed again and again,
 * like a normal timed buff (so the badge and its ring work), instead of one permanent effect. They ignore the 12 s cooldown (but start it),
 * and still respect "no curses before wave 4" and mercy (`CurseSystem.forceWaveState`). They stop at the end of the wave.
 */
export const WEATHER_CURSE = {
  /** Which curse a weather gives: the belt gets wet in rain, a moody day in fog. */
  byWeather: { fog: 'emo', rain: 'rusty' } as Readonly<Record<string, BadKind>>,
  /** First curse this long after the weather starts (so the wave banner and the first cats come first). */
  firstDelayMs: 4000,
  /** Then it is given again this often (the buffs last 7 s, so most of the time Varu is fine). */
  repeatMs: 25000,
  /** Mercy blocked it (low health): try again after this. */
  retryMs: 3000,
} as const;

/** Marți 13 (Tuesday the 13th): one fixed wave with a banner and a MILD curse (never the snail) re-applied through the wave like the weather ones. */
export const MARTI_13 = {
  /** The campaign has 15 waves; the debug wave jump (8) gets there fast. */
  wave: 13,
  /** The curse is picked at random from these when the wave starts. */
  kinds: ['dumbbell', 'emo', 'rusty', 'big'] as readonly BadKind[],
  firstDelayMs: 3000,
  repeatMs: 25000,
  /** The line floats over Varu with each curse. */
  line: { liftPx: 90, color: '#ff9a8a', size: 26 },
} as const;

/**
 * Rewards that cost something (`systems/CostlyRewards.ts`). The random ones go through `CurseSystem.roll` (cooldown, wave ramp, mercy, greed);
 * the sure one (rust from overuse) goes through `forceWaveState` (no cooldown check, but waves 1-3 and mercy hold).
 */
export const COSTLY = {
  /** Energy crash: when Monster (or the Red Bull look of it) runs out, this chance of a SHORT Emo. */
  crash: { chance: 0.35, durationMs: 3500 },
  /**
   * Golden belt goo: when the golden belt runs out, `chance` of `durationMs` of Snail (never shortens a snail already running).
   * A random roll, so the wave ramp (x0.3 at wave 4, x1 from wave 15) and greed apply: about 18% at wave 4, 37% at wave 9, 60% at wave 15.
   */
  goo: { chance: 0.6, durationMs: 2000 },
  /** Healing costs lungs: each crochete (pack, loose cigarettes or vape) has this chance of a smoke break (the 1 s freeze, `SMOKE_FREEZE`) on top of the heal. */
  lungs: { chance: 0.15 },
  /** Rust from overuse: this many spins or throws within `windowMs` make the belt Rusty (uses while it is already Rusty do not count). */
  overuse: { uses: 6, windowMs: 10000 },
  /** The funny line floated over Varu. */
  lineLiftPx: 70,
  lineColor: '#ffd98a',
  lineSize: 24,
} as const;
