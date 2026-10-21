/** Dev-only cheats (`pnpm dev`). The key list and its texts are in content/lines.ts, the option lists in content/debugChoices.ts, the card's looks in config/hud.ts. */
export type DebugId =
  | 'spawnCat'
  | 'spawnCount'
  | 'spawnAt'
  | 'hideout'
  | 'horde'
  | 'killAll'
  | 'surrender'
  | 'freeze'
  | 'boss'
  | 'nextWave'
  | 'jumpWave'
  | 'holdWaves'
  | 'victory'
  | 'score'
  | 'speed'
  | 'god'
  | 'heal'
  | 'setHp'
  | 'cooldowns'
  | 'allBuffs'
  | 'pickup'
  | 'badLuck'
  | 'mysteryPrize'
  | 'clearBad'
  | 'weather'
  | 'marti13'
  | 'curseSure'
  | 'curseCooldown'
  | 'endBuff'
  | 'overuse'
  | 'teleport'
  | 'crowd'
  | 'fanThrow'
  | 'hitboxes'
  | 'tileset'
  | 'bossDuel'
  | 'bossAttack'
  | 'bossLoop'
  | 'bossHp'
  | 'bossStun'
  | 'bossReport'
  | 'bossExport'
  | 'bossAuto';

export const DEBUG = {
  /** X: how many random cats appear at once. */
  hordeSize: 10,
  /** J: points added to the score. */
  scoreBonus: 500,
  /** How often the card's live numbers (fps, cats, wave) refresh. */
  statsEveryMs: 250,
  /** Spawn at the cursor / teleport to it: the spot is moved to open floor, this far from walls is enough for any cat. */
  cursorClearancePx: 20,
  /** Waves the jump picker offers past the last campaign wave (endless waves). */
  extraWaves: 5,
} as const;

/**
 * Boss test lab (dev only): what a healthy duel looks like. These are STARTING GUESSES: play a few duels, read the scoreboard and move
 * the numbers until the verdicts match what you feel. A duel is judged by core/bossVerdict.ts; the words are in content/bossLab.ts.
 */
export const BOSS_LAB = {
  /** A duel shorter than this says nothing: no verdict. */
  minFightMs: 20000,
  /** How often the live panel refreshes. */
  refreshMs: 250,
  /** How many finished duels the scoreboard remembers. */
  bookMax: 40,
  /** The duel starts this long after a run begins when "Duel auto" is on (the HUD scene needs a moment to exist). */
  autoDuelDelayMs: 600,
  /** A win should take between these many seconds. */
  lengthSec: [40, 180] as const,
  /** In a win, Varu should lose between these shares (%) of his health. Under = too easy, over = too harsh. */
  hpLostPct: [15, 70] as const,
  /** Share of the (not stunned) fight the boss spends idle or recovering. Over the second = boring pauses, under the first = no breathing room. */
  downtime: [0.12, 0.5] as const,
  /** Fewer attacks per minute than this feels slow. */
  minAttacksPerMin: 12,
  /** Fewer different attacks than this is narrow. */
  minKinds: 3,
  /** One attack making up more than this share of all attacks (once there are `dominantMinUses`) is repetitive. */
  dominantShare: 0.45,
  dominantMinUses: 8,
  /** An attack used this often that never hit Varu is toothless; when this share of the attack kinds is toothless the boss is boring. */
  toothlessUses: 3,
  toothlessShare: 0.5,
  /** An attack used this often that hits Varu this share of the time is too hard to dodge. */
  unfairUses: 4,
  unfairHitRate: 0.8,
  /** More than this share of the fight stunned = a stun-lock exploit. */
  stunShareMax: 0.3,
  /** A lost duel where the boss still had more than this share (%) of its health is too brutal. */
  lostBossLeftPct: 60,
} as const;
