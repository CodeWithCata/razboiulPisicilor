/** @file Draws the golden-belt tornado while the golden belt is active. */
import Phaser from 'phaser';
import { GOLD_BELT } from '../../config/animation';

type Gfx = Phaser.GameObjects.Graphics;

const TAU = Math.PI * 2;

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** Blend two 0xrrggbb colors. */
function mix(c1: number, c2: number, k: number): number {
  const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, k));
  const g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, k));
  const b = Math.round(lerp(c1 & 255, c2 & 255, k));
  return (r << 16) | (g << 8) | b;
}

/**
 * The golden spin: a Ninjago-style gold tornado around Varu, built like the reference: a funnel that is narrow at his feet
 * and flares wide at the top, made of dozens of loose, glowing ring strands (dim at the back, bright at the front), long tapered
 * ribbons twisting up it, big rings swinging out past the rim, a gradient from dark-orange edge to white-hot core, and sparkles.
 * Drawn fresh every frame. `reach` is the spin's reach, `t` the spin's progress (0..1), `now` the game clock (ms).
 */
export function drawGoldenTornado(g: Gfx, x: number, y: number, reach: number, t: number, now: number): void {
  const cfg = GOLD_BELT.tornado;
  if (!cfg.enabled) return;
  const grow = Phaser.Math.Clamp(t / cfg.growShare, 0, 1);
  const fade = Phaser.Math.Clamp((1 - t) / cfg.fadeShare, 0, 1);
  const life = Phaser.Math.Easing.Cubic.Out(grow) * fade;
  if (life <= 0.01) return;

  const c = cfg.colors;
  const height = reach * cfg.heightFactor * life;
  const baseY = y + cfg.baseDrop;
  const maxR = reach * cfg.widthFactor * (0.45 + 0.55 * life);
  const sec = now / 1000;
  // Width at height u (0 = feet, 1 = top): a long narrow stem, then a wide flare, like the reference.
  const radiusAt = (u: number): number => maxR * (cfg.baseWidth + (1 - cfg.baseWidth) * Math.pow(u, 1.15) * (1 - 0.05 * u));
  const centerY = (u: number): number => baseY - height * u;
  const spinAt = (u: number): number => sec * cfg.spinSpeed * (1.7 - u * 0.9);

  // 1) glow: a big soft halo and a hot pool where the funnel touches the ground
  for (let i = 0; i < 5; i++) {
    const r = maxR * (1.35 - i * 0.2);
    g.fillStyle(c.glow, 0.035 * life).fillEllipse(x, centerY(0.55), r * 2, r * 1.5);
  }
  for (let i = 4; i >= 0; i--) {
    const r = maxR * (0.1 + i * 0.07);
    g.fillStyle(mix(c.core, c.edge, i / 4), (0.22 + (4 - i) * 0.07) * life).fillEllipse(x, baseY + 1, r * 2, r * 2 * cfg.squash);
  }

  // 2) the body: nested funnels from the dark edge inward to a white-hot core (the gradient)
  const outline = (scale: number, top: number): Phaser.Math.Vector2[] => {
    const pts: Phaser.Math.Vector2[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) pts.push(new Phaser.Math.Vector2(x + radiusAt((i / steps) * top) * scale, centerY((i / steps) * top)));
    for (let i = steps; i >= 0; i--) pts.push(new Phaser.Math.Vector2(x - radiusAt((i / steps) * top) * scale, centerY((i / steps) * top)));
    return pts;
  };
  const layers = 9;
  for (let i = 0; i < layers; i++) {
    const k = i / (layers - 1);
    const color = k < 0.34 ? mix(c.edge, c.deep, k / 0.34) : k < 0.67 ? mix(c.deep, c.body, (k - 0.34) / 0.33) : mix(c.body, c.core, (k - 0.67) / 0.33);
    g.fillStyle(color, (0.16 + 0.05 * k) * life).fillPoints(outline(1.08 - k * 0.92, 1), true);
  }
  // the hottest part sits low in the funnel (the white core in the photos)
  g.fillStyle(c.core, 0.2 * life).fillPoints(outline(0.3, 0.62), true);

  // 3) the ring strands: dozens of loose, slightly wobbling ellipses. Back half dim, front half bright.
  const n = cfg.rings;
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n;
    for (let s = 0; s < cfg.strandsPerRing; s++) {
      const seed = k * 7.31 + s * 3.77;
      const rx = radiusAt(u) * (0.94 + 0.12 * (0.5 + 0.5 * Math.sin(seed * 2.1)) + 0.04 * Math.sin(sec * 6 + seed));
      const ry = rx * cfg.squash;
      const cy = centerY(u) + 2.5 * Math.sin(seed + sec * 4);
      const phase = spinAt(u) + seed;
      const wob = 0.05 + 0.04 * Math.sin(seed);
      const bright = 0.5 + 0.5 * Math.sin(seed * 1.9 + 1);
      const ringColor = mix(c.body, c.light, bright * (0.4 + 0.6 * u));
      const steps = 28;
      for (const pass of [0, 1] as const) {
        let px = 0;
        let py = 0;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * TAU;
          const rr = rx * (1 + wob * Math.sin(3 * a + phase));
          const nx = x + Math.cos(a + phase * 0.15) * rr;
          const ny = cy + Math.sin(a + phase * 0.15) * (ry * (1 + wob * Math.cos(2 * a + phase)));
          const front = Math.sin(a + phase * 0.15) >= 0;
          if (i > 0) {
            const alpha = (front ? 0.85 : 0.3) * life * (0.6 + 0.4 * bright);
            if (pass === 0) g.lineStyle(1.5 + u * 1.6, front ? ringColor : c.deep, alpha * 0.7);
            else g.lineStyle(0.7, front ? c.core : c.light, alpha);
            g.lineBetween(px, py, nx, ny);
          }
          px = nx;
          py = ny;
        }
      }
    }
  }

  // 4) tapered ribbons twisting up the funnel (thin at the ends, thick in the middle)
  for (let f = 0; f < cfg.ribbons; f++) {
    const offset = (f / cfg.ribbons) * TAU;
    const turns = 1.6 + (f % 3) * 0.45;
    let px = 0;
    let py = 0;
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = offset + u * turns * TAU + spinAt(0.35);
      const rr = radiusAt(u) * (1.0 + 0.05 * Math.sin(u * 13 + f + sec * 5));
      const nx = x + Math.cos(a) * rr;
      const ny = centerY(u) + Math.sin(a) * rr * cfg.squash;
      if (i > 0 && Math.sin(a) > -0.2) {
        const taper = Math.sin(Math.PI * u);
        g.lineStyle(0.6 + 3.2 * taper, c.light, 0.5 * life * taper + 0.1 * life);
        g.lineBetween(px, py, nx, ny);
        g.lineStyle(0.5 + 1 * taper, c.core, 0.8 * life * taper);
        g.lineBetween(px, py, nx, ny);
      }
      px = nx;
      py = ny;
    }
  }

  // 5) the flare: big loose rings swinging out past the rim at the top, tilted, like the streaks in the photos
  const topR = radiusAt(1);
  for (let k = 0; k < cfg.flareRings; k++) {
    const u = 1 - k * 0.07;
    const grown = 1.04 + 0.1 * k + 0.07 * Math.sin(sec * 3 + k * 2);
    const rx = radiusAt(u) * grown;
    const ry = rx * cfg.squash * (1 + 0.2 * Math.sin(k * 1.9));
    const tilt = 0.12 * Math.sin(sec * 2.2 + k * 1.3);
    const cy = centerY(u);
    const phase = sec * 3.5 + k * 1.1;
    const span = TAU * (0.72 - k * 0.05);
    const steps = 30;
    let px = 0;
    let py = 0;
    for (let i = 0; i <= steps; i++) {
      const a = phase + (span * i) / steps;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const nx = x + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const ny = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      if (i > 0) {
        const taper = Math.sin(Math.PI * (i / steps));
        g.lineStyle(0.8 + 3.2 * taper, c.deep, 0.55 * life * taper);
        g.lineBetween(px, py, nx, ny);
        g.lineStyle(0.6 + 1.1 * taper, c.core, 0.85 * life * taper);
        g.lineBetween(px, py, nx, ny);
      }
      px = nx;
      py = ny;
    }
  }
  // the lip of the funnel
  g.lineStyle(2, c.light, 0.85 * life).strokeEllipse(x, centerY(1), topR * 2, topR * 2 * cfg.squash);
  g.lineStyle(0.9, c.core, 0.95 * life).strokeEllipse(x, centerY(1), topR * 2 * 0.97, topR * 2 * 0.97 * cfg.squash);

  // 6) sparkles: lots of tiny lights drifting up and around inside and outside the funnel, a few four-point stars
  for (let i = 0; i < cfg.sparkles; i++) {
    const u = (i * 0.618 + sec * (0.18 + (i % 5) * 0.03)) % 1;
    const a = i * 2.4 + spinAt(u) * (0.6 + (i % 4) * 0.2);
    const inside = i % 3 !== 0;
    const rr = radiusAt(u) * (inside ? 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(i * 5.1)) : 1.05 + 0.4 * (0.5 + 0.5 * Math.sin(i * 5.1 + sec * 3)));
    const sx = x + Math.cos(a) * rr;
    const sy = centerY(u) + Math.sin(a) * rr * cfg.squash;
    const twinkle = 0.5 + 0.5 * Math.sin(i * 3.7 + sec * 13);
    const r = 0.6 + 1.9 * twinkle;
    g.fillStyle(i % 7 === 0 ? c.edge : c.core, (0.45 + 0.55 * twinkle) * life);
    if (i % 5 === 0) {
      g.fillTriangle(sx, sy - r * 1.7, sx + r * 0.4, sy, sx - r * 0.4, sy);
      g.fillTriangle(sx, sy + r * 1.7, sx + r * 0.4, sy, sx - r * 0.4, sy);
      g.fillTriangle(sx - r * 1.7, sy, sx, sy + r * 0.4, sx, sy - r * 0.4);
      g.fillTriangle(sx + r * 1.7, sy, sx, sy + r * 0.4, sx, sy - r * 0.4);
    } else g.fillCircle(sx, sy, r * 0.6);
  }
}
