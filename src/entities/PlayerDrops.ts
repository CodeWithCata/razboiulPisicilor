/** @file Varu's rust flakes and broken hearts: two particle emitters (one burst of one particle per drop) instead of an image plus four or five tweens per drop. */
import Phaser from 'phaser';
import { texRef } from '../assets/atlas';
import { Tex } from '../assets/keys';
import { EMO_FX, RUST_FX } from '../config/animation';

/** The chip picture is 12 px wide (and 10 high) and the heart 32 x 32 (see `assets/placeholders.ts`): a displayed size in px = scale * these. */
const CHIP_W = 12;
const HEART_PX = 32;

const mid = (r: { readonly min: number; readonly max: number }): number => (r.min + r.max) / 2;

/**
 * The two drop effects. `rust` / `heart` start ONE particle at a point; the emitter does the rest (fall, drift, turn, fade).
 * Numbers come from `RUST_FX` / `EMO_FX`. A particle emitter cannot give each particle its own life-linked distance, so every particle
 * uses the middle of the config ranges for size, fall and rise (life, tint, turn and drift direction still vary; the flake no longer tumbles, it keeps one random turn).
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
    // Only option names that other emitters in the repo already use (lifespan, speed + angle, gravityY, scale, rotate, alpha, tint).
    // Sideways drift: a slow push in a random direction (a little up or down too, a few px). Pop: scale runs linearly from the pop size to the size.
    this.rustEmitter = scene.add
      .particles(0, 0, chip.key, {
        frame: chip.frame,
        emitting: false,
        lifespan: { min: R.lifeMs.min, max: R.lifeMs.max },
        speed: { min: 0, max: rustDrift },
        angle: { min: 0, max: 360 },
        gravityY: rustGravity,
        scale: { start: (rustSize * R.popScale) / CHIP_W, end: rustSize / CHIP_W },
        rotate: { min: 0, max: 360 },
        alpha: { start: R.alpha, end: 0 },
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
        lifespan: { min: E.lifeMs.min, max: E.lifeMs.max },
        speed: { min: 0, max: E.swayPx / heartLifeS },
        angle: { min: 0, max: 360 },
        gravityY: (-2 * mid(E.riseY)) / (heartLifeS * heartLifeS), // up, speeding up (Sine.easeIn is close to a quad)
        scale: { start: heartScale * 0.4, end: heartScale }, // pops from 40% to full over its life
        rotate: { min: E.tiltDeg.min, max: E.tiltDeg.max }, // a fixed tilt (the emission `angle` above is the push direction, not the picture's turn)
        alpha: { start: E.alpha, end: 0 },
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
