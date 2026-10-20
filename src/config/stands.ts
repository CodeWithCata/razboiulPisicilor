/** @file Look of the stands outside the fence (numbers and colors only, no Phaser): terraces, ad barrier, aisles, balcony boxes, bunting, fans. */
import { COLORS } from './style';

/** One kind of fan. Fur colors: orange tabby (the game's own cat), cream, white, charcoal, ginger. */
export interface FanSpec {
  fur: number;
  dark: number;
  inner: number;
  outfit: 'none' | 'scarf' | 'jersey' | 'toga' | 'caesar' | 'centurion' | 'gladiator';
  colors?: readonly [number, number];
  flag?: number;
  weight: number;
  vip?: boolean;
  /** Default `happy`. About one fan in seven keeps the game's heart eyes. */
  eyes?: 'hearts' | 'happy' | 'wide';
}
const ORANGE = { fur: 0xf59a3c, dark: 0xd9731a, inner: 0xf4a5a0 } as const;
const CREAM_FUR = { fur: 0xf2d27a, dark: 0xd9a62a, inner: 0xf4a5a0 } as const;
const WHITE = { fur: 0xf7f7f7, dark: 0xc9ccd8, inner: 0xf4b6b6 } as const;
const CHARCOAL = { fur: 0x3a3f58, dark: 0x262a40, inner: 0x6a6f8c } as const;
const GINGER = { fur: 0xc4623a, dark: 0x9a4425, inner: 0xf4a5a0 } as const;
const BLUE = 0x4d78c8;
const FANS: readonly FanSpec[] = [
  { ...ORANGE, outfit: 'none', eyes: 'hearts', weight: 2 },
  { ...ORANGE, outfit: 'scarf', colors: [COLORS.red, COLORS.cream], eyes: 'hearts', weight: 2 },
  { ...ORANGE, outfit: 'jersey', colors: [COLORS.red, COLORS.cream], flag: COLORS.red, eyes: 'happy', weight: 2 },
  { ...CREAM_FUR, outfit: 'jersey', colors: [COLORS.navy, COLORS.gold], flag: COLORS.gold, eyes: 'wide', weight: 2 },
  { ...WHITE, outfit: 'jersey', colors: [BLUE, COLORS.cream], eyes: 'happy', weight: 1.5 },
  { ...CHARCOAL, outfit: 'jersey', colors: [COLORS.gold, COLORS.red], flag: COLORS.red, eyes: 'wide', weight: 1.5 },
  { ...GINGER, outfit: 'scarf', colors: [COLORS.navy, COLORS.gold], eyes: 'happy', weight: 1.5 },
  { ...GINGER, outfit: 'jersey', colors: [COLORS.navy, COLORS.cream], eyes: 'wide', weight: 1.5 },
  { ...ORANGE, outfit: 'centurion', eyes: 'happy', weight: 2, vip: true },
  { ...WHITE, outfit: 'centurion', eyes: 'wide', weight: 1.5, vip: true },
  { ...CHARCOAL, outfit: 'gladiator', eyes: 'happy', weight: 2, vip: true },
  { ...GINGER, outfit: 'gladiator', eyes: 'wide', weight: 1.5 },
  { ...WHITE, outfit: 'caesar', eyes: 'happy', weight: 2, vip: true },
  { ...CREAM_FUR, outfit: 'toga', eyes: 'wide', weight: 1.5 },
  { ...ORANGE, outfit: 'caesar', eyes: 'happy', weight: 1.5, vip: true },
];

/**
 * The stands are a bowl of terraces OUTSIDE the fence, in a ring around the play area (the ring's width is in config/arena.ts,
 * `ARENA.standTiles`). Going outward from the fence, every side has: a low ad barrier, rows of terraces (a darker lip, then a
 * seat tread), and a back wall with bunting on it. The ring's depth sets how many terraces fit (`step` px each). The four sides
 * meet at 45 degrees and the four outer corners are cut off (`chamfer`), like the arena in the reference picture.
 * Numbers are in px (world pixels). `d` = distance outward from the fence.
 */
