/** @file Code-drawn parts of the retractable floor lamps (round foot, pole, lantern). Same toolkit and navy outline as the rest of the art. Seen from a little above like the scratching post and the bushes: every round part has a light top-left, a mid tone, a dark underside and a thin bounce light on the far edge, so it reads as a solid object and not as a sticker. */
import { COLORS } from '../../config/style';
import { C, E, P, R, flat, ink, layer, sparkle, type G, type Pt } from './shapes';

/** The cast-iron colors of the street lamp (dark bronze, like a park lamp post) and its glass. */
const BRONZE = 0x6b5440;
const BRONZE_SPEC = 0xcfae80; // the brightest spot of a round part
const BRONZE_LIGHT = 0x9a7a58;
const BRONZE_DARK = 0x3f302a;
const BRONZE_BOUNCE = 0x8c6a4c; // light that bounces back from the floor onto the dark side
const GLASS = 0xd9962b; // the glass when it is NOT lit: a dim amber (the lens on top is what glows)
const GLASS_LIGHT = 0xf3c35c;
const GLASS_DEEP = 0xa86a1c;
const GLASS_DARK = 0x7a4a14;

/** Points along the lower (front) half of an ellipse, from the right end to the left end: the curved bottom edge of a round part. */
function frontArc(cx: number, cy: number, rx: number, ry: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/**
 * The round foot the pole stands on (36x20): a wide domed disc with a visible thickness, shaded like the scratching post's base, and a collar on top.
 * The pole's bottom sits in the middle of the collar's top (y = 9.5, see `lamp.base.originY` in config/dayNight.ts).
 */
export function drawLampBase(g: G): void {
  layer(g, [E(18, 12.2, 30, 10)], BRONZE_DARK, 2); // the disc's thick edge
  flat(g, [E(18, 13.6, 25, 5)], BRONZE_BOUNCE, 0.35); // bounce light along the bottom of the edge
  layer(g, [E(18, 9.5, 30, 10)], BRONZE, 2); // the disc's top face
  flat(g, [E(20.5, 11, 25, 6.5)], BRONZE_DARK, 0.4); // the face turns darker toward the lower right
  flat(g, [E(16, 8.6, 24, 6.8)], BRONZE_LIGHT, 0.75); // and lighter toward the upper left
  flat(g, [E(13.5, 7.6, 12, 3.2)], BRONZE_SPEC, 0.55);
  layer(g, [E(18, 11.2, 15, 6.4)], BRONZE_DARK, 1.6); // the collar's side
  layer(g, [E(18, 9.3, 15, 6.4)], BRONZE_LIGHT, 1.6); // the collar's top
  flat(g, [E(19, 10, 10, 4)], BRONZE, 0.9); // the dip the pole stands in
  flat(g, [E(14.4, 7.6, 5, 1.6)], BRONZE_SPEC, 0.7);
}

/** The pole (14x48, drawn upright; it grows from its bottom): a round tube lit from the upper left, with a curved bottom, a ring near each end and a dark foot where it meets the floor. */
export function drawLampStem(g: G): void {
  layer(g, [R(3, 0, 8, 44.5, 3.5), E(7, 44.5, 8, 4)], BRONZE, 2); // the tube with its curved bottom
  flat(g, [R(3.4, 1, 3.6, 43.5, 1.8)], BRONZE_LIGHT, 0.95); // the lit side
  flat(g, [R(4.3, 2, 1.5, 41, 0.75)], BRONZE_SPEC, 0.9); // the bright streak
  flat(g, [R(7.6, 1, 3.2, 43.5, 1.6)], BRONZE_DARK, 0.85); // the shaded side
  flat(g, [R(10, 3, 0.9, 38, 0.45)], BRONZE_BOUNCE, 0.9); // bounce light on the far edge
  flat(g, [E(7, 44.2, 7, 2.6)], BRONZE_DARK, 0.7); // darker where it meets the foot (ambient shade)
  for (const y of [5, 38] as const) {
    layer(g, [E(7, y + 1.7, 12.4, 4.8)], BRONZE_DARK, 1.5); // a ring's thick edge
    layer(g, [E(7, y, 12.4, 4.8)], BRONZE_LIGHT, 1.5); // the ring's top face
    flat(g, [E(8, y + 0.5, 9, 2.8)], BRONZE, 0.9);
    flat(g, [E(5, y - 0.6, 4, 1.2)], BRONZE_SPEC, 0.8);
    flat(g, [E(7, y + 3.4, 8, 1.2)], BRONZE_DARK, 0.55); // the shadow the ring throws on the pole below it
  }
}

/**
 * The lantern seen from a little above (44x64, it sits on the pole top; its bottom peg is at the bottom edge): a finial, a cone roof with a round lip,
 * a glass drum with three panels and a curved bottom, and a thick base ring. The glass is dim here; the warm light is a separate soft shape drawn over it at night.
 */
export function drawLampHead(g: G): void {
  // the peg into the pole, first so everything else sits over it
  layer(g, [R(18, 54, 8, 7, 2), E(22, 60.6, 8, 3.4)], BRONZE, 1.8);
  flat(g, [R(18.6, 55, 2.6, 6, 1)], BRONZE_LIGHT, 0.9);
  flat(g, [R(23.2, 55, 2.4, 6, 1)], BRONZE_DARK, 0.7);

  // the thick base ring under the glass
  layer(g, [E(22, 52, 26, 8)], BRONZE_DARK, 2);
  flat(g, [E(22, 53.6, 20, 3)], BRONZE_BOUNCE, 0.35);
  layer(g, [E(22, 50, 26, 8)], BRONZE, 2);
  flat(g, [E(24, 51, 20, 5)], BRONZE_DARK, 0.4);
  flat(g, [E(19, 49, 16, 5)], BRONZE_LIGHT, 0.7);
  flat(g, [E(16.5, 48.4, 7, 1.8)], BRONZE_SPEC, 0.6);

  // the glass drum: a little wider at the top, with a curved bottom edge, glowing from inside
  const glass: Pt[] = [[10, 27], [34, 27], ...frontArc(22, 48, 12, 3.6)];
  layer(g, [P(glass)], GLASS, 2);
  flat(g, [E(22, 39, 17, 19)], GLASS_LIGHT, 0.55); // the warm middle, where the flame is
  flat(g, [E(22, 39, 9, 12)], 0xfff0b8, 0.35);
  flat(g, [P([[26.5, 27.5], [33.4, 27.5], [33.4, 47], [29.6, 50.4], [27, 51]])], GLASS_DEEP, 0.7); // the shaded right side
  flat(g, [P([[30.5, 28], [33.4, 28], [33.4, 47], [31.6, 49.6]])], GLASS_DARK, 0.5);
  flat(g, [R(10.6, 27.5, 22.8, 4.2, 1.5)], GLASS_DARK, 0.55); // the roof's shade on the top of the glass
  flat(g, [P([[12.6, 30.5], [17, 30.5], [17.4, 46], [14.6, 46]])], COLORS.white, 0.4); // light on the left panel
  ink(g, [[16.6, 27.6], [16.8, 50.4]], 1.6, BRONZE_DARK); // the panel frames (they bunch up toward the edges, like a real drum)
  ink(g, [[27.6, 27.6], [27.4, 50.4]], 1.6, BRONZE_DARK);
  ink(g, [[15.9, 28], [16.1, 49.6]], 0.7, BRONZE_LIGHT); // a bright edge on each frame's lit side
  ink(g, [[26.9, 28], [26.7, 49.6]], 0.7, BRONZE_LIGHT);

  // the roof: a cone over a round lip
  layer(g, [E(22, 23.6, 38, 9)], BRONZE_DARK, 2); // the lip's thick edge
  flat(g, [E(22, 26.2, 30, 3)], BRONZE_BOUNCE, 0.3);
  const cone: Pt[] = [[22, 10.5], [41, 22.6], ...frontArc(22, 22.6, 19, 4.3)];
  layer(g, [P(cone)], BRONZE, 2);
  flat(g, [P([[22, 11.5], [40.4, 22.6], [36, 25.4], [22, 26.6]])], BRONZE_DARK, 0.75); // the shaded right half
  flat(g, [P([[21, 12.5], [22.6, 12.5], [26, 23.4], [18, 26.4], [3.6, 22.6]])], BRONZE_LIGHT, 0.55); // the lit left half
  flat(g, [P([[20.6, 13.5], [22.4, 13.5], [14, 24.4], [9.4, 22.6]])], BRONZE_SPEC, 0.65); // the bright streak
  ink(g, frontArc(22, 22.6, 18, 3.8).slice(7, 13), 0.9, BRONZE_LIGHT); // a bright edge along the lip's front

  // the finial
  layer(g, [R(20.6, 6.4, 2.8, 6, 1), C(22, 5, 2.8)], BRONZE_LIGHT, 1.8);
  flat(g, [C(23, 5.8, 1.6)], BRONZE_DARK, 0.5);
  flat(g, [C(21, 4.2, 1)], COLORS.white, 0.75);

  sparkle(g, 13.5, 33, 2.4);
}
