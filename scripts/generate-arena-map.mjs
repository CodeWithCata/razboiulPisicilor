// Generates the placeholder Tiled map: public/assets/maps/arena.json
// Run:  node scripts/generate-arena-map.mjs
// You do NOT need this to edit the map: open arena.json in Tiled and paint. See the README.
// Reads src/config/arena.ts directly (node 22+ strips the types).
import { writeFileSync } from 'node:fs';
import { ARENA, OBJECTS, SOLID_TILES, SPAWN_KINDS, TILES, objectTiles } from '../src/config/arena.ts';

const { cols, rows, tile } = ARENA;
const idx = (c, r) => r * cols + c;
const gid = (tileId) => tileId + 1; // firstgid = 1; 0 = empty

const ground = new Array(cols * rows).fill(0);
const walls = new Array(cols * rows).fill(0);
const decor = new Array(cols * rows).fill(0);

// The world is 48x28 tiles; the screen shows about 32x18 of it, following Varu. The middle of the world is the
// "courtyard" (the layout Varu starts in: plaza, crossing paths, beds, "Campus!" lettering). The rest is built
// around it. Everything is turned 180 degrees around the world's center (a thing at the top left has a partner at
// the bottom right), so neither side of the world is easier.
const OX = 8, OY = 5; // where the courtyard's old top-left corner sits in the world
const rotC = (c, size = 2) => cols - size - c; // partner column of a thing that is `size` tiles wide
const rotR = (r, size = 2) => rows - size - r;

// Floor: the grass is the repeating backdrop (Tex.Grass), so the ground layer only holds plank floors.
// The weave repeats every 2x2 tiles.
const PLANK_TILES = [[TILES.plank00, TILES.plank10], [TILES.plank01, TILES.plank11]];
const putPlank = (c, r) => { ground[idx(c, r)] = gid(PLANK_TILES[r % 2][c % 2]); };
// Plaza under Varu's start point, corners chopped.
const PLAZA = { fromCol: 11 + OX, toCol: 20 + OX, fromRow: 6 + OY, toRow: 11 + OY };
const CHOPPED = new Set([[11, 6], [20, 6], [11, 11], [20, 11]].map(([c, r]) => `${c + OX},${r + OY}`));
for (let r = PLAZA.fromRow; r <= PLAZA.toRow; r++) {
  for (let c = PLAZA.fromCol; c <= PLAZA.toCol; c++) if (!CHOPPED.has(`${c},${r}`)) putPlank(c, r);
}
for (let c = 5 + OX; c <= 26 + OX; c++) for (const r of [8 + OY, 9 + OY]) putPlank(c, r); // long path, bed to bed
// Short stubs up and down (the strip above stays grass for the "Campus!" lettering).
for (const r of [4, 5, 12, 13]) for (const c of [15, 16]) putPlank(c + OX, r + OY);

// Decks: a small plank mat (4x4) under the four outer objects at the sides of the world.
const DECKS = [[4, 9], [42, 9]].flatMap(([c, r]) => [[c, r], [rotC(c), rotR(r)]]);
for (const [c, r] of DECKS) for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 2; dc++) putPlank(c + dc, r + dr);

// Border: a picket fence. Posts at the corners and every few tiles; the side edges use the turned pieces.
const POST_COLS = [4, 12, 20, 28, 36, 44];
const POST_ROWS = [4, 13, 22];
for (let c = 0; c < cols; c++) {
  const piece = POST_COLS.includes(c) ? TILES.fencePost : TILES.fence;
  walls[idx(c, 0)] = walls[idx(c, rows - 1)] = gid(piece);
}
for (let r = 1; r < rows - 1; r++) {
  const piece = POST_ROWS.includes(r) ? TILES.fencePostSide : TILES.fenceSide;
  walls[idx(0, r)] = walls[idx(cols - 1, r)] = gid(piece);
}
for (const [c, r] of [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]]) walls[idx(c, r)] = gid(TILES.fencePost);

