/** @file A short "punch": a value that eases up to 1, holds, and eases back to 0, and can be hit again at any moment without a jump. Pure, no Phaser (testable with plain node). */

/** The three times of a punch, in ms. */
export interface PunchTimes {
  readonly inMs: number;
  readonly holdMs: number;
  readonly outMs: number;
}

/**
 * Drives one punch from real frame time. `trigger()` while it is already running does not restart from 0: it climbs from wherever the value
 * is now (so two hits in a row never make the camera jump back), and the hold starts over once it is at the top.
 */
export class PunchEnvelope {
  private phase: 'idle' | 'in' | 'hold' | 'out' = 'idle';
  private level = 0;
  private holdLeft = 0;
  private readonly times: PunchTimes;

  constructor(times: PunchTimes) {
    this.times = times;
  }

  /** 0..1, eased (smoothstep), so the start and the end of the punch have no corner. */
  get value(): number {
    return this.level * this.level * (3 - 2 * this.level);
  }

  get running(): boolean {
    return this.phase !== 'idle';
  }

  trigger(): void {
    this.phase = 'in';
  }

  /** Move on by `dtMs` of real time. Returns true while the value changed (or may have), so the caller knows to redraw. */
  step(dtMs: number): boolean {
    const T = this.times;
    switch (this.phase) {
      case 'idle':
        return false;
      case 'in':
        this.level = Math.min(1, this.level + dtMs / Math.max(1, T.inMs));
        if (this.level >= 1) {
          this.phase = 'hold';
          this.holdLeft = T.holdMs;
        }
        return true;
      case 'hold':
        this.holdLeft -= dtMs;
        if (this.holdLeft <= 0) this.phase = 'out';
        return true;
      case 'out':
        this.level = Math.max(0, this.level - dtMs / Math.max(1, T.outMs));
        if (this.level <= 0) this.phase = 'idle';
        return true;
    }
  }

  /** Back to nothing right now (a restart, the end of a run). */
  reset(): void {
    this.phase = 'idle';
    this.level = 0;
    this.holdLeft = 0;
  }
}
