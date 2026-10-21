/** @file Federer's ball machine (phase 2): sits on the edge of the arena and fires slow tennis balls down lanes that are drawn on the floor first. More balls to rally with, and a hazard. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { PLAY_AREA } from '../../config/arena';
import { FEDERER } from '../../config/bosses';
import { bus, Events, type SpawnProjectilePayload, type TeleportPayload } from '../../core/events';
import { telegraphLine, type Telegraph } from '../../systems/Telegraph';

/** What the boss tells the machine every frame. All times are game ms. */
export interface MachineFrame {
  now: number;
  /** Where Varu stands (the lane that is closest to him is picked). */
  playerX: number;
  playerY: number;
  /** The damage budget has room for the machine to start a new volley. */
  allowed: boolean;
  /** Stand still (towel break): a lane being drawn is dropped, nothing new starts. */
  paused: boolean;
  /** Tie-break rage: shorter pauses and a red tint. */
  rage: boolean;
}

type MachineState = 'wait' | 'aim' | 'fire';

/**
 * It rolls out on the edge of the arena that is farthest from Varu (the middle of that edge, never a corner), turns its barrel to a lane, draws the
 * lane on the floor for `FEDERER.machine.telegraphMs` and then fires `balls` slow tennis balls down it. The balls are normal tennis balls: swat
 * them (a rally!) or step aside. Numbers: `FEDERER.machine`. The boss owns it (it is destroyed with her) and tells it every frame what is allowed.
 */
