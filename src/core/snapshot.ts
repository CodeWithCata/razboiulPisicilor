/** @file `snapshotInto(list, out)`: a reusable copy of a list for loops that may add or remove members, without a new array every frame. */

/**
 * Copies `list` into `out` (emptied first) and returns `out`. Per-frame loops over a Phaser group copy it because cats and
 * shots can be added or removed while the loop runs; `list.slice()` did that with a fresh array every frame, this reuses one.
 * Empty `out` again after the loop (`out.length = 0`) so it does not keep destroyed objects alive.
 */
export function snapshotInto<T>(list: readonly T[], out: T[]): T[] {
  out.length = 0;
  for (let i = 0; i < list.length; i++) out.push(list[i]!);
  return out;
}
