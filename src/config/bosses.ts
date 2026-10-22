/** @file Boss numbers: shared BOSS timings, QUEEN (decree, charge, scepter spin), MAFIA (emo cat), FEDERER attack values (volley, serve, dash, ball rain), and which boss is final. */
import type { BadKind, BossType } from './balance';

/** Which boss ends the game when beaten. */
export const FINAL_BOSS: BossType = 'federer';

/** Pick the phase-1 or phase-2 value from a pair. */
export const byPhase = <T>(pair: readonly [T, T], phase: number): T => pair[phase >= 2 ? 1 : 0];

/** Pick the value for the boss's current tier from a triple: 1 = phase 1, 2 = phase 2, 3 = rage (the last quarter of her health, only the queen has it). */
export const byTier = <T>(triple: readonly [T, T, T], tier: number): T => triple[tier >= 3 ? 2 : tier >= 2 ? 1 : 0];

export const BOSS = {
  introMs: 1800, // walks in and can't attack yet
  phase2At: 0.5, // phase 2 starts below this HP fraction
  phasePauseMs: 1000,
  /** Bosses never turn upside down: they stay upright and only lean this far (degrees) toward Varu, or toward where they dash. 0 = no lean at all. */
  maxLeanDeg: 30,
  stunnedDamageFactor: 2, // belt hits count double while stunned
  /** Multiplier on belt and crow damage. Lower = tougher. Order of toughness: queen < emo cat < Federer (see scripts/boss-budget.mjs). */
  armor: { queen: 0.8, mafia: 0.7, federer: 0.6 } satisfies Record<BossType, number>,

  // ---- the weak point: a tennis ball Varu swats back at a boss ----
  /** How long the first returned ball stuns each boss (ms). */
  stunMs: { queen: 2600, mafia: 2600, federer: 1800 } satisfies Record<BossType, number>,
  /** Damage of the FIRST returned ball (it ignores armor). Queen and emo keep the old 10 (the ball's own damage). Federer's is lower: she is the final boss. */
  deflectedBallDamage: { queen: 10, mafia: 10, federer: 4 } satisfies Record<BossType, number>,
  /**
   * Stun poise (ms). After a stun ends the boss shrugs off the next one for this long, and returned balls that land while she is stunned
   * or still in this grace only do `deflectFollowUpFactor` of the damage and stun nothing. Without it one volley of swatted balls was a
   * stun-lock that killed her in seconds. 0 = no poise: every returned ball hurts in full and restarts the stun (queen, emo cat).
   */
  stunGraceMs: { queen: 0, mafia: 0, federer: 3800 } satisfies Record<BossType, number>,
  deflectFollowUpFactor: { queen: 1, mafia: 1, federer: 0.35 } satisfies Record<BossType, number>,
  /**
   * Rally reward (v146): a ball that Federer smashed back and Varu swatted again lands harder: +this share of the damage PER return
   * (0.5 = +50%, so 4 -> 6 -> 8). It pays for the balls she now answers (`FEDERER.rally`). Queen and emo cat never return balls: 0.
   */
  rallyBonus: { queen: 0, mafia: 0, federer: 0.5 } satisfies Record<BossType, number>,

  /**
   * Low-health mercy (the same idea as the curse mercy in config/curses.ts): while Varu is below `belowHp` of his health the boss waits
   * this much LONGER between attacks (0.3 = 30% longer), so a bad moment is not a death spiral. The queen is balanced as she is: 0.
   */
  mercy: { belowHp: 0.35, cooldownStretch: { queen: 0, mafia: 0.35, federer: 0.25 } satisfies Record<BossType, number> },
} as const;

/**
 * Regina Pisicilor. Every value marked [a, b, c] is for phase 1, phase 2 and RAGE (below `rageAt` of her health).
 * Attacks: decree (royal guard), charge (+ rush follow-ups), spin, scepter throw, red carpet (phase 2 and up).
 */
