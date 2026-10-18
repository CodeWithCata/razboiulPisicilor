import { COLORS } from './style';

/**
 * Varu's health meter (ui/CatMeter.ts), top left of the HUD: a Siamese cat face, a heart and a classic health bar.
 * The face is drawn in code. Shape numbers are in "face units" around the face's own center (0, 0): about 62 tall.
 * The BAR is what shows health (green > yellow > red). The face only shows the mood (happy, worried, scared, X eyes).
 */
export const CAT_METER = {
  /** Where the face sits on the screen (center, game pixels) and how big it is drawn. */
  x: 60,
  y: 48,
  scale: 1.1,

  head: { cy: 6, halfW: 30, halfH: 25, roundness: 2.7, segments: 44 },
  /** Left ear (the right one is mirrored). Outer = the ear, inner = the lighter part. */
  ear: {
    outer: [[-29, -8], [-27, -31], [-7, -17]],
    inner: [[-25, -12], [-24, -25], [-13, -17]],
  },
  /** The Siamese dark mask: around the eyes, down the nose bridge, over the muzzle. */
  mask: {
    muzzle: { cy: 14, halfW: 13, halfH: 9 },
    eyeRing: 9.6,
    bridge: [[-5, 1], [5, 1], [7.5, 13], [-7.5, 13]],
  },
  /** The navy outline is the face drawn shifted this many px in 8 directions (no pointy corners at the ear tips). */
  outlineReach: 3,

  eyes: { x: 11, y: 4, white: 6.5, whiteScared: 7.4, iris: 0.82, pupil: 2.7, pupilWorried: 2.2, pupilScared: 1.5, shine: 1.3, lineW: 2.6 },
  brow: { lineW: 2.4, underlayW: 4.4, worried: { outer: [-17, -3], inner: [-6, -8] }, scared: { outer: [-18, -1], inner: [-6, -10] } },
  nose: [[-3.5, 11], [3.5, 11], [0, 15]],
  mouthLineW: 2.2,
  whisker: { inner: 19, outer: 40, ys: [12, 15.5, 19], fan: 4, lineW: 1.7, underlayW: 3.6 },
  sweat: { x: 25, y: -6, r: 3.2 },

  /** Mood by health: at or above `happyAt` he smiles, at or above `worriedAt` he is worried, below that he is scared. The bar changes color at the same two lines. */
  happyAt: 0.6,
  worriedAt: 0.3,

  /** The bar, in game pixels (not scaled with the face). */
  bar: {
    x: 138,
    y: 58,
    w: 188,
    h: 22,
    frame: 3,
    frameRadius: 11,
    radius: 8,
    minW: 8,
    /** The bar is split in this many equal parts by thin dividers, so it reads as a meter. */
    segments: 5,
    tickW: 2,
    tickAlpha: 0.3,
    /** The light stripe on top of the fill: this share of the bar height, this strong. */
    shineShare: 0.34,
    shineAlpha: 0.3,
    /** The pale chunk of health just lost: waits this long, then drains at this speed. */
    ghostHoldMs: 380,
    ghostEasePerMs: 0.0045,
    /** How fast the fill follows the real health (bigger = faster). */
    fillEasePerMs: 0.03,
    /** The number inside the bar. */
    label: { size: 17, strokeThickness: 4 },
  },
  /** The heart at the left end of the bar. */
  heart: { x: 118, y: 69, size: 10, outlineReach: 2, beatMs: 520, beatGrow: 0.16 },

  colors: {
    outline: COLORS.navy,
    fur: 0xf6e8cb,
    mask: 0x6b4a3d,
    earOuter: 0x573b31,
    earInner: 0x9a6c63,
    nose: 0xe5707e,
    mouth: COLORS.cream,
    eyeWhite: COLORS.white,
    iris: 0x45aef5,
    irisRim: 0x1f6fc0,
    ink: COLORS.navy,
    whisker: COLORS.white,
    brow: COLORS.cream,
    sweat: 0x8fd3ff,
    flash: COLORS.white,
    danger: COLORS.red,
    // Bar
    track: 0x2c3659,
    ghost: 0xf4e3cf,
    barHigh: 0x5fcf5a,
    barMid: 0xf5b73c,
    barLow: 0xe5483f,
    heart: 0xe5483f,
    heartShine: 0xffb3b3,
    heartEmpty: 0x5a6894,
  },

  hurt: { ms: 280, flashAlpha: 0.75, shakePx: 3, shrink: 0.12 },
  heal: { ms: 380, grow: 0.16 },
  blink: { minMs: 2200, maxMs: 5200, holdMs: 130 },
  /** Below `worriedAt` the face and bar pulse: one pulse this long, this strong (0..1). */
  dangerPulseMs: 560,
  dangerAlpha: 0.38,
} as const;
