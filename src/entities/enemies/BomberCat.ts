/** @file Pisica Bombardier (the bomber cat): a strong walking cat that keeps her distance, lifts a petard over her head and lobs it at Varu (the same petard the fans throw). */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { PLAY_AREA, WORLD } from '../../config/arena';
import { BOMBER } from '../../config/bomber';
import { FAN_THROW } from '../../config/fanThrow';
import { gameClock } from '../../core/clock';
import { bus, Events, type ThrowPetardPayload } from '../../core/events';
import { CULL } from '../../config/culling';
import { Enemy, type EnemyContext } from '../Enemy';
import { BomberCatRig } from './BomberCatRig';
import type { Player } from '../Player';
import { hyp } from '../../core/hyp';

type BomberPhase = 'move' | 'windup';

const TAU = Math.PI * 2;

/**
 * Numbers: `BOMBER` in config/bomber.ts, her stats `ENEMIES.bomber`. She walks to a comfortable distance from Varu, circles him, then stops,
 * flashes orange and lifts a petard over her head (the warning). The petard is lobbed over the walls to where Varu is going to be, as a
 * normal fan petard (`FanThrowSystem` flies it: red ring, fuse, blast that hurts Varu AND cats). Sometimes she follows up with a second one.
 * Her throwing arm is a loose layer (`BomberCatRig`): it goes up for the wind-up and whips on the throw; the petard leaves her paw and carries
 * `by: this`, so Varu's belt can knock a fresh one back at her (`FAN_THROW.swat`). She follows the laser dot like the other ground cats (no throwing then).
 */
