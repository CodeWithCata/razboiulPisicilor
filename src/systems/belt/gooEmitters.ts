/** @file Milk / goo particle emitters for the belt trail, splash and spin. */
import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { GOLD_BELT, MILK_FX } from '../../config/animation';

interface Range {
  readonly min: number;
  readonly max: number;
}
interface Fade {
  readonly start: number;
  readonly end: number;
}

/** The numbers of one kind of milk drop (MILK_FX.trail, .splash and .spin all have this shape). */
export interface DropLook {
  readonly lifespanMs: Range;
  readonly speed: Range;
  readonly scale: Fade;
  readonly alpha: Fade;
}

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/**
 * Milk drops that sag as they fly. `gold` = the golden belt: expired milk, so yellowish-white, bigger,
 * longer-lived and slower to fall (thick and sticky).
 */
export function createDrops(scene: Phaser.Scene, look: DropLook, gold: boolean, depth: number): Emitter {
  const d = GOLD_BELT.drops;
  const life = gold ? d.lifeMult : 1;
  const size = gold ? d.scaleMult : 1;
  return scene.add
    .particles(0, 0, Tex.MilkDrop, {
      emitting: false,
      gravityY: MILK_FX.gravity * (gold ? d.gravityMult : 1),
      lifespan: { min: look.lifespanMs.min * life, max: look.lifespanMs.max * life },
      speed: look.speed,
      scale: { start: look.scale.start * size, end: look.scale.end * size },
      alpha: look.alpha,
      tint: gold ? [...GOLD_BELT.goo] : [...MILK_FX.tint],
    })
    .setDepth(depth);
}

/** Puddles left on the ground (below everybody). The golden ones are yellowish and stay longer. */
export function createPuddles(scene: Phaser.Scene, gold: boolean): Emitter {
  const life = gold ? GOLD_BELT.drops.lifeMult : 1;
  const p = MILK_FX.puddle;
  return scene.add
    .particles(0, 0, Tex.MilkPuddle, {
      emitting: false,
      lifespan: { min: p.lifespanMs.min * life, max: p.lifespanMs.max * life },
      speed: 0,
      rotate: { min: 0, max: 360 },
      scale: p.scale,
      alpha: p.alpha,
      tint: gold ? [...GOLD_BELT.goo] : [0xffffff],
    })
    .setDepth(2);
}

/** How long (ms) until every drop and puddle of this kind has faded, so an emitter can be removed. */
export const gooLifeMs = (gold: boolean): number => MILK_FX.puddle.lifespanMs.max * (gold ? GOLD_BELT.drops.lifeMult : 1) + 100;
