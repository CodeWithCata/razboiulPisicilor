/**
 * Arena (Tiled map) numbers and tile ids.
 * NO IMPORTS on purpose: scripts/generate-arena-map.mjs reads this file with plain node.
 *
 * The map is 40px tiles: the fenced play area is 48x28 tiles (1920x1120 px), with stands around it outside the fence (see
 * ARENA.standTiles). It is bigger than the 1280x720 screen: the camera follows Varu (see CAMERA).
 * The art for it is built by scripts/build-scene-art.py from art-source/. Tile ids here must match it (the script reads this file).
 */
/** The fenced play area in tiles: the 48x28 arena Varu fights in. Its size never changes. */
const PLAY = { cols: 48, rows: 28 } as const;
/** The stands outside the fence, in tiles, per side (0 = no stands on that side). The map grows by these. */
const STAND_TILES = { left: 6, right: 6, top: 4, bottom: 4 } as const;

export const ARENA = {
  tile: 40,
  /** The whole map in tiles: the play area plus the stands around it. */
  cols: PLAY.cols + STAND_TILES.left + STAND_TILES.right,
  rows: PLAY.rows + STAND_TILES.top + STAND_TILES.bottom,
  play: PLAY,
  standTiles: STAND_TILES,
  mapKey: 'arena',
  mapPath: 'assets/maps/arena.json',
  /** Must match the tileset NAME inside arena.json (Tiled: Tileset properties > Name). */
  tilesetName: 'arena_tiles',
  /** Layer names inside arena.json. */
  layers: { ground: 'ground', walls: 'walls', decor: 'decor', spawns: 'spawns' },
  /** A tile with this boolean property (Tiled: Tileset editor > Custom Properties) blocks walking cats and Varu. */
  collideProperty: 'collides',
  /** Draw order. Actors start at depth 10, shadows at 0, so the whole arena sits below them. */
  depth: { grass: -11, stands: -10.8, campus: -10.5, ground: -10, decor: -9, walls: -8 },
  /**
   * The tileset image has a 1px extruded border around every tile (so no hairline seams show when the game is scaled).
   * Tiled and Phaser read margin and spacing from arena.json, so only the map generator and the art script need these.
   */
  tilesetColumns: 8,
  tilesetRows: 6,
  tilesetMargin: 1,
  tilesetSpacing: 2,
} as const;

/** The whole world in pixels. The screen (GAME in balance.ts) only shows a part of it. */
export const WORLD = { width: ARENA.cols * ARENA.tile, height: ARENA.rows * ARENA.tile } as const;

/**
 * The fenced play area in world px: the inside of the fence. Varu, the cats and the bosses stay inside it. The stands lie outside
 * it, between here and the world's edge. Everything that was once placed from the world's edges now uses these numbers.
 */
export const PLAY_AREA = {
  left: STAND_TILES.left * ARENA.tile,
  top: STAND_TILES.top * ARENA.tile,
  right: (STAND_TILES.left + PLAY.cols) * ARENA.tile,
  bottom: (STAND_TILES.top + PLAY.rows) * ARENA.tile,
} as const;

/**
 * The camera follows Varu. `lerp` = how snappy (1 = glued, 0.05 = floaty), measured at `referenceFps` frames a second: GameScene
 * adjusts it every frame to the real frame time, so the camera feels the same at 60, 90 or 120 fps.
 * `roundPixels`: snap the camera to whole game pixels. It stops hairline seams between tiles, but on a phone screen (the game is scaled up) it makes Varu's steps uneven, so it is off. If thin lines appear between ground tiles, set it back to true.
 */
export const CAMERA = { lerp: 0.12, referenceFps: 60, maxStepMs: 100, roundPixels: false } as const;

/** The "Campus!" lettering on the grass: centre (px) and width (px); the height follows the image. Keep the strip above the plank paths free of walls. */
export const CAMPUS_TEXT = { x: PLAY_AREA.left + 960, y: PLAY_AREA.top + 300, width: 470 } as const;

/**
 * The milk that slowly fills the "Campus!" lettering as the waves go by (`world/CampusMilk.ts`): one glyph at a time, so the
 * word is full of milk when the last wave starts (wave 15). Letters can only fill, never empty again. Visual only.
 * `cuts` = where the 7 glyphs (C a m p u s !) start and end, in TEXTURE px of campus_text.png (612 wide): 8 numbers, 7 glyphs.
 */
