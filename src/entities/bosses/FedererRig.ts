/** @file Pisica Federer's moving parts (racket arm + wrist, tail, hopping feet, dribbled / tossed ball, racket swoosh, phase 2 aura) that follow her body and are posed by her attacks. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { FEDERER_BALL_HAND, FEDERER_PAW, FEDERER_RACKET_HEAD, FEDERER_SHOULDER, FEDERER_TAIL_ROOT } from '../../assets/art/federer';
import { Tex, type TexKey } from '../../assets/keys';
import { FEDERER_RIG as RIG } from '../../config/animation';
import { COLORS } from '../../config/style';
import type { BossLook } from './BossViews';
import { hyp } from '../../core/hyp';
import { snapshotInto } from '../../core/snapshot';

/** Texture size and center of every Federer layer (they are all drawn on the same 128x128 canvas). */
const TEX = 128;
const HALF = TEX / 2;
const IDLE_SPEED = 12; // px/s: below this she counts as standing still
const toRad = Phaser.Math.DegToRad;

/** The pose of the loose parts. Attacks move these numbers (`FedererRig.to`), `sync` draws them. */
export interface FedererPose {
  /** Turn of the racket arm around her shoulder, in degrees: 0 = held up, positive = swung out to her right and back, negative = swung across the front. */
  armDeg: number;
  /** Extra turn of the racket around her paw (the wrist), same direction. */
  wristDeg: number;
  /** Extra body squash, read by `PisicaFederer.poseSquash`: positive = crouch, negative = stretch. */
  squash: number;
  /** Extra body lean in degrees, read by `PisicaFederer.poseTiltDeg`. */
  tiltDeg: number;
  /** How high the ball is tossed above her left paw (game px). It also looks bigger the higher it is. */
  ballLift: number;
  /** 0 = no ball (hit, dropped), 1 = in her paw. Easing it up looks like she pulls out a fresh one. */
  ballShow: number;
  /** Tail stretched out behind her, -1 to 1 (negative = limp). */
  tailStretch: number;
  tailDeg: number;
}

const NEUTRAL: FedererPose = { armDeg: 0, wristDeg: 0, squash: 0, tiltDeg: 0, ballLift: 0, ballShow: 1, tailStretch: 0, tailDeg: 0 };

export type FedererEase = 'out' | 'in' | 'inOut';
const EASES: Record<FedererEase, (t: number) => number> = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

interface Move {
  key: keyof FedererPose;
  from: number;
  to: number;
  ms: number;
  t: number;
  ease: FedererEase;
  delay: number;
  started: boolean;
}

/** Puts one loose-layer picture: position, angle, scale, alpha and visibility. A plain function (no closure is made per frame). */
function placeLayer(img: Phaser.GameObjects.Image, x: number, y: number, rot: number, scx: number, scy: number, alpha: number, visible: boolean): void {
  img.setPosition(x, y).setRotation(rot).setScale(scx, scy).setAlpha(alpha).setVisible(visible);
}

export class FedererRig {
  readonly pose: FedererPose = { ...NEUTRAL };

  private readonly moves: Move[] = [];
  /** Reused copy of `moves` for `advanceMoves` (see `snapshotInto`). */
  private readonly moveScratch: Move[] = [];
  private readonly tail: Phaser.GameObjects.Image;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly racket: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Image;
  private readonly ball: Phaser.GameObjects.Image;
  private readonly parts: Phaser.GameObjects.Image[];
  private readonly aura: Phaser.GameObjects.Arc;
  /** The towel of her towel break (v147), hung over her shoulders. */
  private readonly towel: Phaser.GameObjects.Rectangle;
  private readonly tmp = { x: 0, y: 0 };
  private readonly head = { x: 0, y: 0 };
  private readonly prevHead = { x: 0, y: 0 };

