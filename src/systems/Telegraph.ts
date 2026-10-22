/** @file Ground warning visuals for boss attacks (`telegraphCircle`, `telegraphLine`, `telegraphLineAimed`, `telegraphRect`) that can be cancelled early. */
import type Phaser from 'phaser';
import { flatBar, flatDisc, flatHoop } from './flatShapes';

/** Something that can be cancelled early (when a boss gets stunned, for example). */
export interface Telegraph {
  destroy(): void;
}

const RED = 0xff4d4d;

/** Draw depth of every ground warning. Lights out (`Blackout`) lifts it above the dark sheet so the warnings stay readable. */
export const telegraphDepth = { value: 7 };

/** Ground warning: a red circle that fills up until the attack lands. Placeholder visual. */
export function telegraphCircle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  durationMs: number,
  color = RED,
): Telegraph {
  // Atlas images, not `add.circle` shapes: a shape between sprites splits the draw batch (see flatShapes.ts).
  const outline = flatHoop(scene, x, y, radius, color, 0.9).setDepth(telegraphDepth.value);
  const fill = flatDisc(scene, x, y, radius, color, 0.3).setDepth(telegraphDepth.value);
  const full = fill.scale;
  fill.setScale(full * 0.05);
  const tween = scene.tweens.add({
    targets: fill, scale: full, duration: durationMs, ease: 'Linear',
    onComplete: () => { outline.destroy(); fill.destroy(); },
  });
  return {
    destroy: () => {
      tween.remove();
      outline.destroy();
      fill.destroy();
    },
  };
}

/** The lane starts this far filled (the old fill started at scale 0.02), the stroke is this thick (px). */
const LANE_START = 0.02;
const LANE_EDGE = 3;

/**
 * A lane on the floor made of atlas images (a rectangle shape between sprites splits the draw batch): a faint body, a stroke of four thin bars
 * (3 px, centered on the lane's edge like the old stroke) and a stronger fill that grows along the length. Origin: the middle of the start edge.
 * It is placed with cos / sin by hand, so nothing is allocated when it is aimed every frame. `lock` makes the stroke 5 px, white.
 */
class Lane {
  private readonly body: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly top: Phaser.GameObjects.Image;
  private readonly bottom: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly tail: Phaser.GameObjects.Image;
  private progress = LANE_START;
  private edge = LANE_EDGE;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private angle: number,
    private length: number,
    private readonly width: number,
    color: number,
  ) {
    const D = telegraphDepth.value;
    this.body = flatBar(scene, x, y, length, width, color, 0.1).setOrigin(0, 0.5).setDepth(D);
    // Same order as the old rectangles: the stroke is drawn first, the fill on top of it.
    this.top = flatBar(scene, x, y, length, LANE_EDGE, color, 0.8).setOrigin(0, 0.5).setDepth(D);
    this.bottom = flatBar(scene, x, y, length, LANE_EDGE, color, 0.8).setOrigin(0, 0.5).setDepth(D);
    this.head = flatBar(scene, x, y, LANE_EDGE, width, color, 0.8).setDepth(D);
    this.tail = flatBar(scene, x, y, LANE_EDGE, width, color, 0.8).setDepth(D);
    this.fill = flatBar(scene, x, y, length, width, color, 0.3).setOrigin(0, 0.5).setDepth(D);
    this.place();
  }

  /** Move, turn and resize every piece. */
  place(): void {
    if (this.dead) return;
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const a = this.angle;
    const L = this.length;
    const W = this.width;
    const t = this.edge;
    this.body.setPosition(this.x, this.y).setRotation(a).setDisplaySize(L, W);
    this.fill.setPosition(this.x, this.y).setRotation(a).setDisplaySize(L * this.progress, W);
    // The long edges start half a stroke early and end half a stroke late, so the corners are filled; the short ends sit between them.
    const lx = -t / 2;
    const ly = W / 2;
    this.top.setPosition(this.x + lx * c + ly * s, this.y + lx * s - ly * c).setRotation(a).setDisplaySize(L + t, t);
    this.bottom.setPosition(this.x + lx * c - ly * s, this.y + lx * s + ly * c).setRotation(a).setDisplaySize(L + t, t);
    const endH = Math.max(W - t, 0);
    this.head.setPosition(this.x, this.y).setRotation(a).setDisplaySize(t, endH);
    this.tail.setPosition(this.x + L * c, this.y + L * s).setRotation(a).setDisplaySize(t, endH);
  }

  /** How much of the lane is filled (0..1). */
  setProgress(p: number): void {
    if (this.dead) return;
    this.progress = p;
    this.fill.setDisplaySize(this.length * p, this.width);
  }

  aim(x: number, y: number, angle: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.place();
  }

  setLength(length: number): void {
    this.length = length;
    this.place();
  }

  /** The stroke turns white, 5 px and fully opaque (the fill is not changed). */
  lock(): void {
    this.edge = 5;
    for (const bar of [this.top, this.bottom, this.head, this.tail]) bar.setTint(0xffffff).setAlpha(1);
    this.place();
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.body.destroy();
    this.fill.destroy();
    this.top.destroy();
    this.bottom.destroy();
    this.head.destroy();
    this.tail.destroy();
  }
}

