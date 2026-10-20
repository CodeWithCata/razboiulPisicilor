/** @file Breadth-first walking distances to a target, so cats path around walls (used by Enemy.steerTo). */
import type { Point } from './arena';

/** The few things the flow field needs to know about the map. SolidGrid provides them. */
export interface FlowGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tile: number;
  isSolidTile(col: number, row: number): boolean;
}

const UNREACHED = -1;
/** 8 directions: [dCol, dRow]. Diagonals are skipped when a wall is on either side (no corner cutting). */
const DIRS: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Walking distance (in tiles) from every open tile to one target, filled by a breadth-first search.
 * Cats that cannot see Varu ask it which neighbor tile is closer to him and walk there.
 * Rebuilt only when the target moves to another tile (576 tiles, so it is cheap). No Phaser, plain math.
 */
export class FlowField {
  private readonly dist: Int16Array;
  private readonly queue: Int32Array;
  private targetIndex = -1;

  constructor(private readonly grid: FlowGrid) {
    this.dist = new Int16Array(grid.cols * grid.rows).fill(UNREACHED);
    this.queue = new Int32Array(grid.cols * grid.rows);
  }

  private col(x: number): number {
    return Math.min(this.grid.cols - 1, Math.max(0, Math.floor(x / this.grid.tile)));
  }

  private row(y: number): number {
    return Math.min(this.grid.rows - 1, Math.max(0, Math.floor(y / this.grid.tile)));
  }

  /** True if (x, y) is in the tile the field currently leads to. */
  isTarget(x: number, y: number): boolean {
    return this.targetIndex === this.row(y) * this.grid.cols + this.col(x);
  }

  /** The walls changed (a prop was destroyed): the next `setTarget` rebuilds the field even for the same tile. */
  invalidate(): void {
    this.targetIndex = -1;
  }

  /** Point the field at a new target. Does nothing if the target is still in the same tile. */
  setTarget(x: number, y: number): void {
    const { cols, rows } = this.grid;
    const index = this.row(y) * cols + this.col(x);
    if (index === this.targetIndex) return;
    this.targetIndex = index;

    this.dist.fill(UNREACHED);
    // A target standing inside a wall tile (laser dot snapped, knockback) still seeds the search.
    this.dist[index] = 0;
    let head = 0;
    let tail = 0;
    this.queue[tail++] = index;
    while (head < tail) {
      const current = this.queue[head++];
      const c = current % cols;
      const r = (current - c) / cols;
      const next = this.dist[current] + 1;
      for (let d = 0; d < 4; d++) {
        const nc = c + DIRS[d][0];
        const nr = r + DIRS[d][1];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (this.dist[ni] !== UNREACHED || this.grid.isSolidTile(nc, nr)) continue;
        this.dist[ni] = next;
        this.queue[tail++] = ni;
      }
    }
  }

  /**
   * The center of the neighbor tile that is closest to the target, or null if the cat is already in the
   * target tile, stands in an unreachable spot, or there is no better neighbor.
   */
  nextPoint(x: number, y: number): Point | null {
    const { cols, rows, tile } = this.grid;
    const c = this.col(x);
    const r = this.row(y);
    const here = this.dist[r * cols + c];
    if (here <= 0) return null; // in the target tile, or in a wall / pocket the field never reached

    let best: Point | null = null;
    let bestDist = here;
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const d = this.dist[nr * cols + nc];
      if (d === UNREACHED || d >= bestDist) continue;
      if (dc !== 0 && dr !== 0 && (this.grid.isSolidTile(c + dc, r) || this.grid.isSolidTile(c, r + dr))) continue;
      bestDist = d;
      best = { x: (nc + 0.5) * tile, y: (nr + 0.5) * tile };
    }
    return best;
  }
}
