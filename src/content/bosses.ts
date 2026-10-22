/** @file Boss names, phase-2 banners, attack shouts and the hidden ending message (Romanian). */
import type { BossType } from '../config/balance';

export interface BossText {
  name: string; // shown in the HUD and the intro banner
  phase2: string; // banner when it gets serious
  /** Shouted when the queen's rage starts (her last quarter of health). */
  phase3?: string;
  /** Shouted when an attack starts. Keys match the attack ids in the boss file. */
  attacks: Record<string, string>;
}

/**
 * THE BOSS NICKNAMES AND JOKES. Replace these with your real inside jokes,
 * friends' names and nicknames. Nothing else in the code needs to change.
 */
export const BOSS_TEXT: Record<BossType, BossText> = {
  queen: {
    name: 'Regina Pisicilor',
    phase2: 'Regina e furioasă!',
    phase3: 'ÎNCHINAȚI-VĂ TOȚI!',
    attacks: {
      decree: 'Decret regal!',
      charge: 'ÎNAINTE!',
      rush: 'Și încă o dată!',
      spin: 'Plecăciune!',
      scepter: 'Sceptrul regal!',
      carpet: 'Covorul roșu!',
    },
  },
  mafia: {
    name: 'Pisica Emo',
    phase2: 'Acum chiar nu mai sunt OK...',
    attacks: { hearts: 'Inimi frânte...', sad: 'Inimi triste... te găsesc oriunde.', scream: 'NIMENI NU MĂ ÎNȚELEGE!', crew: 'Gașca neagră!' },
  },
  federer: {
    name: 'Pisica Federer',
    phase2: 'Acum e serios!',
    /** Shouted when her last quarter of health starts (the tie-break rage). */
    phase3: 'TIE-BREAK!',
    attacks: {
      volley: 'Fault... al tău!',
      serve: 'SERVĂ!',
      dash: 'Smash!',
      ballboys: 'Mingi!',
      lob: 'Ploaie de mingi!',
      // v147: the second serve, the three set plays (their tells) and the racket smash of the rage
      serve2: 'Fault!',
      serveVolley: 'Serve și volei!',
      dashSmash: 'Fugă și smash!',
      triple: 'Trio de aur!',
      racketSmash: 'Racheta zboară!',
    },
  },
};

/** Shown when Varu beats the whole game. REPLACE WITH YOUR OWN MESSAGE (birthday wish, inside joke...). */
export const ENDING_TITLE = 'Varu a câștigat!';
export const ENDING_MESSAGE = 'Pisicile s-au retras.\nMesajul tău secret vine aici.';

/** What Federer says when she sidesteps a ball Varu swatted at her (a returned ball already shows the "CONTRA!" word and sparks of the tennis cats). */
export const FEDERER_RALLY_LINES: readonly string[] = ['Ratat!', 'Pas lateral!', 'Aut!', 'Nici nu m-a atins!'];

/** What Federer says when she takes her towel break (the free hits just before the tie-break rage). */
export const FEDERER_TOWEL_LINE = 'Pauză de prosop...';

/** What a boss says when its curse attack catches Varu (floats over him with the bad luck show). */
export const BOSS_CURSE_LINES: Record<BossType, string> = {
  queen: 'Prin decret regal: ești MARE!',
  mafia: 'Țipăt emo: acum mergi ca melcul!',
  federer: 'Smash de plumb: cureaua-i o gantera!',
};

/** v172: what the emo cat says when it starts to rain, when he turns the lights off, and when he cries for help (Romanian). */
export const MAFIA_MOODS = {
  rain: 'Plouă și în sufletul meu...',
  cry: ['Lasă-mă... în pace...', 'Nu mă mai atinge...', 'Vreau să fiu singur...'] as readonly string[],
} as const;

/** v173: what each boss says when it turns the lights off (Romanian). */
export const LIGHTS_OUT_LINES: Record<BossType, string> = {
  mafia: 'Stingeți luminile. Oricum nu mă vede nimeni.',
  queen: 'Fără lumină, supușilor! Regina vede tot!',
  federer: 'Meciul continuă... pe întuneric!',
};