export const STANDS = {
  /** Depth of one terrace (lip + seat tread). */
  step: 40,
  /** The darker lip at the field side of each terrace (the riser seen from above). */
  lip: 7,
  /** The low ad barrier right behind the fence. */
  barrier: 12,
  /** The back wall at the outer edge (thickness). */
  backWall: 28,
  /** How far the four outer corners are cut off (each cut is a 45 degree line from this far along both edges). Keep it above the deepest terrace. */
  chamfer: 120,
  /** Outline width of the stand pieces (the game's outline weight). */
  outline: 3,
  colors: {
    /** Terrace treads, alternating row by row. */
    tread: [0xf6e3bd, 0xefd5a6],
    lip: 0xc99a62,
    lipHighlight: 0xfff3d6,
    backWall: COLORS.navy,
    trim: COLORS.gold,
    /** The ad barrier: panels going along the fence. */
    barrierPanels: [COLORS.red, COLORS.cream, COLORS.red, COLORS.navy, COLORS.gold, COLORS.navy],
    aisle: 0xfff3d6,
    aisleLip: 0xd9c49a,
    /** Wooden balcony: floor, plank lines, railing. */
    wood: 0xc08650,
    woodDark: 0x8b5a2b,
    rail: 0x6b4a2b,
    /** Pole bases and the string of the bunting. */
    pole: 0x8b5a2b,
    string: COLORS.navy,
    /** Bunting flags and confetti, cycled. */
    flags: [COLORS.red, COLORS.gold, COLORS.cream, 0x4d78c8],
    confetti: [COLORS.red, COLORS.gold, COLORS.cream, 0x4d78c8, 0xffffff],
    /** Roof / awning stripe pairs; boxes cycle through them. */
    awnings: [
      [COLORS.red, COLORS.cream],
      [COLORS.navy, COLORS.gold],
    ],
  },
  /** The ad barrier's panels: length along the fence. */
  panelPx: 60,
  /** Sections per side: aisles (stairs) split a side into this many seat blocks. */
  sections: { left: 4, right: 4, top: 6, bottom: 6 },
  /** Width of an aisle (the stairs between two seat blocks). */
  aisleWidth: 40,
  /**
   * Balcony boxes: wooden floor over the last two terraces, a railing at the front and a striped roof over the back half.
   * Numbers are aisle numbers counted from the start of the side (1 = the first aisle). The booth is the bigger box in the middle.
   */
  boxes: { left: [1, 3], right: [1, 3], top: [2, 4], bottom: [2, 4] },
  booth: { top: 3, bottom: 3 },
  box: { spanPx: 120, boothSpanPx: 200, roofFromFront: 38, scallop: 10, stripePx: 20, railPost: 18, cats: 3, boothCats: 5 },
  /** Bunting hangs between poles along the back wall. */
  bunting: { maxSpanPx: 300, sagPx: 8, flagEveryPx: 26, flagWidthPx: 14, flagLengthPx: 14, poleRadius: 5 },
  /** Confetti and sparkles lying on the terraces: roughly one bit per this many square px. */
  confetti: { areaPerBit: 2400, sparklesPer: 14 },
  /**
   * The fans: lovestruck tabbies at a soccer match in the Colosseum. Each look is a fur color plus an outfit: soccer (scarf, striped
   * jersey, a little flag) or Roman (toga, caesar with a laurel wreath, centurion, gladiator). `weight` = how common; `vip` looks
   * are the ones that sit in the balcony boxes. spacing: px between two cats in a row. jitter: how far off the grid a cat sits.
   * skip: share of seats left empty.
   */
  /** `upright`: true = every fan sits head up on screen (their tails then point at the field). false = each fan turns to face the fence, like the cats in the game: faces and paws toward the field, tails away. */
  spectators: { spacing: 40, jitter: 3, scale: 0.3, skip: 0.08, upright: false },
  fans: FANS,
} as const;
