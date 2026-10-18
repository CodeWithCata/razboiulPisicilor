import type Phaser from 'phaser';
import { bus, Events } from '../../core/events';
import type { Enemy } from '../../entities/Enemy';
import type { Projectile } from '../ProjectileSystem';

/**
 * What the belt does to an enemy projectile it touches (swing, spin or thrown belt, all the same).
 * Tennis balls are DEFLECTED back (toward the boss if there is one, which stuns it) and become friendly.
 * Everything else is just destroyed.
 */
export function swatProjectile(proj: Projectile, enemies: Phaser.Physics.Arcade.Group): void {
  if (!proj.active || proj.friendly) return;

  if (proj.deflectable) {
    const boss = enemies.getChildren().find((e) => (e as Enemy).isBoss && e.active) as Enemy | undefined;
    const body = proj.body as Phaser.Physics.Arcade.Body;
    // No boss around: just send it back the way it came.
    proj.deflect(boss ? boss.x : proj.x - body.velocity.x, boss ? boss.y : proj.y - body.velocity.y);
    bus.emit(Events.ProjectileDeflected, { x: proj.x, y: proj.y });
  } else {
    bus.emit(Events.ProjectileBlocked, { x: proj.x, y: proj.y });
    proj.destroy();
  }
}