export const CAMPUS_MILK = {
  cuts: [0, 111, 198, 317, 403, 487, 562, 612],
  /** Glyph n fills when wave `firstWave + n * wavesPerLetter` starts: waves 3, 5, 7 ... 15 for the seven glyphs. */
  firstWave: 3,
  wavesPerLetter: 2,
  /** The pour: how long one glyph takes to fill (ms), the wobble of the milk surface (texture px, and its speed), and the pause between two glyphs if a jump fills several. */
  pourMs: 1700,
  waveAmpPx: 2.2,
  waveSpeed: 0.012,
  staggerMs: 650,
  /** Dirt pixels darker than this (0..1 brightness) stay dirt: the cracks and roots. Milk is cream white, shaded toward `shade` in the dirt's darker parts. */
  crackBelow: 0.27,
  cream: [253, 251, 242],
  shade: [196, 208, 226],
  depth: -10.4,
} as const;

/**
 * Tile ids INSIDE the tileset (0-based, as Tiled shows them). In the layer data they are id + 1.
 * The grass is NOT a tile: it is the repeating backdrop (Tex.Grass) under the whole arena.
 */
export const TILES = {
  // ground: the plank floor is a 2x2 pattern, so it needs 4 tiles. Pick by (column % 2, row % 2).
  plank00: 0,
  plank10: 1,
  plank01: 2,
  plank11: 3,
  // solid: fence pieces (a post every few tiles; `Side` = the same fence turned for the left and right edges)
  fence: 4,
  fencePost: 5,
  fenceSide: 6,
  fencePostSide: 7,
  // decor (walk-over, one tile)
  cans3: 8,
  cans2: 9,
  ball: 10,
} as const;

/**
 * Big solid objects are 2x2 tiles: `id` is the top-left tile, the rest follow the tileset grid
 * (id + 1, id + columns, id + columns + 1). Place one with the same four ids in a 2x2 block of the `walls` layer.
 */
export const OBJECTS = {
  bush: 16,
  rock: 18,
  box: 20,
  scratcher: 22,
  bed: 32,
  bedCushion: 34,
} as const;
export type ObjectName = keyof typeof OBJECTS;

/** Tile ids of a 2x2 object, row by row: [top-left, top-right, bottom-left, bottom-right]. */
export const objectTiles = (id: number): readonly [number, number, number, number] => [
  id,
  id + 1,
  id + ARENA.tilesetColumns,
  id + ARENA.tilesetColumns + 1,
];

export const SOLID_TILES: readonly number[] = [
  TILES.fence,
  TILES.fencePost,
  TILES.fenceSide,
  TILES.fencePostSide,
  ...Object.values(OBJECTS).flatMap(objectTiles),
];

/** Object types on the `spawns` layer (Tiled: use POINT objects, set the Type/Class field). */
export const SPAWN_KINDS = { player: 'player', enemy: 'enemy', boss: 'boss' } as const;

export const ARENA_RULES = {
  /** Cats appear at the spawn point that is at least this far from Varu (when there is one). */
  minSpawnDistanceFromPlayer: 260,
  /** A walking cat looks this far past its own radius for a wall. */
  probeMargin: 14,
  /** Angles (degrees) a cat tries, wider each time, when a wall is straight ahead. */
  avoidAnglesDeg: [40, 80, 120],
  /** Cats re-check whether they can see their target this often (ms). Between checks they keep the last answer. */
  sightCheckMs: 120,
  /** The sight line is checked with a circle this big at most, so a fat cat does not give up at every gap. */
  sightRadiusMax: 18,
  /** A cat this close to its target just walks straight at it. */
  directRange: 70,
  /** Cats appear at a spawn point no farther than this from Varu (when there is one), so they join the fight instead of walking for a minute. */
  maxSpawnDistanceFromPlayer: 1100,
  /** Things that land "anywhere" (pickups, crows) land inside a box this far left/right and up/down of Varu, so they are seen. */
  nearbyHalfWidth: 600,
  nearbyHalfHeight: 330,
  /** Fallback when arena.json is missing: cats walk in from outside a random screen edge. */
  edgeSpawnMargin: 40,
} as const;
