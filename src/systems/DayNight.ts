/** @file Day to night: a colored sheet over the arena that follows the wave number, plus floor lamps that glow when it gets dark. */
import Phaser from 'phaser';
import { DAY_NIGHT } from '../config/dayNight';
import { GAME } from '../config/balance';
import { ENDLESS, FINAL_WAVE } from '../config/waves';
import type { RunMode } from '../core/run';
import { Events, listen, type WavePayload } from '../core/events';

const channel = (color: number, shift: number): number => (color >> shift) & 0xff;

/** 0 = afternoon, 1 = night, for a wave number. The campaign runs once from the first wave to the last; endless swings back and forth. */
export function nightProgress(wave: number, mode: RunMode): number {
  if (mode === 'endless') {
    const turn = (Math.max(wave, ENDLESS.startWave) - ENDLESS.startWave) / DAY_NIGHT.endlessCycleWaves;
    return 0.5 - 0.5 * Math.cos(turn * Math.PI * 2);
  }
  return Phaser.Math.Clamp((wave - 1) / Math.max(1, FINAL_WAVE - 1), 0, 1);
}

/**
 * The sky follows `WaveStarted`: it eases toward the new wave's value (config/dayNight.ts), so the change is slow and never pops.
 * Lamps are plain shapes plus a soft glow texture made once in a canvas. All of it belongs to the scene.
 */
export class DayNight {
  private readonly sheet: Phaser.GameObjects.Rectangle;
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly bulbs: Phaser.GameObjects.Arc[] = [];
  private current: number;
  private target: number;
  private clock = 0;

  constructor(scene: Phaser.Scene, private readonly mode: RunMode) {
    this.current = this.target = nightProgress(mode === 'endless' ? ENDLESS.startWave : 1, mode);
    const M = DAY_NIGHT.margin;
    this.sheet = scene.add
      .rectangle(-M, -M, GAME.width + M * 2, GAME.height + M * 2, 0xffffff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DAY_NIGHT.depth);
    this.buildLamps(scene);
    this.apply();

    const off = listen<WavePayload>(Events.WaveStarted, ({ wave }) => {
      this.target = nightProgress(wave, this.mode);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  update(delta: number): void {
    if (!DAY_NIGHT.enabled) return;
    this.clock += delta;
    this.current += (this.target - this.current) * (1 - Math.exp(-delta / (DAY_NIGHT.transitionMs / 3)));
    this.apply();
  }

  private buildLamps(scene: Phaser.Scene): void {
    const L = DAY_NIGHT.lamp;
    if (!scene.textures.exists(L.glowKey)) {
      const size = L.glowTexture;
      const canvas = scene.textures.createCanvas(L.glowKey, size, size);
      const ctx = canvas?.getContext();
      if (canvas && ctx) {
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, `rgba(${L.glowRgb},0.95)`);
        g.addColorStop(0.45, `rgba(${L.glowRgb},0.4)`);
        g.addColorStop(1, `rgba(${L.glowRgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        canvas.refresh();
      }
    }
    const haveGlow = scene.textures.exists(L.glowKey);
    for (const lamp of DAY_NIGHT.lamps) {
      scene.add.circle(lamp.x, lamp.y, L.baseRadius, L.baseColor).setDepth(L.floorDepth);
      this.bulbs.push(scene.add.circle(lamp.x, lamp.y, L.bulbRadius, L.bulbColor).setDepth(L.floorDepth + 0.1));
      if (haveGlow) {
        this.glows.push(scene.add.image(lamp.x, lamp.y, L.glowKey).setDisplaySize(L.glowRadius * 2, L.glowRadius * 2).setDepth(L.glowDepth).setAlpha(0));
      }
    }
  }

  /** Sets the sheet color and the lamps for the current progress. */
  private apply(): void {
    const sky = DAY_NIGHT.sky;
    const p = Phaser.Math.Clamp(this.current, 0, 1);
    let i = 0;
    while (i < sky.length - 2 && p > sky[i + 1]!.at) i++;
    const a = sky[i]!;
    const b = sky[i + 1]!;
    const k = Phaser.Math.Clamp((p - a.at) / Math.max(0.0001, b.at - a.at), 0, 1);
    const mix = (shift: number): number => Math.round(channel(a.color, shift) + (channel(b.color, shift) - channel(a.color, shift)) * k);
    this.sheet.setFillStyle((mix(16) << 16) | (mix(8) << 8) | mix(0), a.alpha + (b.alpha - a.alpha) * k);

    // Lamps: off in the afternoon, full at night, with a slow flicker.
    const L = DAY_NIGHT.lamp;
    const lit = Phaser.Math.Clamp((p - L.onAt) / (1 - L.onAt), 0, 1);
    this.glows.forEach((glow, n) => {
      const flicker = 1 - L.flicker * (0.5 + 0.5 * Math.sin(this.clock / L.flickerMs * Math.PI * 2 + n * 1.7));
      glow.setAlpha(lit * L.glowAlpha * flicker);
    });
    this.bulbs.forEach((bulb) => bulb.setAlpha(0.55 + 0.45 * lit));
  }
}