export class BomberCat extends Enemy {
  private phase: BomberPhase = 'move';
  private nextThrowAt: number;
  private throwAt = 0;
  private volleyed = false;
  private strafeDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private strafeFlipAt = 0;
  /** The petard held over her head during the wind-up (an image of its own: it stays upright while she turns). */
  private readonly held: Phaser.GameObjects.Image;
  private heldBase: number;
  /** Her throwing arm (a loose layer, like the tennis cat's racket arm). */
  private readonly rig: BomberCatRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bomber', Tex.CatBomber);
    const H = BOMBER.held;
    this.held = scene.add.image(x, y, ...texArgs(H.tex)).setVisible(false);
    this.heldBase = H.sizePx / Math.max(this.held.frame.realWidth, this.held.frame.realHeight);
    this.held.setScale(this.heldBase);
    this.rig = new BomberCatRig(scene, this);
    this.nextThrowAt = gameClock.now + Phaser.Math.Between(BOMBER.firstThrowMs.min, BOMBER.firstThrowMs.max);
  }

  protected override get facesVelocity(): boolean {
    return false; // she always faces Varu instead of where she walks
  }

  /** Crouch while she cocks, stretch on the throw: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    const { player, lure } = ctx;
    const speed = this.stats.speed;

    // Distracted by the laser: walk to the dot like the other cats, no throwing.
    if (lure) {
      this.callOff();
      this.chase(ctx, speed);
      this.faceTowards(lure.x ?? this.x, lure.y ?? this.y);
      return;
    }

    this.faceTowards(player.x, player.y);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const inRange = dist >= BOMBER.minRangePx && dist <= BOMBER.maxRangePx;

    if (this.phase === 'windup') {
      this.setVelocity(0, 0);
      if (!inRange) {
        this.callOff(); // Varu got too close or too far: call it off and try again soon
        this.nextThrowAt = time + BOMBER.windUpMs;
      } else if (time >= this.throwAt) {
        this.lob(player);
        this.rig.throwNow();
        this.hideHeld();
        this.phase = 'move';
        if (!this.volleyed && Math.random() < BOMBER.volley.chance) {
          this.volleyed = true; // a second one right behind the first
          this.startWindUp(time, BOMBER.volley.windUpMs);
        } else {
          this.volleyed = false;
          this.nextThrowAt = time + Phaser.Math.Between(BOMBER.throwMinMs, BOMBER.throwMaxMs);
        }
      }
      return;
    }

    if (inRange && time >= this.nextThrowAt) {
      this.startWindUp(time, BOMBER.windUpMs);
      return;
    }

    // Too far: walk closer. Too close: back off. Otherwise circle him.
    if (dist > BOMBER.preferredDistance + BOMBER.band) this.chase(ctx, speed);
    else if (dist < BOMBER.preferredDistance - BOMBER.band) this.backOff(player, speed * BOMBER.retreatSpeedFactor);
    else this.strafe(time, player, speed);
  }

  private startWindUp(time: number, ms: number): void {
    this.phase = 'windup';
    this.throwAt = time + ms;
    this.setVelocity(0, 0);
    this.held.setVisible(true);
    this.rig.raise(ms);
    this.flash(BOMBER.windUpColor, ms);
  }

  /** A throw that does not happen after all: back to walking, the petard goes down. */
  private callOff(): void {
    if (this.phase !== 'windup') return;
    this.phase = 'move';
    this.volleyed = false;
    this.hideHeld();
    this.rig.relax();
  }

  private hideHeld(): void {
    this.held.setVisible(false);
  }

  /** Lobs one petard at where Varu is going to be (a bit ahead if he walks, a little off), on open floor inside the fence. */
  private lob(player: Player): void {
    const L = BOMBER.lead;
    let tx = player.x;
    let ty = player.y;
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      const flightSec = FAN_THROW.flightMs / 1000;
      let ox = body.velocity.x * flightSec * L.factor;
      let oy = body.velocity.y * flightSec * L.factor;
      const len = hyp(ox, oy);
      if (len > L.maxPx) {
        ox = (ox / len) * L.maxPx;
        oy = (oy / len) * L.maxPx;
      }
      tx += ox;
      ty += oy;
    }
    const miss = Phaser.Math.FloatBetween(0, BOMBER.scatterPx);
    const missAngle = Math.random() * TAU;
    const m = BOMBER.wallMargin;
    const x = Phaser.Math.Clamp(tx + Math.cos(missAngle) * miss, Math.max(PLAY_AREA.left + m, m), Math.min(PLAY_AREA.right - m, WORLD.width - m));
    const y = Phaser.Math.Clamp(ty + Math.sin(missAngle) * miss, Math.max(PLAY_AREA.top + m, m), Math.min(PLAY_AREA.bottom - m, WORLD.height - m));
    const land = this.obstacles.nearestOpen(x, y, FAN_THROW.petard.radius * 0.25);
    // It leaves her raised paw; `by` lets the belt knock it back at her (FAN_THROW.swat).
    const lob: ThrowPetardPayload = { x: this.rig.paw.x, y: this.rig.paw.y - BOMBER.held.aboveHandPx, toX: land.x, toY: land.y, by: this };
    bus.emit(Events.ThrowPetard, lob);
  }

  /** Holding her spot: walk sideways around Varu (a moving target), turning the other way now and then. */
  private strafe(time: number, player: Player, speed: number): void {
    const S = BOMBER.strafe;
    if (time >= this.strafeFlipAt) {
      this.strafeDir = this.strafeDir === 1 ? -1 : 1;
      this.strafeFlipAt = time + Phaser.Math.Between(S.flipMs.min, S.flipMs.max);
    }
    const side = Math.atan2(player.y - this.y, player.x - this.x) + (this.strafeDir * Math.PI) / 2;
    this.steerTo({ x: this.x + Math.cos(side) * S.stepPx, y: this.y + Math.sin(side) * S.stepPx }, speed * S.speedFactor);
  }

  /** Walks away from Varu to a point behind her, kept inside the world (steerTo turns around walls). */
  private backOff(player: Player, speed: number): void {
    const away = Math.atan2(this.y - player.y, this.x - player.x);
    const m = BOMBER.wallMargin;
    this.steerTo(
      {
        x: Phaser.Math.Clamp(this.x + Math.cos(away) * BOMBER.retreatStep, m, WORLD.width - m),
        y: Phaser.Math.Clamp(this.y + Math.sin(away) * BOMBER.retreatStep, m, WORLD.height - m),
      },
      speed,
    );
  }

  private faceTowards(x: number, y: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, angle + Math.PI / 2, BOMBER.turnRate);
  }

  protected override get cullsDraw(): boolean {
    return CULL.catsDraw.rigs; // body, shadow and the arm (`onCullChange`). The held petard is left alone on purpose: its `visible` means "she is holding it" (read in `preUpdate`)
  }

  protected override onCullChange(out: boolean): void {
    this.rig.setCulled(out);
  }

  /** The arm follows her body after it has moved this frame; the held petard rides above her raised paw (upright) and throbs. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
    if (!this.held.visible) return;
    const H = BOMBER.held;
    const throb = 1 + H.throb.amount * Math.sin((gameClock.now / 1000) * H.throb.hz * TAU);
    this.held
      .setPosition(this.rig.paw.x, this.rig.paw.y - H.aboveHandPx)
      .setScale(this.heldBase * throb)
      .setDepth(this.depth + 3)
      .setAlpha(this.alpha);
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
  }

  /** A cat that gives up drops the petard. */
  override surrender(exit: Phaser.Types.Math.Vector2Like): void {
    super.surrender(exit);
    if (this.surrendering) this.callOff();
  }

  override destroy(fromScene?: boolean): void {
    this.rig.destroy();
    this.held.destroy();
    super.destroy(fromScene);
  }
}
