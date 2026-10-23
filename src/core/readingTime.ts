/** @file `readMs`: how long a line of text should stay on screen so it can be read (see config/reading.ts). No Phaser. */
import { READING } from '../config/reading';

/** Time (ms) to read `text`: `baseMs + chars * msPerChar`, at least `minMs`, at most `maxMs` (the global cap by default). */
export function readMs(text: string, minMs = 0, maxMs: number = READING.maxMs): number {
  const wanted = READING.baseMs + text.length * READING.msPerChar;
  return Math.min(maxMs, Math.max(minMs, wanted));
}
