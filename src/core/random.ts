/** Pick a key with probability proportional to its weight. */
export function weightedPick<K extends string>(weights: Record<K, number>): K {
  const entries = Object.entries(weights) as Array<[K, number]>;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

/** Random item that is not `last` (unless it is the only choice), so a joke never repeats back to back. */
export function pickNoRepeat<T>(list: readonly T[], last?: T): T {
  const options = list.length > 1 ? list.filter((item) => item !== last) : list;
  return options[Math.floor(Math.random() * options.length)]!;
}
