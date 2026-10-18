/** Tiny Web Audio building blocks for the placeholder sounds. No Phaser in here. */

export interface ToneOptions {
  type: OscillatorType;
  freq: number;
  /** If set, the pitch glides to this frequency by the end of the tone. */
  freqEnd?: number;
  /** Start time on the audio clock (seconds). */
  start: number;
  dur: number;
  gain: number;
  /** Fade-in time, seconds. */
  attack?: number;
  /** Wobble the pitch: speed in Hz and depth in Hz. */
  vibratoHz?: number;
  vibratoDepth?: number;
}

const SILENCE = 0.0001;

export function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, o.start);
  if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), o.start + o.dur);

  const attack = Math.min(o.attack ?? 0.008, o.dur / 2);
  amp.gain.setValueAtTime(SILENCE, o.start);
  amp.gain.linearRampToValueAtTime(o.gain, o.start + attack);
  amp.gain.exponentialRampToValueAtTime(SILENCE, o.start + o.dur);

  if (o.vibratoHz && o.vibratoDepth) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = o.vibratoHz;
    depth.gain.value = o.vibratoDepth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(o.start);
    lfo.stop(o.start + o.dur + 0.05);
  }

  osc.connect(amp).connect(out);
  osc.start(o.start);
  osc.stop(o.start + o.dur + 0.05);
}

export interface NoiseOptions {
  start: number;
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

export function noise(ctx: BaseAudioContext, out: AudioNode, o: NoiseOptions): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filt = ctx.createBiquadFilter();
  filt.type = o.filter;
  filt.Q.value = o.q ?? 1;
  filt.frequency.setValueAtTime(o.freq, o.start);
  if (o.freqEnd !== undefined) filt.frequency.exponentialRampToValueAtTime(Math.max(10, o.freqEnd), o.start + o.dur);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(o.gain, o.start);
  amp.gain.exponentialRampToValueAtTime(SILENCE, o.start + o.dur);

  src.connect(filt).connect(amp).connect(out);
  src.start(o.start);
  src.stop(o.start + o.dur + 0.05);
}

/** MIDI note number to frequency (69 = A4 = 440 Hz). */
export const midiToHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);
