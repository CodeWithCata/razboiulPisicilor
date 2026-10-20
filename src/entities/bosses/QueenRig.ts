/** @file Regina Pisicilor's moving parts (cape, feet, crown, scepter arm, glow, sparkles, dizzy stars) that follow her body and are posed by her attacks. */
import Phaser from 'phaser';
import { QUEEN_CROWN_BASE, QUEEN_GEMS, QUEEN_SHOULDER } from '../../assets/art/queen';
import { Tex, type TexKey } from '../../assets/keys';
import { QUEEN_RIG as RIG } from '../../config/animation';

/** Texture size and center of every Queen layer (they are all drawn on the same 128x128 canvas). */
const TEX = 128;
const HALF = TEX / 2;
const IDLE_SPEED = 12; // px/s: below this she counts as standing still
const toRad = Phaser.Math.DegToRad;

/** The pose of the loose parts. Attacks move these numbers (`QueenRig.to`), `sync` draws them. */
export interface QueenPose {
  /** Turn of the scepter arm around her shoulder, in degrees: 0 = held up, positive = swung out to her right. */
  scepterDeg: number;
  /** Size of the scepter arm around her shoulder (1 = normal, bigger = longer reach). */
  scepterScale: number;
  /** How far the crown is lifted off her head (px, negative = pressed down). */
  crownLift: number;
  crownTiltDeg: number;
  /** Golden glow on the jewels, 0 to 1. */
  glow: number;
  /** Cape stretched out behind her, 0 to 1. */
  capeFlare: number;
  /** Extra body squash, read by `QueenCat.poseSquash`: positive = crouch, negative = stretch. */
  squash: number;
}

const NEUTRAL: QueenPose = { scepterDeg: 0, scepterScale: 1, crownLift: 0, crownTiltDeg: 0, glow: 0, capeFlare: 0, squash: 0 };

export type QueenEase = 'out' | 'in' | 'inOut';
const EASES: Record<QueenEase, (t: number) => number> = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

interface Move {
  key: keyof QueenPose;
  from: number;
  to: number;
  ms: number;
  t: number;
  ease: QueenEase;
  delay: number;
  started: boolean;
}

export class QueenRig {
  readonly pose: QueenPose = { ...NEUTRAL };

  private readonly moves: Move[] = [];
  private readonly cape: Phaser.GameObjects.Image;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly crown: Phaser.GameObjects.Image;
  private readonly scepter: Phaser.GameObjects.Image;
  private readonly parts: Phaser.GameObjects.Image[];
  private readonly glowCrown: Phaser.GameObjects.Arc;
  private readonly glowScepter: Phaser.GameObjects.Arc;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly tmp = { x: 0, y: 0 };

  private clock = 0;
  private phase = 0;
  private moveAmt = 0;
  private fury = false;
  private ringOn = false;
  private dust = false;
  private dustIn = 0;
  private sparkleIn: number = RIG.sparkle.everyMs.min;
  private sparkleOnCrown = true;
  private dizzyMs = 0;
  private dizzyStars: Phaser.GameObjects.Image[] = [];
  private glowColor: number | null = null;
  private scepterDeg = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    const make = (key: TexKey, depth: number): Phaser.GameObjects.Image => scene.add.image(owner.x, owner.y, key).setDepth(depth);
    this.cape = make(Tex.BossQueenCape, RIG.depth.cape);
    this.footL = make(Tex.BossQueenFootL, RIG.depth.foot);
    this.footR = make(Tex.BossQueenFootR, RIG.depth.foot);
    this.crown = make(Tex.BossQueenCrown, RIG.depth.crown).setOrigin(QUEEN_CROWN_BASE.x / TEX, QUEEN_CROWN_BASE.y / TEX);
    this.scepter = make(Tex.BossQueenScepter, RIG.depth.scepter).setOrigin(QUEEN_SHOULDER.x / TEX, QUEEN_SHOULDER.y / TEX);
    this.parts = [this.cape, this.footL, this.footR, this.crown, this.scepter];

