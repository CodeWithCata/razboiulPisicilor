/** @file Day-night numbers: the sky tint keyframes, how fast it changes, and the lamps that light up at night. No Phaser. */
import { ARENA, PLAY_AREA } from './arena';

/**
 * The arena drifts from warm afternoon to night over the campaign: wave 1 is afternoon, the last wave (the tennis cat) is full night.
 * The tint is a colored sheet over the world (above cats, below effects and words), so keep `alpha` low enough that the red boss
 * warnings stay easy to read. Endless mode swings between day and night every `endlessCycleWaves` waves.
 */
export const DAY_NIGHT = {
  enabled: true,
  /** How slowly the sky catches up with the wave (ms for about 95% of the change). */
  transitionMs: 5000,
  endlessCycleWaves: 10,
  /** Above the world (actors are 10-29, effects 40+, floating words 60), under the lamp glow. */
  depth: 30,
  /** The sheet is bigger than the screen by this much on every side, so camera shake never shows an edge. */
  margin: 200,
  /** `at` = how far through the night (0 = first wave, 1 = last wave). Colors and alphas glide between keys. */
  sky: [
    { at: 0, color: 0xffb54a, alpha: 0.06 }, // warm afternoon
    { at: 0.35, color: 0xffa040, alpha: 0.12 }, // golden hour
    { at: 0.65, color: 0xe0644f, alpha: 0.2 }, // sunset
    { at: 0.85, color: 0x5b3e8c, alpha: 0.3 }, // dusk
    { at: 1, color: 0x14204a, alpha: 0.4 }, // night
  ],
  /** Floor lamps (top-down: a dark base with a bright bulb), in world px. They glow from `onAt` on, full at night. */
  lamps: [
    { x: PLAY_AREA.left + 480, y: PLAY_AREA.top + 240 },
    { x: PLAY_AREA.left + 1440, y: PLAY_AREA.top + 240 },
    { x: PLAY_AREA.left + 960, y: PLAY_AREA.top + 430 },
    { x: PLAY_AREA.left + 480, y: PLAY_AREA.top + 880 },
    { x: PLAY_AREA.left + 1440, y: PLAY_AREA.top + 880 },
  ],
  lamp: {
    onAt: 0.55,
    glowKey: 'lamp_glow',
    glowTexture: 256,
    glowRadius: 190,
    glowRgb: '255,214,120',
    glowAlpha: 0.55,
    glowDepth: 31,
    /** Slow flicker: how much and how fast (ms per cycle). */
    flicker: 0.08,
    flickerMs: 900,
    baseRadius: 10,
    baseColor: 0x2b2b3a,
    bulbRadius: 5,
    bulbColor: 0xfff1b0,
    /** Base and bulb sit on the floor, just above the walls layer. */
    floorDepth: ARENA.depth.walls + 0.5,
  },
} as const;
