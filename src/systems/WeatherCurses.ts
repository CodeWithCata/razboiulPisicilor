/** @file Wave-state curses: rain gives Rusty, fog gives Emo, Marți 13 gives a mild random curse; each is re-applied every ~25 s until the wave ends. */
import Phaser from 'phaser';
import type { BadKind } from '../config/balance';
import { MARTI_13, WEATHER_CURSE } from '../config/curses';
import { MARTI_13_TEXT } from '../content/lines';
import { gameClock } from '../core/clock';
import { Events, listen, type WavePayload, type WeatherPayload } from '../core/events';
import type { CurseSystem } from './CurseSystem';

/** One thing that keeps cursing: which curse, when it is due, how often, and the line it says (if any). */
interface Source {
  kind: BadKind;
  nextAt: number;
  repeatMs: number;
  retryMs: number;
  line: string | null;
}

/**
 * Not random rolls: these curses belong to the STATE of the wave. They are given through `CurseSystem.forceWaveState` (no cooldown check,
 * but no curses before wave 4 and mercy still hold) as ordinary timed buffs, again and again, so the HUD badge works and Varu is never
 * stuck with one for the whole wave. Weather and Marți 13 are independent: both can be active at once.
 */
export class WeatherCurses {
  private weather: Source | null = null;
  private marti: Source | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly curses: CurseSystem,
    private readonly say: (text: string, lift: number, color: string, size: number) => void,
  ) {
    const off = [
      listen<WeatherPayload>(Events.WeatherChanged, ({ weather }) => this.onWeather(weather)),
      listen<WavePayload>(Events.WaveStarted, ({ wave }) => this.onWave(wave)),
      listen<WavePayload>(Events.WaveCleared, () => this.stop()),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** Every frame (game time). */
  update(now: number): void {
    if (this.weather) this.tick(this.weather, now);
    if (this.marti) this.tick(this.marti, now);
  }

  private onWeather(weather: WeatherPayload['weather']): void {
    const kind = WEATHER_CURSE.byWeather[weather];
    this.weather = kind
      ? { kind, nextAt: gameClock.now + WEATHER_CURSE.firstDelayMs, repeatMs: WEATHER_CURSE.repeatMs, retryMs: WEATHER_CURSE.retryMs, line: null }
      : null;
  }

  private onWave(wave: number): void {
    if (wave !== MARTI_13.wave) {
      this.marti = null;
      return;
    }
    const kind = Phaser.Utils.Array.GetRandom([...MARTI_13.kinds]);
    this.marti = { kind, nextAt: gameClock.now + MARTI_13.firstDelayMs, repeatMs: MARTI_13.repeatMs, retryMs: WEATHER_CURSE.retryMs, line: MARTI_13_TEXT.line };
  }

  /** The wave is over: nothing keeps cursing. */
  private stop(): void {
    this.weather = null;
    this.marti = null;
  }

  private tick(src: Source, now: number): void {
    if (now < src.nextAt) return;
    const given = this.curses.forceWaveState(src.kind);
    src.nextAt = now + (given ? src.repeatMs : src.retryMs);
    if (given && src.line) this.say(src.line, MARTI_13.line.liftPx, MARTI_13.line.color, MARTI_13.line.size);
  }
}