    const glow = (): Phaser.GameObjects.Arc => scene.add.circle(owner.x, owner.y, RIG.glow.sizePx / 2, RIG.glow.gold, 0).setDepth(RIG.depth.glow);
    this.glowCrown = glow();
    this.glowScepter = glow();
    this.aura = scene.add.circle(owner.x, owner.y, RIG.aura.sizePx / 2, RIG.aura.color, 0).setDepth(RIG.depth.aura).setVisible(false);
    this.ring = scene.add
      .circle(owner.x, owner.y, 10, RIG.ring.color, RIG.ring.alpha)
      .setStrokeStyle(3, RIG.ring.color, RIG.ring.strokeAlpha)
      .setDepth(RIG.depth.aura + 1)
      .setVisible(false);
  }

  // ---- posing ---------------------------------------------------------------

  /** Ease some pose numbers to new values over `ms`, after an optional delay. A newer move on the same number replaces the older one. */
  to(target: Partial<QueenPose>, ms: number, ease: QueenEase = 'out', delayMs = 0): void {
    for (const key of Object.keys(target) as Array<keyof QueenPose>) {
      const to = target[key];
      if (to === undefined) continue;
      const move: Move = { key, from: this.pose[key], to, ms, t: 0, ease, delay: delayMs, started: false };
      if (delayMs <= 0) this.start(move);
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

  /** Back to the relaxed pose; also stops the dust, the ring and the dizziness. */
  reset(ms = 300): void {
    this.to(NEUTRAL, ms, 'out');
    this.setDust(false);
    this.setRing(false);
    this.setAlarm(false);
    this.clearDizzy();
  }

  setFury(on: boolean): void {
    this.fury = on;
    this.aura.setVisible(on);
  }

  /** Dust puffs behind her (the charge and the spin). */
  setDust(on: boolean): void {
    this.dust = on;
  }

  /** A faint ring on the floor showing how far a spin reaches. */
  setRing(on: boolean, radius = 0): void {
    this.ringOn = on;
    if (on) this.ring.setRadius(radius);
    this.ring.setVisible(on);
  }

  /** Red jewel glow instead of golden (the charge wind-up). Off = golden, or red while she is furious. */
  setAlarm(on: boolean): void {
    this.glowColor = on ? RIG.glow.red : null;
  }

  /** She is dizzy for `ms`: crown wobbling, scepter drooping, stars circling her head. */
  setDizzy(ms: number): void {
    this.clearDizzy();
    this.dizzyMs = ms;
    for (let i = 0; i < RIG.dizzy.stars; i++) {
      this.dizzyStars.push(this.scene.add.image(this.owner.x, this.owner.y, Tex.Star).setDisplaySize(22, 22).setDepth(60));
    }
    this.to({ scepterDeg: RIG.dizzy.scepterDroopDeg, scepterScale: 1, glow: 0 }, 300, 'out');
  }

  private clearDizzy(): void {
    this.dizzyMs = 0;
    this.dizzyStars.forEach((s) => s.destroy());
    this.dizzyStars = [];
  }

  // ---- one-shot effects -----------------------------------------------------

  /** A ring that races out of her and fades: the decree, the end of a spin. */
  pulse(radius: number, color: number = RIG.ring.color): void {
    const ring = this.scene.add.circle(this.owner.x, this.owner.y, 12, color, 0.18).setStrokeStyle(6, color, 1).setDepth(44);
    this.scene.tweens.add({
      targets: ring, scale: radius / 12, alpha: 0, duration: RIG.burst.lifeMs, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** Stars flying out of her crown. */
  burst(count: number = RIG.burst.count): void {
    const from = this.crownGem(this.tmp);
    const x = from.x;
    const y = from.y;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const reach = RIG.burst.reachPx * (0.6 + Math.random() * 0.6);
      const star = this.scene.add.image(x, y, Tex.Star).setDisplaySize(18, 18).setDepth(60);
      this.scene.tweens.add({
        targets: star, x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach, angle: 220, alpha: 0,
        duration: RIG.burst.lifeMs, ease: 'Cubic.easeOut', onComplete: () => star.destroy(),
      });
    }
  }

  /** Flash every loose part like the body (Actor.flash only tints the body). */
  flash(color: number, ms: number): void {
    if (this.destroyed) return;
    for (const part of this.parts) part.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (this.destroyed) return;
      for (const part of this.parts) {
        part.clearTint();
        part.setTintMode(Phaser.TintModes.MULTIPLY);
      }
    });
  }

  // ---- per-frame drawing ----------------------------------------------------

  /** A point on her body texture (relative to its center) in world space: follows her turn and size. */
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

  private crownGem(out: { x: number; y: number }): { x: number; y: number } {
    return this.world(QUEEN_GEMS.crown.x - HALF, QUEEN_GEMS.crown.y - HALF - this.pose.crownLift, out);
  }

  private scepterGem(out: { x: number; y: number }): { x: number; y: number } {
    const k = this.pose.scepterScale;
    const a = toRad(this.scepterDeg);
    const vx = (QUEEN_GEMS.scepter.x - QUEEN_SHOULDER.x) * k;
    const vy = (QUEEN_GEMS.scepter.y - QUEEN_SHOULDER.y) * k;
    return this.world(QUEEN_SHOULDER.x - HALF + vx * Math.cos(a) - vy * Math.sin(a), QUEEN_SHOULDER.y - HALF + vx * Math.sin(a) + vy * Math.cos(a), out);
  }

  /** Call every frame after she has moved (from `preUpdate`). `delta` is in ms. */
  sync(delta: number): void {
    const o = this.owner;
    if (this.destroyed || !o.active || !o.body) return;
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.advanceMoves(dt);

    const body = o.body as Phaser.Physics.Arcade.Body;
    const moving = body.speed >= IDLE_SPEED;
    this.moveAmt += ((moving ? 1 : 0) - this.moveAmt) * Math.min(1, (10 * dt) / 1000);
    if (moving) this.phase += (body.speed * dt) / 1000 * RIG.feet.radPerPx;
    const step = Math.sin(this.phase) * this.moveAmt;
    const dizzy = this.dizzyMs > 0;

    const r = o.rotation;
    const sx = o.scaleX;
    const sy = o.scaleY;
    const place = (img: Phaser.GameObjects.Image, x: number, y: number, rot: number, scx: number, scy: number): void => {
      img.setPosition(x, y).setRotation(rot).setScale(scx, scy).setAlpha(o.alpha).setVisible(o.visible);
    };

    // Feet step forward and back in turn, like Varu's legs.
    const swing = step * RIG.feet.swing;
    const foot = this.world(0, swing, this.tmp);
    place(this.footL, foot.x, foot.y, r, sx, sy);
    const foot2 = this.world(0, -swing, this.tmp);
    place(this.footR, foot2.x, foot2.y, r, sx, sy);

    // The cape lags behind her movement and sways with her steps; `capeFlare` stretches it out.
    let lagX = -body.velocity.x * RIG.cape.lagPerSpeed;
    let lagY = -body.velocity.y * RIG.cape.lagPerSpeed;
    const lag = Math.hypot(lagX, lagY);
    if (lag > RIG.cape.maxLagPx) {
      lagX = (lagX / lag) * RIG.cape.maxLagPx;
      lagY = (lagY / lag) * RIG.cape.maxLagPx;
    }
    const flare = this.pose.capeFlare;
    place(this.cape, o.x + lagX, o.y + lagY, r - toRad(step * RIG.cape.swayDeg), sx * (1 + flare * RIG.cape.flareX), sy * (1 + flare * RIG.cape.flareY));

    // Crown: hops with her steps, tilts with them, wobbles when dizzy.
    const lift = this.pose.crownLift + Math.abs(step) * RIG.crown.bobPx;
    let tilt = this.pose.crownTiltDeg + step * RIG.crown.tiltDeg + Math.sin(this.clock * RIG.crown.idleRate) * RIG.crown.idleTiltDeg;
    if (dizzy) tilt += Math.sin(this.clock * RIG.dizzy.crownRate) * RIG.dizzy.crownTiltDeg;
    const base = this.world(QUEEN_CROWN_BASE.x - HALF, QUEEN_CROWN_BASE.y - HALF - lift, this.tmp);
    place(this.crown, base.x, base.y, r + toRad(tilt), sx, sy);

    // Scepter arm: turns around her shoulder, with a slow idle sway.
    this.scepterDeg = this.pose.scepterDeg + Math.sin(this.clock * RIG.scepter.idleRate) * RIG.scepter.idleDeg + step * RIG.scepter.walkDeg;
    const shoulder = this.world(QUEEN_SHOULDER.x - HALF, QUEEN_SHOULDER.y - HALF, this.tmp);
    place(this.scepter, shoulder.x, shoulder.y, r + toRad(this.scepterDeg), sx * this.pose.scepterScale, sy * this.pose.scepterScale);

    this.updateGlow(o);
    this.updateAura(o);
    if (this.ringOn) this.ring.setPosition(o.x, o.y).setVisible(o.visible);
    if (this.dust) this.updateDust(dt);
    this.updateSparkles(dt);
    if (dizzy) this.updateDizzy(dt, o);
  }

  private updateGlow(o: Phaser.Physics.Arcade.Sprite): void {
    const level = Math.max(this.pose.glow, this.fury ? RIG.glow.furyMin : 0);
    const color = this.glowColor ?? (this.fury ? RIG.glow.red : RIG.glow.gold);
    const alpha = level * RIG.glow.maxAlpha * (0.8 + 0.2 * Math.sin(this.clock * RIG.glow.pulseRate));
    const visible = o.visible && level > 0.01;
    const gem = this.crownGem(this.tmp);
    this.glowCrown.setPosition(gem.x, gem.y).setFillStyle(color, alpha).setVisible(visible);
    const gem2 = this.scepterGem(this.tmp);
    this.glowScepter.setPosition(gem2.x, gem2.y).setFillStyle(color, alpha).setVisible(visible);
  }

  private updateAura(o: Phaser.Physics.Arcade.Sprite): void {
    if (!this.fury) return;
    const alpha = RIG.aura.alpha + Math.sin(this.clock * RIG.aura.pulseRate) * RIG.aura.pulseAlpha;
    this.aura.setPosition(o.x, o.y).setFillStyle(RIG.aura.color, alpha).setVisible(o.visible);
  }

  private updateDust(dt: number): void {
    this.dustIn -= dt;
    if (this.dustIn > 0) return;
    this.dustIn = RIG.dust.everyMs;
    const at = this.world((Math.random() - 0.5) * 30, RIG.dust.behindPx, this.tmp);
    const puff = this.scene.add.circle(at.x, at.y, 10, RIG.dust.color, RIG.dust.alpha).setDepth(8).setScale(RIG.dust.startScale);
    this.scene.tweens.add({
      targets: puff, scale: RIG.dust.endScale, alpha: 0, duration: RIG.dust.lifeMs, ease: 'Cubic.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  /** A twinkle on the crown or the scepter jewel every now and then. */
  private updateSparkles(dt: number): void {
    this.sparkleIn -= dt;
    if (this.sparkleIn > 0 || !this.owner.visible) return;
    const { min, max } = RIG.sparkle.everyMs;
    this.sparkleIn = min + Math.random() * (max - min);
    const at = this.sparkleOnCrown ? this.crownGem(this.tmp) : this.scepterGem(this.tmp);
    this.sparkleOnCrown = !this.sparkleOnCrown;
    const star = this.scene.add.image(at.x, at.y, Tex.Star).setDisplaySize(RIG.sparkle.sizePx, RIG.sparkle.sizePx).setDepth(60).setScale(0.2);
    this.scene.tweens.add({
      targets: star, scale: 1, angle: 90, alpha: 0, duration: RIG.sparkle.lifeMs, ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }

  private updateDizzy(dt: number, o: Phaser.Physics.Arcade.Sprite): void {
    this.dizzyMs -= dt;
    if (this.dizzyMs <= 0) {
      this.clearDizzy();
      this.to({ scepterDeg: 0, crownTiltDeg: 0 }, 350, 'out');
      return;
    }
    this.dizzyStars.forEach((star, i) => {
      const a = this.clock * RIG.dizzy.rate + (i * Math.PI * 2) / this.dizzyStars.length;
      star
        .setPosition(o.x + Math.cos(a) * RIG.dizzy.orbitPx, o.y - RIG.dizzy.headPx + Math.sin(a) * (RIG.dizzy.orbitPx * 0.25))
        .setAngle(this.clock / 4);
    });
  }

  // ---- cleanup ----------------------------------------------------------------

  /** Remove every part. `popCrown`: she was beaten, so the crown flies off and fades instead of vanishing with her. */
  destroy(popCrown = false): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearDizzy();
    if (popCrown && this.crown.active) {
      const crown = this.crown;
      crown.setDepth(50).clearTint();
      this.scene.tweens.add({
        targets: crown, y: crown.y - RIG.death.crownRisePx, angle: crown.angle + RIG.death.crownSpinDeg, alpha: 0,
        duration: RIG.death.lifeMs, ease: 'Cubic.easeOut', onComplete: () => crown.destroy(),
      });
    } else {
      this.crown.destroy();
    }
    for (const part of [this.cape, this.footL, this.footR, this.scepter]) part.destroy();
    this.glowCrown.destroy();
    this.glowScepter.destroy();
    this.aura.destroy();
    this.ring.destroy();
  }
}
