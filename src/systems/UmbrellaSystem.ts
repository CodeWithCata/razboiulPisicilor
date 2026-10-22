/** @file The umbrella power-up's canopy over Varu (pop open, slow spin, blink before it closes, bump when it blocks) and the block itself for petards and ball rain. */
import Phaser from 'phaser';
import { texArgs } from '../assets/atlas';
import { Tex } from '../assets/keys';
import { UMBRELLA } from '../config/umbrella';
import { gameClock } from '../core/clock';
import { bus, Events, listen, type BuffsPayload, type PointPayload } from '../core/events';
import type { Player } from '../entities/Player';

/**
 * Draws the umbrella over Varu while `player.umbrella` is on, and answers the question "does the umbrella stop this?" for blasts and
 * the tennis cat's ball rain (`stops...`). Balls and shots in flight are handled in `ProjectileSystem`. A stop is announced with
 * `Events.UmbrellaBlock` (sparks, word and sound come from `Effects` and `AudioSystem`).
 */
export class UmbrellaSystem {
  private readonly canopy: Phaser.GameObjects.Image;
  private open = false;
  /** Game time (ms) the buff runs out, from the HUD payload (the badge list says how much is left). */
  private endsAt = 0;
  private readonly baseScale: number;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
  ) {
    const C = UMBRELLA.canopy;
    this.canopy = scene.add.image(player.x, player.y + C.offsetY, ...texArgs(Tex.UmbrellaCanopy)).setDepth(C.depth).setAlpha(C.alpha).setVisible(false);
    this.canopy.setDisplaySize(C.size, C.size);
    this.baseScale = this.canopy.scaleX;
    const off = [
      listen<BuffsPayload>(Events.BuffsChanged, ({ buffs }) => {
        const umbrella = buffs.find((b) => b.kind === 'umbrella');
        this.endsAt = umbrella ? gameClock.now + umbrella.remainingMs : 0;
      }),
      listen<PointPayload>(Events.UmbrellaBlock, () => this.bump(scene)),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** True when a blast from this source is stopped by the umbrella right now. */
  stopsBlast(source: string | undefined): boolean {
    return this.player.umbrella && source !== undefined && UMBRELLA.blockedBlastSources.includes(source);
  }

  /** True when the ball rain is stopped by the umbrella right now. */
  stopsBallRain(): boolean {
    return this.player.umbrella && UMBRELLA.blocksBallRain;
  }

  /** Tell everyone the umbrella just stopped something (sparks, word, sound). */
  announceBlock(): void {
    const payload: PointPayload = { x: this.player.x, y: this.player.y + UMBRELLA.canopy.offsetY };
    bus.emit(Events.UmbrellaBlock, payload);
  }

  /** Every frame: follow Varu, pop open / close, spin, blink at the end. No allocations. */
  update(delta: number): void {
    const C = UMBRELLA.canopy;
    const on = this.player.umbrella && this.player.active;
    if (on !== this.open) {
      this.open = on;
      this.canopy.setVisible(on);
      if (on) this.popOpen(this.canopy.scene);
    }
    if (!on) return;
    this.canopy.setPosition(this.player.x, this.player.y + C.offsetY);
    this.canopy.angle += C.spinDegPerSec * (delta / 1000);
    const left = this.endsAt - gameClock.now;
    const blinkOff = this.endsAt > 0 && left < C.blinkMs && Math.floor(left / C.blinkEveryMs) % 2 === 0;
    this.canopy.setAlpha(blinkOff ? C.alpha * 0.35 : C.alpha);
  }

  private popOpen(scene: Phaser.Scene): void {
    const C = UMBRELLA.canopy;
    this.canopy.setScale(this.baseScale * C.popFrom);
    scene.tweens.add({ targets: this.canopy, scale: this.baseScale, duration: C.popMs, ease: 'Back.easeOut' });
  }

  private bump(scene: Phaser.Scene): void {
    if (!this.open) return;
    const C = UMBRELLA.canopy;
    scene.tweens.add({ targets: this.canopy, scale: this.baseScale * C.blockBump, duration: C.blockBumpMs, yoyo: true });
  }
}
