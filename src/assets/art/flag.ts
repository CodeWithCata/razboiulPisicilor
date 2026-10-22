/** @file The surrender flag's two pictures (pole, cloth), drawn once: the cat moves and tilts them instead of redrawing a Graphics every frame. */
import { SURRENDER } from '../../config/balance';
import type { G } from './shapes';

const F = SURRENDER.flag;
/** Empty border (texture px) around each picture, so the outline is never cut off. */
const PAD = 3;

/** Pole picture size: its base is at the bottom centre (`FLAG_POLE_ORIGIN_Y` of the height), its top at the top. */
export const FLAG_POLE_W = F.poleWidth + F.outlineWidth * 2 + PAD * 2;
export const FLAG_POLE_H = F.poleLen + PAD * 2;
export const FLAG_POLE_ORIGIN_Y = (F.poleLen + PAD) / FLAG_POLE_H;
/** Cloth picture size: the cloth's top-left corner (where it meets the pole top) is at (`FLAG_CLOTH_ORIGIN_X`, `FLAG_CLOTH_ORIGIN_Y`) of it. */
export const FLAG_CLOTH_W = F.clothW + PAD * 2;
export const FLAG_CLOTH_H = F.clothH + PAD * 2;
export const FLAG_CLOTH_ORIGIN_X = PAD / FLAG_CLOTH_W;
export const FLAG_CLOTH_ORIGIN_Y = PAD / FLAG_CLOTH_H;

/** A navy-edged wooden pole standing up from its base (same colors and widths as the old line drawing). */
export function drawFlagPole(g: G): void {
  const cx = FLAG_POLE_W / 2;
  const o = F.poleWidth + F.outlineWidth * 2;
  g.fillStyle(F.outlineColor, 1).fillRect(cx - o / 2, PAD, o, F.poleLen);
  g.fillStyle(F.poleColor, 1).fillRect(cx - F.poleWidth / 2, PAD, F.poleWidth, F.poleLen);
}

/** A white cloth with a navy edge. */
export function drawFlagCloth(g: G): void {
  g.fillStyle(F.clothColor, 1).fillRect(PAD, PAD, F.clothW, F.clothH);
  g.lineStyle(F.outlineWidth, F.outlineColor, 1).strokeRect(PAD, PAD, F.clothW, F.clothH);
}
