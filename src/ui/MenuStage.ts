/** @file Varu wobbling in the middle of the main menu. */
import { texArgs } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { GAME } from '../config/balance';
import { MENU } from '../config/menu';

/** Varu in the middle of the menu, wobbling, with a soft shadow. */
export function createMenuVaru(scene: Phaser.Scene): void {
  const S = MENU.stage;
  const x = GAME.width / 2;
  scene.add.ellipse(x, S.centerY + S.shadow.dy, S.shadow.w, S.shadow.h, 0x000000, S.shadow.alpha);
  const varu = scene.add.image(x, S.centerY, ...texArgs(Tex.Varu)).setScale(S.varuScale);
  scene.tweens.add({
    targets: varu,
    angle: { from: -S.varuTiltDeg, to: S.varuTiltDeg },
    scale: { from: S.varuScale, to: S.varuScaleTo },
    duration: S.varuMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/** Cats on an oval around Varu, all facing him, creeping closer and backing off again. */
export function createCatRing(scene: Phaser.Scene): void {
  const R = MENU.ring;
  const cx = GAME.width / 2;
  const cy = MENU.stage.centerY;
  R.kinds.forEach((key, i) => {
    const angle = R.startAngle + (i / R.kinds.length) * Math.PI * 2;
    const cat = scene.add.image(0, 0, ...texArgs(key)).setScale(R.catScale);
    // Sprites face UP, so a quarter turn plus half a turn points the head at the center.
    const place = (radius: number): void => {
      cat.setPosition(cx + Math.cos(angle) * radius * R.xStretch, cy + Math.sin(angle) * radius * R.yStretch);
      cat.setRotation(angle + Math.PI * 1.5);
    };
    place(R.radiusFrom);
    scene.tweens.addCounter({
      from: R.radiusFrom,
      to: R.radiusTo,
      duration: R.baseMs + i * R.stepMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => place(tween.getValue() ?? R.radiusFrom),
    });
  });
}
