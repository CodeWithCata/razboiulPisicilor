/** @file Look of the main menu (logo, sunburst, stage, buttons). */
import { Tex } from '../assets/keys';
import { GAME } from './balance';
import { COLORS } from './style';

/** Look of the main menu (scenes/MenuScene.ts). Sizes in game pixels (1280x720). Texts are MENU_TEXT in content/lines.ts. */
export const MENU = {
  /** Darker than the navy outline: the drop shadow under the logo letters. */
  inkDark: 0x0c1022,

  /** Soft light rays behind everything. Keep them STATIC: a big rotating Graphics shape glitches the sprites above it. */
  sunburst: { rays: 14, radius: 900, y: 440, color: COLORS.cream, alpha: 0.13 },
  /** Dark edges so the middle pops. Drawn once into a canvas texture. */
  vignette: { key: 'menu_vignette', innerFactor: 0.35, outerFactor: 0.62, strength: 0.6, rgb: '20,24,43' },

  logo: {
    y: 112,
    angleDeg: -2,
    shadowOffset: 9,
    top: { size: 124, y: -6, color: '#f5c518', stroke: 14 },
    bottom: { size: 78, y: 88, color: '#fff3d6', stroke: 14 },
    /** The red "vs." badge between the two words. */
    vs: { y: 38, w: 104, h: 48, radius: 20, size: 38, angleFrom: -9, angleTo: -3, wobbleMs: 1100, border: 5 },
    introMs: 520,
  },

  /** Varu in the middle with the cats creeping in and backing off around him. */
  stage: {
    centerY: 412,
    varuScale: 1.9,
    varuScaleTo: 2.0,
    varuTiltDeg: 10,
    varuMs: 800,
    shadow: { dy: 62, w: 150, h: 34, alpha: 0.28 },
  },
  ring: {
    kinds: [Tex.CatNormal, Tex.CatFat, Tex.CatNinja, Tex.CatKamikaze, Tex.CatFlying, Tex.CatNormal, Tex.CatNormal],
    startAngle: 0.4,
    radiusFrom: 250,
    radiusTo: 195,
    /** The ring is an ellipse: wide, and flat enough not to touch the logo or the buttons. */
    xStretch: 1.6,
    yStretch: 0.56,
    catScale: 1.15,
    baseMs: 1400,
    stepMs: 170,
  },

  /** The big start button and the smaller Endless button above it (only after the campaign is won). */
  start: { y: 642, w: 560, h: 74, size: 34, pulseTo: 1.06, pulseMs: 650 },
  /** `touchH`: the endless button is taller on phones (it is the one tap target on the menu). */
  endless: { y: 563, w: 380, h: 52, touchH: 66, size: 28 },
  button: { radiusFactor: 2.6, border: 5, playIconW: 24, playIconGap: 18, hoverScale: 1.05, hoverMs: 120, depth: 10 },
  footer: { get y() { return GAME.height - 22; }, size: 20, alpha: 0.85, strokeThickness: 4, separator: '   •   ' },
} as const;
