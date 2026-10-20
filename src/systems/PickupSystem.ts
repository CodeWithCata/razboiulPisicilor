/** @file Spawns pickups (timer + cat drops) and detects when Varu grabs one. */
import Phaser from 'phaser';
import { ARENA_RULES, PLAY_AREA } from '../config/arena';
import { LUCKY, PICKUPS, PICKUP_SPAWN, type PickupKind } from '../config/balance';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, listen, type BossDefeatedPayload, type EnemyKilledPayload, type PickupPayload } from '../core/events';
import { weightedPick } from '../core/random';
import { Pickup } from '../entities/Pickup';
import type { Player } from '../entities/Player';
import { gameClock } from '../core/clock';

/**
 * Spawns pickups (on a timer, and sometimes when a cat dies) and detects when Varu grabs one.
 * What a pickup DOES is not decided here: it emits PickupCollected and calls `onCollect`.
 */
export class PickupSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private nextSpawnAt: number;
  private nextGoldenAt: number;
  private readonly off: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly arena: ArenaQuery,
    onCollect: (kind: PickupKind) => void,
  ) {
    this.group = scene.physics.add.group();
    this.nextSpawnAt = gameClock.now + PICKUP_SPAWN.firstDelayMs;
    this.nextGoldenAt = gameClock.now + PICKUP_SPAWN.goldenBeltFirstMs;

    scene.physics.add.overlap(player, this.group, (_p, obj) => {
      const pickup = obj as Pickup;
      if (!pickup.active) return;
      const payload: PickupPayload = { kind: pickup.kind, x: pickup.x, y: pickup.y };
      pickup.destroy();
      bus.emit(Events.PickupCollected, payload);
      onCollect(payload.kind);
    });

    this.off.push(
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ x, y, type }) => {
        if (type === 'lucky') {
          this.luckyReward(x, y); // caught the lucky cat: a pile of pickups, always
          return;
        }
        if (Math.random() < PICKUP_SPAWN.killDropChance && this.hasRoom()) {
          this.spawnAt(this.pickKind(), Phaser.Math.Clamp(x, PLAY_AREA.left + 60, PLAY_AREA.right - 60), Phaser.Math.Clamp(y, PLAY_AREA.top + 60, PLAY_AREA.bottom - 60));
        }
      }),
      // Beating a boss always drops a heal and something fun.
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ x, y }) => {
        const cx = Phaser.Math.Clamp(x, PLAY_AREA.left + 120, PLAY_AREA.right - 120);
        const cy = Phaser.Math.Clamp(y, PLAY_AREA.top + 120, PLAY_AREA.bottom - 120);
        this.spawnAt('crochete', cx - 50, cy);
        this.spawnAt(this.pickKind(), cx + 50, cy);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  update(time: number): void {
    for (const child of this.group.getChildren().slice()) (child as Pickup).tick(time);

    // Guaranteed golden belt: never skipped, even when the field is full.
    if (time >= this.nextGoldenAt) {
      this.nextGoldenAt = time + PICKUP_SPAWN.goldenBeltEveryMs;
      this.spawnAt('goldenBelt', ...this.randomSpot());
    }

    if (time >= this.nextSpawnAt) {
      this.nextSpawnAt = time + Phaser.Math.Between(PICKUP_SPAWN.minIntervalMs, PICKUP_SPAWN.maxIntervalMs);
      if (this.hasRoom()) this.spawnAt(this.pickKind(), ...this.randomSpot());
    }
  }

  /** Always lands on open floor: if (x, y) is in or against a wall it moves to the nearest free spot. */
  spawnAt(kind: PickupKind, x: number, y: number): Pickup {
    const spot = this.arena.nearestOpen(x, y, PICKUPS.hitRadius);
    const pickup = new Pickup(this.scene, kind, spot.x, spot.y);
    this.group.add(pickup);
    return pickup;
  }

  /** Varu caught the lucky cat: `LUCKY.dropCount` of the usual random pickups land in a small ring around her. They ignore the field limit, like the golden belt. */
  private luckyReward(x: number, y: number): void {
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < LUCKY.dropCount; i++) {
      const a = start + (i / LUCKY.dropCount) * Math.PI * 2;
      this.spawnAt(
        this.pickKind(),
        Phaser.Math.Clamp(x + Math.cos(a) * LUCKY.dropRadius, PLAY_AREA.left + 60, PLAY_AREA.right - 60),
        Phaser.Math.Clamp(y + Math.sin(a) * LUCKY.dropRadius, PLAY_AREA.top + 60, PLAY_AREA.bottom - 60),
      );
    }
  }

  /** Debug helper: drop a specific kind next to Varu. */
  spawnNearPlayer(kind: PickupKind): void {
    const a = Math.random() * Math.PI * 2;
    this.spawnAt(
      kind,
      Phaser.Math.Clamp(this.player.x + Math.cos(a) * 110, PLAY_AREA.left + 60, PLAY_AREA.right - 60),
      Phaser.Math.Clamp(this.player.y + Math.sin(a) * 110, PLAY_AREA.top + 60, PLAY_AREA.bottom - 60),
    );
  }

  private hasRoom(): boolean {
    const others = this.group.getChildren().filter((c) => c.active && (c as Pickup).kind !== 'goldenBelt').length;
    return others < PICKUP_SPAWN.maxOnField;
  }

  /** Weighted random, but crochete is much more likely when Varu is hurt. */
  private pickKind(): PickupKind {
    const weights = { ...PICKUP_SPAWN.weights };
    if (this.player.hp / this.player.maxHp < PICKUP_SPAWN.lowHpThreshold) {
      weights.crochete *= PICKUP_SPAWN.lowHpHealBoost;
    }
    return weightedPick(weights);
  }

  /** A random spot near Varu (inside the view) that isn't right on top of him. */
  private randomSpot(): [number, number] {
    const margin = 90;
    const { nearbyHalfWidth: hw, nearbyHalfHeight: hh } = ARENA_RULES; // the world is bigger than the screen: land where Varu can see
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-hw, hw), PLAY_AREA.left + margin, PLAY_AREA.right - margin);
      const y = Phaser.Math.Clamp(this.player.y + Phaser.Math.Between(-hh, hh), PLAY_AREA.top + margin, PLAY_AREA.bottom - margin);
      const farFromVaru = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 160;
      if (farFromVaru && this.arena.isCircleFree(x, y, PICKUPS.size / 2)) return [x, y];
    }
    const fallback = this.arena.nearestOpen(this.player.x, this.player.y, PICKUPS.size / 2);
    return [fallback.x, fallback.y];
  }
}

