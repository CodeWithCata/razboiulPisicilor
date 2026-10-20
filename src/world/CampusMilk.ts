/** @file The milk that fills the "Campus!" lettering on the grass, glyph by glyph, as the waves go by (numbers: CAMPUS_MILK in config/arena.ts). */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { CAMPUS_MILK as M, CAMPUS_TEXT } from '../config/arena';
import { Events, listen, type WavePayload } from '../core/events';

const MILK_KEY = 'campus_milk';

/**
 * A second image on top of the dirt lettering, drawn from the same picture: every dirt pixel becomes cream-white milk (the cracks and
 * roots stay dirt, so the milk looks poured into the letters). Each glyph has a fill level (0..1) that rises with a wobbly surface when its
 * wave starts. The wave number decides how many glyphs are full: balanced, one every two waves, all seven at wave 15 (and in endless).
 */
export class CampusMilk {
  private readonly glyphs = M.cuts.length - 1;
  /** Fill level per glyph, and the game time its pour starts (-1 = not pouring). */
  private readonly level: number[] = new Array(this.glyphs).fill(0);
  private readonly pourStart: number[] = new Array(this.glyphs).fill(-1);
  private readonly milk: HTMLCanvasElement;
  private readonly out: Phaser.Textures.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private clock = 0;
  private seenWave = 0;
  private dirty = false;

  constructor(scene: Phaser.Scene) {
    const src = scene.textures.get(Tex.CampusText).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = src.width;
    const h = src.height;
    this.milk = this.paintMilk(src, w, h);

    if (scene.textures.exists(MILK_KEY)) scene.textures.remove(MILK_KEY); // a restarted scene builds it again
    this.out = scene.textures.createCanvas(MILK_KEY, w, h)!;
    this.ctx = this.out.getContext();
    scene.add
      .image(CAMPUS_TEXT.x, CAMPUS_TEXT.y, MILK_KEY)
      .setDepth(M.depth)
      .setScale(CAMPUS_TEXT.width / w);

    const off = listen<WavePayload>(Events.WaveStarted, ({ wave }) => this.onWave(wave));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    });
  }

  /** The dirt picture turned into milk: cream white, a little blue-grey where the dirt is darker, cracks left out. */
  private paintMilk(src: HTMLImageElement | HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!) / 255;
      if (d[i + 3]! < 230 || lum < M.crackBelow) {
        d[i + 3] = 0; // outside the letters, or a crack: stays dirt
        continue;
      }
      const t = Math.min(1, Math.max(0, (0.47 - lum) / 0.2)) * 0.55; // darker dirt = a little more shade
      d[i] = M.cream[0] + (M.shade[0] - M.cream[0]) * t;
      d[i + 1] = M.cream[1] + (M.shade[1] - M.cream[1]) * t;
      d[i + 2] = M.cream[2] + (M.shade[2] - M.cream[2]) * t;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /** How many glyphs are full at this wave. */
  private static glyphsAt(wave: number): number {
    const n = Math.floor((wave - M.firstWave) / M.wavesPerLetter) + 1;
    return Math.min(M.cuts.length - 1, Math.max(0, n));
  }

  private onWave(wave: number): void {
    const target = CampusMilk.glyphsAt(wave);
    const jumped = this.seenWave === 0 || wave > this.seenWave + M.wavesPerLetter; // a new game or a debug jump: no show
    this.seenWave = wave;
    let queued = 0;
    for (let g = 0; g < target; g++) {
      if (this.level[g]! >= 1 || this.pourStart[g]! >= 0) continue;
      if (jumped) {
        this.level[g] = 1;
        this.dirty = true;
      } else {
        this.pourStart[g] = this.clock + 500 + queued++ * M.staggerMs; // the first drops a moment after the wave begins
      }
    }
  }

  private update(_time: number, delta: number): void {
    this.clock += delta;
    let pouring = false;
    for (let g = 0; g < this.glyphs; g++) {
      const start = this.pourStart[g]!;
      if (start < 0) continue;
      pouring = true;
      const t = Math.min(1, Math.max(0, (this.clock - start) / M.pourMs));
      this.level[g] = 1 - (1 - t) * (1 - t); // fast at first, slowing as the glyph fills up
      if (t >= 1) this.pourStart[g] = -1;
    }
    if (pouring || this.dirty) {
      this.dirty = false;
      this.draw();
    }
  }

  /** Redraws the milk: per glyph, thin vertical slices from a wobbling surface line down to the bottom. */
  private draw(): void {
    const { ctx } = this;
    const h = this.milk.height;
    ctx.clearRect(0, 0, this.milk.width, h);
    for (let g = 0; g < this.glyphs; g++) {
      const lv = this.level[g]!;
      if (lv <= 0) continue;
      const x0 = M.cuts[g]!;
      const x1 = M.cuts[g + 1]!;
      if (lv >= 1) {
        ctx.drawImage(this.milk, x0, 0, x1 - x0, h, x0, 0, x1 - x0, h);
        continue;
      }
      const surface = h * (1 - lv);
      const amp = M.waveAmpPx * Math.sin(lv * Math.PI); // the surface calms down at the start and at the brim
      for (let x = x0; x < x1; x++) {
        const y = Math.min(h - 1, Math.max(0, surface + Math.sin(x * 0.35 + this.clock * M.waveSpeed) * amp));
        ctx.drawImage(this.milk, x, y, 1, h - y, x, y, 1, h - y);
      }
    }
    this.out.refresh();
  }
}
