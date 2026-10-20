/** @file The animated game logo: VARU, red "vs." badge, PISICILE. */
import Phaser from 'phaser';
import { MENU } from '../config/menu';
import { COLORS, FONT } from '../config/style';
import { MENU_TEXT } from '../content/lines';
import { GAME } from '../config/balance';
import { createLogoWord } from './logoWord';

const NAVY = '#1b2340';

/** The game logo: gold VARU, a red "vs." badge, cream PISICILE, each with a hard drop shadow. Pops in, the badge wobbles. */
export function createTitleLogo(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const L = MENU.logo;
  const badge = scene.add.graphics();
  badge.fillStyle(COLORS.red, 1).fillRoundedRect(-L.vs.w / 2, -L.vs.h / 2, L.vs.w, L.vs.h, L.vs.radius);
  badge.lineStyle(L.vs.border, COLORS.navy, 1).strokeRoundedRect(-L.vs.w / 2, -L.vs.h / 2, L.vs.w, L.vs.h, L.vs.radius);
  const vsText = scene.add.text(0, 2, MENU_TEXT.titleVs, { fontFamily: FONT, fontSize: `${L.vs.size}px`, color: '#fff3d6', stroke: NAVY, strokeThickness: 5 }).setOrigin(0.5);
  const vs = scene.add.container(0, L.vs.y, [badge, vsText]).setAngle(L.vs.angleFrom);

  const logo = scene.add.container(GAME.width / 2, L.y, [
    ...createLogoWord(scene, MENU_TEXT.titleTop, L.top.size, L.top.color, L.top.y, L.top.stroke),
    vs,
    ...createLogoWord(scene, MENU_TEXT.titleBottom, L.bottom.size, L.bottom.color, L.bottom.y, L.bottom.stroke),
  ]);
  logo.setAngle(L.angleDeg);
  scene.tweens.add({ targets: logo, scale: { from: 0.5, to: 1 }, duration: L.introMs, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: vs, angle: { from: L.vs.angleFrom, to: L.vs.angleTo }, duration: L.vs.wobbleMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return logo;
}
