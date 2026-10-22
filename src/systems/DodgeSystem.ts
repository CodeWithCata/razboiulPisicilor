/** @file Varu's dodge roll: reads the roll press, keeps the 2 s cooldown (with a short input buffer) and starts the roll on the player. */
import { DODGE } from '../config/dodge';
import { gameClock } from '../core/clock';
import { bus, Events, type DodgeCooldownPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';

/**
 * Owns WHEN a roll may start. The roll itself (movement, i-frames, somersault) is `Player.startRoll`. A press made while the roll is
 * recharging (or he is busy) is remembered for `DODGE.inputBufferMs`. The cooldown counts from the start of the roll and is shown by the
 * HUD badge (`Events.DodgeCooldown`).
 */
export class DodgeSystem {
  private readyAt = 0;
  private queuedUntil = -Infinity;

  constructor(private readonly player: Player) {}

  /** Every frame, BEFORE `player.tick`, so the roll moves him this very frame. */
  update(now: number, input: InputSource): void {
    if (!this.player.alive) {
      this.queuedUntil = -Infinity;
      return;
    }
    if (input.dodgePressed) this.queuedUntil = now + DODGE.inputBufferMs;
    if (now > this.queuedUntil) return;
    if (now < this.readyAt || !this.player.canRoll) return;
    this.queuedUntil = -Infinity;
    this.readyAt = now + DODGE.cooldownMs;
    this.player.startRoll(input.move.x, input.move.y);
    const payload: DodgeCooldownPayload = { durationMs: DODGE.cooldownMs };
    bus.emit(Events.DodgeCooldown, payload);
  }

  /** Dev helper: the roll is ready right now. */
  reset(): void {
    this.readyAt = gameClock.now;
    const payload: DodgeCooldownPayload = { durationMs: 0 };
    bus.emit(Events.DodgeCooldown, payload);
  }
}
