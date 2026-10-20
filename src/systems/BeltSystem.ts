/** @file Varu's belt: swing, spin and throw state, cooldowns and which attack is active. */
import type Phaser from 'phaser';
import { BELT, BELT_THROW, type BeltAttackId } from '../config/balance';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, type BeltCooldownPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';
import { SPIN, SWING, type SweepDef } from './belt/attacks';
import { SweepAttack } from './belt/SweepAttack';
import { ThrownBelt } from './belt/ThrownBelt';

type SpecialId = Exclude<BeltAttackId, 'swing'>;

/**
 * Varu's belt. Three attacks, one at a time:
 *   swing  hold click / Space   arc in front, quick, no real cooldown
 *   spin   Shift / right click  360 degrees around Varu, long cooldown
 *   throw  E                    boomerang; swing and spin are locked until it is back
 * The attack numbers live in config/balance.ts, the sweep shapes in belt/attacks.ts.
 * Everything that happens is announced on the event bus (belt:swing, belt:spin, belt:throw, ...).
 */
export class BeltSystem {
  private readonly sweep: SweepAttack;
  private thrown: ThrownBelt | null = null;
  private readonly readyAt: Record<BeltAttackId, number> = { swing: 0, spin: 0, throw: 0 };
  /** A spin/throw press that came while busy. It fires as soon as it can, within the input buffer. */
  private queued: { id: SpecialId; until: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly arena: ArenaQuery,
  ) {
    const gfx = scene.add.graphics().setDepth(30);
    this.sweep = new SweepAttack(player, enemies, projectiles, gfx);
  }

  /** True while the belt is flying (swing and spin are locked). */
  get beltAway(): boolean {
    return this.thrown !== null;
  }

  update(time: number, delta: number, input: InputSource): void {
    if (!this.player.alive) {
      this.cancelAll();
      this.player.beltInHand = true;
      this.player.spinTurn = 0;
      this.player.hiddenInTornado = false;
      return;
    }
    if (input.spinPressed) this.queue('spin', time);
    if (input.throwPressed) this.queue('throw', time);

    this.startNext(time, input);

    if (this.sweep.running) this.sweep.update(time);
    if (this.thrown && this.thrown.update(delta)) this.onCaught(time);
    this.player.beltInHand = !this.sweep.running && !this.thrown;
    this.player.spinTurn = this.sweep.bodyTurn;
    this.player.hiddenInTornado = this.sweep.hidesBody;
  }

  /** Dev helper: make every attack ready right now. */
  resetCooldowns(): void {
    this.readyAt.swing = 0;
    this.readyAt.spin = 0;
    this.readyAt.throw = 0;
    this.emitCooldown('spin', 0);
    this.emitCooldown('throw', 0);
  }

  private queue(id: SpecialId, time: number): void {
    this.queued = { id, until: time + BELT.inputBufferMs };
  }

  /** Pick the next attack if nothing is running. Priority: throw / spin presses, then the held swing. */
  private startNext(time: number, input: InputSource): void {
    if (this.sweep.running || this.thrown) return;

    if (this.queued && time > this.queued.until) this.queued = null;
    const wanted = this.queued?.id;
    if (wanted && time >= this.readyAt[wanted]) {
      this.queued = null;
      if (wanted === 'throw') this.startThrow(input.aim.angle());
      else this.startSweep(SPIN, time, input.aim.angle());
      return;
    }
    if (input.attackHeld && time >= this.readyAt.swing) this.startSweep(SWING, time, input.aim.angle());
  }

  private startSweep(def: SweepDef, time: number, aimAngle: number): void {
    this.readyAt[def.id] = time + def.cooldownMs;
    this.sweep.begin(def, time, aimAngle);
    this.emitCooldown(def.id, def.cooldownMs);
  }

  private startThrow(aimAngle: number): void {
    this.thrown = new ThrownBelt(this.scene, this.player, this.enemies, this.projectiles, this.arena, aimAngle);
    this.readyAt.throw = Number.POSITIVE_INFINITY; // locked until the belt is back, see onCaught
    bus.emit(Events.BeltThrow, { x: this.player.x, y: this.player.y, angle: aimAngle });
  }

  private onCaught(time: number): void {
    this.thrown = null;
    this.readyAt.throw = time + BELT_THROW.cooldownMs;
    bus.emit(Events.BeltCaught, { x: this.player.x, y: this.player.y });
    this.emitCooldown('throw', BELT_THROW.cooldownMs);
  }

  private cancelAll(): void {
    this.sweep.cancel();
    this.thrown?.destroy();
    this.thrown = null;
    this.queued = null;
  }

  private emitCooldown(attack: BeltAttackId, durationMs: number): void {
    const payload: BeltCooldownPayload = { attack, durationMs };
    bus.emit(Events.BeltCooldown, payload);
  }
}
