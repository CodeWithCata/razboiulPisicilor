/** @file Cutscene content: who speaks (names, colors, voices), the scripts themselves (none yet) and what triggers them. */
import { Tex, type PhotoId, type TexKey } from '../assets/keys';
import type { CutsceneScript, CutsceneStep, CutsceneTriggerDef } from '../core/cutscene';
import { BOSS_LAST_WORDS } from '../config/cutscene';
import { BOSS_TEXT } from './bosses';

/** A voice in the dialogue box. `photo` (a friend's picture, if it is listed in the photo manifest) wins over `tex` (the code-drawn sprite). */
export interface SpeakerDef {
  name: string;
  /** The name tag color. */
  color: string;
  tex?: TexKey;
  photo?: PhotoId;
  /** Pitch of the typing chirp: low = deep and slow, high = squeaky. */
  blipPitch: number;
  /** Always stand on this side. Without it speakers alternate: left, right, left... as the talker changes. */
  side?: 'left' | 'right';
}

/** THE VOICES. Add one per character that talks; `who` in a `say` step is a key of this table. */
export const SPEAKERS: Readonly<Record<string, SpeakerDef>> = {
  varu: { name: 'Varu', color: '#f5c518', tex: Tex.Varu, blipPitch: 1 },
  queen: { name: BOSS_TEXT.queen.name, color: '#e9a6ff', tex: Tex.BossQueen, photo: 'queen', blipPitch: 0.8 },
  mafia: { name: BOSS_TEXT.mafia.name, color: '#b9b2c9', tex: Tex.BossMafia, photo: 'mafia', blipPitch: 0.65 },
  federer: { name: BOSS_TEXT.federer.name, color: '#9be28f', tex: Tex.BossFederer, photo: 'federer', blipPitch: 1.25 },
  cat: { name: 'Pisică', color: '#ffd9a8', tex: Tex.CatNormal, blipPitch: 1.4 },
  /** No name tag, no picture: a narrator box. */
  narrator: { name: '', color: '#fff3d6', blipPitch: 0.9 },
};

/** A short boss entrance: the camera goes to the boss, the boss talks, Varu answers, the ground shakes. */
function bossEntrance(who: 'queen' | 'mafia' | 'federer', line: string, reply: string): CutsceneScript {
  const steps: CutsceneStep[] = [
    { do: 'camera', to: { at: 'boss' }, zoom: 1.3, ms: 800 },
    { do: 'say', who, text: line },
    { do: 'emote', actor: 'boss', kind: 'pop' },
    { do: 'say', who: 'varu', text: reply, auto: true },
    { do: 'shake' },
  ];
  return { steps };
}

/** A boss's last words: the camera goes to the boss, it talks, Varu answers, it says one more thing, then it falls (the game does that when the scene ends). */
function bossLastWords(who: 'queen' | 'mafia' | 'federer', line: string, reply: string, lastLine: string): CutsceneScript {
  return {
    steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.5, ms: 700 },
      { do: 'say', who, text: line },
      { do: 'emote', actor: 'boss', kind: 'pop' },
      { do: 'say', who: 'varu', text: reply, auto: true },
      { do: 'say', who, text: lastLine },
    ],
  };
}

/**
 * THE CUTSCENES. One entry per scene, written as steps (types and every step: `core/cutscene.ts`,
 * the how-to: `docs/CUTSCENES.md`). Words go right here in the `say` steps (Romanian).
 * These are SIMPLE TEST scenes: change or delete them freely.
 */
export const CUTSCENES: Readonly<Record<string, CutsceneScript>> = {
  /** The opening: the camera moves in, a cat peeks out, Varu steps forward. */
  intro: {
    steps: [
      { do: 'camera', to: { at: 'varu' }, zoom: 1.35, ms: 900 },
      { do: 'say', who: 'varu', text: 'Stadionul e plin de pisici. Azi le arăt eu cine e Varu!' },
      { do: 'show', id: 'peek', tex: Tex.CatNormal, at: { at: 'varu', dx: 240, dy: -60 }, size: 80 },
      { do: 'wait', ms: 500 },
      { do: 'say', who: 'cat', text: 'Miau.', auto: true },
      { do: 'emote', actor: 'peek', kind: 'pop' },
      { do: 'par', steps: [
        { do: 'walk', to: { at: 'varu', dy: -90 } },
        { do: 'hide', id: 'peek' },
      ] },
      { do: 'say', who: 'varu', text: 'Hai la luptă!', auto: true },
    ],
  },
  queenEntrance: bossEntrance('queen', 'Cine îndrăznește să intre în regatul meu?', 'Doar vin după mingea mea.'),
  mafiaEntrance: bossEntrance('mafia', '...Nimeni nu mă înțelege. Nici tu.', 'Of, încă unul trist.'),
  federerEntrance: bossEntrance('federer', 'Șase-zero. Ți-am spus eu.', 'Încă nu am servit.'),
  // Last words (PLACEHOLDER lines: rewrite them with the real inside jokes).
  queenLastWords: bossLastWords('queen', 'Imposibil... un om de rând... m-a învins?', 'Regatul tău are nevoie de un covor nou.', 'Păstrează... mingea. Ai meritat-o.'),
  mafiaLastWords: bossLastWords('mafia', 'Poate că... în sfârșit... cineva m-a ascultat.', 'Hai, nu mai fi trist.', 'Spune-le pisicilor... că nu eram chiar rău.'),
  federerLastWords: bossLastWords('federer', 'Mi-ai returnat toate mingile... Bravo.', 'Mulțumesc. Aproape renunțam.', 'Joc, set... și meci. Pentru tine.'),
};

/** WHEN a scene plays: an event of the run -> a key of CUTSCENES. */
export const CUTSCENE_TRIGGERS: readonly CutsceneTriggerDef[] = [
  { when: { on: 'runStart' }, play: 'intro' },
  { when: { on: 'bossSpawned', boss: 'queen' }, play: 'queenEntrance' },
  { when: { on: 'bossSpawned', boss: 'mafia' }, play: 'mafiaEntrance' },
  { when: { on: 'bossSpawned', boss: 'federer' }, play: 'federerEntrance' },
  { when: { on: 'bossLastWords', boss: 'queen' }, play: 'queenLastWords', delayMs: BOSS_LAST_WORDS.delayMs },
  { when: { on: 'bossLastWords', boss: 'mafia' }, play: 'mafiaLastWords', delayMs: BOSS_LAST_WORDS.delayMs },
  { when: { on: 'bossLastWords', boss: 'federer' }, play: 'federerLastWords', delayMs: BOSS_LAST_WORDS.delayMs },
];

/** The small texts of the cutscene screen. */
export const CUTSCENE_TEXT = {
  skipButton: 'Sari peste',
  skipHint: 'Ține apăsat ca să sari peste',
  skipHintTouch: 'Ține apăsat pe ecran ca să sari peste',
} as const;
