/** @file Pictures of the touch controls (stick, knob, attack and pause buttons, the attack arm, the laser zone), baked once into textures. */
import Phaser from 'phaser';
import { drawBeltArm } from '../../assets/art/beltArm';
import { hasPicture, queuePainted, type Painter } from '../../assets/atlas';
import { GAME } from '../../config/balance';
import { COLORS } from '../../config/style';
import { TOUCH } from '../../config/touch';

/** Texture keys of the touch pictures. Each state (idle / active, held / not held) is its own picture, so a frame only switches or moves it. */
export const TOUCH_TEX = {
  stickIdle: 'touch_stick_idle',
  stickActive: 'touch_stick_active',
  knobIdle: 'touch_knob_idle',
  knobActive: 'touch_knob_active',
  attackIdle: 'touch_attack_idle',
  attackHeld: 'touch_attack_held',
  attackIcon: 'touch_attack_icon',
  pauseIdle: 'touch_pause_idle',
  pauseHeld: 'touch_pause_held',
  laserFill: 'touch_laser_fill',
  laserEdge: 'touch_laser_edge',
  laserBorder: 'touch_laser_border',
} as const;

/** The attack arm is baked at 1:1 (this many px square, its center in the middle) and scaled on screen (the one exception to "no scaling"). */
const ICON_PX = 128;

type Paint = Painter;

/** Queues one picture for the atlas, once (a picture that exists already is kept). */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: Paint): void {
  if (hasPicture(scene, key)) return;
  queuePainted(scene, key, w, h, paint);
}

/** A picture on a texture of its own: the laser zone is remade when the screen size changes, and an atlas page cannot drop a frame. */
function bakeLoose(scene: Phaser.Scene, key: string, w: number, h: number, paint: Paint): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Half-size (px) of a round picture of radius `r` with room for its outline. */
const half = (r: number): number => Math.ceil(r + 6);

/**
 * Bakes the stick, knob, attack and pause pictures (their size does not depend on the screen). The stick and knob are baked with
 * their own alpha for each state, so the alpha is part of the picture. Each picture is centered on its texture's middle.
 */
