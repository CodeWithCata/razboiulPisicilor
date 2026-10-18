/** Counts kills that follow each other quickly. No Phaser, just numbers. */
export class KillStreak {
  private count = 0;
  private lastAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly windowMs: number) {}

  /** Register a kill at `now` (ms) and get the current streak length. */
  hit(now: number): number {
    this.count = now - this.lastAt <= this.windowMs ? this.count + 1 : 1;
    this.lastAt = now;
    return this.count;
  }

  reset(): void {
    this.count = 0;
    this.lastAt = Number.NEGATIVE_INFINITY;
  }
}
