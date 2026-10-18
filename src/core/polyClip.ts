export type Pt = readonly [number, number];

/**
 * Keep only the part of a polygon that lies at or below the horizontal line `y` (bigger y = lower on screen).
 * Used by the cat health meter: the fur is the face clipped at the current health level.
 * Pure function (no Phaser), so it also runs with `node --experimental-strip-types`.
 */
export function clipBelow(points: readonly Pt[], y: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const aIn = a[1] >= y;
    const bIn = b[1] >= y;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (y - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, y]);
    }
  }
  return out;
}

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
