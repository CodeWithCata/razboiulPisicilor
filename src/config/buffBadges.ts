/**
 * The timers for the active power-ups (ui/BuffBadges.ts), top left under the cat meter: one round badge per buff,
 * in a row. They look like the pickups in the arena: a soft glow disc and a ring in the pickup's own color,
 * with the pickup's picture in the middle. The ring drains clockwise. Sizes are game pixels.
 */
export const BUFF_BADGES = {
  /** Left edge of the first badge and the top edge of the row. */
  x: 24,
  y: 98,
  /** Outer radius of the badge and the gap between badges. */
  r: 25,
  gap: 14,
  /** Width of the ring, and how strong the ring, its empty track and the glow disc behind the icon are (0..1). */
  ringW: 5,
  ringAlpha: 0.95,
  trackAlpha: 0.28,
  glowAlpha: 0.3,
  /** The pickup picture in the middle (longest side). */
  iconSize: 34,
  /** The seconds left, under the badge: plain HUD text (white with a navy outline). `gap` = distance below the badge's edge. */
  seconds: { size: 18, strokeThickness: 4, gap: 11 },
  /** A new buff pops in (Back easing); picking the same one up again gives a quick bump. */
  popIn: { ms: 260 },
  bump: { ms: 340, grow: 0.2 },
  /** The last stretch: the ring, icon and seconds blink, the badge gives a tiny shake. */
  warn: { ms: 2000, blinkMs: 130, shakePx: 1.2, iconAlpha: 0.45 },
  arcSegments: 40,
  /** The stack label ("x2") on a stackable buff (Monster), at the badge's top right. Hidden at x1. */
  stack: { size: 20, strokeThickness: 5, dx: 20, dy: -18, color: '#b4ff1a', maxColor: '#ffe14a', stroke: '#1b2340' },

  colors: {
    warn: 0xff5a5a,
    warnText: '#ff8a8a',
    seconds: '#ffffff',
    secondsStroke: '#1b2340',
  },
} as const;