// Obstacles: 2x2 objects ([column, row] of the top-left tile), listed for the top half only; each one is turned
// around the center to make its partner in the bottom half (the cat bed gets the cushion bed as partner).
//   courtyard: a bush in each corner, a bed at each end of the long path, scratchers and crates on the diagonals,
//              two rocks beside the stubs
//   outer ring: rocks and bushes along the top and bottom fence, a scratcher and a crate on a deck at each side
// Nothing is L-shaped, and every gap stays at least 2 tiles (80px) wide for the fat cat (checked below).
const PARTNER = { [OBJECTS.bed]: OBJECTS.bedCushion };
const HALF = [
  // courtyard (the old 32x18 layout, moved to the middle of the world)
  [3 + OX, 3 + OY, OBJECTS.bush], [27 + OX, 3 + OY, OBJECTS.bush],
  [3 + OX, 8 + OY, OBJECTS.bed],
  [8 + OX, 4 + OY, OBJECTS.scratcher], [22 + OX, 4 + OY, OBJECTS.box],
  [17 + OX, 4 + OY, OBJECTS.rock],
  // outer ring
  [5, 3, OBJECTS.rock], [14, 3, OBJECTS.bush], [33, 3, OBJECTS.bush], [42, 3, OBJECTS.rock],
  [4, 9, OBJECTS.scratcher], [42, 9, OBJECTS.box],
];
const OBSTACLES = HALF.flatMap(([c, r, id]) => [[c, r, id], [rotC(c), rotR(r), PARTNER[id] ?? id]]);
for (const [c, r, id] of OBSTACLES) {
  objectTiles(id).forEach((tileId, i) => {
    walls[idx(c + (i % 2), r + Math.floor(i / 2))] = gid(tileId);
  });
}
// Gap check: two 2x2 objects need at least 4 tiles between their top-left corners on one axis (= 2 free tiles),
// and each needs 2 free tiles to the fence.
for (const [c, r, id] of OBSTACLES) {
  if (c < 3 || r < 3 || c > cols - 5 || r > rows - 5) throw new Error(`object ${id} at ${c},${r} is too close to the fence`);
}
for (let i = 0; i < OBSTACLES.length; i++) {
  for (let j = i + 1; j < OBSTACLES.length; j++) {
    const [c1, r1] = OBSTACLES[i], [c2, r2] = OBSTACLES[j];
    if (Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)) < 4) throw new Error(`objects at ${c1},${r1} and ${c2},${r2} are too close`);
  }
}

// Decor: walk-over props, placed with a purpose instead of at random.
//   cans beside each bed (a snack bar) and crate, balls where a cat would have left them.
const COURTYARD_DECOR = [
  [5, 7, TILES.cans3], [5, 10, TILES.cans2], [26, 10, TILES.cans3], [26, 7, TILES.cans2],
  [24, 5, TILES.cans3], [7, 12, TILES.cans3], [10, 6, TILES.cans2], [21, 11, TILES.cans2],
  [12, 5, TILES.ball], [19, 12, TILES.ball], [6, 6, TILES.ball], [25, 11, TILES.ball],
  [10, 15, TILES.ball], [25, 2, TILES.ball], [2, 15, TILES.ball],
].map(([c, r, t]) => [c + OX, r + OY, t]);
const OUTER_HALF = [
  [8, 6, TILES.ball], [17, 5, TILES.cans2], [38, 6, TILES.ball], [2, 6, TILES.cans3],
  [44, 11, TILES.cans2], [8, 11, TILES.cans3], [6, 13, TILES.ball], [20, 2, TILES.cans3], [40, 12, TILES.cans3],
];
const DECOR = [
  ...COURTYARD_DECOR,
  ...OUTER_HALF.flatMap(([c, r, t]) => [[c, r, t], [rotC(c, 1), rotR(r, 1), t]]),
];
for (const [c, r, t] of DECOR) {
  if (walls[idx(c, r)] !== 0) throw new Error(`decor at ${c},${r} sits on a wall`);
  if (decor[idx(c, r)] === 0) decor[idx(c, r)] = gid(t);
}

