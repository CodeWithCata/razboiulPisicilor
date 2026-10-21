/** @file Solid things that are not map tiles (mustard barrels, street lamps): a still physics body Varu and walking cats bump into, plus a blocker in the solid grid. */
import Phaser from 'phaser';
import { bus, Events } from '../../core/events';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { SolidGrid } from '../../world/SolidGrid';

/** One solid thing standing in the arena. Hand it back to `Obstacles.remove` when it is broken or gone. */
export interface Obstacle {
  readonly zone: Phaser.GameObjects.Zone;
  readonly blockerId: number;
}

/**
 * The arena's tiles are solid through the Tiled walls layer, but a barrel or a lamp stands anywhere, so it cannot be a tile.
 * Each one is a small invisible rectangle with a still (static) physics body: Varu and the walking cats stop at it (flying cats pass over,
 * like they pass over walls). The same rectangle is also told to the solid grid, so path finding, shots, the thrown belt, kicked cans and
 * pickup spots all treat it as solid too. Everything belongs to the scene, so a restart cleans it up.
 */
export class Obstacles {
  private readonly group: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: SolidGrid,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
  ) {
    this.group = scene.physics.add.staticGroup();
    scene.physics.add.collider(player, this.group);
    scene.physics.add.collider(enemies, this.group, undefined, (enemy) => !(enemy as Enemy).flies);
  }

  /** A solid rectangle centered on (cx, cy), `w` x `h` px. */
  add(cx: number, cy: number, w: number, h: number): Obstacle {
    const zone = this.scene.add.zone(cx, cy, w, h);
    this.scene.physics.add.existing(zone, true);
    this.group.add(zone);
    const blockerId = this.grid.addBlocker(cx, cy, w, h);
    bus.emit(Events.ArenaChanged); // the walking routes changed
    return { zone, blockerId };
  }

  /** The thing is gone: Varu and the cats can walk through where it stood. */
  remove(obstacle: Obstacle): void {
    this.grid.removeBlocker(obstacle.blockerId);
    this.group.remove(obstacle.zone, true, true);
    bus.emit(Events.ArenaChanged);
  }
}
