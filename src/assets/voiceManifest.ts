/** @file Which recorded voice file says which cutscene line (key = speaker + text). A line without a file keeps the typed-letter blips. */

/** The key of one line: the speaker (a key of SPEAKERS) and the exact text shown in the box. */
export function voiceKey(speaker: string, text: string): string {
  return `${speaker}|${text}`;
}

/**
 * Files live in `public/assets/audio/voice/` (folder: `config/voice.ts`).
 * If the text of a line changes, its file no longer matches and the line falls back to the blips: record it again.
 * These clips were cut from the owner's ElevenLabs voice-design previews (`voice-previews/`), not generated line by line.
 */
export const VOICE_FILES: Readonly<Record<string, string>> = {
  // Varu
  [voiceKey('varu', 'Unde sunt? Ce s-a întâmplat?')]: 'varu-fa48eef4867e.mp3',
  [voiceKey('varu', 'Sigur sunt vrăjile ei. Mi-a făcut-o, naiba!')]: 'varu-9f2f2ac1b37b.mp3',
  [voiceKey('varu', 'A, am înțeles! Trebuie să trec de acest joc ca să reușesc să mă întorc acasă.')]: 'varu-fdc40fe2e80e.mp3',
  [voiceKey('varu', 'Chiar îmi place să lovesc aceste pisici. Cu cureaua mea.')]: 'varu-85205de39414.mp3',
  [voiceKey('varu', 'Cu cureaua mea bună.')]: 'varu-e808ba25b194.mp3',
  // Regina Ioana
  [voiceKey('queen', 'Cine a intrat în campus? Paza chiar lasă pe oricine.')]: 'queen-b1e2f744837a.mp3',
  [voiceKey('queen', 'Pentru că eu sunt Regina Ioana a campusului.')]: 'queen-c13c80c048d8.mp3',
  [voiceKey('queen', 'Ha, mai vedem noi, băiețel mic și blond, după ce se termină.')]: 'queen-e2d33af429ea.mp3',
  // AnatasYOU
  [voiceKey('mafia', 'Ah, toți sunteți la fel.')]: 'mafia-68f41a86e31e.mp3',
  [voiceKey('mafia', 'Ce poți tu să știi? Tu ești doar un băiat cu păr blond în cap.')]: 'mafia-d929d516ef67.mp3',
  [voiceKey('mafia', 'Hai să trecem o dată peste asta.')]: 'mafia-5c3be2b18812.mp3',
  // Simona Miaulep
  [voiceKey('federer', 'Iar acum trebuie să mă învingi pe mine la un meci de tenis.')]: 'federer-419c375b557e.mp3',
  [voiceKey('federer', 'Eu sunt Simona Miaulep. Apleacă-te în fața mea, sclavule.')]: 'federer-2954408885ad.mp3',
  [voiceKey('federer', 'O să te distrug!')]: 'federer-20ede3ee63e3.mp3',
  // Bombardierul
  [voiceKey('bomber', 'Sunt bombardierul. Am bubuit blocul de la școala 2 și o să te bubui și pe tine.')]: 'bomber-2bf1b83e1b65.mp3',
  // Narator
  [voiceKey('narrator', '*Varu toarce.*')]: 'narrator-e63089a3d1eb.mp3',
  [voiceKey('narrator', '*Plânge.*')]: 'narrator-3913418aadb9.mp3',
  [voiceKey('narrator', '*Simona vede cureaua și începe să se panicheze.*')]: 'narrator-58ce7c43d27f.mp3',
};
