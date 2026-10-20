/** @file One 2x2 arena object as a sprite on springs: lean, squash, shove, hop, idle sway, damage, break away. */
import Phaser from 'phaser';
import { crackKey, propKey } from '../../assets/propTextures';
import { ARENA, type ObjectName } from '../../config/arena';
import { BUSH_VARIANTS, PROP_FEEL, PROP_HP, PROP_TUNING, ROCK_CRACKS, SMASH, bushVariantFor, type PropFeel } from '../../config/props';
import type { Box } from '../../core/reach';
import { Spring } from './Spring';

const TAU = Math.PI * 2;

/**
 * One 2x2 arena object (bush, rock, box, scratcher, bed, cushion) as a sprite on springs.
 * The Tiled map still holds its solid tiles (that is what Varu and the cats bump into); this is only the picture.
 * Everything it does is a few springs: lean, squash, shove, plus a hop for the box, and an idle sway or breath.
 */
export class Prop {
  readonly box: Box;
  /** Center of the object. */
  readonly cx: number;
  readonly cy: number;
  readonly sprite: Phaser.GameObjects.Image;
  /** The belt sweep (and lap) that hit it last, so one swing hits it once. */
  hitKey = -1;
  /** Walking and projectile hits wait for this (game ms). */
  readyAt = 0;
  /** A boss smashes it at most this often (game ms). */
  smashReadyAt = 0;
  /** True once it was destroyed: it ignores everything from then on. */
  dead = false;
  /** 0..1: how grown it is (a bush that grows back starts at 0). Tweened from outside. */
  grow = 1;
  /** Bushes: index into BUSH_VARIANTS (leaf colors). Other props: 0. */
  readonly variant: number;
  hp: number;

