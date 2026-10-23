/** @file Confetti for the boss kill finale: bursts fly out of the fallen boss and hang in the slow-mo (config/slowMo.ts `BOSS_KILL`, `CONFETTI`). */
import Phaser from 'phaser';
import { FX_BAR_PX } from '../assets/art/fx';
import { texRef } from '../assets/atlas';
import { Tex } from '../assets/keys';
import { CONFETTI } from '../config/slowMo';
import { Events, listen, type BossKillBurstPayload } from '../core/events';

/**
 * One particle emitter (a scene child, so `SlowMoSystem` slows it with the rest of the game) that only listens to
 * `Events.BossKillBurst`. Each piece is the flat white block picture tinted a random color, turned a random way and squashed
 * back and forth while it lives, so it looks like a flipping bit of paper. No new pictures, no coins.
 */
export class CelebrationFx {
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    const bar = texRef(Tex.FxBar);
    const C = CONFETTI;
    const base = C.widthPx / FX_BAR_PX;
    // Particle options the typings do not list for every field (onUpdate callbacks): same cast style as Effects.setSlowMo.
    const config = {
      frame: bar.frame,
      emitting: false,
      lifespan: C.lifespan,
      speed: C.speed,
      angle: C.angle,
      gravityY: C.gravityY,
      rotate: { min: 0, max: 360 },
      scaleX: { onUpdate: (_p: unknown, _k: string, t: number): number => base * Math.cos(t * C.flipSpeed) },
      scaleY: C.heightPx / FX_BAR_PX,
      alpha: { start: 1, end: 0, ease: 'Quad.easeIn' },
      tint: [...C.colors],
    };
    this.confetti = scene.add.particles(0, 0, bar.key, config as unknown as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig).setDepth(C.depth);
    const off = listen<BossKillBurstPayload>(Events.BossKillBurst, ({ x, y, confetti }) => {
      if (confetti > 0) this.confetti.explode(confetti, x, y);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }
}
