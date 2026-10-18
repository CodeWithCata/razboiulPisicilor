import type { BuffKind, PickupKind } from '../config/balance';
import type { DebugId } from '../config/debug';

/**
 * THE PERSONAL STUFF. Put your inside jokes and nicknames here.
 * Nothing else in the code needs to change.
 */
export const HIT_WORDS = ['MIAU!', 'BONK!', 'MIIIAUUU!', 'PFFT!', 'AUCH!'];

export const VARU_LINES = ['Ia de-aici!', 'Nu mai mănânci azi!', 'Încă una!', 'Cine-i următoarea?'];

/** The little line above Varu when he takes a drag of his cigarette (after food or an energy drink). */
export const SMOKE_LINES = ['Pufff...', 'Ahh, bună...', 'Pauză de țigară.', 'Fumez și plănuiesc.'];

export const GAME_OVER_TITLE = 'Pisicile au câștigat';

/** One of these shows under the title on the game over screen. */
export const GAME_OVER_LINES = [
  'Varu a fost transformat în perna lor.',
  'Pisicile au cerut mâncare. Din nou.',
  'Centura nu a fost suficientă.',
  'Mâine ia revanșa.',
];

export const WAVE_CLEARED_LINES = ['Valul curățat!', 'Pisicile se retrag...', 'Hai că nu a fost greu!'];

/** Shown when Varu grabs a pickup. */
export const PICKUP_LABELS: Record<PickupKind, string> = {
  crochete: 'Crochete! +viață',
  lapte: 'Lapte! Viteză!',
  monster: 'Monster! Forță!',
  goldenBelt: 'CUREAUA DE AUR!',
  laser: 'Laser! Pisicile înnebunesc!',
  crow: 'PLOAIA DE CIORI!',
};

/** Short names for the HUD timers. */
export const BUFF_NAMES: Record<BuffKind, string> = {
  lapte: 'Lapte',
  monster: 'Monster',
  goldenBelt: 'Cureaua de aur',
  laser: 'Laser',
};

/** HUD labels for the belt specials. `key` is the desktop key shown on the cooldown badge. */
export const BELT_LABELS = {
  spin: { key: 'Shift', name: 'Învârtită' },
  throw: { key: 'E', name: 'Aruncă' },
} as const;

export const CROW_SCREAM = 'CROAAA!';
export const CROW_MISS_LINES = ['...', 'Ce faci?', 'Hm.', 'Oops.'];

export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** Endless mode (unlocked by winning). */
export const ENDLESS_TEXT = {
  hud: 'infinit', // HUD: "Valul 16 · infinit"
  banner: 'MOD INFINIT', // shown with the first wave
  unlockedMenu: 'Mod infinit',
  victoryButton: 'Enter = mod infinit',
  menuButton: 'Enter = mod infinit',
  gameOverTitle: 'Mod infinit',
} as const;

/** The main menu (scenes/MenuScene.ts). */
export const MENU_TEXT = {
  titleTop: 'VARU',
  titleVs: 'vs.',
  titleBottom: 'PISICILE',
  start: 'Click sau orice tastă',
  record: 'Record',
  recordEndless: 'Infinit',
  keys: 'N = sunet  •  Esc = pauză', // desktop only
} as const;

/** Installing the game as an app and offline play (ui/PwaUi.ts). */
export const PWA_TEXT = {
  install: 'Instalează jocul',
  /** iPhone / iPad have no install button: the player has to use the Share menu of Safari. */
  iosHint: 'Apasă Partajează (pătrățelul cu săgeată), apoi „Adaugă pe ecranul principal”.',
  offlineReady: 'Gata! Acum merge și fără internet 🐱',
  /** A new version is downloaded and waiting. */
  update: 'Versiune nouă: apasă ca să actualizezi',
} as const;

/** Touch controls (phones and tablets). */
export const TOUCH_TEXT = {
  attack: 'Lovește',
  spin: 'Învârte',
  throw: 'Aruncă',
  moveHint: 'MIȘCARE',
  /** Shown in the laser tap zone until the first tap. */
  laserHint: 'Atinge aici ca să pui laserul',
  start: 'Atinge ecranul ca să începi',
  help: 'stânga: mișcare  •  dreapta: lovește / învârte / aruncă',
  /** The help line when auto-attack is switched on in the pause menu. */
  helpAuto: 'stânga: mișcare  •  Varu lovește singur  •  dreapta: învârte / aruncă',
} as const;

