// One place for the look of all text.
/** The game font: chunky and friendly, and it has the Romanian letters (ă â î ș ț). Loaded from Google Fonts at start (core/fonts.ts). */
export const FONT_FAMILY = 'Lilita One';
/** Shown instead if the font can't load (offline, blocked): the old Impact look. */
const FONT_FALLBACK = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
export const FONT = `"${FONT_FAMILY}", ${FONT_FALLBACK}`;

export const FONT_LOADING = {
  /** Where the font comes from. To self-host instead: put a .woff2 in public/fonts/ and use @font-face in index.html. */
  stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap',
  /** The game never waits longer than this for the font, so a slow or offline connection can't block the menu. */
  timeoutMs: 2500,
  /** Google splits fonts by alphabet and loads a piece only when its letters are used: this forces the one with Romanian letters. */
  sampleText: 'ĂăÂâÎîȘșȚț0123456789 AaBbZz',
} as const;

export const COLORS = {
  navy: 0x1b2340,
  red: 0xd93a3a,
  blond: 0xf2c94c,
  belt: 0x8b5a2b,
  gold: 0xf5c518,
  cream: 0xfff3d6,
  white: 0xffffff,
} as const;

/** 0xrrggbb number -> '#rrggbb' string (Phaser text wants CSS colors). */
export const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Look of the belt attacks (visuals only, no gameplay numbers). */
export const BELT_FX = {
  radiusFactor: 0.82, // the drawn arc sits at this fraction of the real reach
  outerWidth: 9,
  innerWidth: 4.5,
  tipRadius: 9,
  swingTrailDeg: 70, // length of the white streak behind the belt tip
  spinTrailDeg: 150,
  spinRingAlpha: 0.18, // faint full circle drawn during the spin
  fadeAmount: 0.5, // how much the streak fades by the end of the sweep
  /** Varu's right hand in the 128x128 body texture, relative to its center. The belt starts there. */
  handOffset: { x: 40, y: -20 },
  /** Length of the strap, as a share of the belt's reach (so the golden belt gets a longer one). */
  beltLengthFactor: 0.56,
  strapWidth: 6.5,
  strapOutline: 2,
  /** Resting bow of the strap (degrees of turn from the fist to the buckle), so it is never ruler-straight. */
  curveDeg: 32,
  strapShine: 0xb07a40,
  buckleLength: 9.5,
  buckleWidth: 11,
  strapSegments: 10,
  /** The strap bends back behind the tip: bend (radians) = turn speed (rad/s) x lagSec, capped at maxLagDeg. */
  lagSec: 0.04,
  maxLagDeg: 40,
  /** The streak is full length at this turn speed (rad/s) and shrinks to nothing when the belt slows. */
  fullTrailSpeed: 9,
  trailSlices: 8,
  /** Wind-up and follow-through (Back easing strength, 0 = none). Hits ignore it: they only count 0..arc. */
  swingBack: 2.2,
  spinBack: 1.6,
  buffedOuter: 0xf5c518,
  buffedInner: 0xfff0a8,
  normalOuter: 0xffffff,
  normalInner: 0xfff3d6,
} as const;
