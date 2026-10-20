/** @file Pure pose tweener for rigs: ease named numbers toward targets (with delays) and read them back every frame. No Phaser, testable with plain node. */

export type PoseEase = 'out' | 'in' | 'inOut';

const EASES: Record<PoseEase, (t: number) => number> = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

interface Move<K extends string> {
  key: K;
  from: number;
  to: number;
  ms: number;
  t: number;
  ease: PoseEase;
  delay: number;
  started: boolean;
}

/**
 * A bag of named numbers (`pose`) that glide to new values. Ask with `to`, call `update(dtMs)` every frame, read `pose`.
 * A newer move on the same number replaces the older one, so a call-off in the middle of a toss just turns around from where it is.
 */
export class PoseTween<K extends string> {
  readonly pose: Record<K, number>;
  private readonly moves: Array<Move<K>> = [];

  constructor(neutral: Record<K, number>) {
    this.pose = { ...neutral };
  }

  /** Ease some numbers to new values over `ms`, after an optional delay. */
  to(target: Partial<Record<K, number>>, ms: number, ease: PoseEase = 'out', delayMs = 0): void {
    for (const key of Object.keys(target) as K[]) {
      const to = target[key];
      if (to === undefined) continue;
      const move: Move<K> = { key, from: this.pose[key], to, ms, t: 0, ease, delay: delayMs, started: false };
      if (delayMs <= 0) this.start(move);
      this.moves.push(move);
    }
  }

  /** Jump a number to a value at once and forget every move on it. */
  snap(key: K, value: number): void {
    for (let i = this.moves.length - 1; i >= 0; i--) if (this.moves[i]!.key === key) this.moves.splice(i, 1);
    this.pose[key] = value;
  }

  /** Move time forward by `dtMs`. */
  update(dtMs: number): void {
    for (const m of [...this.moves]) {
      if (!this.moves.includes(m)) continue; // a move that started this frame may have replaced it
      if (!m.started) {
        m.delay -= dtMs;
        if (m.delay > 0) continue;
        this.start(m);
      }
      m.t += dtMs;
      const k = m.ms <= 0 ? 1 : Math.min(1, m.t / m.ms);
      this.pose[m.key] = m.from + (m.to - m.from) * EASES[m.ease](k);
      if (k >= 1) this.moves.splice(this.moves.indexOf(m), 1);
    }
  }

  /** A move begins from wherever its number is right now and replaces any running move on the same number. */
  private start(move: Move<K>): void {
    move.started = true;
    move.from = this.pose[move.key];
    for (let i = this.moves.length - 1; i >= 0; i--) {
      const other = this.moves[i]!;
      if (other !== move && other.started && other.key === move.key) this.moves.splice(i, 1);
    }
  }
}
