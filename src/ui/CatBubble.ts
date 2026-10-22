/** @file A cream thought-cloud bubble for a cat that talks in the arena: puffy inked edge, cel shading, shine and hatch ticks, two dots trailing to the speaker, jelly pop out of the tail tip, stays inside the screen. */
import Phaser from 'phaser';
import { BUBBLE, type BubbleKind } from '../config/bubble';
import { FONT } from '../config/style';
import { hyp } from '../core/hyp';

/**
 * The container sits ON THE TAIL TIP (the lowest dot), so the bubble pops out of the speaker's head and `place(x, y)` means "the dots point here".
 * The cloud is drawn above that point and slides sideways to stay on screen (the dots keep pointing at the speaker).
 * The cloud is a union of circles, painted in layers: navy (a bit bigger, thicker on the lower right like inked comic lines), then a warm
 * shade color, then cream circles pulled up and to the left (so a shaded rim stays on the lower right), then a white shine streak and a
 * few hatch ticks. The two tail circles slant down toward the speaker. All colors are opaque, so overlapping circles never double up. The owner (`systems/CatChatter.ts`) moves it every
 * frame and destroys it; the only tweens are the pop and the idle jelly, and `destroy` kills them.
 */
export class CatBubble {
  private readonly root: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  /** Half sizes of the ellipse the bumps sit on. */
  private readonly ea: number;
  private readonly eb: number;
  private readonly bump: number;
  private readonly seed: number;
  private readonly kind: BubbleKind;
  /** Bump centers (relative to the ellipse center) and radii: fixed per line, so the cloud never changes shape while it moves. */
  private readonly bumps: { x: number; y: number; r: number; ink: number }[] = [];
  /** How far the cloud is slid sideways from the tail (px); NaN = not drawn yet. */
  private shift = Number.NaN;
  /** True once the exit has started: the pop / idle tweens are gone and `place` drives the scale. */
  private leaving = false;
  /** The trailing dots, one per `BUBBLE.tail.dots` entry: positions rewritten on each shift change (radius fixed), never re-allocated. */
  private readonly dots: { x: number; y: number; r: number }[];
  /** Whole-cloud half sizes (outline included). The bumps never change after construction, so these are measured once. */
  private readonly halfW: number;
  private readonly halfH: number;

