/** @file The milk trail: a white smeared ribbon on the ground behind Varu (from his recent path) plus splotches beside it, in fixed-size buffers. */
import Phaser from 'phaser';
import { MILK_TRAIL } from '../config/animation';
import { hyp } from '../core/hyp';

/**
 * While the milk buff lasts Varu smears a white ribbon behind him: a strip of quads along his recent path, thinning out with age, with
 * splotches beside it and a puddle under him when he stands still. Everything lives in fixed-size typed arrays (`MILK_TRAIL.maxPoints`,
 * `maxBlobs`): no object or array is made per frame. When a buffer is full the oldest entry goes. Same look as before, just no garbage.
 */
export class MilkTrail {
  private readonly gfx: Phaser.GameObjects.Graphics;
  // Path points, a ring buffer: the oldest is at `pathStart`, `pathCount` of them in use.
  private readonly pathX: Float64Array;
  private readonly pathY: Float64Array;
  private readonly pathT: Float64Array;
  private pathStart = 0;
  private pathCount = 0;
  // Splotches, kept in drawing order in the first `blobCount` slots.
  private readonly blobX: Float64Array;
  private readonly blobY: Float64Array;
  private readonly blobR: Float64Array;
  private readonly blobT: Float64Array;
  private readonly blobLife: Float64Array;
  private blobCount = 0;
  /** Ribbon edge points for this frame: 8 numbers per path point (left inner x, y, left outer x, y, then the right side). */
  private readonly edge: Float64Array;
  /** Time since the last idle puddle splotch (ms). */
  private timer = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    const cap = MILK_TRAIL.maxPoints;
    const blobs = MILK_TRAIL.maxBlobs;
    this.pathX = new Float64Array(cap);
    this.pathY = new Float64Array(cap);
    this.pathT = new Float64Array(cap);
    this.blobX = new Float64Array(blobs);
    this.blobY = new Float64Array(blobs);
    this.blobR = new Float64Array(blobs);
    this.blobT = new Float64Array(blobs);
    this.blobLife = new Float64Array(blobs);
    this.edge = new Float64Array(cap * 8);
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  /** Every frame (when the trail is off, `active` is false: the old ribbon just fades). `now` is game ms; (x, y) and `facing` (his rotation) are where Varu is. */
  update(delta: number, now: number, active: boolean, x: number, y: number, facing: number): void {
    const cfg = MILK_TRAIL;
    if (active) {
      const moved = this.pathCount === 0 || hyp(x - this.lastX(), y - this.lastY()) >= cfg.sampleDist;
      if (moved) {
        this.pushPoint(x, y, now);
        // Splotches along the edges of the ribbon.
        if (Math.random() < cfg.blobChance) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const off = side * Phaser.Math.FloatBetween(cfg.width * 0.35, cfg.blobSpread);
          const dir = facing - Math.PI / 2; // facing; sideways is good enough for a smear
          this.pushBlob(
            x + Math.cos(dir + Math.PI / 2) * off,
            y + Math.sin(dir + Math.PI / 2) * off,
            Phaser.Math.FloatBetween(cfg.blobRadius.min, cfg.blobRadius.max),
            now,
            cfg.lifeMs * Phaser.Math.FloatBetween(0.7, 1.1),
          );
        }
      } else {
        // Standing still: a puddle slowly spreads under him.
        this.timer += delta;
        if (this.timer >= cfg.idleEveryMs) {
          this.timer = 0;
          this.pushBlob(
            x + Phaser.Math.Between(-8, 8),
            y + Phaser.Math.Between(-8, 8),
            Phaser.Math.FloatBetween(cfg.blobRadius.min, cfg.blobRadius.max),
            now,
            cfg.lifeMs,
          );
        }
      }
    }
    this.prune(now);
    this.draw(now);
  }

  /** He just drank the milk: a big white splat of splotches around (x, y). */
  splash(x: number, y: number, now: number): void {
    const sp = MILK_TRAIL.splash;
    for (let i = 0; i < sp.blobs; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * sp.spread;
      this.pushBlob(x + Math.cos(a) * d, y + Math.sin(a) * d, Phaser.Math.FloatBetween(sp.radius.min, sp.radius.max), now, Phaser.Math.Between(sp.lifeMs.min, sp.lifeMs.max));
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }

  /** Physical slot of the `i`-th point, oldest first. */
  private slot(i: number): number {
    return (this.pathStart + i) % this.pathX.length;
  }

  private lastX(): number {
    return this.pathX[this.slot(this.pathCount - 1)] ?? 0;
  }

  private lastY(): number {
    return this.pathY[this.slot(this.pathCount - 1)] ?? 0;
  }

  private pushPoint(x: number, y: number, now: number): void {
    if (this.pathCount === this.pathX.length) {
      this.pathStart = (this.pathStart + 1) % this.pathX.length; // full: the oldest point goes
      this.pathCount--;
    }
    const s = this.slot(this.pathCount);
    this.pathX[s] = x;
    this.pathY[s] = y;
    this.pathT[s] = now;
    this.pathCount++;
  }

  private pushBlob(x: number, y: number, r: number, now: number, life: number): void {
    if (this.blobCount === this.blobX.length) {
      // Full: drop the oldest splotch (shift the rest down one slot, in place).
      this.blobX.copyWithin(0, 1);
      this.blobY.copyWithin(0, 1);
      this.blobR.copyWithin(0, 1);
      this.blobT.copyWithin(0, 1);
      this.blobLife.copyWithin(0, 1);
      this.blobCount--;
    }
    const i = this.blobCount++;
    this.blobX[i] = x;
    this.blobY[i] = y;
    this.blobR[i] = r;
    this.blobT[i] = now;
    this.blobLife[i] = life;
  }

  /** Forget what has faded: old path points from the front, old splotches out of the list (order kept). */
  private prune(now: number): void {
    while (this.pathCount > 0 && now - this.pathT[this.pathStart]! > MILK_TRAIL.lifeMs) {
      this.pathStart = (this.pathStart + 1) % this.pathX.length;
      this.pathCount--;
    }
    let kept = 0;
    for (let i = 0; i < this.blobCount; i++) {
      if (now - this.blobT[i]! > this.blobLife[i]!) continue;
      if (kept !== i) {
        this.blobX[kept] = this.blobX[i]!;
        this.blobY[kept] = this.blobY[i]!;
        this.blobR[kept] = this.blobR[i]!;
        this.blobT[kept] = this.blobT[i]!;
        this.blobLife[kept] = this.blobLife[i]!;
      }
      kept++;
    }
    this.blobCount = kept;
  }

  /** Half-width of the ribbon at its age: it thins out to nothing. */
  private halfWidth(t: number, now: number): number {
    const cfg = MILK_TRAIL;
    return (cfg.width / 2) * Math.pow(Math.max(0, 1 - (now - t) / cfg.lifeMs), 0.6);
  }

  private draw(now: number): void {
    const cfg = MILK_TRAIL;
    const g = this.gfx;
    g.clear();
    if (this.pathCount === 0 && this.blobCount === 0) return;

    // The ribbon is ONE strip of quads (no overlapping circles), so the see-through look stays even.
    const n = this.pathCount;
    if (n >= 2) {
      const e = this.edge;
      for (let i = 0; i < n; i++) {
        const cur = this.slot(i);
        const prev = this.slot(Math.max(0, i - 1));
        const next = this.slot(Math.min(n - 1, i + 1));
        const dx = this.pathX[next]! - this.pathX[prev]!;
        const dy = this.pathY[next]! - this.pathY[prev]!;
        const len = hyp(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const hw = this.halfWidth(this.pathT[cur]!, now);
        const o = cfg.outline * Math.min(1, hw / 3); // the outline thins out with the ribbon
        const px = this.pathX[cur]!;
        const py = this.pathY[cur]!;
        const k = i * 8;
        e[k] = px + nx * hw;
        e[k + 1] = py + ny * hw;
        e[k + 2] = px + nx * (hw + o);
        e[k + 3] = py + ny * (hw + o);
        e[k + 4] = px - nx * hw;
        e[k + 5] = py - ny * hw;
        e[k + 6] = px - nx * (hw + o);
        e[k + 7] = py - ny * (hw + o);
      }
      for (let i = 0; i < n - 1; i++) {
        const a = i * 8;
        const b = a + 8;
        // Body, then the left and right outlines (the same order as before, so overlaps look the same).
        g.fillStyle(cfg.color, cfg.alpha);
        this.quad(g, e[a]!, e[a + 1]!, e[b]!, e[b + 1]!, e[b + 4]!, e[b + 5]!, e[a + 4]!, e[a + 5]!);
        g.fillStyle(cfg.edgeColor, cfg.alpha);
        this.quad(g, e[a]!, e[a + 1]!, e[b]!, e[b + 1]!, e[b + 2]!, e[b + 3]!, e[a + 2]!, e[a + 3]!); // left outline
        this.quad(g, e[a + 4]!, e[a + 5]!, e[b + 4]!, e[b + 5]!, e[b + 6]!, e[b + 7]!, e[a + 6]!, e[a + 7]!); // right outline
      }
    }

    // Splotches: the body, with the outline as a ring around it (so the two never overlap).
    for (let i = 0; i < this.blobCount; i++) {
      const r = this.blobR[i]! * Math.pow(Math.max(0, 1 - (now - this.blobT[i]!) / this.blobLife[i]!), 0.5);
      if (r < 0.3) continue;
      const x = this.blobX[i]!;
      const y = this.blobY[i]!;
      g.fillStyle(cfg.color, cfg.alpha).fillCircle(x, y, r);
      g.lineStyle(cfg.outline, cfg.edgeColor, cfg.alpha).strokeCircle(x, y, r + cfg.outline / 2);
    }
  }

  /** Two triangles for one quad a-b-c-d. */
  private quad(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): void {
    g.fillTriangle(ax, ay, bx, by, cx, cy);
    g.fillTriangle(ax, ay, cx, cy, dx, dy);
  }
}
