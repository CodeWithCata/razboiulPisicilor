/** @file Where the touch buttons are: attack, spin, throw and roll can be moved and resized by the player (saved); pause stays put. */
import { GAME } from '../config/balance';
import { MOVABLE_BUTTON_IDS, TOUCH, type MovableButtonId, type TouchButtonId, type TouchSizeId } from '../config/touch';
import { bus, Events } from './events';
import { hyp } from './hyp';
import { loadTouchLayout, saveTouchLayout, type SavedButton } from './storage';

export interface ButtonSpot {
  x: number;
  y: number;
  r: number;
}

const SIZES = TOUCH.layout.sizes;
const isSizeId = (value: string): value is TouchSizeId => SIZES.some((s) => s.id === value);

interface Setting {
  size: TouchSizeId;
  /** Offset (game px) from the default spot of the button. */
  dx: number;
  dy: number;
}

const settings = {} as Record<MovableButtonId, Setting>;
{
  const saved = loadTouchLayout();
  for (const id of MOVABLE_BUTTON_IDS) {
    const s = saved[id];
    settings[id] = s && isSizeId(s.size) ? { size: s.size, dx: s.dx, dy: s.dy } : { size: TOUCH.layout.defaultSize[id], dx: 0, dy: 0 };
  }
}

/** The answers are cached in objects made once and filled in place, so asking for a spot every frame allocates nothing. */
const cache = {} as Record<MovableButtonId, ButtonSpot>;
for (const id of MOVABLE_BUTTON_IDS) cache[id] = { x: 0, y: 0, r: 0 };
let dirty = true;
let cachedW = -1;
let cachedH = -1;

export const getButtonSize = (id: MovableButtonId): TouchSizeId => settings[id].size;

export const radiusFor = (id: MovableButtonId, size: TouchSizeId): number => TOUCH.buttons[id].r * SIZES.find((s) => s.id === size)!.k;

/** The default spot of a button for the current screen (config/touch.ts `buttons`). */
export function defaultSpot(id: MovableButtonId): { x: number; y: number } {
  return { x: TOUCH.buttons[id].x, y: TOUCH.buttons[id].y };
}

/** Keep a spot on the screen: inside the right part, clear of the top corner buttons. (It does not check other buttons: see `spotIsFree`.) */
export function clampSpot(x: number, y: number, r: number): { x: number; y: number } {
  const L = TOUCH.layout;
  const minX = GAME.width * TOUCH.leftZone + r;
  const maxX = GAME.width - L.edgeMargin - r;
  const minY = L.topLimit + r;
  const maxY = GAME.height - L.edgeMargin - r;
  return { x: Math.min(Math.max(x, minX), Math.max(minX, maxX)), y: Math.min(Math.max(y, minY), Math.max(minY, maxY)) };
}

/** Would a circle at (x, y) with radius r be clear of every other button and the pause button (`TOUCH.layout.gap` px apart)? */
export function spotIsFree(id: MovableButtonId, x: number, y: number, r: number): boolean {
  refresh();
  const gap = TOUCH.layout.gap;
  for (const other of MOVABLE_BUTTON_IDS) {
    if (other === id) continue;
    const o = cache[other];
    if (hyp(x - o.x, y - o.y) < o.r + r + gap) return false;
  }
  const p = TOUCH.buttons.pause;
  if (hyp(x - p.x, y - p.y) < p.r + r + gap) return false;
  return true;
}

/** Fill the cache from the settings (when something changed or the screen size did). A button that would land on another one goes back to its default spot. */
function refresh(): void {
  if (!dirty && cachedW === GAME.width && cachedH === GAME.height) return;
  dirty = false;
  cachedW = GAME.width;
  cachedH = GAME.height;
  for (const id of MOVABLE_BUTTON_IDS) {
    const s = settings[id];
    const r = radiusFor(id, s.size);
    const base = defaultSpot(id);
    const spot = clampSpot(base.x + s.dx, base.y + s.dy, r);
    const c = cache[id];
    c.x = spot.x;
    c.y = spot.y;
    c.r = r;
  }
  // Settings saved on another screen size (or a bigger size) may put two buttons together: those fall back to their default spot.
  for (const id of MOVABLE_BUTTON_IDS) {
    const c = cache[id];
    let clash = false;
    for (const other of MOVABLE_BUTTON_IDS) {
      if (other === id) continue;
      const o = cache[other];
      if (hyp(c.x - o.x, c.y - o.y) < o.r + c.r + TOUCH.layout.gap) clash = true;
    }
    if (clash) {
      const home = clampSpot(defaultSpot(id).x, defaultSpot(id).y, c.r);
      c.x = home.x;
      c.y = home.y;
    }
  }
}

/** Where a button is now. Pause (and any other fixed button) reads config/touch.ts. Allocation-free. */
export function touchButton(id: TouchButtonId): Readonly<ButtonSpot> {
  if (id === 'pause') return TOUCH.buttons.pause;
  refresh();
  return cache[id];
}

const isCustom = (id: MovableButtonId): boolean => settings[id].dx !== 0 || settings[id].dy !== 0 || settings[id].size !== TOUCH.layout.defaultSize[id];

/** Has the player changed any button? (The pause menu row says so.) */
export const isLayoutCustom = (): boolean => MOVABLE_BUTTON_IDS.some(isCustom);

function persist(): void {
  dirty = true;
  const out: Record<string, SavedButton> = {};
  for (const id of MOVABLE_BUTTON_IDS) if (isCustom(id)) out[id] = { ...settings[id] };
  saveTouchLayout(out);
  bus.emit(Events.TouchLayoutChanged);
}

/** Put a button at this spot (after the clamp). Returns false (and changes nothing) when it would sit on another button. */
export function setButtonSpot(id: MovableButtonId, x: number, y: number): boolean {
  const r = radiusFor(id, settings[id].size);
  const spot = clampSpot(x, y, r);
  if (!spotIsFree(id, spot.x, spot.y, r)) return false;
  const base = defaultSpot(id);
  settings[id].dx = spot.x - base.x;
  settings[id].dy = spot.y - base.y;
  persist();
  return true;
}

/** The next size (small -> normal -> big -> huge -> small) that fits where the button stands; sizes that would touch another button are skipped. */
export function cycleButtonSize(id: MovableButtonId): TouchSizeId {
  refresh();
  const here = cache[id];
  const start = SIZES.findIndex((s) => s.id === settings[id].size);
  for (let step = 1; step <= SIZES.length; step++) {
    const next = SIZES[(start + step) % SIZES.length]!;
    const r = radiusFor(id, next.id);
    const spot = clampSpot(here.x, here.y, r); // a bigger button may need a nudge from the screen edge
    if (!spotIsFree(id, spot.x, spot.y, r)) continue;
    const base = defaultSpot(id);
    settings[id].size = next.id;
    settings[id].dx = spot.x - base.x;
    settings[id].dy = spot.y - base.y;
    persist();
    return next.id;
  }
  return settings[id].size;
}

/** One button back to its default spot and size. */
export function resetButton(id: MovableButtonId): void {
  settings[id] = { size: TOUCH.layout.defaultSize[id], dx: 0, dy: 0 };
  persist();
}

/** Every button back to its default spot and size. */
export function resetAllButtons(): void {
  for (const id of MOVABLE_BUTTON_IDS) settings[id] = { size: TOUCH.layout.defaultSize[id], dx: 0, dy: 0 };
  persist();
}
