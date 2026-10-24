/** @file All the words of the almanac (title, labels, one entry per cat and pickup) and the stat lines of an entry, worked out from the game numbers so they never drift. */
import { ALMANAC_RARITY, ALMANAC_SPEED_BANDS, isCatId, type AlmanacId } from '../config/almanac';
import { BUFF_STACKS } from '../config/buffStacks';
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
  normal: { name: 'Pisica Normală', blurb: 'Cea mai obișnuită pisică din campus. Aleargă la Varu și îl zgârie. Doar atât știe, dar o face din tot sufletul. Zice că a intrat cu acordul Păzii.', quote: '„Mau mi-a zis să te lovesc. Sau invers?”' },
  fat: { name: 'Pisica Grasă', blurb: 'Înceată, grea și foarte greu de împins. Ai nevoie de câteva lovituri bune ca s-o oprești. Nu aleargă, se rostogolește, și nu-i place să râzi de ea.', quote: '„Nu râde de mine că sunt gras.”' },
  ninja: { name: 'Pisica Ninja', blurb: 'Dispare în fum și apare lângă Varu. Cât timp e în fum, nu poate fi lovită. Se ascunde bine, dar tot îl strigă pe Varu „majestate”.', quote: '„Și cu ninja cum rămâne, majestate?”' },
  kamikaze: { name: 'Pisica Kamikaze', blurb: 'Aleargă spre Varu, își aprinde fitilul și explodează. Doboară-o cu cureaua înainte să se aprindă de tot. Glumele ei sunt de prost gust, dar explozia e reală.', quote: '„Boom! Am lovit al doilea turn.”', touch: 'explodează' },
  flying: { name: 'Pisica Zburătoare', blurb: 'Zboară peste ziduri și peste alte pisici, deci nu o poți evita pe jos. Aripile nu o fac mai simpatică, doar mai greu de ocolit. Cu ciorile se înțelege de minune.', quote: '„Ciorile sunt prietenele mele.”' },
  tennis: { name: 'Pisica de Tenis', blurb: 'Stă la distanță și servește mingi de tenis. Cu cureaua poți trimite mingea înapoi. S-a antrenat toată viața în campus și se vede, mai ales la serviciu.', quote: '„M-am antrenat toată viața la tenis, în campus.”' },
  bomber: { name: 'Pisica Bombardier', blurb: 'Cea mai puternică pisică de mers pe jos. Ține distanța și aruncă petarde în Varu. Zice că a bubuit un bloc odată și că nu se oprește aici.', quote: '„Am bubuit blocul de la școala 2. Și o să te bubui și pe tine.”' },
  lucky: { name: 'Pisica Norocoasă', blurb: 'Rară și aurie. Nu mușcă, doar fuge cu banii. Prinde-o repede și primești un scor uriaș. Se zice că știe codul de la seiful lui tata.', quote: '„Codul de la seif este...”' },
  queen: { name: 'Regina Pisicilor Ioana', blurb: 'Prima șefă, regina campusului (zice ea). Are coroană, sceptru și o gardă regală. Se învârte și își aruncă sceptrul. Nu ia în serios un băiețel blond.', quote: '„Cum mă poate învinge un copil ca tine? Nici nu știi derivata a doua.”' },
  mafia: { name: 'AnatasYOU', blurb: 'A doua șefă. Gluga pe cap, inima frântă și o grămadă de inimi frânte aruncate în Varu. Suferă de când i-au furat furnicile un cartof.', quote: '„Mai bine mi se lua viața. Niște furnici mi-au furat un cartof.”' },
  federer: { name: 'Simona Miaulep', blurb: 'Șeful final. Joacă tenis, servește mingi și are chiar și un aparat care le aruncă. Dă ordine ca o împărăteasă, până vede cureaua.', quote: '„Nimeni nu m-a învins la o partidă de tenis. Apleacă-te în fața mea, sclavule.”' },
  crochete: { name: 'Carpați', blurb: 'Carpați, nu Carpații Meridionali, ci cei pe care îi fumează șobolanii și tații care au trecut prin al doilea divorț! Te vindecă pe loc.', quote: '„Te vindecă. Plămânii au alte păreri.”' },
  lapte: { name: 'Lapte', blurb: 'Varu aleargă mai repede și lasă o dâră albă în urmă. Pisicile ar vrea și ele, dar laptele e doar pentru băieți blonzi.', quote: '„Lapte pentru pisici, viteză pentru Varu.”' },
  monster: { name: 'Monster', blurb: 'Cureaua lovește mai tare, iar Varu e atât de entuziasmat că face un salt înapoi. Cu cât bei mai multe, cu atât lovești mai tare. Și cazi mai tare după.', quote: '„Doar o cutie. Zici că ai zece.”' },
  goldenBelt: { name: 'Cureaua de aur', blurb: 'Lovituri mai grele, rază mai mare și o dâră lipicioasă. Apare garantat, la intervale. Varu zice că e cureaua lui cea bună.', quote: '„Cu cureaua mea bună.”' },
  laser: { name: 'Laserul', blurb: 'Pisicile aleargă după punctul roșu în loc să alerge după Varu. Se strâng toate în același loc. Nu e vrajă, doar fizică.', quote: '„E doar un punct. Dar ce punct!”' },
  umbrella: { name: 'Umbrela', blurb: 'Oprește mingile, tragerile și petardele, iar petardele se întorc la cine le-a aruncat. Ploaia de mingi nu te mai ajunge.', quote: '„Plouă cu mingi? Nu și cu noi.”' },
  scooter: { name: 'Trotineta', blurb: 'Varu merge mai repede, iar pisicile (nu și șefii) care îl ating sunt date la o parte. Pe trotinetă, campusul pare mai mic.', quote: '„Bip, bip! Faceți loc, vine Varu!”' },
  iceCream: { name: 'Înghețata', blurb: 'Îngheață pisicile din jur (nu și șefii) pe loc. Ele nu se mișcă, dar cureaua le lovește în continuare. Pisicile n-au apucat să guste.', quote: '„Doar o înghețată. Pisicile n-au apucat să guste.”' },
  crow: { name: 'Ploaia de ciori', blurb: 'Câteva secunde cad ciori din cer, mai ales peste pisici. Ciorile sunt prietenele pisicilor zburătoare, dar azi sunt de partea ta.', quote: '„Cra! (Traducere: fugi.)”' },
  mystery: { name: 'Semnul întrebării', blurb: 'O surpriză: poate fi ceva bun sau ceva rău. Riști? Ca la zar: poate dă 6-6, poate nu.', quote: '„Norocul e al celor curajoși. Ghinionul tot al lor.”' },
  snail: { name: 'Melcul', blurb: 'Ghinion! Varu merge târâș-grăbiș, mult mai încet decât de obicei. Acasă ar ajunge la anul.', quote: '„Încet, dar sigur. Mai mult încet.”' },
  dumbbell: { name: 'Gantera', blurb: 'Ghinion! Cureaua e grea și lovește la jumătate de forță. Nici Varu nu știe de ce a luat-o.', quote: '„Prea grea pentru azi.”' },
  emo: { name: 'Emo', blurb: 'Ghinion! Varu nu are chef: loviturile și specialele merg mult mai încet. Îl lovește dorul de acasă și de Mau.', quote: '„Mi-e dor. Mi-e foarte dor.”' },
  rusty: { name: 'Cureaua ruginită', blurb: 'Ghinion! Învârtita și aruncarea curelei se reîncarcă mult mai greu. Cureaua bună nu mai e chiar bună.', quote: '„Scârț... scârț...”' },
  big: { name: 'Varu cel Mare', blurb: 'Ghinion! Varu crește, devine mai încet și e o țintă mai ușoară. Pisicile nu mai trebuie să țintească.', quote: '„Mare, dar nu și greu de nimerit.”' },
  smoke: { name: 'Pauza de țigară', blurb: 'Ghinion! Varu stă pe loc o secundă, cât ține o tragere. Pisicile profită, ca de obicei.', quote: '„Doar un fum. Nu se supără nimeni, mai puțin pisicile.”' },
};

/** Short "effect" of a pickup, with the numbers taken from the game config. */
const EFFECTS: Record<PickupKind, string> = {
  crochete: `+${PICKUPS.crocheteHeal} viață`,
  lapte: `viteză ×${BUFFS.lapte.speed}`,
  monster: `forță ×${BUFFS.monster.damage}, până la ×${BUFF_STACKS.monster?.damage[BUFF_STACKS.monster.max - 1] ?? BUFFS.monster.damage} (strânge-le: x${BUFF_STACKS.monster?.max ?? 1})`,
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
