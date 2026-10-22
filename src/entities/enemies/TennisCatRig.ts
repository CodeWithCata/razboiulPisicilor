/** @file The tennis cat's moving parts (racket arm, racket, tossed ball) that follow her body and are posed by her serve: toss, swing, pop. Visual only. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { TENNIS_BALL_HAND, TENNIS_PAW, TENNIS_RACKET_HEAD, TENNIS_SHOULDER } from '../../assets/art/cats';
import { Tex, type TexKey } from '../../assets/keys';
import { ANIM } from '../../config/animation';
import { TENNIS_POSE_MS as MS, TENNIS_POSES as POSE, TENNIS_RIG as RIG } from '../../config/tennisRig';
import { PoseTween } from '../../core/poseTween';

/** Her layers are all drawn on the same 96x96 canvas as her body. */
const TEX = 96;
const HALF = TEX / 2;
const toRad = Phaser.Math.DegToRad;

/**
 * The numbers the serve moves (`TENNIS_POSES` in config/tennisRig.ts). Arm and wrist in degrees (positive = racket swung out to her right and back,
 * negative = across the front), `squash` and `tiltDeg` are read by the body, `ballLift` is how high the ball is tossed (game px), `ballShow` 0 = no ball, 1 = in her paw.
 */
type TennisPoseKey = 'armDeg' | 'wristDeg' | 'squash' | 'tiltDeg' | 'ballLift' | 'ballShow';

/** Puts one loose-layer picture: position, angle, scale, alpha and visibility. A plain function (no closure is made per frame). */
function placeLayer(img: Phaser.GameObjects.Image, x: number, y: number, rot: number, scx: number, scy: number, alpha: number, visible: boolean): void {
  img.setPosition(x, y).setRotation(rot).setScale(scx, scy).setAlpha(alpha).setVisible(visible);
}

export class TennisCatRig {
  private readonly tween = new PoseTween<TennisPoseKey>(POSE.ready);
  private readonly racket: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Image;
  private readonly ball: Phaser.GameObjects.Image;
  private readonly parts: Phaser.GameObjects.Image[];
  private readonly tmp = { x: 0, y: 0 };
  /** The middle of the racket strings in the world (from the last frame): the pop happens here. */
  private readonly head = { x: 0, y: 0 };

