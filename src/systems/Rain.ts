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
  /** The picture's offset: where its bottom end sits inside the picture (px), so the picture lands on (x, y). */
  ox: number;
  oy: number;
  img: Phaser.GameObjects.Image;
}

/** Geometry of one streak picture: the bottom end is at (pad + dx, pad + len), the top end at (pad, pad). `dx` is the lean. */
function streakShape(len: number, slantPx: number, lengthMax: number, lineWidth: number): { w: number; h: number; pad: number; dx: number } {
  const pad = Math.ceil(lineWidth) + 1;
  const dx = (slantPx * len) / lengthMax;
  return { w: Math.ceil(dx + pad * 2), h: len + pad * 2, pad, dx };
}

/**
 * Streaks live in screen space and wrap around the screen. Each streak is one picture of a streak of its length (baked once per length
 * in `bakeStreaks`, the color and the line width are in the picture), so a frame only moves the pictures and sets their alpha: no line is drawn
 * per frame. When the rain is gone the sheet and every streak are hidden. It does not touch cats or Varu: the effect of rain is the
 * Rusty belt (`WeatherCurses`).
 */
export class Rain {
  private readonly cfg = WEATHER.rain;
  private readonly sheet: Phaser.GameObjects.Rectangle;
  private readonly streaks: Streak[] = [];
  private target = 0;
  private current = 0;
  /** Whether the sheet and the streaks are drawn at all (hidden while the rain is gone). */
  private shown = false;

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
      .setVisible(false)
      .setDepth(this.cfg.depth);
    const S = this.cfg.streaks;
    this.bakeStreaks(scene);
    for (let i = 0; i < S.count; i += 1) {
      const len = Phaser.Math.Between(S.lengthMin, S.lengthMax);
      const shape = streakShape(len, S.slantPx, S.lengthMax, S.width);
      const img = scene.add
        .image(0, 0, streakKey(len))
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(this.cfg.depth + 0.1)
        .setVisible(false);
      this.streaks.push({
        x: Math.random() * GAME.width,
        y: Math.random() * GAME.height,
        len,
        speed: Phaser.Math.Between(S.speedMin, S.speedMax),
        ox: shape.pad + shape.dx,
        oy: shape.pad + len,
        img,
      });
    }
    const off = listen<WeatherPayload>(Events.WeatherChanged, ({ weather }) => {
      this.target = weather === 'rain' ? 1 : 0;
      if (weather === 'rain') this.onRain();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** One picture per streak length (the lengths are whole pixels), made once for the whole game. */
  private bakeStreaks(scene: Phaser.Scene): void {
    const S = this.cfg.streaks;
    for (let len = S.lengthMin; len <= S.lengthMax; len += 1) {
      const key = streakKey(len);
      if (scene.textures.exists(key)) continue;
      const { w, h, pad, dx } = streakShape(len, S.slantPx, S.lengthMax, S.width);
      const g = scene.make.graphics({}, false);
      g.lineStyle(S.width, S.color, S.alpha);
      g.lineBetween(pad, pad, pad + dx, pad + len);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  /** Every frame. `delta` is in ms. */
  update(delta: number): void {
    this.current += (this.target - this.current) * (1 - Math.exp(-delta / (this.cfg.transitionMs / 3)));
    const shown = this.current >= 0.01;
    if (shown !== this.shown) {
      this.shown = shown;
      this.sheet.setVisible(shown);
      for (const s of this.streaks) s.img.setVisible(shown);
    }
    if (!shown) return;
    this.sheet.setAlpha(this.current);
    const S = this.cfg.streaks;
    const dt = delta / 1000;
    for (const s of this.streaks) {
      s.y += s.speed * dt;
      s.x -= (S.slantPx / S.lengthMax) * s.speed * dt; // leans left as it falls
      if (s.y > GAME.height) {
        s.y = -s.len;
        s.x = Math.random() * (GAME.width + S.slantPx * 20);
      }
      if (s.x < 0) s.x += GAME.width;
      s.img.setPosition(s.x - s.ox, s.y - s.oy).setAlpha(this.current);
    }
  }
}

function streakKey(len: number): string {
  return `rain_streak_${len}`;
}
