/** @file Weather numbers: which waves can start in fog, how far Varu sees cats through it, and the mist sheet. No Phaser. */
import { DAY_NIGHT } from './dayNight';

/**
 * Weather is rolled once per wave (`WaveStarted`) and stays for that wave. Right now there is one weather: fog.
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
  },
} as const;
