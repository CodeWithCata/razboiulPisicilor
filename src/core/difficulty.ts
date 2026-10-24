/** @file The chosen difficulty: loaded from the device, changed on the main menu, read by every run. */
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId, type DifficultyStats } from '../config/difficulty';
import { loadDifficulty, saveDifficulty } from './storage';

/** Only the menu changes it (never during a run), so every system can read it whenever it spawns something. */
let current: DifficultyId = loadDifficulty();

/** A custom run's own numbers (`core/customRules.ts`): set when the run is created, cleared when it ends. null = the chosen preset. */
let runOverride: DifficultyStats | null = null;

export const getDifficultyId = (): DifficultyId => current;
export const getDifficulty = (): DifficultyStats => runOverride ?? DIFFICULTIES[current];

/** Hands every system the numbers of the run that is playing (a custom game), or null to go back to the chosen difficulty. */
export function setRunDifficulty(stats: DifficultyStats | null): void {
  runOverride = stats;
}

export function setDifficulty(id: DifficultyId): void {
  current = id;
  saveDifficulty(id);
}

/** Next one in the order (Ușor -> Normal -> Greu -> Coșmar -> Ușor). Returns the new id. */
export function cycleDifficulty(): DifficultyId {
  const next = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(current) + 1) % DIFFICULTY_ORDER.length] ?? DEFAULT_DIFFICULTY;
  setDifficulty(next);
  return next;
}
