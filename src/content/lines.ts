/** @file All other player-facing text: hit words, Varu lines, menu / HUD / pause / PWA / touch / debug texts, prop words. */
import type { BossType, BuffKind, EnemyType, PickupKind } from '../config/balance';
import type { ShoutKind } from '../config/crowd';
import type { DebugId } from '../config/debug';
import type { ObjectName } from '../config/arena';
import type { PropKind } from '../config/props';

/**
 * THE PERSONAL STUFF. Put your inside jokes and nicknames here.
 * Nothing else in the code needs to change.
 */
export const HIT_WORDS = ['MIAU!', 'BONK!', 'MIIIAUUU!', 'PFFT!', 'AUCH!'];

export const VARU_LINES = ['Ia de-aici!', 'Nu mai mănânci azi!', 'Încă una!', 'Cine-i următoarea?'];

/** The little line above Varu when he takes a drag of his cigarette (after food or an energy drink). */
export const SMOKE_LINES = ['Pufff...', 'Ahh, bună...', 'Pauză de țigară.', 'Fumez și plănuiesc.'];

/** The word when Varu lands his back flip (energy drink). */
export const BACKFLIP_WORDS = ['HOP!', 'BUF!', 'ACROBAT!', 'FLIP!'];

export const GAME_OVER_TITLE = 'Pisicile au câștigat';

/** One of these shows under the title on the game over screen. */
export const GAME_OVER_LINES = [
  'Varu a fost transformat în perna lor.',
  'Pisicile au cerut mâncare. Din nou.',
  'Centura nu a fost suficientă.',
  'Mâine ia revanșa.',
];

/** The word that pops under the wave number when a wave is cleared (ui/WaveFanfare.ts). Kablammo has ă â î ș ț. */
export const WAVE_FANFARE_LINES = ['CURĂȚAT!', 'ZDROBIT!', 'ÎNVINS!', 'GATA CU EI!'];
export const WAVE_CLEARED_LINES = ['Valul curățat!', 'Pisicile se retrag...', 'Hai că nu a fost greu!'];
/** What the cats in the stands shout (world/StandsCrowd.ts, `CROWD.shout`): a word floats up from a random fan on screen. Short: it shows for a second. */
export const CROWD_LINES: Record<ShoutKind, readonly string[]> = {
  cheer: ['Hai, Varule!', 'Dă-i cu cureaua!', 'Așa, frate!', 'Bagă-i!', 'Miau-miau-miau!'],
  roar: ['VA-RU! VA-RU!', 'Ole, ole, ole!', 'Bis! Bis!', 'Campionul!', 'Cureaua de aur!'],
  boss: ['Uuuu, ce pisică!', 'Aoleo, șefa!', 'Ține-te, Varule!', 'Ăsta e meciul!'],
  surrender: ['Hahaha, steag alb!', 'Fugi, fraiero!', 'Mamaaa, plec!', 'Ce rușine!'],
  gloom: ['Nuuu, Varule!', 'Ce păcat...', 'Revanșa mâine!', 'Aoleu...'],
};

/** Said when a wave starts in fog (systems/Fog.ts): the cats are still there, just hard to see. */
export const FOG_LINES = ['Se lasă ceața...', 'Unde-s pisicile?!', 'Nu mai văd nimic!', 'Ceață, miau!'];

/** "Predarea pisicilor" (config/balance.ts SURRENDER): what a cat says above its head while it raises the white flag (Effects). */
export const SURRENDER_LINES = [
  'Mă predau!',
  'Gata, plec la mama.',
  'Nu mai merită.',
  "Zi-i lu' Varu că a câștigat.",
  'Am uitat fierul de călcat pornit.',
  'Mă duc la mama, ea are crochete.',
  'Retragere strategică (fug).',
  'Steag alb, frate!',
];
/** Pisica Norocoasă (config/balance.ts LUCKY): the HUD banner when she appears, the words when she shows up and when she is caught, and what she shouts when she gets away. */
export const LUCKY_TEXT = { banner: 'Pisica Norocoasă! Prinde-o!', spawnWord: 'NOROC!', catchWord: 'JACKPOT!' };
export const LUCKY_ESCAPE_LINES = ['Pa, pa, bogaților!', 'Mă duc să-mi număr banii.', 'Nu mă prinzi, Varule!', 'Ne vedem la bancă!'];

