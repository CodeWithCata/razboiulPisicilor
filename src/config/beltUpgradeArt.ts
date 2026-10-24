/** @file The little looping pictures on the belt upgrade cards: the stage (a mini top-down arena), the colors, and the numbers of each upgrade's scene. Game pixels, angles in radians (0 = to the right, negative = up). No Phaser. */
import { COLORS } from './style';
import type { BeltSynergyId } from './beltSynergies';
import type { BeltUpgradeId } from './beltUpgrades';

export const UPGRADE_ART = {
  /** The window at the top of a card (`top` = from the card's top edge). Its middle is (0, 0) in the scenes below. */
  stage: { w: 252, h: 112, top: 14, radius: 14, border: 4, grass: 0x5aa55a, stripe: 0x4f9a52, stripeW: 28, borderColor: COLORS.navy },
  colors: {
    cat: 0xf29a3c,
    catDark: 0xc7701c,
    catEar: 0xf6b8a0,
    fleece: 0xc42d34,
    skin: 0xf3c9a1,
    strap: 0x8b5a2b,
    buckle: COLORS.gold,
    flash: 0xffffff,
    burst: [0xf5c518, 0xff6a3d] as readonly number[],
    ghost: 0xffffff,
    trail: 0xfff3d6,
    star: COLORS.gold,
    ok: 0x4cc46a,
    hat: 0xb07a3a,
    hatDark: 0x6e4a1f,
    target: 0xe0453a,
    plate: 0x14182b,
    ringOff: 0x4a5275,
  },
  /** Sizes shared by every scene. */
  varuR: 15,
  catR: 11,
  strapW: 6,
  outline: 3,
  /** Milliseconds of one loop of each scene. */
  loopMs: { heavy: 2400, long: 2600, quick: 2200, tornado: 2500, knock: 2700 } satisfies Record<BeltUpgradeId, number>,
  /** The same for the synergy scenes (they hold two ideas, so they run a little longer). */
  synergyLoopMs: { cyclone: 2800, bombard: 2800, ironBeat: 2800, eagleEye: 3000, cowboy: 3000 } satisfies Record<BeltSynergyId, number>,

  heavy: { varuX: -70, y: 8, reach: 70, from: -0.75, swingEnd: 0.28, backFrom: 0.55, backTo: 0.72, buckleR: 7, glowR: 13, burstMax: 30, rays: 8, stars: 3, starSpin: 7, starR: 4, shake: 3 },
  long: { varuX: -98, y: 8, shortReach: 52, longReach: 104, from: -0.55, growEnd: 0.26, swingEnd: 0.46, backTo: 0.7, dash: 0.12, burstMax: 22, rays: 6 },
  quick: { varuX: -62, y: 8, reach: 62, from: -0.9, to: 0.25, starts: [0.02, 0.2, 0.38] as readonly number[], swingLen: 0.12, restBack: 0.7, burstMax: 16, rays: 6, tickY: -40, tickGap: 14, tickR: 4, speedLines: 3 },
  tornado: { y: 4, ring: 46, cats: 4, turns: 2, spinEnd: 0.42, fling: 18, back: 0.8, catR: 8, ringBox: { x: 100, y: -36, r: 11, width: 5 }, fills: 2 },
  knock: { varuX: -100, y: 8, catX: -40, hitAt: 0.2, flyEnd: 0.6, landX: 100, arc: 30, ghostX: -4, fade: 0.9, spins: 2, trailDots: 5, stars: 3 },

  /**
   * The synergy scenes: each one plays BOTH upgrades it fuses, in the same stage. Every x / y is from the stage's middle, so a thing must stay
   * inside x -126..126 and y -56..56 (the frame is 4 wide); that includes the belt's tip and its buckle at the start of a swing (sin(from) x reach).
   */
  synergy: {
    /** Curea lungă + Tornadă: the spin belt grows past the dashed ring of the old spin and flings the cats ring wide; the recharge ring fills. */
    cyclone: { y: 0, oldR: 30, longR: 46, catDist: 56, catSquash: 0.62, cats: 4, turns: 2, growEnd: 0.1, spinEnd: 0.46, back: 0.8, fling: 16, catR: 8, dash: 0.2, buckleR: 6, fills: 2 },
    /** Cataramă grea + Lovitură de bou: a huge buckle, a big burst, and the cat flies far past the dashed old distance. */
    bombard: { varuX: -100, y: 6, catX: -34, from: -0.9, hitAt: 0.22, flyEnd: 0.6, backFrom: 0.64, backTo: 0.8, landX: 100, arc: 28, ghostX: 20, fade: 0.92, spins: 3, trailDots: 6, flash: 0.08, stars: 3, buckleR: 9, glowR: 15, burstMax: 38, rays: 10, landBurst: 22, landRays: 8 },
    /** Mână iute + Cataramă grea: three quick swings (a tick lights for each), then a big wind-up and a heavy finisher that dazes the cat. */
    ironBeat: {
      varuX: -50, y: 8, reach: 62, from: -0.9, to: 0.25, bigFrom: -0.8, bigTo: 0.28, starts: [0.02, 0.17, 0.32, 0.5] as readonly number[], swingLen: 0.1, bigLen: 0.14,
      restBack: 0.76, burstMax: 16, bigBurst: 36, rays: 6, bigRays: 10, buckleR: 5, bigBuckle: 9, glowR: 15, tickY: -42, tickGap: 16, tickR: 4, bigTickR: 7,
      speedLines: 3, stars: 3, starSpin: 7, starR: 4, dazedAfter: 0.1, dazedEnd: 0.92,
    },
    /** Mână iute + Tornadă: a boss shows its weak point, a bar shows how long the window stays open (a gold mark where the old window ended), and quick swings still land after it. */
    eagleEye: {
      varuX: -50, y: 12, reach: 62, from: -0.9, to: 0.25, bossX: 36, bossR: 22, weakDx: -11, weakDy: 2, weakR: 8, openAt: 0.08, closeAt: 0.9, fadeSpan: 0.06, oldShare: 0.4,
      swings: [0.26, 0.44, 0.62] as readonly number[], swingLen: 0.1, restBack: 0.74, bar: { w: 150, h: 10, y: -43 }, burstMax: 18, rays: 6, pulse: 0.14, pulseTurns: 8, fills: 1,
    },
    /** Curea lungă + Lovitură de bou: Varu in a cowboy hat stretches the belt far past the dashed old reach, hits a far cat, and it flies even farther. */
    cowboy: { varuX: -104, y: 8, shortReach: 52, longReach: 100, from: -0.5, growEnd: 0.18, hitAt: 0.32, flyEnd: 0.68, backFrom: 0.44, backTo: 0.58, landX: 98, arc: 30, spins: 2, trailDots: 5, fade: 0.93, flash: 0.08, stars: 3, dash: 0.14, burstMax: 26, rays: 8, landBurst: 22, landRays: 8, buckleR: 6 },
  },
} as const;
