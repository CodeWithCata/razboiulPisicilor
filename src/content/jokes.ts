/** @file The jokes (Romanian), grouped by trigger, plus boss intro lines and photo captions. */
import type { BossType } from '../config/balance';
import type { JokeCategory } from '../config/jokes';
import type { PhotoId } from '../assets/keys';

/**
 * THE JOKES. Romanian, grouped by the situation that triggers them (timing lives in config/jokes.ts).
 * One random line of the right group is shown. `{n}` is replaced by the streak length.
 * The old lines in content/lines.ts (hit words, Varu's lines...) still work next to these.
 *
 * >>> PLACEHOLDERS: the lines marked "PLACEHOLDER" are generic. Replace them with the real
 * >>> nicknames and inside jokes. Nothing else in the code needs to change.
 */
export const JOKE_LINES: Record<JokeCategory, readonly string[]> = {
  lowHp: [
    'Varule, ai grijă!',
    'Doar o zgârietură... zgârietură mare.',
    'Unde-i crocheta?!',
    'Nu acum, vă rog!',
  ],
  killStreak: [
    '{n} la rând! Pisicile plâng.',
    '{n} pisici! Varu nu se oprește!',
    'Seria de {n}! Cureaua e pe foc!',
    '{n}! Cineva cheamă veterinarul!',
  ],
  waveStart: [
    'Se aud mieunaturi...',
    'Încă o rundă de gheare.',
    'Pisicile au adus prietene.',
    'Respiră adânc, Varule.',
  ],
  waveCleared: [
    'Liniște. Suspect de liniște.',
    'Pisicile și-au lins rănile.',
    'Varu bea o gură de apă.',
    'Încă un val în buzunar!',
  ],
  // Used when a boss has no line of its own in BOSS_INTRO_LINES below.
  bossIntro: ['Un boss sălbatic apare!', 'Asta nu mai e o pisică obișnuită...'],
  bossPhase2: ['Acum s-a supărat pe bune!', 'Mănușile au căzut. Ghearele au ieșit.'],
  pickup: [
    'Mmm, bun!',
    'Exact ce îmi trebuia.',
    'Mulțumesc, univers!',
    'Cineva a lăsat asta pentru Varu.',
  ],
  nearDeath: ['Încă respir!', 'Ioi, de-abia!', 'Nu mă lăsa, centură!', 'Cu un fir de păr!'],
  gameOver: ['Pisicile îți mulțumesc pentru perna comodă.', 'Revanșa e gratis.'],
};

/** PLACEHOLDER: boss intro lines, one list per boss. Put the real nicknames here. */
export const BOSS_INTRO_LINES: Record<BossType, readonly string[]> = {
  queen: ['PLACEHOLDER: ea își cere tronul înapoi.', 'Regina vrea o plecăciune. Sau o centură.'],
  mafia: ['PLACEHOLDER: cine i-a frânt inima?', 'Pisica Emo: \"Sunt bine. (Nu sunt.)\"'],
  federer: ['PLACEHOLDER: serviciu, retur, apoi smash.', 'Pisica Federer: 20 de turnee, 0 mile de milă.'],
};

/**
 * PLACEHOLDER captions under the friend photos. Write the friend's real name or nickname.
 * The photos themselves go in public/assets/photos/ and in assets/manifest.ts (PHOTO_MANIFEST).
 */
export const PHOTO_CAPTIONS: Record<PhotoId, string> = {
  queen: 'PLACEHOLDER: numele prietenei (Regina)',
  mafia: 'PLACEHOLDER: numele prietenului (Emo-ul)',
  federer: 'PLACEHOLDER: numele prietenului (Federer)',
  gameOver: 'PLACEHOLDER: cine râde de Varu',
  ending: 'PLACEHOLDER: toată gașca',
};

/** Fill in `{n}`-style gaps. Unknown gaps stay as they are. */
export function fillLine(line: string, vars: Readonly<Record<string, string | number>>): string {
  return line.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
