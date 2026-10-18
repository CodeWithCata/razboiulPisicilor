import Phaser from 'phaser';
import { photoKey, Tex, type PhotoId } from '../assets/keys';
import { PHOTO_FRAME } from '../config/jokes';
import { COLORS, FONT } from '../config/style';
import { PHOTO_CAPTIONS } from '../content/jokes';

export interface PhotoFrameOptions {
  x: number;
  y: number;
  /** Side of the square the photo is fitted into, game px. */
  size: number;
  tiltDeg?: number;
}

/**
 * A polaroid-style card for a friend photo: the real picture when it is listed in
 * assets/manifest.ts (PHOTO_MANIFEST), otherwise a silhouette labeled "FOTO".
 * The caption comes from content/jokes.ts (PHOTO_CAPTIONS).
 */
export function createPhotoFrame(scene: Phaser.Scene, id: PhotoId, { x, y, size, tiltDeg = 0 }: PhotoFrameOptions): Phaser.GameObjects.Container {
  const border = PHOTO_FRAME.border;
  const real = scene.textures.exists(photoKey(id));

  const caption = scene.add
    .text(0, 0, PHOTO_CAPTIONS[id], {
      fontFamily: FONT,
      fontSize: `${PHOTO_FRAME.captionSize}px`,
      color: '#1b2340',
      align: 'center',
      wordWrap: { width: size },
    })
    .setOrigin(0.5);

  const stripH = caption.height + border * 2;
  const width = size + border * 2;
  const height = border + size + stripH;
  const photoY = -height / 2 + border + size / 2;
  caption.setY(height / 2 - stripH / 2);

  const card = scene.add.rectangle(0, 0, width, height, COLORS.cream).setStrokeStyle(4, COLORS.navy);
  const backdrop = scene.add.rectangle(0, photoY, size, size, 0x14182b);
  const picture = scene.add.image(0, photoY, real ? photoKey(id) : Tex.PhotoPlaceholder);
  picture.setScale(size / Math.max(picture.frame.realWidth, picture.frame.realHeight));

  const parts: Phaser.GameObjects.GameObject[] = [card, backdrop, picture, caption];
  if (!real) {
    parts.push(
      scene.add
        .text(0, photoY + size / 2 - 22, PHOTO_FRAME.placeholderLabel, {
          fontFamily: FONT,
          fontSize: `${PHOTO_FRAME.labelSize}px`,
          color: '#ffd9a8',
          stroke: '#1b2340',
          strokeThickness: 4,
        })
        .setOrigin(0.5),
    );
  }
  return scene.add.container(x, y, parts).setAngle(tiltDeg);
}
