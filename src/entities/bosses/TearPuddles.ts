/** @file The emo cat's tear puddles: the scream, the rain and his crying leave them on the floor, and the scream also floods the whole ring around him; Varu walks slower while he stands in water, it dries up. Each is a flat cartoon puddle picture that splashes when it lands, wobbles and ripples. Visual + a speed factor on Varu. */
import Phaser from 'phaser';
import { FX_FLOOD_W, FX_PUDDLE_W } from '../../assets/art/fx';
import { Tex } from '../../assets/keys';
import { PLAY_AREA } from '../../config/arena';
import { MAFIA } from '../../config/bosses';
import { clampToArena } from '../../core/arena';
import { gameClock } from '../../core/clock';
import type { Player } from '../Player';
import { hyp } from '../../core/hyp';

const P = MAFIA.puddle;
const F = MAFIA.flood;

interface Puddle {
  readonly obj: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly until: number;
  readonly born: number;
  /** Scale that makes the picture as wide as the puddle (see `FX_PUDDLE_W`). */
  readonly fit: number;
  /** Offsets the wobble so the puddles do not all breathe together. */
  readonly phase: number;
  rippleAt: number;
}

/** The big flat puddle of one scream. */
interface Flood {
  readonly obj: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly until: number;
  rippleAt: number;
}

const between = (r: readonly [number, number]): number => r[0] + Math.random() * (r[1] - r[0]);