export const QUEEN = {
  // ---- how she moves and how fast she acts ----
  preferredDistance: [200, 160, 120] as const, // she walks in on Varu until she is this close
  speedFactor: [1.7, 2.1, 2.7] as const, // times her walking speed in balance.ts (70 px/s)
  /** While waiting for her next attack she circles Varu (flipping direction now and then) instead of standing still. */
  strafe: { share: 0.75, backoffShare: 0.8, minMs: 1400, maxMs: 2600, wallMargin: 110 },
  cooldownMs: [1300, 850, 550] as const, // pause between attacks
  telegraphFactor: [1, 0.85, 0.7] as const, // warning times are multiplied by this
  rageAt: 0.25, // below this share of her health she goes into RAGE (phase 3)
  chainChance: 0.55, // in RAGE an attack may flow straight into a rush
  chainGapMs: 220, // the pause between two chained attacks

  // ---- royal guard (decree) and her shield ----
  summonCount: [3, 4, 4] as const, // plain cats per decree
  summonRadius: 120,
  phase2Summon: 4, // plain cats when phase 2 starts
  rageSummon: 3, // plain cats when RAGE starts
  /** Elite guards (they carry the shield). No new ones are called while the shield is still up. */
  guards: { fat: [1, 1, 1] as const, ninja: [0, 2, 3] as const, radius: 200 },
  shieldFactor: 0.5, // while any elite guard lives she takes this much of the damage (0.5 = half)
  decreeTelegraphMs: 700,
  decreeRecoverMs: [900, 750, 500] as const,

  // ---- charge: the red lane follows Varu, then locks (it turns white) just before she rushes ----
  chargeTelegraphMs: 650,
  chargeLockMs: [250, 200, 150] as const, // the lane stops following this long before the rush
  chargeTrackRate: [3.2, 4.2, 5.5] as const, // how fast the lane turns toward Varu (radians per second)
  chargeMs: 900,
  chargeMinRunway: 320, // she only charges when this much floor is free ahead (no wall, barrel or fence); otherwise she picks another attack
  chargeSpeed: [700, 820, 920] as const, // she crosses most of the arena (the red lane is as long as the charge)
  chargeDamage: 20,
  chargeRecoverMs: [800, 650, 500] as const,
  /** Where the charge ends she slams down: a shockwave ring (marked on the floor while the lane locks). */
  chargeSlam: { radius: 115, damage: 12 },
  /** Cats in her way are not an obstacle: she plows through and shoves them aside. */
  plow: { force: 380, ms: 260 },
  /** Rush: the quick follow-up charge, re-aimed at wherever Varu dodged to. */
  rushTelegraphMs: 480,
  rushLockMs: 140,
  rushDamage: 16,
  doubleChargeChance: 0.5, // phase 2: chance of one rush after a charge. RAGE: always one, and this chance for a second.
  /** The red carpet she leaves behind while charging: one plush rosette (`Tex.FxCarpetPad`, art/fx.ts) every `everyMs`, `popMs` to pop up, `alpha` while lying there. */
  trail: { everyMs: 70, radius: 34, lifeMs: [1800, 2400, 3000] as const, damage: 5, alpha: 0.6, popMs: 140, fadeMs: 650 },

  // ---- scepter spin: the ring hurts every tick, and in phase 2+ it throws sparkles in a spiral ----
  spinTelegraphMs: 960, // v148: was 650. The ring grows to 145-175 px and Varu needs about 600-665 ms to run out of it from melee, so rage (x0.7) and phase 2 (x0.85) were undodgeable (scripts/boss-budget.mjs flagged it)
  spinMs: [2200, 2400, 2600] as const, // v179: at least 2.2 s (was 700 / 950 / 1100)
  spinTurns: [6, 7, 8] as const, // more turns so she keeps spinning at the same speed

  spinRadius: [145, 160, 175] as const,
  spinTickMs: 230,
  spinDamage: 9,
  spinDriftSpeed: [170, 230, 270] as const, // she slides toward Varu while spinning
  spinStopDistance: 60, // ...but stops this close so she never sits on top of him
  spinFirstHitMs: 140, // the first damage tick comes this long after the spin starts
  spinRecoverMs: [1500, 900, 600] as const, // dizzy afterwards: the moment to hit her
  spinArms: [0, 2, 3] as const, // sparkles thrown outward per burst (0 = none)
  spinShotEveryMs: 140,
  sparkleSpeed: 250,

  // ---- scepter throw: a boomerang. Phase 2+: the way back is a wide curve. RAGE: sparkles when it hovers ----
  scepter: {
    telegraphMs: 700,
    lockMs: 220,
    trackRate: [3, 4, 5] as const,
    range: 430,
    laneWidth: 70,
    outMs: [650, 600, 550] as const,
    hoverMs: [400, 450, 550] as const, // it spins on the spot and hurts everything inside `hoverRadius`
    backMs: [750, 700, 650] as const,
    hitRadius: 34,
    hoverRadius: 62,
    damage: 12,
    bow: [0, 150, 220] as const, // how far the way back bends sideways (0 = straight)
    hoverShots: [0, 0, 6] as const,
    recoverMs: [800, 700, 500] as const,
    scale: 1.15,
    edge: 0xffd166, // gold: the warning lane
    ringAlpha: 0.95, // the gold magic circle (`Tex.FxRing`) it spins in while it hovers
    ringSpin: 0.0012, // rad per ms
  },

  // ---- red carpet (phase 2+): bands of floor strike one after the other, one band is safe (green) ----
  carpet: {
    telegraphMs: [1600, 1450, 1300] as const, // not shortened by the tier factor: it is a puzzle, not a reflex test
    laneWidth: 130,
    halfBands: 3, // bands on each side of Varu (3 = seven bands)
    safeBands: [3, 3, 2] as const, // how many bands side by side are safe (a wide green corridor)
    waves: [1, 1, 2] as const,
    waveGapMs: [900, 800, 750] as const,
    lingerMs: 250,
    damage: 10,
    recoverMs: [1100, 1000, 800] as const,
    safeColor: 0x7bd88f,
    strikeFadeMs: 380,
  },
} as const;

