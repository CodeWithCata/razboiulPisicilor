/** @file Lights out (every boss, at low health): a dark sheet over the arena with soft circles of light round Varu, the bosses and the lit street lamps. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { LIGHTS_OUT } from '../config/bosses';
import { Events, listen, type LightsOutPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { FloorLamp } from './FloorLamp';
import { telegraphDepth } from './Telegraph';

const KEY = 'lights_out_sheet';
const NORMAL_TELEGRAPH_DEPTH = 7;

/**
 * The dark is one small canvas (1/`divisor` of the screen, stretched over it) that is redrawn every frame: filled dark, then a soft hole is
 * cut for every light. It sits above the cats and Varu but under the projectiles, and the ground warnings and the thrown belt are lifted above it,
 * so everything that can hurt Varu stays readable; only the floor, the props and the cats far from a light vanish. It fades in and out.
 */
export class Blackout {
  private readonly cfg = LIGHTS_OUT;
  private readonly image: Phaser.GameObjects.Image | null = null;
  private readonly canvas: Phaser.Textures.CanvasTexture | null = null;
  private readonly ctx: CanvasRenderingContext2D | null = null;
  private target = 0;
  private level = 0;
  private clock = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly lamps: readonly FloorLamp[],
  ) {
    const C = this.cfg;
    const w = Math.ceil((GAME.width + C.marginPx * 2) / C.divisor);
    const h = Math.ceil((GAME.height + C.marginPx * 2) / C.divisor);
    if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    const canvas = scene.textures.createCanvas(KEY, w, h);
    const ctx = canvas?.getContext() ?? null;
    if (canvas && ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.image = scene.add.image(-C.marginPx, -C.marginPx, KEY).setOrigin(0).setScrollFactor(0).setDepth(C.depth).setAlpha(0).setVisible(false);
    }
    const off = listen<LightsOutPayload>(Events.LightsOut, ({ on }) => {
      this.target = on ? 1 : 0;
      telegraphDepth.value = on ? C.telegraphDepth : NORMAL_TELEGRAPH_DEPTH;
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      telegraphDepth.value = NORMAL_TELEGRAPH_DEPTH;
      if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    });
  }

  /** Every frame. `delta` is in ms. */
  update(delta: number): void {
    const image = this.image;
    if (!image || !this.canvas || !this.ctx) return;
    this.clock += delta;
    this.level += (this.target - this.level) * (1 - Math.exp(-delta / (this.cfg.fadeMs / 3)));
    if (this.level < 0.01 && this.target === 0) {
      image.setVisible(false);
      return;
    }
    image.setVisible(true).setAlpha(this.level).setDisplaySize(GAME.width + this.cfg.marginPx * 2, GAME.height + this.cfg.marginPx * 2);
    this.draw();
  }

  private draw(): void {
    const C = this.cfg;
    const canvas = this.canvas!;
    const ctx = this.ctx!;
    const view = this.scene.cameras.main.worldView;
    const toScreenX = GAME.width / view.width;
    const toScreenY = GAME.height / view.height;
    const k = canvas.width / (GAME.width + C.marginPx * 2); // screen px -> canvas px
    const [r, g, b] = C.rgb;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(${r},${g},${b},${C.darkness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';

    const light = (wx: number, wy: number, radius: number): void => {
      if (radius <= 1) return;
      const cx = ((wx - view.x) * toScreenX + C.marginPx) * k;
      const cy = ((wy - view.y) * toScreenY + C.marginPx) * k;
      const rad = radius * toScreenX * k;
      if (cx < -rad || cy < -rad || cx > canvas.width + rad || cy > canvas.height + rad) return;
      const grad = ctx.createRadialGradient(cx, cy, rad * C.soft, cx, cy, rad);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    };

    light(this.player.x, this.player.y, C.varuRadius * (1 + 0.025 * Math.sin(this.clock / 420))); // a slow breathing
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (enemy.active && enemy.isBoss) light(enemy.x, enemy.y, C.bossRadius);
    }
    for (const lamp of this.lamps) light(lamp.footX, lamp.footY - 40, C.lampRadius * lamp.lightLevel);

    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
  }
}
