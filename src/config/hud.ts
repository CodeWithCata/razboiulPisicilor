import { shiftRight } from './balance';

/**
 * The HUD (UIScene): where things sit and how big they are, in game pixels (1280x720).
 * Colors that mean something (health, boss bar) are here too. Texts are in content/lines.ts.
 */
export const HUD = {
  margin: 24,

  /** Varu's health is the Siamese face + heart + bar (config/catMeter.ts). */
  /** The "VARU" label to the right of the cat face. */
  name: { x: 108, y: 22, size: 26 },
  score: { y: 12, size: 32, popFromScale: 1.18, popMs: 120 },
  best: { y: 50, size: 20, alpha: 0.85, strokeThickness: 4 },
  wave: { y: 12, size: 30 },
  /** The controls reminder at the bottom of the screen. */
  help: {
    bottom: 20,
    size: 20,
    alpha: 0.8,
    strokeThickness: 4,
    /** The little "H = ascunde" button (ui/ControlsHint.ts) sits this far above the reminder line, and slides down to the bottom edge when the reminder is hidden. */
    chipGap: 14,
    chipSize: 16,
    chipAlpha: 0.85,
    chipHiddenAlpha: 0.6,
    chipCapH: 20,
    chipCapMinW: 26,
    chipCapLip: 3,
    chipGapX: 8,
    slideMs: 220,
  },
  /**
   * Phones: the pause button (config/touch.ts) sits under the score with the speaker next to it, and a few texts are bigger,
   * because the game is drawn at about half size on a phone. The help line is wrapped to this width so it fits between the thumbs.
   */
  touch: { mute: { get x() { return shiftRight(1128); }, y: 132 }, bestSize: 24, helpSize: 26, helpWidth: 600 },
  /** Dev-only cheat sheet card (ui/DebugPanel.ts): bottom-left, above the controls reminder. Two columns of blocks. */
  debugPanel: {
    left: 20,
    bottom: 62,
    colW: 276,
    colGap: 18,
    padX: 16,
    padY: 12,
    titleH: 38,
    sectionH: 26,
    sectionGap: 6,
    rowH: 27,
    footerH: 30,
    radius: 14,
    backAlpha: 0.88,
    alpha: 0.97,
    depth: 90,
    titleSize: 24,
    hintSize: 15,
    statsSize: 15,
    sectionSize: 15,
    keySize: 16,
    labelSize: 17,
    footerSize: 16,
    pillSize: 12,
    capH: 20,
    capMinW: 40,
    capCharW: 10,
    capLip: 3,
    labelGap: 12,
    flashMs: 140,
    footerFadeMs: 1400,
    onColor: 0x6fd36f,
    offColor: 0x5b6590,
  },

  /** The power-up timers (round badges under the cat meter) are in config/buffBadges.ts. */

  boss: {
    nameY: 54,
    nameSize: 28,
    barY: 94,
    barW: 560,
    barH: 22,
    frame: 5,
    frameRadius: 12,
    radius: 8,
    minW: 6,
    color: 0xd9534f,
    lowColor: 0xff9f43,
    /** Below this fraction of its health the bar changes color (the boss is in phase 2). A notch marks the spot. */
    lowAt: 0.5,
    trackColor: 0x0f1530,
    ghostColor: 0xfff3d6,
    /** Sliding in from the top when the boss appears, and out when it falls. */
    slideInMs: 450,
    slideOutMs: 500,
    slideFromY: -90,
    /** How fast the fill catches up with the real health (bigger = slower), and how the pale "just lost" chunk drains. */
    fillCatchUpMs: 90,
    ghostHoldMs: 450,
    ghostDrainPerSec: 0.55,
    /** A hit: the bar flashes white and jolts sideways for this long. */
    hitFlashMs: 140,
    hitShake: 3,
    /** Phase 2 (below lowAt): the bar breathes, this long per breath, up to this much extra brightness. */
    pulseMs: 700,
    pulseBright: 0.28,
    /** After the boss falls, the empty bar stays this long before it slides away. */
    defeatHoldMs: 600,
    nameLineW: 70,
    /** The boss's name pops up this long after it appears (the photo card goes first). */
    nameBannerDelayMs: 1100,
    bannerYOffset: -10,
    bannerSize: 64,
    bannerColor: '#ffd9a8',
    phaseColor: '#ff8a8a',
  },

  /** Big centered words ("VALUL 3", boss names). Offsets are from the middle of the screen. */
  banner: {
    yOffset: -120,
    size: 96,
    fromScale: 1.6,
    popInMs: 260,
    holdMs: 900,
    fadeOutMs: 400,
    endlessYOffset: -30,
    endlessSize: 56,
    color: '#fff3d6',
    endlessColor: '#f5c518',
    pickupColor: '#d9c8ff',
  },

  /** The belt cooldown badges (bottom right) are in config/beltBadges.ts. */

  /** The speaker icon sits under the score and record, top right. */
  muteBadge: { right: 46, y: 104 },

  /** Stroke of all HUD text. */
  strokeThickness: 5,
} as const;
