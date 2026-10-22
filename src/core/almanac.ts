/** @file Which almanac entries the player has met (a cat that appeared, a pickup that was grabbed). Saved in localStorage. */
import { loadAlmanacSeen, saveAlmanacSeen } from './storage';

let seen: Set<string> | null = null;

const ids = (): Set<string> => {
  seen ??= new Set(loadAlmanacSeen());
  return seen;
};

/** Remember that this cat type or pickup kind was met. Cheap when it is already known (one Set lookup); it writes to storage only the first time. */
export function markSeen(id: string): void {
  const set = ids();
  if (set.has(id)) return;
  set.add(id);
  saveAlmanacSeen([...set]);
}

/** True once the entry has been met. */
export function hasSeen(id: string): boolean {
  return ids().has(id);
}
