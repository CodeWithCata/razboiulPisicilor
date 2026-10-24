/** @file Limits how many frames per second the game draws (the pause-menu slider, `getFpsLimit`). */
import Phaser from 'phaser';
import { FPS_LIMIT } from '../config/fpsLimit';
import { getFpsLimit } from './settings';

/** How long one frame should take (ms) at the chosen limit (0 when there is no limit). */
export const frameBudgetMs = (): number => {
  const limit = getFpsLimit();
  return limit > 0 ? 1000 / limit : 0;
};

/** Slow-frame test for the perf card and the crowd relief: a frame is "slow" when it is clearly longer than the limit asks for. */
export const slowAboveMs = (floorMs: number): number => Math.max(floorMs, frameBudgetMs() * FPS_LIMIT.slowShare);
export const fastBelowMs = (floorMs: number): number => Math.max(floorMs, frameBudgetMs() * FPS_LIMIT.fastShare);

/**
 * Wraps the game loop's callback: on a refresh where less than the wanted frame time has passed, nothing runs (no update, no
 * draw, the screen keeps the last picture). The time that passed is added up and handed to the next frame that does run, so the
 * game does not slow down: Varu walks the same speed at 30, 60 or 144 fps, only less often. Phaser's own `fps.limit` is not used
 * on purpose: this needs nothing but the public `loop.callback`, and it reads the slider on every frame, so a change takes effect at once.
 * Call once after `new Phaser.Game`.
 */
export function installFpsLimit(game: Phaser.Game): void {
  // The loop's callback is only set when the game starts, a little after the constructor: swap it on the very first step.
  game.events.once(Phaser.Core.Events.PRE_STEP, () => {
    const loop = game.loop;
    const run = loop.callback;
    let owedMs = 0;
    loop.callback = (time: number, delta: number): void => {
      const budget = frameBudgetMs();
      owedMs += delta;
      if (budget > 0 && owedMs < budget * FPS_LIMIT.earlyShare) return; // too early: wait for the next refresh (no limit: every refresh runs)
      const passed = owedMs;
      owedMs = 0;
      run(time, passed);
    };
  });
}
