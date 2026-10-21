/** @file Fog weather: some waves start in a mist. Cats far from Varu fade out (they walk out of the fog at him) and a soft sheet covers the arena and the screen edges go thick and white (you see less at the sides). */
import Phaser from 'phaser';
import { WEATHER } from '../config/weather';
import { GAME } from '../config/balance';
import { Events, listen, type WeatherPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/**
 * Fog is rolled once per wave (by `systems/Weather.ts`, which also decides rain) and stays on or off for that whole wave; it rolls in and lifts slowly (like the day-night sheet).
 * It only sets `Enemy.fogAlpha`: the cat decides what to draw with it (`Enemy.refreshAlpha`). Bosses, projectiles and
 * telegraphs are never touched, so the player can always read what is coming.
 */
export class Fog {
  private readonly haze: Phaser.GameObjects.Rectangle;
  /** The thick fog on the screen edges (null if the canvas could not be made: the rest of the fog still works). */
  private readonly edges: Phaser.GameObjects.Image | null;
  private readonly cfg = WEATHER.fog;
  private target = 0;
  private current = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly player: Player,
    /** Called once per wave with whether that wave started in fog (GameScene says a line). */
    private readonly onWave: (foggy: boolean) => void,
  ) {
    const M = this.cfg.haze.margin;
    this.haze = scene.add
      .rectangle(-M, -M, GAME.width + M * 2, GAME.height + M * 2, this.cfg.haze.color, this.cfg.haze.alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setAlpha(0)
      .setDepth(this.cfg.haze.depth);
    this.edges = this.makeEdges(scene);

    const off = listen<WeatherPayload>(Events.WeatherChanged, ({ weather }) => this.setFog(weather === 'fog'));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** Draws the edge fog once per screen size: clear in the middle, white toward the sides (strong) and top and bottom (lighter). */
  private makeEdges(scene: Phaser.Scene): Phaser.GameObjects.Image | null {
    const E = this.cfg.edges;
    const { width, height } = GAME;
    const key = `${E.keyPrefix}_${width}x${height}`;
    if (!scene.textures.exists(key)) {
      const canvas = scene.textures.createCanvas(key, width, height);
      const ctx = canvas?.getContext();
      if (!canvas || !ctx) return null;
      const stops = (g: CanvasGradient, strength: number, share: number): void => {
        g.addColorStop(0, `rgba(${E.rgb},${strength})`);
        g.addColorStop(share, `rgba(${E.rgb},0)`);
        g.addColorStop(1 - share, `rgba(${E.rgb},0)`);
        g.addColorStop(1, `rgba(${E.rgb},${strength})`);
      };
      const top = ctx.createLinearGradient(0, 0, 0, height);
      stops(top, E.topBottom.strength, E.topBottom.heightShare);
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, width, height);
      const sides = ctx.createLinearGradient(0, 0, width, 0);
      stops(sides, E.sides.strength, E.sides.widthShare);
      ctx.fillStyle = sides;
      ctx.fillRect(0, 0, width, height);
      canvas.refresh();
    }
    if (!scene.textures.exists(key)) return null;
    const M = this.cfg.haze.margin; // a little bigger than the screen so a camera shake never shows a bare edge
    return scene.add.image(-M, -M, key).setOrigin(0).setDisplaySize(width + M * 2, height + M * 2).setScrollFactor(0).setAlpha(0).setDepth(E.depth);
  }

  /** `Weather` rolled this wave's weather: fog on or off. */
  private setFog(foggy: boolean): void {
    this.target = foggy ? 1 : 0;
    this.onWave(foggy);
  }

  /** Call every frame before the cats think, so each cat has this frame's fog value. `delta` is in ms. */
  update(delta: number): void {
    this.current += (this.target - this.current) * (1 - Math.exp(-delta / (this.cfg.transitionMs / 3)));
    this.haze.setAlpha(this.current);
    this.edges?.setAlpha(this.current);
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      enemy.fogAlpha = this.visibleAlpha(enemy);
    }
  }

  /** 1 = fully seen. Full near Varu, fading out past `clearRadius`, hidden past `hiddenRadius`, scaled by how thick the fog is right now. */
  private visibleAlpha(enemy: Enemy): number {
    if (this.current < 0.001 || enemy.isBoss) return 1;
    const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const far = Phaser.Math.Clamp((d - this.cfg.clearRadius) / (this.cfg.hiddenRadius - this.cfg.clearRadius), 0, 1);
    const seen = 1 - far * (1 - this.cfg.hiddenAlpha);
    return 1 - this.current * (1 - seen);
  }
}
