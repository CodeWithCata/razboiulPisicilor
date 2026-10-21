/** @file Which tiles are solid, as a plain grid (implements ArenaQuery). No Phaser. */
import type { ArenaQuery, Point } from '../core/arena';

/** A solid rectangle that is not a map tile (see `SolidGrid.addBlocker`). */
interface Blocker {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Which tiles are solid, as a plain grid. No Phaser in here, so it is easy to test with node.
 * Built once from the Tiled `walls` layer; gameplay asks it instead of touching tiles.
 */
export class SolidGrid implements ArenaQuery {
  /** Solid things that are not map tiles (mustard barrels, street lamps): plain rectangles in world px, added and removed while the run goes on. */
  private readonly blockers = new Map<number, Blocker>();
  private nextBlockerId = 1;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tile: number,
    private readonly solid: boolean[],
  ) {}

  static empty(cols: number, rows: number, tile: number): SolidGrid {
    return new SolidGrid(cols, rows, tile, new Array<boolean>(cols * rows).fill(false));
  }

  /** Same as `isSolidAt` but by tile column and row. Outside the map counts as open. */
  isSolidTile(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.solid[row * this.cols + col] === true || this.blockedTile(col, row);
  }

  /** A solid rectangle (center x, y, width, height in world px) appears: a barrel, a lamp. Returns its id for `removeBlocker`. */
  addBlocker(cx: number, cy: number, w: number, h: number): number {
    const id = this.nextBlockerId++;
    this.blockers.set(id, { x: cx - w / 2, y: cy - h / 2, w, h });
    return id;
  }

  /** The thing is gone (broken, sunk back into the floor): its rectangle is open again. */
  removeBlocker(id: number): void {
    this.blockers.delete(id);
  }

  /** True if the point is inside one of the blocker rectangles. */
  private blockedPoint(x: number, y: number): boolean {
    for (const b of this.blockers.values()) {
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  /** True if a circle touches one of the blocker rectangles. */
  private blockedCircle(x: number, y: number, radius: number): boolean {
    for (const b of this.blockers.values()) {
      const nx = Math.min(Math.max(x, b.x), b.x + b.w);
      const ny = Math.min(Math.max(y, b.y), b.y + b.h);
      if ((x - nx) ** 2 + (y - ny) ** 2 <= radius * radius) return true;
    }
    return false;
  }

  /** True if the tile overlaps one of the blocker rectangles (so walking routes go around it). */
  private blockedTile(col: number, row: number): boolean {
    if (this.blockers.size === 0) return false;
    const x0 = col * this.tile;
    const y0 = row * this.tile;
    for (const b of this.blockers.values()) {
      if (b.x < x0 + this.tile && b.x + b.w > x0 && b.y < y0 + this.tile && b.y + b.h > y0) return true;
    }
    return false;
  }

  /** A prop was destroyed: this tile is open from now on. */
  clearTile(col: number, row: number): void {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    this.solid[row * this.cols + col] = false;
  }

  /** A prop grew back: this tile is solid again. */
  setSolidTile(col: number, row: number): void {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    this.solid[row * this.cols + col] = true;
  }

  isSolidAt(x: number, y: number): boolean {
    const col = Math.floor(x / this.tile);
    const row = Math.floor(y / this.tile);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.solid[row * this.cols + col] === true || this.blockedPoint(x, y);
  }

  isCircleFree(x: number, y: number, radius: number): boolean {
    return (
      !this.blockedCircle(x, y, radius) &&
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
