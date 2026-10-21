/** @file Cutscene numbers: cinema bars, dialogue box, typewriter, skip, camera, walking and emotes. No Phaser. */
import type { EaseName } from '../core/ease';

/**
 * Everything about HOW cutscenes look and feel. The cutscenes themselves are data in `content/cutscenes.ts`,
 * the words in the same file. Times are real milliseconds (a cutscene never runs on the slow-mo clock).
 */
export const CUTSCENE = {
  /** false = every cutscene is skipped silently: the game plays exactly like before cutscenes existed. */
  enabled: true,
  /** A frame longer than this counts as this long (a tab that was asleep must not fast-forward a scene). */
  maxStepMs: 100,
  /** Once a trigger fires, wait this long before the scene starts (so the "VALUL n" banner is not trampled). */
  triggerDelayMs: 350,
  hud: { fadeMs: 300 },
  bars: { heightShare: 0.12, slideMs: 420, color: 0x0b0f1d },
  camera: {
    defaultMs: 900,
    /** The camera glides back to Varu this long before the game takes over again. */
    returnMs: 650,
    ease: 'smooth' as EaseName,
  },
  /** The dialogue box (cream card, navy outline: the same look as the photo frames). */
  box: {
    widthShare: 0.76,
    maxWidth: 1000,
    height: 150,
    gapAboveBar: 26,
    pad: 22,
    radius: 18,
    fill: 0xfff3d6,
    outline: 0x1b2340,
    outlineWidth: 5,
    textSize: 30,
    textColor: '#1b2340',
    lineSpacing: 6,
    nameSize: 26,
    nameStroke: 6,
    nameLift: 30,
    /** The speaker stands on a top corner of the box (left / right, alternating), BEHIND it: `overlap` px of the character are hidden by the box. */
    portrait: { size: 230, inset: 10, overlap: 36, nameGap: 14, slidePx: 46, slideMs: 240 },
    popMs: 200,
    popFromScale: 0.9,
    prompt: { size: 16, bobPx: 5, bobMs: 420, color: 0xd93a3a },
  },
  /** The typewriter. Pauses are extra ms after that character. */
  type: {
    charsPerSec: 38,
    pauses: { ',': 110, '.': 260, '!': 260, '?': 260, '…': 320, ':': 160 } as Readonly<Record<string, number>>,
    blipEveryChars: 2,
    blipPitchJitter: 0.12,
  },
  /** How long an `auto` line stays after it is typed: per letter, but never shorter than the minimum. */
  read: { msPerChar: 45, minHoldMs: 900 },
  /** Tap / click / Space / Enter = next line. Hold = skip the whole scene. */
  skip: {
    holdMs: 900,
    ringDelayMs: 160,
    tapMaxMs: 350,
    keys: ['Space', 'Enter'] as readonly string[],
    /** The visible "Sari peste" button, top right (tap / click = skip at once). */
    button: { right: 24, top: 18, padX: 18, padY: 8, size: 22, fill: 0xf5c518, outline: 0x1b2340, outlineWidth: 4, textColor: '#1b2340', pressedAlpha: 0.7 },
    /** The hold-to-skip ring sits left of the button, the hint left of the ring. */
    ring: { gapPx: 34, radius: 22, width: 6, color: 0xf5c518, backColor: 0x1b2340, backAlpha: 0.6 },
    hint: { size: 20, color: '#fff3d6', stroke: 4, alpha: 0.85, showMs: 3600, fadeMs: 500, gapPx: 18 },
  },
  /** Things a script puts on the stage (`show`). */
  actors: { defaultSize: 64, fadeMs: 250, depth: 14 },
  /** Varu walking by script uses his real walk (the scripted input), with a safety net. */
  walk: { stopRadiusPx: 6, maxMs: 6000 },
  /** `emote` looks. */
  emote: { defaultMs: 500, popScale: 1.35, shakePx: 5, shakeHz: 18 },
  shake: { ms: 300, power: 0.01 },
  flash: { ms: 250, color: 0xffffff },
  fade: { ms: 600 },
  /** The floating word of a `text` step. */
  text: { color: '#fff3d6', size: 30 },
} as const;