  constructor(
    private readonly scene: Phaser.Scene,
    line: string,
    kind: BubbleKind,
    depth: number,
  ) {
    const K = BUBBLE.kinds[kind];
    const C = BUBBLE.cloud;
    this.kind = kind;
    this.seed = line.length;
    this.text = scene.add
      .text(0, 0, line, { fontFamily: FONT, fontSize: `${K.size}px`, color: K.textColor, align: 'center', wordWrap: { width: K.wrapPx } })
      .setOrigin(0.5);
    this.ea = Math.max(BUBBLE.minHalfWidth, (this.text.width / 2) * BUBBLE.fit + BUBBLE.padX);
    this.eb = (this.text.height / 2) * BUBBLE.fit + BUBBLE.padY;
    this.bump = Phaser.Math.Clamp(this.eb * C.radiusShare, C.minRadius, C.maxRadius);
    this.buildBumps();
    const border = K.border;
    this.halfW = this.bumps.reduce((m, b) => Math.max(m, Math.abs(b.x) + b.r + border * b.ink), this.ea);
    this.halfH = this.bumps.reduce((m, b) => Math.max(m, Math.abs(b.y) + b.r + border * b.ink), this.eb);
    this.dots = BUBBLE.tail.dots.map((d) => ({ x: 0, y: 0, r: d.r }));
    this.art = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.art, this.text]).setDepth(depth);
    this.draw(0);
    scene.tweens.add({
      targets: this.root,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      duration: BUBBLE.popMs,
      ease: 'Back.easeOut',
      easeParams: [BUBBLE.popOvershoot],
      onComplete: () => this.startIdle(),
    });
  }

  get active(): boolean {
    return this.root.active;
  }

  /** Height of the cloud plus the dots: the room the bubble needs above the speaker. */
  get totalHeight(): number {
    return this.halfH * 2 + BUBBLE.tail.length;
  }

  /**
   * Put the tail tip at (x, y); keep the cloud inside `view` (world rectangle) if given.
   * `remaining` is 1 while the line is shown and falls to 0 at the end: the bubble then pops away (swells a little, then shrinks
   * into the tail tip). It is never faded, because see-through overlapping circles show seams.
   */
  place(x: number, y: number, remaining: number, view?: Phaser.Geom.Rectangle): void {
    let tipY = y;
    const T = BUBBLE.tail;
    // The cloud sits to one side of the speaker so the dots slant down to it; on the right half of the screen it goes left.
    const side = view && x > view.centerX ? -1 : 1;
    let shift = side * T.sideways;
    if (view) {
      const pad = BUBBLE.screenPadPx;
      const lo = view.x + pad + this.halfW;
      const hi = view.right - pad - this.halfW;
      shift = lo > hi ? view.centerX - x : Phaser.Math.Clamp(x + shift, lo, hi) - x;
      tipY = Math.max(y, view.y + pad + this.totalHeight); // the cloud never goes off the top
    }
    shift = Math.round(shift);
    if (shift !== this.shift) this.draw(shift);
    this.root.setPosition(x, tipY);
    if (remaining < 1) this.exit(remaining);
  }

  /** Exit pop: scale = 1 - Back.In(progress), so it swells a touch first, then shrinks to nothing at the tail tip. */
  private exit(remaining: number): void {
    if (!this.leaving) {
      this.leaving = true;
      this.scene.tweens.killTweensOf(this.root);
    }
    const s = Math.max(0, 1 - Phaser.Math.Easing.Back.In(1 - Phaser.Math.Clamp(remaining, 0, 1)));
    this.root.setScale(s, s);
  }

  /** Hidden while its speaker is off screen (the cloud would otherwise slide to the screen edge and point at nothing). */
  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.root);
    this.root.destroy();
  }

  /** Spread bumps evenly (by distance along the edge, not by angle) around the ellipse; each gets its own slightly different size. */
  private buildBumps(): void {
    const C = BUBBLE.cloud;
    const { ea, eb } = this;
    const steps = 240;
    const cum: number[] = [0];
    let px = ea;
    let py = 0;
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.cos(a) * ea;
      const y = Math.sin(a) * eb;
      cum.push(cum[i - 1]! + hyp(x - px, y - py));
      px = x;
      py = y;
    }
    const perimeter = cum[steps]!;
    const count = Math.max(8, Math.round(perimeter / (this.bump * C.spacing)));
    let k = 0;
    for (let n = 0; n < count; n++) {
      const target = (n / count) * perimeter;
      while (k < steps && cum[k + 1]! < target) k++;
      const a = (k / steps) * Math.PI * 2;
      const noise = Math.sin((n + 1) * 12.9898 + this.seed * 78.233) * 43758.5453;
      const wobble = 1 + (noise - Math.floor(noise) - 0.5) * 2 * C.wobble;
      const x = Math.cos(a) * ea;
      const y = Math.sin(a) * eb;
      this.bumps.push({ x, y, r: this.bump * wobble, ink: this.inkAt(x, y) });
    }
  }

  /** Outline thickness factor at a point of the cloud edge: thicker toward the lower right, thinner toward the upper left. */
  private inkAt(x: number, y: number): number {
    const nx = x / this.ea;
    const ny = y / this.eb;
    const len = hyp(nx, ny) || 1;
    return 1 + BUBBLE.cloud.ink * ((0.65 * ny) / len + (0.35 * nx) / len);
  }

  /** After the pop: breathe from the tail tip (wider + flatter, then taller + narrower), forever, until `destroy`. */
  private startIdle(): void {
    if (!this.root.active || this.leaving) return;
    const q = BUBBLE.idle.squash;
    this.scene.tweens.add({
      targets: this.root,
      scaleX: 1 + q,
      scaleY: 1 - q,
      duration: BUBBLE.idle.periodMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Cloud (slid by `shift`) + trailing dots whose lowest point is at (0, 0). */
  private draw(shift: number): void {
    this.shift = shift;
    const K = BUBBLE.kinds[this.kind];
    const T = BUBBLE.tail;
    const C = BUBBLE.cloud;
    const cx = shift;
    const cy = -(T.length + this.halfH);
    const g = this.art;
    g.clear();

    // Dots lie on the slanted line from the tip up to the cloud (leaning toward the cloud's side).
    const lean = Phaser.Math.Clamp(shift, -this.ea * T.leanMax, this.ea * T.leanMax);
    const dots = this.dots;
    for (let i = 0; i < dots.length; i++) {
      const up = T.dots[i]!.up;
      dots[i]!.x = (lean * up) / T.length;
      dots[i]!.y = -up;
    }

    // Cel shading: the cream is pulled toward the light by this much (so the shade shows on the far side).
    const k = C.shadeInset;
    const ox = C.light.x * k;
    const oy = C.light.y * k;
    const kd = k * T.shadeShare;

    // 1) inked outline: every bump a bit bigger (thicker on the lower right), the body ellipse, the dots.
    g.fillStyle(BUBBLE.outline, 1);
    for (const b of this.bumps) g.fillCircle(cx + b.x, cy + b.y, b.r + K.border * b.ink);
    g.fillEllipse(cx, cy, this.ea * 2, this.eb * 2);
    for (const d of dots) g.fillCircle(d.x, d.y, d.r + K.border * T.borderShare);

    // 2) the shade color fills the whole cloud.
    g.fillStyle(BUBBLE.shade, 1);
    for (const b of this.bumps) g.fillCircle(cx + b.x, cy + b.y, b.r);
    g.fillEllipse(cx, cy, this.ea * 2, this.eb * 2);
    for (const d of dots) g.fillCircle(d.x, d.y, d.r);

    // 3) cream on top, smaller and pulled toward the light: it stays inside the shade, which is left as a rim on the lower right.
    g.fillStyle(BUBBLE.fill, 1);
    for (const b of this.bumps) g.fillCircle(cx + b.x + ox, cy + b.y + oy, Math.max(1, b.r - k));
    g.fillEllipse(cx + ox, cy + oy, Math.max(2, (this.ea - k) * 2), Math.max(2, (this.eb - k) * 2));
    for (const d of dots) g.fillCircle(d.x + C.light.x * kd, d.y + C.light.y * kd, Math.max(1, d.r - kd));

    // 4) white shine on the upper left, a glint on the big dot, and hatch ticks on the shaded side.
    this.paintShine(g, cx, cy);
    const big = dots[0];
    if (big) {
      const gl = big.r * T.glintShare;
      g.fillStyle(BUBBLE.shineColor, 1).fillCircle(big.x - gl, big.y - gl, T.glintRadius);
    }
    this.paintHatch(g, cx, cy);

    this.text.setPosition(cx, cy);
  }

  /** A tapered streak of white dots along a smaller ellipse (upper left), plus one round glint under it. */
  private paintShine(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const S = BUBBLE.shine;
    if (this.ea < S.minHalfWidth) return;
    g.fillStyle(BUBBLE.shineColor, 1);
    for (let i = 0; i < S.steps; i++) {
      const t = i / (S.steps - 1);
      const a = Phaser.Math.DegToRad(S.fromDeg + (S.toDeg - S.fromDeg) * t);
      const r = S.minRadius + (S.maxRadius - S.minRadius) * Math.sin(t * Math.PI); // thin at both ends, fat in the middle
      g.fillCircle(cx + Math.cos(a) * this.ea * S.insetX, cy + Math.sin(a) * this.eb * S.insetY, r);
    }
    if (S.glint > 0) {
      const a = Phaser.Math.DegToRad(S.fromDeg - 14);
      g.fillCircle(cx + Math.cos(a) * this.ea * S.insetX, cy + Math.sin(a) * this.eb * S.insetY, S.glint);
    }
  }

  /** A few short parallel "/" strokes along the lower-right shaded rim. */
  private paintHatch(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const H = BUBBLE.hatch;
    if (this.ea < H.minHalfWidth) return;
    g.lineStyle(H.width, BUBBLE.hatchColor, 1);
    const half = H.length / 2;
    for (let i = 0; i < H.count; i++) {
      const a = Phaser.Math.DegToRad(H.fromDeg + H.stepDeg * i);
      const x = cx + Math.cos(a) * this.ea * H.inset;
      const y = cy + Math.sin(a) * this.eb * H.inset;
      g.lineBetween(x + half, y - half, x - half, y + half);
    }
  }
}
