import { SMOKE_BREAK, SMOKE_BREAK_ON } from '../config/animation';
import { PICKUPS, type PickupKind } from '../config/balance';
import type { Player } from '../entities/Player';
import type { CrowRainSystem } from './CrowRainSystem';
import type { PowerUpSystem } from './PowerUpSystem';

export interface PickupContext {
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
      break;
    case 'crow':
      ctx.crowRain.start();
      break;
  }
}
