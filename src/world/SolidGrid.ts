import type { ArenaQuery, Point } from '../core/arena';

/**
 * Which tiles are solid, as a plain grid. No Phaser in here, so it is easy to test with node.
 * Built once from the Tiled `walls` layer; gameplay asks it instead of touching tiles.
 */
export class SolidGrid implements ArenaQuery {
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tile: number,
    private readonly solid: readonly boolean[],
  ) {}

  static empty(cols: number, rows: number, tile: number): SolidGrid {
    return new SolidGrid(cols, rows, tile, new Array<boolean>(cols * rows).fill(false));
  }

  /** Same as `isSolidAt` but by tile column and row. Outside the map counts as open. */
  isSolidTile(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.solid[row * this.cols + col] === true;
  }

  isSolidAt(x: number, y: number): boolean {
    const col = Math.floor(x / this.tile);
    const row = Math.floor(y / this.tile);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.solid[row * this.cols + col] === true;
  }

  isCircleFree(x: number, y: number, radius: number): boolean {
    return (
      !this.isSolidAt(x, y) &&
      !this.isSolidAt(x - radius, y) &&
      !this.isSolidAt(x + radius, y) &&
      !this.isSolidAt(x, y - radius) &&
      !this.isSolidAt(x, y + radius)
    );
  }

  nearestOpen(x: number, y: number, clearance = 0): Point {
    if (this.isCircleFree(x, y, clearance)) return { x, y };

    const col0 = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.tile)));
    const row0 = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.tile)));
    const maxRing = Math.max(this.cols, this.rows);

    for (let ring = 1; ring <= maxRing; ring++) {
      let best: Point | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue; // only the outline of the ring
          const col = col0 + dc;
          const row = row0 + dr;
          if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
          const cx = (col + 0.5) * this.tile;
          const cy = (row + 0.5) * this.tile;
          if (!this.isCircleFree(cx, cy, clearance)) continue;
          const dist = Math.hypot(cx - x, cy - y);
          if (dist < bestDist) {
            bestDist = dist;
            best = { x: cx, y: cy };
          }
        }
      }
      if (best) return best;
    }
    return { x, y };
  }
}

/** "No walls at all": used before the map exists and when arena.json is missing. */
export const NO_OBSTACLES: ArenaQuery = {
  isSolidAt: () => false,
  isCircleFree: () => true,
  nearestOpen: (x, y) => ({ x, y }),
};
