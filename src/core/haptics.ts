import { usesTouchControls } from './device';

/** A short buzz on phones that can do it (Android browsers; iPhones ignore it). Never throws, does nothing on computers. */
export function buzz(ms: number): void {
  try {
    if (usesTouchControls()) navigator.vibrate?.(ms);
  } catch {
    // No vibration here.
  }
}
