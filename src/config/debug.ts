/** Dev-only cheats (`pnpm dev`). The key list and its texts are in content/lines.ts, the card's looks in config/hud.ts. */
export type DebugId =
  | 'spawnCat'
  | 'horde'
  | 'killAll'
  | 'surrender'
  | 'boss'
  | 'nextWave'
  | 'victory'
  | 'god'
  | 'heal'
  | 'cooldowns'
  | 'allBuffs'
  | 'pickup'
  | 'score'
  | 'crowd'
  | 'hitboxes'
  | 'tileset';

export const DEBUG = {
  /** X: how many random cats appear at once. */
  hordeSize: 10,
  /** J: points added to the score. */
  scoreBonus: 500,
  /** How often the card's live numbers (fps, cats, wave) refresh. */
  statsEveryMs: 250,
} as const;
