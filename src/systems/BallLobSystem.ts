/** @file The tennis cat's ball rain: balls soar up from her racket, hang out of sight, then fall on spots marked by a growing shadow and a ring, bounce and fade (like the crows, but they hurt Varu). */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { BALL_LOB as L } from '../config/animation';
import { bus, Events, listen, type BallLandedPayload, type LobBallPayload } from '../core/events';

/**
 * Listens for `Events.LobBall` (PisicaFederer decides WHERE each ball lands) and flies the ball: up out of sight (rise), a short
 * hang, then down onto its spot (fall) while the marker on the floor grows and the ring turns red at the end. On landing it
 * emits `Events.BallLanded` (GameScene hurts Varu if he stands in the ring, Effects / Audio / props react) and the ball hops
 * twice and fades. Visuals are code-drawn; the numbers are `BALL_LOB` (look) and `FEDERER.lob` (how many, how hard).
 * If the boss is beaten while balls are in the air they still come down, but harmlessly.
 */
export class BallLobSystem {
  private readonly fuzz: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];
  /** Bumped when a boss is beaten: every ball launched before that lands without hurting anyone. */
  private epoch = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.fuzz = scene.add
      .particles(0, 0, Tex.Particle, {
        emitting: false,
        lifespan: { min: 350, max: 650 },
        speed: { min: 50, max: 190 },
        scale: { start: 0.7, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: [...L.fuzz.tint],
      })
      .setDepth(L.depth.fuzz);
    this.dust = scene.add
      .particles(0, 0, Tex.Particle, {
        emitting: false,
        lifespan: { min: 320, max: 620 },
        speed: { min: 30, max: 120 },
        scale: { start: 1, end: 0.15 },
        alpha: { start: 0.8, end: 0 },
        tint: [...L.dust.tint],
      })
      .setDepth(L.depth.dust);
    this.off.push(
      listen<LobBallPayload>(Events.LobBall, (p) => this.launch(p)),
      listen(Events.BossDefeated, () => (this.epoch += 1)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off.forEach((f) => f());
      this.fuzz.destroy();
      this.dust.destroy();
    });
  }

  private launch(p: LobBallPayload): void {
    const scene = this.scene;
    const epoch = this.epoch;
    const total = L.riseMs + L.hangMs + L.fallMs;
    const fallStart = L.riseMs + L.hangMs;

    const ball = scene.add.image(p.x, p.y, Tex.Tennis).setDepth(L.depth.ball);
    const base = L.sizePx / ball.frame.realWidth;
    ball.setScale(base);
    const shadow = scene.add.image(p.toX, p.toY, Tex.Shadow).setDepth(L.depth.marker).setAlpha(0);
    const ring = scene.add
      .circle(p.toX, p.toY, p.radius, L.ring.color, L.ring.fill)
      .setStrokeStyle(3, L.ring.color, L.ring.stroke)
      .setDepth(L.depth.marker)
      .setAlpha(0);

    // Up: toward the camera and out of sight, leaning a little toward its spot. Down: from above and to a random side.
    const apexX = p.x + (p.toX - p.x) * 0.25;
    const apexY = p.y - L.riseHeightPx;
    const side = Math.random() < 0.5 ? -1 : 1;
    const startX = p.toX + side * L.fromSide;
    const startY = p.toY - L.fromAbove;
    let alarmed = false;

    scene.tweens.addCounter({
      from: 0,
      to: total,
      duration: total,
      ease: 'Linear',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        ball.setAngle(t * L.spinPerMs);
        if (t < L.riseMs) {
          const u = 1 - Math.pow(1 - t / L.riseMs, 3);
          ball
            .setPosition(p.x + (apexX - p.x) * u, p.y + (apexY - p.y) * u)
            .setScale(base * (1 + (L.apexScale - 1) * u))
            .setAlpha(1 - Math.max(0, (u - 0.7) / 0.3))
            .setVisible(true);
          this.marker(shadow, ring, 0);
        } else if (t < fallStart) {
          ball.setVisible(false); // far up in the sky
          this.marker(shadow, ring, 0);
        } else {
          const f = (t - fallStart) / L.fallMs;
          const u = f * f; // gravity: slow at first, fast at the end
          ball
            .setPosition(p.toX + (startX - p.toX) * (1 - u), p.toY + (startY - p.toY) * (1 - u))
            .setScale(base * (L.startScale + (1 - L.startScale) * u))
            .setAlpha(Math.min(1, f * 8))
            .setVisible(true);
          this.marker(shadow, ring, f);
          if (!alarmed && f >= L.ring.soonAt) {
            alarmed = true; // the last moments: the ring turns red
            ring.setFillStyle(L.ring.soonColor, L.ring.fill).setStrokeStyle(3, L.ring.soonColor, L.ring.stroke);
          }
        }
      },
      onComplete: () => {
        ring.destroy();
        if (epoch !== this.epoch) {
          ball.destroy(); // the boss was beaten meanwhile: nothing lands
          shadow.destroy();
          return;
        }
        this.land(p, ball, shadow, base, side);
      },
    });
  }

  /** The marker on the floor: `f` is how far the fall is (0 = not started, 1 = landing). The shadow grows and the ring (already the real reach at scale 1) grows to its full size. */
  private marker(shadow: Phaser.GameObjects.Image, ring: Phaser.GameObjects.Arc, f: number): void {
    const M = L.marker;
    const s = M.startShare + (1 - M.startShare) * f;
    shadow.setDisplaySize(L.sizePx * 2 * M.shadowW * s, L.sizePx * 2 * M.shadowH * s).setAlpha(M.startAlpha + (M.endAlpha - M.startAlpha) * f);
    ring.setScale(0.6 + 0.4 * f).setAlpha(f === 0 ? 0.25 : 0.35 + 0.65 * f);
  }

  private land(p: LobBallPayload, ball: Phaser.GameObjects.Image, shadow: Phaser.GameObjects.Image, base: number, side: number): void {
    const scene = this.scene;
    ball.setPosition(p.toX, p.toY).setScale(base).setAlpha(1).setVisible(true);
    this.dust.explode(L.dust.count, p.toX, p.toY);
    this.fuzz.explode(L.fuzz.count, p.toX, p.toY);
    const pop = scene.add.circle(p.toX, p.toY, 10, L.pop.color, 0.2).setStrokeStyle(4, L.pop.color, 1).setDepth(L.depth.dust + 1);
    scene.tweens.add({ targets: pop, scale: p.radius / 10, alpha: 0, duration: L.pop.ringMs, ease: 'Cubic.easeOut', onComplete: () => pop.destroy() });

    const landed: BallLandedPayload = { x: p.toX, y: p.toY, radius: p.radius, damage: p.damage, curse: p.curse };
    bus.emit(Events.BallLanded, landed);

    // The thud: squash flat, then two hops that get smaller (the shadow follows), then it fades.
    const fade = (): void => {
      scene.tweens.add({
        targets: [ball, shadow], alpha: 0, delay: L.fade.delayMs, duration: L.fade.ms,
        onComplete: () => {
          ball.destroy();
          shadow.destroy();
        },
      });
    };
    const hop = (i: number): void => {
      const h = L.hops[i];
      if (!h) {
        fade();
        return;
      }
      scene.tweens.add({ targets: ball, x: ball.x + side * h.driftPx, duration: h.ms * 2, ease: 'Linear' });
      scene.tweens.add({
        targets: ball, y: p.toY - h.heightPx, duration: h.ms, ease: 'Quad.easeOut', yoyo: true,
        onUpdate: () => shadow.setX(ball.x),
        onComplete: () => hop(i + 1),
      });
    };
    scene.tweens.add({
      targets: ball, scaleX: base * L.squash.x, scaleY: base * L.squash.y, duration: L.squash.ms, ease: 'Quad.easeOut', yoyo: true,
      onComplete: () => hop(0),
    });
  }
}
