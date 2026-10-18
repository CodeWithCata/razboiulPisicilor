import type { MusicId } from '../../assets/audioKeys';
import { AUDIO, TRACKS, type TrackDef } from '../../config/audio';
import { midiToHz, tone } from './synth';

/** Fade-out when a track stops, seconds, and the extra wait before its nodes are dropped. */
const STOP_FADE_SEC = 0.15;
/** After a long pause (tab in the background) the song restarts this far ahead instead of racing to catch up. */
const RESTART_AHEAD_SEC = 0.05;

/**
 * A tiny step sequencer that plays the generated placeholder music loops (config/audio.ts TRACKS).
 * It schedules notes a little ahead of the audio clock, the standard way to keep Web Audio in time.
 */
export class MusicPlayer {
  private timer: number | null = null;
  private trackGain: GainNode | null = null;
  private nextTime = 0;
  private step = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  play(id: MusicId): void {
    this.stop();
    const def = TRACKS[id];
    const gain = this.ctx.createGain();
    gain.connect(this.out);
    this.trackGain = gain;
    this.nextTime = this.ctx.currentTime + RESTART_AHEAD_SEC;
    this.step = 0;
    this.schedule(def, gain);
    this.timer = window.setInterval(() => this.schedule(def, gain), AUDIO.schedulerIntervalMs);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const gain = this.trackGain;
    this.trackGain = null;
    if (!gain) return;
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, STOP_FADE_SEC / 3);
    window.setTimeout(() => gain.disconnect(), STOP_FADE_SEC * 4000);
  }

  private schedule(def: TrackDef, gain: GainNode): void {
    const stepSec = 60 / def.bpm / 2; // one entry = one 8th note
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + RESTART_AHEAD_SEC;

    while (this.nextTime < this.ctx.currentTime + AUDIO.scheduleAheadSec) {
      this.note(def.bass[this.step % def.bass.length], def.bassWave, def.bassVolume, this.nextTime, stepSec, gain);
      this.note(def.lead[this.step % def.lead.length], def.leadWave, def.leadVolume, this.nextTime, stepSec, gain);
      this.nextTime += stepSec;
      this.step += 1;
    }
  }

  private note(midi: number | null | undefined, type: OscillatorType, volume: number, start: number, stepSec: number, out: AudioNode): void {
    if (midi === null || midi === undefined) return;
    tone(this.ctx, out, { type, freq: midiToHz(midi), start, dur: stepSec * 0.92, gain: volume, attack: 0.01 });
  }
}