/** The prompts on the game over and victory screens (keyboard version and touch version). */
export const END_SCREEN_TEXT = {
  again: 'Click sau R = din nou',
  menu: 'M = meniu',
  againTouch: 'Atinge ecranul = din nou',
  menuTouch: 'Meniu',
} as const;

/** HUD texts that are not tied to one thing. */
export const HUD_TEXT = {
  /** The key that hides the controls reminder, and the labels on its little button. */
  hideKey: 'H',
  hideControls: 'ascunde controalele',
  showControls: 'arată controalele',
  helpKeyboard: 'WASD mișcare  •  mouse țintește  •  click lovește  •  Shift învârtește  •  E aruncă  •  Esc pauză  •  N sunet',
} as const;

/** Dev-only cheat sheet (`pnpm dev`), grouped in blocks. `column` picks the left (0) or right (1) side; `toggle` rows show PORNIT / OPRIT. Shown by ui/DebugPanel.ts. */
export interface DebugRow {
  id: DebugId;
  key: string;
  label: string;
  toggle?: boolean;
}
export interface DebugSection {
  title: string;
  column: 0 | 1;
  rows: readonly DebugRow[];
}
export const DEBUG_SECTIONS: readonly DebugSection[] = [
  {
    title: 'PISICI',
    column: 0,
    rows: [
      { id: 'spawnCat', key: '1-5', label: 'Spawnează pisici (tipuri)' },
      { id: 'horde', key: 'X', label: 'Hoardă de pisici' },
      { id: 'killAll', key: 'K', label: 'Omoară toate pisicile' },
      { id: 'boss', key: 'B', label: 'Următorul boss' },
    ],
  },
  {
    title: 'RUNDĂ',
    column: 0,
    rows: [
      { id: 'nextWave', key: 'L', label: 'Valul următor' },
      { id: 'victory', key: 'V', label: 'Ecranul de victorie' },
      { id: 'score', key: 'J', label: '+500 scor' },
    ],
  },
  {
    title: 'VARU',
    column: 1,
    rows: [
      { id: 'god', key: 'G', label: 'Nemurire', toggle: true },
      { id: 'heal', key: 'F', label: 'Viață plină' },
      { id: 'cooldowns', key: 'C', label: 'Resetează cureaua' },
      { id: 'allBuffs', key: 'U', label: 'Toate power-up-urile' },
      { id: 'pickup', key: 'P', label: 'Următorul pickup' },
    ],
  },
  {
    title: 'LUME',
    column: 1,
    rows: [
      { id: 'hitboxes', key: 'Y', label: 'Hitbox-uri', toggle: true },
      { id: 'tileset', key: 'T', label: 'Descarcă tileset-ul (PNG)' },
    ],
  },
];
export const DEBUG_TEXT = {
  title: 'DEBUG',
  hide: 'I = ascunde / arată',
  on: 'PORNIT',
  off: 'OPRIT',
  /** Live strip in the title bar: {fps} {cats} {wave} are filled in. */
  stats: '{fps} fps  •  {cats} pisici  •  val {wave}',
  /** Shown in the card's footer after a command. */
  done: {
    spawnCat: 'Pisică apărută!',
    horde: 'Hoardă! Miau!',
    killAll: 'Toate pisicile au căzut',
    boss: 'Boss apărut',
    nextWave: 'Sărim la valul următor',
    victory: 'Direct la final',
    god: 'Nemurire',
    heal: 'Varu e ca nou',
    cooldowns: 'Cureaua e gata',
    allBuffs: 'Toate power-up-urile',
    pickup: 'Pickup lângă Varu',
    score: '+500 scor',
    hitboxes: 'Hitbox-uri',
    tileset: 'Tileset descărcat',
  } satisfies Record<DebugId, string>,
  idle: 'Apasă o tastă',
} as const;

/** The fps / debug card on phones (ui/PerfPanel.ts). Kept short and plain: it is only for testing. */
export const PERF_TEXT = {
  waiting: 'așteaptă date…',
  fps: 'FPS {fps}',
  frame: 'cadru {avg} ms  (min {min}, max {max})',
  slow: 'cadre lente (>{limit} ms): {slow}/{frames}',
  walk: 'mers: {stalled}/{walk} cadre blocate',
  step: 'pas {avg} px  (max {max})',
  world: 'pisici {cats}  •  mingi {balls}',
  screen: '{renderer}  {w}x{h}  dpr {dpr}  {fullscreen}',
  fullscreenOn: 'fullscreen',
  fullscreenOff: 'în pagină',
} as const;
