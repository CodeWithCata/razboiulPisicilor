/** @file Smashing the street lamps: the belt, blasts and bosses hit a lamp that is out; it breaks after a few hits and a new one rises at the next night. */
import Phaser from 'phaser';
import { DAY_NIGHT } from '../config/dayNight';
import { PROP_TUNING, SMASH } from '../config/props';
import { gameClock } from '../core/clock';
import {
  bus, Events, listen,
  type BallLandedPayload, type BeltFlightPayload, type BeltSweepPayload, type CrowImpactPayload, type ExplosionPayload,
  type PropDestroyedPayload, type PropHitPayload,
} from '../core/events';
import { segmentTouchesBox, sweepTouchesBox } from '../core/reach';
import type { Player } from '../entities/Player';
import type { FloorLamp } from './FloorLamp';

const L = DAY_NIGHT.lamp;

/**
 * The street lamps (FloorLamp, owned by DayNight) are solid once they are out, and you can break them. Same ways as the mustard barrels
 * (systems/props/BarrelSystem.ts): the belt (swing, spin, throw) and blasts (kamikaze cats, crows, tennis balls, boss attacks). A swing is
 * 1 hit, a spin 1.5 (times Varu's damage buff), `DAY_NIGHT.lamp.hp` to break it; a blast breaks it at once. Walking cats do not break lamps.
 * A broken lamp stays gone for the rest of the night and is put back when the next night starts. The look of hits and the burst
 * (glass bits, words, sound) comes from the event bus: PropFx and AudioSystem.
 */
export class LampSystem {
  private readonly off: Array<() => void> = [];
  private sweepSerial = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly lamps: readonly FloorLamp[],
  ) {
    this.off.push(
      listen(Events.BeltSwing, () => (this.sweepSerial += 1)),
      listen(Events.BeltSpin, () => (this.sweepSerial += 1)),
      listen<BeltSweepPayload>(Events.BeltSweep, (p) => this.onSweep(p)),
      listen<BeltFlightPayload>(Events.BeltFlight, (p) => this.onFlight(p)),
      listen<ExplosionPayload>(Events.Explosion, ({ x, y, radius, fromBoss }) => this.blast(x, y, radius, fromBoss === true)),
      listen<BallLandedPayload>(Events.BallLanded, ({ x, y, radius }) => this.blast(x, y, radius, true)),
      listen<CrowImpactPayload>(Events.CrowImpact, ({ x, y, radius, variant }) => {
        if (variant !== 'miss') this.blast(x, y, radius, false);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  private onSweep(p: BeltSweepPayload): void {
    const key = this.sweepSerial * 16 + (p.lap % 16);
    const reach = p.range + PROP_TUNING.reachSlack;
    const damage = (p.spin ? SMASH.player.spin : SMASH.player.swing) * this.player.damageMultiplier;
    const power = p.spin ? PROP_TUNING.sweep.spin : PROP_TUNING.sweep.swing;
    for (const lamp of this.lamps) {
      if (!lamp.hittable || lamp.hitKey === key) continue;
      if (!sweepTouchesBox(p.x, p.y, lamp.box, reach, p.startAngle, p.swept)) continue;
      lamp.hitKey = key;
      this.hit(lamp, p.x, p.y, damage, power, false);
    }
  }

  private onFlight(p: BeltFlightPayload): void {
    const now = gameClock.now;
    for (const lamp of this.lamps) {
      if (!lamp.hittable || now < lamp.readyAt || !segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, lamp.box, p.radius)) continue;
      lamp.readyAt = now + L.flightCooldownMs;
      this.hit(lamp, p.prevX, p.prevY, SMASH.player.flight * this.player.damageMultiplier, PROP_TUNING.flight.power, false);
    }
  }

  /** A blast breaks every lamp in reach at once. */
  private blast(x: number, y: number, radius: number, byBoss: boolean): void {
    const reach = radius + L.blastSlackPx;
    for (const lamp of this.lamps) {
      if (!lamp.hittable || Phaser.Math.Distance.Between(x, y, lamp.footX, lamp.footY) > reach) continue;
      this.hit(lamp, x, y, L.hp, 1, byBoss);
    }
  }

  /** `fromX / fromY`: where the hit came from (the lantern rattles away from it). */
  private hit(lamp: FloorLamp, fromX: number, fromY: number, damage: number, power: number, byBoss: boolean): void {
    const dx = lamp.footX - fromX;
    const dy = lamp.footY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const hitPayload: PropHitPayload = { x: lamp.footX, y: lamp.footY - 50, kind: 'lamp', power, dirX: dx / len, dirY: dy / len, quiet: false };
    bus.emit(Events.PropHit, hitPayload);
    if (!lamp.hurt(damage)) return;
    const payload: PropDestroyedPayload = { x: lamp.footX, y: lamp.footY - 50, kind: 'lamp', byBoss };
    bus.emit(Events.PropDestroyed, payload);
  }
}