  private readonly feel: PropFeel;
  private readonly tilt = new Spring();
  private readonly squash = new Spring();
  private readonly shiftX = new Spring();
  private readonly shiftY = new Spring();
  private z = 0;
  private vz = 0;
  /** Rocks: real hits so far, the crack stage they reached, and the picture of the cracks (it follows the rock). */
  private hits = 0;
  private stage = 0;
  private crack: Phaser.GameObjects.Image | null = null;
  private readonly baseX: number;
  private readonly baseY: number;
  /** Every prop idles out of step with the others. */
  private readonly phase = Math.random() * TAU;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly kind: ObjectName,
    col: number,
    row: number,
    private readonly onCrack: (prop: Prop, stage: number) => void = () => undefined,
  ) {
    const feel = PROP_FEEL[kind];
    const size = ARENA.tile * 2;
    this.feel = feel;
    this.hp = PROP_HP[kind].hp;
    this.box = { x: col * ARENA.tile, y: row * ARENA.tile, w: size, h: size };
    this.cx = this.box.x + size / 2;
    this.cy = this.box.y + size / 2;
    this.baseX = this.cx;
    this.baseY = this.box.y + size * feel.pivot;
    this.sprite = scene.add.image(this.baseX, this.baseY, propKey(kind)).setOrigin(0.5, feel.pivot).setDepth(ARENA.depth.walls);
    this.variant = kind === 'bush' ? bushVariantFor(col, row) : 0;
    const bodyTint = kind === 'bush' ? BUSH_VARIANTS[this.variant]?.bodyTint : null;
    if (bodyTint != null) this.sprite.setTint(bodyTint);
  }

  /** `dirX/dirY`: unit vector pointing AWAY from whatever hit it. `power` 0..1. */
  hit(dirX: number, dirY: number, power: number): void {
    if (this.dead) return;
    const f = this.feel;
    const omega = TAU * f.hz * PROP_TUNING.kickGain;
    // A hit straight from above or below still leans a little, to either side.
    const lean = Math.abs(dirX) < 0.2 ? (Math.random() < 0.5 ? -0.35 : 0.35) : dirX;
    this.tilt.kick(lean * Phaser.Math.DegToRad(f.tiltDeg) * power * omega);
    this.squash.kick(f.squash * power * omega * (0.55 + 0.45 * Math.abs(dirY)));
    this.shiftX.kick(dirX * f.nudge * power * omega);
    this.shiftY.kick(dirY * f.nudge * power * omega);
    if (f.hop > 0) this.vz = Math.sqrt(2 * PROP_TUNING.hopGravity * f.hop * power);
    this.countHit(power);
  }

  /** A puff of wind: only a lean, no squash and no shove. */
  gust(power: number): void {
    if (this.dead) return;
    const omega = TAU * this.feel.hz * PROP_TUNING.kickGain;
    this.tilt.kick(Phaser.Math.DegToRad(this.feel.tiltDeg) * power * omega);
  }

  /** `visible`: on or near the screen. Hidden props only finish a wobble that is already running. */
  update(dt: number, now: number, visible: boolean): void {
    if (this.dead) return;
    const f = this.feel;
    const idles = visible && (f.sway !== undefined || f.breathe !== undefined);
    const moving = !this.tilt.resting || !this.squash.resting || !this.shiftX.resting || !this.shiftY.resting || this.z > 0 || this.vz !== 0 || this.grow < 1;
    if (!moving && !idles) return;

    this.tilt.step(dt, f.hz, f.damping);
    this.squash.step(dt, f.hz, f.damping);
    this.shiftX.step(dt, f.hz, f.damping);
    this.shiftY.step(dt, f.hz, f.damping);
    if (this.z > 0 || this.vz !== 0) this.fly(dt);

    const t = now / 1000;
    const sway = f.sway && visible ? Math.sin(t * TAU * f.sway.hz + this.phase) * Phaser.Math.DegToRad(f.sway.deg) : 0;
    const breath = f.breathe && visible ? 1 + Math.sin(t * TAU * f.breathe.hz + this.phase) * f.breathe.amount : 1;
    const s = this.squash.value;
    this.sprite.setRotation(this.tilt.value + sway);
    const hurt = (1 - SMASH.shrink * (1 - Math.max(0, this.hp) / PROP_HP[this.kind].hp)) * this.grow; // a hurt prop is a bit smaller; a sapling smaller still
    this.sprite.setScale((1 + s * 0.6) * hurt, (1 - s) * breath * hurt); // flatter = a bit wider
    this.sprite.setPosition(this.baseX + this.shiftX.value, this.baseY + this.shiftY.value - this.z);
    this.syncCrack();
  }

  /** A bush that grows back: from a tiny sapling to full size, with a little overshoot. */
  growIn(ms: number): void {
    this.grow = 0.01;
    this.sprite.setScale(0.01);
    this.scene.tweens.add({ targets: this, grow: 1, duration: ms, ease: 'Back.easeOut' });
  }

  /** Take damage. Returns true when it is used up (the caller then destroys it). */
  damage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  /** It breaks: a quick burst outward (squashed flat, spun, faded), then the sprite is gone. */
  breakAway(dirX: number): void {
    this.dead = true;
    this.crack?.destroy();
    this.crack = null;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.3,
      scaleY: this.sprite.scaleY * 0.2,
      alpha: 0,
      angle: this.sprite.angle + dirX * 25,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => this.sprite.destroy(),
    });
  }

  /** A rock remembers real hits: at the counts in ROCK_CRACKS.stages it gets one more crack. */
  private countHit(power: number): void {
    if (this.kind !== 'rock' || !ROCK_CRACKS.enabled || power < ROCK_CRACKS.minPower) return;
    this.hits += 1;
    const stage = ROCK_CRACKS.stages.filter((n) => this.hits >= n).length;
    if (stage <= this.stage) return;
    this.stage = stage;
    if (this.crack) this.crack.setTexture(crackKey(stage));
    else this.crack = this.scene.add.image(this.sprite.x, this.sprite.y, crackKey(stage)).setOrigin(0.5, this.feel.pivot).setDepth(ARENA.depth.walls + 0.01);
    this.syncCrack();
    this.onCrack(this, stage);
  }

  /** The cracks ride along with the rock while it wobbles. */
  private syncCrack(): void {
    this.crack?.setPosition(this.sprite.x, this.sprite.y).setRotation(this.sprite.rotation).setScale(this.sprite.scaleX, this.sprite.scaleY);
  }

  /** The little hop (box): up, down, and a squash when it lands. */
  private fly(dt: number): void {
    this.vz -= PROP_TUNING.hopGravity * dt;
    this.z += this.vz * dt;
    if (this.z > 0) return;
    const impact = -this.vz;
    this.z = 0;
    this.vz = 0;
    this.squash.kick(Math.min(1, impact / 500) * this.feel.squash * TAU * this.feel.hz * 0.9);
  }
}
