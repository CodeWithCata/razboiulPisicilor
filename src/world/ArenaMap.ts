import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { ARENA, CAMPUS_TEXT, WORLD } from '../config/arena';
import { SolidGrid } from './SolidGrid';
import { parseSpawns, type ArenaSpawns } from './spawns';

/**
 * The arena, loaded from a Tiled JSON map (public/assets/maps/arena.json).
 *   ground  floor, visual only
 *   walls   solid tiles (tile property `collides`), what Varu and walking cats bump into
 *   decor   visual only, drawn above the floor
 *   spawns  object layer: points for the player, the cats and the boss
 * Gameplay never touches tiles: it asks `grid` (see core/arena.ts ArenaQuery).
 * The grass under it all is the repeating Tex.Grass backdrop. If the map cannot be loaded, the arena is just that grass, no walls.
 */
export class ArenaMap {
  readonly grid: SolidGrid;
  readonly spawns: ArenaSpawns;
  private readonly walls: Phaser.Tilemaps.TilemapLayer | null;

  constructor(private readonly scene: Phaser.Scene) {
    // The grass is a repeating backdrop under everything; the map only adds floors, fences and props on top.
    scene.add.tileSprite(0, 0, WORLD.width, WORLD.height, Tex.Grass).setOrigin(0).setDepth(ARENA.depth.grass);
    // The "Campus!" lettering lies on the grass, under the floor and the props. Skipped if its image is missing.
    if (scene.textures.exists(Tex.CampusText)) {
      const text = scene.add.image(CAMPUS_TEXT.x, CAMPUS_TEXT.y, Tex.CampusText).setDepth(ARENA.depth.campus);
      text.setScale(CAMPUS_TEXT.width / text.width);
    }
    const built = this.tryBuild();
    if (built) {
      this.grid = built.grid;
      this.spawns = built.spawns;
      this.walls = built.walls;
      return;
    }
    this.grid = SolidGrid.empty(ARENA.cols, ARENA.rows, ARENA.tile);
    this.spawns = { player: null, enemies: [], boss: null };
    this.walls = null;
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

  private tryBuild(): { grid: SolidGrid; spawns: ArenaSpawns; walls: Phaser.Tilemaps.TilemapLayer } | null {
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
    map.createLayer(layers.decor, tileset, 0, 0)?.setDepth(depth.decor);
    const walls = map.createLayer(layers.walls, tileset, 0, 0);
    // Phaser 4 can also return a TilemapGPULayer (no collision support). Only the normal layer works here.
    if (!(walls instanceof Phaser.Tilemaps.TilemapLayer)) {
      console.warn(`[arena] no usable "${layers.walls}" layer in the map, using the plain grass arena.`);
      return null;
    }
    walls.setDepth(depth.walls);

    const grid = this.buildGrid(map, walls);
    const spawns = parseSpawns(map.getObjectLayer(layers.spawns)?.objects ?? []);
    return { grid, spawns, walls };
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
    return new SolidGrid(map.width, map.height, map.tileWidth, solid);
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