/**
 * The emo cat (internal key `mafia`): broken-heart fans, a screamo shockwave, a ninja crew.
 * v145 balance: he sits between the queen and Federer. The scream used to be impossible to leave from melee range (700 ms warning for a
 * 230 px ring) and he chose it MOST when Varu was close; now the warning is long enough to run out of the ring (`scripts/boss-budget.mjs`
 * checks it), the scream leaves him exhausted (long recover = the moment to hit him) and the crew is smaller.
 */
/**
 * v172/v173 LIGHTS OUT (every boss): when a boss is down to `atHp[boss]` (share of its health) it turns the lights off for the rest of the fight. A dark
 * sheet (`darkness` 0..1, depth `depth`: over the cats and Varu, under the projectiles) leaves soft circles of light round Varu, the boss (`bossRadius`) and
 * every street lamp (they rise out of the floor even by day). Projectiles, ground warnings, landing markers and the thrown belt stay above the dark.
 * The sheet is drawn at 1/`divisor` of the screen.
 */
export const LIGHTS_OUT = {
  atHp: { mafia: 0.35, queen: 0.3, federer: 0.25 } as const satisfies Record<BossType, number>,
  fadeMs: 1800, darkness: 0.86, rgb: [6, 4, 15] as const, depth: 24.6, telegraphDepth: 26, varuRadius: 190, bossRadius: 95, lampRadius: 190, soft: 0.4, divisor: 4, marginPx: 40,
} as const;

