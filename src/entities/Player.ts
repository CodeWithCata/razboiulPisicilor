/** @file Varu: movement, aim, damage, belt visuals, walk / smoke-break / energy back flip animation, power-up multipliers. */
import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { PLAYER } from '../config/balance';
import { sampleKeys } from '../core/ease';
import { bus, Events, type IdleHabitPayload, type PlayerHealthPayload, type PlayerHurtPayload } from '../core/events';
import type { InputSource } from '../input/InputSource';
import { Actor } from './Actor';
import { gameClock } from '../core/clock';
import { CIG_SMOKE, ENERGY_FLIP, ENERGY_TRAIL, EMO_FX, GOLD_BELT, IDLE_HABITS, MILK_FX, MILK_TRAIL, RUST_FX, SMOKE_BREAK, VARU_ANIM, type ZLook } from '../config/animation';
import { setCircleHitbox } from '../core/sprite';
import { BELT_FX, css, FONT } from '../config/style';

/** Body frames of the cigarette drag: arm down, half way, cigarette at his mouth. */
const BODY_FRAMES: readonly TexKey[] = [Tex.Varu, Tex.VaruDrag1, Tex.VaruDrag2];
/** The emo bad buff: hood up, then pushed back as the arm rises, and down while the cigarette is at his mouth (he is the normal Varu then). */
const EMO_BODY_FRAMES: readonly TexKey[] = [Tex.VaruEmo, Tex.VaruEmoDrag1, Tex.VaruDrag2];

const smoothstep = (u: number): number => u * u * (3 - 2 * u);

/** Varu. Sprite must face UP; we rotate it toward the aim direction. */
export class Player extends Actor {
  /** Power-ups will change these later (milk, energy drink, golden belt). */
  speedMultiplier = 1;
  /** Slowed by the floor (a mustard puddle): 1 = normal. BarrelSystem sets it every frame before Varu moves; it never mixes with the power-up speed above. */
  terrainSlow = 1;
  /** Slowed by the emo cat's tear puddles (`TearPuddles`, 1 = normal). Separate from `terrainSlow`, which the mustard puddles set every frame. */
  tearSlow = 1;
  damageMultiplier = 1;
  rangeMultiplier = 1;
  /** Bad buffs (PowerUpSystem sets them): the pause between plain swings and the spin / throw cooldowns get this many times longer, and the body grows (1 = normal). */
  swingCooldownMultiplier = 1;
  specialCooldownMultiplier = 1;
  sizeMultiplier = 1;
  /** True while the emo buff is active (PowerUpSystem sets it): hood up, broken hearts over his head. */
  emo = false;
  /** True while the golden belt is active (PowerUpSystem sets it): gold strap, sticky white goo. */
  goldenBelt = false;
  /** True while the milk buff is active (PowerUpSystem sets it): drippy white trail. */
  milkTrail = false;
  /** True while the energy drink buff is active (PowerUpSystem sets it): small green Z z z letters behind him. */
  energyTrail = false;
  /** True while the rusty belt buff is active (PowerUpSystem sets it): rust flakes come off the belt. */
  rustyFlakes = false;
  private rustTimer = 0;

  /** Current aim direction (normalized). Ninja cats use it to appear behind Varu. */
  readonly facing = new Phaser.Math.Vector2(0, -1);

