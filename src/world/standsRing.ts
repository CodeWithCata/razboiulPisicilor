/** @file Where a point of the stands is along the ring round the fence (0 to RING_LENGTH, clockwise from the top left corner). Pure numbers, no Phaser. */
import { PLAY_AREA } from '../config/arena';

const CX = (PLAY_AREA.left + PLAY_AREA.right) / 2;
const CY = (PLAY_AREA.top + PLAY_AREA.bottom) / 2;
const HW = (PLAY_AREA.right - PLAY_AREA.left) / 2;
const HH = (PLAY_AREA.bottom - PLAY_AREA.top) / 2;

/** The length of the ring: once round the fence (px). */
export const RING_LENGTH = 4 * HW + 4 * HH;

/**
 * Draws a line from the middle of the arena through the point, takes where it crosses the fence, and returns how far that is along
 * the fence, clockwise from the top left corner. So fans in every terrace row of the same spot of the stands share one number, the
 * four sides are in one row, and a pulse that runs along the ring moves at the same speed (px/s) on the long sides and the short ones.
 */
export function ringPosition(x: number, y: number): number {
  const dx = x - CX;
  const dy = y - CY;
  const ax = Math.abs(dx) / HW;
  const ay = Math.abs(dy) / HH;
  const t = Math.max(ax, ay);
  if (t === 0) return 0;
  const hx = dx / t; // where the line crosses the fence: |hx| = HW (left / right side) or |hy| = HH (top / bottom side)
  const hy = dy / t;
  if (ay >= ax) return hy < 0 ? HW + hx : 2 * HW + 2 * HH + (HW - hx);
  return hx > 0 ? 2 * HW + (hy + HH) : 4 * HW + 2 * HH + (HH - hy);
}
