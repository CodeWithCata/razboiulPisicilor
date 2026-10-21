// Boss balance budget. Reads the REAL numbers from src/config and prints, per boss and phase:
//   - how many belt swings it takes to kill the boss (armor, shield, stun path)
//   - how long one attack cycle is, how much of it is a "breather" (recover + cooldown)
//   - the damage Varu takes if EVERY attack lands (i-frames respected), per second of fight
//   - which ground attacks cannot be dodged from melee range (warning shorter than reaction + exit time)
// It is a SANITY MODEL, not a playtest: use it to keep Queen < Emo < Federer and to catch unfair warnings.
// Run: node scripts/boss-budget.mjs        (Node 22.18+, no npm packages: it strips the TypeScript types itself)
import { ENEMIES, BELT, PLAYER, PROJECTILES, BUFFS, PICKUP_SPAWN } from '../src/config/balance.ts';
import { BOSS, QUEEN, MAFIA, FEDERER, byPhase, byTier } from '../src/config/bosses.ts';

const REACTION_MS = 300; // a focused human
const MELEE_PX = 100; // Varu stands this far from the boss centre while he hits it
const HURT_R = PLAYER.hitRadius;
const IFRAME_MS = PLAYER.invincibleMs;
const SWINGS_PER_S = 1000 / BELT.cooldownMs;
const CONTACT = 0.5; // share of the fight Varu really has the belt on the boss
const GOLDEN = 1 + (BUFFS.goldenBelt.damage - 1) * (BUFFS.goldenBelt.durationMs / PICKUP_SPAWN.goldenBeltEveryMs);

/** A BOSS number can be one value for all bosses (old config) or one per boss. */
const perBoss = (value, boss, fallback = 0) => (value === undefined ? fallback : typeof value === 'object' ? value[boss] : value);

const escapeMs = (radius, from = MELEE_PX) => (Math.max(0, radius + HURT_R - from) / PLAYER.speed) * 1000;
const hitsInWindow = (ms) => Math.max(1, Math.ceil(ms / IFRAME_MS));

