/** @file The rare gold leaf a bush may drop: sparkles, tiny heal when Varu steps on it. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { GOLD_LEAF } from '../../config/props';
import { FONT_SFX } from '../../config/style';
import type { ArenaQuery } from '../../core/arena';
import { gameClock } from '../../core/clock';
import { Events, listen, type PropAmbientPayload, type PropHitPayload } from '../../core/events';
import type { Player } from '../../entities/Player';
import type { Effects } from '../Effects';

/**
 * The rare gold leaf. A bush now and then lets one go: it drifts down, lies on the floor sparkling, and gives a tiny heal
 * when Varu steps on it (only if he is hurt: at full health it just waits, then fades). One at a time, with a pause between two.
 * Like the other prop systems it listens to the event bus; numbers are in GOLD_LEAF (config/props.ts).
 */
export class GoldLeafSystem {
  private leaf: Phaser.GameObjects.Image | null = null;
  private landed = false;
  private expiresAt = 0;
  private nextGlintAt = 0;
  private nextAllowedAt = 0;
  private readonly off: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly arena: ArenaQuery,
    private readonly effects: Pick<Effects, 'floatText'>,
  ) {
    this.off.push(
      listen<PropAmbientPayload>(Events.PropAmbient, ({ x, y, kind, action }) => {
        if (kind === 'bush' && action === 'leaf' && Math.random() < GOLD_LEAF.ambientChance) this.spawn(x, y);
      }),
      listen<PropHitPayload>(Events.PropHit, ({ x, y, kind, quiet }) => {
        if (kind === 'bush' && !quiet && Math.random() < GOLD_LEAF.hitChance) this.spawn(x, y - 10);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off.forEach((f) => f());
      this.leaf?.destroy();
      this.leaf = null;
    });
  }

  update(now: number): void {
    const leaf = this.leaf;
    if (!leaf || !this.landed) return;

    if (now >= this.expiresAt) {
      this.leaf = null;
      this.scene.tweens.add({ targets: leaf, alpha: 0, duration: 300, onComplete: () => leaf.destroy() });
      return;
    }
    if (this.expiresAt - now < GOLD_LEAF.blinkMs) leaf.setAlpha(Math.floor(now / 110) % 2 === 0 ? 1 : 0.35);
    if (now >= this.nextGlintAt) {
      this.nextGlintAt = now + GOLD_LEAF.glintEveryMs;
      this.twinkle(leaf.x + Phaser.Math.Between(-10, 10), leaf.y + Phaser.Math.Between(-10, 6));
    }
    const hurt = this.player.hp < this.player.maxHp;
    if (hurt && Phaser.Math.Distance.Between(this.player.x, this.player.y, leaf.x, leaf.y) <= GOLD_LEAF.pickupRadius) this.collect(leaf);
  }

  private spawn(x: number, y: number): void {
    const now = gameClock.now;
    if (this.leaf || now < this.nextAllowedAt) return;
    this.nextAllowedAt = now + GOLD_LEAF.cooldownMs;

    const spot = this.arena.nearestOpen(x + Phaser.Math.Between(-18, 18), y + GOLD_LEAF.fallPx, 12);
    const ms = Phaser.Math.Between(GOLD_LEAF.fallMs.min, GOLD_LEAF.fallMs.max);
    const leaf = this.scene.add
      .image(x, y, ...texArgs(Tex.Leaf))
      .setTint(GOLD_LEAF.tint)
      .setScale(GOLD_LEAF.scale)
      .setDepth(GOLD_LEAF.depth)
      .setAngle(Phaser.Math.Between(0, 360));
    this.leaf = leaf;
    this.landed = false;

    const side = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({ targets: leaf, y: spot.y, duration: ms, ease: 'Quad.easeIn' });
    this.scene.tweens.add({ targets: leaf, angle: leaf.angle + side * 240, duration: ms, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: leaf, x: { from: x, to: spot.x }, duration: ms, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.leaf !== leaf) return;
        this.landed = true;
        this.expiresAt = gameClock.now + GOLD_LEAF.lifeMs;
        this.nextGlintAt = gameClock.now;
      },
    });
  }

  private collect(leaf: Phaser.GameObjects.Image): void {
    this.leaf = null;
    this.player.heal(GOLD_LEAF.heal);
    this.effects.floatText(leaf.x, leaf.y + GOLD_LEAF.word.offsetY, `+${GOLD_LEAF.heal}`, GOLD_LEAF.word.color, GOLD_LEAF.word.size, FONT_SFX);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random();
      const star = this.scene.add.image(leaf.x, leaf.y, ...texArgs(Tex.Star)).setTint(GOLD_LEAF.tint).setScale(0.5).setDepth(GOLD_LEAF.depth + 30);
      this.scene.tweens.add({
        targets: star, x: leaf.x + Math.cos(angle) * 34, y: leaf.y + Math.sin(angle) * 30, alpha: 0, scale: 0.1, angle: 120,
        duration: 420, ease: 'Cubic.easeOut', onComplete: () => star.destroy(),
      });
    }
    leaf.destroy();
  }

  private twinkle(x: number, y: number): void {
    const star = this.scene.add.image(x, y, ...texArgs(Tex.Star)).setTint(0xfff3a0).setScale(0).setDepth(GOLD_LEAF.depth + 1);
    this.scene.tweens.add({ targets: star, scale: 0.45, angle: 90, duration: 220, yoyo: true, ease: 'Sine.easeOut', onComplete: () => star.destroy() });
  }
}
