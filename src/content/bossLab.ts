/** @file Dev-only boss lab texts: verdict words, the reasons, what spoils a duel, and the formatters for the live panel, the scoreboard and the copied report. */
import { BOSS_TYPES } from '../config/balance';
import { BOSS_LAB } from '../config/debug';
import type { DebugId } from '../config/debug';
import type { LogMode } from '../core/bossLog';
import { summarizeBook, type FightReport, type FlagCode, type VerdictLabel } from '../core/bossVerdict';
import { BOSS_TEXT } from './bosses';

export const BOSS_LAB_TEXT = {
  title: 'LABORATOR BOSS',
  verdict: { balanced: 'ECHILIBRAT', boring: 'PLICTISITOR', brutal: 'PREA DUR', mixed: 'AMESTECAT', unclear: 'prea puțin' } satisfies Record<VerdictLabel, string>,
  /** Why: one line per reason, saying what to look at in config/bosses.ts. */
  flags: {
    tooEasy: 'Varu a pierdut aproape nimic: bossul nu lovește destul',
    downtime: 'Prea multe pauze între atacuri (cooldown / recover)',
    slowPace: 'Prea puține atacuri pe minut',
    narrow: 'Prea puține feluri de atacuri folosite',
    dominant: 'Un singur atac revine mereu',
    toothless: 'Atacuri care nu lovesc niciodată (prea ușor de ocolit)',
    drag: 'Lupta se lungește fără pericol',
    stunlock: 'Prea mult timp amețit (se poate bloca)',
    lostEarly: 'Varu a pierdut devreme sau bossul era aproape intact',
    tooHarsh: 'Varu a pierdut aproape toată viața',
    unfair: 'Un atac lovește aproape mereu (prea greu de ocolit)',
    relentless: 'Aproape nicio pauză între atacuri',
  } satisfies Record<FlagCode, string>,
  modes: { intro: 'intrare', idle: 'circulă', telegraph: 'avertizează', active: 'atacă', recover: 'se odihnește', stunned: 'amețit' } satisfies Record<LogMode, string>,
  /** The cheats that spoil a duel (it then stays out of the scoreboard). `on`/speed cases are decided in systems/BossLab.ts. */
  taint: {
    god: 'nemurire',
    freeze: 'pisici înghețate',
    speed: 'viteza jocului',
    heal: 'viață plină din cheat',
    setHp: 'viața lui Varu setată',
    teleport: 'teleport',
    allBuffs: 'power-up-uri din cheat',
    pickup: 'pickup din cheat',
    badLuck: 'ghinion din cheat',
    mysteryPrize: 'semn ? din cheat',
    clearBad: 'ghinion șters',
    endBuff: 'power-up terminat din cheat',
    weather: 'vreme din cheat',
    curseSure: 'zaruri mereu câștigă',
    overuse: 'rugină din cheat',
    cooldowns: 'cureaua resetată',
    fanThrow: 'fanul din cheat',
    spawnCat: 'pisici extra',
    horde: 'hoardă',
    hideout: 'pisică extra',
    bossAttack: 'atac forțat',
    bossLoop: 'un singur atac',
    bossHp: 'viața bossului schimbată',
    bossStun: 'amețit din cheat',
  } satisfies Partial<Record<DebugId, string>>,
  live: { waiting: 'Niciun boss pe teren.\nApasă ` (DUEL) ca să începi.', last: 'ultimul duel', provisional: 'provizoriu', dirty: 'Murdar (nu intră în clasament): ', won: 'VICTORIE', lost: 'ÎNVINS' },
  book: { title: 'CLASAMENT BOSSI', empty: 'niciun duel curat încă', need: 'încă un duel', skipped: 'lăsate deoparte: {n} (cheat-uri / prea scurte)' },
  exported: { copied: 'raport copiat', console: 'raport în consolă' },
  noBoss: 'niciun boss pe teren',
  noAttack: 'bossul nu poate face atacul acum',
} as const;

const T = BOSS_LAB_TEXT;
const pct = (v: number): string => `${Math.round(v)}%`;
const share = (v: number): string => `${Math.round(v * 100)}%`;
const bossName = (r: FightReport): string => BOSS_TEXT[r.boss].name;

