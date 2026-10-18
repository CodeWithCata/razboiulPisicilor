import { COLORS } from './style';

/**
 * The little speaker button (ui/MuteBadge.ts) that shows if the sound is on and mutes it when clicked or tapped,
 * top right of the menu, end screens and HUD. It is meant to be quiet: a faint glow disc and a thin ring, like the other badges
 * (config/buffBadges.ts, config/beltBadges.ts), with a small speaker in the middle and the key under it.
 * Sizes are game pixels; icon numbers are around the badge's center (0, 0).
 */
export const MUTE_BADGE = {
  depth: 100,
  /** Radius of the round badge, width of its ring, and how strong the glow disc and the ring are (0..1). */
  r: 18,
  ringW: 3,
  glowAlpha: 0.22,
  ringAlpha: 0.6,
  /** The mouse is over the button: the glow gets this much stronger. */
  hoverGlowBoost: 0.14,
  /** The click area reaches this far past the badge (and down over the key reminder), so it is easy to hit on a phone. */
  hitPad: 6,
  /** Phones: the badge is drawn this much bigger, its tap area reaches `touchHitPad` past it, and the key reminder is left out. */
  touchScale: 1.5,
  touchHitPad: 10,
  /** The key reminder under the badge: plain HUD text (white with a navy outline). `gap` = distance below the badge's edge. */
  key: { size: 16, strokeThickness: 3, gap: 3, alpha: 0.8 },

  icon: {
    /** Thin navy outline around the speaker, the waves and the cross, so they read on any background. */
    outline: 1.4,
    /** The speaker: a box and a cone, as one shape. */
    speaker: [[-12, -3.5], [-7, -3.5], [0, -9], [0, 9], [-7, 3.5], [-12, 3.5]],
    /** Sound waves: arcs around this center, with these radii, this half-angle (radians) and line width. */
    waves: { cx: 1, radii: [5, 9.5], halfAngle: 0.9, lineW: 2.2 },
    /** The cross when muted. */
    cross: { from: [5, -5.5], to: [13, 5.5], lineW: 3 },
  },

  colors: {
    outline: COLORS.navy,
    on: COLORS.cream,
    /** Muted: the ring and glow turn red and the speaker gets a red cross. */
    muted: 0xe5483f,
    key: '#ffffff',
    keyStroke: '#1b2340',
  },
} as const;
