/** @file The ice cream power-up: when Varu grabs it, every cat (not a boss) near him is frozen solid for a few seconds. */
import Phaser from 'phaser';
import { ICE_CREAM } from '../config/iceCream';
import { bus, Events, listen, type IceBlastPayload, type PointPayload } from '../core/events';
import { hyp } from '../core/hyp';
import type { Enemy } from '../entities/Enemy';

/** Listens for `Events.IceCream`, freezes the cats within `ICE_CREAM.radiusPx` (`Enemy.freezeFor`) and announces the result with `Events.IceBlast` (ring, word and sound). */
export class IceCreamSystem {
  constructor(
    scene: Phaser.Scene,
    private readonly enemies: Phaser.Physics.Arcade.Group,
  ) {
    const off = [listen<PointPayload>(Events.IceCream, ({ x, y }) => this.blast(x, y))];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** One-off, so a fresh copy of the list is fine here. */
  private blast(x: number, y: number): void {
    let frozen = 0;
    for (const child of this.enemies.getChildren().slice()) {
      const cat = child as Enemy;
      if (!cat.active || cat.isBoss) continue;
      if (hyp(cat.x - x, cat.y - y) > ICE_CREAM.radiusPx) continue;
      if (cat.freezeFor(ICE_CREAM.freezeMs)) frozen += 1;
    }
    const payload: IceBlastPayload = { x, y, radius: ICE_CREAM.radiusPx, frozen };
    bus.emit(Events.IceBlast, payload);
  }
}
