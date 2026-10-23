/** @file Short phone vibration (`buzz`): one number or a pattern, rate limited, off with the pause-menu switch; no-op on computers. */
import { TOUCH } from '../config/touch';
import { usesTouchControls } from './device';
import { getVibration } from './settings';

let lastAt = -Infinity;

/**
 * A short buzz on phones that can do it (Android browsers; iPhones ignore it). `pattern` is one length (ms) or a list
 * buzz / pause / buzz... Never throws, does nothing on computers or when the player switched vibration off, and drops a buzz that
 * comes less than `TOUCH.haptics.minGapMs` after the last one so a burst of events cannot hum for seconds.
 */
export function buzz(pattern: number | readonly number[]): void {
  try {
    if (!getVibration() || !usesTouchControls()) return;
    const now = performance.now();
    if (now - lastAt < TOUCH.haptics.minGapMs) return;
    lastAt = now;
    navigator.vibrate?.(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    // No vibration here.
  }
}
