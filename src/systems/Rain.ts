/** @file Rain weather visual: falling streaks drawn on the screen and a faint grey sheet; both fade in and out with the weather. Visual only. */
import Phaser from 'phaser';
import { WEATHER } from '../config/weather';
import { GAME } from '../config/balance';
import { Events, listen, type WeatherPayload } from '../core/events';

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
}

/**
 * Streaks live in screen space (scroll factor 0 on the Graphics) and wrap around the screen, so the rain costs one Graphics redrawn each
 * frame and nothing else. It does not touch cats or Varu: the effect of rain is the Rusty belt (`WeatherCurses`).
 */
export class Rain {
  private readonly cfg = WEATHER.rain;
  private readonly sheet: Phaser.GameObjects.Rectangle;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly streaks: Streak[] = [];
  private target = 0;
  private current = 0;

  constructor(
    scene: Phaser.Scene,
    /** Called once when a wave starts in rain (GameScene says a line). */
    private readonly onRain: () => void,
  ) {
    const M = this.cfg.margin;
    this.sheet = scene.add
      .rectangle(-M, -M, GAME.width + M * 2, GAME.height + M * 2, this.cfg.sheet.color, this.cfg.sheet.alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0)
      .setDepth(this.cfg.depth);
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(this.cfg.depth + 0.1).setAlpha(0);
    const S = this.cfg.streaks;
    for (let i = 0; i < S.count; i += 1) {
      this.streaks.push({
        x: Math.random() * GAME.width,
        y: Math.random() * GAME.height,
        len: Phaser.Math.Between(S.lengthMin, S.lengthMax),
        speed: Phaser.Math.Between(S.speedMin, S.speedMax),
      });
    }
    const off = listen<WeatherPayload>(Events.WeatherChanged, ({ weather }) => {
      this.target = weather === 'rain' ? 1 : 0;
      if (weather === 'rain') this.onRain();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** Every frame. `delta` is in ms. */
  update(delta: number): void {
    this.current += (this.target - this.current) * (1 - Math.exp(-delta / (this.cfg.transitionMs / 3)));
    this.sheet.setAlpha(this.current);
    if (this.current < 0.01) {
      this.gfx.clear().setAlpha(0);
      return;
    }
    const S = this.cfg.streaks;
    const dt = delta / 1000;
    this.gfx.clear().setAlpha(this.current);
    this.gfx.lineStyle(S.width, S.color, S.alpha);
    for (const s of this.streaks) {
      s.y += s.speed * dt;
      s.x -= (S.slantPx / S.lengthMax) * s.speed * dt; // leans left as it falls
      if (s.y > GAME.height) {
        s.y = -s.len;
        s.x = Math.random() * (GAME.width + S.slantPx * 20);
      }
      if (s.x < 0) s.x += GAME.width;
      this.gfx.lineBetween(s.x, s.y, s.x - (S.slantPx * s.len) / S.lengthMax, s.y - s.len);
    }
  }
}
