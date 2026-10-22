/** @file Rolls the weather once per wave (fog, rain or clear, exclusive) and announces it with Events.WeatherChanged; Fog, Rain and the weather curses listen. */
import Phaser from 'phaser';
import { RAINBOW } from '../config/rainbow';
import { WEATHER } from '../config/weather';
import { bus, Events, listen, type WavePayload, type WeatherKind, type WeatherPayload } from '../core/events';

/**
 * One roll per wave (a wave after rain is always clear, with a rainbow): fog first, then rain, otherwise clear (so they never mix). It says the result on every wave start, 'clear' included,
 * so a listener always learns when the weather lifts. `current` is what the wave started with.
 */
export class Weather {
  private kind: WeatherKind = 'clear';

  constructor(scene: Phaser.Scene) {
    const off = listen<WavePayload>(Events.WaveStarted, ({ wave }) => this.roll(wave));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** The weather of the current wave. */
  get current(): WeatherKind {
    return this.kind;
  }

  /** Sets the weather by hand (the debug card) and announces it, as if the wave had rolled it. */
  set(weather: WeatherKind, wave: number, rainbow = false): void {
    this.kind = weather;
    const payload: WeatherPayload = { weather, wave, rainbow };
    bus.emit(Events.WeatherChanged, payload);
  }

  private roll(wave: number): void {
    // After a rainy wave the sky clears and a rainbow shows (the reward for the rain).
    if (RAINBOW.enabled && this.kind === 'rain' && Math.random() < RAINBOW.chance) {
      this.set('clear', wave, true);
      return;
    }
    const { fog, rain } = WEATHER;
    const u = Math.random();
    let weather: WeatherKind = 'clear';
    if (fog.enabled && wave >= fog.firstWave && u < fog.chance) weather = 'fog';
    else if (rain.enabled && wave >= rain.firstWave && u < fog.chance + rain.chance) weather = 'rain';
    this.set(weather, wave);
  }
}
