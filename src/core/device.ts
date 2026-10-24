/**
 * Phone or tablet? The main pointer is a finger there, while a touchscreen laptop still has a mouse.
 * Adding ?touch=1 to the address forces the touch controls (handy for testing on a computer).
 */
export function usesTouchControls(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** Adding ?tutorial=1 to the address shows the first-run tutorial again (handy for testing). */
export function forcesTutorial(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('tutorial') === '1';
  } catch {
    return false;
  }
}

/** Does the player's system ask for less motion (OS "reduce motion")? Guarded: a browser without `matchMedia` just says no. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Adding ?whatsnew=1 to the address shows the "what's new" card again (handy for testing). */
export function forcesWhatsNew(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('whatsnew') === '1';
  } catch {
    return false;
  }
}