export class TearPuddles {
  private readonly puddles: Puddle[] = [];
  private flood: Flood | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** `count` puddles at random spots between `minFrom` and `reach` px from (x, y). The oldest go first when there are more than `max`. */
  splash(count: number, x: number, y: number, reach: number, max: number = P.max): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = P.minFrom + Math.random() * Math.max(0, reach - P.minFrom);
      const at = clampToArena(x + Math.cos(a) * d, y + Math.sin(a) * d, P.radius);
      this.place(at.x, at.y, P.lifeMs, max);
    }
  }

  /** v172 rain: one puddle at a random spot of the arena, at least `minFrom` px from (avoidX, avoidY) (Varu). */
  spread(avoidX: number, avoidY: number, minFrom: number, max: number, lifeMs: number): void {
    for (let tries = 0; tries < 12; tries++) {
      const x = Phaser.Math.Between(PLAY_AREA.left + P.radius, PLAY_AREA.right - P.radius);
      const y = Phaser.Math.Between(PLAY_AREA.top + P.radius, PLAY_AREA.bottom - P.radius);
      if (hyp(x - avoidX, y - avoidY) < minFrom) continue;
      this.place(x, y, lifeMs, max);
      return;
    }
  }

  /** v172 cry for help: one puddle right at his feet (a little off to a side). */
  beneath(x: number, y: number, jitterPx: number, max: number = P.max): void {
    const at = clampToArena(x + (Math.random() * 2 - 1) * jitterPx, y + (Math.random() * 2 - 1) * jitterPx * 0.6, P.radius);
    this.place(at.x, at.y, P.lifeMs, max);
  }

  /** v180 the scream: the whole floor inside `radius` px of (x, y) turns into one big flat puddle that spreads out from him (a new scream replaces the old flood). */
  floodAround(x: number, y: number, radius: number): void {
    this.flood?.obj.destroy();
    const now = gameClock.now;
    const fit = (radius * 2) / FX_FLOOD_W;
    const obj = this.scene.add.image(x, y, Tex.FxFlood).setAlpha(0).setDepth(F.depth).setScale(fit * 0.15);
    this.scene.tweens.add({ targets: obj, scale: fit, duration: F.growMs, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: obj, alpha: F.alpha, duration: F.growMs * 0.6, ease: 'Sine.easeOut' });
    this.flood = { obj, x, y, radius, until: now + F.lifeMs, rippleAt: now + F.growMs + between(F.rippleEveryMs) };
    this.floodRim(x, y, radius);
  }

  /** Drops jump up all along the edge as the water rushes out to it. */
  private floodRim(x: number, y: number, radius: number): void {
    for (let i = 0; i < F.rimDrops; i++) {
      const a = (i / F.rimDrops) * Math.PI * 2 + Math.random() * 0.3;
      const drop = this.scene.add.image(x, y, Tex.FxDrop).setTint(P.dropColor).setDisplaySize(7, 11).setDepth(P.depth + 0.02).setAlpha(0);
      const edgeX = x + Math.cos(a) * radius * 0.96;
      const edgeY = y + Math.sin(a) * radius * 0.96;
      this.scene.tweens.add({
        targets: drop, x: edgeX, y: edgeY - F.dropPx, alpha: 1, duration: F.growMs, ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({ targets: drop, y: edgeY + 4, alpha: 0, duration: 260, ease: 'Quad.easeIn', onComplete: () => drop.destroy() });
        },
      });
    }
  }

  /** A foam ring leaves the middle of the flood and spreads to its edge. */
  private floodRipple(f: Flood): void {
    const ring = this.scene.add.ellipse(f.x, f.y, f.radius * 0.5, f.radius * 0.5).setStrokeStyle(3, P.rippleColor, 0.85).setDepth(F.depth + 0.01);
    this.scene.tweens.add({ targets: ring, scale: 3.6, alpha: 0, duration: F.rippleMs, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  /** The water stops at the fence: show only the part of the picture that is inside the play area. */
  private clipToArena(f: Flood): void {
    const s = f.obj.scaleX;
    const half = (f.obj.width * s) / 2;
    const left = Math.max(0, (PLAY_AREA.left - (f.x - half)) / s);
    const top = Math.max(0, (PLAY_AREA.top - (f.y - half)) / s);
    const right = Math.min(f.obj.width, (PLAY_AREA.right - (f.x - half)) / s);
    const bottom = Math.min(f.obj.height, (PLAY_AREA.bottom - (f.y - half)) / s);
    f.obj.setCrop(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  }

  private place(x: number, y: number, lifeMs: number, max: number): void {
    const now = gameClock.now;
    const fit = (P.radius * 2 * P.artGrow) / FX_PUDDLE_W;
    const obj = this.scene.add
      .image(x, y, Tex.FxPuddle)
      .setFlipX(Math.random() < 0.5)
      .setAlpha(P.alpha)
      .setDepth(P.depth)
      .setScale(fit * 0.2);
    this.scene.tweens.add({ targets: obj, scale: fit, duration: P.popMs, ease: 'Back.easeOut' });
    this.puddles.push({ obj, x, y, until: now + lifeMs, born: now, fit, phase: Math.random() * Math.PI * 2, rippleAt: now + between(P.rippleEveryMs) });
    this.spit(x, y);
    while (this.puddles.length > max) this.puddles.shift()?.obj.destroy();
  }

  /** A few drops jump out when a puddle lands and fall back. */
  private spit(x: number, y: number): void {
    for (let i = 0; i < P.splashDrops; i++) {
      const a = (i / P.splashDrops) * Math.PI * 2 + Math.random() * 0.8;
      const d = P.splashPx * (0.6 + Math.random() * 0.6);
      const drop = this.scene.add.image(x, y, Tex.FxDrop).setTint(P.dropColor).setDisplaySize(7, 11).setDepth(P.depth + 0.02);
      const topX = x + Math.cos(a) * d;
      const topY = y + Math.sin(a) * d * 0.6 - 16;
      this.scene.tweens.add({
        targets: drop, x: topX, y: topY, duration: 210, ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: drop, x: topX + Math.cos(a) * 6, y: topY + 20, alpha: 0, duration: 240, ease: 'Quad.easeIn',
            onComplete: () => drop.destroy(),
          });
        },
      });
    }
  }

  /** A ring of foam spreads over the puddle and fades, like a drop just fell in. */
  private ripple(p: Puddle): void {
    const ring = this.scene.add.ellipse(p.x, p.y, P.radius * 0.7, P.radius * 0.7 * P.hitRatioY).setStrokeStyle(2.5, P.rippleColor, 0.9).setDepth(P.depth + 0.01);
    this.scene.tweens.add({
      targets: ring, scale: 2.4, alpha: 0, duration: P.rippleMs, ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Every frame: dry the old ones (they blink at the end) and slow Varu while he stands in one. */
  update(player: Player): void {
    const now = gameClock.now;
    let slowed = false;
    let slow: number = P.slow;
    const f = this.flood;
    if (f) {
      if (f.until - now <= 0) {
        f.obj.destroy();
        this.flood = null;
      } else {
        if (f.until - now < F.blinkMs) f.obj.setAlpha(F.alpha * (0.4 + 0.6 * Math.abs(Math.sin(now / 90))));
        else if (now >= f.rippleAt) {
          this.floodRipple(f);
          f.rippleAt = now + between(F.rippleEveryMs);
        }
        this.clipToArena(f);
        const inside = hyp(player.x - f.x, player.y - f.y) <= f.radius * F.hitFactor;
        if (inside) {
          slowed = true;
          slow = F.slow;
        }
      }
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i]!;
      const left = p.until - now;
      if (left <= 0) {
        p.obj.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      if (left < P.blinkMs) p.obj.setAlpha(P.alpha * (0.4 + 0.6 * Math.abs(Math.sin(now / 90))));
      else if (now >= p.rippleAt) {
        this.ripple(p);
        p.rippleAt = now + between(P.rippleEveryMs);
      }
      // After it popped up it breathes a little (wider while flatter), like water that is not quite still.
      if (now - p.born > P.popMs) {
        const w = 1 + Math.sin(now * P.wobbleRate + p.phase) * P.wobble;
        p.obj.setScale(p.fit * w, p.fit * (2 - w));
      }
      // An ellipse, wider than tall like the (flat) drawing.
      const dx = (player.x - p.x) / P.radius;
      const dy = (player.y - p.y) / (P.radius * P.hitRatioY);
      if (dx * dx + dy * dy <= 1) {
        slowed = true;
        slow = Math.min(slow, P.slow);
      }
    }
    player.tearSlow = slowed ? slow : 1;
  }

  /** Remove them all and give Varu his speed back. */
  destroy(player: Player | null): void {
    for (const p of this.puddles) p.obj.destroy();
    this.puddles.length = 0;
    this.flood?.obj.destroy();
    this.flood = null;
    if (player) player.tearSlow = 1;
  }
}
