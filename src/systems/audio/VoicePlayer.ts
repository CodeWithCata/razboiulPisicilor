/** @file Plays the recorded voice line of a cutscene (one at a time) through the effects bus; stops it when the line ends. */
import { VOICE_FILES, voiceKey } from '../../assets/voiceManifest';
import { VOICE } from '../../config/voice';

/**
 * One recorded line at a time. Files are fetched and decoded once, then kept.
 * A file that is missing or will not decode is remembered as broken: nothing plays and the caller's blips are the only sound.
 */
export class VoicePlayer {
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: AudioBufferSourceNode | null = null;
  /** Counts up per `play` / `stop`, so a file that finishes loading late never starts for a line that is already over. */
  private ticket = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {
    const files = Object.values(VOICE_FILES);
    if (files.length <= VOICE.preloadMaxFiles) files.forEach((file) => void this.load(file));
  }

  /** True when a file is listed for this line (the blips should stay quiet). It starts as soon as it is decoded. */
  play(speaker: string, text: string, volume: number): boolean {
    const file = VOICE_FILES[voiceKey(speaker, text)];
    if (!file || volume <= 0) return false;
    this.stop();
    const mine = ++this.ticket;
    void this.load(file).then((buffer) => {
      if (!buffer || mine !== this.ticket) return;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.buffer = buffer;
      source.connect(gain).connect(this.out);
      source.onended = () => {
        if (this.current === source) this.current = null;
      };
      source.start();
      this.current = source;
    });
    return true;
  }

  /** Cut the line off (the box moved on, the scene was skipped, mute). */
  stop(): void {
    this.ticket += 1;
    const source = this.current;
    this.current = null;
    if (!source) return;
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* already over */
    }
  }

  private load(file: string): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(file);
    if (!pending) {
      pending = fetch(`${import.meta.env.BASE_URL}${VOICE.dir}${file}`)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
        .then((data) => this.ctx.decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(file, pending);
    }
    return pending;
  }
}