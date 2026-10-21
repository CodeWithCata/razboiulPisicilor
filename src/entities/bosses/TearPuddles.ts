/** @file The emo cat's tear puddles: the scream leaves them on the floor, Varu walks slower while he stands in one, they dry up. Visual + a speed factor on Varu. */
import Phaser from 'phaser';
import { MAFIA } from '../../config/bosses';
import { clampToArena } from '../../core/arena';
import { gameClock } from '../../core/clock';
import type { Player } from '../Player';

const P = MAFIA.puddle;

interface Puddle {
  readonly obj: Phaser.GameObjects.Ellipse;
  readonly x: number;
  readonly y: number;
  readonly until: number;
}

export class TearPuddles {
  private readonly puddles: Puddle[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** `count` puddles at random spots between `minFrom` and `reach` px from (x, y). The oldest go first when there are more than `max`. */
  splash(count: number, x: number, y: number, reach: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = P.minFrom + Math.random() * Math.max(0, reach - P.minFrom);
      const at = clampToArena(x + Math.cos(a) * d, y + Math.sin(a) * d, P.radius);
      const obj = this.scene.add
        .ellipse(at.x, at.y, P.radius * 2, P.radius * 1.5, P.color, P.alpha)
        .setStrokeStyle(2, P.outline, 0.8)
        .setDepth(P.depth)
        .setScale(0.2);
      this.scene.tweens.add({ targets: obj, scale: 1, duration: 350, ease: 'Back.easeOut' });
      this.puddles.push({ obj, x: at.x, y: at.y, until: gameClock.now + P.lifeMs });
    }
    while (this.puddles.length > P.max) this.puddles.shift()?.obj.destroy();
  }

  /** Every frame: dry the old ones (they blink at the end) and slow Varu while he stands in one. */
  update(player: Player): void {
    const now = gameClock.now;
    let slowed = false;
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i]!;
      const left = p.until - now;
      if (left <= 0) {
        p.obj.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
      if (left < P.blinkMs) p.obj.setAlpha(P.alpha * (0.4 + 0.6 * Math.abs(Math.sin(now / 90))));
      // An ellipse, a little wider than tall like the drawing.
      const dx = (player.x - p.x) / P.radius;
      const dy = (player.y - p.y) / (P.radius * 0.75);
      if (dx * dx + dy * dy <= 1) slowed = true;
    }
    player.tearSlow = slowed ? P.slow : 1;
  }

  /** Remove them all and give Varu his speed back. */
  destroy(player: Player | null): void {
    for (const p of this.puddles) p.obj.destroy();
    this.puddles.length = 0;
    if (player) player.tearSlow = 1;
  }
}
