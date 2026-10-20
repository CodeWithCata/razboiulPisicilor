// Generates the placeholder Tiled map: public/assets/maps/arena.json
// Run:  node scripts/generate-arena-map.mjs
// You do NOT need this to edit the map: open arena.json in Tiled and paint. See the README.
// Reads src/config/arena.ts directly (node 22+ strips the types).
import { writeFileSync } from 'node:fs';
import { ARENA, OBJECTS, SOLID_TILES, SPAWN_KINDS, TILES, objectTiles } from '../src/config/arena.ts';

const { tile, play, standTiles } = ARENA;
// The map is the fenced PLAY AREA (play.cols x play.rows tiles: the arena Varu fights in) with a ring of STANDS around it.
// Everything below is written in PLAY coordinates (0..PC-1, 0..PR-1). `idx` adds the stand margin, so the fence runs along
// the edge of the play area and the stands lie outside it. The stands themselves are drawn in code (world/Stands.ts).
const PC = play.cols, PR = play.rows;
const cols = ARENA.cols, rows = ARENA.rows; // the whole map
const MX = standTiles.left, MY = standTiles.top; // where the play area starts inside the map
const idx = (c, r) => (r + MY) * cols + (c + MX); // play coordinates -> layer index
const rawIdx = (c, r) => r * cols + c; // whole-map coordinates -> layer index
const gid = (tileId) => tileId + 1; // firstgid = 1; 0 = empty

const ground = new Array(cols * rows).fill(0);
const walls = new Array(cols * rows).fill(0);
const decor = new Array(cols * rows).fill(0);

// The courtyard (the layout Varu starts in: plaza, crossing paths, beds, \"Campus!\" lettering) is in the middle of the play area.
// The rest is built around it. Everything is turned 180 degrees around the play area's center (a thing at the top left has a
// partner at the bottom right), so neither side of the arena is easier.
const OX = 8, OY = 5; // where the courtyard's old top-left corner sits in the play area
const rotC = (c, size = 2) => PC - size - c; // partner column of a thing that is `size` tiles wide
const rotR = (r, size = 2) => PR - size - r;

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
// Short stubs up and down (the strip above stays grass for the \"Campus!\" lettering).
for (const r of [4, 5, 12, 13]) for (const c of [15, 16]) putPlank(c + OX, r + OY);

// Decks: a small plank mat (4x4) under the four outer objects at the sides of the arena.
const DECKS = [[4, 9], [42, 9]].flatMap(([c, r]) => [[c, r], [rotC(c), rotR(r)]]);
for (const [c, r] of DECKS) for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 2; dc++) putPlank(c + dc, r + dr);

// Border: a picket fence around the play area. Posts at the corners and every few tiles; the side edges use the turned pieces.
const POST_COLS = [4, 12, 20, 28, 36, 44];
const POST_ROWS = [4, 13, 22];
for (let c = 0; c < PC; c++) {
  const piece = POST_COLS.includes(c) ? TILES.fencePost : TILES.fence;
  walls[idx(c, 0)] = walls[idx(c, PR - 1)] = gid(piece);
}
for (let r = 1; r < PR - 1; r++) {
  const piece = POST_ROWS.includes(r) ? TILES.fencePostSide : TILES.fenceSide;
  walls[idx(0, r)] = walls[idx(PC - 1, r)] = gid(piece);
}
for (const [c, r] of [[0, 0], [PC - 1, 0], [0, PR - 1], [PC - 1, PR - 1]]) walls[idx(c, r)] = gid(TILES.fencePost);

// Obstacles: 2x2 objects ([column, row] of the top-left tile), listed for the top half only; each one is turned
// around the center to make its partner in the bottom half (the cat bed gets the cushion bed as partner).
//   courtyard: a bush in each corner, a bed at each end of the long path, scratchers and crates on the diagonals,
//              two rocks beside the stubs
//   outer ring: rocks and bushes along the top and bottom fence, a scratcher and a crate on a deck at each side
// Nothing is L-shaped, and every gap stays at least 2 tiles (80px) wide for the fat cat (checked below).
const PARTNER = { [OBJECTS.bed]: OBJECTS.bedCushion };
const HALF = [
  // courtyard (the old 32x18 layout, moved to the middle of the play area)
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
  if (c < 3 || r < 3 || c > PC - 5 || r > PR - 5) throw new Error(`object ${id} at ${c},${r} is too close to the fence`);
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

// Spawn points. Written in PLAY pixels (inside the fence), then moved into map pixels: the stands are outside the fence,
// so a spawn at the edge of the play area must not land out there. Cats appear at these (never right next to Varu, and not
// absurdly far either), the boss above the start so it walks into view, Varu in the middle of the play area.
const W = PC * tile, H = PR * tile;
const toMap = (x, y) => [x + MX * tile, y + MY * tile];
const EDGE_XS = [160, 480, 800, 1120, 1440, 1760];
const EDGE_YS = [200, 420, 700, 920];
const ENEMY_SPAWNS = [
  ...EDGE_XS.flatMap((x) => [[x, 60], [x, H - 60]]),
  ...EDGE_YS.flatMap((y) => [[60, y], [W - 60, y]]),
];
let nextId = 1;
const point = (name, type, x, y) => ({ id: nextId++, name, type, point: true, rotation: 0, visible: true, width: 0, height: 0, x, y });
const objects = [
  point('player', SPAWN_KINDS.player, ...toMap(W / 2, H / 2)),
  point('boss', SPAWN_KINDS.boss, ...toMap(W / 2, H / 2 - 260)),
  ...ENEMY_SPAWNS.map(([x, y], i) => point(`enemy ${i + 1}`, SPAWN_KINDS.enemy, ...toMap(x, y))),
];

// ---- sanity checks, so a bad edit to this script fails loudly ----
const solidGids = new Set(SOLID_TILES.map(gid));
const isSolid = (x, y) => solidGids.has(walls[rawIdx(Math.floor(x / tile), Math.floor(y / tile))]);
for (const o of objects) if (isSolid(o.x, o.y)) throw new Error(`spawn \"${o.name}\" is inside a wall`);

const startC = Math.floor(PC / 2), startR = Math.floor(PR / 2);
const seen = new Set([idx(startC, startR)]);
const queue = [[startC, startR]];
while (queue.length) {
  const [c, r] = queue.pop();
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= PC || nr >= PR || seen.has(idx(nc, nr)) || solidGids.has(walls[idx(nc, nr)])) continue;
    seen.add(idx(nc, nr));
    queue.push([nc, nr]);
  }
}
let open = 0;
for (let r = 0; r < PR; r++) for (let c = 0; c < PC; c++) if (!solidGids.has(walls[idx(c, r)])) open++;
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
console.log(`arena.json written: ${cols}x${rows} tiles (play area ${PC}x${PR} inside a stand ring), ${open} open play tiles, ${objects.length} spawn points.`);
