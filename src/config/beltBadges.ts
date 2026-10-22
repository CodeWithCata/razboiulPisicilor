/** @file Look and position of the spin / throw cooldown badges (ui/BeltBadges.ts). */
import { COLORS } from './style';

/**
 * The cooldown badges for the belt specials (ui/BeltBadges.ts), bottom right: three round buttons: dodge roll, throw, spin (left to right).
 * Same order as the touch buttons. Same family as the power-up badges (config/buffBadges.ts): a soft glow disc and a thin ring,
 * no frame. Sizes are game pixels. Icon numbers are in "icon units" around the badge's center (0, 0).
 */
export const BELT_BADGES = {
  order: ['roll', 'throw', 'spin'],
  /** Outer radius of the badge, gap between badges, distance from the screen's right and bottom edges to the badge. */
  r: 31,
  gap: 20,
  right: 24,
  bottom: 40,
  ringW: 4.5,
  /** How strong the glow disc behind the icon is (0..1): when ready, and while recharging or away. */
  glowAlpha: 0.3,
  glowAlphaCooling: 0.13,
  /** While recharging the ring stays a faint track (it does not fill). */
  trackAlpha: 0.28,
  /**
   * While recharging, a dark pie covers the part of the badge that is not ready yet, like a clock:
   * it shrinks clockwise from the top, and a thin hand marks its leading edge. `alpha` = how dark the pie is.
   */
  sweep: { color: COLORS.navy, alpha: 0.66, handColor: COLORS.cream, handW: 2.5, handAlpha: 0.9 },
  /** The label under the badge: the key on a computer, the button's name on a phone (it fades after a few seconds). Plain HUD text (white with a navy outline). `gap` = distance below the badge's edge, `maxScale` = how much bigger than 1 the label may get on the big touch badges. */
  tag: { size: 17, strokeThickness: 4, gap: 12, maxScale: 1.35 },
  /** A touch button was tapped: the badge squashes a little and springs back (so a press during a recharge still gives an answer). */
  press: { ms: 140, squash: 0.12 },
  /** The seconds left while recharging. */
  seconds: { size: 22, strokeThickness: 4, decimalsBelowMs: 10000 },
  /**
   * The milk: when a badge becomes ready, a cap of milk slides down over its top edge with drip tongues,
   * drops fall off the longest tongues, then the milk drains away again. Tongues are random every time.
   */
  milk: {
    ms: 1700,
    growMs: 520,
    shrinkMs: 520,
    /** Where the milk's lower edge ends up (share of the badge radius, negative = above the center). */
    capY: -0.6,
    /** How much bigger the pale outline is than the milk itself. */
    edge: 1.6,
    tongues: { xs: [-18, -6, 6, 18], jitter: 2, halfW: [4.2, 5.8], len: [8, 32] },
    drop: { count: 2, staggerMs: 220, startShare: 0.8, fallMs: 620, fall: 46, r: 3.4 },
  },
  /** The "ready!" moment: the badge pops, flashes white, and a gold ring flies outwards. */
  pop: { ms: 420, grow: 0.22, flashAlpha: 0.65, burst: 18, burstW: 4 },
  /** The icon is dimmed while the belt is away (while recharging the dark pie dims it instead). */
  iconAlphaAway: 0.3,
  /** The belt is away (throw): the ring becomes dashed. */
  dashes: { count: 14, share: 0.55 },
  arcSegments: 40,

  icon: {
    lineW: 3.6,
    /** Thin navy outline around the icon, so it reads on the grass. */
    outline: 1.8,
    /**
     * The spin icon is a belt curled into a circle and turning clockwise: a strap that is thin at its tail and full width at the head,
     * with holes near the head, a hollow gold buckle on the head, and two short speed streaks trailing behind it.
     */
    spin: {
      r: 12.5,
      startDeg: -40,
      sweepDeg: 280,
      strapW: 4,
      /** The tail is this share of the full strap width (the strap widens along its length). */
      tailShare: 0.22,
      steps: 28,
      /** Holes along the strap (0..1 from its tail). */
      holes: { at: [0.5, 0.66, 0.82], r: 1 },
      /** The buckle is a rectangle around the strap's head: half its length (along the strap) and half its width (across it). */
      buckle: { halfLen: 4.2, halfWid: 4.8, lineW: 2.2 },
      /** Speed streaks: how far from the strap's circle (+ = outside), and between which angles (degrees after the strap's tail). */
      streakW: 2,
      streaks: [{ dr: 6.5, fromDeg: 110, toDeg: 175 }, { dr: -6, fromDeg: 150, toDeg: 205 }],
    },
    /**
     * The dodge roll icon is a picture, drawn in code like Varu and the pickups (`assets/art/dodgeIcon.ts`, key `Tex.DodgeIcon`): Varu curled
     * into a ball, tumbling. It is shown as an image `sizePx` big (before the badge's own scaling), rocks `rockDeg` either way once per `rockMs`,
     * and while the roll recharges it fades to `coolAlpha` and takes the cooling tint.
     */
    roll: { sizePx: 50, rockDeg: 8, rockMs: 1100, coolAlpha: 0.55 },
    throw: {
      strap: [[-12, 11], [8, -9]],
      strapW: 5.4,
      /** Speed lines trailing behind the tail (the strap flies up and to the right). */
      streaks: [[[-10.9, 14.9], [-13.8, 17.7]], [[-15.9, 9.9], [-18.7, 12.8]]],
      streakW: 2.4,
      /**
       * Little feathered wings on both sides of the strap, so the belt looks like it is flying. `at` = where on the strap (0..1 from the start);
       * points are [along the strap toward the buckle, out to the side] and are mirrored to the other side.
       */
      wings: { at: 0.5, points: [[3.5, 2], [2.5, 8.5], [0.5, 12], [-0.5, 8.8], [-2.5, 11], [-3, 8], [-5.5, 9], [-4.5, 2]] },
      /** The buckle is a hollow gold diamond at the tip; the holes are dots along the strap (0..1 from the start). */
      buckle: { at: [10, -11], half: 5.2, lineW: 2.4 },
      holes: { at: [0.18, 0.4], r: 1.3 },
    },
  },

  colors: {
    outline: COLORS.navy,
    ringReady: COLORS.gold,
    ringAway: 0x7d88ad,
    iconReady: COLORS.cream,
    iconCooling: 0xb8c0dc,
    strap: 0xc08a4a,
    buckle: COLORS.gold,
    milk: 0xfffaf0,
    milkEdge: 0xbfd0ec,
    flash: COLORS.white,
    tagText: '#ffffff',
    tagStroke: '#1b2340',
    seconds: '#ffffff',
    secondsStroke: '#1b2340',
  },
} as const;
