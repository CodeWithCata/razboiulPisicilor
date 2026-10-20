/** @file Boss names, phase-2 banners, attack shouts and the hidden ending message (Romanian). */
import type { BossType } from '../config/balance';

export interface BossText {
  name: string; // shown in the HUD and the intro banner
  phase2: string; // banner when it gets serious
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
    attacks: { decree: 'Decret regal!', charge: 'ÎNAINTE!', spin: 'Plecăciune!' },
  },
  mafia: {
    name: 'Pisica Emo',
    phase2: 'Acum chiar nu mai sunt OK...',
    attacks: { hearts: 'Inimi frânte...', scream: 'NIMENI NU MĂ ÎNȚELEGE!', crew: 'Gașca neagră!' },
  },
  federer: {
    name: 'Pisica Federer',
    phase2: 'Acum e serios!',
    attacks: { volley: 'Fault... al tău!', serve: 'SERVĂ!', dash: 'Smash!', ballboys: 'Mingi!', lob: 'Ploaie de mingi!' },
  },
};

/** Shown when Varu beats the whole game. REPLACE WITH YOUR OWN MESSAGE (birthday wish, inside joke...). */
export const ENDING_TITLE = 'Varu a câștigat!';
export const ENDING_MESSAGE = 'Pisicile s-au retras.\nMesajul tău secret vine aici.';