/** One row per attack: warning, active, recover, damage if all land, and the ground ring (if any) Varu must leave. */
function attacks(boss, tier) {
  const t = tier - 1;
  if (boss === 'queen') {
    const tf = byTier(QUEEN.telegraphFactor, tier);
    const cd = byTier(QUEEN.cooldownMs, tier);
    return {
      cooldown: cd,
      list: [
        { id: 'decree', tele: QUEEN.decreeTelegraphMs * tf, active: 0, rec: byTier(QUEEN.decreeRecoverMs, tier), dmg: 8 },
        { id: 'charge', tele: QUEEN.chargeTelegraphMs * tf, active: QUEEN.chargeMs, rec: byTier(QUEEN.chargeRecoverMs, tier), dmg: QUEEN.chargeDamage + QUEEN.chargeSlam.damage, ring: QUEEN.chargeSlam.radius, lockMs: byTier(QUEEN.chargeLockMs, tier) },
        { id: 'spin', tele: QUEEN.spinTelegraphMs * tf, active: byTier(QUEEN.spinMs, tier), rec: byTier(QUEEN.spinRecoverMs, tier), dmg: QUEEN.spinDamage * hitsInWindow(byTier(QUEEN.spinMs, tier)), ring: byTier(QUEEN.spinRadius, tier) },
        { id: 'scepter', tele: QUEEN.scepter.telegraphMs * tf, active: byTier(QUEEN.scepter.outMs, tier) + byTier(QUEEN.scepter.hoverMs, tier) + byTier(QUEEN.scepter.backMs, tier), rec: byTier(QUEEN.scepter.recoverMs, tier), dmg: QUEEN.scepter.damage },
        ...(tier >= 2 ? [{ id: 'carpet', tele: byTier(QUEEN.carpet.telegraphMs, tier), active: 300, rec: byTier(QUEEN.carpet.recoverMs, tier), dmg: QUEEN.carpet.damage }] : []),
      ],
    };
  }
  if (boss === 'mafia') {
    const p = t >= 1 ? 2 : 1;
    return {
      cooldown: byPhase(MAFIA.cooldownMs, p),
      list: [
        { id: 'hearts', tele: 600, active: p >= 2 ? MAFIA.secondVolleyDelayMs + 50 : 0, rec: 1000, dmg: PROJECTILES.heart.damage * (p >= 2 ? 2 : 1), belt: true },
        { id: 'sad', tele: MAFIA.sadTelegraphMs, active: 0, rec: MAFIA.recoverMs.sad, dmg: PROJECTILES.heart.damage * 2, belt: true }, // v148 homing hearts (3-4 of them curve in): about two land on a player who does nothing
        { id: 'scream', tele: MAFIA.screamTelegraphMs, active: 0, rec: 1200, dmg: MAFIA.screamDamage + (byPhase(MAFIA.screamHearts, p) > 0 ? PROJECTILES.heart.damage : 0), ring: MAFIA.screamRadius },
        { id: 'crew', tele: MAFIA.crewTelegraphMs, active: 0, rec: 900, dmg: 10 },
      ],
    };
  }
  const p = t >= 1 ? 2 : 1;
  const L = FEDERER.lob;
  return {
    cooldown: byPhase(FEDERER.cooldownMs, p),
    list: [
      { id: 'volley', tele: FEDERER.volleyTelegraphMs, active: byPhase(FEDERER.ballsPerVolley, p) * FEDERER.ballIntervalMs + 100, rec: 900, dmg: PROJECTILES.tennis.damage * hitsInWindow(byPhase(FEDERER.ballsPerVolley, p) * FEDERER.ballIntervalMs), belt: true },
      { id: 'serve', tele: FEDERER.serveTelegraphMs, active: 0, rec: 1300, dmg: FEDERER.serveDamage, ring: FEDERER.serveRadius },
      { id: 'dash', tele: FEDERER.dashTelegraphMs, active: FEDERER.dashMs, rec: 1100, dmg: 12 + FEDERER.swingDamage, ring: 0 },
      { id: 'lob', tele: L.telegraphMs, active: byPhase(L.balls, p) * byPhase(L.intervalMs, p) + 120, rec: L.recoverMs, dmg: L.damage * hitsInWindow(byPhase(L.balls, p) * byPhase(L.intervalMs, p)) },
      ...(p >= 2 ? [{ id: 'ballboys', tele: 500, active: 0, rec: 800, dmg: 8 }] : []),
    ],
  };
}

function cycle(a, cooldown) {
  return a.tele + a.active + a.rec + cooldown;
}

function report(boss, tier, label) {
  const { list, cooldown } = attacks(boss, tier);
  const avgCycle = list.reduce((s, a) => s + cycle(a, cooldown), 0) / list.length;
  const avgBreath = list.reduce((s, a) => s + a.rec + cooldown, 0) / list.length;
  const avgDmg = list.reduce((s, a) => s + a.dmg, 0) / list.length;
  const flags = list
    .filter((a) => a.ring !== undefined && a.ring > 0 && a.tele - REACTION_MS - escapeMs(a.ring) < 0)
    .map((a) => `${a.id} (${Math.round(a.tele)} ms warning, needs ${Math.round(REACTION_MS + escapeMs(a.ring))} ms from melee)`);
  const lockFlags = list.filter((a) => a.lockMs !== undefined).map((a) => `${a.id} lane locks only ${a.lockMs} ms before the rush`);
  console.log(`  ${label.padEnd(8)} cycle ${(avgCycle / 1000).toFixed(2)} s | breather ${(100 * avgBreath / avgCycle).toFixed(0)}% | all-hit dmg ${(avgDmg / (avgCycle / 1000)).toFixed(1)} /s | warnings: ${list.map((a) => `${a.id} ${Math.round(a.tele)}`).join(', ')}`);
  if (flags.length) console.log(`           !! cannot be dodged from melee: ${flags.join('; ')}`);
  if (lockFlags.length) console.log(`           note: ${lockFlags.join('; ')}`);
  return avgDmg / (avgCycle / 1000);
}

