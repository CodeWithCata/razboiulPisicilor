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
   * Attack is the biggest, at the thumb's natural rest spot; spin sits above it and throw to its left; the dodge roll sits above throw.
   */
  buttons: {
    attack: { get x() { return shiftRight(1150); }, get y() { return shiftDown(596); }, r: 70 },
    spin: { get x() { return shiftRight(1190); }, get y() { return shiftDown(436); }, r: 52 },
    throw: { get x() { return shiftRight(992); }, get y() { return shiftDown(548); }, r: 48 },
    roll: { get x() { return shiftRight(1010); }, get y() { return shiftDown(412); }, r: 48 },
    pause: { get x() { return shiftRight(1226); }, y: 132, r: 36 },
  },
  /** A finger is fat: buttons also react this many pixels outside their circle. */
  buttonSlop: 18,

  depth: 300,
  idleAlpha: 0.3,
  activeAlpha: 0.62,
  /** The knob's alpha while the thumb is on the stick (idle: `idleAlpha`). */
  knobActiveAlpha: 0.95,
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
  /** The belt arm on the attack button wobbles when a thumb lands on it (`cycles` swings in `ms`, then it settles). */
  attackWobble: { ms: 300, deg: 12, cycles: 2.5 },
  /** The name under the attack button (it fades with the other reminders): its size and the space between it and the button. */
  attackTagSize: 24,
  attackTagGap: 18,

  /** The first seconds of a run show reminders (the stick caption, the help line, the labels under the buttons); then they fade away. */
  hintMs: 9000,
  hintFadeMs: 900,
  hintSize: 24,

  /**
   * Short buzzes on phones that support it (Android; iPhones ignore them). A number is one buzz (ms), a list is buzz / pause / buzz...
   * A buzz that comes less than `minGapMs` after the last one is dropped (a crowd of events must not turn into one long hum).
   * The pause-menu switch "Vibrație" turns all of it off (core/settings.ts).
   */
  haptics: {
    pressMs: 12,
    hurtMs: 35,
    minGapMs: 45,
    /** The dodge roll starts; a roll that saved Varu from a hit. */
    dodgeMs: 18,
    dodgeSave: [14, 40, 14] as readonly number[],
    /** The finisher lands on a cat; a hit inside a boss weak-point window. */
    finisherMs: 45,
    weakHitMs: 30,
    /** A belt upgrade card is picked, the rare synergy card, a pickup is grabbed. */
    pickMs: 25,
    synergy: [20, 45, 20, 45, 60] as readonly number[],
    pickupMs: 14,
    /** A new combo tier. */
    tierMs: 35,
    /** A boss goes down: a rolling thump. */
    bossDefeated: [70, 50, 70, 50, 180] as readonly number[],
  },

  /**
   * The four action buttons (attack, spin, throw, roll) can be moved and resized by the player (pause menu, phones only: "Butoane").
   * `sizes` multiply the radius in `buttons`; `defaultSize` is the size a button has until it is changed (roll was made bigger in v224).
   * A spot is saved as an offset from the default spot (so it keeps hugging the same corner on any screen). A button stays inside the
   * right part of the screen, `edgeMargin` from the edges, below `topLimit` (the pause button and the combo counter live above), and
   * never on top of another button (`gap` px between circles).
   */
  layout: {
    sizes: [
      { id: 'small', k: 0.8 },
      { id: 'normal', k: 1 },
      { id: 'big', k: 1.25 },
      { id: 'huge', k: 1.5 },
    ] as const,
    defaultSize: { attack: 'normal', spin: 'normal', throw: 'normal', roll: 'big' } as const,
    edgeMargin: 14,
    topLimit: 250,
    gap: 10,
  },
  /** The screen where the buttons are moved and resized (opened from the pause menu). */
  layoutEditor: {
    depth: 260,
    dimColor: 0x14182b,
    dimAlpha: 0.8,
    ghostAlpha: 0.35,
    ghostColor: 0xfff3d6,
    badColor: 0xff5a5a,
    goodColor: 0xf5c518,
    ringWidth: 6,
    titleY: 64,
    titleSize: 46,
    helpY: 120,
    helpSize: 24,
    buttonsY: 664,
    buttonW: 250,
    buttonH: 64,
    buttonGap: 28,
    buttonSize: 28,
  },
} as const;

export type TouchButtonId = keyof typeof TOUCH.buttons;
export type TouchSizeId = (typeof TOUCH.layout.sizes)[number]['id'];
/** The buttons the player can move and resize (the pause button and the floating stick stay where they are). */
export const MOVABLE_BUTTON_IDS = ['attack', 'spin', 'throw', 'roll'] as const;
export type MovableButtonId = (typeof MOVABLE_BUTTON_IDS)[number];
export const TOUCH_BUTTON_IDS = Object.keys(TOUCH.buttons) as TouchButtonId[];
