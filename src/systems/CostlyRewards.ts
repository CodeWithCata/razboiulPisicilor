/** @file Rewards that cost something: Monster ends = maybe a short Emo, golden belt ends = maybe 2 s of Snail (chance grows with the wave), spin / throw spam = Rusty. (Healing costs lungs is in pickupEffects.) */
import Phaser from 'phaser';
import { COSTLY } from '../config/curses';
import { COSTLY_LINES } from '../content/lines';
import type { BuffKind } from '../config/balance';
import { gameClock } from '../core/clock';
import { Events, listen, type BuffEndedPayload } from '../core/events';
import type { CurseSystem } from './CurseSystem';

/**
 * Listens for buffs that run out by themselves (`Events.BuffEnded`) and for belt specials. Every price goes through `CurseSystem`, so
 * waves 1-3 and mercy hold. Random ones (`roll`: crash, goo) get the cooldown, the wave ramp and greed; the sure one (rust) uses `forceWaveState` (no cooldown check).
 */
export class CostlyRewards {
  /** Game times of the recent spins and throws (only those inside the window are kept). */
  private uses: number[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly curses: CurseSystem,
    private readonly hasBuff: (kind: BuffKind) => boolean,
    private readonly say: (text: string) => void,
  ) {
    const off = [
      listen<BuffEndedPayload>(Events.BuffEnded, ({ kind, stacks }) => this.onBuffEnded(kind, stacks)),
      listen(Events.BeltSpin, () => this.onSpecial()),
      listen(Events.BeltThrow, () => this.onSpecial()),
      listen(Events.WaveStarted, () => (this.uses = [])),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  private onBuffEnded(kind: BuffKind, stacks: number): void {
    if (kind === 'monster') {
      const C = COSTLY.crash;
      const extra = Math.max(0, stacks - 1); // more Monster cans stacked = a harder crash
      if (this.curses.roll(Math.min(C.maxChance, C.chance + extra * C.perStack), 'emo', C.durationMs + extra * C.durationPerStackMs)) this.say(COSTLY_LINES.crash);
    } else if (kind === 'goldenBelt') {
      if (this.curses.roll(COSTLY.goo.chance, 'snail', COSTLY.goo.durationMs)) this.say(COSTLY_LINES.goo);
    }
  }

  /** A spin or a throw: 6 in 10 s (needs real spam) makes the belt rusty. Uses while it is already rusty are ignored, or it would trigger forever. */
  private onSpecial(): void {
    if (this.hasBuff('rusty')) {
      this.uses = [];
      return;
    }
    const now = gameClock.now;
    this.uses = this.uses.filter((t) => now - t <= COSTLY.overuse.windowMs);
    this.uses.push(now);
    if (this.uses.length < COSTLY.overuse.uses) return;
    this.uses = [];
    if (this.curses.forceWaveState('rusty')) this.say(COSTLY_LINES.overuse);
  }
}
