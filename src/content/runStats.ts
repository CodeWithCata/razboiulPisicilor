/** @file The run summary lines shown on the game over and victory screens. */
import { DIFFICULTIES, type DifficultyId } from '../config/difficulty';

/** What GameScene hands to the end screens about the run. */
export interface RunSummary {
  difficulty: DifficultyId;
  /** The name to show (a custom game has its own: "Personalizat"). Without it the name of `difficulty` is shown. */
  difficultyName?: string;
  timeMs: number;
  bestCombo: number;
  /** The longest chain ever on this device (after this run) and whether this run set it. */
  comboRecord: number;
  newComboRecord: boolean;
  hits: number;
  perfectDodges: number;
}

const nameOf = (s: RunSummary): string => s.difficultyName ?? DIFFICULTIES[s.difficulty].name;

export const mmss = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Two lines for the game over screen. */
export function summaryLines(s: RunSummary): [string, string] {
  const combo = s.newComboRecord ? `Combo max: ${s.bestCombo} (RECORD!)` : `Combo max: ${s.bestCombo} (record ${s.comboRecord})`;
  return [`Dificultate: ${nameOf(s)}   •   Timp: ${mmss(s.timeMs)}`, `${combo}   •   Lovituri: ${s.hits}   •   Tumbe perfecte: ${s.perfectDodges}`];
}

/** One short line for the victory screen (it has little room). */
export const summaryShort = (s: RunSummary): string => `${nameOf(s)}   •   ${mmss(s.timeMs)}   •   Combo max: ${s.bestCombo}   •   Lovituri: ${s.hits}`;
