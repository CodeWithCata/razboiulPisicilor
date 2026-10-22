/** @file Plays the synthesized placeholder for a sound id. */
import type { SoundId } from '../../assets/audioKeys';
import { SYNTH } from './sounds';

/** Plays the synthesized placeholder for a sound id. Real recordings go through the Phaser sound manager instead. */
export class SoundBank {
  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  play(id: SoundId, pitch = 1, volume = 1): void {
    if (!Number.isFinite(pitch) || !Number.isFinite(volume)) return; // AudioParam throws on NaN / Infinity: skip the sound instead of crashing the game
    const level = this.ctx.createGain();
    level.gain.value = volume;
    level.connect(this.out);
    SYNTH[id](this.ctx, level, this.ctx.currentTime, pitch);
  }
}