export function bakeTouchButtons(scene: Phaser.Scene): void {
  const T = TOUCH;
  const R = T.stickRadius;
  const w = T.ringWidth;
  const sH = half(R);
  const stick = (key: string, alpha: number): void =>
    bake(scene, key, sH * 2, sH * 2, (g) => {
      const c = sH;
      g.fillStyle(T.ringColor, alpha * 0.3).fillCircle(c, c, R);
      g.lineStyle(w + 4, T.outlineColor, alpha).strokeCircle(c, c, R - w / 2);
      g.lineStyle(w, T.ringColor, alpha).strokeCircle(c, c, R - w / 2);
    });
  stick(TOUCH_TEX.stickIdle, T.idleAlpha);
  stick(TOUCH_TEX.stickActive, T.activeAlpha);

  const kr = T.knobRadius;
  const kH = Math.ceil(kr + 5);
  const knob = (key: string, alpha: number): void =>
    bake(scene, key, kH * 2, kH * 2, (g) => {
      const c = kH;
      g.fillStyle(T.outlineColor, alpha).fillCircle(c, c, kr + 3);
      g.fillStyle(T.knobColor, alpha).fillCircle(c, c, kr);
      g.fillStyle(COLORS.white, alpha * 0.4).fillCircle(c - kr * 0.32, c - kr * 0.32, kr * 0.28);
    });
  knob(TOUCH_TEX.knobIdle, T.idleAlpha);
  knob(TOUCH_TEX.knobActive, T.knobActiveAlpha);

  const a = T.buttons.attack;
  const aH = half(a.r);
  const attack = (key: string, held: boolean): void =>
    bake(scene, key, aH * 2, aH * 2, (g) => {
      const c = aH;
      const r = a.r * (held ? 1 - T.attackHeldSquash : 1);
      const tone = held ? COLORS.gold : COLORS.cream;
      g.fillStyle(tone, held ? 0.5 : 0.26).fillCircle(c, c, r);
      g.lineStyle(T.ringWidth + 4, T.outlineColor, held ? 0.9 : 0.55).strokeCircle(c, c, r - 2);
      g.lineStyle(T.ringWidth, tone, held ? 1 : 0.8).strokeCircle(c, c, r - 2);
    });
  attack(TOUCH_TEX.attackIdle, false);
  attack(TOUCH_TEX.attackHeld, true);

  // The arm: its art point `attackIcon.center` is put on the middle of the picture.
  const ic = T.attackIcon.center;
  bake(scene, TOUCH_TEX.attackIcon, ICON_PX, ICON_PX, (g) => drawBeltArm(g, ic.x - ICON_PX / 2, ic.y - ICON_PX / 2));

  const b = T.buttons.pause;
  const pH = half(b.r);
  const pause = (key: string, held: boolean): void =>
    bake(scene, key, pH * 2, pH * 2, (g) => {
      const c = pH;
      const tone = held ? COLORS.gold : COLORS.cream;
      g.fillStyle(tone, held ? 0.45 : 0.22).fillCircle(c, c, b.r);
      g.lineStyle(4, tone, 0.75).strokeCircle(c, c, b.r - 2);
      const barW = b.r * 0.22;
      const barH = b.r * 0.72;
      const gap = b.r * 0.26;
      for (const side of [-1, 1]) {
        const left = c + side * (gap / 2 + barW / 2) - barW / 2;
        g.fillStyle(COLORS.navy, 1).fillRoundedRect(left - 2.5, c - barH / 2 - 2.5, barW + 5, barH + 5, (barW + 5) / 2);
        g.fillStyle(COLORS.cream, 1).fillRoundedRect(left, c - barH / 2, barW, barH, barW / 2);
      }
    });
  pause(TOUCH_TEX.pauseIdle, false);
  pause(TOUCH_TEX.pauseHeld, true);
}

/** The laser zone's pictures for the current screen size: `x`, `y` is where the picture's top-left goes (it has a margin `pad` around the zone). */
export interface LaserZoneLayout {
  readonly x: number;
  readonly y: number;
  readonly pad: number;
  /** The screen size these pictures were made for (they are made again when it changes). */
  readonly screenW: number;
  readonly screenH: number;
}

/**
 * Bakes the laser zone (fill, navy outline, red border) for the current screen size. The fill and the red border get their alpha each frame
 * (the zone pulses); the navy outline is baked at its own alpha. Remakes the pictures under the same keys when the screen size changed.
 */
export function bakeLaserZone(scene: Phaser.Scene): LaserZoneLayout {
  const L = TOUCH.laser;
  const pad = Math.ceil(L.borderWidth / 2) + 4;
  const x = GAME.width * TOUCH.leftZone + L.inset;
  const w = GAME.width - x - L.inset;
  const h = GAME.height - L.inset * 2;
  const W = Math.ceil(w + pad * 2);
  const H = Math.ceil(h + pad * 2);
  for (const key of [TOUCH_TEX.laserFill, TOUCH_TEX.laserEdge, TOUCH_TEX.laserBorder]) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  bakeLoose(scene, TOUCH_TEX.laserFill, W, H, (g) => g.fillStyle(L.zoneColor, 1).fillRoundedRect(pad, pad, w, h, L.cornerRadius));
  bakeLoose(scene, TOUCH_TEX.laserEdge, W, H, (g) => g.lineStyle(L.borderWidth + 4, TOUCH.outlineColor, 0.5).strokeRoundedRect(pad, pad, w, h, L.cornerRadius));
  bakeLoose(scene, TOUCH_TEX.laserBorder, W, H, (g) => g.lineStyle(L.borderWidth, L.zoneColor, 1).strokeRoundedRect(pad, pad, w, h, L.cornerRadius));
  return { x: x - pad, y: L.inset - pad, pad, screenW: GAME.width, screenH: GAME.height };
}
