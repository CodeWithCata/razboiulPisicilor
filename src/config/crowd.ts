/** @file Numbers for the stand crowd's life (world/StandsCrowd.ts): idle sway, moods, La Ola, arms-up frames, confetti, shouts. No Phaser. */
import { ARENA } from './arena';
import { STANDS } from './stands';

/**
 * The crowd in the stands is alive, all of it visual (no sound yet, no gameplay effect). The view is top-down, so nobody really
 * jumps: a "hop" is the fan growing a little (it comes closer to the camera) with a tilt and a small lean toward the field.
 * It runs on game time, so the slow-mo of the last cat slows the crowd too (`SLOW_MO.slowCrowd` in slowMo.ts; false = real time, it roars at full speed while the game crawls).
 *
 * Moods: `calm` (default), `cheer` (wave start, kill streaks, the last cat, a boss walking in), `roar` (wave cleared, boss beaten,
 * victory) and `gloom` (game over). Every number of a mood is EASED, so a mood never snaps.
 */
export type CrowdMood = 'calm' | 'cheer' | 'roar' | 'gloom';

/** One mood as plain numbers. Rates are in times per second (Hz). */
export interface MoodLook {
  /** How much a hop makes a fan grow at the top of it (0.1 = 10 percent). */
  hop: number;
  hopHz: number;
  /** How far a fan tilts while hopping (degrees). */
  tiltDeg: number;
  /** The slow side to side sway (degrees) and how fast. */
  swayDeg: number;
  swayHz: number;
  /** Breathing: how much the fan grows and shrinks, and how fast. */
  breath: number;
  breathHz: number;
  /** How far a fan leans toward the field at the top of a hop (px). */
  lean: number;
  /** 0 = every fan on its own beat, 1 = the whole crowd hops in one ripple that runs round the ring. */
  sync: number;
  /** Share of the fans that have their arms up (the cheer frames). */
  arms: number;
  /** Added to everybody's size: negative = slumped. */
  slump: number;
}

/** The number names of a mood, so the crowd can ease each one. */
export const MOOD_KEYS: ReadonlyArray<keyof MoodLook> = ['hop', 'hopHz', 'tiltDeg', 'swayDeg', 'swayHz', 'breath', 'breathHz', 'lean', 'sync', 'arms', 'slump'];

const MOODS: Record<CrowdMood, MoodLook> = {
  /** Slow sway and breathing. A few fans fidget now and then (`fidget`), so it is never still. */
  calm: { hop: 0, hopHz: 0.8, tiltDeg: 0, swayDeg: 4, swayHz: 0.25, breath: 0.025, breathHz: 0.4, lean: 0, sync: 0, arms: 0.03, slump: 0 },
  /** Bigger, faster hops, more than half of the arms go up. */
  cheer: { hop: 0.09, hopHz: 1.6, tiltDeg: 7, swayDeg: 6, swayHz: 0.6, breath: 0.02, breathHz: 0.8, lean: 2, sync: 0.2, arms: 0.55, slump: 0 },
  /** Full hops that roll round the stands, nearly every arm up. */
  roar: { hop: 0.14, hopHz: 2.2, tiltDeg: 10, swayDeg: 8, swayHz: 0.9, breath: 0.02, breathHz: 1, lean: 3.5, sync: 0.45, arms: 0.9, slump: 0 },
  /** Slumped and slow, nobody hops. */
  gloom: { hop: 0, hopHz: 0.5, tiltDeg: 0, swayDeg: 2.5, swayHz: 0.12, breath: 0.012, breathHz: 0.18, lean: 0, sync: 0, arms: 0, slump: -0.07 },
};

/** What the crowd shouts, and when (`CROWD_LINES` in content/lines.ts has the words). */
export type ShoutKind = 'cheer' | 'roar' | 'boss' | 'surrender' | 'gloom';

