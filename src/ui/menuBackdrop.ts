/** @file Static sunburst light rays behind the menu and pause menu. */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { GAME } from '../config/balance';
import { MENU } from '../config/menu';

/** Soft light rays, static (a rotating Graphics shape glitches the sprites above it). Also used behind the pause menu. */
export function createSunburst(scene: Phaser.Scene, alpha: number = MENU.sunburst.alpha): Phaser.GameObjects.Graphics {
  const S = MENU.sunburst;
  const rays = scene.add.graphics({ x: GAME.width / 2, y: S.y });
  rays.fillStyle(S.color, alpha);
  const step = (Math.PI * 2) / S.rays;
  for (let i = 0; i < S.rays; i++) {
    const a0 = i * step;
    const a1 = a0 + step / 2;
    rays.fillTriangle(0, 0, Math.cos(a0) * S.radius, Math.sin(a0) * S.radius, Math.cos(a1) * S.radius, Math.sin(a1) * S.radius);
  }
  return rays;
}

/** Dark edges so the middle pops. The canvas texture is made once and lives as long as the game. */
export function createVignette(scene: Phaser.Scene): Phaser.GameObjects.Image | null {
  const { width, height } = GAME;
  const V = MENU.vignette;
  if (!scene.textures.exists(V.key)) {
    const canvas = scene.textures.createCanvas(V.key, width, height);
    const ctx = canvas?.getContext();
    if (canvas && ctx) {
      const g = ctx.createRadialGradient(width / 2, height / 2, height * V.innerFactor, width / 2, height / 2, width * V.outerFactor);
      g.addColorStop(0, `rgba(${V.rgb},0)`);
      g.addColorStop(1, `rgba(${V.rgb},${V.strength})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      canvas.refresh();
    }
  }
  return scene.textures.exists(V.key) ? scene.add.image(0, 0, V.key).setOrigin(0) : null;
}

/** Bright grass, soft light rays and dark edges: the menu background. */
export function createMenuBackdrop(scene: Phaser.Scene): void {
  scene.add.tileSprite(0, 0, GAME.width, GAME.height, Tex.Grass).setOrigin(0);
  createSunburst(scene);
  createVignette(scene);
}
