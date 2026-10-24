/** @file Varu's belt: swing, spin and throw state, cooldowns and which attack is active. */
import type Phaser from 'phaser';
import { BELT, BELT_THROW, type BeltAttackId } from '../config/balance';
import { BELT_CHAIN } from '../config/finisher';
import { synergyEffect } from '../core/beltSynergies';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, type BeltChainPayload, type BeltCooldownPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';
import { FINISHER, SPIN, SWING, type SweepDef } from './belt/attacks';
import { SweepAttack } from './belt/SweepAttack';
import { ThrownBelt } from './belt/ThrownBelt';

type SpecialId = Exclude<BeltAttackId, 'swing'>;

/**
 * Varu's belt. Three attacks, one at a time:
 *   swing  hold click / Space   arc in front, quick, no real cooldown
 *   spin   Shift / right click  360 degrees around Varu, long cooldown
 *   throw  E                    boomerang; swing and spin are locked until it is back
 * The attack numbers live in config/balance.ts, the sweep shapes in belt/attacks.ts.
 * Swings come in a chain (config/finisher.ts): two in rhythm, then the third is the finisher, a wide heavy arc that flings cats.
 * Everything that happens is announced on the event bus (belt:swing, belt:finisher, belt:spin, belt:throw, ...).
 */
export class BeltSystem {
  private readonly sweep: SweepAttack;
  private thrown: ThrownBelt | null = null;
  private readonly readyAt: Record<BeltAttackId, number> = { swing: 0, spin: 0, throw: 0 };
  /** A spin/throw press that came while busy. It fires as soon as it can, within the input buffer. */
  private queued: { id: SpecialId; until: number } | null = null;

  // ---- the swing chain (config/finisher.ts) ----
  /** Swings that HIT a cat in the current chain (0 = none). A swing in the air does not count. */
  private chainStep = 0;
  /** The plain swing that is running has not hit a cat yet: its first hit adds one to the chain. */
  private awaitingHit = false;
  /** The chain breaks if the next swing starts after this game time. */
  private chainDeadline = 0;
  /** When the last swing started and how long its pause is: a fresh tap inside the first part of it is mashing. */
  private lastSwingAt = 0;
  private lastSwingPauseMs = 0;
  /** A mash tap was seen since the last swing: the next swing starts a new chain. */
  private mashed = false;
  private wasHeld = false;

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
    this.watchMashing(time, input.attackHeld);

    this.startNext(time, input);

    if (this.sweep.running) this.sweep.update(time);
    this.creditHit();
    if (this.thrown && this.thrown.update(delta)) this.onCaught(time);
    this.player.beltInHand = !this.sweep.running && !this.thrown;
    this.player.spinTurn = this.sweep.bodyTurn;
    this.player.hiddenInTornado = this.sweep.hidesBody;
  }

  /** A cutscene starts: drop any swing, spin or thrown belt in progress (its strap must not stay frozen on screen) and put the belt back in his fist. */
  halt(): void {
    this.cancelAll();
    this.player.beltInHand = true;
    this.player.spinTurn = 0;
    this.player.hiddenInTornado = false;
  }

  /** Dev helper: make every attack ready right now. */
  resetCooldowns(): void {
    this.readyAt.swing = 0;
    this.breakChain();
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
    if (this.player.frozen) return; // the smoke break: no new swing, spin or throw until the drag is over

    if (this.queued && time > this.queued.until) this.queued = null;
    const wanted = this.queued?.id;
    if (wanted && time >= this.readyAt[wanted]) {
      this.queued = null;
      if (wanted === 'throw') this.startThrow(input.aim.angle());
      else this.startSweep(SPIN, time, input.aim.angle());
      return;
    }
    if (input.attackHeld && time >= this.readyAt.swing) this.startSweep(this.nextSwing(time), time, input.aim.angle());
  }

  /** A fresh press (not a held button) inside the first part of the swing pause is mashing: the chain starts over. */
  private watchMashing(time: number, held: boolean): void {
    const pressed = held && !this.wasHeld;
    this.wasHeld = held;
    if (!pressed || this.chainStep === 0) return;
    if (time - this.lastSwingAt < this.lastSwingPauseMs * BELT_CHAIN.mashShare) this.mashed = true;
  }

  /** The swing that starts now: a plain one, or the finisher when this is the third in rhythm. Updates the chain. */
  private nextSwing(time: number): SweepDef {
    if (!BELT_CHAIN.enabled) return SWING;
    if (this.chainStep > 0 && (this.mashed || time > this.chainDeadline)) this.chainStep = 0;
    this.mashed = false;
    if (this.chainStep >= BELT_CHAIN.steps - 1) {
      this.awaitingHit = false;
      this.setChain(0, true); // the finisher is the end of the chain
      return FINISHER;
    }
    this.awaitingHit = true; // this plain swing only fills a dot if it hits a cat (see `creditHit`)
    return SWING;
  }

  /** A plain swing that touched a cat fills the next dot, the moment it lands. A swing that only cuts air fills nothing. */
  private creditHit(): void {
    if (!this.awaitingHit || this.sweep.hits === 0) return;
    this.awaitingHit = false;
    this.setChain(this.chainStep + 1);
  }

  /** Spin, throw, death or a cheat: the count starts over. */
  private breakChain(): void {
    this.mashed = false;
    this.awaitingHit = false;
    if (this.chainStep !== 0) this.setChain(0);
  }

  private setChain(step: number, finisherNow = false): void {
    this.chainStep = step;
    const payload: BeltChainPayload = { step, ready: step === BELT_CHAIN.steps - 1 && !finisherNow, finisher: finisherNow };
    bus.emit(Events.BeltChain, payload);
  }

  private startSweep(def: SweepDef, time: number, aimAngle: number): void {
    const cooldown = def.cooldownMs * (def.id === 'swing' ? this.player.swingCooldownMultiplier : this.player.specialCooldownMultiplier); // emo / rusty belt make it longer
    this.readyAt[def.id] = time + cooldown;
    if (def.id === 'swing') {
      // The rhythm: the next swing counts if it starts within `lateMs` (a synergy makes that roomier) after this pause is over.
      this.lastSwingAt = time;
      this.lastSwingPauseMs = cooldown;
      this.chainDeadline = time + cooldown + BELT_CHAIN.lateMs * synergyEffect('chainWindow');
    } else {
      this.breakChain();
    }
    this.sweep.begin(def, time, aimAngle);
    this.emitCooldown(def.id, cooldown);
  }

  private startThrow(aimAngle: number): void {
    this.breakChain();
    this.thrown = new ThrownBelt(this.scene, this.player, this.enemies, this.projectiles, this.arena, aimAngle);
    this.readyAt.throw = Number.POSITIVE_INFINITY; // locked until the belt is back, see onCaught
    bus.emit(Events.BeltThrow, { x: this.player.x, y: this.player.y, angle: aimAngle });
  }

  private onCaught(time: number): void {
    this.thrown = null;
    const cooldown = BELT_THROW.cooldownMs * this.player.specialCooldownMultiplier;
    this.readyAt.throw = time + cooldown;
    bus.emit(Events.BeltCaught, { x: this.player.x, y: this.player.y });
    this.emitCooldown('throw', cooldown);
  }

  private cancelAll(): void {
    this.breakChain();
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
