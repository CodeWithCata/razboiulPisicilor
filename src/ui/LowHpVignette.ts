/** @file The red screen edge that glows when Varu is low on health and flashes with every heartbeat. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { LOW_HP } from '../config/lowHp';

/** Lives in the HUD scene (so it is not shaken by the camera). Made once per screen size as a canvas texture. */
export class LowHpVignette {
  private readonly image: Phaser.GameObjects.Image | null;
  private rest = 0;
  private intensity = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const V = LOW_HP.vignette;
    const { width, height } = GAME;
    const key = `${V.keyPrefix}_${width}x${height}`;
    if (!scene.textures.exists(key)) {
      const canvas = scene.textures.createCanvas(key, width, height);
      const ctx = canvas?.getContext();
      if (canvas && ctx) {
        const g = ctx.createRadialGradient(width / 2, height / 2, height * V.innerFactor, width / 2, height / 2, width * V.outerFactor);
        g.addColorStop(0, `rgba(${V.rgb},0)`);
        g.addColorStop(1, `rgba(${V.rgb},${V.strength})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        canvas.refresh();
      }
    }
    this.image = scene.textures.exists(key) ? scene.add.image(0, 0, key).setOrigin(0).setDepth(V.depth).setAlpha(0) : null;
  }

  /** Under the line the edge glows (more the lower the health); above it, it fades out. */
  setHealth(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? hp / maxHp : 1;
    const low = LOW_HP.enabled && ratio > 0 && ratio <= LOW_HP.ratio;
    this.intensity = low ? Phaser.Math.Clamp(1 - ratio / LOW_HP.ratio, 0, 1) : 0;
    const V = LOW_HP.vignette;
    this.rest = low ? Phaser.Math.Linear(V.rest.min, V.rest.max, this.intensity) : 0;
    this.fadeTo(this.rest, low ? V.decayMs : V.fadeOutMs);
  }

  /** One heartbeat: a quick red flash that settles back to the resting glow. */
  beat(intensity: number): void {
    if (!this.image) return;
    const V = LOW_HP.vignette;
    this.scene.tweens.killTweensOf(this.image);
    this.image.setAlpha(Phaser.Math.Linear(V.peak.min, V.peak.max, intensity));
    this.fadeTo(this.rest, V.decayMs);
  }

  private fadeTo(alpha: number, ms: number): void {
    if (!this.image) return;
    this.scene.tweens.killTweensOf(this.image);
    this.scene.tweens.add({ targets: this.image, alpha, duration: ms, ease: 'Quad.easeOut' });
  }
}
