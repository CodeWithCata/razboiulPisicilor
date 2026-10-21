/** @file Audio numbers: volumes and the generated music tracks (TRACKS). */
import type { MusicId, SoundId } from '../assets/audioKeys';

/** Audio numbers. Volumes are 0..1. Everything here is a starting guess: tweak by ear. */
export const AUDIO = {
  masterVolume: 0.7,
  /** Music sits well under the effects on purpose. N mutes everything. */
  musicVolume: 0.3,
  musicEnabled: true,
  /** The pause menu sets music and effects volume in this many steps (10 = 10% each). Also saved between visits. */
  volumeSteps: 10,
  /** "Miau" gets a random pitch within +/- this fraction, so it never sounds the same twice. */
  miauPitchVariance: 0.15,
  /** The key that toggles mute (KeyboardEvent.code). M is taken by "menu" on the end screens. */
  muteKeyCode: 'KeyN',
  /** The synthesized music is scheduled this far ahead. */
  scheduleAheadSec: 0.3,
  schedulerIntervalMs: 80,
  /** Extra pitch for the belt specials (they reuse the swing sound). */
  pitch: { spin: 0.72, throw: 0.55, bossKillMiau: 0.7, killMiau: 0.85, ballLanded: 1.6, bump: 0.9, surrender: 1.4, luckySpawn: 1.5, luckyGone: 1.3, fanThrow: 1.35, fanGift: 1.2, petardLand: 1.3 },
  /** Chance a cat hit also gets a "miau". */
  miauOnHitChance: 0.55,
  /** Per-sound loudness. */
  volumes: {
    swing: 0.5, hit: 0.6, miau: 0.55, kill: 0.6, hurt: 0.7, pickup: 0.55, bonk: 0.6, caw: 0.5,
    explosion: 0.8, deflect: 0.55, stun: 0.6, bossIntro: 0.8, waveStart: 0.6, victory: 0.7, gameOver: 0.7,
    rustle: 0.5, thud: 0.7, clank: 0.5, boing: 0.5, knock: 0.6, smash: 0.8, heartbeat: 0.8, blip: 0.35,
  } satisfies Record<SoundId, number>,
  /** The same sound can't restart sooner than this (ms). Stops explosions of sound when 10 cats get hit at once. */
  minGapMs: {
    swing: 60, hit: 50, miau: 120, kill: 60, hurt: 150, pickup: 60, bonk: 60, caw: 100,
    explosion: 120, deflect: 80, stun: 300, bossIntro: 500, waveStart: 500, victory: 1000, gameOver: 1000,
    rustle: 70, thud: 70, clank: 60, boing: 90, knock: 70, smash: 120, heartbeat: 200, blip: 30,
  } satisfies Record<SoundId, number>,
} as const;

export interface TrackDef {
  bpm: number;
  /** One entry per 8th note. MIDI note numbers (60 = middle C), null = rest. */
  bass: readonly (number | null)[];
  lead: readonly (number | null)[];
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  bassVolume: number;
  leadVolume: number;
}

/** Placeholder music loops, played by a tiny step sequencer (assets/audioManifest.ts can replace them with real files). */
export const TRACKS: Record<MusicId, TrackDef> = {
  menu: {
    bpm: 92,
    bass: [48, null, null, null, 55, null, null, null, 53, null, null, null, 55, null, null, null],
    lead: [72, null, 76, 79, null, 76, null, 72, 74, null, 77, 81, null, 77, null, 74],
    bassWave: 'triangle',
    leadWave: 'triangle',
    bassVolume: 0.5,
    leadVolume: 0.3,
  },
  fight: {
    bpm: 132,
    bass: [40, 40, null, 40, 43, null, 40, null, 38, 38, null, 38, 41, null, 38, null],
    lead: [64, null, 67, null, 71, null, 67, null, 62, null, 65, null, 69, null, 65, null],
    bassWave: 'square',
    leadWave: 'square',
    bassVolume: 0.22,
    leadVolume: 0.12,
  },
};