export const MAFIA = {
  keepDistance: 320,
  cooldownMs: [1700, 1250] as const, // v142 buff was 1700 / 1000; 1250 keeps him below Federer in phase 2
  heartCount: [6, 8] as const, // v172: was [7, 9]: the hearts are tough now (only the thrown belt breaks them, 4 hits), so the fan has wider gaps to dodge through
  heartSpreadDeg: 85,
  heartSpeed: 260, // was 270
  heartTelegraphMs: 600,
  secondVolleyDelayMs: 450, // phase 2 fires a second volley
  heartFlash: 0xf777b9, // hot pink glow while it winds up the hearts
  screamTelegraphMs: 950, // was 700: from melee range Varu needs about 800 ms to be out of the ring
  screamRadius: 210, // was 230
  screamDamage: 22, // was 24
  /** Hearts that fly out in a full circle right after the scream (phase 1 none, phase 2 this many): run out of the ring, then dodge them. */
  screamHearts: [0, 8] as const, // was 10: the gaps are wide enough to slip through
  screamColor: 0xe0409a, // the warning circle on the ground (pink instead of red)
  /** v148 "sad hearts": slow hearts that turn toward Varu (`PROJECTILES.heart.homing`). Outrun them or sidestep when they come close: a swing or spin cannot break them (v172), only the thrown belt can, 4 hits (`PROJECTILES.heart`). They fan out from him, so they start wide and curve in. */
  sadTelegraphMs: 700,
  sadHeartCount: [3, 4] as const,
  sadHeartSpeed: 150,
  sadSpreadDeg: 150,
  sadFlash: 0xc9a0ff,
  /** v148 tear puddles: the scream leaves `count` puddles (phase 1, phase 2) at random spots between `minFrom` px and the scream ring around him. They slow Varu to `slow` x his speed while he stands in one (not the cats), dry up after `lifeMs` and never more than `max` at once. */
  puddle: { count: [5, 8] as const, minFrom: 80, radius: 48, hitRatioY: 0.48, slow: 0.55, lifeMs: 7500, blinkMs: 1500, max: 12, depth: -8.85, alpha: 0.96, artGrow: 1.1, popMs: 350, wobble: 0.025, wobbleRate: 0.0042, rippleEveryMs: [900, 1700] as const, rippleMs: 1100, rippleColor: 0xeaf9ff, splashDrops: 5, splashPx: 34, dropColor: 0x9fd8ff },
  /**
   * v180 SCREAM FLOOD: the scream turns the whole floor inside the pink ring (`screamRadius`) into one big flat puddle that spreads out from him in `growMs`,
   * ripples, and dries up (blinks the last `blinkMs`) after `lifeMs`. Only one at a time. Varu is slowed to `slow` x his speed while he stands inside it
   * (`hitFactor` of the radius; the flood is `reach` x the scream ring, so it spreads well past the pink circle, so the thin edge does not count); a milder slow than a single puddle, because it is so big. It is cut off at the fence.
   */
  flood: { reach: 1.7, slow: 0.75, hitFactor: 0.94, lifeMs: 6500, blinkMs: 1500, growMs: 420, depth: -8.9, alpha: 0.9, rippleEveryMs: [650, 1100] as const, rippleMs: 1400, rimDrops: 24, dropPx: 22 },
  /** v148 "hiding": while at least `minNinjas` of his crew live he takes `crewFactor` of the damage (0.7 = 30% less); right after a scream (his `recoverMs.scream`) he is wide open and takes `exhaustedFactor`. */
  shield: { minNinjas: 2, crewFactor: 0.7, exhaustedFactor: 1.4 },
  /**
   * v172 RAINY MOOD: his cloud grows and darkens with every hit he takes. Once he is at `startAtHp` (share of his health) it really rains over the
   * arena (the normal rain weather: streaks, and the belt rusts) and the rain keeps leaving tear puddles all over the floor (not near Varu: `minFromVaruPx`):
   * every `puddleEveryMs` [just started, full storm] ms, with up to `puddleMax` [just started, full storm] on the floor, each drying after `puddleLifeMs`.
   */
  rain: { startAtHp: 0.7, puddleEveryMs: [5200, 2200] as const, puddleMax: [8, 14] as const, puddleLifeMs: 9000, minFromVaruPx: 140 },
  /**
   * v172 CRY FOR HELP: a hit between two attacks makes him cry for help with `chance` (at most once per `cooldownMs` after the last one, never while
   * he is worn out from a scream): he hides behind his hood for `hideMs`, takes only `damageFactor` of the damage (a blue bubble shows it), cannot
   * attack, and leaves a tear puddle at his feet every `puddleEveryMs` (so standing next to him slows Varu). Hit him less, or wait it out.
   */
  cry: { chance: 0.35, cooldownMs: 7000, hideMs: 1900, damageFactor: 0.35, puddleEveryMs: 380, puddleJitterPx: 46, flash: 0x8aa0ff },
  crewTelegraphMs: 700,
  crewCount: [3, 4] as const, // ninjas only, never other cat types (was 3, 5)
  crewRadius: 140,
  crewFlash: 0x6a4c93, // dark purple glow while it calls the ninjas
  phase2Summon: 2, // ninjas that jump in when phase 2 starts (was 3)
  /** The pause after each attack, before the next cooldown starts: the moment to hit him. The scream costs the most breath. */
  recoverMs: { hearts: 1100, scream: 1500, crew: 1000, sad: 1100 } as const,
  // ---- smoother movement (all game ms / px) ----
  /** Share of his speed that goes into circling Varu, and the width of the band around `keepDistance` over which he eases in or out (no hard switch). */
  strafeShare: 0.55,
  distanceBandPx: 120,
  /** How slowly his velocity follows what he wants (bigger = smoother, lazier) and how fast he glides to a stop when he winds up. */
  steerMs: 260,
  brakeMs: 160,
  /** He changes his circling direction now and then, and at once when he is stuck on something. */
  flipMs: { min: 2200, max: 4200 },
  blockedFlipGapMs: 700,
  /** Near the edge of the arena he is pushed back toward the middle (share of his speed at the very edge). */
  wallMarginPx: 110,
  wallPush: 0.7,
  // ---- smarter choice of attack (weights, bigger = more likely) ----
  decide: {
    /** Hearts: better from afar. */
    heartsFarPx: 220,
    heartsFar: 1.5,
    heartsNear: 0.6,
    /** Scream: only worth it when Varu is inside the ring plus this much. */
    screamNearExtraPx: 90,
    screamNear: 2.2, // was 3: he no longer screams at every chance
    screamFar: 0.2,
    /** Crew: likely when fewer than `crewFewBelow` ninjas live, rare otherwise, never when `crewMax` or more live. */
    /** Sad hearts: nastier close up (they have less room to curve), so a bit rarer there. */
    sadFarPx: 220,
    sadFar: 1.2,
    sadNear: 0.7,
    crewFewBelow: 2,
    crewFew: 1.6,
    crewMany: 0.25,
    crewMax: 5, // was 6
  },
} as const;

