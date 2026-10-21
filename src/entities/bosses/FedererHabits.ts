/** @file Federer's memory of the last seconds of Varu (how far he stays, how many balls he swats) and the attack-weight shifts it gives (never more than +-FEDERER.habits.maxShift). Plain data, no Phaser. */
import { FEDERER } from '../../config/bosses';

/** Multipliers for her attack weights: 1 = no change, always between 1 - maxShift and 1 + maxShift. */
export interface HabitShifts {
  /** Lobs and serves: likelier when Varu camps far away. */
  lobServe: number;
  /** Dashes: likelier when Varu hugs her. */
  dash: number;
  /** Volleys: rarer when Varu swats a lot. */
  volley: number;
}

export const NEUTRAL_SHIFTS: HabitShifts = { lobServe: 1, dash: 1, volley: 1 };

/** Fewer samples than this (about 2 s) and she does not judge yet. */
const MIN_SAMPLES = 8;

/**
 * She looks at Varu every `sampleMs` and remembers `windowMs`. `shifts` turns what she saw into weight multipliers. Times are game ms, passed in
 * by the caller (so this stays testable with plain node).
 */
export class FedererHabits {
  private readonly samples: Array<{ t: number; dist: number }> = [];
  private readonly swats: number[] = [];
  private nextSampleAt = 0;

  /** Call every frame with the distance between her and Varu; it only keeps one sample per `sampleMs`. */
  sample(now: number, dist: number): void {
    if (now < this.nextSampleAt) return;
    this.nextSampleAt = now + FEDERER.habits.sampleMs;
    this.samples.push({ t: now, dist });
  }

  /** Varu swatted a ball back. */
  swat(now: number): void {
    this.swats.push(now);
  }

  /** Forget what is older than the window. */
  private prune(now: number): void {
    const from = now - FEDERER.habits.windowMs;
    while (this.samples.length > 0 && this.samples[0]!.t < from) this.samples.shift();
    while (this.swats.length > 0 && this.swats[0]! < from) this.swats.shift();
  }

  /** The weight multipliers for what she has seen in the last seconds. */
  shifts(now: number): HabitShifts {
    this.prune(now);
    const H = FEDERER.habits;
    const n = this.samples.length;
    if (n < MIN_SAMPLES) return NEUTRAL_SHIFTS;
    let far = 0;
    let near = 0;
    for (const s of this.samples) {
      if (s.dist > H.farPx) far += 1;
      else if (s.dist < H.nearPx) near += 1;
    }
    const swatShare = Math.min(1, this.swats.length / H.swatsMany);
    return {
      lobServe: 1 + H.maxShift * (far / n),
      dash: 1 + H.maxShift * (near / n),
      volley: 1 - H.maxShift * swatShare,
    };
  }
}
