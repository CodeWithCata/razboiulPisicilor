/** @file Loads the Tiled arena map, builds the solid grid and the visual layers, reads spawns and living-prop spots. */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { bus, Events } from '../core/events';
import { bakePropTextures } from '../assets/propTextures';
import { CampusMilk } from './CampusMilk';
import { ARENA, CAMPUS_TEXT, OBJECTS, WORLD, objectTiles, type ObjectName } from '../config/arena';
import { PROP_LAYER_NAME, PROP_TUNING } from '../config/props';
import { readPropLayout, type PropLayout, type TileRead } from './propLayout';
import { SolidGrid } from './SolidGrid';
import { buildStands } from './Stands';
import { StandsCrowd } from './StandsCrowd';
import { parseSpawns, type ArenaSpawns } from './spawns';

/**
 * The arena, loaded from a Tiled JSON map (public/assets/maps/arena.json).
 *   ground  floor, visual only
 *   walls   solid tiles (tile property `collides`), what Varu and walking cats bump into
 *   decor   visual only, drawn above the floor
 *   spawns  object layer: points for the player, the cats and the boss
 * Gameplay never touches tiles: it asks `grid` (see core/arena.ts ArenaQuery).
 * LIVING PROPS (config/props.ts): a tile cannot wobble, so the bushes, rocks, boxes, beds and the cans / ball are drawn as sprites by
 * systems/props/ instead, and the fences by an extra visual layer. The `walls` layer then only COLLIDES (it is hidden) and the `decor`
 * layer is not drawn. `props` is the list of what to bring to life; it is null when that is off or something about it failed, and then
 * the arena is drawn the old way, from the tile layers.
 * The grass under it all is the repeating Tex.Grass backdrop. If the map cannot be loaded, the arena is just that grass, no walls.
 */
export class ArenaMap {
  readonly grid: SolidGrid;
  readonly spawns: ArenaSpawns;
  /** What systems/props/ must draw and animate. Null = the tile layers draw everything. */
  readonly props: PropLayout | null;
  /** The cats in the stands: GameScene feeds it a frame at a time (`crowd.update(delta)`) and hands it its hooks (`crowd.connect`). */
  readonly crowd: StandsCrowd;
  /** The layer the fences are drawn on (only with `props`). */
  readonly fenceLayer: Phaser.Tilemaps.TilemapLayer | null;
  private readonly walls: Phaser.Tilemaps.TilemapLayer | null;
  /** The tileset's first global id (layer data holds id + firstgid). */
  private firstGid = 1;

  constructor(private readonly scene: Phaser.Scene) {
    // The grass is a repeating backdrop under everything; the map only adds floors, fences and props on top.
    scene.add.tileSprite(0, 0, WORLD.width, WORLD.height, Tex.Grass).setOrigin(0).setDepth(ARENA.depth.grass);
    this.crowd = new StandsCrowd(scene, buildStands(scene)); // the stands outside the fence (drawn in code, see world/Stands.ts) and the fans' life
    // The "Campus!" lettering lies on the grass, under the floor and the props. Skipped if its image is missing.
    if (scene.textures.exists(Tex.CampusText)) {
      const text = scene.add.image(CAMPUS_TEXT.x, CAMPUS_TEXT.y, Tex.CampusText).setDepth(ARENA.depth.campus);
      text.setScale(CAMPUS_TEXT.width / text.width);
      new CampusMilk(scene); // fills the letters with milk as the waves go by
    }
    const built = this.tryBuild();
    if (built) {
      this.grid = built.grid;
      this.spawns = built.spawns;
      this.walls = built.walls;
      this.props = built.props;
      this.fenceLayer = built.fenceLayer;
      return;
    }
    this.grid = SolidGrid.empty(ARENA.cols, ARENA.rows, ARENA.tile);
    this.spawns = { player: null, enemies: [], boss: null };
    this.walls = null;
    this.props = null;
    this.fenceLayer = null;
  }

