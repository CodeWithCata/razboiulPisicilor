/** All the words of the pause menu. */
export const PAUSE_TEXT = {
  title: 'PAUZĂ',
  resume: 'Continuă',
  music: 'Muzică',
  sfx: 'Efecte',
  sound: 'Sunet',
  /** Phones and tablets only: Varu swings by himself when a cat is close. Off unless chosen. */
  autoAttack: 'Atac automat',
  /** Phones only: shows the fps and a few numbers on the screen, for testing. */
  debugInfo: 'Date debug',
  on: 'PORNIT',
  off: 'OPRIT',
  soundOn: 'PORNIT',
  soundOff: 'OPRIT',
  restart: 'Reia de la început',
  menu: 'Meniu principal',
  /** Shown on Restart / Menu after the first press: they throw the current run away. */
  confirm: 'Sigur? Apasă încă o dată',
  hint: '↑ ↓ alege   •   ← → volum   •   Enter confirmă   •   Esc continuă',
  /** Phones and tablets: no keys, so say how to tap. */
  hintTouch: 'Atinge un rând  •  atinge blocurile ca să schimbi volumul',
} as const;

/** What the fat cat says while waiting for Varu to finish his smoke break (one at random). Varu's own line comes from SMOKE_LINES. */
export const PAUSE_CAT_LINES = ['Mi-e foame.', 'Hai odată!', 'Miau?', '...'] as const;
