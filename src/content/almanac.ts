/** @file All the words of the almanac (title, labels, one entry per cat and pickup) and the stat lines of an entry, worked out from the game numbers so they never drift. */
import { ALMANAC_RARITY, ALMANAC_SPEED_BANDS, isCatId, type AlmanacId } from '../config/almanac';
import { BUFFS, ENEMIES, isBadPickup, PICKUPS, PICKUP_SPAWN, SMOKE_FREEZE, type BuffStats, type PickupKind } from '../config/balance';
import { ICE_CREAM } from '../config/iceCream';

export const ALMANAC_TEXT = {
  title: 'ALMANAHUL PISICILOR',
  back: 'Înapoi la meniu',
  menuButton: 'Almanah',
  found: (n: number, total: number): string => `Descoperite: ${n} / ${total}`,
  keys: 'Săgeți = alege  •  Esc = înapoi', // desktop only
  locked: { name: '???', blurb: 'Încă nu ai întâlnit-o. Joacă o rundă și o vei descoperi!', quote: '„...”' },
  labels: { hp: 'Viață', speed: 'Viteză', touch: 'Atingere', score: 'Scor', kind: 'Tip', duration: 'Durată', appears: 'Apare', effect: 'Efect' },
  values: {
    speed: ['foarte încet', 'încet', 'medie', 'rapidă', 'foarte rapidă'],
    noBite: 'nu mușcă',
    good: 'bun',
    bad: 'rău',
    surprise: 'surpriză',
    instant: 'instant',
    often: 'des',
    sometimes: 'uneori',
    rare: 'rar',
    onlyFromMystery: 'doar din ?',
  },
} as const;

export interface AlmanacEntry {
  name: string;
  /** What it is and what it does (about 2-4 short lines). */
  blurb: string;
  /** A line in its own voice, shown in quotes. */
  quote: string;
  /** Cats only: replaces the "touch damage" value (a kamikaze does not bite, it explodes). */
  touch?: string;
}

export const ALMANAC_ENTRIES: Record<AlmanacId, AlmanacEntry> = {
  normal: { name: 'Pisica Normală', blurb: 'Cea mai obișnuită pisică din arenă. Aleargă la Varu și îl zgârie. Doar atât știe, dar o face din tot sufletul.', quote: '„Nu-i nimic personal, Varule. E doar foame.”' },
  fat: { name: 'Pisica Grasă', blurb: 'Înceată, grea și foarte greu de împins. Ai nevoie de câteva lovituri bune ca s-o oprești.', quote: '„Am mâncat și porția vecinei. Și pe a vecinului.”' },
  ninja: { name: 'Pisica Ninja', blurb: 'Dispare în fum și apare lângă Varu. Cât timp e în fum, nu poate fi lovită.', quote: '„Nu m-ai văzut. Nici acum nu mă vezi.”' },
  kamikaze: { name: 'Pisica Kamikaze', blurb: 'Aleargă spre Varu, își aprinde fitilul și explodează în blană. Doboar-o cu cureaua înainte să se aprindă de tot.', quote: '„Dacă tot plec, plec cu zgomot!”', touch: 'explodează' },
  flying: { name: 'Pisica Zburătoare', blurb: 'Zboară peste ziduri și peste alte pisici. Aripile nu o fac mai simpatică, doar mai greu de ocolit.', quote: '„Gravitația e doar o părere.”' },
  tennis: { name: 'Pisica de Tenis', blurb: 'Stă la distanță și servește mingi de tenis. Cu cureaua poți trimite mingea înapoi.', quote: '„Cincisprezece la zero, Varule!”' },
  bomber: { name: 'Pisica Bombardier', blurb: 'Cea mai puternică pisică de mers pe jos. Ține distanța și aruncă petarde în Varu.', quote: '„Petardele sunt de la tribună. Eu doar le dau mai departe.”' },
  lucky: { name: 'Pisica Norocoasă', blurb: 'Rară și aurie. Nu mușcă, doar fuge. Prinde-o repede și primești un scor uriaș.', quote: '„Pa, pa, bogaților!”' },
  queen: { name: 'Regina Pisicilor', blurb: 'Prima șefă. Are coroană, sceptru și o gardă regală. Se învârte și își aruncă sceptrul.', quote: '„Înclinați-vă în fața Reginei!”' },
  mafia: { name: 'Pisica Emo', blurb: 'A doua șefă. Gluga pe cap, inima frântă și o grămadă de inimi frânte aruncate în Varu.', quote: '„Nimeni nu mă înțelege...”' },
  federer: { name: 'Federer', blurb: 'Șeful final. Joacă tenis, servește mingi și are chiar și un aparat care le aruncă.', quote: '„Nu-mi place să pierd. Nici la tenis, nici la pisici.”' },
  crochete: { name: 'Crochete', blurb: 'Te vindecă pe loc. Apare ca pachet, ca țigări sau ca vape, dar face mereu același lucru.', quote: '„Te vindecă. Plămânii au alte păreri.”' },
  lapte: { name: 'Lapte', blurb: 'Varu aleargă mai repede și lasă o dâră albă în urmă. Pisicile ar vrea și ele.', quote: '„Lapte pentru pisici, viteză pentru Varu.”' },
  monster: { name: 'Monster', blurb: 'Cureaua lovește mai tare. Varu e atât de entuziasmat că face un salt înapoi.', quote: '„Doar o cutie. Zici că ai zece.”' },
  goldenBelt: { name: 'Cureaua de aur', blurb: 'Lovituri mai grele, rază mai mare și o dâră lipicioasă. Apare garantat, la intervale.', quote: '„Mai strălucitoare decât orice pisică.”' },
  laser: { name: 'Laserul', blurb: 'Pisicile alergă după punctul roșu în loc să alerge după Varu. Se strâng toate în același loc.', quote: '„E doar un punct. Dar ce punct!”' },
  umbrella: { name: 'Umbrela', blurb: 'Oprește mingile, tragerile și petardele. Ploaia de mingi nu te mai ajunge.', quote: '„Plouă cu mingi? Nu și cu noi.”' },
  scooter: { name: 'Trotineta', blurb: 'Varu merge mai repede, iar pisicile (nu și șefii) care îl ating sunt date la o parte.', quote: '„Bip, bip! Faceți loc!”' },
  iceCream: { name: 'Înghețata', blurb: 'Îngheață pisicile din jur (nu și șefii) pe loc. Ele nu se mișcă, dar cureaua le lovește în continuare.', quote: '„Doar o înghețată. Pisicile n-au apucat să guste.”' },
  crow: { name: 'Ploaia de ciori', blurb: 'Câteva secunde cad ciori din cer, mai ales peste pisici. Nu-i rău să fii în apropiere.', quote: '„Cra! (Traducere: fugi.)”' },
  mystery: { name: 'Semnul întrebării', blurb: 'O surpriză: poate fi ceva bun sau ceva rău. Riști?', quote: '„Norocul e al celor curajoși. Ghinionul tot al lor.”' },
  snail: { name: 'Melcul', blurb: 'Ghinion! Varu merge târâș-grăbiș, mult mai încet decât de obicei.', quote: '„Încet, dar sigur. Mai mult încet.”' },
  dumbbell: { name: 'Gantera', blurb: 'Ghinion! Cureaua e grea și lovește la jumătate de forță.', quote: '„Prea grea pentru azi.”' },
  emo: { name: 'Emo', blurb: 'Ghinion! Varu nu are chef: loviturile și specialele merg mult mai încet.', quote: '„Nu am chef...”' },
  rusty: { name: 'Cureaua ruginită', blurb: 'Ghinion! Învârtita și aruncarea cureliei se reîncarcă mult mai greu.', quote: '„Scârț... scârț...”' },
  big: { name: 'Varu cel Mare', blurb: 'Ghinion! Varu crește, devine mai încet și e o țintă mai ușoară.', quote: '„Mare, dar nu și greu de nimerit.”' },
  smoke: { name: 'Pauza de țigară', blurb: 'Ghinion! Varu stă pe loc o secundă, cât ține o tragere.', quote: '„Doar un fum. Nu se supără nimeni, mai puțin pisicile.”' },
};

