/** @file Day-night numbers: the sky tint keyframes, how fast it changes, and the lamps that rise out of the floor and light up at night. No Phaser. */
import { ARENA, PLAY_AREA } from './arena';

/**
 * The arena drifts from warm afternoon to night over the campaign: wave 1 is afternoon, the last wave (the tennis cat) is full night.
 * The tint is a colored sheet over the world (above cats, below effects and words), so keep `alpha` low enough that the red boss
 * warnings stay easy to read. Endless mode swings between day and night every `endlessCycleWaves` waves.
 */
export const DAY_NIGHT = {
  enabled: true,
  /** How slowly the sky catches up with the wave (ms for about 95% of the change). */
  transitionMs: 5000,
  endlessCycleWaves: 10,
  /** Above the world (actors are 10-29, effects 40+, floating words 60), under the lamp glow. */
  depth: 30,
  /** The sheet is bigger than the screen by this much on every side, so camera shake never shows an edge. */
  margin: 200,
  /** `at` = how far through the night (0 = first wave, 1 = last wave). Colors and alphas glide between keys. */
  sky: [
    { at: 0, color: 0xffb54a, alpha: 0.06 }, // warm afternoon
    { at: 0.35, color: 0xffa040, alpha: 0.12 }, // golden hour
    { at: 0.65, color: 0xe0644f, alpha: 0.2 }, // sunset
    { at: 0.85, color: 0x5b3e8c, alpha: 0.3 }, // dusk
    { at: 1, color: 0x14204a, alpha: 0.4 }, // night
  ],
  /** Where the retractable floor lamps are, in world px. Hidden by day; from `lamp.onAt` on they rise out of the floor, full light at night. */
  lamps: [
    { x: PLAY_AREA.left + 480, y: PLAY_AREA.top + 240 },
    { x: PLAY_AREA.left + 1440, y: PLAY_AREA.top + 240 },
    { x: PLAY_AREA.left + 960, y: PLAY_AREA.top + 430 },
    { x: PLAY_AREA.left + 480, y: PLAY_AREA.top + 880 },
    { x: PLAY_AREA.left + 1440, y: PLAY_AREA.top + 880 },
  ],
  lamp: {
    /** The lamps come out of the floor from this night progress on and sink back below it (endless mode swings both ways). By day nothing of them is seen. */
    onAt: 0.55,
    glowKey: 'lamp_glow',
    glowTexture: 256,
    glowRadius: 190,
    glowRgb: '255,214,120',
    glowAlpha: 0.55,
    glowDepth: 31,
    /** Slow flicker: how much and how fast (ms per cycle). */
    flicker: 0.08,
    flickerMs: 900,
    /** The emerge: the hatch opens, the pole rises, the lamp lights. Times are game ms; each lamp starts `staggerMs` after the one before it. */
    riseMs: 2600,
    lowerMs: 1800,
    staggerMs: 500,
    /** How tall the pole gets (px up the screen). */
    height: 64,
    /** How much wider than its picture the pole is drawn (its picture is 14 px wide). */
    stemScale: 1.3,
    /** Share of the emerge (0..1) where the pole starts to rise (it rises to the end; the first part is the foot popping in). */
    riseFrom: 0.1,
    /** The lantern on top of the pole (px on screen when fully risen, a bit smaller while rising): its size, where the pole meets it (share of its height from the top) and the middle of its glass. */
    head: { w: 38, h: 56, originY: 0.96, glassY: 0.6 },
    /** The lens that lights up: a soft warm oval over the lantern's glass (px, at full size). */
    lens: { w: 19, h: 20, color: 0xfff1b0 },
    /** The stone foot the pole stands on (px). */
    base: { w: 44, h: 24, originY: 0.475 },
    /** The soft shadow on the floor under the lamp (px). */
    shadow: { w: 64, h: 26 },
    /** Solid: from this share of the emerge on, Varu and walking cats bump into the foot (a rectangle on the floor, px, `offsetY` above the lamp's spot). It goes when the lamp sinks or breaks; flying cats pass over. */
    solid: { from: 0.3, w: 34, h: 16, offsetY: 0 },
    /** Smashing it (systems/LampSystem.ts): hits to break (belt swing 1, spin 1.5, a blast breaks it at once), the part the belt can touch (px above the spot) and how far out it must be to be hit. A broken lamp is put back for the next night. */
    hp: 4,
    hitbox: { halfWidth: 20, height: 110 },
    hitFrom: 0.9,
    flightCooldownMs: 300,
    blastSlackPx: 16,
    /** The rattle of the lantern when it is hit: how long (ms) and how far it shakes sideways (px). */
    rattle: { ms: 260, px: 2.5 },
    /**
     * The break (FloorLamp.shatter): the bulb pops in a flash, the glass bursts into `shards` that fly out and land (each takes `flyMs` ms), the roof of the lantern
     * drops and bounces, the pole snaps and topples (`toppleDeg` over `toppleMs`). Bits lie on the floor for `lingerMs`, then fade over `fadeMs`.
     */
    shatter: {
      shards: 18,
      sizePx: { min: 2.5, max: 5.5 },
      speedX: { min: 25, max: 95 },
      riseY: { min: 35, max: 120 },
      flyMs: { min: 420, max: 780 },
      lingerMs: 1800,
      fadeMs: 600,
      glassTints: [0xd9962b, 0xf3c35c, 0xa86a1c, 0xfff0b8] as readonly number[],
      bronzeTints: [0x6b5440, 0x9a7a58, 0x3f302a] as readonly number[],
      bronzeShare: 0.3,
      flashMs: 180,
      flashColor: 0xfff6cf,
      glowPopMs: 420,
      roofDropMs: 560,
      roofTiltDeg: 38,
      toppleDeg: 78,
      toppleMs: 620,
      toppleFadeMs: 420,
      depthAir: 38,
    },
    /** The dust that puffs when the hatch opens. */
    puff: { count: 7, color: 0xcfc6b4, ms: 700, spreadPx: 34 },
    /** Everything sits on the floor, just above the walls layer: foot, pole, lantern, lens (each a little above the one before). */
    floorDepth: ARENA.depth.walls + 0.5,
  },
} as const;
