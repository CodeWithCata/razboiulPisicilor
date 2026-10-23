/** @file The chosen difficulty: loaded from the device, changed on the main menu, read by every run. */
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId, type DifficultyStats } from '../config/difficulty';
import { loadDifficulty, saveDifficulty } from './storage';

/** Only the menu changes it (never during a run), so every system can read it whenever it spawns something. */
let current: DifficultyId = loadDifficulty();

export const getDifficultyId = (): DifficultyId => current;
export const getDifficulty = (): DifficultyStats => DIFFICULTIES[current];

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
