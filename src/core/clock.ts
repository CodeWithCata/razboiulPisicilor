/** @file gameClock: game time that stops during pause. Use it for every deadline, never scene.time.now. */
import { CLOCK } from '../config/clock';

/**
 * Game time in ms: it only moves while the game is running, never while the pause menu is open.
 *
 * Phaser's own scene clock keeps following the real clock, so after a pause every deadline
 * ("wave starts at", "buff ends at", "belt ready at") would already be over. Everything that
 * stores a deadline uses `gameClock.now` instead, and GameScene feeds the clock once per frame.
 *
 * It only ever adds up DIFFERENCES between frames, so it works whatever time base Phaser uses.
 * Plain data, no Phaser: easy to test with node.
 */
class GameClock {
  private current = 0;
  private lastFrame: number | null = null;
  private scale = 1;

  /** Game time in ms. Constant during a frame. */
  get now(): number {
    return this.current;
  }

  /** How fast game time runs next to real time (1 = normal, 0.12 = the slow-mo of the last cat). Set by SlowMoSystem. */
  get timeScale(): number {
    return this.scale;
  }

  set timeScale(value: number) {
    this.scale = value > 0 ? value : 1;
  }

  /** A real frame time (ms) turned into game time: use it for anything that moves or animates by `delta`, so slow-mo reaches it too. */
  scaled(ms: number): number {
    return ms * this.scale;
  }

  /** A new run starts: `start` is the scene's current time, so deadlines made right now line up. */
  reset(start: number): void {
    this.current = start;
    this.lastFrame = null;
    this.scale = 1;
  }

  /** Call once per frame with the time Phaser passes to `update`. Returns the game time to use this frame. */
  advance(frameTime: number): number {
    if (this.lastFrame !== null) {
      const step = frameTime - this.lastFrame;
      if (step > 0 && step <= CLOCK.maxStepMs) this.current += step * this.scale;
    }
    this.lastFrame = frameTime;
    return this.current;
  }

  /** The game was paused: whatever time passed until the next frame does not count. */
  skipNextStep(): void {
    this.lastFrame = null;
  }
}

export const gameClock = new GameClock();
