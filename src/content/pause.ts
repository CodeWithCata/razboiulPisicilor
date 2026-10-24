/** All the words of the pause menu. */
export const PAUSE_TEXT = {
  title: 'PAUZĂ',
  resume: 'Continuă',
  music: 'Muzică',
  sfx: 'Efecte',
  sound: 'Sunet',
  /** The frame-rate limit slider (computers and phones): the row shows the word and the chosen number, for example: FPS 60. Kept short: the blocks take most of the row on a phone. */
  fps: 'FPS',
  /** The last block of the slider: no limit. */
  fpsMax: 'MAX',
  /** Phones and tablets only: Varu swings by himself when a cat is close. Off unless chosen. */
  autoAttack: 'Atac automat',
  /** Phones only: shows the fps and a few numbers on the screen, for testing. */
  debugInfo: 'Date debug',
  /** Phones only: short vibration on dodge, hit and pick. */
  vibration: 'Vibrație',
  /** Phones only: opens the screen where the touch buttons are moved and resized. */
  touchButtons: 'Butoane',
  on: 'PORNIT',
  off: 'OPRIT',
  soundOn: 'PORNIT',
  soundOff: 'OPRIT',
  restart: 'Reia de la început',
  menu: 'Meniu principal',
  /** Shown on Restart / Menu after the first press: they throw the current run away. */
  confirm: 'Sigur? Apasă încă o dată',
  hint: '↑ ↓ alege   •   ← → volum / FPS   •   Enter confirmă   •   Esc continuă',
  /** Phones and tablets: no keys, so say how to tap. */
  hintTouch: 'Atinge un rând  •  atinge blocurile ca să schimbi volumul sau FPS-ul',
} as const;

/** What the fat cat says while waiting for Varu to finish his smoke break (one at random). Varu's own line comes from SMOKE_LINES. */
export const PAUSE_CAT_LINES = ['Mi-e foame.', 'Hai odată!', 'Miau?', '...'] as const;

/** The screen where the dodge roll button is moved (phones). */
export const BUTTON_EDIT_TEXT = {
  title: 'BUTOANELE TALE',
  help: 'Atinge un buton ca să-l alegi, apoi trage-l unde îți vine mai la îndemână',
  blocked: 'Nu se poate aici: e peste alt buton',
  size: (button: string, size: string): string => `${button}: ${size}`,
  sizeNames: { small: 'MIC', normal: 'NORMAL', big: 'MARE', huge: 'URIAȘ' },
  reset: 'Resetează tot',
  done: 'Gata',
  joystick: (fixed: boolean): string => `Joystick: ${fixed ? 'FIX' : 'PLUTITOR'}`,
  stickName: 'Joystick',
  names: { attack: 'Atac', spin: 'Învârte', throw: 'Aruncă', roll: 'Tumbă' },
  pause: 'Pauză',
  /** The pause menu row: has the player changed anything? */
  custom: 'PERSONALIZAT',
  default: 'IMPLICIT',
} as const;
