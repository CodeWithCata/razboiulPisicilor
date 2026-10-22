/** @file One retractable street lamp: by day it is gone, at night a pole grows out of the floor with the lantern on top, dust puffs and the light comes on. */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { DAY_NIGHT } from '../config/dayNight';
import { COLORS } from '../config/style';
import type { Box } from '../core/reach';
import type { Obstacle, Obstacles } from './props/Obstacles';

const L = DAY_NIGHT.lamp;

/**
 * `out` runs 0 (all underground, nothing drawn) to 1 (fully risen); it moves toward the wish at `riseMs` / `lowerMs` after a per-lamp delay
 * (so the lamps come out one after the other). Every part is placed from `out` alone, so rising and sinking are the same animation backwards. No pit, no hatch: just the foot, the pole and the lantern.
 * The pole goes UP the screen (the same fake height the back flip uses). Parts sit on the floor layer, under the cats, so a lamp never hides one.
 * Once it is out it is solid (Varu and walking cats bump into the foot) and it can be broken (LampSystem): it vanishes in a burst and a new one rises at the next night.
 */
export class FloorLamp {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly stem: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly lens: Phaser.GameObjects.Ellipse;
  private readonly base: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image | null;
  private out = 0;
  private wantUp = false;
  private wait = 0;
  private puffed = false;
  private hp = L.hp;
  private broken = false;
  private obstacle: Obstacle | null = null;
  /** Rattle left after a hit (ms). */
  private rattleMs = 0;
  /** The belt sweep (and lap) that hit it last, so one swing hits it once; the thrown belt waits for `readyAt` (game ms). */
  hitKey = -1;
  readyAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly glowKey: string | null,
    private readonly index: number,
    private readonly obstacles: Obstacles,
  ) {
    const d = L.floorDepth;
    this.shadow = scene.add.image(x + 5, y + 3, Tex.Shadow).setDepth(d + 0.02); // the same soft shadow the barrels have
    this.base = scene.add.image(x, y, Tex.LampBase).setOrigin(0.5, L.base.originY).setDisplaySize(L.base.w, L.base.h).setDepth(d + 0.08);
    this.stem = scene.add.image(x, y, Tex.LampStem).setOrigin(0.5, 1).setDepth(d + 0.1);
    this.head = scene.add.image(x, y, Tex.LampHead).setOrigin(0.5, L.head.originY).setDepth(d + 0.2);
    this.lens = scene.add.ellipse(x, y, L.lens.w, L.lens.h, L.lens.color).setDepth(d + 0.25);
    this.glow = this.glowKey ? scene.add.image(x, y - 8, this.glowKey).setDisplaySize(L.glowRadius * 2, L.glowRadius * 2).setDepth(L.glowDepth).setAlpha(0) : null;
    this.place(); // starts hidden
  }

  /** Starts with the lamp already out or already gone, with no animation (the run begins at night, or by day). */
  snapTo(up: boolean): void {
    this.wantUp = up;
    this.out = up ? 1 : 0;
    this.wait = 0;
    this.puffed = up;
    this.place();
    this.syncSolid();
  }

  /** Where it stands on the floor. */
  get footX(): number {
    return this.x;
  }

  get footY(): number {
    return this.y;
  }

  /** The part the belt can touch. */
  get box(): Box {
    const { halfWidth, height } = L.hitbox;
    return { x: this.x - halfWidth, y: this.y - height, w: halfWidth * 2, h: height };
  }

  /** v172: 0 (underground or broken) .. 1 (fully risen): how much light it gives (lights out draws a hole of light round it). */
  get lightLevel(): number {
    return this.broken ? 0 : this.out;
  }

  /** True while it can be hit: nearly all the way out and not broken. */
  get hittable(): boolean {
    return !this.broken && this.out >= L.hitFrom;
  }

  /** A hit. Returns true if it broke the lamp. */
  hurt(damage: number): boolean {
    this.hp -= damage;
    this.rattleMs = L.rattle.ms;
    if (this.hp > 0) return false;
    this.smash();
    return true;
  }

  /** Gone for tonight: nothing is drawn, nobody bumps into it. Day comes back, then a new lamp rises at the next night. */
  private smash(): void {
    this.shatter(); // the show first, while the parts are still where they were
    this.broken = true;
    this.out = 0;
    this.wait = 0;
    this.puffed = false;
    this.rattleMs = 0;
    this.place();
    this.syncSolid();
  }

  /**
   * The break, as a little show of temporary objects (they belong to the scene's tweens, so a restart cleans them up): the bulb pops in a flash,
   * the glass bursts into shards that fly out and land, the roof of the lantern drops and bounces, the pole snaps and topples.
   */
  private shatter(): void {
    const S = L.shatter;
    const scene = this.scene;
    const d = L.floorDepth;
    const gx = this.lens.x;
    const gy = this.lens.y;
    const side = Math.random() < 0.5 ? -1 : 1;

    // The bulb pops: a bright flash and a soft glow that swells and dies.
    const flash = scene.add.circle(gx, gy, 9, S.flashColor, 0.95).setDepth(S.depthAir);
    scene.tweens.add({ targets: flash, scale: 3.4, alpha: 0, duration: S.flashMs, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
    if (this.glowKey) {
      const pop = scene.add.image(gx, gy, this.glowKey).setDisplaySize(L.glowRadius, L.glowRadius).setDepth(L.glowDepth).setAlpha(0.9);
      const w = pop.displayWidth;
      scene.tweens.add({ targets: pop, displayWidth: w * 2.2, displayHeight: w * 2.2, alpha: 0, duration: S.glowPopMs, ease: 'Quad.easeOut', onComplete: () => pop.destroy() });
    }

    // The pole snaps at the foot and falls over, then fades.
    const pole = scene.add.image(this.x, this.y, Tex.LampStem).setOrigin(0.5, 1).setScale(this.stem.scaleX, this.stem.scaleY).setDepth(d + 0.1);
    scene.tweens.add({ targets: pole, angle: side * S.toppleDeg, duration: S.toppleMs, ease: 'Cubic.easeIn' });
    scene.tweens.add({ targets: pole, alpha: 0, delay: S.toppleMs, duration: S.toppleFadeMs, onComplete: () => pole.destroy() });
    scene.time.delayedCall(S.toppleMs * 0.9, () => this.puff()); // dust where it hits the floor
    const foot = scene.add.image(this.x, this.y, Tex.LampBase).setOrigin(0.5, L.base.originY).setDisplaySize(this.base.displayWidth, this.base.displayHeight).setDepth(d + 0.08);
    scene.tweens.add({ targets: foot, alpha: 0, delay: S.toppleMs, duration: S.toppleFadeMs, onComplete: () => foot.destroy() }); // the foot stays until the pole is down

    // The roof of the lantern (the top part of its picture) drops, bounces and tips over, then fades.
    const roof = scene.add
      .image(this.head.x, this.head.y, Tex.LampHead)
      .setOrigin(0.5, L.head.originY)
      .setDisplaySize(this.head.displayWidth, this.head.displayHeight)
      .setCrop(0, 0, 44, 27)
      .setDepth(d + 0.2);
    const roofFall = this.y - this.head.y - this.head.displayHeight * 0.1;
    scene.tweens.add({ targets: roof, y: roof.y + roofFall, duration: S.roofDropMs, ease: 'Bounce.easeOut' });
    scene.tweens.add({ targets: roof, x: roof.x + side * -14, angle: -side * S.roofTiltDeg, duration: S.roofDropMs, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: roof, alpha: 0, delay: S.roofDropMs + 300, duration: S.fadeMs, onComplete: () => roof.destroy() });

    // The glass: little amber and bronze bits fly out of the lantern in an arc, land around the foot, lie there a while and fade.
    for (let i = 0; i < S.shards; i++) {
      const bronze = Math.random() < S.bronzeShare;
      const tints = bronze ? S.bronzeTints : S.glassTints;
      const r = Phaser.Math.FloatBetween(S.sizePx.min, S.sizePx.max);
      const shard = scene.add
        .triangle(gx, gy, 0, -r, r * 0.85, r * 0.7, -r * 0.85, r * 0.55, Phaser.Utils.Array.GetRandom([...tints]), 1)
        .setStrokeStyle(1.2, COLORS.navy)
        .setDepth(S.depthAir)
        .setAngle(Phaser.Math.Between(0, 360));
      const vx = Phaser.Math.FloatBetween(S.speedX.min, S.speedX.max) * (Math.random() < 0.5 ? -1 : 1);
      const vy = -Phaser.Math.FloatBetween(S.riseY.min, S.riseY.max);
      const floorY = this.y + Phaser.Math.Between(-5, 12);
      const g = floorY - gy - vy; // so that it lands exactly at t = 1
      const spin = Phaser.Math.Between(-540, 540);
      const a0 = shard.angle;
      const t = { v: 0 };
      scene.tweens.add({
        targets: t,
        v: 1,
        duration: Phaser.Math.Between(S.flyMs.min, S.flyMs.max),
        ease: 'Linear',
        onUpdate: () => shard.setPosition(gx + vx * t.v, gy + vy * t.v + g * t.v * t.v).setAngle(a0 + spin * t.v),
        onComplete: () => {
          shard.setDepth(d + 0.35);
          scene.tweens.add({ targets: shard, alpha: 0, delay: S.lingerMs, duration: S.fadeMs, onComplete: () => shard.destroy() });
        },
      });
    }
  }

  /** Solid from `solid.from` of the emerge on (and back to open when it sinks or breaks). */
  private syncSolid(): void {
    const solid = !this.broken && this.out >= L.solid.from;
    if (solid && !this.obstacle) {
      this.obstacle = this.obstacles.add(this.x, this.y + L.solid.offsetY, L.solid.w, L.solid.h);
    } else if (!solid && this.obstacle) {
      this.obstacles.remove(this.obstacle);
      this.obstacle = null;
    }
  }

  /**
   * `up`: the lamp should be out. `bright`: how dark it is (0..1), the lamp light grows with it. `delta` is game ms, `clock` is ms for the flicker.
   */
  update(delta: number, up: boolean, bright: number, clock: number): void {
    if (this.broken) {
      if (up) return; // still night: it stays broken
      this.broken = false; // the day is back: a new one is ready for the next night
      this.hp = L.hp;
    }
    if (this.rattleMs > 0) this.rattleMs = Math.max(0, this.rattleMs - delta);
    if (up !== this.wantUp) {
      this.wantUp = up;
      this.wait = this.index * L.staggerMs;
    }
    if (this.wait > 0) this.wait -= delta;
    else if (this.wantUp && this.out < 1) this.out = Math.min(1, this.out + delta / L.riseMs);
    else if (!this.wantUp && this.out > 0) this.out = Math.max(0, this.out - delta / L.lowerMs);

    if (!this.puffed && this.out >= L.riseFrom + 0.02) {
      this.puffed = true;
      this.puff();
    } else if (this.puffed && this.out < 0.02) {
      this.puffed = false;
    }
    this.place();
    this.syncSolid();

    // The light only comes on once the lamp is nearly all the way out, and goes off as soon as it starts to sink.
    const lit = Phaser.Math.Clamp((this.out - 0.85) / 0.15, 0, 1);
    const flicker = 1 - L.flicker * (0.5 + 0.5 * Math.sin((clock / L.flickerMs) * Math.PI * 2 + this.index * 1.7));
    const level = lit * (0.5 + 0.5 * bright);
    this.lens.setAlpha(level * flicker);
    this.glow?.setAlpha(level * L.glowAlpha * flicker);
  }

  /** Puts every part where `out` says. */
  private place(): void {
    const o = this.out;
    const visible = o > 0.001;
    const { riseFrom, height } = L;
    const riseT = Phaser.Math.Clamp((o - riseFrom) / (1 - riseFrom), 0, 1);
    const grown = Phaser.Math.Easing.Back.Out(riseT); // a small overshoot at the top, like a spring

    const up = height * grown;
    const grow = 0.4 + 0.6 * riseT;
    this.shadow.setVisible(riseT > 0).setScale((L.shadow.w / 64) * grow, (L.shadow.h / 32) * grow).setAlpha(Math.min(1, riseT * 2));
    this.stem.setVisible(riseT > 0).setPosition(this.x, this.y).setScale(L.stemScale, Math.max(0.001, (height / 48) * grown));
    const scale = 0.55 + 0.45 * Math.min(1, grown); // the lantern comes closer to the camera as it rises
    this.base.setVisible(riseT > 0).setScale((L.base.w / 36) * (0.5 + 0.5 * Math.min(1, riseT * 2)), (L.base.h / 20) * (0.5 + 0.5 * Math.min(1, riseT * 2)));
    const rattle = this.rattleMs > 0 ? Math.sin(this.rattleMs / 28) * L.rattle.px * (this.rattleMs / L.rattle.ms) : 0; // a hit shakes the lantern sideways
    this.head.setVisible(riseT > 0).setPosition(this.x + rattle, this.y - up).setDisplaySize(L.head.w * scale, L.head.h * scale);
    this.lens.setPosition(this.x + rattle, this.y - up - (L.head.originY - L.head.glassY) * L.head.h * scale).setScale(scale).setVisible(riseT > 0);
    if (!visible) {
      this.lens.setAlpha(0);
      this.glow?.setAlpha(0);
    }
  }

  /** A little dust where the hatch opens. The circles belong to the scene's tweens, so a restart cleans them up. */
  private puff(): void {
    const P = L.puff;
    for (let i = 0; i < P.count; i++) {
      const a = (i / P.count) * Math.PI * 2 + Math.random() * 0.6;
      const dust = this.scene.add.circle(this.x, this.y, Phaser.Math.Between(3, 6), P.color, 0.7).setDepth(L.floorDepth + 0.3);
      this.scene.tweens.add({
        targets: dust,
        x: this.x + Math.cos(a) * P.spreadPx,
        y: this.y + Math.sin(a) * P.spreadPx * 0.7 - 6,
        alpha: 0,
        scale: 1.8,
        duration: P.ms,
        ease: 'Sine.easeOut',
        onComplete: () => dust.destroy(),
      });
    }
  }
}
