// One place for the look of all text.
/** The game font: chunky and friendly, and it has the Romanian letters (ă â î ș ț). Self-hosted in public/fonts/ (core/fonts.ts), so it also works offline and never waits for another website. */
export const FONT_FAMILY = 'Lilita One';
/** Shown instead if the font can't load: the old Impact look. */
const FONT_FALLBACK = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
export const FONT = `"${FONT_FAMILY}", ${FONT_FALLBACK}`;

/** The font for small hit and environment words ("BONK!", "PLAF!", props, the "zzz"): Kablammo, a wobbly graffiti-comic face. It has ă â î ș ț. SIL Open Font License, see public/fonts/OFL-kablammo.txt. */
export const FONT_SFX_FAMILY = 'Kablammo';
export const FONT_SFX = `"${FONT_SFX_FAMILY}", ${FONT}`;

export const FONT_LOADING = {
  /**
   * Lilita One (SIL Open Font License, see public/fonts/OFL.txt), split by alphabet like Google does: "latin" has the plain letters and
   * â î, "latin-ext" has ă ș ț. Files and ranges are from the @fontsource/lilita-one package (v5.3.0). Paths are relative to the page.
   */
  files: [
    {
      family: FONT_FAMILY,
      path: 'fonts/lilita-one-latin-400-normal.woff2',
      unicodeRange: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
    {
      family: FONT_FAMILY,
      path: 'fonts/lilita-one-latin-ext-400-normal.woff2',
      unicodeRange: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
    {
      family: FONT_SFX_FAMILY,
      path: 'fonts/kablammo-latin-400-normal.woff2',
      unicodeRange: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
    {
      family: FONT_SFX_FAMILY,
      path: 'fonts/kablammo-latin-ext-400-normal.woff2',
      unicodeRange: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  /** The game never waits longer than this for the font (it is a local file, so this is only a safety net). */
  timeoutMs: 2500,
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
