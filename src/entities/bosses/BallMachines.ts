/** @file Federer's three ball launchers (two on the left edge, one on the right): they glide to follow Varu's height at an angle and fire one at a time, in turn; now and then the left pair fires together (crossfire), and in the rage they glide faster. */
import Phaser from 'phaser';
import { PLAY_AREA } from '../../config/arena';
import { FEDERER } from '../../config/bosses';
import { BallMachine, type MachineFrame } from './BallMachine';

/**
 * Owns the launchers of `FEDERER.machine.units`. Every frame it (1) glides each waiting launcher along its edge to Varu's height plus its own
 * offset (so the shots come in at an angle; the right launcher flips its side after each of its volleys; two launchers on one edge keep
 * `gapPx` apart), and (2) hands the turn out: only the launcher at `order[turn]` may start a volley, only one lane is live at a time, and
 * `intervalMs` passes between two turns. v170 CROSSFIRE: on a turn of a left launcher the two left launchers may fire together (upper one down-slanting
 * lanes, lower one up-slanting lanes: an X). v170 RAGE: they glide faster. Same interface the boss used for the single machine: `update`, `busy`, `destroy`.
 */
export class BallMachines {
  private readonly units: BallMachine[];
  /** +1 / -1 per launcher: the side of Varu it aims from (it flips after the launcher's volley). */
  private readonly sides: Array<1 | -1>;
  private readonly seenVolleys: number[];
  private turn = 0;
  /** What the current turn is: not decided yet (null), one launcher, or the left pair together. Decided once, when the turn can start. */
  private plan: 'single' | 'cross' | null = null;
  /** Launchers of a crossfire that have finished their volley, and whether the last turn was a crossfire (never two in a row). */
  private crossDone = 0;
  private lastWasCross = false;
  private rage = false;
  private nextTurnAt: number;
  private lastNow: number;

  constructor(scene: Phaser.Scene, playerY: number, now: number) {
    const M = FEDERER.machine;
    this.sides = M.units.map(() => 1);
    this.units = M.units.map((u) => new BallMachine(scene, u.edge, this.clampY(playerY + u.offsetPx)));
    this.seenVolleys = this.units.map(() => 0);
    this.nextTurnAt = now + M.firstDelayMs;
    this.lastNow = now;
  }

  /** True while any launcher has a lane drawn, balls leaving or just left (a damage source for the budget). */
  busy(now: number): boolean {
    return this.units.some((u) => u.busy(now));
  }

  update(f: MachineFrame): void {
    const M = FEDERER.machine;
    const dt = Phaser.Math.Clamp(f.now - this.lastNow, 0, 100) / 1000;
    this.lastNow = f.now;
    this.rage = f.rage;
    if (!f.paused) this.glide(f.playerY, dt);

    const turnIndex = M.order[this.turn % M.order.length]!;
    const liveLane = this.units.some((u) => u.active);
    const canStart = f.allowed && !liveLane && f.now >= this.nextTurnAt;
    const leftIds = this.leftIdsTopFirst();
    // Crossfire is decided once per turn: only on a turn of a left launcher, and never twice in a row.
    if (canStart && this.plan === null) {
      const eligible = M.units[turnIndex]!.edge === 'left' && leftIds.length === 2 && !this.lastWasCross;
      this.plan = eligible && Math.random() < M.crossfire.chance[f.rage ? 1 : 0] ? 'cross' : 'single';
    }
    this.units.forEach((u, i) => {
      const cross = this.plan === 'cross';
      const myTurn = cross ? leftIds.includes(i) : i === turnIndex;
      const bias = cross ? (i === leftIds[0] ? 1 : -1) : 0; // the upper launcher shoots down, the lower one up
      u.update({ ...f, allowed: canStart && myTurn, bias });
      if (u.volleys > this.seenVolleys[i]!) {
        // That launcher has fired: it will aim from the other side of Varu next time. The turn passes on once the whole turn has fired.
        this.seenVolleys[i] = u.volleys;
        this.sides[i] = this.sides[i] === 1 ? -1 : 1;
        this.crossDone += 1;
        if (this.crossDone >= (cross ? 2 : 1)) this.endTurn(f.now, f.rage, cross);
      }
    });
    if (f.paused) {
      this.nextTurnAt = Math.max(this.nextTurnAt, f.now + 500); // towel break: nothing starts right after it
      this.plan = null; // a volley that was dropped is decided again afterwards
      this.crossDone = 0;
    }
  }

  /** The turn is over: the next launcher is up after the pause. */
  private endTurn(now: number, rage: boolean, wasCross: boolean): void {
    this.crossDone = 0;
    this.plan = null;
    this.lastWasCross = wasCross;
    this.turn = (this.turn + 1) % FEDERER.machine.order.length;
    this.nextTurnAt = now + FEDERER.machine.intervalMs[rage ? 1 : 0];
  }

  /** The indexes of the two left launchers, the one that stands higher on the screen first (empty / short if there are fewer). */
  private leftIdsTopFirst(): number[] {
    const ids = FEDERER.machine.units.map((_, i) => i).filter((i) => FEDERER.machine.units[i]!.edge === 'left');
    return ids.sort((a, b) => this.units[a]!.y - this.units[b]!.y);
  }

  /** Moves every waiting launcher towards its target height. */
  private glide(playerY: number, dt: number): void {
    const M = FEDERER.machine;
    const targets = M.units.map((u, i) => this.clampY(playerY + u.offsetPx * (u.edge === 'right' ? this.sides[i]! : 1)));
    for (const edge of ['left', 'right'] as const) {
      const ids = M.units.map((_, i) => i).filter((i) => M.units[i]!.edge === edge).sort((a, b) => targets[a]! - targets[b]!);
      // Keep `gapPx` between neighbours: a launcher that is aiming stays where it is, the others make room.
      for (let k = 1; k < ids.length; k++) {
        const above = ids[k - 1]!;
        const below = ids[k]!;
        const minY = (this.units[above]!.active ? this.units[above]!.y : targets[above]!) + M.gapPx;
        if (targets[below]! < minY) targets[below] = Math.min(minY, PLAY_AREA.bottom - M.edgeMarginPx);
        if (targets[below]! - targets[above]! < M.gapPx) targets[above] = Math.max(targets[below]! - M.gapPx, PLAY_AREA.top + M.edgeMarginPx);
      }
    }
    this.units.forEach((u, i) => u.glide(targets[i]!, M.glidePxPerSec * (this.rage ? M.rageGlideFactor : 1) * dt));
  }

  private clampY(y: number): number {
    return Phaser.Math.Clamp(y, PLAY_AREA.top + FEDERER.machine.edgeMarginPx, PLAY_AREA.bottom - FEDERER.machine.edgeMarginPx);
  }

  /** `instant`: the scene is shutting down, so no fade-out. */
  destroy(instant = false): void {
    this.units.forEach((u) => u.destroy(instant));
  }
}
