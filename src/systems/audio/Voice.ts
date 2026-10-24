/** @file Spoken lines: the browser's own speech voice (a Romanian one when the device has it) says a line out loud. No audio files. Silent where speech is not supported. */

export interface VoiceOptions {
  /** BCP 47 tag, like 'ro-RO'. */
  lang: string;
  rate: number;
  pitch: number;
  /** 0..1 */
  volume: number;
}

const supported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

const language = (tag: string): string => tag.toLowerCase().split(/[-_]/)[0]!;

/** A voice for the language, if the device lists one (Chrome fills the list late, so an empty list is normal: `utterance.lang` still lets the browser choose). */
function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const wanted = language(lang);
  return window.speechSynthesis.getVoices().find((v) => language(v.lang) === wanted);
}

/** Say `text` now, cutting off whatever was being said. Never throws: a device that refuses just stays quiet. */
export function speak(text: string, options: VoiceOptions): void {
  if (!supported() || options.volume <= 0) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = Math.min(1, Math.max(0, options.volume));
    const voice = voiceFor(options.lang);
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch {
    /* speech is only a bonus */
  }
}

/** Stop talking (mute, the game closing). */
export function stopSpeaking(): void {
  if (!supported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to stop */
  }
}