// Spawn points (pixels). Cats appear at these (never right next to Varu, and not absurdly far either), the boss
// above the start so it walks into view, Varu in the middle of the world.
const W = cols * tile, H = rows * tile;
const EDGE_XS = [160, 480, 800, 1120, 1440, 1760];
const EDGE_YS = [200, 420, 700, 920];
const ENEMY_SPAWNS = [
  ...EDGE_XS.flatMap((x) => [[x, 60], [x, H - 60]]),
  ...EDGE_YS.flatMap((y) => [[60, y], [W - 60, y]]),
];
let nextId = 1;
const point = (name, type, x, y) => ({ id: nextId++, name, type, point: true, rotation: 0, visible: true, width: 0, height: 0, x, y });
const objects = [
  point('player', SPAWN_KINDS.player, W / 2, H / 2),
  point('boss', SPAWN_KINDS.boss, W / 2, H / 2 - 260),
  ...ENEMY_SPAWNS.map(([x, y], i) => point(`enemy ${i + 1}`, SPAWN_KINDS.enemy, x, y)),
];

// ---- sanity checks, so a bad edit to this script fails loudly ----
const solidGids = new Set(SOLID_TILES.map(gid));
const isSolid = (x, y) => solidGids.has(walls[idx(Math.floor(x / tile), Math.floor(y / tile))]);
for (const o of objects) if (isSolid(o.x, o.y)) throw new Error(`spawn "${o.name}" is inside a wall`);

const startC = Math.floor(W / 2 / tile), startR = Math.floor(H / 2 / tile);
const seen = new Set([idx(startC, startR)]);
const queue = [[startC, startR]];
while (queue.length) {
  const [c, r] = queue.pop();
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(idx(nc, nr)) || solidGids.has(walls[idx(nc, nr)])) continue;
    seen.add(idx(nc, nr));
    queue.push([nc, nr]);
  }
}
const open = walls.filter((g) => !solidGids.has(g)).length;
if (seen.size !== open) throw new Error(`arena has unreachable pockets: ${seen.size} reachable of ${open} open tiles`);

// ---- write Tiled JSON ----
const tileLayer = (id, name, data) => ({ data, height: rows, id, name, opacity: 1, type: 'tilelayer', visible: true, width: cols, x: 0, y: 0 });
const map = {
  compressionlevel: -1,
  height: rows,
  infinite: false,
  layers: [
    tileLayer(1, ARENA.layers.ground, ground),
    tileLayer(2, ARENA.layers.walls, walls),
    tileLayer(3, ARENA.layers.decor, decor),
    { draworder: 'topdown', id: 4, name: ARENA.layers.spawns, objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 },
  ],
  nextlayerid: 5,
  nextobjectid: nextId,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.10.2',
  tileheight: tile,
  tilesets: [
    {
      columns: ARENA.tilesetColumns,
      firstgid: 1,
      image: `${ARENA.tilesetName}.png`,
      imageheight: ARENA.tilesetMargin * 2 + ARENA.tilesetRows * tile + (ARENA.tilesetRows - 1) * ARENA.tilesetSpacing,
      imagewidth: ARENA.tilesetMargin * 2 + ARENA.tilesetColumns * tile + (ARENA.tilesetColumns - 1) * ARENA.tilesetSpacing,
      margin: ARENA.tilesetMargin,
      name: ARENA.tilesetName,
      spacing: ARENA.tilesetSpacing,
      tilecount: ARENA.tilesetColumns * ARENA.tilesetRows,
      tileheight: tile,
      tilewidth: tile,
      tiles: SOLID_TILES.map((id) => ({ id, properties: [{ name: ARENA.collideProperty, type: 'bool', value: true }] })),
    },
  ],
  tilewidth: tile,
  type: 'map',
  version: '1.10',
  width: cols,
};

writeFileSync(new URL('../public/assets/maps/arena.json', import.meta.url), JSON.stringify(map));
console.log(`arena.json written: ${cols}x${rows} tiles, ${open} open, ${objects.length} spawn points.`);
