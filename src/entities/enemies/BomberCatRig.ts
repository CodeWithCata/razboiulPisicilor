/** @file The bomber cat's throwing arm (a loose layer that follows her body and is posed by her throw: raise, cock, whip). Visual only. */
import Phaser from 'phaser';
import { BOMBER_PAW, BOMBER_SHOULDER } from '../../assets/art/cats';
import { Tex } from '../../assets/keys';
import { ANIM } from '../../config/animation';
import { BOMBER_POSE_MS as MS, BOMBER_POSES as POSE, BOMBER_RIG as RIG } from '../../config/bomber';
import { PoseTween } from '../../core/poseTween';

/** The arm is drawn on the same 96x96 canvas as her body. */
const TEX = 96;
const HALF = TEX / 2;
const toRad = Phaser.Math.DegToRad;

type BomberPoseKey = 'armDeg' | 'squash' | 'tiltDeg';

/**
 * The bomber's throwing arm (`BOMBER_RIG` / `BOMBER_POSES` in config/bomber.ts), made the way the tennis cat's racket arm is (`TennisCatRig`):
 * one image that pivots on her shoulder, placed on her body every frame. `raise` lifts it for the wind-up, `throwNow` whips it, `relax` lowers it.
 * Her body reads `squash` and `tiltDeg` (a crouch while she cocks, a stretch on the throw). `paw` is where her hand is in the world: the
 * petard she holds is drawn there, and the lob leaves from there.
 */
export class BomberCatRig {
  private readonly tween = new PoseTween<BomberPoseKey>(POSE.ready);
  private readonly arm: Phaser.GameObjects.Image;
  private readonly tmp = { x: 0, y: 0 };
  /** Her paw in the world (from the last frame). */
  readonly paw = { x: 0, y: 0 };
  private clock = Math.random() * 1000;
  private phase = 0;
  private moveAmt = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Phaser.Physics.Arcade.Sprite,
  ) {
    this.arm = scene.add.image(owner.x, owner.y, Tex.CatBomberArm).setDepth(RIG.depth).setOrigin(BOMBER_SHOULDER.x / TEX, BOMBER_SHOULDER.y / TEX);
    this.paw.x = owner.x;
    this.paw.y = owner.y;
  }

  // ---- what the body reads ----------------------------------------------------

  get squash(): number {
    return this.tween.pose.squash;
  }

  get tiltDeg(): number {
    return this.tween.pose.tiltDeg;
  }

  // ---- the throw ----------------------------------------------------------------

  /** Wind-up over `ms`: the arm goes up, then cocks back for the last part. */
  raise(ms: number): void {
    const up = ms * MS.raiseShare;
    this.tween.to(POSE.raise, up, 'out');
    this.tween.to(POSE.cock, ms - up, 'inOut', up);
  }

  /** The petard leaves: the arm whips forward, holds the follow-through a moment, then comes back down. */
  throwNow(): void {
    this.tween.to(POSE.throw, MS.throw, 'in');
    this.tween.to(POSE.ready, MS.back, 'out', MS.throw + MS.backDelay);
  }

  /** The throw was called off (Varu moved away, the laser, she gave up): the arm comes back down. */
  relax(): void {
    this.tween.to(POSE.ready, MS.relax, 'out');
  }

  /** Flash the arm like the body (`Actor.flash` only tints the body). */
  flash(color: number, ms: number): void {
    if (this.destroyed) return;
    this.arm.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => {
      if (this.destroyed) return;
      this.arm.clearTint();
      this.arm.setTintMode(Phaser.TintModes.MULTIPLY);
    });
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

    // The arm turns around her shoulder. It sways when she stands and bobs when she walks (less while it is up for the throw).
    const calm = 1 - Math.min(1, Math.abs(pose.armDeg) / 60);
    const armDeg = pose.armDeg + (Math.sin(this.clock * RIG.arm.idleRate) * RIG.arm.idleDeg + step * RIG.arm.walkDeg) * calm;
    const shoulder = this.world(BOMBER_SHOULDER.x - HALF, BOMBER_SHOULDER.y - HALF, this.tmp);
    this.arm.setPosition(shoulder.x, shoulder.y).setRotation(o.rotation + toRad(armDeg)).setScale(o.scaleX, o.scaleY).setAlpha(o.alpha).setVisible(o.visible);

    // The paw: its rest spot turned around the shoulder on the texture, then moved into the world.
    const a = toRad(armDeg);
    const vx = BOMBER_PAW.x - BOMBER_SHOULDER.x;
    const vy = BOMBER_PAW.y - BOMBER_SHOULDER.y;
    const pawX = BOMBER_SHOULDER.x - HALF + vx * Math.cos(a) - vy * Math.sin(a);
    const pawY = BOMBER_SHOULDER.y - HALF + vx * Math.sin(a) + vy * Math.cos(a);
    this.world(pawX, pawY, this.paw);
  }

  // ---- cleanup --------------------------------------------------------------------

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.arm.destroy();
  }
}
