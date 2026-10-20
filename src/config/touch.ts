/** @file Touch controls: stick, attack button, auto-aim numbers, and where the spin / throw / pause buttons sit. */
import { shiftDown, shiftRight } from './balance';
import { COLORS } from './style';

/**
 * Touch controls for phones and tablets (the keyboard and mouse stay the default on computers).
 *
 * Left thumb walks, right thumb fights:
 *  - LEFT thumb: a floating stick that moves Varu (it appears where the thumb lands and follows it, so it never needs re-centering).
 *    There is no stick for aiming: Varu turns to the nearest cat by himself (`autoAim`), or looks where he walks.
 *  - RIGHT thumb: a big attack button (hold it to keep swinging the belt) and two more, spin and throw. Spin and throw are the
 *    cooldown badges of ui/BeltBadges.ts, only bigger, so what you tap is also what shows the recharge. The throw flies at the nearest cat too.
 *  - Auto-attack (Varu swings by himself when a cat is in reach, and swats flying balls) is OFF by default. It is a switch in the
 *    pause menu (core/settings.ts), for people who prefer it. The attack button keeps working either way.
 * Positions are in game pixels (1280x720). Test on a computer by opening the game with ?touch=1 at the end of the address.
 */
export const TOUCH = {
  /** The screen is split at this fraction of its width: the move stick can start anywhere left of it. */
  leftZone: 0.5,
  stickRadius: 100,
  knobRadius: 42,
  /** Below this fraction of the stick travel nothing happens (thumb jitter). */
  deadZone: 0.12,
  /** Pushed this far (fraction of the travel) Varu already walks at full speed, so the thumb never has to reach the very edge. */
  fullSpeedAt: 0.85,
  /** Past the ring the stick slides along with the thumb instead of stopping, so the thumb can drift without losing the stick. */
  stickFollows: true,

  /** Where Varu looks: the nearest target (and, with auto-attack on, when he swings). Distances are from Varu's center, in game pixels. */
  autoAim: {
    /** Cats this close (to their edge) are targets: Varu turns to the nearest one. */
    range: 480,
    /** Enemy balls this close are targets too (so tennis balls get swatted back). */
    projectileRange: 190,
    /** A ball is picked over a cat that is this much nearer. */
    projectileBias: 45,
    /** Varu keeps looking at his current target unless another one is this much nearer (no flicking back and forth). */
    stickyGain: 40,
    /** He swings when the target is within the belt's reach plus this much (the swing needs a moment to arrive). */
    swingMargin: 22,
  },
  /** How far in front of Varu (the way he walks) the laser dot sits (the dot normally follows the mouse). */
  aimPointDistance: 230,
  /**
   * The laser pointer power-up on a phone: there is no mouse, so the player taps the zone (the right half of the screen, outside the
   * buttons) to put the red dot there. Dragging in the zone moves it. Until the first tap it sits in front of Varu (`aimPointDistance`).
   */
  laser: {
    zoneColor: 0xff4d4d,
    zoneAlpha: 0.09,
    zonePulseAlpha: 0.07,
    zonePulseMs: 420,
    borderWidth: 5,
    /** The zone is drawn this many pixels inside the screen edge. */
    inset: 10,
    cornerRadius: 26,
    hintSize: 30,
    hintY: 330,
    haptics: { tapMs: 10 },
  },
  /** On the first tap of the menu, go fullscreen (and try to lock landscape). Not available on iPhones; then it is skipped. */
  fullscreenOnStart: true,

  /**
   * Round buttons. Attack and pause are drawn by TouchOverlay. Spin and throw are drawn by ui/BeltBadges.ts at these spots
   * (it scales its badge to `r`). They sit under the right thumb and never cover the middle of the screen.
   * Attack is the biggest, at the thumb's natural rest spot; spin sits above it and throw to its left.
   */
  buttons: {
    attack: { get x() { return shiftRight(1150); }, get y() { return shiftDown(596); }, r: 70 },
    spin: { get x() { return shiftRight(1190); }, get y() { return shiftDown(436); }, r: 52 },
    throw: { get x() { return shiftRight(992); }, get y() { return shiftDown(548); }, r: 48 },
    pause: { get x() { return shiftRight(1226); }, y: 132, r: 36 },
  },
  /** A finger is fat: buttons also react this many pixels outside their circle. */
  buttonSlop: 18,

  depth: 300,
  idleAlpha: 0.3,
  activeAlpha: 0.62,
  /** Where the faint stick hint rests until the thumb lands somewhere else. */
  idleStickSpot: { x: 200, get y() { return shiftDown(540); } },
  ringWidth: 5,
  ringColor: COLORS.cream,
  knobColor: COLORS.gold,
  outlineColor: COLORS.navy,

  /**
   * The attack button's look: Varu's raised arm holding the belt, drawn with the same shapes and colors as his body (assets/art/beltArm.ts),
   * inside a soft disc like the other buttons. The art is in body-texture pixels.
   * `size` = scale of the art as a share of the button radius (so it follows the button when it squashes).
   * `center` = the point of the art that sits on the button's center: the center of the smallest circle around the whole art, so the gap
   * between the art and the ring is even all around.
   */
  attackIcon: {
    size: 1.45 / 70,
    center: { x: 93.7, y: 54.3 },
  },
  /** The attack button squashes by this much (fraction) while a thumb holds it. */
  attackHeldSquash: 0.08,
  /** The name under the attack button (it fades with the other reminders): its size and the space between it and the button. */
  attackTagSize: 24,
  attackTagGap: 18,

  /** The first seconds of a run show reminders (the stick caption, the help line, the labels under the buttons); then they fade away. */
  hintMs: 9000,
  hintFadeMs: 900,
  hintSize: 24,

  /** Short buzz on phones that support it (Android; iPhones ignore it). */
  haptics: { pressMs: 12, hurtMs: 35 },
} as const;

export type TouchButtonId = keyof typeof TOUCH.buttons;
export const TOUCH_BUTTON_IDS = Object.keys(TOUCH.buttons) as TouchButtonId[];
