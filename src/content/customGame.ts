/** @file All the words of the custom game (Romanian): the menu button, the setup screen (tabs, every row and its choices, presets, buttons, problems), the HUD tag and the end screen texts. */
import { CUSTOM_ROWS, type CustomPresetId, type CustomProblem, type CustomRowId, type CustomTabId } from '../config/customGame';

/** What the setup screen shows for one row: its name, a one-line hint and one label per choice (same length and order as the row's `values`). */
export interface CustomRowText {
  name: string;
  hint: string;
  labels: readonly string[];
}

/** One label per value of a row, made from the value itself, so the list can never be shorter or longer than `values`. */
const labelsOf = (id: CustomRowId, label: (value: number) => string): string[] => CUSTOM_ROWS[id].values.map(label);

/** How many cats of one kind (the same five choices for every cat row). */
const AMOUNT = ['Deloc', 'Puține', 'Normal', 'Multe', 'Potop'] as const;
const bossWave = (value: number): string => (value === 0 ? 'Oprit' : `Valul ${value}`);
const BOSS_WHEN = 'În ce val vine prima dată';

const ROWS: Record<CustomRowId, CustomRowText> = {
  // ---- Pisici ----
  catNormal: { name: 'Pisici obișnuite', hint: 'Cele care aleargă drept la Varu', labels: AMOUNT },
  catFat: { name: 'Pisici grase', hint: 'Lente, uriașe, greu de doborât', labels: AMOUNT },
  catNinja: { name: 'Pisici ninja', hint: 'Dispar și apar în spatele lui', labels: AMOUNT },
  catKamikaze: { name: 'Pisici kamikaze', hint: 'Aleargă și explodează', labels: AMOUNT },
  catFlying: { name: 'Pisici zburătoare', hint: 'Dau roată și aruncă ghemuri', labels: AMOUNT },
  catTennis: { name: 'Pisici de tenis', hint: 'Servesc mingi pe care le poți întoarce', labels: AMOUNT },
  catBomber: { name: 'Pisici bombardier', hint: 'Aruncă petarde', labels: AMOUNT },
  pace: { name: 'Ritmul', hint: 'Cum se schimbă mulțimea de la primul val la ultimul', labels: ['Constant', 'Crește', 'Brutal'] },
  // ---- Bossi ----
  bossQueen: { name: 'Regina Pisicilor Ioana', hint: BOSS_WHEN, labels: labelsOf('bossQueen', bossWave) },
  bossMafia: { name: 'AnatasYOU', hint: BOSS_WHEN, labels: labelsOf('bossMafia', bossWave) },
  bossFederer: { name: 'Simona Miaulep', hint: BOSS_WHEN, labels: labelsOf('bossFederer', bossWave) },
  bossRepeat: {
    name: 'Se întorc',
    hint: 'Un boss care a venit poate reveni',
    labels: labelsOf('bossRepeat', (value) => (value === 0 ? 'Doar o dată' : `La fiecare ${value} valuri`)),
  },
  bossCrowd: { name: 'Pisici cu bossul', hint: 'Câte pisici obișnuite vin odată cu el', labels: ['Niciuna', 'Puține', 'Multe', 'Toate'] },
  bossHp: { name: 'Viața bossilor', hint: 'Cât de greu cad', labels: ['Fragili', 'Mai slabi', 'Normal', 'Duri', 'Tancuri'] },
  bossPace: { name: 'Ritmul bossilor', hint: 'Cât de repede atacă din nou', labels: ['Leneși', 'Mai lenți', 'Normal', 'Mai repezi', 'Furioși'] },
  // ---- Reguli ----
  waves: {
    name: 'Număr de valuri',
    hint: 'Câte valuri ai de ținut ca să câștigi',
    labels: labelsOf('waves', (value) => (value === 0 ? 'Infinit' : String(value))),
  },
  upgrades: {
    name: 'Alegi o îmbunătățire',
    hint: 'Când poți întări cureaua',
    labels: labelsOf('upgrades', (value) => (value === 0 ? 'Niciodată' : value === 1 ? 'După fiecare val' : `După ${value} valuri`)),
  },
  damage: { name: 'Loviturile primite', hint: 'Cât de tare te lovesc pisicile', labels: ['Moi', 'Ușoare', 'Normale', 'Dure', 'Cumplite'] },
  heal: { name: 'Vindecare', hint: 'Cât te îndreaptă un val terminat și un pachet de Carpați', labels: ['Puțină', 'Normală', 'Multă', 'Foarte multă'] },
  pickups: { name: 'Bonusuri', hint: 'Cât de des apar pe jos', labels: ['Rare', 'Normale', 'Dese', 'Ploaie'] },
  curses: { name: 'Ghinion', hint: 'Șansa de blesteme și de surprize rele', labels: ['Deloc', 'Rar', 'Normal', 'Des'] },
  catHp: { name: 'Viața pisicilor', hint: 'Câte lovituri duc', labels: ['Fragile', 'Mai slabe', 'Normale', 'Tari', 'Tancuri'] },
  catSpeed: { name: 'Viteza pisicilor', hint: 'Cât de repede aleargă', labels: ['Leneșe', 'Normale', 'Iuți', 'Fulger'] },
};