/**
 * Pisica Federer, the final boss and the strongest of the three. Her attacks hit hardest and come fastest (v144 numbers below, old ones in
 * the comments); v145 made the fight FAIR to read (the dash eases in and out) and closed the deflect shortcut (see `BOSS.stunGraceMs`):
 * swatting balls back is still the smart way to hurt her, but it no longer kills her in a few seconds.
 */
export const FEDERER = {
  keepDistance: 380,
  cooldownMs: [1500, 900] as const, // was 1900, 1300
  ballSpeed: [380, 520] as const, // phase 2 = faster balls (was 340, 480)
  ballsPerVolley: [4, 6] as const, // was 3, 5
  ballIntervalMs: 270, // was 300
  volleyTelegraphMs: 450,
  serveTelegraphMs: 850, // was 950
  serveRadius: 105, // was 95
  serveDamage: 28, // was 24
  dashTelegraphMs: 480, // was 550
  dashMs: 360,
  dashDistance: 280,
  swingRadius: 150,
  swingDamage: 20, // was 16
  ballBoyCount: 4, // was 3
  phase2Summon: 3, // was 2
  // ---- v144 smoother movement (same meaning as `MAFIA`; see entities/bosses/SmoothOrbit.ts) ----
  strafeShare: 0.6,
  distanceBandPx: 140,
  steerMs: 220,
  brakeMs: 140,
  flipMs: { min: 1800, max: 3400 },
  blockedFlipGapMs: 700,
  wallMarginPx: 120,
  wallPush: 0.8,
  // ---- v144 smarter play ----
  /** Aim ahead: a ball or a serve goes where Varu will be, not where he is. `leadMs` is how far ahead (ms of his walking), the share says how much of it she uses [phase 1, phase 2]. */
  aim: { leadMs: 380, volleyShare: [0, 0.45] as const, serveShare: [0.6, 1] as const },
  /** Phase 2 twin serve: a second ground marker this far to the side of the first one. */
  twinServeOffsetPx: 150,
  /**
   * v147 SET PLAYS (replace the old random chains): she runs three readable combos. A set play starts with a TELL (a coloured flash, a pose and a
   * shout, `tellMs` long, no damage), then its moves follow one after the other with `gapMs` between them, each with its own warning.
   * serveVolley = serve then volley (lime flash), dashSmash = dash then serve (cyan flash), triple = serve, dash, volley (gold flash, phase 2+).
   * A stun, the phase change or the rage cancels a set play. `weights` = how often each is picked next to her single attacks.
   */
  setPlays: {
    tellMs: 650,
    gapMs: 260,
    weights: { serveVolley: 0.9, dashSmash: 0.9, triple: 0.8 },
    tellColors: { serveVolley: 0xd7f03a, dashSmash: 0x6fe3ff, triple: 0xffd166 },
  },
  /**
   * v147 SECOND SERVE: when Varu is outside every ring of a serve she shouts "Fault!" and serves again at once: quicker warning, smaller ring
   * (a little less damage). Never a third serve.
   */
  secondServe: { telegraphMs: 800, radius: 68, damage: 18, gapMs: 300, recoverMs: 1100 }, // v181: was 500 ms / 72 / 22: Varu needs ~90 px (350 ms) plus reaction to leave the ring, so 500 ms was undodgeable
  /**
   * v147 HOP BACK: she is about to attack and Varu is closer than `triggerPx`: she hops away first (`distancePx`, eased, `ms` long, needs at
   * least `minPx` of free room) instead of standing still. At most one hop per `cooldownMs`. The attack waits for the hop.
   */
  hop: { triggerPx: 150, distancePx: 200, minPx: 90, ms: 300, cooldownMs: 1800 },
  /**
   * v147 PLACEMENT: she keeps out of the corners (within `cornerPx` of a corner she is pushed toward the middle, `cornerPush` x her speed at
   * the very corner); hops, dashes and ball boys also avoid them. Ball boys appear on the side away from Varu: spread over `boySpreadDeg`,
   * `boyRadiusPx` from her.
   */
  place: { cornerPx: 320, cornerPush: 0.9, boySpreadDeg: 100, boyRadiusPx: 150 },
  /**
   * v147 BALL BOYS ARE TENNIS CATS: of the cats she calls at most `maxTennis` are tennis cats alive at once (they serve swattable green balls only
   * and return or dodge swatted balls like every tennis cat, no fireballs); the rest are normal cats.
   */
  ballBoys: { maxTennis: 2 },
  /**
   * v147 HABITS: she watches the last `windowMs` of Varu (a sample every `sampleMs`). Camping far away (further than `farPx`) makes lobs and
   * serves likelier, hugging her (closer than `nearPx`) makes dashes likelier, and swatting a lot (`swatsMany` swatted balls in the window =
   * full effect) makes volleys rarer. Every weight moves by at most `maxShift` (0.4 = 40 percent), whatever he does.
   */
  habits: { windowMs: 10000, sampleMs: 250, farPx: 430, nearPx: 170, swatsMany: 4, maxShift: 0.4 },
  /**
   * v147 TIE-BREAK RAGE: below `at` of her health (phase 2 only) she first takes a TOWEL BREAK (`towelMs` of standing still, she answers no ball,
   * the machine and ball boys wait; belt hits count x`towelDamageFactor`: the reward for getting there), then SMASHES HER RACKET: a ring
   * (warning `smash.telegraphMs`), and from then on is RED and quicker: pauses x`cooldownFactor`, warnings x`telegraphFactor` (never under
   * `minWarningMs`), balls x`ballSpeedFactor` faster, she walks x`speedFactor` faster. Like the Queen's rage tier.
   */
  rage: {
    at: 0.25,
    towelMs: 2000,
    towelDamageFactor: 1.5,
    cooldownFactor: 0.7,
    telegraphFactor: 0.85,
    ballSpeedFactor: 1.12,
    speedFactor: 1.2,
    smash: { telegraphMs: 700, radius: 190, damage: 22, recoverMs: 1000 },
  },
  /** No new attack, set play, machine lane or second serve warns for less than this long (ms). */
  minWarningMs: 450,
  /** At most this many things that can hurt Varu at once (her attack, the ball machine, her tennis ball boys); see `entities/bosses/FedererBudget.ts`. */
  maxDamageSources: 2,
  /**
   * v147 BALL MACHINES (phase 2), v167: THREE launchers on the side edges of the arena, two on the left and one on the right. They are not
   * still: while they wait they GLIDE along their edge (`glidePxPerSec`) to follow Varu's height, but each keeps its own offset from him
   * (`units`: `offsetPx` up or down; the right one flips its side after every volley), so the shots always come in at an ANGLE, never
   * straight across. They fire ONE AT A TIME, in turn (`order`: indexes into `units`: left top, right, left bottom, right...), and the one
   * whose turn it is picks the lane closest to Varu from `lanesDeg` (angles off its straight-ahead line, none of them 0). The lane is drawn
   * on the floor for `telegraphMs` first (the launcher stands still for that, and while its balls fly); then `balls` balls follow `ballGapMs`
   * apart. The balls are ordinary tennis balls: swat them (rally!) or dodge them. `intervalMs` is the pause between two turns [phase 2, rage];
   * a turn only starts when the damage budget allows it, and a launcher counts as a damage source until `clearMs` after its last ball.
   * `gapPx` is the least space between the two launchers of one edge, `edgeMarginPx` how close to a corner a launcher may glide.
   */
  machine: {
    edgeInsetPx: 46,
    edgeMarginPx: 100,
    gapPx: 150,
    glidePxPerSec: 190,
    units: [
      { edge: 'left', offsetPx: -150 },
      { edge: 'right', offsetPx: 170 },
      { edge: 'left', offsetPx: 150 },
    ] as readonly { readonly edge: 'left' | 'right'; readonly offsetPx: number }[],
    order: [0, 1, 2, 1] as readonly number[],
    lanesDeg: [-36, -22, -10, 10, 22, 36] as readonly number[],
    laneWidthPx: 44,
    telegraphMs: 900,
    balls: 2,
    ballGapMs: 420,
    ballSpeed: 230,
    intervalMs: [2200, 1500] as const,
    firstDelayMs: 2200,
    clearMs: 1000,
    sizePx: 78,
    /**
     * v170 CROSSFIRE (set play): on a turn that belongs to a LEFT launcher, the two left launchers may fire TOGETHER instead. The upper one
     * takes only lanes that slant down, the lower one only lanes that slant up, so the two lanes cross in an X in front of Varu (both are drawn
     * for `telegraphMs` first, then both fire their balls at the same moment). `chance` is per eligible turn [phase 2, rage]; never two
     * crossfires in a row. It counts as ONE damage source for the budget.
     */
    crossfire: { chance: [0.3, 0.55] as const },
    /** v170 RAGE: the launchers glide `rageGlideFactor` times faster and turn their barrels `rageTurnRate` (radians per frame) instead of the normal 0.08. */
    rageGlideFactor: 1.8,
    rageTurnRate: 0.15,
    /**
     * v171 RED BALL: every single shot has a `chance` [phase 2, rage] to be the red FIREBALL instead of the green ball: much faster (`speed`
     * px/s [phase 2, rage]), and like the tennis cat's red serve the belt cannot swat it back, so it has to be dodged (the lane is the same, no
     * extra warning). The green ball keeps `ballSpeed`.
     */
    red: { chance: [0.4, 0.65] as const, speed: [420, 500] as const },
    /** v171 RAGE: green balls fly `rageBallSpeedFactor` times faster and every volley has `rageExtraBalls` more balls. */
    rageBallSpeedFactor: 1.2,
    rageExtraBalls: 1,
    /**
     * v171 SMASH: every ball breaks what stands in its way (props, barrels, lamps; never the fences). `damage` to a prop per ball [green, red]
     * (props: bush 5 hp, box 5, bed 4, scratcher 6, rock 9; barrels 2; lamps), times `rageFactor` in the rage. What breaks lets the ball fly on,
     * what survives (a rock hit by a green ball) stops it and is cracked for the next ball.
     */
    smash: { damage: [5, 9] as const, rageFactor: 1.4 },
  },
  /**
   * v147 THE CROWD: after a rally of `rallyHits` hits on one ball (Varu's swats plus returns by her or a tennis cat) the fans throw Varu a gift
   * (`FanThrowSystem.force('gift')`), at most one per `giftCooldownMs`, only while Federer is in the arena.
   */
  crowd: { rallyHits: 3, giftCooldownMs: 9000 },
  /** Attack weights by the situation (bigger = likelier). */
  decide: {
    /** Volley: better from afar. */
    volleyFarPx: 260, volleyFar: 1.5, volleyNear: 0.8,
    /** Serve: a standing Varu is the target (he is slower than `serveStillSpeed` px/s). */
    serveStillSpeed: 70, serveStill: 2.2, serveMoving: 0.9,
    /** Dash + swing: when Varu is within `dashNearPx`. */
    dashNearPx: 330, dashNear: 1.7, dashFar: 0.5,
    /** Ball boys: likely while few cats live, never when `ballBoysCatsMax` or more are on the field. */
    ballBoysFewBelow: 3, ballBoysFew: 1.4, ballBoysMany: 0.4, ballBoysCatsMax: 7,
  },
  /**
   * v146 RALLY: she answers a ball Varu swatted back at her, like the tennis cats (`TENNIS.ret`, entities/enemies/TennisCat.ts), but less often
   * and with rules that keep the weak point alive. Once per ball, when it is `senseRange` away and flying at her, she rolls [phase 1, phase 2]:
   * smash it back (`returnChance`), sidestep (`dodgeChance`), or take it (stun!). Fair play:
   *  - she answers only while she is free: circling, catching her breath, or in the middle of a volley (never while winding up a serve /
   *    dash / ball rain, never stunned);
   *  - a ball that is already closer than `minReactPx` when she first sees it is too late (point-blank swats always land);
   *  - a ball is returned at most `maxReturns` times, then it lands (the rally ends in a stun for whoever keeps swatting);
   *  - a returned ball is no faster than her own volley (`speedFactor`, `maxSpeed`) and, in phase 1, goes where Varu stands;
   *  - cornered (no room to sidestep) she cannot dodge; every landed ball of a rally hits harder (`BOSS.rallyBonus`).
   */
  rally: {
    returnChance: [0.3, 0.45] as const,
    dodgeChance: [0.1, 0.2] as const,
    senseRange: 330,
    minReactPx: 190,
    /** The ball must fly at her: not more than this far (px) off her middle (her body is 50 px wide plus the ball). */
    lateralPx: 62,
    /** The racket meets the ball this close (px from her middle; her body ends at ~63, a fast ball moves up to ~12 px a frame), and starts to swing `swingLeadPx` earlier. */
    reachPx: 104,
    swingLeadPx: 44,
    speedFactor: 0.95,
    maxSpeed: 520,
    maxReturns: 2,
    /** After a return she cannot return another ball for this long (ms): shorter than a rally's round trip, so the same ball can come back. */
    cooldownMs: 1000,
    /** The sidestep: how far (px, at least `dodgeMinPx` or she stays put), how long (ms), and how long her next attack waits while she answers a ball (ms). */
    dodgePx: 130,
    dodgeMinPx: 80,
    dodgeMs: 320,
    holdAttackMs: 800,
  },
  /** Ball rain: she smashes balls into the sky and they come down on marked spots (`systems/BallLobSystem.ts`, look in `BALL_LOB`). */
  lob: {
    weight: 1.1,
    telegraphMs: 820,
    balls: [6, 9] as const, // was 5, 8
    intervalMs: [200, 140] as const, // was 210, 150
    recoverMs: 1300,
    radius: 62, // the ring on the ground = where it hurts
    damage: 12, // was 11
    aimEvery: 3, // every 3rd ball comes down where Varu is heading, the others anywhere around him
    leadMs: 430,
    aimJitter: 28,
    scatterMin: 80,
    scatterMax: 340,
    spacing: 84, // balls of one volley land at least this far apart (when there is room)
    edgeMargin: 70,
    /** The balls are in the air this long after the last one leaves the racket (rise + hang + fall, `BALL_LOB`): the rain counts as a damage source meanwhile. */
    lingerMs: 1600,
  },
} as const;

/**
 * Bad luck from the bosses: ONE telegraphed attack of each boss also curses Varu if he stands inside its ring when it fires
 * (`Events.CurseZone`, handled by `systems/CurseSystem.ts`, which also applies the 12 s cooldown, the wave and the mercy rules).
 * The queen's decree gets a new gold ring of `radius` around her; the emo cat's scream and Federer's FIRST ball of the rain (the one aimed at Varu)
 * already have a ring: they use their own radius. The funny line is `BOSS_CURSE_LINES` (content/bosses.ts).
 */
export const BOSS_CURSE = {
  queen: { attack: 'decree', kind: 'big', radius: 170, color: 0xf5c518 },
  mafia: { attack: 'scream', kind: 'snail' },
  federer: { attack: 'lob', kind: 'dumbbell' },
} as const satisfies Record<BossType, { attack: string; kind: BadKind; radius?: number; color?: number }>;
