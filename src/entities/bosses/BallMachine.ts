/** @file One of Federer's ball launchers (phase 2): stands on a side edge of the arena, glides along it, turns its barrel to Varu and, when it is its turn, draws a lane on the floor and fires tennis balls down it (v171: they smash what is in their way, and some are red and fast). The three launchers are run by BallMachines.ts. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { PLAY_AREA } from '../../config/arena';
import { FEDERER } from '../../config/bosses';
import { bus, Events, type SpawnProjectilePayload, type TeleportPayload } from '../../core/events';
import { telegraphLine, type Telegraph } from '../../systems/Telegraph';

/** What the bank tells a launcher every frame. All times are game ms. */
export interface MachineFrame {
  now: number;
  /** Where Varu stands (the lane that is closest to him is picked). */
  playerX: number;
  playerY: number;
  /** It is this launcher's turn and the damage budget has room: it may start a volley. */
  allowed: boolean;
  /** Stand still (towel break): a lane being drawn is dropped, nothing new starts. */
  paused: boolean;
  /** Tie-break rage: a red tint, and the barrel turns faster. */
  rage: boolean;
  /** Crossfire: +1 = only lanes that slant down on the screen, -1 = only lanes that slant up, 0 = any lane (the normal single volley). */
  bias?: 1 | -1 | 0;
}

type MachineState = 'wait' | 'aim' | 'fire';
export type MachineEdge = 'left' | 'right';

/**
 * One launcher. It rolls out on its edge (`left` fires right, `right` fires left), is moved up and down by the bank while it waits, keeps its
 * barrel turned towards Varu (within the lane fan), and on its turn draws the closest lane for `FEDERER.machine.telegraphMs` and then fires
 * `balls` slow tennis balls down it. It never moves while a lane is drawn or balls are leaving, so the warning stays true. The balls are
 * normal tennis balls: swat them (a rally!) or step aside. Numbers: `FEDERER.machine`.
 */