/** The word under the wave number when the last cats gave up instead of being beaten (ui/WaveFanfare.ts). Kablammo has ă â î ș ț. */
export const WAVE_FANFARE_SURRENDER_LINES = ['S-AU PREDAT!', 'AU ZIS PAS!', 'PACE, FRATE!'];

/** Shown when Varu grabs a pickup. */
export const PICKUP_LABELS: Record<PickupKind, string> = {
  crochete: 'Crochete! +viață',
  lapte: 'Lapte! Viteză!',
  monster: 'Monster! Forță!',
  goldenBelt: 'CUREAUA DE AUR!',
  laser: 'Laser! Pisicile înnebunesc!',
  crow: 'PLOAIA DE CIORI!',
  mystery: 'Semn de întrebare... ce-o fi?',
};

/** The word that pops up when the question mark opens: it is followed by the label of the pickup it turned into. */
export const MYSTERY_REVEAL_WORD = 'SURPRIZĂ!';

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

/**
 * What a cat says by itself now and then (systems/CatChatter.ts), by cat type. Bosses have their own shouts.
 * >>> PLACEHOLDERS: swap in the real inside jokes and nicknames, nothing else needs to change.
 */
export const CAT_CHATTER: Record<Exclude<EnemyType, BossType>, readonly string[]> = {
  normal: ['Miau?', 'Am foame...', 'Ai crochete?', 'Eu doar mă plimb.', 'Frumoasă centură...', 'Mrrr.'],
  fat: ['Mai e mâncare?', 'Nu alerg. Rulez.', 'Încă o gustare...', 'Sunt pufos, nu gras.', 'Cine a mișcat farfuria?'],
  ninja: ['Nu mă vezi.', 'Sunt în spatele tău.', 'Tăcere...', 'Ninja, ninja!'],
  kamikaze: ['Banzai!', 'Zâmbește!', 'Fără regrete!', 'Am lăsat aragazul pornit...'],
  flying: ['Vin de sus!', 'Aer curat!', 'Cioara e prietena mea.', 'Fără taxe pe cer.'],
  lucky: ['Nu mă prinzi!', 'Fug cu banii!', 'Sunt norocoasă, nu proastă.', 'Prinde-mă dacă poți!'],
  tennis: ['Ace!', 'Mingea e în terenul tău.', 'Fault! Ba nu, e bine.', 'Servesc eu.', 'Zero la nimic!'],
};

/** What a cat says after another cat is thrown into it (pinball). Any cat type. */
export const CAT_BUMPED_LINES: readonly string[] = ['Ai grijă pe unde zbori!', 'Hei! Fără îmbrânceli!', 'Auch, prietene!', 'Locul meu!'];

/** The word that pops where a flung cat slams into another one. */
export const BUMP_WORDS = ['POC-POC!', 'BILIARD!', 'ȚAC!', 'EFECT!'];

/** The little word when Varu checks his belt or cracks his neck while nothing is happening (the cigarette drag has its own lines above). */
export const IDLE_HABIT_WORDS = {
  belt: ['Încă bună.', 'Ține.', 'Hm, uite-l.'],
  neck: ['CRÂC!', 'CRRÂC!', 'Ahh...'],
} as const;

/** The word where a ninja cat lands after a teleport (Kablammo, small). */
export const POOF_WORDS = ['POOF!', 'PUF!', 'FÎȘ!'];
export const CROW_SCREAM = 'CROAAA!';
/** Floating words when a tennis cat's lobbed ball lands (small, they come in bunches). */
export const BALL_LAND_WORDS = ['POC!', 'PLOC!', 'POC-POC!'];
export const CROW_MISS_LINES = ['...', 'Ce faci?', 'Hm.', 'Oops.'];

