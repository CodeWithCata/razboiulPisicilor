/** @file The placeholder sounds: one small Web Audio generator per SoundId. */
import type { SoundId } from '../../assets/audioKeys';
import { midiToHz, noise, tone } from './synth';

/**
 * The placeholder sounds, one small generator per sound id. `t` is when it starts on the audio clock,
 * `pitch` multiplies every frequency (1 = normal). They are meant to be replaced by real recordings
 * (see assets/audioManifest.ts), so they only need to be recognisable and not annoying.
 */
type Generator = (ctx: AudioContext, out: AudioNode, t: number, pitch: number) => void;

const arpeggio = (ctx: AudioContext, out: AudioNode, t: number, pitch: number, notes: readonly number[], step: number, wave: OscillatorType, gain: number): void => {
  notes.forEach((note, i) => {
    tone(ctx, out, { type: wave, freq: midiToHz(note) * pitch, start: t + i * step, dur: step * 1.6, gain });
  });
};

export const SYNTH: Record<SoundId, Generator> = {
  swing: (ctx, out, t, p) => {
    noise(ctx, out, { start: t, dur: 0.14, gain: 0.5, filter: 'bandpass', freq: 1400 * p, freqEnd: 350 * p, q: 1.5 });
  },

  hit: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 240 * p, freqEnd: 70 * p, start: t, dur: 0.12, gain: 0.9 });
    noise(ctx, out, { start: t, dur: 0.05, gain: 0.45, filter: 'highpass', freq: 2200 });
  },

  // A cartoon "miau": a buzzy voice rising and falling through a moving vowel filter.
  miau: (ctx, out, t, p) => {
    const dur = 0.42;
    const voice = ctx.createOscillator();
    const vowel = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(520 * p, t);
    voice.frequency.linearRampToValueAtTime(900 * p, t + 0.13);
    voice.frequency.exponentialRampToValueAtTime(470 * p, t + dur);
    vowel.type = 'lowpass';
    vowel.Q.value = 5;
    vowel.frequency.setValueAtTime(650, t);
    vowel.frequency.linearRampToValueAtTime(2300, t + 0.13);
    vowel.frequency.exponentialRampToValueAtTime(800, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(0.45, t + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    voice.connect(vowel).connect(amp).connect(out);
    voice.start(t);
    voice.stop(t + dur + 0.05);
  },

  kill: (ctx, out, t, p) => {
    arpeggio(ctx, out, t, p, [76, 71, 67, 60], 0.05, 'square', 0.22);
    noise(ctx, out, { start: t, dur: 0.12, gain: 0.3, filter: 'highpass', freq: 3000 });
  },

  hurt: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sawtooth', freq: 330 * p, freqEnd: 110 * p, start: t, dur: 0.28, gain: 0.5 });
    noise(ctx, out, { start: t, dur: 0.1, gain: 0.3, filter: 'lowpass', freq: 900 });
  },

  pickup: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 660 * p, start: t, dur: 0.09, gain: 0.5 });
    tone(ctx, out, { type: 'sine', freq: 990 * p, start: t + 0.07, dur: 0.16, gain: 0.5 });
  },

  bonk: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'triangle', freq: 320 * p, freqEnd: 90 * p, start: t, dur: 0.16, gain: 0.9 });
    noise(ctx, out, { start: t, dur: 0.04, gain: 0.4, filter: 'bandpass', freq: 1800 });
  },

  caw: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sawtooth', freq: 430 * p, freqEnd: 240 * p, start: t, dur: 0.3, gain: 0.35, vibratoHz: 38, vibratoDepth: 40 });
    noise(ctx, out, { start: t, dur: 0.28, gain: 0.25, filter: 'bandpass', freq: 1100, q: 2 });
  },

  explosion: (ctx, out, t, p) => {
    noise(ctx, out, { start: t, dur: 0.7, gain: 0.9, filter: 'lowpass', freq: 1500 * p, freqEnd: 70, q: 0.8 });
    tone(ctx, out, { type: 'sine', freq: 110 * p, freqEnd: 35, start: t, dur: 0.5, gain: 0.9 });
  },

  deflect: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'square', freq: 1200 * p, freqEnd: 1900 * p, start: t, dur: 0.09, gain: 0.25 });
    tone(ctx, out, { type: 'triangle', freq: 2400 * p, start: t, dur: 0.18, gain: 0.3 });
  },

  // A rubbery "boing" for a stunned boss.
  stun: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 520 * p, freqEnd: 140 * p, start: t, dur: 0.55, gain: 0.7, vibratoHz: 16, vibratoDepth: 60 });
  },

  bossIntro: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sawtooth', freq: 130 * p, freqEnd: 92 * p, start: t, dur: 0.9, gain: 0.45, attack: 0.06 });
    tone(ctx, out, { type: 'square', freq: 65 * p, freqEnd: 46 * p, start: t, dur: 0.9, gain: 0.4, attack: 0.06 });
    noise(ctx, out, { start: t, dur: 0.6, gain: 0.2, filter: 'lowpass', freq: 500 });
  },

  waveStart: (ctx, out, t, p) => {
    arpeggio(ctx, out, t, p, [60, 64, 67], 0.1, 'triangle', 0.4);
  },

  victory: (ctx, out, t, p) => {
    arpeggio(ctx, out, t, p, [60, 64, 67, 72, 67, 72, 76], 0.14, 'square', 0.22);
    tone(ctx, out, { type: 'triangle', freq: midiToHz(84) * p, start: t + 0.98, dur: 0.7, gain: 0.3 });
  },

  // ---- arena props ----
  rustle: (ctx, out, t, p) => {
    noise(ctx, out, { start: t, dur: 0.2, gain: 0.35, filter: 'bandpass', freq: 3200 * p, freqEnd: 1700 * p, q: 0.9 });
    noise(ctx, out, { start: t + 0.05, dur: 0.16, gain: 0.25, filter: 'highpass', freq: 4800 * p });
    noise(ctx, out, { start: t + 0.11, dur: 0.12, gain: 0.18, filter: 'bandpass', freq: 2600 * p, q: 1.4 });
  },

  thud: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 170 * p, freqEnd: 50 * p, start: t, dur: 0.16, gain: 0.9 });
    noise(ctx, out, { start: t, dur: 0.05, gain: 0.45, filter: 'lowpass', freq: 900 });
  },

  // A tin can: two bright, slightly out-of-tune rings and a tiny click.
  clank: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'triangle', freq: 1560 * p, start: t, dur: 0.22, gain: 0.26 });
    tone(ctx, out, { type: 'sine', freq: 2340 * p, start: t, dur: 0.18, gain: 0.18 });
    tone(ctx, out, { type: 'triangle', freq: 1210 * p, start: t + 0.06, dur: 0.2, gain: 0.2 });
    noise(ctx, out, { start: t, dur: 0.03, gain: 0.35, filter: 'highpass', freq: 6000 });
  },

  boing: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 200 * p, freqEnd: 520 * p, start: t, dur: 0.12, gain: 0.5 });
    tone(ctx, out, { type: 'sine', freq: 520 * p, freqEnd: 240 * p, start: t + 0.1, dur: 0.22, gain: 0.45, vibratoHz: 16, vibratoDepth: 30 });
  },

  // Knock on a hollow box or a wooden post: two quick taps.
  knock: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'triangle', freq: 210 * p, freqEnd: 120 * p, start: t, dur: 0.09, gain: 0.85 });
    noise(ctx, out, { start: t, dur: 0.05, gain: 0.45, filter: 'bandpass', freq: 850 * p, q: 1.2 });
    tone(ctx, out, { type: 'triangle', freq: 190 * p, freqEnd: 105 * p, start: t + 0.075, dur: 0.08, gain: 0.5 });
  },

  // Something big breaks: a crunch of noise falling away, a low thump, and a few bright bits.
  smash: (ctx, out, t, p) => {
    noise(ctx, out, { start: t, dur: 0.5, gain: 0.8, filter: 'lowpass', freq: 2600 * p, freqEnd: 180, q: 0.8 });
    tone(ctx, out, { type: 'sine', freq: 150 * p, freqEnd: 40, start: t, dur: 0.36, gain: 0.85 });
    noise(ctx, out, { start: t + 0.04, dur: 0.1, gain: 0.35, filter: 'highpass', freq: 3500 });
    noise(ctx, out, { start: t + 0.14, dur: 0.08, gain: 0.25, filter: 'highpass', freq: 4500 });
  },

  // A heartbeat, "lub-dub": two soft low thumps, the second a little lighter.
  heartbeat: (ctx, out, t, p) => {
    tone(ctx, out, { type: 'sine', freq: 78 * p, freqEnd: 42 * p, start: t, dur: 0.16, gain: 0.95 });
    noise(ctx, out, { start: t, dur: 0.06, gain: 0.25, filter: 'lowpass', freq: 220 });
    tone(ctx, out, { type: 'sine', freq: 70 * p, freqEnd: 40 * p, start: t + 0.17, dur: 0.14, gain: 0.65 });
  },

  // Sad trombone: "wah wah wah wahhh".
  gameOver: (ctx, out, t, p) => {
    const notes = [62, 61, 60, 59];
    notes.forEach((note, i) => {
      const last = i === notes.length - 1;
      tone(ctx, out, {
        type: 'sawtooth',
        freq: midiToHz(note) * p,
        freqEnd: last ? midiToHz(note - 3) * p : undefined,
        start: t + i * 0.3,
        dur: last ? 0.9 : 0.28,
        gain: 0.3,
        vibratoHz: last ? 6 : undefined,
        vibratoDepth: last ? 6 : undefined,
      });
    });
  },
};
