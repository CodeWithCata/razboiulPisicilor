/** @file What each pickup does when collected (one case per PickupKind); the question mark gambles on a good or a bad one. */
import type Phaser from 'phaser';
import { SMOKE_BREAK, SMOKE_BREAK_ON } from '../config/animation';
import { COSTLY } from '../config/curses';
import { isBadPickup, MYSTERY, PICKUPS, SMOKE_FREEZE, type BadKind, type BuffKind, type GoodPrize, type MysteryPrize, type PickupKind } from '../config/balance';
import { stackRule } from '../config/buffStacks';
import { bus, Events, type BuffStackedPayload, type PickupPayload } from '../core/events';
import { markSeen } from '../core/almanac';
import { getDifficulty } from '../core/difficulty';
import { weightedPick } from '../core/random';
import type { Player } from '../entities/Player';
import type { CrowRainSystem } from './CrowRainSystem';
import type { CurseSystem } from './CurseSystem';
import type { PowerUpSystem } from './PowerUpSystem';

export interface PickupContext {
  /** The scene that owns the run: the question mark uses its timers (they respect pause and slow-mo). */
  scene: Phaser.Scene;
  player: Player;
  powerUps: PowerUpSystem;
  crowRain: CrowRainSystem;
  /** Bad luck gate (null before it exists): healing costs lungs. */
  curses: CurseSystem | null;
}

/** What each pickup actually does. Add a new pickup kind = add one case here. */
export function applyPickup(kind: PickupKind, ctx: PickupContext, durationMs?: number): void {
  markSeen(kind); // the almanac unlocks this pickup
  if (SMOKE_BREAK.enabled && SMOKE_BREAK_ON.includes(kind)) ctx.player.smokeBreak(); // food and energy drink: a drag of his cigarette
  switch (kind) {
    case 'crochete':
      ctx.curses?.roll(COSTLY.lungs.chance, 'smoke'); // BEFORE the heal: mercy looks at his health as he grabbed it. Healing costs lungs: sometimes a 1 s smoke break on top
      ctx.player.heal(PICKUPS.crocheteHeal * getDifficulty().heal);
      break;
    case 'lapte':
    case 'monster':
    case 'goldenBelt':
    case 'laser':
    case 'umbrella':
    case 'scooter':
    case 'snail':
    case 'dumbbell':
    case 'emo':
    case 'rusty':
    case 'big':
      stacked(kind, ctx.powerUps.addBuff(kind, durationMs), ctx);
      if (kind === 'goldenBelt') ctx.player.goldenBeltFlourish();
      if (kind === 'lapte') ctx.player.milkSplash();
      if (kind === 'monster') ctx.player.backflip(); // energy: one back flip (animation only; the Z z z trail comes from the buff)
      break;
    case 'iceCream':
      bus.emit(Events.IceCream, { x: ctx.player.x, y: ctx.player.y }); // IceCreamSystem freezes the cats around him
      break;
    case 'crow':
      ctx.crowRain.start();
      break;
    case 'smoke':
      ctx.player.freeze(SMOKE_FREEZE.ms); // bad: he stops for a drag of his cigarette
      break;
    case 'mystery':
      revealMystery(ctx);
      break;
  }
}

/** A buff that stacks (Monster) grew by one: tell the FX (word, sparks). The first stack is just the normal pickup. */
function stacked(kind: BuffKind, stacks: number, ctx: PickupContext): void {
  const rule = stackRule(kind);
  if (!rule || stacks < 2) return;
  const payload: BuffStackedPayload = { kind, stacks, max: rule.max, x: ctx.player.x, y: ctx.player.y };
  bus.emit(Events.BuffStacked, payload);
}

/** Dev only (the debug card's "Semnul ? dă" picker): what the question mark must give. null = the normal gamble. */
export type MysteryForce = 'good' | 'bad' | MysteryPrize;
export const mysteryDebug: { force: MysteryForce | null } = { force: null };

/** The gamble: a bad prize with chance `MYSTERY.badChance`, otherwise a good one (the debug card can force either, or one exact prize). */
function rollMysteryPrize(): MysteryPrize {
  const force = mysteryDebug.force;
  if (force && force !== 'good' && force !== 'bad') return force;
  const bad = force === 'bad' || (force !== 'good' && Math.random() < Math.min(0.9, MYSTERY.badChance * getDifficulty().mysteryBad));
  return bad ? weightedPick<BadKind>(MYSTERY.badWeights) : weightedPick<GoodPrize>(MYSTERY.goodWeights);
}

/** Tell the game what Varu got: a BAD pickup gets its own show (`BadPickup`), everything else the normal `PickupCollected`. */
export function announcePickup(payload: PickupPayload): void {
  bus.emit(isBadPickup(payload.kind) ? Events.BadPickup : Events.PickupCollected, payload);
}

/**
 * The question mark is a gamble: a beat later it turns into a GOOD pickup or, with chance `MYSTERY.badChance`, a BAD one
 * (the snail or the dumbbell), which takes effect as if Varu had just grabbed it.
 * The prize is announced through `announcePickup` (label, sparks, sound; the crow banner and the bad-luck show come with it).
 * A prize can never be another question mark (`MysteryPrize` leaves it out), so this cannot loop.
 */
function revealMystery(ctx: PickupContext): void {
  const prize = rollMysteryPrize();
  ctx.scene.time.delayedCall(MYSTERY.revealMs, () => {
    if (!ctx.player.active || !ctx.player.alive) return; // he died during the drum roll: nothing to give
    announcePickup({ kind: prize, x: ctx.player.x, y: ctx.player.y });
    applyPickup(prize, ctx);
  });
}