function killModel(boss) {
  const hp = ENEMIES[boss].hp;
  const armor = BOSS.armor[boss];
  const perSwing = BELT.damage * armor * GOLDEN;
  const swingsNeeded = hp / (BELT.damage * armor);
  const secs = hp / (perSwing * SWINGS_PER_S * CONTACT);
  console.log(`  HP ${hp}, armor ${armor}: ${swingsNeeded.toFixed(0)} plain swings, belt-only kill about ${secs.toFixed(0)} s (contact ${CONTACT * 100}%, golden belt avg x${GOLDEN.toFixed(2)})${boss === 'queen' ? ', about double while her guards keep the shield up' : ''}`);
  return { swingsNeeded, secs };
}

/**
 * v146 RALLY (FEDERER.rally): she answers a swatted ball. Per swatted ball she returns it (return chance), sidesteps (dodge chance) or takes it.
 * A returned ball only lands if Varu swats it again (`rallySkill`, share of returned balls he gets back), and a ball is returned at most
 * `maxReturns` times (then it lands unless she dodges). `land` = chance a swatted ball finally lands on her, `bonus` = average damage factor
 * of the balls that land (`BOSS.rallyBonus`: +50% per return). Both are averaged over the two phases (she is in phase 1 for the first half of her HP).
 */
function rallyModel(rallySkill) {
  const R = FEDERER.rally;
  const bonusPerReturn = perBoss(BOSS.rallyBonus, 'federer');
  const out = [1, 2].map((phase) => {
    const r = byPhase(R.returnChance, phase);
    const d = byPhase(R.dodgeChance, phase);
    const M = R.maxReturns;
    let reach = 1;
    let land = 0;
    let weighted = 0;
    for (let k = 0; k <= M; k++) {
      const mass = reach * (k < M ? 1 - r - d : 1 - d); // at the cap the return slice is just taken
      land += mass;
      weighted += mass * (1 + bonusPerReturn * k);
      reach *= r * rallySkill;
    }
    return { land, bonus: weighted / land };
  });
  return { land: (out[0].land + out[1].land) / 2, bonus: (out[0].bonus + out[1].bonus) / 2, phases: out };
}

/**
 * Federer's weak point: Varu swats her balls back. A ball that LANDS stuns her (the first one; balls landing while she is stunned or
 * still in her stun grace do `deflectFollowUp` of the damage). During the stun he runs in and hits her at the stun damage factor.
 * `skill` = share of a volley's balls he sends back (1 = perfect), `rallySkill` = share of her returns he swats again.
 * A volley with no landing ball is a wasted volley (same cycle length, no stun). Returns seconds for the fastest kill at that skill.
 */
function deflectModel(skill, rallySkill = 0.7) {
  const hp = ENEMIES.federer.hp;
  const stunMs = perBoss(BOSS.stunMs, 'federer');
  const grace = perBoss(BOSS.stunGraceMs, 'federer');
  const first = typeof BOSS.deflectedBallDamage === 'object' ? BOSS.deflectedBallDamage.federer : PROJECTILES.tennis.damage; // old config: the number was never read, the ball's own 10 applied
  const followUp = perBoss(BOSS.deflectFollowUpFactor, 'federer', 1);
  const balls = FEDERER.ballsPerVolley[0];
  const swatted = Math.max(1, Math.round(balls * skill));
  const { land, bonus, phases } = FEDERER.rally ? rallyModel(rallySkill) : { land: 1, bonus: 1, phases: [] };
  const pStun = 1 - Math.pow(1 - land, swatted); // at least one swatted ball lands in this volley
  const landed = (swatted * land) / pStun; // balls that land, given at least one does
  const closeMs = 900; // Varu runs from where he swatted the ball to her
  const freeHits = Math.max(0, ((stunMs - closeMs) / 1000) * SWINGS_PER_S);
  const perStun = first * bonus + (landed - 1) * first * bonus * followUp + freeHits * BELT.damage * BOSS.stunnedDamageFactor;
  const stuns = hp / perStun;
  const volley = attacks('federer', 1).list[0];
  const volleyCycleMs = volley.tele + volley.active + 900 + attacks('federer', 1).cooldown;
  const stunGapMs = Math.max(stunMs + grace, volleyCycleMs);
  const volleysPerStun = 1 / pStun;
  const secs = Math.max(1, stuns - 1) * (stunGapMs + (volleysPerStun - 1) * volleyCycleMs) / 1000 + 3;
  const rallyNote = FEDERER.rally ? `, she lets ${Math.round((1 - land) * 100)}% of swatted balls get past her (${phases.map((p) => Math.round(p.land * 100)).join('% / ')}% by phase), landed balls hit x${bonus.toFixed(2)}` : '';
  console.log(`  deflecting ${Math.round(skill * 100)}% of a ${balls}-ball volley: ${perStun.toFixed(1)} dmg per stun, ${(pStun * 100).toFixed(0)}% of volleys stun her${rallyNote} -> ${stuns.toFixed(1)} stuns, fastest kill about ${secs.toFixed(0)} s (stun ${stunMs} ms, grace ${grace} ms, ${freeHits.toFixed(1)} free belt hits)`);
  return secs;
}