export class BallMachine {
  readonly edge: MachineEdge;
  /** The direction straight into the arena (radians). */
  private readonly facing: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly baseScale: number;
  private state: MachineState = 'wait';
  private fireAt = 0;
  private shotsLeft = 0;
  private nextShotAt = 0;
  private clearAt = 0;
  private laneAngle: number;
  private lane: Telegraph | null = null;
  private rageLook = false;
  private destroyed = false;
  /** The widest lane angle from the centre line, in radians (a constant: worked out once, not every frame). */
  private readonly widestRad: number;
  /** How many volleys it has finished (the bank watches this to pass the turn on). */
  volleys = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    edge: MachineEdge,
    y: number,
  ) {
    const M = FEDERER.machine;
    this.edge = edge;
    this.facing = edge === 'left' ? 0 : Math.PI;
    this.laneAngle = this.facing;
    this.widestRad = Phaser.Math.DegToRad(Math.max(...M.lanesDeg.map(Math.abs)));
    const x = edge === 'left' ? PLAY_AREA.left + M.edgeInsetPx : PLAY_AREA.right - M.edgeInsetPx;
    this.sprite = scene.add.image(x, y, ...texArgs(Tex.BallMachine)).setDepth(14).setDisplaySize(M.sizePx, M.sizePx).setRotation(this.facing + Math.PI / 2);
    this.baseScale = this.sprite.scaleX;
    // It rolls in with a puff of smoke.
    this.sprite.setScale(this.baseScale * 0.1);
    scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale, scaleY: this.baseScale, duration: 320, ease: 'Back.easeOut' });
    const puff: TeleportPayload = { x, y };
    bus.emit(Events.Teleport, puff);
  }

  get y(): number {
    return this.sprite.y;
  }

  /** True while a lane is drawn or balls are leaving: the bank must not move it, and no other launcher starts. */
  get active(): boolean {
    return this.state !== 'wait';
  }

  /** True from the moment a lane is drawn until `clearMs` after its last ball: the launcher counts as a damage source meanwhile. */
  busy(now: number): boolean {
    return this.state !== 'wait' || now < this.clearAt;
  }

  /** Glides along its edge towards `targetY`, at most `step` px this frame. Does nothing while it is aiming or firing. */
  glide(targetY: number, step: number): void {
    if (this.destroyed || this.active) return;
    this.sprite.y += Phaser.Math.Clamp(targetY - this.sprite.y, -step, step);
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
      return;
    }
    if (this.state === 'wait') {
      this.trackBarrel(f);
      if (f.allowed) this.beginAim(f, f.bias ?? 0);
      return;
    }
    if (this.state === 'aim') {
      // The barrel turns to the lane while it is drawn.
      this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, this.laneAngle + Math.PI / 2, 0.12);
      if (f.now >= this.fireAt) {
        this.state = 'fire';
        this.shotsLeft = M.balls + (this.rageLook ? M.rageExtraBalls : 0); // v171: one more ball in the rage
        this.nextShotAt = f.now;
      }
      return;
    }
    // fire
    if (f.now >= this.nextShotAt && this.shotsLeft > 0) {
      this.shoot();
      this.shotsLeft -= 1;
      this.nextShotAt = f.now + M.ballGapMs;
      if (this.shotsLeft === 0) {
        this.clearAt = f.now + M.clearMs;
        this.state = 'wait';
        this.volleys += 1;
        this.lane = null; // the lane drawing has finished by itself
      }
    }
  }

  /** While it waits the barrel follows Varu, kept inside the lane fan (so it never points along its edge). */
  private trackBarrel(f: MachineFrame): void {
    const bearing = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, f.playerX, f.playerY);
    const off = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(bearing - this.facing), -this.widestRad, this.widestRad);
    this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, this.facing + off + Math.PI / 2, f.rage ? FEDERER.machine.rageTurnRate : 0.08);
  }

  /** Pick the lane closest to Varu (now and then a neighbour, so it is not a sniper) and draw it. `bias` (crossfire) limits it to lanes that slant down (+1) or up (-1). */
  private beginAim(f: MachineFrame, bias: 1 | -1 | 0): void {
    const M = FEDERER.machine;
    const bearing = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, f.playerX, f.playerY);
    const lanes = M.lanesDeg.filter((deg) => bias === 0 || Math.sign(deg) === bias); // lanesDeg are sorted, so the filtered list is too
    let bestIndex = 0;
    let bestGap = Infinity;
    lanes.forEach((deg, i) => {
      const gap = Math.abs(Phaser.Math.Angle.Wrap(this.facing + Phaser.Math.DegToRad(deg) - bearing));
      if (gap < bestGap) {
        bestGap = gap;
        bestIndex = i;
      }
    });
    if (bias === 0 && Math.random() < 0.3) bestIndex = Phaser.Math.Clamp(bestIndex + (Math.random() < 0.5 ? -1 : 1), 0, lanes.length - 1);
    this.laneAngle = this.facing + Phaser.Math.DegToRad(lanes[bestIndex]!);
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

  /**
   * One ball down the lane, with a little recoil. v171: it breaks what stands in its way (`smashDamage`), and each ball has a chance to be
   * the red, faster fireball instead of the slow green one; the rage makes the red likelier and every ball faster and harder-hitting.
   */
  private shoot(): void {
    const M = FEDERER.machine;
    const from = this.muzzle();
    const rage = this.rageLook ? 1 : 0;
    const red = Math.random() < M.red.chance[rage]!;
    const speed = red ? M.red.speed[rage]! : M.ballSpeed * (rage ? M.rageBallSpeedFactor : 1);
    const smashDamage = M.smash.damage[red ? 1 : 0]! * (rage ? M.smash.rageFactor : 1);
    const ball: SpawnProjectilePayload = { kind: red ? 'fireball' : 'tennis', x: from.x, y: from.y, angle: this.laneAngle, speed, smashDamage };
    bus.emit(Events.SpawnProjectile, ball);
    const kick = red ? 1.18 : 1.1; // the red one kicks the machine back a little harder
    this.scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale * kick, scaleY: this.baseScale * (2 - kick), duration: 70, yoyo: true });
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
