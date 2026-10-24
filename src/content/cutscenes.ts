/** @file Cutscene content: who speaks (names, colors, voices), the scripts themselves (the story opening, the boss entrances and last words) and what triggers them. */
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
 * `story` is the real opening; the boss scenes are still simple placeholders: change or delete them freely.
 */
export const CUTSCENES: Readonly<Record<string, CutsceneScript>> = {
  /**
   * THE STORY OPENING (campaign): Varu is asleep (the opening videos), and this is his dream: he wakes up in the arena, a cat walks up and
   * meows, and he works out that he has to beat the game to get home. Then the first wave starts (the scene ends and the game takes over).
   * The screen starts black and opens slowly, like eyes opening. Skipping jumps to the end state: clear screen, the cat gone, Varu in place.
   */
  story: {
    steps: [
      { do: 'fade', to: 'black', ms: 1 },
      { do: 'camera', to: { at: 'varu' }, zoom: 1.35, ms: 1 },
      { do: 'wait', ms: 600 },
      { do: 'par', steps: [
        { do: 'fade', to: 'clear', ms: 1800 },
        { do: 'text', at: { at: 'varu', dy: -80 }, text: 'Zzz...', color: '#bfe3ff', size: 34 },
      ] },
      { do: 'say', who: 'varu', text: 'Unde sunt? Ce s-a întâmplat?' },
      { do: 'say', who: 'varu', text: 'Sigur sunt vrăjile ei. Mi-a făcut-o, naiba!' },
      // A cat walks up and stands next to him.
      { do: 'show', id: 'guide', tex: Tex.CatNormal, at: { at: 'varu', dx: 420, dy: -40 }, size: 80, fadeMs: 300 },
      { do: 'move', actor: 'guide', to: { at: 'varu', dx: 120, dy: -20 }, ms: 1000, face: true },
      { do: 'face', actor: 'varu', toward: { at: 'guide' } },
      { do: 'emote', actor: 'guide', kind: 'pop' },
      { do: 'say', who: 'cat', text: 'Miau.' },
      { do: 'say', who: 'varu', text: 'Tu? Ha? Ce vrea să zică asta?' },
      { do: 'emote', actor: 'guide', kind: 'shake' },
      { do: 'say', who: 'cat', text: 'Miau, miau, miau. Mau.' },
      { do: 'say', who: 'varu', text: 'A, am înțeles! Trebuie să trec de acest joc ca să reușesc să mă întorc acasă.' },
      { do: 'hide', id: 'guide', fadeMs: 400 },
      { do: 'wait', ms: 400 },
    ],
  },
  /**
   * AFTER THE FIRST WAVE (campaign): Varu catches his breath, is amused by how much he likes whacking cats with his belt,
   * and purrs without meaning to. Then the game takes over and wave 2 comes on its own (the game clock is held during a scene,
   * so the breather before the next wave only counts down once this is over or skipped).
   */
  afterWave1: {
    steps: [
      { do: 'camera', to: { at: 'varu' }, zoom: 1.35, ms: 700 },
      { do: 'say', who: 'varu', text: 'Asta chiar e amuzant.' },
      { do: 'say', who: 'varu', text: 'Nu știu ce vrajă mi-a făcut Mau. E mai puternică decât vraja care m-a făcut să fiu sedus de ea, dar îmi place.' },
      { do: 'say', who: 'varu', text: 'Chiar îmi place să lovesc aceste pisici. Cu cureaua mea.' },
      { do: 'say', who: 'varu', text: 'Cu cureaua mea bună.' },
      // The purr: Varu shakes a little, a soft "mrrr" floats up, and the narrator box says it.
      { do: 'par', steps: [
        { do: 'emote', actor: 'varu', kind: 'shake', ms: 900 },
        { do: 'text', at: { at: 'varu', dy: -80 }, text: 'Mrrr... mrrr...', color: '#ffd9a8', size: 32 },
        { do: 'say', who: 'narrator', text: '*Varu toarce.*', auto: true },
      ] },
      { do: 'wait', ms: 300 },
    ],
  },
  /**
   * FIRST BELT UPGRADE (campaign): after wave 3 the upgrade screen opens; once Varu has picked his first card and the game runs again,
   * he wonders about the cards. (Wave 4 waits: the game clock is held during a scene.)
   */
  firstUpgrade: {
    steps: [
      { do: 'camera', to: { at: 'varu' }, zoom: 1.35, ms: 700 },
      { do: 'emote', actor: 'varu', kind: 'pop' },
      { do: 'say', who: 'varu', text: 'Ha? Niște carduri?' },
      { do: 'say', who: 'varu', text: 'Eu știu numai cardurile pe care le fur din seiful lui tata. Și cardul meu de la BRD.' },
      { do: 'say', who: 'varu', text: 'Sper că o să mă ajute.' },
      { do: 'wait', ms: 300 },
    ],
  },
  /** AFTER WAVE 5 (campaign): Varu misses home, asks if Negrescu is in this game, and cries. */
  afterWave5: {
    steps: [
      { do: 'camera', to: { at: 'varu' }, zoom: 1.35, ms: 700 },
      { do: 'say', who: 'varu', text: 'Of, mi-e dor. Mi-e foarte dor.' },
      { do: 'say', who: 'varu', text: 'Oare există Negrescu în acest joc?' },
      // The crying: he shakes, a soft "snif" floats up, and the narrator box says it.
      { do: 'par', steps: [
        { do: 'emote', actor: 'varu', kind: 'shake', ms: 1100 },
        { do: 'text', at: { at: 'varu', dy: -80 }, text: 'Snif... snif...', color: '#bfe3ff', size: 32 },
        { do: 'say', who: 'narrator', text: '*Plânge.*', auto: true },
      ] },
      { do: 'wait', ms: 300 },
    ],
  },
  /** The older, generic opening: still used for the endless and custom games (the story is the campaign's). */
  introArena: {
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
  /** THE QUEEN (Regina Ioana) ENTERS: the camera goes to her, she talks down to Varu, they trade words, and she warns him before the fight. */
  queenEntrance: {
    steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.3, ms: 800 },
      { do: 'say', who: 'queen', text: 'Cine a intrat în campus? Paza chiar lasă pe oricine.' },
      { do: 'emote', actor: 'boss', kind: 'pop' },
      { do: 'say', who: 'varu', text: 'Ha, de ce te cheamă Ioana?' },
      { do: 'say', who: 'queen', text: 'Pentru că eu sunt Regina Ioana a campusului.' },
      { do: 'say', who: 'varu', text: 'Regina Ioana a campusului? Există numai una și aceea nu ești tu.' },
      { do: 'say', who: 'varu', text: 'Am să te înving și am să-ți dovedesc că nu ești regina campusului.' },
      { do: 'say', who: 'queen', text: 'Ha, mai vedem noi, băiețel mic și blond, după ce se termină.' },
      { do: 'emote', actor: 'boss', kind: 'shake' },
      { do: 'shake' },
    ],
  },
  /** THE EMO CAT (mafia) ENTERS: the camera goes to her, she sulks, Varu loses patience, they trade words about who has had a sad life, and Varu decides to get it over with. */
  mafiaEntrance: {
    steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.3, ms: 800 },
      { do: 'say', who: 'mafia', text: 'Ah, toți sunteți la fel.' },
      { do: 'emote', actor: 'boss', kind: 'pop' },
      { do: 'say', who: 'mafia', text: 'Mai bine mi se lua viața. De ce mai trăiesc pe planeta asta?' },
      { do: 'say', who: 'varu', text: 'Fă, ai terminat de vorbit singură? Ce dracu\' ai? Nu mai plânge.' },
      { do: 'emote', actor: 'boss', kind: 'shake' },
      { do: 'say', who: 'mafia', text: 'Ce poți tu să știi? Tu ești doar un băiat cu păr blond în cap.' },
      { do: 'say', who: 'mafia', text: 'Nu ai avut niciun eveniment trist în viața asta.' },
      { do: 'say', who: 'varu', text: 'Dar tu ce ai făcut? Ce ți s-a întâmplat?' },
      { do: 'say', who: 'mafia', text: 'Niște furnici mi-au furat un cartof. Of, viața nu mai e la fel de atunci.' },
      { do: 'say', who: 'varu', text: 'Tu ești proastă?' },
      { do: 'say', who: 'mafia', text: 'Oh, alt nemuritor pe care trebuie să-l înfrâng. Alt muritor am vrut să zic.' },
      { do: 'say', who: 'mafia', text: 'Hai să trecem o dată peste asta.' },
      { do: 'say', who: 'varu', text: 'Emuloaico, am să te seduc eu cu cureaua mea.' },
      { do: 'shake' },
    ],
  },
  federerEntrance: bossEntrance('federer', 'Șase-zero. Ți-am spus eu.', 'Încă nu am servit.'),
  // Last words (PLACEHOLDER lines: rewrite them with the real inside jokes).
  /** THE QUEEN'S LAST WORDS: the killing blow landed and she stands on 1 HP; she cannot believe a kid beat her, Varu brags about his belt, she says "Au!", he says goodbye, and she falls when the scene ends. */
  queenLastWords: {
    steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.5, ms: 700 },
      { do: 'say', who: 'queen', text: 'Ce? Cum mă poate învinge un copil ca tine? Nici nu știi derivata a doua.' },
      { do: 'say', who: 'varu', text: 'Ha, vezi? Un băiețel mic ca mine are o curea mare ca tine.' },
      { do: 'say', who: 'varu', text: 'Cureaua mea e mare, dar știi ce doare?' },
      { do: 'emote', actor: 'boss', kind: 'pop' },
      { do: 'say', who: 'queen', text: 'Au!' },
      { do: 'say', who: 'varu', text: 'Papa, Ioana!', auto: true },
    ],
  },
  /** THE EMO CAT'S LAST WORDS: she thanks him, Varu finds her strange but cute, and she falls when the scene ends. */
  mafiaLastWords: {
    steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.5, ms: 700 },
      { do: 'say', who: 'mafia', text: 'Mulțam. În sfârșit cineva mi-a îndeplinit visul.' },
      { do: 'emote', actor: 'boss', kind: 'pop' },
      { do: 'say', who: 'varu', text: 'Ce ciudată. Dar mi se pare drăguță.' },
      { do: 'say', who: 'varu', text: 'Oare dă cu zarul 6-6 ca să se spele?', auto: true },
    ],
  },
  federerLastWords: bossLastWords('federer', 'Mi-ai returnat toate mingile... Bravo.', 'Mulțumesc. Aproape renunțam.', 'Joc, set... și meci. Pentru tine.'),
};

/** WHEN a scene plays: an event of the run -> a key of CUTSCENES. */
export const CUTSCENE_TRIGGERS: readonly CutsceneTriggerDef[] = [
  // The story opens the campaign; the endless and custom games keep the short arena intro. (`repeat: 'save'` would show the story only once per device.)
  { when: { on: 'runStart' }, mode: 'campaign', play: 'story' },
  { when: { on: 'runStart' }, mode: 'endless', play: 'introArena' },
  { when: { on: 'runStart' }, mode: 'custom', play: 'introArena' },
  // After the first wave of the campaign (once per run; the next wave starts by itself when the scene is over or skipped).
  { when: { on: 'waveCleared', wave: 1 }, mode: 'campaign', play: 'afterWave1', repeat: 'run' },
  // After the first belt upgrade pick (wave 3's screen) and after wave 5, campaign only (the next wave starts by itself when the scene is over or skipped).
  { when: { on: 'upgradePicked' }, mode: 'campaign', play: 'firstUpgrade', repeat: 'run' },
  { when: { on: 'waveCleared', wave: 5 }, mode: 'campaign', play: 'afterWave5', repeat: 'run' },
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