const rows = {};
for (const [boss, name, tiers] of [['queen', 'QUEEN (reference)', [[1, 'phase 1'], [2, 'phase 2'], [3, 'rage']]], ['mafia', 'EMO CAT', [[1, 'phase 1'], [2, 'phase 2']]], ['federer', 'FEDERER', [[1, 'phase 1'], [2, 'phase 2']]]]) {
  console.log(`\n${name}`);
  rows[boss] = { threat: Math.max(...tiers.map(([tier, label]) => report(boss, tier, label))), ...killModel(boss) };
  if (boss === 'federer') {
    rows[boss].perfect = deflectModel(1);
    rows[boss].good = deflectModel(0.5);
  }
}

console.log('\nORDER CHECK (want Queen < Emo < Federer in every line)');
const order = (label, pick) => {
  const [q, m, f] = ['queen', 'mafia', 'federer'].map((b) => pick(rows[b]));
  const ok = q < m && m < f;
  console.log(`  ${ok ? 'OK ' : 'BAD'} ${label}: queen ${q.toFixed(1)} | emo ${m.toFixed(1)} | federer ${f.toFixed(1)}`);
  return ok;
};
const results = [order('belt-only kill time (s)', (r) => r.secs), order('peak all-hit damage per second', (r) => r.threat), order('plain swings to kill', (r) => r.swingsNeeded)];
const perfectOk = rows.federer.perfect >= rows.queen.secs * 1.1;
const goodOk = rows.federer.good >= rows.mafia.secs;
console.log(`  ${perfectOk ? 'OK ' : 'BAD'} perfect deflecting (${rows.federer.perfect.toFixed(0)} s) must not beat 1.1x the queen belt-only kill (${(rows.queen.secs * 1.1).toFixed(0)} s)`);
console.log(`  ${goodOk ? 'OK ' : 'BAD'} good deflecting, half the balls (${rows.federer.good.toFixed(0)} s), must take at least as long as the emo belt-only kill (${rows.mafia.secs.toFixed(0)} s)`);
// Her rally must not kill the weak point: deflecting half the balls has to stay clearly faster than plain belt hits (else nobody swats balls any more).
const worthIt = rows.federer.good <= rows.federer.secs * 0.75;
console.log(`  ${worthIt ? 'OK ' : 'BAD'} deflecting must stay worth it: half the balls (${rows.federer.good.toFixed(0)} s) at most 0.75x her belt-only kill (${(rows.federer.secs * 0.75).toFixed(0)} s)`);
// A clumsy rally player (swats only 30% of her returns) must not be punished into a stalemate: still at most the belt-only kill time.
const clumsy = deflectModel(0.5, 0.3);
const clumsyOk = clumsy <= rows.federer.secs;
console.log(`  ${clumsyOk ? 'OK ' : 'BAD'} a player who rarely swats her returns back (${clumsy.toFixed(0)} s) must not be slower than belt-only (${rows.federer.secs.toFixed(0)} s)`);
process.exitCode = results.every(Boolean) && perfectOk && goodOk && worthIt && clumsyOk ? 0 : 1;