  private invincibleUntil = 0;
  /** Dev only (debug key G): nothing hurts Varu. */
  godMode = false;
  private phase = 0;
  private rockAmount = 0;
  private legSwing = 0;
  private readonly legL: Phaser.GameObjects.Image;
  private readonly legR: Phaser.GameObjects.Image;
  private readonly heldBelt: Phaser.GameObjects.Image;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeTimer = 0;
  /** Cigarette drag: ms since it started (-1 = not smoking), how far the arm is up (0..1), which body frame shows. */
  private breakMs = -1;
  private breakPose = 0;
  private bodyFrame = 0;
  private exhaled = false;
  /** Idle habits (config IDLE_HABITS): how long he has stood still, when the next habit is due, the one running, the last one, and the lean they add. */
  private idleMs = 0;
  private nextHabitAt: number = IDLE_HABITS.afterMs;
  private habit: { kind: 'belt' | 'neck'; ms: number } | null = null;
  private lastHabit: 'drag' | 'belt' | 'neck' | null = null;
  private habitTilt = 0;
  private beltTilt = 0;
  private readonly ember: Phaser.GameObjects.Image;
  /** Goo dripping off the golden belt in his fist, and the splat when he grabs it. */
  private readonly goo: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly gooBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private gooTimer = 0;
  /** The milk trail: a smeared white ribbon on the ground (drawn from his recent path) plus splotches beside it. */
  private readonly milkGfx: Phaser.GameObjects.Graphics;
  private readonly milkPath: Array<{ x: number; y: number; t: number }> = [];
  private readonly milkBlobs: Array<{ x: number; y: number; r: number; t: number; life: number }> = [];
  private milkTimer = 0;
  /** The Z z z trail: where the last letter dropped, how many have dropped (picks the size), idle timer. */
  private zLast: { x: number; y: number } | null = null;
  private zCount = 0;
  private zTimer = 0;
  private emoTimer = 0;
  private bodyEmo = false;
  /** Big Varu: the scale he was built with, and how big he is right now (eases toward `sizeMultiplier`). */
  private baseScale = 1;
  private sizeNow = 1;
  /** The smoke break: he cannot walk or start a swing until this game time (gameClock). */
  private frozenUntil = 0;
  /**
   * The energy drink back flip (config ENERGY_FLIP): ms since it started (-1 = not flipping). While it runs the real body is hidden and
   * `flipBody` plays the somersault in its place (with the legs and belt), so the body's scale and hitbox never change.
   */
  private flipMs = -1;
  /** Where the stand-in parts are: position, turn, and the scale across (`sx`) and along (`sy`, negative = flipped over) his body. */
  private readonly flipPose = { on: false, x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
  private flipGhostMs = 0;
  /** The landing was already announced for this flip. */
  private flipLanded = false;
  private readonly flipBody: Phaser.GameObjects.Image;
  private beltIsGold = false;
  private readonly tipPoint = new Phaser.Math.Vector2();
  /** False while the belt swings or flies: the belt in his fist is hidden then (BeltSystem sets it). */
  beltInHand = true;
  /** Extra turn (radians) while the belt spins him around (BeltSystem sets it). */
  spinTurn = 0;
  /** True during the golden tornado spin: the body and legs are hidden inside it (BeltSystem sets it). */
  hiddenInTornado = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Tex.Varu, { maxHp: PLAYER.maxHp, size: PLAYER.size, hitRadius: PLAYER.hitRadius });
    this.legL = scene.add.image(x, y, Tex.VaruLegL).setDepth(19);
    this.legR = scene.add.image(x, y, Tex.VaruLegR).setDepth(19);
    this.heldBelt = scene.add.image(x, y, Tex.VaruBelt).setDepth(21);
    this.flipBody = scene.add.image(x, y, Tex.Varu).setDepth(20).setVisible(false);
    this.smoke = scene.add.particles(0, 0, Tex.Particle, {
      emitting: false,
      lifespan: CIG_SMOKE.lifespanMs,
      speed: CIG_SMOKE.speed,
      angle: CIG_SMOKE.angleDeg,
      scale: CIG_SMOKE.scale,
      alpha: CIG_SMOKE.alpha,
      tint: [...CIG_SMOKE.tint],
    }).setDepth(22);
    this.ember = scene.add.image(x, y, Tex.Particle).setTint(SMOKE_BREAK.ember.tint).setDepth(23).setVisible(false);
    this.goo = scene.add.particles(0, 0, Tex.MilkDrop, {
      emitting: false,
      gravityY: MILK_FX.gravity * GOLD_BELT.drops.gravityMult,
      lifespan: GOLD_BELT.held.lifespanMs,
      speed: GOLD_BELT.held.speed,
      scale: GOLD_BELT.held.scale,
      alpha: GOLD_BELT.held.alpha,
      tint: [...GOLD_BELT.goo],
    }).setDepth(22);
    this.gooBurst = scene.add.particles(0, 0, Tex.MilkDrop, {
      emitting: false,
      gravityY: MILK_FX.gravity * GOLD_BELT.drops.gravityMult,
      lifespan: GOLD_BELT.flourish.lifespanMs,
      speed: GOLD_BELT.flourish.speed,
      scale: GOLD_BELT.flourish.scale,
      alpha: GOLD_BELT.flourish.alpha,
      tint: [...GOLD_BELT.goo],
    }).setDepth(22);
    this.milkGfx = scene.add.graphics().setDepth(3);
    this.setCollideWorldBounds(true);
    this.setDepth(20);
    this.baseScale = this.scaleX;
    this.emitHealth();
  }

  tick(input: InputSource): void {
    if (!this.alive) return;

    if (!this.isKnockedBack) {
      // Only when `ENERGY_FLIP.rooted` is on: planted during the back flip. By default he keeps full control while he flips.
      const planted = ENERGY_FLIP.rooted && this.flipMs >= 0;
      const speed = planted || this.frozen ? 0 : PLAYER.speed * this.speedMultiplier * this.terrainSlow * this.tearSlow;
      this.setVelocity(input.move.x * speed, input.move.y * speed);
    }
    this.facing.copy(input.aim);
    this.setRotation(input.aim.angle() + Math.PI / 2 + this.spinTurn);
    this.waddle();
    this.rotation += this.habitTilt; // neck crack
    this.syncShadow();
  }

  /** Smooth waddle: rock left and right while walking, eased in and out. */
  private waddle(): void {
    if (!VARU_ANIM.enabled) return;
    const dt = Math.min(gameClock.scaled(this.scene.game.loop.delta), 50) / 1000; // game time: slow-mo slows the waddle too
    const speed = (this.body as Phaser.Physics.Arcade.Body).speed;
    const moving = speed >= VARU_ANIM.idleSpeed;
    if (moving) this.phase += speed * dt * VARU_ANIM.radPerPx;
    const target = moving ? 1 : 0;
    this.rockAmount += (target - this.rockAmount) * Math.min(1, VARU_ANIM.blendPerSec * dt);
    this.legSwing = Math.sin(this.phase) * this.rockAmount * VARU_ANIM.legSwing;
    if (this.rockAmount < 0.01) return;
    this.rotation += Math.sin(this.phase) * this.rockAmount * Phaser.Math.DegToRad(VARU_ANIM.tiltDeg);
  }

  /** Standing still for a while: now and then he does a small thing (drag, check the belt, crack his neck). Any move, swing, spin or hit ends it. */
  private updateIdleHabits(delta: number): void {
    const H = IDLE_HABITS;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    const still =
      H.enabled && this.alive && body !== null && body.speed < VARU_ANIM.idleSpeed && !this.isKnockedBack && this.beltInHand && this.spinTurn === 0 && !this.hiddenInTornado;
    if (!still) {
      this.idleMs = 0;
      this.nextHabitAt = H.afterMs;
      this.habit = null;
      this.habitTilt = 0;
      this.beltTilt = 0;
      return;
    }
    this.idleMs += delta;
    const habit = this.habit;
    if (habit) {
      habit.ms += delta;
      const look = H[habit.kind];
      const u = habit.ms / look.ms;
      if (u >= 1) {
        this.habit = null;
        this.habitTilt = 0;
        this.beltTilt = 0;
        return;
      }
      const tilt = Phaser.Math.DegToRad(sampleKeys(u, look.times, look.tiltDeg));
      if (habit.kind === 'neck') this.habitTilt = tilt;
      else this.beltTilt = tilt;
      return;
    }
    if (this.idleMs >= this.nextHabitAt && this.breakMs < 0 && this.flipMs < 0) this.startHabit();
  }

  /** Picks the next habit (never the same twice in a row, by weight) and sets when the one after it is due. */
  private startHabit(): void {
    const H = IDLE_HABITS;
    this.nextHabitAt = this.idleMs + Phaser.Math.Between(H.gapMs.min, H.gapMs.max);
    const kinds = (Object.keys(H.weights) as Array<'drag' | 'belt' | 'neck'>).filter((k) => k !== this.lastHabit);
    let roll = Math.random() * kinds.reduce((sum, k) => sum + H.weights[k], 0);
    let kind = kinds[0]!;
    for (const k of kinds) {
      roll -= H.weights[k];
      if (roll <= 0) {
        kind = k;
        break;
      }
    }
    this.lastHabit = kind;
    if (kind === 'drag') {
      this.smokeBreak(); // the cigarette pose, smoke and line that already exist
      return;
    }
    this.habit = { kind, ms: 0 };
    const at = kind === 'belt' ? this.handPosition() : { x: this.x, y: this.y };
    const payload: IdleHabitPayload = { x: at.x, y: at.y, habit: kind };
    bus.emit(Events.IdleHabit, payload);
  }

  /** A point on the body texture (relative to its center) in world space: follows his turn and size. */
  private bodyPoint(local: { readonly x: number; readonly y: number }, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const k = this.scaleX;
    const lx = local.x * k;
    const ly = local.y * k;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return out.set(this.x + lx * c - ly * s, this.y + lx * s + ly * c);
  }

  /** Where his right fist is in the world. The belt swings from here. */
  handPosition(out = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    return this.bodyPoint(BELT_FX.handOffset, out);
  }

  /** Where the cigarette tip is now: at his side, or at his mouth while the arm is up. */
  private tipLocal(): { x: number; y: number } {
    const a = CIG_SMOKE.tipOffset;
    const b = SMOKE_BREAK.tipOffset;
    return { x: a.x + (b.x - a.x) * this.breakPose, y: a.y + (b.y - a.y) * this.breakPose };
  }

  /** A little smoke puff from the cigarette now and then (time from the frame delta, so it waits during pause). */
  private puffSmoke(delta: number): void {
    if (!CIG_SMOKE.enabled || !this.alive) return;
    this.smokeTimer += delta;
    if (this.smokeTimer < CIG_SMOKE.everyMs) return;
    this.smokeTimer -= CIG_SMOKE.everyMs;
    const tip = this.bodyPoint(this.tipLocal(), this.tipPoint);
    this.smoke.emitParticleAt(tip.x, tip.y, 1);
  }

  /** Food or energy drink: he takes a drag. The arm swings up, the tip glows, then a cloud of smoke goes out in front of him. Visual only. */
  smokeBreak(quiet = false): void {
    if (!SMOKE_BREAK.enabled || !this.alive) return;
    this.breakMs = 0;
    this.exhaled = false;
    bus.emit(Events.SmokeBreak, { x: this.x, y: this.y, quiet });
  }

  /** True while he is stuck in a smoke break (BeltSystem starts no new attack then). */
  get frozen(): boolean {
    return gameClock.now < this.frozenUntil;
  }

  /** Dev helper: ends a smoke break freeze at once. */
  thaw(): void {
    this.frozenUntil = 0;
  }

  /** The bad smoke break: he stops (no walking, no new swing) for `ms` and takes a drag. The line comes from the pickup's label, so the drag is quiet. */
  freeze(ms: number): void {
    if (!this.alive) return;
    this.frozenUntil = gameClock.now + ms;
    this.smokeBreak(true);
  }

  /** The energy drink: he plants his feet, crouches, springs up and does one somersault on the spot. Animation only (ENERGY_FLIP); a second can in mid air does nothing. */
  backflip(): void {
    if (!ENERGY_FLIP.enabled || !this.alive || this.flipMs >= 0 || this.hiddenInTornado) return;
    this.flipMs = 0;
    this.flipGhostMs = 0;
    this.flipLanded = false;
    this.flipBody.setTexture(this.texture.key); // the pose he has right now
  }

  /** Moves the flip on one frame and works out where its parts are (`flipPose`). Runs BEFORE the body is shown or hidden, so the last frame is never empty. `delta` is game ms. */
  private advanceBackflip(delta: number): void {
    if (this.flipMs < 0) return;
    const F = ENERGY_FLIP;
    if (!this.alive || this.hiddenInTornado) {
      this.endBackflip();
      return;
    }
    this.flipMs += delta;
    const u = this.flipMs / F.ms;
    if (u >= 1) {
      this.endBackflip();
      return;
    }
    // `p` runs 0..1 from takeoff to touchdown; `air` is 0 on the ground and 1 at the top (a parabola, so he hangs at the top).
    const p = Phaser.Math.Clamp((u - F.takeoff) / (F.touchdown - F.takeoff), 0, 1);
    const air = 1 - (2 * p - 1) ** 2;
    const turn = F.turns * Math.PI * 2 * Phaser.Math.Easing.Sine.InOut(p);
    // Squash and stretch: crouch, push-off stretch, none in the air, squash on landing, settle.
    const times = [0, F.takeoff, F.takeoff + F.launch, F.touchdown - F.launch, F.touchdown, 1];
    const squashX = sampleKeys(u, times, [0, F.crouch.x, F.stretch.x, 0, F.landing.x, 0]);
    const squashY = sampleKeys(u, times, [0, F.crouch.y, F.stretch.y, 0, F.landing.y, 0]);
    // The somersault seen from above: his length (the way he faces) shrinks to a sliver, flips over (negative) and grows back.
    let along = Math.cos(turn);
    if (Math.abs(along) < F.minLength) along = along < 0 ? -F.minLength : F.minLength;
    const grow = this.scaleX * (1 + F.hop * air);
    const pose = this.flipPose;
    pose.on = true;
    pose.x = this.x; // rides along with him wherever he walks (his body and hitbox never leave the floor)
    pose.y = this.y - F.jumpPx * air; // only up the screen
    pose.rot = this.rotation;
    pose.sx = grow * (1 + squashX);
    pose.sy = grow * (1 + squashY) * along;
    this.setShadowJump(1 - (1 - F.shadowSize) * air, 1 - (1 - F.shadowAlpha) * air);
    if (!this.flipLanded && u >= F.touchdown) {
      this.flipLanded = true;
      bus.emit(Events.BackflipLand, { x: this.x, y: this.y });
    }
    this.flipGhostMs += delta;
    if (air > 0.05 && this.flipGhostMs >= F.ghost.everyMs) {
      this.flipGhostMs = 0;
      this.dropGhost();
    }
  }

  /** A green copy of the body that stays where it was and fades out: the speed lines of the spin. Tweens are scene-owned, so a restart cleans them up. */
  private dropGhost(): void {
    const G = ENERGY_FLIP.ghost;
    const pose = this.flipPose;
    const ghost = this.scene.add
      .image(pose.x, pose.y, this.flipBody.texture.key)
      .setRotation(pose.rot)
      .setScale(pose.sx, pose.sy)
      .setDepth(G.depth)
      .setAlpha(G.alpha)
      .setTint(G.tint)
      .setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({ targets: ghost, alpha: 0, scaleX: pose.sx * 0.85, scaleY: pose.sy * 0.85, duration: G.lifeMs, ease: 'Sine.easeOut', onComplete: () => ghost.destroy() });
  }

  /** Puts the stand-in body, the legs and the belt on the flip pose (after they were placed the normal way). */
  private applyBackflip(): void {
    const pose = this.flipPose;
    for (const part of [this.flipBody, this.legL, this.legR, this.heldBelt]) part.setPosition(pose.x, pose.y).setScale(pose.sx, pose.sy);
    this.flipBody.setRotation(pose.rot).setAlpha(this.alpha).setVisible(true);
    for (const leg of [this.legL, this.legR]) leg.setRotation(pose.rot).setAlpha(this.alpha).setVisible(true);
    this.heldBelt.setRotation(pose.rot + this.beltTilt).setVisible(this.beltInHand);
  }

  private endBackflip(): void {
    this.flipMs = -1;
    this.flipPose.on = false;
    this.flipBody.setVisible(false);
    this.setShadowJump(1, 1);
  }

  /** The golden belt just landed in his fist: it flashes gold and splats goo. */
  goldenBeltFlourish(): void {
    if (!GOLD_BELT.enabled || !this.alive) return;
    const f = GOLD_BELT.flourish;
    const at = this.bodyPoint(f.burstOffset, new Phaser.Math.Vector2());
    this.gooBurst.explode(f.drops, at.x, at.y);
    this.heldBelt.setTint(f.flashTint).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(f.flashMs, () => {
      if (!this.heldBelt.active) return;
      this.heldBelt.clearTint();
      this.heldBelt.setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  /** Runs the cigarette drag: arm up (smooth), hold with a glowing tip, blow the smoke out, arm down. */
  private updateSmokeBreak(delta: number): void {
    const s = SMOKE_BREAK;
    if (this.breakMs >= 0 && !this.alive) {
      this.breakMs = -1;
      this.breakPose = 0;
    }
    if (this.breakMs >= 0) {
      this.breakMs += delta;
      const t = this.breakMs;
      const holdEnd = s.raiseMs + s.holdMs;
      if (t < s.raiseMs) this.breakPose = smoothstep(t / s.raiseMs);
      else if (t < holdEnd) this.breakPose = 1;
      else if (t < holdEnd + s.lowerMs) {
        if (!this.exhaled) {
          this.exhaled = true;
          this.exhale();
        }
        this.breakPose = 1 - smoothstep((t - holdEnd) / s.lowerMs);
      } else {
        this.breakMs = -1;
        this.breakPose = 0;
      }
    }

    const frame = this.breakPose < 0.25 ? 0 : this.breakPose < 0.75 ? 1 : 2;
    if (frame !== this.bodyFrame || this.emo !== this.bodyEmo) {
      this.bodyFrame = frame;
      this.bodyEmo = this.emo;
      this.setTexture((this.emo ? EMO_BODY_FRAMES : BODY_FRAMES)[frame]); // emo: the hood is up, except during the drag
    }

    // The tip glows brighter and pulses while the cigarette is at his mouth.
    const glowing = this.breakMs >= 0 && frame === 2;
    this.ember.setVisible(glowing && this.visible);
    if (glowing) {
      const tip = this.bodyPoint(this.tipLocal(), this.tipPoint);
      const pulse = 0.5 + 0.5 * Math.sin(this.breakMs / s.ember.pulseMs);
      this.ember.setPosition(tip.x, tip.y).setScale(this.scaleX * (s.ember.scale.min + (s.ember.scale.max - s.ember.scale.min) * pulse) * 2);
    }
  }

  /** A stream of smoke puffs out of his mouth, in the direction he faces. Tweened images, no emitter, so they can be aimed. */
  private exhale(): void {
    const e = SMOKE_BREAK.exhale;
    const mouth = new Phaser.Math.Vector2();
    for (let i = 0; i < e.puffs; i++) {
      this.scene.time.delayedCall(i * e.staggerMs, () => {
        if (!this.active) return;
        this.bodyPoint(SMOKE_BREAK.mouthOffset, mouth);
        const angle = this.facing.angle() + Phaser.Math.FloatBetween(-e.spreadRad, e.spreadRad);
        const dist = Phaser.Math.FloatBetween(e.distance.min, e.distance.max);
        const puff = this.scene.add
          .image(mouth.x, mouth.y, Tex.Particle)
          .setDepth(22)
          .setTint(e.tint[Phaser.Math.Between(0, e.tint.length - 1)])
          .setAlpha(e.alpha.start)
          .setScale(e.scale.start);
        this.scene.tweens.add({
          targets: puff,
          x: mouth.x + Math.cos(angle) * dist,
          y: mouth.y + Math.sin(angle) * dist,
          scale: e.scale.end,
          alpha: e.alpha.end,
          duration: Phaser.Math.Between(e.durationMs.min, e.durationMs.max),
          ease: 'Cubic.easeOut',
          onComplete: () => puff.destroy(),
        });
      });
    }
  }

  /** He just drank the milk: a big white splat of splotches around him. */
  milkSplash(): void {
    if (!MILK_TRAIL.enabled || !this.alive) return;
    const sp = MILK_TRAIL.splash;
    const now = gameClock.now;
    for (let i = 0; i < sp.blobs; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * sp.spread;
      this.milkBlobs.push({
        x: this.x + Math.cos(a) * d,
        y: this.y + Math.sin(a) * d,
        r: Phaser.Math.FloatBetween(sp.radius.min, sp.radius.max),
        t: now,
        life: Phaser.Math.Between(sp.lifeMs.min, sp.lifeMs.max),
      });
    }
  }

  /**
   * While the milk buff lasts he smears a white ribbon behind him: a line of overlapping circles along his path
   * (thick, with a soft outline), with splotches beside it. It thins out and disappears with age. Not drops.
   */
  private updateMilkTrail(delta: number): void {
    const cfg = MILK_TRAIL;
    const g = this.milkGfx;
    if (!cfg.enabled) return;
    const now = gameClock.now;
    const active = this.milkTrail && this.alive;

    if (active) {
      const last = this.milkPath[this.milkPath.length - 1];
      const moved = !last || Math.hypot(this.x - last.x, this.y - last.y) >= cfg.sampleDist;
      if (moved) {
        this.milkPath.push({ x: this.x, y: this.y, t: now });
        // Splotches along the edges of the ribbon.
        if (Math.random() < cfg.blobChance) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const off = side * Phaser.Math.FloatBetween(cfg.width * 0.35, cfg.blobSpread);
          const dir = this.rotation - Math.PI / 2; // facing; sideways is good enough for a smear
          this.milkBlobs.push({
            x: this.x + Math.cos(dir + Math.PI / 2) * off,
            y: this.y + Math.sin(dir + Math.PI / 2) * off,
            r: Phaser.Math.FloatBetween(cfg.blobRadius.min, cfg.blobRadius.max),
            t: now,
            life: cfg.lifeMs * Phaser.Math.FloatBetween(0.7, 1.1),
          });
        }
      } else {
        // Standing still: a puddle slowly spreads under him.
        this.milkTimer += delta;
        if (this.milkTimer >= cfg.idleEveryMs) {
          this.milkTimer = 0;
          this.milkBlobs.push({
            x: this.x + Phaser.Math.Between(-8, 8),
            y: this.y + Phaser.Math.Between(-8, 8),
            r: Phaser.Math.FloatBetween(cfg.blobRadius.min, cfg.blobRadius.max),
            t: now,
            life: cfg.lifeMs,
          });
        }
      }
    }

    // Forget what has faded.
    while (this.milkPath.length > 0 && now - this.milkPath[0]!.t > cfg.lifeMs) this.milkPath.shift();
    for (let i = this.milkBlobs.length - 1; i >= 0; i--) {
      if (now - this.milkBlobs[i]!.t > this.milkBlobs[i]!.life) this.milkBlobs.splice(i, 1);
    }

    g.clear();
    if (this.milkPath.length === 0 && this.milkBlobs.length === 0) return;

    // Half-width of the ribbon at its age: it thins out to nothing.
    const halfW = (t: number): number => (cfg.width / 2) * Math.pow(Math.max(0, 1 - (now - t) / cfg.lifeMs), 0.6);

    // The ribbon is ONE strip of quads (no overlapping circles), so the see-through look stays even.
    const pts = this.milkPath;
    const n = pts.length;
    if (n >= 2) {
      const left: Array<[number, number, number, number]> = []; // inner edge x, y and outer edge x, y
      const right: Array<[number, number, number, number]> = [];
      for (let i = 0; i < n; i++) {
        const prev = pts[Math.max(0, i - 1)]!;
        const next = pts[Math.min(n - 1, i + 1)]!;
        const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
        const nx = -(next.y - prev.y) / len;
        const ny = (next.x - prev.x) / len;
        const hw = halfW(pts[i]!.t);
        const o = cfg.outline * Math.min(1, hw / 3); // the outline thins out with the ribbon
        const p = pts[i]!;
        left.push([p.x + nx * hw, p.y + ny * hw, p.x + nx * (hw + o), p.y + ny * (hw + o)]);
        right.push([p.x - nx * hw, p.y - ny * hw, p.x - nx * (hw + o), p.y - ny * (hw + o)]);
      }
      const quad = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): void => {
        g.fillTriangle(ax, ay, bx, by, cx, cy);
        g.fillTriangle(ax, ay, cx, cy, dx, dy);
      };
      for (let i = 0; i < n - 1; i++) {
        const l0 = left[i]!, l1 = left[i + 1]!, r0 = right[i]!, r1 = right[i + 1]!;
        g.fillStyle(cfg.color, cfg.alpha);
        quad(l0[0], l0[1], l1[0], l1[1], r1[0], r1[1], r0[0], r0[1]);
        g.fillStyle(cfg.edgeColor, cfg.alpha);
        quad(l0[0], l0[1], l1[0], l1[1], l1[2], l1[3], l0[2], l0[3]); // left outline
        quad(r0[0], r0[1], r1[0], r1[1], r1[2], r1[3], r0[2], r0[3]); // right outline
      }
    }

    // Splotches: the body, with the outline as a ring around it (so the two never overlap).
    for (const b of this.milkBlobs) {
      const r = b.r * Math.pow(Math.max(0, 1 - (now - b.t) / b.life), 0.5);
      if (r < 0.3) continue;
      g.fillStyle(cfg.color, cfg.alpha).fillCircle(b.x, b.y, r);
      g.lineStyle(cfg.outline, cfg.edgeColor, cfg.alpha).strokeCircle(b.x, b.y, r + cfg.outline / 2);
    }
  }

  /** While the energy drink lasts he leaves little green "Z z z" letters behind him. They float up, sway and fade. */
  private updateEnergyTrail(delta: number): void {
    const cfg = ENERGY_TRAIL;
    if (!cfg.enabled) return;
    if (!this.energyTrail || !this.alive) {
      this.zLast = null;
      return;
    }
    const last = this.zLast;
    if (!last) {
      this.zLast = { x: this.x, y: this.y };
      return;
    }
    if (Math.hypot(this.x - last.x, this.y - last.y) >= cfg.everyPx) {
      last.x = this.x;
      last.y = this.y;
      this.zTimer = 0;
      this.dropZ();
      return;
    }
    // Standing still: he keeps snoring.
    this.zTimer += delta;
    if (this.zTimer >= cfg.idleEveryMs) {
      this.zTimer = 0;
      this.dropZ();
    }
  }

  /** While the emo buff lasts (hood up, see `updateSmokeBreak`), little broken hearts drift up over his head. */
  private updateEmo(delta: number): void {
    if (!this.emo || !this.alive) {
      this.emoTimer = 0;
      return;
    }
    this.emoTimer += delta;
    if (this.emoTimer < EMO_FX.everyMs) return;
    this.emoTimer = 0;
    this.dropHeart();
  }

  /** Big Varu: grows / shrinks toward `sizeMultiplier`. The body, legs and belt follow `scaleX`; the hurtbox (physics circle and `hitRadius`) and the shadow are resized with it. */
  private easeSize(delta: number): void {
    if (this.sizeNow === this.sizeMultiplier) return;
    const gap = this.sizeMultiplier - this.sizeNow;
    this.sizeNow = Math.abs(gap) < 0.005 ? this.sizeMultiplier : this.sizeNow + gap * Math.min(1, (PLAYER.sizeEasePerSec * delta) / 1000);
    this.setScale(this.baseScale * this.sizeNow);
    setCircleHitbox(this, PLAYER.hitRadius * this.sizeNow);
    this.hitRadius = PLAYER.hitRadius * this.sizeNow;
    this.setShadowScale(this.sizeNow);
  }

  /** While the rusty belt lasts, rust flakes come off the strap (faster while he walks). */
  private updateRust(delta: number): void {
    const cfg = RUST_FX;
    if (!cfg.enabled || !this.rustyFlakes || !this.alive || !this.beltInHand) {
      this.rustTimer = 0;
      return;
    }
    const moving = this.body ? (this.body as Phaser.Physics.Arcade.Body).speed > 5 : false;
    this.rustTimer += delta;
    const every = moving ? cfg.everyMs : cfg.idleEveryMs;
    if (this.rustTimer < every) return;
    this.rustTimer -= every;
    for (let i = 0; i < cfg.perDrop; i++) this.dropRust();
  }

  /** A point on the held belt's strap, from its texture coordinates (128x128, centered), in the world. */
  private strapPoint(tx: number, ty: number, out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const k = this.scaleX;
    const a = this.rotation + this.beltTilt; // the held belt sprite turns with its own tilt
    const lx = (tx - 64) * k;
    const ly = (ty - 64) * k;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return out.set(this.x + lx * c - ly * s, this.y + lx * s + ly * c);
  }

  /** One flake: comes off a random point on the strap, pops in, falls, tumbles, drifts a little and fades. Tweens are scene-owned. */
  private dropRust(): void {
    const cfg = RUST_FX;
    const path = cfg.strapPath;
    const seg = Phaser.Math.Between(0, path.length - 2);
    const t = Math.random();
    const [ax, ay] = path[seg]!;
    const [bx, by] = path[seg + 1]!;
    const at = this.strapPoint(ax + (bx - ax) * t, ay + (by - ay) * t, new Phaser.Math.Vector2());
    const x = at.x + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const y = at.y + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const size = Phaser.Math.Between(cfg.sizePx.min, cfg.sizePx.max);
    const color = Phaser.Utils.Array.GetRandom([...cfg.colors]);
    const flake = this.scene.add
      .image(x, y, Tex.Chip)
      .setDisplaySize(size * cfg.popScale, size * cfg.popScale)
      .setTint(color)
      .setDepth(cfg.depth)
      .setAlpha(cfg.alpha)
      .setAngle(Phaser.Math.FloatBetween(0, 360));
    const life = Phaser.Math.Between(cfg.lifeMs.min, cfg.lifeMs.max);
    const drift = (Math.random() < 0.5 ? -1 : 1) * cfg.driftPx;
    const fall = Phaser.Math.Between(cfg.fallPx.min, cfg.fallPx.max);
    const spin = Phaser.Math.Between(cfg.spinDeg.min, cfg.spinDeg.max) * (Math.random() < 0.5 ? -1 : 1);
    this.scene.tweens.add({ targets: flake, displayWidth: size, displayHeight: size, duration: life * 0.15, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: flake, y: y + fall, duration: life, ease: 'Quad.easeIn' });
    this.scene.tweens.add({ targets: flake, x: x + drift, duration: life, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: flake, angle: flake.angle + spin, duration: life, ease: 'Linear' });
    this.scene.tweens.add({
      targets: flake,
      alpha: 0,
      duration: life,
      delay: life * 0.5,
      ease: 'Sine.easeIn',
      onComplete: () => flake.destroy(),
    });
  }

  /** One broken heart: pops up over his head, floats up, sways and fades. Tweens are scene-owned, so a restart cleans them up. */
  private dropHeart(): void {
    const cfg = EMO_FX;
    const x = this.x + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const y = this.y + cfg.offsetY * this.sizeNow + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const size = Phaser.Math.Between(cfg.sizePx.min, cfg.sizePx.max);
    const heart = this.scene.add.image(x, y, Tex.Heart).setDisplaySize(size, size).setDepth(cfg.depth).setAlpha(cfg.alpha).setAngle(Phaser.Math.FloatBetween(cfg.tiltDeg.min, cfg.tiltDeg.max));
    const full = heart.scaleX; // the scale that gives the displayed size
    heart.setScale(full * 0.4);
    const life = Phaser.Math.Between(cfg.lifeMs.min, cfg.lifeMs.max);
    const sway = (Math.random() < 0.5 ? -1 : 1) * cfg.swayPx;
    this.scene.tweens.add({ targets: heart, scale: full, duration: life * 0.2, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: heart, x: x + sway, duration: life, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({
      targets: heart,
      y: y - Phaser.Math.Between(cfg.riseY.min, cfg.riseY.max),
      alpha: 0,
      duration: life,
      ease: 'Sine.easeIn',
      onComplete: () => heart.destroy(),
    });
  }

  /** One letter of the trail: appears at his feet, floats up, sways and fades. Tweens are scene-owned, so a restart cleans them up. */
  private dropZ(cfg: ZLook = ENERGY_TRAIL, offsetY = 0): void {
    const step = cfg.cycle[this.zCount % cfg.cycle.length]!;
    this.zCount++;
    const x = this.x + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const y = this.y + offsetY + Phaser.Math.FloatBetween(-cfg.jitterPx, cfg.jitterPx);
    const letter = this.scene.add
      .text(x, y, step.letter, {
        fontFamily: FONT,
        fontSize: `${step.sizePx}px`,
        color: css(cfg.color),
        stroke: css(cfg.outline),
        strokeThickness: step.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(cfg.depth)
      .setAlpha(cfg.alpha)
      .setAngle(Phaser.Math.FloatBetween(cfg.tiltDeg.min, cfg.tiltDeg.max))
      .setScale(0.4);
    const life = Phaser.Math.Between(cfg.lifeMs.min, cfg.lifeMs.max);
    const sway = (Math.random() < 0.5 ? -1 : 1) * cfg.swayPx;
    this.scene.tweens.add({ targets: letter, scale: 1, duration: life * 0.2, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: letter, x: x + sway, duration: life, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({
      targets: letter,
      y: y - Phaser.Math.Between(cfg.riseY.min, cfg.riseY.max),
      alpha: 0,
      duration: life,
      ease: 'Sine.easeIn',
      onComplete: () => letter.destroy(),
    });
  }

  /** The belt in his fist: gold and dripping goo while the golden belt is active. */
  private updateHeldBelt(delta: number): void {
    const gold = GOLD_BELT.enabled && this.goldenBelt;
    if (gold !== this.beltIsGold) {
      this.beltIsGold = gold;
      this.heldBelt.setTexture(gold ? Tex.VaruBeltGold : Tex.VaruBelt);
    }
    if (!gold || !this.beltInHand || !this.alive) return;
    this.gooTimer += delta;
    if (this.gooTimer < GOLD_BELT.held.everyMs) return;
    this.gooTimer -= GOLD_BELT.held.everyMs;
    const drip = this.bodyPoint(GOLD_BELT.held.dripOffset, this.tipPoint);
    this.goo.emitParticleAt(drip.x, drip.y, 1);
  }

  /** Legs follow the body every frame (also during the death spin), swinging forward/back in turn. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    delta = gameClock.scaled(delta); // from here on `delta` is game time, so the slow-mo of the last cat slows Varu's animation too
    this.easeSize(delta);
    this.advanceBackflip(delta);
    // Hide / show the body first: the legs and the cigarette ember follow `this.visible` below. A back flip hides it too (a stand-in plays it).
    const hidden = this.hiddenInTornado || this.flipMs >= 0;
    if (this.visible === hidden) this.setVisible(!hidden);
    this.updateSmokeBreak(delta);
    this.updateIdleHabits(delta);
    this.updateHeldBelt(delta);
    this.updateMilkTrail(delta);
    this.updateEnergyTrail(delta);
    this.updateEmo(delta);
    this.updateRust(delta);
    this.puffSmoke(delta);
    const r = this.rotation;
    const k = this.scaleX;
    const fx = Math.sin(r);
    const fy = -Math.cos(r); // local "up" in world space
    const swing = this.legSwing * k;
    const place = (leg: Phaser.GameObjects.Image, off: number): void => {
      leg.setPosition(this.x + fx * off, this.y + fy * off).setRotation(r).setScale(k).setAlpha(this.alpha).setVisible(this.visible);
    };
    place(this.legL, swing);
    place(this.legR, -swing);
    this.heldBelt
      .setPosition(this.x, this.y).setRotation(r + this.beltTilt).setScale(k).setAlpha(this.alpha)
      .setVisible(this.visible && this.beltInHand);
    if (this.flipPose.on) this.applyBackflip();
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    for (const leg of [this.legL, this.legR, this.heldBelt]) leg.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      for (const leg of [this.legL, this.legR, this.heldBelt]) {
        if (!leg.active) continue;
        leg.clearTint();
        leg.setTintMode(Phaser.TintModes.MULTIPLY);
      }
    });
  }

  override destroy(fromScene?: boolean): void {
    this.legL.destroy();
    this.legR.destroy();
    this.heldBelt.destroy();
    this.flipBody.destroy();
    this.smoke.destroy();
    this.ember.destroy();
    this.goo.destroy();
    this.gooBurst.destroy();
    this.milkGfx.destroy();
    super.destroy(fromScene);
  }

  /** Returns true if the hit landed (false during i-frames). `source` says what hurt him (a cat type, a projectile kind...) for the bad luck system. */
  takeDamage(amount: number, fromX: number, fromY: number, source?: string): boolean {
    const now = gameClock.now;
    if (!this.alive || this.godMode || now < this.invincibleUntil) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.invincibleUntil = now + PLAYER.invincibleMs;
    this.applyKnockback(fromX, fromY, PLAYER.hurtKnockback);
    this.flash(0xff4444, 100);
    this.scene.tweens.add({ targets: this, alpha: 0.35, duration: 70, yoyo: true, repeat: 4, onComplete: () => this.setAlpha(1) });

    const hurt: PlayerHurtPayload = { x: this.x, y: this.y, source, amount };
    bus.emit(Events.PlayerHurt, hurt);
    this.emitHealth();
    if (!this.alive) {
      this.setVelocity(0, 0);
      bus.emit(Events.PlayerDied);
    }
    return true;
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.emitHealth();
  }

  /** Dev only (debug card): sets health to this share of the maximum (at least 1 HP, so it never kills). */
  debugSetHealth(share: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(this.maxHp * share)));
    this.emitHealth();
  }

  private emitHealth(): void {
    const payload: PlayerHealthPayload = { hp: this.hp, maxHp: this.maxHp };
    bus.emit(Events.PlayerHealth, payload);
  }
}
