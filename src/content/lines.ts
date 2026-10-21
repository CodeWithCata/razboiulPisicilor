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
  /** v147: the stands boo when Federer is stunned. */
  boo: ['Buuuu!', 'Arbitruuu!', 'Nu e corect!', 'Ridică-te, Federer!'],
};

/**
 * What the fan says over its head while it winds up a throw (systems/FanThrowSystem.ts). `gift`: a normal pickup is on its way.
 * `bad`: a petard is (the fan "slipped"). Both are funny on purpose: the bad ones must not sound like a warning label.
 */
export const FAN_THROW_LINES = {
  gift: ['Ține, Varule!', 'Cadou de la tribună!', 'Prinde, campionule!', 'Mănâncă ceva, frate!', 'De la noi, pentru tine!'],
  curse: ['Ghinion de la tribună!', 'Ia de-aici, Varule!', 'Mâna mea a alunecat (nu prea)!', 'Cu dragoste, de la fani!', 'Ți-am adus ghinion!'],
  bad: ['Oops, mi-a scăpat!', 'Fugi, Varule!', 'Nu-i de la mine, jur!', 'Surpriză! (nu prea bună)', 'Aoleu, ce-am aruncat?!'],
} as const;

/** A cursed barrel breaks: the word over the purple cloud, and the line when the cloud catches Varu. */
export const CURSED_BARREL_WORDS = ['PUF! Fum violet!', 'Butoi blestemat!', 'Ce miroase a ghinion?!'];
export const CURSED_BARREL_LINES = ['Mustarul era blestemat!', 'Ai respirat ghinion!', 'Butoiul ți-a vrut răul!'];

/** The word when Varu dodged a cursed item the fans threw (the red ring was empty when it landed). */
export const CURSE_DODGE_WORDS = ['Ai scăpat!', 'Ratat!', 'Uf, pe lângă!', 'Norocosul!'];

/** The word over a petard when it lands and the fuse starts to hiss. */
export const PETARD_WORDS = ['ȘȘȘȘ...', 'TIC-TAC!', 'FÎÎÎȘ!'];

/** Said when a wave starts in rain (systems/Rain.ts via GameScene): the belt gets wet. */
export const RAIN_LINES = ['Plouă, miau!', 'Mi s-a udat cureaua!', 'Ploaie... și rugină!', 'Cureaua se udă...'];

/** The costly rewards (`systems/CostlyRewards.ts`): said over Varu when the price is paid. */
export const COSTLY_LINES = {
  crash: 'Crash de energie...',
  goo: 'Aurul s-a topit! Mâzgă!',
  overuse: 'Cureaua a ruginit de atâta învârtit!',
} as const;

/** Marți 13: the banner under the wave banner, and the line over Varu with each curse. */
export const MARTI_13_TEXT = { banner: 'MARȚI 13', line: 'Marți 13, Varule!' } as const;

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
  snail: 'Melc! Încet ca melcul...',
  dumbbell: 'Gantera! Cureaua-i grea!',
  emo: 'Emo! Gluga pe cap, inima frântă...',
  rusty: 'Cureaua ruginită! Scârțâie...',
  big: 'Varu cel Mare! Țintă ușoară!',
  smoke: 'Pauză de țigară!',
};

/** The word that pops up when the question mark opens: it is followed by the label of the pickup it turned into. */
export const MYSTERY_REVEAL_WORD = 'SURPRIZĂ!';

/** The word that pops up over Varu when the question mark gave a BAD pickup (the label of the bad pickup follows). */
export const BAD_LUCK_WORD = 'GHINION!';

