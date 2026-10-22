/** @file Flying cat: circles Varu at a distance and throws yarn; its wings flap (FlyingCatRig). */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { FLYER } from '../../config/balance';
import { bus, Events, type SpawnProjectilePayload } from '../../core/events';
import { CULL } from '../../config/culling';
import { Enemy, type EnemyContext } from '../Enemy';
import { FlyingCatRig } from './FlyingCatRig';
import { gameClock } from '../../core/clock';

/** Keeps its distance, circles around Varu and throws yarn balls. Flies over other cats. */
export class FlyingCat extends Enemy {
  private readonly strafeDir = Math.random() < 0.5 ? 1 : -1;
  private nextShotAt: number;
  private readonly wings: FlyingCatRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'flying', Tex.CatFlyingBody);
    this.wings = new FlyingCatRig(scene, this);
    this.nextShotAt = gameClock.now + Phaser.Math.Between(900, 1800);
  }

  override get flies(): boolean {
    return true;
  }

  protected override get cullsDraw(): boolean {
    return CULL.catsDraw.rigs; // body + shadow + the two wings of its rig (`onCullChange`); nothing reads its `visible`
  }

  protected override onCullChange(out: boolean): void {
    this.wings.setCulled(out);
  }

  protected override get facesVelocity(): boolean {
    return false; // it always faces Varu instead
  }

  protected think(time: number, _delta: number, ctx: EnemyContext): void {
    const { player } = ctx; // flyers ignore the laser
    const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const speed = this.stats.speed;

    // Approach if too far, back off if too close, otherwise circle around.
    let vx = Math.cos(toPlayer + (Math.PI / 2) * this.strafeDir) * speed * 0.6;
    let vy = Math.sin(toPlayer + (Math.PI / 2) * this.strafeDir) * speed * 0.6;
    if (dist > FLYER.preferredDistance + 40) {
      vx += Math.cos(toPlayer) * speed;
      vy += Math.sin(toPlayer) * speed;
    } else if (dist < FLYER.preferredDistance - 40) {
      vx -= Math.cos(toPlayer) * speed;
      vy -= Math.sin(toPlayer) * speed;
    }
    this.setVelocity(vx, vy);

    // Always face Varu, even while backing off.
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, toPlayer + Math.PI / 2, 0.15);

    if (time >= this.nextShotAt) {
      this.nextShotAt = time + Phaser.Math.Between(FLYER.shotMinMs, FLYER.shotMaxMs);
      this.flash(0xffe066, 90);
      const payload: SpawnProjectilePayload = { kind: 'yarn', x: this.x, y: this.y, angle: toPlayer, speed: FLYER.projectileSpeed };
      bus.emit(Events.SpawnProjectile, payload);
    }
  }

  /** The wings follow the body after it has moved this frame. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.wings.sync(gameClock.scaled(delta));
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.wings.flash(color, ms);
  }

  override destroy(fromScene?: boolean): void {
    this.wings.destroy();
    super.destroy(fromScene);
  }
}