/** The words of one duel for the live panel (monospace): time, pace, attack table, verdict, reasons. */
export function liveLines(r: FightReport, title: string): { head: string; body: string; verdict: string } {
  const head = `${T.title}  ${bossName(r)}  •  ${title}`;
  const lines: string[] = [];
  lines.push(`${Math.round(r.fightSec)} s   boss ${pct(r.bossLeftPct)} rămas   Varu -${pct(r.varuHpLostPct)} (min ${pct(r.varuMinHpPct)})`);
  const ms = r.modeShare;
  lines.push(`timp: atacă ${share(ms.active)} • avert ${share(ms.telegraph)} • pauză ${share(ms.idle + ms.recover)} • amețit ${share(ms.stunned)}`);
  lines.push(`ritm: ${r.attacksPerMin.toFixed(0)} atacuri/min • ${r.kinds} feluri • Varu lovit ${r.hitsTaken}× (${r.hitsPerMin.toFixed(1)}/min)`);
  lines.push(`faze: ${r.tierSec.map((s) => `${Math.round(s)}s`).join(' / ')}  •  amețiri ${r.stuns}  •  mingi ${share(r.ballShare)} din rănile ei`);
  lines.push('');
  lines.push('atac            folosit  lovit  HP');
  for (const a of r.attacks.slice(0, 9)) lines.push(`${a.id.padEnd(15)} ${String(a.used).padStart(5)}  ${String(a.hits).padStart(5)}  ${String(Math.round(a.damage)).padStart(3)}`);
  if (r.attacks.length > 9) lines.push(`… încă ${r.attacks.length - 9}`);
  for (const o of r.other) lines.push(`${`(${o.id})`.padEnd(15)} ${'-'.padStart(5)}  ${String(o.hits).padStart(5)}  ${String(Math.round(o.damage)).padStart(3)}`);
  const extra = r.flags.map((f) => `! ${T.flags[f]}`);
  if (!r.clean) extra.push(`${T.live.dirty}${r.tainted.join(', ')}`);
  return { head, body: lines.join('\n'), verdict: `${T.verdict[r.label]}${r.result === 'live' ? ` (${T.live.provisional})` : r.result === 'won' ? ` • ${T.live.won}` : ` • ${T.live.lost}`}${extra.length ? `\n${extra.join('\n')}` : ''}` };
}

/** The scoreboard: one block per boss, over the clean duels. */
export function bookLines(book: readonly FightReport[]): { head: string; body: string } {
  const out: string[] = [];
  let skipped = 0;
  for (const boss of BOSS_TYPES) {
    const s = summarizeBook(book, boss);
    skipped += s.skipped;
    const name = BOSS_TEXT[boss].name;
    if (s.fights === 0) {
      out.push(`${name}: ${T.book.empty}`);
      continue;
    }
    const verdict = s.fights < 2 ? `${T.verdict.unclear} (${T.book.need})` : T.verdict[s.headline];
    out.push(`${name}: ${verdict}`);
    out.push(`  ${s.fights} dueluri, ${s.wins} victorii • ${Math.round(s.avgSec)} s • Varu -${pct(s.avgHpLostPct)} • lovit ${s.avgHitsPerMin.toFixed(1)}/min`);
    out.push(`  pauze ${share(s.avgDowntime)} • ${s.avgAttacksPerMin.toFixed(0)} atacuri/min`);
    for (const f of s.topFlags) out.push(`  ! ${T.flags[f]}`);
  }
  if (skipped > 0) out.push('', T.book.skipped.replace('{n}', String(skipped)));
  return { head: T.book.title, body: out.join('\n') };
}

/** Markdown for the clipboard: the scoreboard plus every duel in the book (paste it into a chat to talk about the balance). */
export function reportMarkdown(book: readonly FightReport[]): string {
  const out: string[] = ['# Boss lab', `Praguri: ${JSON.stringify(BOSS_LAB)}`, ''];
  for (const boss of BOSS_TYPES) {
    const s = summarizeBook(book, boss);
    out.push(`## ${BOSS_TEXT[boss].name}: ${T.verdict[s.headline]} (${s.fights} dueluri curate, ${s.wins} victorii)`);
    if (s.fights > 0) out.push(`medie: ${s.avgSec.toFixed(0)} s, Varu -${s.avgHpLostPct.toFixed(0)}%, lovit ${s.avgHitsPerMin.toFixed(1)}/min, pauze ${share(s.avgDowntime)}, ${s.avgAttacksPerMin.toFixed(0)} atacuri/min`);
    for (const f of s.topFlags) out.push(`- ${f}: ${T.flags[f]}`);
    for (const r of book.filter((x) => x.boss === boss)) {
      const atk = r.attacks.map((a) => `${a.id} ${a.used}/${a.hits}/${Math.round(a.damage)}`).join(', ');
      const other = r.other.map((o) => `${o.id} ${o.hits}/${Math.round(o.damage)}`).join(', ');
      out.push(`- ${r.result} ${r.fightSec.toFixed(0)} s, Varu -${r.varuHpLostPct.toFixed(0)}% (min ${r.varuMinHpPct.toFixed(0)}%), boss ${r.bossLeftPct.toFixed(0)}%, ${T.verdict[r.label]}${r.clean ? '' : ` [murdar: ${r.tainted.join(', ')}]`}; flags: ${r.flags.join(',') || '-'}; atacuri folosit/lovit/HP: ${atk}${other ? `; altele: ${other}` : ''}`);
    }
    out.push('');
  }
  return out.join('\n');
}
