/** @file The scooter power-up: the scooter under Varu (turns to where he moves, blinks before it is gone) and the bump that shoves cats away as he drives. */
import Phaser from 'phaser';
import { texArgs } from '../assets/atlas';
import { Tex } from '../assets/keys';
import { SCOOTER } from '../config/scooter';
import { gameClock } from '../core/clock';
import { bus, Events, listen, type BuffsPayload, type PointPayload } from '../core/events';
import { hyp } from '../core/hyp';
import { snapshotInto } from '../core/snapshot';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/**
 * While `player.scooter` is on: draws the scooter under Varu and, every frame, shoves away every cat (never a boss) that touches him.
 * The bump is `Enemy.scooterBump` (a little damage, a long shove that counts as a fling). `GameScene` lets those cats' bites through
 * while the scooter runs, so a bumped cat never hurts him. A bump is announced with `Events.ScooterBump` (word, sparks, sound from `Effects` / `AudioSystem`).
 */
export class ScooterSystem {
  private readonly ride: Phaser.GameObjects.Image;
  private on = false;
  private endsAt = 0;
  private baseScale = 1;
  private readonly scratch: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
  ) {
    const L = SCOOTER.look;
    this.ride = scene.add.image(player.x, player.y, ...texArgs(Tex.ScooterBody)).setDepth(L.depth).setAlpha(L.alpha).setVisible(false);
    this.ride.setDisplaySize(L.width, L.height);
    this.baseScale = this.ride.scaleX;
    const off = [
      listen<BuffsPayload>(Events.BuffsChanged, ({ buffs }) => {
        const found = buffs.find((b) => b.kind === 'scooter');
        this.endsAt = found ? gameClock.now + found.remainingMs : 0;
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** Every frame: show / hide the scooter, put it under Varu, bump the cats that touch him. No allocations. */
  update(): void {
    const L = SCOOTER.look;
    const riding = this.player.scooter && this.player.active && this.player.alive;
    if (riding !== this.on) {
      this.on = riding;
      this.ride.setVisible(riding);
      if (riding) this.popIn();
    }
    if (!riding) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.ride.rotation = this.player.scooterHeading; // Player turns it smoothly; his feet follow the same way
    // "forward" of the sprite is up (-y) after rotation: sin / -cos of its rotation
    const fx = Math.sin(this.ride.rotation);
    const fy = -Math.cos(this.ride.rotation);
    const ahead = -L.offsetForward; // the config says negative = forward
    this.ride.setPosition(this.player.x + fx * ahead, this.player.y + fy * ahead);
    const left = this.endsAt - gameClock.now;
    const dim = this.endsAt > 0 && left < L.blinkMs && Math.floor(left / L.blinkEveryMs) % 2 === 0;
    this.ride.setAlpha(dim ? L.alpha * 0.4 : L.alpha);

    this.bumpCats(body);
  }

  private popIn(): void {
    const L = SCOOTER.look;
    this.ride.setScale(this.baseScale * L.popFrom);
    this.ride.scene.tweens.add({ targets: this.ride, scale: this.baseScale, duration: L.popMs, ease: 'Back.easeOut' });
  }

  private bumpCats(body: Phaser.Physics.Arcade.Body): void {
    const B = SCOOTER.bump;
    const px = this.player.x;
    const py = this.player.y;
    // Varu's own direction (zero when standing still)
    const speed = body.speed;
    const hx = speed > 1 ? body.velocity.x / speed : 0;
    const hy = speed > 1 ? body.velocity.y / speed : 0;
    const cats = snapshotInto(this.enemies.getChildren(), this.scratch);
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i] as Enemy;
      if (!cat.active || cat.isBoss || !cat.alive || !cat.hittable || cat.frozenSolid) continue;
      const dx = cat.x - px;
      const dy = cat.y - py;
      const dist = hyp(dx, dy);
      if (dist > this.player.hitRadius + cat.hitRadius + B.reachPad) continue;
      // away from Varu, leaning toward where he is heading
      const awayX = dist > 0.001 ? dx / dist : hx;
      const awayY = dist > 0.001 ? dy / dist : hy;
      let dirX = awayX * (1 - B.alongHeading) + hx * B.alongHeading;
      let dirY = awayY * (1 - B.alongHeading) + hy * B.alongHeading;
      const len = hyp(dirX, dirY);
      if (len < 0.001) {
        dirX = awayX;
        dirY = awayY;
      } else {
        dirX /= len;
        dirY /= len;
      }
      const cx = cat.x;
      const cy = cat.y;
      if (cat.scooterBump(B.damage, px, py, dirX, dirY, B.force, B.flyMs, B.gapMs)) {
        const payload: PointPayload = { x: cx, y: cy };
        bus.emit(Events.ScooterBump, payload);
      }
    }
    cats.length = 0;
  }
}
