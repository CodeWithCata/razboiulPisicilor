/** @file The emo cat's sadness: slump and sob poses, teardrops from his eyes, sighs, a little rain cloud that follows him and drizzles on his head, and the soap bubble he hides in. Visual only. */
import Phaser from 'phaser';
import { FX_BUBBLE_R } from '../../assets/art/fx';
import { Tex } from '../../assets/keys';
import { EMO_RIG as RIG } from '../../config/animation';
import type { BossLook } from './BossViews';

const IDLE_SPEED = 12; // px/s: below this he counts as standing still
const toRad = Phaser.Math.DegToRad;

/** The pose numbers. Attacks ease these (`EmoRig.to`), `sync` turns them into squash and tilt. */
export interface EmoPose {
  /** Positive = hunched and wider (crouch), negative = stretched along his facing (lunge, scream). */
  squash: number;
  /** Extra lean in degrees. */
  tiltDeg: number;
  /** Sobbing, 0 to 1: his whole body shakes. */
  sob: number;
  /** How fast the tears flow (1 = a slow steady cry). */
  cry: number;
}

const NEUTRAL: EmoPose = { squash: 0, tiltDeg: 0, sob: 0, cry: 1 };

export type EmoEase = 'out' | 'in' | 'inOut';
const EASES: Record<EmoEase, (t: number) => number> = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

interface Move {
  key: keyof EmoPose;
  from: number;
  to: number;
  ms: number;
  t: number;
  ease: EmoEase;
  delay: number;
  started: boolean;
}

/** A tear or a raindrop that is flying or falling. Moved by hand each frame (no tween per drop). */
interface Drop {
  obj: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  max: number;
}

const between = (r: { readonly min: number; readonly max: number }): number => r.min + Math.random() * (r.max - r.min);

export class EmoRig {
  readonly pose: EmoPose = { ...NEUTRAL };
  /** What `MafiaCat` adds to its body each frame (filled by `sync`). */
  squash: number = RIG.slump.squash;
  tiltDeg = 0;

  private readonly moves: Move[] = [];
  private readonly drops: Drop[] = [];
  private readonly cloud: Phaser.GameObjects.Container;
  private readonly puffs: Phaser.GameObjects.Arc[] = [];
  private readonly tmp = { x: 0, y: 0 };