export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** Words that pop up when Varu's belt (or a blast, a ball, a cat) hits the arena: bushes, rocks, fences... Short and loud. */
export const PROP_WORDS: Record<PropKind, readonly string[]> = {
  bush: ['FÂȘ!', 'HRUȘ!', 'FOȘNET!', 'FRUNZE!'],
  rock: ['TOC!', 'DUR!', 'POC!'],
  box: ['TOC TOC!', 'BUF!', 'CARTON!', 'CINE-I?'],
  scratcher: ['ZGÂRÂ!', 'ZGRRR!', 'ȘTRENG!'],
  bed: ['BOING!', 'PUF!', 'MOALE!'],
  bedCushion: ['PUF!', 'FLUFF!', 'MOALE!'],
  fence: ['CRÂC!', 'DONG!', 'ȚĂC!', 'TRANC!'],
  cans: ['CLANG!', 'ZANG!', 'TRANC!', 'CONSERVĂ!'],
  ball: ['BOING!', 'HOP!', 'GOL!'],
  barrel: ['BONG!', 'PLOSC!', 'MUȘTAR!', 'GLUP!'],
};

/** A cat slips on a mustard puddle and slides off spinning. */
export const SLIP_WORDS = ['ZBÂÂÂR!', 'ALUNECĂ!', 'WHEEE!', 'PATINEAZĂ!', 'MUȘTĂREALĂ!'] as const;

/** The mustard barrel burst open (its puddle is left behind). */
export const BARREL_DESTROY_WORDS = ['MUȘTAR DUPĂ PRÂNZ!', 'PLAF! MUȘTAR!', 'BARIL SPART!', 'GALBEN PESTE TOT!'] as const;

/** A prop was smashed for good. */
export const PROP_DESTROY_WORDS: Record<ObjectName, readonly string[]> = {
  bush: ['PUF! S-A DUS!', 'TĂIAT!', 'FĂRÂMIȚAT!'],
  box: ['DEZASTRU!', 'CARTON ZDROBIT!', 'BUF!'],
  rock: ['BOLOVAN SPART!', 'PRĂFUIT!', 'CRAC-BUM!'],
  scratcher: ['ZGÂRIETURĂ FINALĂ!', 'RUPT!', 'TRĂSNIT!'],
  bed: ['PAT DISTRUS!', 'FLUFF!', 'NU MAI DORM!'],
  bedCushion: ['PERNĂ ZBURATĂ!', 'FLUFF!', 'PUF!'],
};

/** A rock just got a new crack. */
export const PROP_CRACK_WORDS = ['CRAC!', 'S-A SPART!', 'AI GRIJĂ!'] as const;

/** What props say or do by themselves (config/props.ts PROP_AMBIENT). */
export const PROP_AMBIENT_TEXT = {
  /** The cat in the box. */
  purr: ['mrr...?', 'miau?', 'cine-i?'],
  /** The letter that rises from a sleeping bed. */
  zzz: 'z',
} as const;

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
  /** A new version is downloaded and already active; the page reloads to show it. */
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
      { id: 'spawnCat', key: '1-7', label: 'Spawnează pisici (tipuri)' },
      { id: 'horde', key: 'X', label: 'Hoardă de pisici' },
      { id: 'killAll', key: 'K', label: 'Omoară toate pisicile' },
      { id: 'surrender', key: 'O', label: 'Pisicile se predau' },
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
      { id: 'crowd', key: 'Z', label: 'Tribuna: starea publicului' },
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
    surrender: 'Steag alb! Pisicile se predau',
    boss: 'Boss apărut',
    nextWave: 'Sărim la valul următor',
    victory: 'Direct la final',
    god: 'Nemurire',
    heal: 'Varu e ca nou',
    cooldowns: 'Cureaua e gata',
    allBuffs: 'Toate power-up-urile',
    pickup: 'Pickup lângă Varu',
    score: '+500 scor',
    crowd: 'Tribuna își schimbă starea',
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
