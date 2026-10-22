/** @file Varu's rust flakes and broken hearts: two particle emitters (one burst of one particle per drop) instead of an image plus four or five tweens per drop. */
import Phaser from 'phaser';
import { texRef } from '../assets/atlas';
import { Tex } from '../assets/keys';
import { EMO_FX, RUST_FX } from '../config/animation';

/** The chip picture is 12 x 10 px and the heart 32 x 32 (see `assets/placeholders.ts`): a displayed size in px = scale * these. */
const CHIP_W = 12;
const CHIP_H = 10;
const HEART_PX = 32;

const mid = (r: { readonly min: number; readonly max: number }): number => (r.min + r.max) / 2;

/**
 * The two drop effects. `rust` / `heart` start ONE particle at a point; the emitter does the rest (fall, drift, spin, fade).
 * Numbers come from `RUST_FX` / `EMO_FX`. A particle emitter cannot give each particle its own life-linked distance, so every particle
 * uses the middle of the config ranges for size, fall, rise and spin (life, tint, start angle and drift direction still vary).
 * The emitters are scene objects: a scene restart destroys them, and `destroy()` does it when Varu goes first.
 */
export class PlayerDrops {
  private readonly rustEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly heartEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    const R = RUST_FX;
    const chip = texRef(Tex.Chip);
    const rustLifeS = mid(R.lifeMs) / 1000;
    const rustSize = mid(R.sizePx);
    // Fall: y = fall * t^2 over the life (Quad.easeIn) means a constant acceleration of 2 * fall / life^2.
    const rustGravity = (2 * mid(R.fallPx)) / (rustLifeS * rustLifeS);
    const rustDrift = R.driftPx / rustLifeS;
    this.rustEmitter = scene.add
      .particles(0, 0, chip.key, {
        frame: chip.frame,
        emitting: false,
        lifespan: R.lifeMs,
        speedX: { min: -rustDrift, max: rustDrift },
        gravityY: rustGravity,
        // It pops in bigger and settles to its size early in its life (a quick ease-out).
        scaleX: { start: (rustSize * R.popScale) / CHIP_W, end: rustSize / CHIP_W, ease: 'Expo.easeOut' },
        scaleY: { start: (rustSize * R.popScale) / CHIP_H, end: rustSize / CHIP_H, ease: 'Expo.easeOut' },
        rotate: { start: 0, end: mid(R.spinDeg) },
        // Full for the first half, then fades (Quart.easeIn stays high until late).
        alpha: { start: R.alpha, end: 0, ease: 'Quart.easeIn' },
        tint: [...R.colors],
      })
      .setDepth(R.depth);

    const E = EMO_FX;
    const heart = texRef(Tex.Heart);
    const heartLifeS = mid(E.lifeMs) / 1000;
    const heartScale = mid(E.sizePx) / HEART_PX;
    this.heartEmitter = scene.add
      .particles(0, 0, heart.key, {
        frame: heart.frame,
        emitting: false,
        lifespan: E.lifeMs,
        speedX: { min: -E.swayPx / heartLifeS, max: E.swayPx / heartLifeS },
        gravityY: (-2 * mid(E.riseY)) / (heartLifeS * heartLifeS), // up, speeding up (Sine.easeIn is close to a quad)
        scale: { start: heartScale * 0.4, end: heartScale, ease: 'Expo.easeOut' }, // pops from 40% to full early in its life
        angle: { min: E.tiltDeg.min, max: E.tiltDeg.max },
        alpha: { start: E.alpha, end: 0, ease: 'Sine.easeIn' },
      })
      .setDepth(E.depth);
  }

  /** One rust flake appears at (x, y). */
  rust(x: number, y: number): void {
    this.rustEmitter.explode(1, x, y);
  }

  /** One broken heart appears at (x, y). */
  heart(x: number, y: number): void {
    this.heartEmitter.explode(1, x, y);
  }

  destroy(): void {
    this.rustEmitter.destroy();
    this.heartEmitter.destroy();
  }
}