/** Short names for the HUD timers. */
export const BUFF_NAMES: Record<BuffKind, string> = {
  lapte: 'Lapte',
  monster: 'Monster',
  goldenBelt: 'Cureaua de aur',
  laser: 'Laser',
  snail: 'Melc',
  dumbbell: 'Gantera',
  emo: 'Emo',
  rusty: 'Rugină',
  big: 'Mare',
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

/** What a hide-and-seek cat says when it jumps out of a bush or box and lands (a cheeky taunt for Varu). */
export const HIDEOUT_TAUNTS: readonly string[] = ['Bu!', 'Surpriză!', 'Ta-daaa!', 'Nu m-ai văzut, nu?', 'Hihi, m-ai prins?', 'Ai crezut că sunt acolo?', 'Sst... te-am văzut.'];

/** A cat that jumps out of a bed lands yawning and says one of these (Romanian, sleepy). */
export const HIDEOUT_SLEEPY_TAUNTS: readonly string[] = ['Mă las... încă 5 minute!', 'Hoaaah... ce-i gălăgia?', 'Mmm... încă puțin...', 'Cine mi-a stricat visul?'];

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
  lamp: ['DING!', 'CLANG!', 'BZZT!', 'FELINAR!'],
};

/** A cat slips on a mustard puddle and slides off spinning. */
export const SLIP_WORDS = ['ZBÂÂÂR!', 'ALUNECĂ!', 'WHEEE!', 'PATINEAZĂ!', 'MUȘTĂREALĂ!'] as const;

/** The mustard barrel burst open (its puddle is left behind). */
export const BARREL_DESTROY_WORDS = ['MUȘTAR DUPĂ PRÂNZ!', 'PLAF! MUȘTAR!', 'BARIL SPART!', 'GALBEN PESTE TOT!'] as const;

/** A street lamp was smashed (a new one rises at the next night). */
export const LAMP_DESTROY_WORDS = ['FELINAR DOBORÂT!', 'S-A STINS!', 'CLINC! ÎNTUNERIC!', 'LUMINA LA CAPĂT!'] as const;

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

/**
 * Dev-only cheat sheet (`pnpm dev`), grouped in blocks. `column` picks the left (0), middle (1) or right (2) side. Shown by ui/DebugPanel.ts.
 * `kind`: action = runs when pressed; toggle = shows PORNIT / OPRIT; choice = a picker (< value >) that runs with its value when pressed
 * (the options are in content/debugChoices.ts); cycle = a picker that only steps to its next value when pressed. `code` is the Phaser key name
 * (`keydown-<code>`); the digits 1-7 of the cat picker are handled apart.
 */