/** Runs a lane's fill over `durationMs`, then removes it. Returns the tween so the caller can cancel it. */
function fillLane(scene: Phaser.Scene, lane: Lane, durationMs: number) {
  return scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: durationMs,
    ease: 'Linear',
    onUpdate: (tween) => lane.setProgress(LANE_START + (1 - LANE_START) * (tween.getValue() ?? 0)),
    onComplete: () => lane.destroy(),
  });
}

/** Ground warning for a straight dash: a red lane that fills along its length. */
export function telegraphLine(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  durationMs: number,
  color = RED,
): Telegraph {
  const lane = new Lane(scene, x, y, angle, length, width, color);
  const tween = fillLane(scene, lane, durationMs);
  return {
    destroy: () => {
      tween.remove();
      lane.destroy();
    },
  };
}

/** A telegraph lane that can turn while it fills (the charge follows Varu) and then lock (it turns white). */
export interface AimedTelegraph extends Telegraph {
  aim(x: number, y: number, angle: number): void;
  /** Make the lane shorter or longer (a wall or a prop ends it). */
  setLength(length: number): void;
  lock(): void;
}

/** Like `telegraphLine`, but the lane can be moved and turned every frame with `aim`, and `lock` marks that it has stopped following. */
export function telegraphLineAimed(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  durationMs: number,
  color = RED,
): AimedTelegraph {
  const lane = new Lane(scene, x, y, angle, length, width, color);
  const tween = fillLane(scene, lane, durationMs);
  return {
    aim: (nx, ny, a) => lane.aim(nx, ny, a),
    setLength: (len) => lane.setLength(len),
    lock: () => lane.lock(),
    destroy: () => {
      tween.remove();
      lane.destroy();
    },
  };
}

/**
 * Ground warning for a straight-edged area (a band of floor). `fillIt` = it fills up like the other warnings; without it
 * only a calm outline shows for `durationMs` (the safe band of the red carpet). Atlas images, like `Lane`: a body, four edge bars
 * (4 px, centered on the edge) and, with `fillIt`, a fill that grows from the middle across the thin side.
 */
export function telegraphRect(
  scene: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  durationMs: number,
  color = RED,
  fillIt = true,
): Telegraph {
  const w = x2 - x1;
  const h = y2 - y1;
  const cx = x1 + w / 2;
  const cy = y1 + h / 2;
  const t = 4;
  const D = telegraphDepth.value;
  const parts: Phaser.GameObjects.Image[] = [
    flatBar(scene, cx, cy, w, h, color, fillIt ? 0.1 : 0.14).setDepth(D),
    flatBar(scene, cx, y1, w + t, t, color, 0.9).setDepth(D),
    flatBar(scene, cx, y2, w + t, t, color, 0.9).setDepth(D),
    flatBar(scene, x1, cy, t, Math.max(h - t, 0), color, 0.9).setDepth(D),
    flatBar(scene, x2, cy, t, Math.max(h - t, 0), color, 0.9).setDepth(D),
  ];
  const fill = fillIt ? flatBar(scene, cx, cy, w, h, color, 0.3).setDepth(D) : null;
  const wide = w >= h; // it grows across the thin side
  const grow = (p: number): void => {
    if (fill) fill.setDisplaySize(wide ? w : w * p, wide ? h * p : h);
  };
  grow(0.05);
  let gone = false;
  const clear = (): void => {
    if (gone) return;
    gone = true;
    for (const part of parts) part.destroy();
    fill?.destroy();
  };
  const tween = scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: durationMs,
    ease: 'Linear',
    onUpdate: (tw) => grow(0.05 + 0.95 * (tw.getValue() ?? 0)),
    onComplete: clear,
  });
  return {
    destroy: () => {
      tween.remove();
      clear();
    },
  };
}