  /** A 2x2 prop was destroyed: its solid tiles go (Varu and the cats can walk through, path finding is told) and the grid opens up. */
  removeObject(col: number, row: number): void {
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        this.walls?.removeTileAt(col + dc, row + dr, true, true);
        this.grid.clearTile(col + dc, row + dr);
      }
    }
    bus.emit(Events.ArenaChanged);
  }

  /** A 2x2 prop grew back: its four solid tiles return (Varu and the cats bump into it again, path finding is told). */
  addObject(name: ObjectName, col: number, row: number): void {
    const ids = objectTiles(OBJECTS[name]);
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        const tile = this.walls?.putTileAt(ids[dr * 2 + dc]! + this.firstGid, col + dc, row + dr, false);
        tile?.setCollision(true, true, true, true, false);
        this.grid.setSolidTile(col + dc, row + dr);
      }
    }
    this.walls?.calculateFacesWithin(col - 1, row - 1, 4, 4);
    bus.emit(Events.ArenaChanged);
  }

  /** Call from BootScene.preload. */
  static preload(scene: Phaser.Scene): void {
    scene.load.tilemapTiledJSON(ARENA.mapKey, ARENA.mapPath);
  }

  /** Varu stops at walls. */
  collidePlayer(player: Phaser.Physics.Arcade.Sprite): void {
    if (this.walls) this.scene.physics.add.collider(player, this.walls);
  }

  /** Cats stop at walls too, except the ones `canCollide` says no to (flying cats). */
  collideEnemies(enemies: Phaser.Physics.Arcade.Group, canCollide: (enemy: unknown) => boolean): void {
    if (this.walls) this.scene.physics.add.collider(enemies, this.walls, undefined, (enemy) => canCollide(enemy));
  }

  /** Safety net: if something ended up with its center inside a wall (knockback, teleport), move it out. */
  rescue(sprite: Phaser.Physics.Arcade.Sprite, clearance: number): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !body.enable || !this.grid.isSolidAt(sprite.x, sprite.y)) return;
    const spot = this.grid.nearestOpen(sprite.x, sprite.y, clearance);
    body.reset(spot.x, spot.y);
  }

  private tryBuild(): {
    grid: SolidGrid;
    spawns: ArenaSpawns;
    walls: Phaser.Tilemaps.TilemapLayer;
    props: PropLayout | null;
    fenceLayer: Phaser.Tilemaps.TilemapLayer | null;
  } | null {
    const { scene } = this;
    if (!scene.cache.tilemap.exists(ARENA.mapKey)) {
      console.warn(`[arena] ${ARENA.mapPath} not loaded, using the plain grass arena.`);
      return null;
    }
    const map = scene.make.tilemap({ key: ARENA.mapKey });
    const tileset = map.addTilesetImage(ARENA.tilesetName, Tex.Tileset);
    if (!tileset) {
      console.warn(`[arena] tileset "${ARENA.tilesetName}" not found in the map, using the plain grass arena.`);
      return null;
    }

    const { layers, depth } = ARENA;
    map.createLayer(layers.ground, tileset, 0, 0)?.setDepth(depth.ground);
    const decor = map.createLayer(layers.decor, tileset, 0, 0);
    decor?.setDepth(depth.decor);
    const walls = map.createLayer(layers.walls, tileset, 0, 0);
    // Phaser 4 can also return a TilemapGPULayer (no collision support). Only the normal layer works here.
    if (!(walls instanceof Phaser.Tilemaps.TilemapLayer)) {
      console.warn(`[arena] no usable "${layers.walls}" layer in the map, using the plain grass arena.`);
      return null;
    }
    walls.setDepth(depth.walls);

    const grid = this.buildGrid(map, walls);
    const spawns = parseSpawns(map.getObjectLayer(layers.spawns)?.objects ?? []);
    const living = PROP_TUNING.enabled ? this.makeLiving(map, tileset, walls, decor) : null;
    return { grid, spawns, walls, props: living?.layout ?? null, fenceLayer: living?.layer ?? null };
  }

  /**
   * Swap the tile drawing for living props. Order matters: everything that can fail comes first, and only when it all worked
   * the old drawing is turned off. If anything fails the arena is simply drawn the old way.
   */
  private makeLiving(
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
    walls: Phaser.Tilemaps.TilemapLayer,
    decor: unknown,
  ): { layout: PropLayout; layer: Phaser.Tilemaps.TilemapLayer } | null {
    if (!bakePropTextures(this.scene)) return null;

    const first = tileset.firstgid;
    this.firstGid = first;
    const decorLayer = decor instanceof Phaser.Tilemaps.TilemapLayer ? decor : null;
    const layout = readPropLayout(this.readTiles(walls, first), decorLayer ? this.readTiles(decorLayer, first) : []);

    // The visual layer: the fences (and any tile this reader does not know), so the hidden `walls` layer loses nothing.
    const visual: unknown = map.createBlankLayer(PROP_LAYER_NAME, tileset, 0, 0, map.width, map.height);
    if (!(visual instanceof Phaser.Tilemaps.TilemapLayer)) {
      console.warn('[arena] could not make the fence layer, drawing the arena from tiles.');
      return null;
    }
    visual.setDepth(ARENA.depth.walls);
    for (const tile of layout.statics) visual.putTileAt(tile.id + first, tile.col, tile.row, false);

    walls.setVisible(false); // still collides, just not drawn: the sprites and the visual layer draw it now
    decorLayer?.destroy(); // its cans and ball are sprites now
    return { layout, layer: visual };
  }

  /** Every filled tile of a layer: column, row and 0-based tileset id (the layer holds id + firstgid). */
  private readTiles(layer: Phaser.Tilemaps.TilemapLayer, first: number): TileRead[] {
    const out: TileRead[] = [];
    layer.forEachTile((tile) => {
      if (tile.index >= first) out.push({ col: tile.x, row: tile.y, id: tile.index - first });
    });
    return out;
  }

  /** Mark the walls that collide. If the `collides` property was not picked up, every wall tile collides. */
  private buildGrid(map: Phaser.Tilemaps.Tilemap, walls: Phaser.Tilemaps.TilemapLayer): SolidGrid {
    walls.setCollisionByProperty({ [ARENA.collideProperty]: true });
    let solid = this.readSolid(map, walls);

    if (!solid.some(Boolean)) {
      console.warn(`[arena] no tile has the "${ARENA.collideProperty}" property, so every tile on the walls layer will collide.`);
      walls.setCollisionByExclusion([-1]);
      solid = this.readSolid(map, walls);
    }
    return new SolidGrid(map.width, map.height, map.tileWidth, this.markStandsSolid(solid, map.width, map.height));
  }

  /** The stands are outside the fence: the grid marks them solid, so pickups, path finding and rescues never end up out there. */
  private markStandsSolid(solid: boolean[], cols: number, rows: number): boolean[] {
    const { left, top, right, bottom } = ARENA.standTiles;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < left || c >= cols - right || r < top || r >= rows - bottom) solid[r * cols + c] = true;
      }
    }
    return solid;
  }

  private readSolid(map: Phaser.Tilemaps.Tilemap, walls: Phaser.Tilemaps.TilemapLayer): boolean[] {
    const solid = new Array<boolean>(map.width * map.height).fill(false);
    walls.forEachTile((tile) => {
      if (tile.collides && tile.x >= 0 && tile.y >= 0 && tile.x < map.width && tile.y < map.height) {
        solid[tile.y * map.width + tile.x] = true;
      }
    });
    return solid;
  }
}
