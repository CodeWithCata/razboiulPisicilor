import { Tex } from '../assets/keys';
import { shiftRight } from './balance';
import { COLORS } from './style';

/** Pause menu keys, as KeyboardEvent.code. Esc opens and closes it. The dev keys (1-5 X K B L V J G F C U P Y T I) and R M N are NOT used here. */
export const PAUSE_KEYS: Record<'up' | 'down' | 'left' | 'right' | 'confirm' | 'close', readonly string[]> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
  close: ['Escape'],
};

/** Pause menu look and behavior. Sizes in game pixels (1280x720). Same poster style as the main menu (config/menu.ts). */
export const PAUSE = {
  /** The game pauses by itself when the window loses focus (alt-tab, clicking another window). */
  pauseOnBlur: true,
  /** Phones: turning the phone upright pauses the game (the page also shows a "turn your phone" note). */
  pauseOnPortrait: true,
  depth: 200,
  /** The frozen game underneath is tinted navy (not black) so the pause screen feels part of the game. */
  dimColor: 0x14182b,
  dimAlpha: 0.66,
  rayAlpha: 0.07,
  /** The Restart / Menu "are you sure" prompt goes back to normal after this long. */
  confirmResetMs: 2500,

  title: { y: 92, size: 96, stroke: 14, angleDeg: -2, introMs: 380 },
  panel: {
    w: 600,
    top: 160,
    padY: 20,
    radius: 26,
    fill: 0x14182b,
    alpha: 0.97,
    borderWidth: 5,
    borderColor: COLORS.gold,
    /** A thin second border inside the first one. */
    innerInset: 11,
    innerAlpha: 0.18,
    /** Hard shadow under the panel. */
    shadowDy: 10,
    shadowAlpha: 0.4,
  },
  hint: { y: 664, size: 22 },

  row: {
    w: 520,
    h: 54,
    gap: 8,
    radius: 14,
    padX: 24,
    labelSize: 32,
    valueSize: 28,
    /** Space between the panel's last row and the first row of the next group (a thin divider line sits in it). */
    groupGap: 20,
    idleFill: 0x232c52,
    idleAlpha: 0.85,
    /** The selected row is a solid gold pill (red for Restart / Menu). */
    selectedFill: COLORS.gold,
    selectedDangerFill: COLORS.red,
    normalColor: '#fff3d6',
    selectedColor: '#1b2340',
    dangerColor: '#ff8a8a',
    selectedDangerColor: '#fff3d6',
    /** The gold "play" triangle in front of Continue. */
    iconW: 22,
    iconGap: 16,
    dividerAlpha: 0.16,
  },

  /** Phones and tablets: taller rows and fatter volume blocks, so a thumb can hit them (see pauseRowH and pausePip below). */
  /** (Compact rows and gaps, because phones have two more rows: the auto-attack and debug switches.) */
  touch: { rowH: 48, gap: 5, groupGap: 12, pip: { w: 26, h: 40, gap: 8 } },

  /** The volume "bars": one rounded block per volume step (AUDIO.volumeSteps). */
  pip: { w: 15, h: 26, gap: 5, radius: 4, onColor: COLORS.gold, offColor: 0x4a5275, selectedOnColor: COLORS.navy, selectedOffColor: 0xb38b0c },

  /** The little scene around the panel: cats peeking over its top edge, Varu on a smoke break, a fat cat waiting. */
  decor: {
    peek: [
      { key: Tex.CatNormal, fromLeft: 70, tiltDeg: -10, bobMs: 1300 },
      { key: Tex.CatNinja, fromRight: 70, tiltDeg: 8, bobMs: 1700 },
    ],
    peekScale: 1.15,
    /** How far the cat's center sits below the panel's top edge (its head sticks out above it). */
    peekLift: 8,
    peekBob: 7,
    varu: { x: 175, y: 480, scale: 1.8, tilt: 0.35, bobPx: 6, bobMs: 900, bubbleY: 345 },
    fatCat: { get x() { return shiftRight(1105); }, y: 480, scale: 1.9, breatheTo: 1.04, breatheMs: 1500, bubbleY: 345 },
    smoke: { everyMs: 480, dx: 24, dy: -78, riseBy: 70, driftMax: 26, fromScale: 0.5, toScale: 1.3, alpha: 0.55, lifeMs: 1700 },
    bubble: { size: 24, padX: 18, padY: 9, radius: 14, border: 4, tail: 12, popMs: 260, minX: 16 },
  },
} as const;

/** Height of one pause menu row: taller on touch screens. */
export const pauseRowH = (touch: boolean): number => (touch ? PAUSE.touch.rowH : PAUSE.row.h);

/** Space between two rows, and the extra space before a new group of rows: tighter on touch screens (they have one more row). */
export const pauseGaps = (touch: boolean): { readonly gap: number; readonly groupGap: number } => (touch ? PAUSE.touch : PAUSE.row);

/** Size of one volume block and the gap between blocks: fatter on touch screens. */
export const pausePip = (touch: boolean): { readonly w: number; readonly h: number; readonly gap: number } => (touch ? PAUSE.touch.pip : PAUSE.pip);