const TABS: Record<CustomTabId, string> = { quick: 'Rapid', cats: 'Pisici', bosses: 'Bossi', rules: 'Reguli' };

const PRESETS: Record<CustomPresetId, { name: string; blurb: string }> = {
  bossRush: { name: 'Doar bossi', blurb: 'Cei trei bossi, unul după altul. Nicio pisică mică.' },
  invasion: { name: 'Invazie', blurb: 'Zece valuri de pisici, tot mai multe și mai felurite. Fără bossi.' },
  chill: { name: 'Relaxare', blurb: 'Puține pisici, viață multă, zero ghinion. Vine doar Regina Ioana.' },
  chaos: { name: 'Haos', blurb: 'Infinit, de toate și bossi care tot revin. Mult noroc!' },
};

const PROBLEMS: Record<CustomProblem, string> = {
  nothing: 'Nu ai nicio pisică și niciun boss. Alege măcar unul.',
  noCatsForever: 'Fără pisici, fără sfârșit și bossii vin o singură dată: valurile ar fi goale.',
};

/** Everything the custom game says. The numbers behind the choices are in `config/customGame.ts`, the layout in `config/customScreen.ts`. */
export const CUSTOM_TEXT = {
  /** The main menu button: the name, a short blurb and (computers only) the key. */
  menu: { button: 'Joc personalizat', blurb: 'Faci tu regulile', key: '(tasta C)' },
  /** Title of the setup screen. */
  title: 'Joc personalizat',
  tabs: TABS,
  rows: ROWS,
  presets: PRESETS,
  buttons: { back: 'Înapoi', random: 'Aleatoriu', reset: 'Resetează', play: 'JOACĂ' },
  problems: PROBLEMS,
  /** Flashes on a preset card when it is applied. */
  applied: 'aplicat',
  /** The key reminders under the tabs (computers only): for the pages with rows, and for the quick page. */
  keysRows: 'Sus / Jos = rând  •  Stânga / Dreapta = schimbă  •  Tab = pagina următoare  •  Enter = joacă  •  Esc = înapoi',
  keysQuick: 'Stânga / Dreapta = alege  •  Spațiu = aplică  •  Tab = pagina următoare  •  Enter = joacă  •  Esc = înapoi',
  /** In the run. */
  hudTag: 'Personalizat',
  banner: 'JOC PERSONALIZAT',
  /** "Valul 4 / 10", or just "Valul 4" when the game has no last wave. */
  hudWave: (wave: number, final: number | null): string => (final === null ? `Valul ${wave}` : `Valul ${wave} / ${final}`),
  /** The end screen after a won custom run. */
  winTitle: 'AI CÂȘTIGAT!',
  winLine: 'Ai ținut toate valurile!',
  /** Small line on the end screen of any custom run (like the endless mode's). */
  gameOverTag: 'Joc personalizat',
  /** The end screen's way back to the setup screen: computers (key) and phones (tap). */
  editRules: 'Enter = schimbă regulile',
  editRulesTouch: 'Schimbă regulile',
  /** The run's difficulty (the name shows in the run summary on the end screens). */
  difficultyName: 'Personalizat',
  difficultyBlurb: 'Regulile tale',
} as const;
