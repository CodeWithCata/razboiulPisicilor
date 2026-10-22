/** @file Fence pieces that ripple when shaken: lifts a tile off the layer while a sprite wobbles. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { tileKey } from '../../assets/propTextures';
import { ARENA } from '../../config/arena';
import { PROP_FEEL, PROP_TUNING } from '../../config/props';
import { gameClock } from '../../core/clock';
import { isVerticalFence, type TileRead } from '../../world/propLayout';
import { Spring } from './Spring';

const TAU = Math.PI * 2;

/** One fence piece that is shaking right now: its tile is taken off the layer and a sprite plays the wobble instead. */
interface Shake {
  sprite: Phaser.GameObjects.Image;
  gid: number;
  col: number;
  row: number;
  baseX: number;
  baseY: number;
  tilt: Spring;
  shiftX: Spring;
  shiftY: Spring;
}

/**
 * The fences. There are well over a hundred pieces, so they stay plain tiles on the visual layer. A piece only becomes
 * a sprite for the moment it shakes (its tile is lifted off the layer, then put back), and the shake ripples along the
 * fence to the neighbors, one after another. The real solid tiles are on the hidden `walls` layer and never change.
 */
export class Fences {
  private readonly spots = new Map<number, TileRead>();
  private readonly shaking = new Map<number, Shake>();
  private readonly readyAt = new Map<number, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.Tilemaps.TilemapLayer,
    fences: readonly TileRead[],
    private readonly cols: number,
  ) {
    for (const spot of fences) this.spots.set(this.key(spot.col, spot.row), spot);
  }

  has(col: number, row: number): boolean {
    return this.spots.has(this.key(col, row));
  }

  /** Hit one piece and ripple to its neighbors. Returns false if that piece was hit a moment ago. */
  hit(col: number, row: number, dirX: number, dirY: number, power: number): boolean {
    const key = this.key(col, row);
    const spot = this.spots.get(key);
    const now = gameClock.now;
    if (!spot || now < (this.readyAt.get(key) ?? 0)) return false;
    this.readyAt.set(key, now + PROP_TUNING.fence.cooldownMs);

    this.shake(spot, dirX, dirY, power);
    const { rippleSteps, falloff, stepDelayMs } = PROP_TUNING.fence;
    const vertical = isVerticalFence(spot.id);
    for (let step = 1; step <= rippleSteps; step++) {
      for (const sign of [-1, 1]) {
        const next = this.spots.get(vertical ? this.key(col, row + sign * step) : this.key(col + sign * step, row));
        if (!next || isVerticalFence(next.id) !== vertical) continue;
        const weaker = power * falloff ** step;
        this.scene.time.delayedCall(step * stepDelayMs, () => this.shake(next, dirX, dirY, weaker));
      }
    }
    return true;
  }

  update(dt: number): void {
    if (this.shaking.size === 0) return;
    const f = PROP_FEEL.fence;
    for (const [key, s] of this.shaking) {
      s.tilt.step(dt, f.hz, f.damping);
      s.shiftX.step(dt, f.hz, f.damping);
      s.shiftY.step(dt, f.hz, f.damping);
      if (s.tilt.resting && s.shiftX.resting && s.shiftY.resting) {
        this.finish(key, s);
        continue;
      }
      s.sprite.setRotation(s.tilt.value);
      s.sprite.setPosition(s.baseX + s.shiftX.value, s.baseY + s.shiftY.value);
    }
  }

  private shake(spot: TileRead, dirX: number, dirY: number, power: number): void {
    const key = this.key(spot.col, spot.row);
    let s = this.shaking.get(key);
    if (!s) {
      const tile = this.layer.getTileAt(spot.col, spot.row);
      if (!tile) return;
      const vertical = isVerticalFence(spot.id);
      const pivot = vertical ? 0.5 : PROP_FEEL.fence.pivot;
      const x0 = spot.col * ARENA.tile;
      const y0 = spot.row * ARENA.tile;
      const baseX = x0 + ARENA.tile / 2;
      const baseY = y0 + ARENA.tile * pivot;
      this.layer.removeTileAt(spot.col, spot.row, true, false); // the sprite below takes over drawing this piece
      s = {
        sprite: this.scene.add.image(baseX, baseY, ...texArgs(tileKey(spot.id))).setOrigin(0.5, pivot).setDepth(ARENA.depth.walls),
        gid: tile.index,
        col: spot.col,
        row: spot.row,
        baseX,
        baseY,
        tilt: new Spring(),
        shiftX: new Spring(),
        shiftY: new Spring(),
      };
      this.shaking.set(key, s);
    }
    const f = PROP_FEEL.fence;
    const omega = TAU * f.hz * PROP_TUNING.kickGain;
    const lean = Math.abs(dirX) < 0.2 ? (Math.random() < 0.5 ? -0.4 : 0.4) : dirX;
    s.tilt.kick(lean * Phaser.Math.DegToRad(f.tiltDeg) * power * omega);
    s.shiftX.kick(dirX * f.nudge * power * omega);
    s.shiftY.kick(dirY * f.nudge * power * omega);
  }

  /** The wobble is over: the tile goes back on the layer and the sprite goes away. */
  private finish(key: number, s: Shake): void {
    this.layer.putTileAt(s.gid, s.col, s.row, false);
    s.sprite.destroy();
    this.shaking.delete(key);
  }

  private key(col: number, row: number): number {
    return row * this.cols + col;
  }
}
