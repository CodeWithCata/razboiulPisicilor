/** @file What each pickup does when collected (one case per PickupKind); the question mark rolls a random other one. */
import type Phaser from 'phaser';
import { SMOKE_BREAK, SMOKE_BREAK_ON } from '../config/animation';
import { MYSTERY, PICKUPS, type MysteryPrize, type PickupKind } from '../config/balance';
import { bus, Events, type PickupPayload } from '../core/events';
import { weightedPick } from '../core/random';
import type { Player } from '../entities/Player';
import type { CrowRainSystem } from './CrowRainSystem';
import type { PowerUpSystem } from './PowerUpSystem';

export interface PickupContext {
  /** The scene that owns the run: the question mark uses its timers (they respect pause and slow-mo). */
  scene: Phaser.Scene;
  player: Player;
  powerUps: PowerUpSystem;
  crowRain: CrowRainSystem;
}

/** What each pickup actually does. Add a new pickup kind = add one case here. */
export function applyPickup(kind: PickupKind, ctx: PickupContext): void {
  if (SMOKE_BREAK.enabled && SMOKE_BREAK_ON.includes(kind)) ctx.player.smokeBreak(); // food and energy drink: a drag of his cigarette
  switch (kind) {
    case 'crochete':
      ctx.player.heal(PICKUPS.crocheteHeal);
      break;
    case 'lapte':
    case 'monster':
    case 'goldenBelt':
    case 'laser':
      ctx.powerUps.addBuff(kind);
      if (kind === 'goldenBelt') ctx.player.goldenBeltFlourish();
      if (kind === 'lapte') ctx.player.milkSplash();
      if (kind === 'monster') ctx.player.backflip(); // energy: one back flip (animation only; the Z z z trail comes from the buff)
      break;
    case 'crow':
      ctx.crowRain.start();
      break;
    case 'mystery':
      revealMystery(ctx);
      break;
  }
}

/**
 * The question mark: a beat later it turns into a random OTHER pickup, which takes effect as if Varu had just grabbed it.
 * The prize is announced through the normal PickupCollected event (its label, sparks, sound and the crow banner all come for free).
 * A prize can never be another question mark (`MysteryPrize` leaves it out), so this cannot loop.
 */
function revealMystery(ctx: PickupContext): void {
  const prize: MysteryPrize = weightedPick(MYSTERY.prizeWeights);
  ctx.scene.time.delayedCall(MYSTERY.revealMs, () => {
    if (!ctx.player.active || !ctx.player.alive) return; // he died during the drum roll: nothing to give
    const payload: PickupPayload = { kind: prize, x: ctx.player.x, y: ctx.player.y };
    bus.emit(Events.PickupCollected, payload);
    applyPickup(prize, ctx);
  });
}
