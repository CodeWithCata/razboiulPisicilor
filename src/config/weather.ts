/** @file Weather numbers: which waves can start in fog, how far Varu sees cats through it, the mist sheet and the thick edges of the screen. No Phaser. */
import { DAY_NIGHT } from './dayNight';

/**
 * Weather is rolled once per wave (`WaveStarted`) and stays for that wave. There are two weathers, exclusive: fog and rain (a wave can also be clear).
 * Fog hides cats that are far from Varu, so they walk out of the mist at him. It never hides bosses, projectiles or telegraphs.
 */
export const WEATHER = {
  fog: {
    enabled: true,
    /** Chance (0..1) that a wave starts in fog. Every wave rolls again, so fog comes and goes. */
    chance: 0.3,
    /** No fog before this wave (wave 1 stays clear: it is the warm-up). */
    firstWave: 2,
    /** How slowly the fog rolls in or lifts (ms for about 95% of the change). */
    transitionMs: 2000,
    /** Distance from Varu in world px. Cats closer than `clearRadius` are fully seen, cats farther than `hiddenRadius` are hidden, and they fade in between. */
    clearRadius: 240,
    hiddenRadius: 460,
    /** Alpha of a cat that is hidden in the fog (0 = invisible). A little above 0 shows a faint hint. Its ground shadow fades with it. */
    hiddenAlpha: 0,
    /** The mist sheet over the arena. Same layer as the night tint; `alpha` is how thick it looks at full fog. */
    haze: { color: 0xc9d6de, alpha: 0.16, depth: DAY_NIGHT.depth + 0.5, margin: DAY_NIGHT.margin },
    /**
     * The thick fog on the screen edges ("tunnel" look): you see clearly in the middle and less and less toward the sides.
     * It is a picture drawn once (a canvas texture) and fades in and out with the fog. `strength` is how white the very edge gets (0..1),
     * `widthShare` how far in from each side it reaches (share of the screen width); the top and bottom get a lighter version.
     */
    edges: {
      rgb: '201,214,222',
      keyPrefix: 'fog_edges',
      depth: DAY_NIGHT.depth + 0.6,
      sides: { strength: 0.9, widthShare: 0.3 },
      topBottom: { strength: 0.45, heightShare: 0.22 },
    },
  },
  /**
   * Rain: a wave can start in rain instead of fog (they are exclusive: one roll per wave, fog first, then rain, otherwise clear).
   * Visual only (streaks fall over the screen, a faint grey sheet); its effect is the Rusty belt (`WEATHER_CURSE` in config/curses.ts).
   * With fog 30% and rain 25% a wave is clear 45% of the time.
   */
  rain: {
    enabled: true,
    chance: 0.25,
    /** No rain before this wave (wave 1 stays clear). */
    firstWave: 2,
    /** How slowly the rain starts and stops (ms for about 95% of the change). */
    transitionMs: 1500,
    /** The streaks: drawn on the screen (not the world). `slantPx` is how far a streak leans sideways over its length. */
    streaks: { count: 110, lengthMin: 14, lengthMax: 30, speedMin: 900, speedMax: 1400, slantPx: 6, width: 2, color: 0xbfd8ee, alpha: 0.55 },
    /** The grey sheet over the arena. */
    sheet: { color: 0x2b3a4a, alpha: 0.14 },
    depth: DAY_NIGHT.depth + 0.7,
    margin: DAY_NIGHT.margin,
  },
} as const;
