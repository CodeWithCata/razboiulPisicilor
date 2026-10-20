/** @file Shared `Pt` point type and `superEllipse` (the cat head shape). Pure, no Phaser. */
export type Pt = readonly [number, number];

/** A rounded, squarish oval (a "superellipse"): `roundness` 2 = a plain ellipse, higher = squarer. Used for the cat head. */
export function superEllipse(cx: number, cy: number, halfW: number, halfH: number, roundness: number, segments: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push([
      cx + halfW * Math.sign(c) * Math.abs(c) ** (2 / roundness),
      cy + halfH * Math.sign(s) * Math.abs(s) ** (2 / roundness),
    ]);
  }
  return pts;
}