export class BallMachine {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly baseScale: number;
  /** The direction straight into the arena (radians). */
  private readonly facing: number;
  private state: MachineState = 'wait';
  private nextAt: number;
  private fireAt = 0;
  private shotsLeft = 0;
  private nextShotAt = 0;
  private clearAt = 0;
  private laneAngle: number;
  private lane: Telegraph | null = null;
  private rageLook = false;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    farFromX: number,
    farFromY: number,
    now: number,
  ) {
    const M = FEDERER.machine;
    const midX = (PLAY_AREA.left + PLAY_AREA.right) / 2;
    const midY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
    const inset = M.edgeInsetPx;
    const spots = [
      { x: midX, y: PLAY_AREA.top + inset, facing: Math.PI / 2 }, // top edge, fires down
      { x: midX, y: PLAY_AREA.bottom - inset, facing: -Math.PI / 2 },
      { x: PLAY_AREA.left + inset, y: midY, facing: 0 },
      { x: PLAY_AREA.right - inset, y: midY, facing: Math.PI },
    ];
    let best = spots[0]!;
    for (const spot of spots) {
      if (Math.hypot(spot.x - farFromX, spot.y - farFromY) > Math.hypot(best.x - farFromX, best.y - farFromY)) best = spot;
    }
    this.facing = best.facing;
    this.laneAngle = best.facing;
    this.nextAt = now + M.firstDelayMs;
    this.sprite = scene.add.image(best.x, best.y, Tex.BallMachine).setDepth(14).setDisplaySize(M.sizePx, M.sizePx).setRotation(best.facing + Math.PI / 2);
    this.baseScale = this.sprite.scaleX;
    // It rolls in with a puff of smoke.
    this.sprite.setScale(this.baseScale * 0.1);
    scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale, scaleY: this.baseScale, duration: 320, ease: 'Back.easeOut' });
    const puff: TeleportPayload = { x: best.x, y: best.y };
    bus.emit(Events.Teleport, puff);
  }

  /** True from the moment a lane is drawn until `clearMs` after its last ball: the machine counts as a damage source meanwhile. */
  busy(now: number): boolean {
    return this.state !== 'wait' || now < this.clearAt;
  }

  /** Every frame. */
  update(f: MachineFrame): void {
    if (this.destroyed) return;
    const M = FEDERER.machine;
    if (f.rage !== this.rageLook) {
      this.rageLook = f.rage;
      if (f.rage) this.sprite.setTint(0xff9a9a);
      else this.sprite.clearTint();
    }
    if (f.paused) {
      if (this.state !== 'wait') this.cancelAim(); // a lane being drawn or a volley under way is dropped
      this.nextAt = Math.max(this.nextAt, f.now + 500);
      return;
    }
    if (this.state === 'wait') {
      if (f.now >= this.nextAt && f.allowed) this.beginAim(f);
      return;
    }
    if (this.state === 'aim') {
      // The barrel turns to the lane while it is drawn.
      this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, this.laneAngle + Math.PI / 2, 0.12);
      if (f.now >= this.fireAt) {
        this.state = 'fire';
        this.shotsLeft = M.balls;
        this.nextShotAt = f.now;
      }
      return;
    }
    // fire
    if (this.shotsLeft > 0) {
      if (f.now >= this.nextShotAt) {
        this.shoot();
        this.shotsLeft -= 1;
        this.nextShotAt = f.now + M.ballGapMs;
        if (this.shotsLeft === 0) {
          this.clearAt = f.now + M.clearMs;
          this.state = 'wait';
          this.nextAt = f.now + M.intervalMs[f.rage ? 1 : 0];
          this.lane = null; // the lane drawing has finished by itself
        }
      }
    }
  }

  /** Pick the lane closest to Varu (now and then a neighbour, so it is not a sniper) and draw it. */
  private beginAim(f: MachineFrame): void {
    const M = FEDERER.machine;
    const bearing = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, f.playerX, f.playerY);
    let bestIndex = 0;
    let bestGap = Infinity;
    M.lanesDeg.forEach((deg, i) => {
      const gap = Math.abs(Phaser.Math.Angle.Wrap(this.facing + Phaser.Math.DegToRad(deg) - bearing));
      if (gap < bestGap) {
        bestGap = gap;
        bestIndex = i;
      }
    });
    if (Math.random() < 0.3) bestIndex = Phaser.Math.Clamp(bestIndex + (Math.random() < 0.5 ? -1 : 1), 0, M.lanesDeg.length - 1);
    this.laneAngle = this.facing + Phaser.Math.DegToRad(M.lanesDeg[bestIndex]!);
    const ms = Math.max(FEDERER.minWarningMs, M.telegraphMs);
    const from = this.muzzle();
    this.lane = telegraphLine(this.scene, from.x, from.y, this.laneAngle, this.laneLength(from.x, from.y), M.laneWidthPx, ms);
    this.state = 'aim';
    this.fireAt = f.now + ms;
  }

  /** The end of the barrel in the world. */
  private muzzle(): { x: number; y: number } {
    const a = this.laneAngle;
    const reach = FEDERER.machine.sizePx * 0.5;
    return { x: this.sprite.x + Math.cos(a) * reach, y: this.sprite.y + Math.sin(a) * reach };
  }

  /** How far the lane runs: to the far edge of the play area along its angle. */
  private laneLength(x: number, y: number): number {
    const dx = Math.cos(this.laneAngle);
    const dy = Math.sin(this.laneAngle);
    const tx = dx > 0.001 ? (PLAY_AREA.right - x) / dx : dx < -0.001 ? (PLAY_AREA.left - x) / dx : Infinity;
    const ty = dy > 0.001 ? (PLAY_AREA.bottom - y) / dy : dy < -0.001 ? (PLAY_AREA.top - y) / dy : Infinity;
    return Math.max(80, Math.min(tx, ty));
  }

  /** One slow green ball down the lane, with a little recoil. */
  private shoot(): void {
    const from = this.muzzle();
    const ball: SpawnProjectilePayload = { kind: 'tennis', x: from.x, y: from.y, angle: this.laneAngle, speed: FEDERER.machine.ballSpeed };
    bus.emit(Events.SpawnProjectile, ball);
    this.scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale * 1.1, scaleY: this.baseScale * 0.9, duration: 70, yoyo: true });
  }

  private cancelAim(): void {
    this.lane?.destroy();
    this.lane = null;
    this.shotsLeft = 0;
    this.state = 'wait';
  }

  /** `instant`: the scene is shutting down, so no fade-out. */
  destroy(instant = false): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.lane?.destroy();
    this.lane = null;
    const sprite = this.sprite;
    if (instant) {
      sprite.destroy();
      return;
    }
    this.scene.tweens.add({ targets: sprite, alpha: 0, scale: this.baseScale * 0.2, duration: 260, onComplete: () => sprite.destroy() });
  }
}
