/** @file Low-health warning numbers: how often the heartbeat thumps and how the red screen edge pulses. No Phaser. */
import { JOKE_TUNING } from './jokes';

export const LOW_HP = {
  enabled: true,
  /** Below this share of max HP the heartbeat starts (the same line as the "low HP" joke). */
  ratio: JOKE_TUNING.lowHpRatio,
  /** Time between beats: slow just under the line, fast when almost dead (game ms). */
  beatMs: { slow: 1150, fast: 520 },
  /** The red edge (ui/LowHpVignette.ts). `rest` = glow between beats, `peak` = flash on a beat, both 0..1 and stronger when closer to death. */
  vignette: {
    keyPrefix: 'lowhp_vignette',
    rgb: '214,36,48',
    innerFactor: 0.42,
    outerFactor: 0.7,
    strength: 0.85,
    rest: { min: 0.12, max: 0.35 },
    peak: { min: 0.5, max: 1 },
    decayMs: 420,
    fadeOutMs: 400,
    depth: 0,
  },
} as const;
