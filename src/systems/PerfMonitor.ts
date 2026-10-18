import { PERF } from '../config/perf';

/** What the monitor measured since the last `take()`. */
export interface PerfSample {
  fps: number;
  frameAvgMs: number;
  frameMinMs: number;
  frameMaxMs: number;
  slowFrames: number;
  frames: number;
  walkFrames: number;
  stalledFrames: number;
  stepAvg: number;
  stepMax: number;
}

/**
 * Measures how smooth the game runs: real frame times (not Phaser's smoothed delta) and how far Varu moves each frame while
 * he walks. A walking frame where he did not move is a \"stall\": the picture stood still for a frame, which feels like lag
 * (for example when the physics runs at 60 steps a second on a screen that draws 90 or 120 frames). Pure numbers, no Phaser.
 */
export class PerfMonitor {
  private lastTime = -1;
  private lastX = 0;
  private lastY = 0;
  private frames = 0;
  private sumMs = 0;
  private minMs = Number.POSITIVE_INFINITY;
  private maxMs = 0;
  private slow = 0;
  private walkFrames = 0;
  private stalled = 0;
  private stepSum = 0;
  private stepMax = 0;

  /** Call once per frame with the browser's timestamp, Varu's position and whether the player is pushing the stick / keys. */
  record(time: number, x: number, y: number, walking: boolean): void {
    const dt = time - this.lastTime;
    const step = Math.hypot(x - this.lastX, y - this.lastY);
    const measured = this.lastTime >= 0 && dt > 0 && dt < PERF.ignoreFrameMs;
    this.lastTime = time;
    this.lastX = x;
    this.lastY = y;
    if (!measured) return;

    this.frames += 1;
    this.sumMs += dt;
    this.minMs = Math.min(this.minMs, dt);
    this.maxMs = Math.max(this.maxMs, dt);
    if (dt > PERF.slowFrameMs) this.slow += 1;
    if (!walking) return;
    this.walkFrames += 1;
    this.stepSum += step;
    this.stepMax = Math.max(this.stepMax, step);
    if (step < PERF.stallStepPx) this.stalled += 1;
  }

  /** The numbers since the last call (null if there were no frames), and the window starts again. */
  take(): PerfSample | null {
    const sample: PerfSample | null =
      this.frames === 0
        ? null
        : {
            fps: (this.frames / this.sumMs) * 1000,
            frameAvgMs: this.sumMs / this.frames,
            frameMinMs: this.minMs,
            frameMaxMs: this.maxMs,
            slowFrames: this.slow,
            frames: this.frames,
            walkFrames: this.walkFrames,
            stalledFrames: this.stalled,
            stepAvg: this.walkFrames === 0 ? 0 : this.stepSum / this.walkFrames,
            stepMax: this.stepMax,
          };
    this.frames = 0;
    this.sumMs = 0;
    this.minMs = Number.POSITIVE_INFINITY;
    this.maxMs = 0;
    this.slow = 0;
    this.walkFrames = 0;
    this.stalled = 0;
    this.stepSum = 0;
    this.stepMax = 0;
    return sample;
  }
}
