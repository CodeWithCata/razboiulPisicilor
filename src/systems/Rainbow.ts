/** @file The rainbow event: after a rainy wave a cartoon rainbow fades in over the screen for the next wave and 2-3 bonus pickups drop under it. */
import Phaser from 'phaser';
import { queueDrawn, texArgs } from '../assets/atlas';
import { PLAY_AREA } from '../config/arena';
import type { PickupKind } from '../config/balance';
import { RAINBOW } from '../config/rainbow';
import { gameClock } from '../core/clock';
import { bus, Events, listen, type PointPayload, type WeatherPayload } from '../core/events';
import type { Player } from '../entities/Player';
import { GAME } from '../config/balance';

export interface RainbowHooks {
  /** A random pickup kind (the usual weights). */
  rollKind: () => PickupKind;
  spawnPickup: (kind: PickupKind, x: number, y: number) => void;
  /** Says a line over Varu (once, when the rainbow appears). */
  announce: () => void;
}

/** Draws the arc and its two clouds once, in the game's cartoon style (navy outline, flat colors). */
function paintRainbow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const A = RAINBOW.art;
  const cx = x + A.w / 2;
  const cy = y + A.h - 60; // the arc's center sits low; its ends are hidden by the clouds
  const outerR = Math.min(A.w / 2 - 40, A.h - 70);
  ctx.lineCap = 'butt';
  // Navy outline: a wider navy arc under the colors.
  const total = A.bands.length * A.bandW;
  ctx.strokeStyle = A.navy;
  ctx.lineWidth = total + A.outline * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - total / 2, Math.PI, Math.PI * 2);
  ctx.stroke();
  A.bands.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = A.bandW + 1;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - A.bandW * (i + 0.5), Math.PI, Math.PI * 2);
    ctx.stroke();
  });
  // A cloud at each foot: navy puffs first, then cream puffs on top.
  const feet = [cx - outerR + total / 2, cx + outerR - total / 2];
  const puffs: ReadonlyArray<readonly [number, number, number]> = [[-34, 8, 30], [0, -8, 40], [36, 8, 30], [-12, 20, 26], [18, 20, 26]];
  for (const pass of [A.navy, A.cloud]) {
    ctx.fillStyle = pass;
    const grow = pass === A.navy ? A.outline : 0;
    for (const fx of feet) {
      for (const [dx, dy, r] of puffs) {
        ctx.beginPath();
        ctx.arc(fx + dx, cy + dy, r + grow, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Listens to `Events.WeatherChanged`: when the payload says `rainbow` (Weather forces it on the wave after rain) the picture fades in,
 * pops in, shimmers for `RAINBOW.holdMs` and fades out again by itself (or sooner if the wave is cleared); it does not stay for the wave. A few moments after it appears
 * the bonus pickups drop, one by one, each with a sparkle (`Events.RainbowDrop`). Screen space: it is always in view.
 */
export class Rainbow {
  private readonly image: Phaser.GameObjects.Image;
  private amount = 0;
  private target = 0;
  /** The event is running (the pickups may still drop) even after the picture has faded away. */
  private running = false;
  private baseScale = 1;
  private readonly used: PickupKind[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly hooks: RainbowHooks,
  ) {
    const A = RAINBOW.art;
    queueDrawn(scene, A.key, A.w, A.h, paintRainbow);
    const width = GAME.width * RAINBOW.widthShare;
    this.image = scene.add
      .image(GAME.width / 2, GAME.height * RAINBOW.topShare, ...texArgs(A.key))
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(RAINBOW.depth)
      .setAlpha(0)
      .setVisible(false);
    this.image.setDisplaySize(width, (width * A.h) / A.w);
    this.baseScale = this.image.scaleX;
    const off = [
      listen<WeatherPayload>(Events.WeatherChanged, (e) => (e.rainbow ? this.begin() : this.stop())),
      listen(Events.WaveCleared, () => this.stop()),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  private stop(): void {
    this.running = false;
    this.target = 0;
  }

  private begin(): void {
    this.running = true;
    this.target = 1;
    this.scene.time.delayedCall(RAINBOW.fadeInMs + RAINBOW.holdMs, () => (this.target = 0)); // the show is short: hide it, the drops go on
    this.hooks.announce();
    const R = RAINBOW;
    const count = Phaser.Math.Between(R.drops.min, R.drops.max);
    this.used.length = 0;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(R.firstDropMs + i * R.dropGapMs, () => this.drop());
    }
  }

  /** One bonus pickup under the rainbow, at a spot inside the view away from Varu. */
  private drop(): void {
    if (!this.running || !this.player.alive) return; // the wave ended meanwhile
    const R = RAINBOW;
    let kind = this.hooks.rollKind();
    for (let i = 0; i < 8 && (R.excludeKinds.includes(kind) || this.used.includes(kind)); i++) kind = this.hooks.rollKind();
    if (R.excludeKinds.includes(kind)) return;
    this.used.push(kind);
    const view = this.scene.cameras.main.worldView;
    let x = view.centerX;
    let y = view.centerY;
    for (let i = 0; i < 10; i++) {
      x = Phaser.Math.Clamp(view.x + view.width * Phaser.Math.FloatBetween(R.area.x[0], R.area.x[1]), PLAY_AREA.left + 70, PLAY_AREA.right - 70);
      y = Phaser.Math.Clamp(view.y + view.height * Phaser.Math.FloatBetween(R.area.y[0], R.area.y[1]), PLAY_AREA.top + 70, PLAY_AREA.bottom - 70);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) >= R.minFromVaruPx) break;
    }
    this.hooks.spawnPickup(kind, x, y);
    const at: PointPayload = { x, y };
    bus.emit(Events.RainbowDrop, at);
  }

  /** Every frame (`delta` in game ms): fade toward the target and shimmer. No allocations. */
  update(delta: number): void {
    const R = RAINBOW;
    if (this.amount === this.target && this.target === 0) return;
    const step = delta / (this.target > this.amount ? R.fadeInMs : R.fadeOutMs);
    this.amount = this.target > this.amount ? Math.min(this.target, this.amount + step) : Math.max(this.target, this.amount - step);
    const visible = this.amount > 0.002;
    if (visible !== this.image.visible) this.image.setVisible(visible);
    if (!visible) return;
    const shimmer = 1 + R.shimmer.amount * Math.sin((gameClock.now / R.shimmer.periodMs) * Math.PI * 2);
    const rise = (1 - this.amount) * 24; // it also floats up a little as it fades in
    const pop = this.baseScale * (R.popFrom + (1 - R.popFrom) * Phaser.Math.Easing.Back.Out(this.amount));
    this.image.setAlpha(R.alpha * this.amount * shimmer).setY(GAME.height * R.topShare + rise).setScale(pop);
  }
}
