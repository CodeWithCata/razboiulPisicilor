/** @file A row of small gold diamonds that circle a floor ring and flip like glints (the queen's spin ring and her hovering scepter). Visual only. */
import type Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { QUEEN_RIG } from '../../config/animation';

const D = QUEEN_RIG.ring.diamonds;

export class RingDiamonds {
  private readonly items: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, count: number, private readonly heightPx: number, depth: number) {
    for (let i = 0; i < count; i++) this.items.push(scene.add.image(0, 0, Tex.FxDiamond).setDepth(depth).setVisible(false));
  }

  setVisible(on: boolean): void {
    for (const d of this.items) d.setVisible(on);
  }

  /** Put them on a ring of `radius` px around (x, y). `ms` is any running clock: it drives the orbit and the flips. */
  update(x: number, y: number, radius: number, ms: number, visible: boolean): void {
    const n = this.items.length;
    this.items.forEach((d, i) => {
      const a = -ms * D.rate + (i / n) * Math.PI * 2;
      const flip = Math.abs(Math.cos(ms * D.flipRate + i * 1.3)); // turns edge-on and back, so it glints
      const k = this.heightPx / D.texH;
      d.setPosition(x + Math.cos(a) * radius * D.orbit, y + Math.sin(a) * radius * D.orbit)
        .setRotation(a + Math.PI / 2)
        .setScale(k * (0.25 + 0.75 * flip), k * (0.9 + 0.2 * Math.sin(ms * D.flipRate * 0.7 + i)))
        .setVisible(visible);
    });
  }

  destroy(): void {
    for (const d of this.items) d.destroy();
    this.items.length = 0;
  }
}
