/** @file Flat round shapes (a filled disc, a thin ring) drawn as tinted atlas images, so they batch with the sprites around them instead of splitting the batch like `add.circle`. */
import Phaser from 'phaser';
import { texArgs } from '../assets/atlas';
import { FX_DISC_R, FX_HOOP_R } from '../assets/art/fx';
import { Tex } from '../assets/keys';

/** One flat color: the picture's own color is replaced, its shape and soft alpha stay. */
function flat(image: Phaser.GameObjects.Image, color: number, alpha: number): Phaser.GameObjects.Image {
  return image.setTint(color).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha);
}

/** A filled disc of this radius (px), like `scene.add.circle(x, y, radius, color, alpha)`. To grow it, tween `scale` (it starts at `radius / FX_DISC_R`; read it back with `.scale`). */
export function flatDisc(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, alpha: number): Phaser.GameObjects.Image {
  return flat(scene.add.image(x, y, ...texArgs(Tex.FxDisc)).setScale(radius / FX_DISC_R), color, alpha);
}

/** A thin ring of this outer radius (px) with a faint fill: the outline of a ground warning. `alpha` is the ring's; the fill follows at about a tenth of it. */
export function flatHoop(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, alpha: number): Phaser.GameObjects.Image {
  return flat(scene.add.image(x, y, ...texArgs(Tex.FxHoop)).setScale(radius / FX_HOOP_R), color, alpha);
}
