/** @file Thought-cloud bubble numbers for cats talking in the arena: colors, cloud bumps, inked outline, cel shading, shine, hatch ticks, trailing dots, pop-in and idle jelly, one look per kind (talk / shout). No Phaser. */
import { COLORS, css } from './style';

/**
 * The look of the cream cloud (`ui/CatBubble.ts`): a puffy outline made of overlapping bumps, with two separate circles trailing down at an angle
 * to the speaker (like a comic thought bubble). Same family as the pause-menu bubble and the photo frames: cream, navy outline.
 * `talk` = a cat chatting; `shout` = a boss yelling an attack (bigger, thicker, red letters).
 */
export const BUBBLE = {
  fill: COLORS.cream,
  outline: COLORS.navy,
  /** Cartoon shading: the underside (away from the light, which comes from the upper left) is a warmer, darker cream. Opaque colors only, so overlapping circles never double up. */
  shade: 0xf0d6a2,
  /** The small tick marks drawn on the shaded side (like the hatching in a comic panel). */
  hatchColor: 0xc9a468,
  shineColor: 0xffffff,
  /** The bumps sit on an ellipse around the text: the text's half size times `fit`, plus this padding (px). */
  fit: 1.2,
  padX: 10,
  padY: 3,
  /** Never narrower than this (half width of the bump ellipse), so "Bu!" still looks like a cloud. */
  minHalfWidth: 28,
  cloud: {
    /** Bump radius: this share of the ellipse's half height, kept between min and max (px). */
    radiusShare: 0.55,
    minRadius: 7,
    maxRadius: 11,
    /** Bumps are spaced this many radii apart along the edge (smaller = more, tighter bumps). */
    spacing: 1.45,
    /** Each bump is randomly this much bigger or smaller (0.2 = +-20%), the same every time for the same line: a hand-drawn feel. */
    wobble: 0.2,
    /** Inked outline: the line is thicker on the lower right and thinner on the upper left, by up to this much (0.3 = +-30%). */
    ink: 0.3,
    /** Cel shading: the cream is pulled this many px away from the lower right edge, which leaves a shaded rim 2x this thick. */
    shadeInset: 2.6,
    /** Direction the light comes from (unit-ish vector, y points down): upper left. */
    light: { x: -0.45, y: -0.89 },
  },
  /** The white glossy streak near the upper-left edge: a tapered line of dots along a smaller ellipse. Skipped on tiny clouds. */
  shine: {
    minHalfWidth: 40,
    fromDeg: 200,
    toDeg: 252,
    insetX: 0.9,
    insetY: 0.8,
    steps: 11,
    minRadius: 1.2,
    maxRadius: 3.2,
    /** The little round glint under the streak (px radius, 0 = none). */
    glint: 2,
  },
  /** A few short parallel strokes on the shaded lower right. Skipped on small clouds. */
  hatch: {
    minHalfWidth: 56,
    count: 3,
    fromDeg: 58,
    stepDeg: 13,
    inset: 0.92,
    length: 6,
    width: 2.2,
  },
  /** The trailing puffs (big to small, overlapping so their outlines merge with the cloud's), from the cloud down to the speaker. `up` = how far above the tail tip the dot's center is (px). */
  tail: {
    /** Height from the tail tip up to the bottom of the cloud (px). */
    length: 24,
    /** The cloud sits this far to one side of the speaker (px), so the dots slant down toward the cat like the thought bubbles in comics. It flips to the left on the right half of the screen. */
    sideways: 34,
    /** The slant of the dots never goes past this share of the cloud's half width (px per px). */
    leanMax: 0.6,
    /** Two separate circles, big near the cloud and small near the cat, with only a small gap between them and the cloud. */
    dots: [
      { r: 5, up: 14 },
      { r: 3, up: 2.3 },
    ],
    /** The dots' outline is this share of the cloud's outline thickness. */
    borderShare: 0.85,
    /** The dots get the same shading, scaled down by this share of the cloud's shade inset. */
    shadeShare: 0.5,
    /** Glint on the big dot (share of its radius, up-left of its center). */
    glintShare: 0.35,
    glintRadius: 1.3,
  },
  /** The bubble pops out of the tail tip (Back.easeOut, with a bigger overshoot for a jelly feel). */
  popMs: 260,
  popOvershoot: 2.4,
  /** After the pop it keeps breathing from the tail tip: wider and flatter, then taller and narrower (0.035 = +-3.5%). */
  idle: { squash: 0.035, periodMs: 620 },
  /** The cloud keeps this far inside the screen edge (px); the dots still point at the speaker. */
  screenPadPx: 8,
  kinds: {
    talk: { size: 20, border: 3.5, wrapPx: 200, textColor: css(COLORS.navy) },
    shout: { size: 27, border: 4.5, wrapPx: 280, textColor: css(COLORS.red) },
  },
} as const;

export type BubbleKind = keyof typeof BUBBLE.kinds;