  private clock = Math.random() * 1000;
  private phase = 0;
  private moveAmt = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    const make = (key: TexKey, depth: number): Phaser.GameObjects.Image => scene.add.image(owner.x, owner.y, ...texArgs(key)).setDepth(depth);
    this.racket = make(Tex.CatTennisRacket, RIG.depth.racket).setOrigin(TENNIS_PAW.x / TEX, TENNIS_PAW.y / TEX);
    this.arm = make(Tex.CatTennisArm, RIG.depth.arm).setOrigin(TENNIS_SHOULDER.x / TEX, TENNIS_SHOULDER.y / TEX);
    this.ball = make(Tex.Tennis, RIG.depth.ball);
    this.parts = [this.racket, this.arm, this.ball];
  }

  // ---- what the body reads ----------------------------------------------------

  /** Crouch on the toss, stretch on the swing (on top of her walk cycle). */
  get squash(): number {
    return this.tween.pose.squash;
  }

  get tiltDeg(): number {
    return this.tween.pose.tiltDeg;
  }

  // ---- the serve ------------------------------------------------------------------

  /** Windup: the ball goes up above her paw and the racket is cocked back, over `ms`. */
  toss(ms: number): void {
    this.tween.to(POSE.toss, ms, 'out');
  }

  /** The racket whips across the front. Start it `MS.smash` before the ball leaves so the swing ends right at the hit. */
  swing(): void {
    this.tween.to(POSE.smash, MS.smash, 'in');
  }

  /** The racket met the ball: it is gone from the air, a pop at the strings, then the racket comes back down and a fresh ball pops into her paw. */
  hit(): void {
    this.tween.snap('ballShow', 0);
    this.tween.snap('ballLift', 0);
    this.pop();
    const { armDeg, wristDeg, squash, tiltDeg } = POSE.ready;
    this.tween.to({ armDeg, wristDeg, squash, tiltDeg }, MS.back, 'out', MS.backDelay);
    this.tween.to({ ballShow: 1, ballLift: 0 }, MS.refill, 'out', MS.refillDelay);
  }

  /** The serve was called off (Varu moved away, the laser, she gave up): the ball comes back down and the racket relaxes. */
  relax(): void {
    this.tween.to(POSE.ready, MS.relax, 'out');
  }

  /** Flash every loose part like the body (`Actor.flash` only tints the body). */
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

  /** The pop where the racket meets the ball: a ring and a few stars at the strings. */
  private pop(): void {
    const H = RIG.hit;
    const { x, y } = this.head;
    const ring = this.scene.add.circle(x, y, 6, H.color, 0.22).setStrokeStyle(3, H.color, 1).setDepth(44);
    this.scene.tweens.add({ targets: ring, scale: H.ringPx / 6, alpha: 0, duration: H.ringMs, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < H.stars; i++) {
      const a = (i / H.stars) * Math.PI * 2 + Math.random() * 0.6;
      const reach = H.starReachPx * (0.6 + Math.random() * 0.6);
      const star = this.scene.add.image(x, y, ...texArgs(Tex.Star)).setDisplaySize(H.starSizePx, H.starSizePx).setDepth(60);
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

  /** Call every frame after she has moved (from `preUpdate`). `delta` is in ms. */
  sync(delta: number): void {
    const o = this.owner;
    if (this.destroyed || !o.active || !o.body) return;
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.tween.update(dt);
    const pose = this.tween.pose;

    const body = o.body as Phaser.Physics.Arcade.Body;
    const moving = body.speed >= ANIM.idleSpeed;
    this.moveAmt += ((moving ? 1 : 0) - this.moveAmt) * Math.min(1, (10 * dt) / 1000);
    if (moving) this.phase += ((body.speed * dt) / 1000) * RIG.arm.radPerPx;
    const step = Math.sin(this.phase) * this.moveAmt;

    const r = o.rotation;

    // Racket arm: turns around her shoulder; the racket turns on its own around her paw (the wrist).
    const armDeg = pose.armDeg + Math.sin(this.clock * RIG.arm.idleRate) * RIG.arm.idleDeg + step * RIG.arm.walkDeg;
    const wristDeg = pose.wristDeg + Math.sin(this.clock * RIG.arm.wristIdleRate) * RIG.arm.wristIdleDeg;
    const shoulder = this.world(TENNIS_SHOULDER.x - HALF, TENNIS_SHOULDER.y - HALF, this.tmp);
    placeLayer(this.arm, shoulder.x, shoulder.y, r + toRad(armDeg), o.scaleX, o.scaleY, o.alpha, o.visible);

    // The paw and the racket head, worked out on the texture (turned around the shoulder, then around the paw), then moved into the world.
    const a = toRad(armDeg);
    const w = toRad(armDeg + wristDeg);
    const pawVx = TENNIS_PAW.x - TENNIS_SHOULDER.x;
    const pawVy = TENNIS_PAW.y - TENNIS_SHOULDER.y;
    const pawX = TENNIS_SHOULDER.x - HALF + pawVx * Math.cos(a) - pawVy * Math.sin(a);
    const pawY = TENNIS_SHOULDER.y - HALF + pawVx * Math.sin(a) + pawVy * Math.cos(a);
    const paw = this.world(pawX, pawY, this.tmp);
    placeLayer(this.racket, paw.x, paw.y, r + w, o.scaleX, o.scaleY, o.alpha, o.visible);
    const headVx = TENNIS_RACKET_HEAD.x - TENNIS_PAW.x;
    const headVy = TENNIS_RACKET_HEAD.y - TENNIS_PAW.y;
    this.world(pawX + headVx * Math.cos(w) - headVy * Math.sin(w), pawY + headVx * Math.sin(w) + headVy * Math.cos(w), this.head);

    // The ball: dribbled a little in her paw, higher and bigger while it is tossed, spinning when it is up.
    const show = pose.ballShow;
    const dribble = pose.ballLift < 1 ? Math.abs(Math.sin(this.clock * RIG.ball.dribbleRate)) * RIG.ball.dribblePx * (1 - this.moveAmt * 0.5) : 0;
    const at = this.world(TENNIS_BALL_HAND.x - HALF, TENNIS_BALL_HAND.y - HALF, this.tmp);
    const size = Math.max(RIG.ball.sizePx * (1 + pose.ballLift * RIG.ball.growPerPx) * Math.max(0, show), 0.01);
    this.ball
      .setPosition(at.x, at.y - pose.ballLift - dribble)
      .setDisplaySize(size, size)
      .setAngle(pose.ballLift > 1 ? this.clock * RIG.ball.spinPerMs : 0)
      .setAlpha(o.alpha * Math.min(1, show * 3))
      .setVisible(o.visible && show > 0.02);
  }

  // ---- cleanup --------------------------------------------------------------------

  /** Remove every part. `fling`: she was beaten, so the racket flies off spinning instead of vanishing with her. */
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
    this.arm.destroy();
    this.ball.destroy();
  }
}