export type DebugRowKind = 'action' | 'toggle' | 'choice' | 'cycle';
export interface DebugRow {
  id: DebugId;
  key: string;
  code?: string;
  label: string;
  kind: DebugRowKind;
}
export interface DebugSection {
  title: string;
  column: 0 | 1 | 2;
  rows: readonly DebugRow[];
}
export const DEBUG_SECTIONS: readonly DebugSection[] = [
  {
    title: 'PISICI',
    column: 0,
    rows: [
      { id: 'spawnCat', key: '1-7', label: 'Spawnează pisică', kind: 'choice' },
      { id: 'spawnCount', key: '0', code: 'ZERO', label: 'Câte deodată', kind: 'cycle' },
      { id: 'spawnAt', key: '9', code: 'NINE', label: 'Apar la cursor', kind: 'toggle' },
      { id: 'hideout', key: 'R', code: 'R', label: 'Sare din tufă / cutie', kind: 'action' },
      { id: 'horde', key: 'X', code: 'X', label: 'Hoardă amestecată', kind: 'action' },
      { id: 'killAll', key: 'K', code: 'K', label: 'Omoară toate pisicile', kind: 'action' },
      { id: 'surrender', key: 'O', code: 'O', label: 'Pisicile se predau', kind: 'action' },
      { id: 'freeze', key: '\\', code: 'BACK_SLASH', label: 'Pisici înghețate', kind: 'toggle' },
    ],
  },
  {
    title: 'LABORATOR BOSS',
    column: 0,
    rows: [
      { id: 'boss', key: 'B', code: 'B', label: 'Boss (spawn)', kind: 'choice' },
      { id: 'bossDuel', key: '`', code: 'BACKTICK', label: 'DUEL boss nou', kind: 'action' },
      { id: 'bossAttack', key: 'F2', code: 'F2', label: 'Atac acum', kind: 'choice' },
      { id: 'bossLoop', key: 'F3', code: 'F3', label: 'Doar acest atac', kind: 'toggle' },
      { id: 'bossHp', key: 'F4', code: 'F4', label: 'Viața bossului', kind: 'choice' },
      { id: 'bossStun', key: 'F8', code: 'F8', label: 'Amețește bossul', kind: 'action' },
      { id: 'bossReport', key: 'Tab', code: 'TAB', label: 'Raport boss', kind: 'cycle' },
      { id: 'bossExport', key: 'F9', code: 'F9', label: 'Copiază raportul', kind: 'action' },
      { id: 'bossAuto', key: '·', label: 'Duel auto la start', kind: 'toggle' },
    ],
  },
  {
    title: 'RUNDĂ',
    column: 1,
    rows: [
      { id: 'jumpWave', key: '8', code: 'EIGHT', label: 'Sari la val', kind: 'choice' },
      { id: 'nextWave', key: 'L', code: 'L', label: 'Valul următor', kind: 'action' },
      { id: 'holdWaves', key: "'", code: 'QUOTES', label: 'Oprește valurile', kind: 'toggle' },
      { id: 'speed', key: '=', code: 'EQUALS', label: 'Viteza jocului', kind: 'cycle' },
      { id: 'score', key: 'J', code: 'J', label: '+500 scor', kind: 'action' },
      { id: 'victory', key: 'V', code: 'V', label: 'Ecranul de victorie', kind: 'action' },
    ],
  },
  {
    title: 'VREME ȘI MARȚI 13',
    column: 1,
    rows: [
      { id: 'weather', key: 'PgUp', code: 'PAGE_UP', label: 'Vremea acum', kind: 'choice' },
      { id: 'marti13', key: 'PgDn', code: 'PAGE_DOWN', label: 'Marți 13 (salt la val 13)', kind: 'action' },
    ],
  },
  {
    title: 'LUME',
    column: 1,
    rows: [
      { id: 'fanThrow', key: 'Q', code: 'Q', label: 'Fanul aruncă', kind: 'choice' },
      { id: 'crowd', key: 'Z', code: 'Z', label: 'Starea publicului', kind: 'choice' },
      { id: 'hitboxes', key: 'Y', code: 'Y', label: 'Hitbox-uri', kind: 'toggle' },
      { id: 'tileset', key: 'T', code: 'T', label: 'Descarcă tileset (PNG)', kind: 'action' },
    ],
  },
  {
    title: 'VARU',
    column: 2,
    rows: [
      { id: 'god', key: 'G', code: 'G', label: 'Nemurire', kind: 'toggle' },
      { id: 'heal', key: 'F', code: 'F', label: 'Viață plină', kind: 'action' },
      { id: 'setHp', key: '-', code: 'MINUS', label: 'Setează viața', kind: 'choice' },
      { id: 'teleport', key: '/', code: 'FORWARD_SLASH', label: 'Teleport la cursor', kind: 'action' },
      { id: 'pickup', key: 'P', code: 'P', label: 'Pickup lângă Varu', kind: 'choice' },
      { id: 'allBuffs', key: 'U', code: 'U', label: 'Toate power-up-urile', kind: 'action' },
      { id: 'cooldowns', key: 'C', code: 'C', label: 'Resetează cureaua', kind: 'action' },
    ],
  },
  {
    title: 'RECOMPENSE CARE COSTĂ',
    column: 2,
    rows: [
      { id: 'curseSure', key: 'Home', code: 'HOME', label: 'Zaruri mereu câștigă', kind: 'toggle' },
      { id: 'curseCooldown', key: 'End', code: 'END', label: 'Fără pauză de ghinion', kind: 'action' },
      { id: 'endBuff', key: 'Ins', code: 'INSERT', label: 'Termină power-up-ul', kind: 'choice' },
      { id: 'overuse', key: 'Del', code: 'DELETE', label: 'Rugină din abuz (6 învârtiri)', kind: 'action' },
    ],
  },
  {
    title: 'GHINION (?)',
    column: 2,
    rows: [
      { id: 'badLuck', key: '[', code: 'OPEN_BRACKET', label: 'Ghinion pe Varu', kind: 'choice' },
      { id: 'mysteryPrize', key: ']', code: 'CLOSED_BRACKET', label: 'Semnul ? dă', kind: 'choice' },
      { id: 'clearBad', key: ';', code: 'SEMICOLON', label: 'Scapă de ghinion', kind: 'action' },
    ],
  },
];
export const DEBUG_TEXT = {
  title: 'DEBUG',
  hide: 'I ascunde  •  click rând  •  < > sau , . schimbă',
  on: 'PORNIT',
  off: 'OPRIT',
  /** Live strip in the title bar: {fps} {cats} {wave} {hp} {max} {x} {y} are filled in. */
  stats: '{fps} fps  •  {cats} pisici  •  val {wave}  •  viață {hp}/{max}  •  Varu {x},{y}  •  {luck}',
  /** The luck part of the strip: {weather}, {cooldown} (seconds left, or `ready`), {ramp} (wave ramp, percent), {greed} (empty or ` lăcomie`). */
  luck: 'vreme {weather}  •  ghinion {cooldown} ×{ramp}%{greed}',
  luckReady: 'gata',
  weatherNames: { clear: 'senin', fog: 'ceață', rain: 'ploaie' },
  greed: ' lăcomie',
  /** Shown in the card's footer after a command (a picker adds its value after it). */
  done: {
    spawnCat: 'Pisică apărută',
    spawnCount: 'Câte deodată',
    spawnAt: 'Pisicile apar la cursor',
    horde: 'Hoardă! Miau!',
    killAll: 'Toate pisicile au căzut',
    surrender: 'Steag alb! Pisicile se predau',
    freeze: 'Pisicile stau pe loc',
    boss: 'Boss apărut',
    nextWave: 'Sărim la valul următor',
    jumpWave: 'Salt la val',
    holdWaves: 'Valurile stau pe loc',
    victory: 'Direct la final',
    score: '+500 scor',
    speed: 'Viteza jocului',
    god: 'Nemurire',
    heal: 'Varu e ca nou',
    setHp: 'Viața lui Varu',
    cooldowns: 'Cureaua e gata',
    allBuffs: 'Toate power-up-urile',
    pickup: 'Pickup lângă Varu',
    badLuck: 'Ghinion pe Varu',
    mysteryPrize: 'Semnul ? lângă Varu',
    clearBad: 'Ghinionul a trecut',
    weather: 'Vremea',
    marti13: 'Marți 13!',
    curseSure: 'Zaruri mereu câștigă (ghinionul aleatoriu nu mai ratează)',
    curseCooldown: 'Pauza de ghinion s-a terminat',
    endBuff: 'Power-up terminat',
    overuse: 'Cureaua e folosită la greu',
    teleport: 'Varu a sărit la cursor',
    crowd: 'Tribuna',
    fanThrow: 'Fanul aruncă',
    hitboxes: 'Hitbox-uri',
    tileset: 'Tileset descărcat',
    hideout: 'Pisica sare din tufă / cutie',
    bossDuel: 'Duel! Câmp curat, Varu plin de viață, boss nou',
    bossAttack: 'Atacul bossului',
    bossLoop: 'Bossul repetă doar atacul ales',
    bossHp: 'Viața bossului',
    bossStun: 'Bossul e amețit',
    bossReport: 'Raport boss',
    bossExport: 'Raport',
    bossAuto: 'Duel automat la începutul rundei',
  } satisfies Record<DebugId, string>,
  idle: 'Apasă o tastă sau dă click',
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