/** Short "effect" of a pickup, with the numbers taken from the game config. */
const EFFECTS: Record<PickupKind, string> = {
  crochete: `+${PICKUPS.crocheteHeal} viață`,
  lapte: `viteză ×${BUFFS.lapte.speed}`,
  monster: `forță ×${BUFFS.monster.damage}`,
  goldenBelt: `forță ×${BUFFS.goldenBelt.damage}`,
  laser: 'atrage pisicile',
  umbrella: 'oprește mingile',
  scooter: `viteză ×${BUFFS.scooter.speed}`,
  iceCream: `îngheață ${ICE_CREAM.freezeMs / 1000} s`,
  crow: 'ploaie de ciori',
  mystery: 'bun sau rău',
  snail: `viteză ×${BUFFS.snail.speed}`,
  dumbbell: `forță ×${BUFFS.dumbbell.damage}`,
  emo: 'lovituri lente',
  rusty: 'speciale lente',
  big: `mărime ×${BUFFS.big.size}`,
  smoke: `stă ${SMOKE_FREEZE.ms / 1000} s`,
};

export interface AlmanacStat {
  label: string;
  value: string;
}

const speedWord = (speed: number): string => {
  const v = ALMANAC_TEXT.values.speed;
  const bands = ALMANAC_SPEED_BANDS;
  if (speed < 70) return v[0];
  if (speed < bands[0]) return v[1];
  if (speed < bands[1]) return v[2];
  if (speed < bands[2]) return v[3];
  return v[4];
};

/** The four stat lines of an entry (two rows of two on the screen): a cat's health, speed, touch damage and score, or a pickup's type, duration, spawn rate and effect. */
export function almanacStats(id: AlmanacId): AlmanacStat[] {
  const L = ALMANAC_TEXT.labels;
  const V = ALMANAC_TEXT.values;
  if (isCatId(id)) {
    const s = ENEMIES[id];
    const touch = ALMANAC_ENTRIES[id].touch ?? (s.contactDamage > 0 ? String(s.contactDamage) : V.noBite);
    return [
      { label: L.hp, value: String(s.hp) },
      { label: L.speed, value: speedWord(s.speed) },
      { label: L.touch, value: touch },
      { label: L.score, value: String(s.score) },
    ];
  }
  const buff = (BUFFS as Record<string, BuffStats | undefined>)[id];
  const weight = PICKUP_SPAWN.weights[id];
  const appears = weight <= 0 ? V.onlyFromMystery : weight >= ALMANAC_RARITY.often ? V.often : weight >= ALMANAC_RARITY.sometimes ? V.sometimes : V.rare;
  return [
    { label: L.kind, value: id === 'mystery' ? V.surprise : isBadPickup(id) ? V.bad : V.good },
    { label: L.duration, value: buff ? `${buff.durationMs / 1000} s` : V.instant },
    { label: L.appears, value: appears },
    { label: L.effect, value: EFFECTS[id] },
  ];
}