  private clock = 0;
  private moveAmt = 0;
  private jolt = 0;
  private joltTilt = 0;
  private storm = false;
  /** v172: 0..1, how much of his health he has lost: a bigger, darker, wetter cloud. */
  private gloom = 0;
  private cloudScale = 1;
  /** v172: the bubble round him while he hides. */
  private bubble: Phaser.GameObjects.Image | null = null;
  private bubbleBornAt = 0;
  private tearIn = 0;
  private fringeTearIn = 0;
  private tearCount = 0;
  private rainIn = 0;
  private sighIn: number = between(RIG.sigh.everyMs);
  private flashIn: number = between(RIG.cloud.flashEveryMs);
  private flashLeft = 0;
  private cloudX: number;
  private cloudY: number;
  private destroyed = false;
  /** Which drawing of him is showing (and whether the side one is mirrored): decides where the tears and sighs come from. */
  private look: BossLook = 'front';
  private left = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    this.cloudX = owner.x;
    this.cloudY = owner.y - RIG.cloud.hoverPx;
    for (const [x, y, r] of RIG.cloud.puffs) {
      this.puffs.push(scene.add.circle(x, y, r, RIG.cloud.color).setStrokeStyle(RIG.cloud.outlineW, RIG.cloud.outline));
    }
    this.cloud = scene.add.container(this.cloudX, this.cloudY, this.puffs).setDepth(RIG.cloud.depth).setAlpha(RIG.cloud.alpha);
  }

  /** He turned to show his back or his side (see `BossViews`). */
  setLook(look: BossLook, left: boolean): void {
    this.look = look;
    this.left = left;
  }

  /** Where his eye is now, relative to his center; null = none in sight (from behind). */
  private eyeSpot(): { x: number; y: number } | null {
    if (this.look === 'back') return null;
    if (this.look === 'side') return { x: RIG.eyeSide.x * (this.left ? -1 : 1), y: RIG.eyeSide.y };
    return RIG.eye;
  }

  private mouthSpot(): { x: number; y: number } {
    if (this.look === 'side') return { x: RIG.mouthSide.x * (this.left ? -1 : 1), y: RIG.mouthSide.y };
    return RIG.mouth;
  }

  // ---- posing ---------------------------------------------------------------

  /** Ease some pose numbers to new values over `ms`, after an optional delay. A newer move on the same number replaces the older one. */
  to(target: Partial<EmoPose>, ms: number, ease: EmoEase = 'out', delayMs = 0): void {
    for (const key of Object.keys(target) as Array<keyof EmoPose>) {
      const to = target[key];
      if (to === undefined) continue;
      const move: Move = { key, from: this.pose[key], to, ms, t: 0, ease, delay: delayMs, started: false };
      if (delayMs <= 0) {
        // A new pose right now cancels an older "go back later" that is still waiting (e.g. stunned in the middle of an attack).
        for (let i = this.moves.length - 1; i >= 0; i--) {
          const old = this.moves[i]!;
          if (!old.started && old.key === key) this.moves.splice(i, 1);
        }
        this.start(move);
      }
      this.moves.push(move);
    }
  }

  private start(move: Move): void {
    move.started = true;
    move.from = this.pose[move.key];
    for (let i = this.moves.length - 1; i >= 0; i--) {
      const other = this.moves[i]!;
      if (other !== move && other.started && other.key === move.key) this.moves.splice(i, 1);
    }
  }

  private advanceMoves(dt: number): void {
    for (const m of [...this.moves]) {
      if (!this.moves.includes(m)) continue; // a move that started this frame may have replaced it
      if (!m.started) {
        m.delay -= dt;
        if (m.delay > 0) continue;
        this.start(m);
      }
      m.t += dt;
      const k = m.ms <= 0 ? 1 : Math.min(1, m.t / m.ms);
      this.pose[m.key] = m.from + (m.to - m.from) * EASES[m.ease](k);
      if (k >= 1) this.moves.splice(this.moves.indexOf(m), 1);
    }
  }

  /** Back to the slumped, quietly crying pose. */
  reset(ms = 300): void {
    this.to(NEUTRAL, ms, 'out');
  }

  /** Phase 2: the cloud turns dark and rains harder, and now and then it flashes pink. */
  setStorm(on: boolean): void {
    this.storm = on;
    for (const puff of this.puffs) puff.setFillStyle(this.restColor());
  }

  /** v172 rainy mood: `level` 0..1 = the share of his health he has lost. */
  setGloom(level: number): void {
    const next = Math.max(0, Math.min(1, level));
    if (Math.abs(next - this.gloom) < 0.005) return;
    this.gloom = next;
    if (this.flashLeft <= 0) for (const puff of this.puffs) puff.setFillStyle(this.restColor());
  }

  /** v172 cry for help: a blue bubble round him while he hides. */
  setHiding(on: boolean): void {
    if (this.destroyed) return;
    if (!on) {
      this.bubble?.destroy();
      this.bubble = null;
      return;
    }
    if (this.bubble) return;
    const b = RIG.cloud.hideBubble;
    const fit = b.radius / FX_BUBBLE_R;
    this.bubbleBornAt = this.clock;
    this.bubble = this.scene.add.image(this.owner.x, this.owner.y, Tex.FxBubbleEmo).setAlpha(b.alpha).setDepth(b.depth).setScale(fit * 0.3);
    this.scene.tweens.add({ targets: this.bubble, scale: fit, duration: 220, ease: 'Back.easeOut' });
  }

  /** The cloud's resting color: grey, darker with the gloom, dark in the storm. */
  private restColor(): number {
    return this.storm ? RIG.cloud.darkColor : mixColor(RIG.cloud.color, RIG.cloud.darkColor, this.gloom * 0.85);
  }

  // ---- one-shot effects -----------------------------------------------------

  /** He got hit: a jolt, and a few tears jump out of his eye. */
  hurt(): void {
    this.jolt = 0.14;
    this.joltTilt = (Math.random() < 0.5 ? -1 : 1) * 7;
    this.spray(5);
  }

  /** A spurt of tears out of his eye (or all around him with `all`): they fly out and fall. */
  spray(count: number, all = false): void {
    if (this.destroyed) return;
    const eye = this.eyeSpot() ?? { x: 0, y: 0 };
    const from = all ? this.world(0, 0, this.tmp) : this.world(eye.x, eye.y, this.tmp);
    for (let i = 0; i < count; i++) {
      const a = all ? (i / count) * Math.PI * 2 + Math.random() * 0.5 : Math.random() * Math.PI * 2;
      const speed = between(RIG.spray.speed);
      this.addDrop(from.x, from.y, Math.cos(a) * speed, Math.sin(a) * speed - speed * RIG.spray.upBias, between(RIG.spray.lifeMs), Math.floor(Math.random() * RIG.tear.colors.length), 0);
    }
  }

  /** A sigh: he sinks a little more and a pale puff drifts out of his mouth. Only when he is calm. */
  private sigh(): void {
    if (this.moves.length > 0 || this.pose.sob > 0.05) return;
    const s = RIG.sigh;
    this.to({ squash: s.sinkSquash, tiltDeg: s.sinkTiltDeg }, s.sinkMs, 'inOut');
    this.to({ squash: 0, tiltDeg: 0 }, s.backMs, 'inOut', s.sinkMs + 250);
    const mouth = this.mouthSpot();
    const at = this.world(mouth.x, mouth.y, this.tmp);
    const puff = this.scene.add.image(at.x, at.y, Tex.Smoke).setDepth(RIG.tear.depth).setTint(s.puffColor).setAlpha(s.puffAlpha).setScale(0.25);
    this.scene.tweens.add({
      targets: puff, x: at.x - 26 + Math.random() * 12, y: at.y - 34, scale: 0.85, alpha: 0, duration: s.puffMs, ease: 'Sine.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  // ---- per-frame drawing ----------------------------------------------------

  /** A point on his body texture (relative to its center) in world space: follows his turn and size. */
  private world(lx: number, ly: number, out: { x: number; y: number }): { x: number; y: number } {
    const o = this.owner;
    const px = lx * o.scaleX;
    const py = ly * o.scaleY;
    const c = Math.cos(o.rotation);
    const s = Math.sin(o.rotation);
    out.x = o.x + px * c - py * s;
    out.y = o.y + px * s + py * c;
    return out;
  }

  /** Call every frame after he has moved (from `preUpdate`). `delta` is in ms. */
  sync(delta: number): void {
    const o = this.owner;
    if (this.destroyed || !o.active || !o.body) return;
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.advanceMoves(dt);

    const body = o.body as Phaser.Physics.Arcade.Body;
    const moving = body.speed >= IDLE_SPEED;
    this.moveAmt += ((moving ? 1 : 0) - this.moveAmt) * Math.min(1, (10 * dt) / 1000);
    this.jolt *= Math.exp(-dt / 110);

    // What the body gets: the slump, a slow bob, the pose, the sob shake and the hit jolt.
    const wave = Math.sin(this.clock * RIG.sob.rate) * this.pose.sob;
    this.squash = RIG.slump.squash + Math.sin(this.clock * RIG.slump.bobRate) * RIG.slump.bobSquash + this.pose.squash + wave * RIG.sob.squash + this.jolt;
    this.tiltDeg =
      this.pose.tiltDeg + Math.sin(this.clock * RIG.slump.swayRate) * RIG.slump.swayDeg + wave * RIG.sob.tiltDeg + this.moveAmt * RIG.walkLeanDeg + (this.jolt / 0.14) * this.joltTilt;

    this.updateTears(dt, o);
    this.updateCloud(dt, o);
    this.updateDrops(dt, o.visible);

    this.sighIn -= dt;
    if (this.sighIn <= 0) {
      this.sighIn = between(RIG.sigh.everyMs);
      this.sigh();
    }
  }

  private updateTears(dt: number, o: Phaser.Physics.Arcade.Sprite): void {
    if (!o.visible) return;
    const cry = Math.max(0.4, this.pose.cry);
    this.tearIn -= dt;
    if (this.tearIn <= 0) {
      this.tearIn = RIG.tear.everyMs / cry;
      const eye = this.eyeSpot();
      if (eye) {
        const at = this.world(eye.x, eye.y, this.tmp);
        this.emitTear(at.x, at.y);
      }
    }
    this.fringeTearIn -= dt;
    if (this.fringeTearIn <= 0) {
      this.fringeTearIn = RIG.tear.fringeEveryMs / cry;
      if (this.look === 'front') {
        const at = this.world(RIG.fringeEye.x, RIG.fringeEye.y, this.tmp); // the other eye hides under the fringe, and is only there from the front
        this.emitTear(at.x, at.y);
      }
    }
  }

  /** One tear of the steady cry. Every 4th is black mascara. */
  private emitTear(x: number, y: number): void {
    if (this.drops.length >= RIG.tear.maxAlive) return;
    const { spread, lifeMs } = RIG.tear;
    this.addDrop(x, y, (Math.random() * 2 - 1) * spread.vx, -Math.random() * spread.vy, between(lifeMs), this.tearCount++ % RIG.tear.colors.length, RIG.tear.gravity);
  }

  private addDrop(x: number, y: number, vx: number, vy: number, lifeMs: number, colorIndex: number, gravity: number): void {
    const t = RIG.tear;
    const g = gravity > 0 ? gravity : t.gravity;
    const e = this.scene.add.image(x, y, Tex.FxDrop).setTint(t.colors[colorIndex % t.colors.length]).setDisplaySize(t.w, t.h).setDepth(t.depth);
    this.drops.push({ obj: e, vx, vy, gravity: g, life: lifeMs, max: lifeMs });
  }

  private updateCloud(dt: number, o: Phaser.Physics.Arcade.Sprite): void {
    const c = RIG.cloud;
    const targetX = o.x;
    const targetY = o.y - c.hoverPx + Math.sin(this.clock * c.bobRate) * c.bobPx;
    const k = Math.min(1, (c.lag * dt) / 1000);
    this.cloudX += (targetX - this.cloudX) * k;
    this.cloudY += (targetY - this.cloudY) * k;
    const shiver = Math.sin(this.clock * RIG.sob.rate) * this.pose.sob * 2;
    this.cloud.setPosition(this.cloudX + shiver, this.cloudY).setVisible(o.visible);
    // v172: the cloud grows with his gloom, and the bubble (cry for help) follows his body.
    this.cloudScale += (1 + (c.gloomScale - 1) * this.gloom - this.cloudScale) * Math.min(1, dt / 400);
    this.cloud.setScale(this.cloudScale);
    if (this.bubble) {
      this.bubble.setPosition(o.x, o.y).setVisible(o.visible);
      if (this.clock - this.bubbleBornAt > 220) {
        // Once it has popped up it wobbles like a soap bubble: a little taller while narrower, and back.
        const fit = c.hideBubble.radius / FX_BUBBLE_R;
        const w = Math.sin(this.clock * c.hideBubble.breatheRate) * c.hideBubble.breathe;
        this.bubble.setScale(fit * (1 + w), fit * (1 - w));
      }
    }

    // Rain falls out of the bottom of the cloud (a lot more in the storm).
    this.rainIn -= dt;
    if (this.rainIn <= 0 && o.visible) {
      this.rainIn = c.rain.everyMs / ((this.storm ? c.stormRainMult : 1) * (1 + (c.gloomRainMult - 1) * this.gloom));
      const e = this.scene.add.image(this.cloudX + (Math.random() * 2 - 1) * c.rain.jitter, this.cloudY + 16, Tex.FxDrop).setTint(c.rain.color).setDisplaySize(c.rain.w, c.rain.h).setDepth(RIG.tear.depth);
      this.drops.push({ obj: e, vx: 0, vy: c.rain.speed, gravity: 0.0001, life: c.rain.lifeMs, max: c.rain.lifeMs });
    }

    // Storm: the cloud flashes pink every now and then.
    if (this.storm) {
      this.flashIn -= dt;
      if (this.flashIn <= 0) {
        this.flashIn = between(c.flashEveryMs);
        this.flashLeft = c.flashMs;
      }
    }
    if (this.flashLeft > 0) {
      this.flashLeft -= dt;
      const color = this.flashLeft > 0 ? c.flashColor : this.restColor();
      for (const puff of this.puffs) puff.setFillStyle(color);
    }
  }

  private updateDrops(dt: number, visible: boolean): void {
    const s = dt / 1000;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]!;
      d.life -= dt;
      if (d.life <= 0) {
        d.obj.destroy();
        this.drops.splice(i, 1);
        continue;
      }
      d.vy += d.gravity * s;
      d.obj.x += d.vx * s;
      d.obj.y += d.vy * s;
      d.obj.setRotation(Math.atan2(d.vy, d.vx) - Math.PI / 2);
      d.obj.setAlpha(Math.min(1, d.life / (d.max * 0.45))).setVisible(visible);
    }
  }

  // ---- cleanup ----------------------------------------------------------------

  /** Remove everything. `beaten`: he lost, so he bursts into tears and the little cloud sinks away sadly. */
  destroy(beaten = false): void {
    if (this.destroyed) return;
    const from = this.world(0, 0, { x: 0, y: 0 });
    this.destroyed = true;
    this.bubble?.destroy();
    this.bubble = null;
    this.drops.forEach((d) => d.obj.destroy());
    this.drops.length = 0;

    if (beaten && this.cloud.active) {
      const cloud = this.cloud;
      this.scene.tweens.add({
        targets: cloud, y: cloud.y + RIG.death.cloudSinkPx, alpha: 0, duration: RIG.death.cloudMs, ease: 'Sine.easeIn',
        onComplete: () => cloud.destroy(),
      });
      for (let i = 0; i < RIG.death.tears; i++) {
        const a = (i / RIG.death.tears) * Math.PI * 2 + Math.random() * 0.4;
        const reach = 50 + Math.random() * 70;
        const e = this.scene.add.image(from.x, from.y, Tex.FxDrop).setTint(RIG.tear.colors[i % RIG.tear.colors.length]).setDisplaySize(RIG.tear.w + 2, RIG.tear.h + 3).setDepth(RIG.tear.depth);
        this.scene.tweens.add({
          targets: e, x: from.x + Math.cos(a) * reach, y: from.y + Math.sin(a) * reach + 26, alpha: 0, rotation: toRad(Math.cos(a) * 90),
          duration: 700 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => e.destroy(),
        });
      }
    } else {
      this.cloud.destroy();
    }
  }
}

/** Mixes two 0xRRGGBB colors: `k` 0 = `a`, 1 = `b`. */
function mixColor(a: number, b: number, k: number): number {
  const ch = (shift: number): number => Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