  private clock = Math.random() * 1000;
  private phase = 0;
  private moveAmt = 0;
  private fury = false;
  private rage = false;
  private towelOn = false;
  private flick = 0;
  private kick = 0;
  private twirlMs = 0;
  private trailIn = 0;
  private trailAlive = 0;
  private haveHead = false;
  private destroyed = false;
  /** Which drawing of her is showing: back = the one the loose layers are drawn for (the others have everything baked in). */
  private look: BossLook = 'back';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    const make = (key: TexKey, depth: number): Phaser.GameObjects.Image => scene.add.image(owner.x, owner.y, ...texArgs(key)).setDepth(depth);
    this.tail = make(Tex.BossFedererTail, RIG.depth.tail).setOrigin(FEDERER_TAIL_ROOT.x / TEX, FEDERER_TAIL_ROOT.y / TEX);
    this.footL = make(Tex.BossFedererFootL, RIG.depth.foot);
    this.footR = make(Tex.BossFedererFootR, RIG.depth.foot);
    this.racket = make(Tex.BossFedererRacket, RIG.depth.racket).setOrigin(FEDERER_PAW.x / TEX, FEDERER_PAW.y / TEX);
    this.arm = make(Tex.BossFedererArm, RIG.depth.arm).setOrigin(FEDERER_SHOULDER.x / TEX, FEDERER_SHOULDER.y / TEX);
    this.ball = make(Tex.Tennis, RIG.depth.ball);
    this.parts = [this.tail, this.footL, this.footR, this.racket, this.arm, this.ball];
    this.aura = scene.add.circle(owner.x, owner.y, RIG.aura.sizePx / 2, RIG.aura.color, 0).setDepth(RIG.depth.aura).setVisible(false);
    this.towel = scene.add.rectangle(owner.x, owner.y, RIG.towel.widthPx, RIG.towel.heightPx, 0xffffff).setStrokeStyle(3, COLORS.navy).setDepth(RIG.depth.arm + 0.5).setVisible(false);
  }

  // ---- what the body reads ----------------------------------------------------

  /** Crouch / stretch on top of the walk cycle: the pose plus the little recoil of every swat. */
  get squash(): number {
    return this.pose.squash + this.kick * RIG.swat.squashKick;
  }

  get tiltDeg(): number {
    return this.pose.tiltDeg;
  }

  /** The middle of the racket strings in the world (from the last frame): balls leave from here. */
  racketHead(): { x: number; y: number } {
    return { x: this.head.x, y: this.head.y };
  }

  // ---- posing -------------------------------------------------------------------

  /** Ease some pose numbers to new values over `ms`, after an optional delay. A newer move on the same number replaces the older one. */
  to(target: Partial<FedererPose>, ms: number, ease: FedererEase = 'out', delayMs = 0): void {
    for (const key of Object.keys(target) as Array<keyof FedererPose>) {
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
    const list = snapshotInto(this.moves, this.moveScratch);
    for (let i = 0; i < list.length; i++) {
      const m = list[i]!;
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
    this.moveScratch.length = 0;
  }

  /** Jump a pose number to a value at once and forget every move on it (a hit ball is gone the same instant). */
  private snap(key: keyof FedererPose, value: number): void {
    for (let i = this.moves.length - 1; i >= 0; i--) if (this.moves[i]!.key === key) this.moves.splice(i, 1);
    this.pose[key] = value;
  }

  setFury(on: boolean): void {
    this.fury = on;
    this.aura.setVisible(on);
  }

  /** Tie-break rage: the loose parts turn red (and the aura, see `sync`). `PisicaFederer` tints her body the same way. */
  setRage(on: boolean): void {
    this.rage = on;
    if (on) this.aura.setVisible(true);
    this.tintRage();
  }

  /** The towel of the towel break: on her shoulders, or gone. */
  setTowel(on: boolean): void {
    this.towelOn = on;
    if (!on) this.towel.setVisible(false);
  }

  /** Red multiply tint on the loose parts that belong to her (not the ball: a red ball would look like a fireball). */
  private tintRage(): void {
    if (this.destroyed || !this.rage) return;
    for (const part of [this.tail, this.footL, this.footR, this.racket, this.arm]) part.setTint(RIG.rage.tint).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** She smashes the racket: a copy of it flies off spinning and fades (the one in her paw is the spare), with a big pop at the strings. */
  breakRacket(): void {
    if (this.destroyed) return;
    const B = RIG.broken;
    const at = this.head;
    const broken = this.scene.add.image(at.x, at.y, ...texArgs(Tex.BossFedererRacket)).setDepth(50).setRotation(this.racket.rotation).setScale(this.racket.scaleX, this.racket.scaleY);
    const a = Math.random() * Math.PI * 2;
    this.scene.tweens.add({
      targets: broken, x: at.x + Math.cos(a) * B.flyPx, y: at.y + Math.sin(a) * B.flyPx - 40, angle: broken.angle + B.spinDeg, alpha: 0,
      duration: B.ms, ease: 'Cubic.easeOut', onComplete: () => broken.destroy(),
    });
    this.pop();
    this.pop();
  }

  /** The racket spins a full turn around her wrist (the phase 2 roar). */
  twirl(): void {
    this.twirlMs = RIG.twirl.ms;
  }

  // ---- one-shot moves -----------------------------------------------------------

  /** A quick racket flick with a little recoil that settles by itself. `hitsBall`: the ball in her paw is hit away and a new one pops in (every ball of a volley). */
  swat(hitsBall = true): void {
    this.flick = 1;
    this.kick = 1;
    if (hitsBall) this.refill(RIG.ball.popMs * 0.5, 120);
  }

  /** The racket met the ball (the serve, the ball rain): it is gone from her paw, and a ring and a few stars pop at the strings. */
  hitBall(): void {
    this.snap('ballShow', 0);
    this.snap('ballLift', 0);
    this.flick = 1;
    this.kick = 1;
    this.pop();
  }

  /** A fresh ball appears in her paw: it grows in over `ms`, after `delayMs`. */
  refill(ms: number = RIG.ball.popMs, delayMs = 0): void {
    this.snap('ballShow', 0);
    this.to({ ballShow: 1, ballLift: 0 }, ms, 'out', delayMs);
  }

  /** The ball falls out of her paw and bounces away (she is stunned). */
  dropBall(): void {
    if (this.pose.ballShow < 0.3) return;
    const at = this.ballPoint(this.tmp);
    const loose = this.scene.add.image(at.x, at.y, ...texArgs(Tex.Tennis)).setDepth(RIG.depth.ball).setDisplaySize(RIG.ball.sizePx, RIG.ball.sizePx);
    const sideways = (Math.random() < 0.5 ? -1 : 1) * (24 + Math.random() * 20);
    this.scene.tweens.add({ targets: loose, x: loose.x + sideways, angle: sideways * 12, duration: RIG.drop.lifeMs, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: loose, y: loose.y - RIG.drop.hopPx, duration: RIG.drop.ms, ease: 'Quad.easeOut', yoyo: true, repeat: 1 });
    this.scene.tweens.add({ targets: loose, alpha: 0, delay: RIG.drop.lifeMs * 0.7, duration: RIG.drop.lifeMs * 0.3, onComplete: () => loose.destroy() });
    this.snap('ballShow', 0);
    this.snap('ballLift', 0);
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
      this.tintRage(); // the flash undid the red
    });
  }

  /** The pop where the racket meets the ball: a ring and a few stars at the strings. */
  pop(): void {
    const H = RIG.hit;
    const { x, y } = this.head;
    const ring = this.scene.add.circle(x, y, 8, H.color, 0.22).setStrokeStyle(4, H.color, 1).setDepth(44);
    this.scene.tweens.add({
      targets: ring, scale: H.ringPx / 8, alpha: 0, duration: H.ringMs, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    for (let i = 0; i < H.stars; i++) {
      const a = (i / H.stars) * Math.PI * 2 + Math.random() * 0.5;
      const reach = H.starReachPx * (0.6 + Math.random() * 0.6);
      const star = this.scene.add.image(x, y, ...texArgs(Tex.Star)).setDisplaySize(14, 14).setDepth(60);
      this.scene.tweens.add({
        targets: star, x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach, angle: 200, alpha: 0,
        duration: H.starMs, ease: 'Cubic.easeOut', onComplete: () => star.destroy(),
      });
    }
  }

  // ---- per-frame drawing --------------------------------------------------------

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

  /** Where the ball sits now: above her left paw, lifted and dribbling. */
  private ballPoint(out: { x: number; y: number }): { x: number; y: number } {
    const dribble = this.pose.ballLift < 1 ? Math.abs(Math.sin(this.clock * RIG.ball.dribbleRate)) * RIG.ball.dribblePx * (1 - this.moveAmt * 0.5) : 0;
    this.world(FEDERER_BALL_HAND.x - HALF, FEDERER_BALL_HAND.y - HALF, out);
    out.y -= this.pose.ballLift + dribble;
    return out;
  }

  /** She turned to show her front or her side: the loose layers hide (the drawing has the arm, racket, tail and feet), the trail stops. */
  setLook(look: BossLook): void {
    this.look = look;
  }

  /** Call every frame after she has moved (from `preUpdate`). `delta` is in ms. */
  sync(delta: number): void {
    const o = this.owner;
    if (this.destroyed || !o.active || !o.body) return;
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.advanceMoves(dt);
    const fade = Math.pow(RIG.swat.fadePerSec, dt / 1000);
    this.flick = this.flick < 0.002 ? 0 : this.flick * fade;
    this.kick = this.kick < 0.002 ? 0 : this.kick * fade;

    const body = o.body as Phaser.Physics.Arcade.Body;
    const moving = body.speed >= IDLE_SPEED;
    this.moveAmt += ((moving ? 1 : 0) - this.moveAmt) * Math.min(1, (10 * dt) / 1000);
    if (moving) this.phase += (body.speed * dt) / 1000 * RIG.feet.radPerPx;
    const step = Math.sin(this.phase) * this.moveAmt;

    const r = o.rotation;
    const sx = o.scaleX;
    const sy = o.scaleY;

    // Feet step forward and back in turn while she walks, and hop on their toes (a tennis ready stance) while she waits.
    const hopRate = this.fury ? RIG.feet.hopRatePhase2 : RIG.feet.hopRate;
    const hop = Math.sin(this.clock * hopRate) * RIG.feet.hopPx * (1 - this.moveAmt);
    const swing = step * RIG.feet.swing;
    const foot = this.world(0, swing + hop, this.tmp);
    placeLayer(this.footL, foot.x, foot.y, r, sx, sy, o.alpha, o.visible);
    const foot2 = this.world(0, -swing - hop, this.tmp);
    placeLayer(this.footR, foot2.x, foot2.y, r, sx, sy, o.alpha, o.visible);

    // Tail: slow wag, swings with her steps, streams out behind her in a dash.
    const wag = Math.sin(this.clock * RIG.tail.idleRate) * RIG.tail.idleDeg * (1 - 0.5 * this.moveAmt);
    const tailDeg = this.pose.tailDeg + wag + step * RIG.tail.walkDeg;
    const root = this.world(FEDERER_TAIL_ROOT.x - HALF, FEDERER_TAIL_ROOT.y - HALF, this.tmp);
    placeLayer(this.tail, root.x, root.y, r + toRad(tailDeg), sx, sy * (1 + this.pose.tailStretch * RIG.tail.stretchY), o.alpha, o.visible);

    // Racket arm: turns around her shoulder; the racket turns on its own around her paw (the wrist).
    this.twirlMs = Math.max(0, this.twirlMs - dt);
    const spin = this.twirlMs > 0 ? EASES.inOut(1 - this.twirlMs / RIG.twirl.ms) * 360 : 0;
    const armDeg = this.pose.armDeg + this.flick * RIG.swat.armDeg + Math.sin(this.clock * RIG.arm.idleRate) * RIG.arm.idleDeg + step * RIG.arm.walkDeg;
    const wristDeg = this.pose.wristDeg + this.flick * RIG.swat.wristDeg + Math.sin(this.clock * RIG.arm.wristIdleRate) * RIG.arm.wristIdleDeg + spin;
    const shoulder = this.world(FEDERER_SHOULDER.x - HALF, FEDERER_SHOULDER.y - HALF, this.tmp);
    placeLayer(this.arm, shoulder.x, shoulder.y, r + toRad(armDeg), sx, sy, o.alpha, o.visible);

    // The paw and the racket head, worked out on the texture (turned around the shoulder, then around the paw), then moved into the world.
    const a = toRad(armDeg);
    const w = toRad(armDeg + wristDeg);
    const pawVx = FEDERER_PAW.x - FEDERER_SHOULDER.x;
    const pawVy = FEDERER_PAW.y - FEDERER_SHOULDER.y;
    const pawX = FEDERER_SHOULDER.x - HALF + pawVx * Math.cos(a) - pawVy * Math.sin(a);
    const pawY = FEDERER_SHOULDER.y - HALF + pawVx * Math.sin(a) + pawVy * Math.cos(a);
    const paw = this.world(pawX, pawY, this.tmp);
    placeLayer(this.racket, paw.x, paw.y, r + w, sx, sy, o.alpha, o.visible);
    const headVx = FEDERER_RACKET_HEAD.x - FEDERER_PAW.x;
    const headVy = FEDERER_RACKET_HEAD.y - FEDERER_PAW.y;
    this.world(pawX + headVx * Math.cos(w) - headVy * Math.sin(w), pawY + headVx * Math.sin(w) + headVy * Math.cos(w), this.head);
    if (this.look === 'back') this.updateTrail(dt);
    else this.haveHead = false;

    // The ball: dribbled in her paw, higher and bigger while it is tossed, spinning when it is up.
    const show = this.pose.ballShow;
    const at = this.ballPoint(this.tmp);
    const size = RIG.ball.sizePx * (1 + this.pose.ballLift * RIG.ball.growPerPx) * Math.max(0, show);
    this.ball
      .setPosition(at.x, at.y)
      .setDisplaySize(Math.max(size, 0.01), Math.max(size, 0.01))
      .setAngle(this.pose.ballLift > 1 ? this.clock * RIG.ball.spinPerMs : 0)
      .setAlpha(o.alpha * Math.min(1, show * 3))
      .setVisible(o.visible && show > 0.02);

    if (this.look !== 'back') for (const part of this.parts) part.setVisible(false);

    if (this.fury || this.rage) {
      const base = this.rage ? RIG.rage.auraAlpha : RIG.aura.alpha;
      const alpha = base + Math.sin(this.clock * RIG.aura.pulseRate) * RIG.aura.pulseAlpha;
      this.aura.setPosition(o.x, o.y).setFillStyle(this.rage ? RIG.rage.auraColor : RIG.aura.color, alpha).setVisible(o.visible);
    }
    if (this.towelOn) {
      const spot = this.world(0, RIG.towel.offsetY, this.tmp);
      this.towel.setPosition(spot.x, spot.y).setRotation(r).setScale(sx, sy).setVisible(o.visible);
    }
  }

  /** Short fading puffs behind the racket head while it moves fast: the swoosh. */
  private updateTrail(dt: number): void {
    const T = RIG.trail;
    const speed = this.haveHead ? (hyp(this.head.x - this.prevHead.x, this.head.y - this.prevHead.y) / Math.max(dt, 1)) * 1000 : 0;
    this.prevHead.x = this.head.x;
    this.prevHead.y = this.head.y;
    this.haveHead = true;
    this.trailIn -= dt;
    if (speed < T.minSpeed || this.trailIn > 0 || this.trailAlive >= T.maxAlive || !this.owner.visible) return;
    this.trailIn = T.everyMs;
    this.trailAlive += 1;
    const puff = this.scene.add.circle(this.head.x, this.head.y, T.sizePx / 2, T.color, T.alpha).setDepth(RIG.depth.trail);
    this.scene.tweens.add({
      targets: puff, scale: 0.25, alpha: 0, duration: T.lifeMs, ease: 'Quad.easeOut',
      onComplete: () => {
        this.trailAlive -= 1;
        puff.destroy();
      },
    });
  }

  // ---- cleanup --------------------------------------------------------------------

  /** Remove every part. `fling`: she was beaten, so the racket flies off spinning and the ball hops away instead of vanishing with her. */
  destroy(fling = false): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const D = RIG.death;
    if (fling && this.racket.active) {
      const racket = this.racket;
      racket.setDepth(50).clearTint();
      this.scene.tweens.add({
        targets: racket, y: racket.y - D.racketRisePx, angle: racket.angle + D.racketSpinDeg, alpha: 0,
        duration: D.lifeMs, ease: 'Cubic.easeOut', onComplete: () => racket.destroy(),
      });
    } else {
      this.racket.destroy();
    }
    if (fling && this.ball.active && this.ball.visible) {
      const ball = this.ball;
      ball.setDepth(50).clearTint();
      this.scene.tweens.add({ targets: ball, x: ball.x + 46, angle: 500, alpha: 0, duration: D.lifeMs, ease: 'Sine.easeOut', onComplete: () => ball.destroy() });
      this.scene.tweens.add({ targets: ball, y: ball.y - D.ballHopPx, duration: D.lifeMs * 0.3, ease: 'Quad.easeOut', yoyo: true });
    } else {
      this.ball.destroy();
    }
    for (const part of [this.tail, this.footL, this.footR, this.arm]) part.destroy();
    this.aura.destroy();
    this.towel.destroy();
  }
}