export const CROWD = {
  enabled: true,
  /** Fans inside the camera view (plus the margin) are animated, up to this many; the rest rest. Phones get the lower number. */
  maxAnimated: 260,
  touchMaxAnimated: 110,
  /** Fans this far outside the screen are still animated, so nobody pops in at the edge (px). */
  viewMarginPx: 90,
  /** A frame longer than this counts as this long (a tab switch must not make the crowd jump). */
  maxStepMs: 100,
  /** A fan that starts or stops being animated fades its motion in or out over this long. */
  liveFadeMs: 350,
  moods: MOODS,
  /** How long a mood takes to settle when the crowd moves INTO it (ms, about a third of the full change). */
  easeMs: { calm: 1800, cheer: 500, roar: 320, gloom: 380 },
  /** How long an event keeps the crowd in a mood before it calms down again (ms). Gloom stays until the run ends. */
  cheer: { waveStartMs: 3600, lastCatMs: 3200, streakMs: 2800, bossMs: 4200, surrenderMs: 1800 },
  roar: { waveClearedMs: 5600, bossDefeatedMs: 4200, victoryMs: 60000 },
  /** Kills that follow each other within `windowMs`: every `kills`-th one makes the crowd cheer. */
  streak: { windowMs: 1600, kills: 4 },
  /** How often the crowd looks whether only one cat is left (game ms). */
  lastCatEveryMs: 250,
  /** The crowd grows a little louder as the waves go on: this much more per wave, never more than `maxGain` (0.3 = 30 percent). */
  waves: { gainPerWave: 0.025, maxGain: 0.3 },
  /** The ripple of a roaring crowd: its length along the ring (px). */
  rippleWavelengthPx: 700,
  /** The arms of a cheering fan swap between the two frames this often (ms). */
  armSwapMs: 230,
  /** Idle life: now and then a fan does one little hop of its own. Every `periodMs` a fan rolls `chance` for a hop. */
  fidget: { periodMs: 5200, chance: 0.22, hopMs: 520, hop: 0.07, tiltDeg: 5 },
  /** A one-off shock (a boss walks in, a cat gives up): everybody hops at once and it fades away. */
  pulse: { decayMs: 650, hop: 0.16, tiltDeg: 9, armsAbove: 0.45 },
  /** La Ola: one pulse runs once round the whole ring, starting at the stands nearest to the camera. */
  ola: { enabled: true, speedPxPerSec: 1100, widthPx: 480, hop: 0.34, lean: 6, tiltDeg: 6, armsAbove: 0.3, laps: 1 },
  /** The VIPs in the balcony boxes lean on the railing: they rock forward and back, and hop a bit less. */
  box: { restLean: 2.5, hopShare: 0.75, leanShare: 1.8 },
  /** Confetti thrown up on the terraces when the crowd roars (above the fans, under the cats and the night sheet). */
  confetti: {
    enabled: true,
    /** Bursts per roar and the gap between two (ms). Each burst pops at a random fan on screen. */
    bursts: 8,
    gapMs: 120,
    perBurst: 7,
    /** Phones get this share of the bursts and of each burst. */
    touchShare: 0.5,
    lifeMs: { min: 800, max: 1400 },
    speed: { min: 50, max: 190 },
    scale: { start: 0.5, end: 0.1 },
    colors: STANDS.colors.confetti,
    depth: ARENA.depth.stands + 0.03,
  },
  /** Words the crowd shouts (floating text over the fans). Never more often than `minGapMs`; `chance` is per event. */
  shout: {
    enabled: true,
    minGapMs: 5200,
    size: 26,
    color: '#f5c518',
    /** Lift above the fan (px). */
    liftPx: 22,
    chance: { cheer: 0.45, roar: 0.9, boss: 1, surrender: 0.7, gloom: 1 },
  },
  /** Dev key Z: how long a forced mood stays before the crowd calms down (ms). Gloom stays until the next press. */
  debugHoldMs: 6000,
} as const;
