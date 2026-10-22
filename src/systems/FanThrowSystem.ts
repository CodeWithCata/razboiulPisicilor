/** @file The fans (and the bomber cat) throw something into the arena now and then: a gift (a normal pickup) or a bad item (a petard with a burning fuse, or a cursed item that curses Varu if he stands in its ring). Decides WHEN, flies the item and lands it. */
import { texArgs, texRef } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex, type TexKey } from '../assets/keys';
import { PLAY_AREA } from '../config/arena';
import { isBadPickup, PICKUPS, type BadKind, type PickupKind } from '../config/balance';
import type { ThrowPick, ThrowSpot } from '../config/crowd';
import { FEDERER } from '../config/bosses';
import { FAN_THROW as F } from '../config/fanThrow';
import { PICKUP_VISUALS, pickLook } from '../config/pickups';
import { CURSE_DODGE_WORDS, FAN_THROW_LINES, PETARD_SWAT_WORDS, PETARD_WORDS, pick } from '../content/lines';
import type { ArenaQuery, Point } from '../core/arena';
import { gameClock } from '../core/clock';
import { weightedPick } from '../core/random';
import { distToSegment, isSwept } from '../core/sweep';
import { bus, Events, listen, type BeltFlightPayload, type BeltSweepPayload, type BossDefeatedPayload, type BossSpawnedPayload, type ExplosionPayload, type FanLandedPayload, type FanThrowPayload, type PointPayload, type RallyHitPayload, type ThrowPetardPayload, type WavePayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { WaveSystem } from './WaveSystem';
import { flatHoop, hoopScale } from './flatShapes';
import { hyp } from '../core/hyp';
import { snapshotInto } from '../core/snapshot';

/** What the system needs from the scene (GameScene hands these over; it only wires). */
export interface FanThrowSources {
  waves: WaveSystem;
  enemies: Phaser.Physics.Arcade.Group;
  player: Player;
  arena: ArenaQuery;
  /** world/StandsCrowd.ts: picks a fan and starts its wind-up. Null = no fan fits right now. */
  beginThrow: (request: ThrowPick) => ThrowSpot | null;
  /** The fan lets go (it lunges at the field). */
  releaseThrow: () => void;
  /** The usual weighted random pickup kind (PickupSystem). */
  rollKind: () => PickupKind;
  /** Puts a pickup on the floor (PickupSystem). */
  spawnPickup: (kind: PickupKind, x: number, y: number, tex?: TexKey) => void;
  /** True when `CurseSystem` would allow a curse right now (a curse drop is only thrown then). */
  curseAllowed: () => boolean;
  /** Gives Varu the curse a dropped item carried (`CurseSystem.force`). */
  curse: (kind: BadKind) => void;
  /** Floats a word in the world (Effects.floatText). */
  say: (x: number, y: number, text: string, color: string, size: number) => void;
}

/** How a flying item looks: its picture, its size and the color of its ring. */
interface ItemLook {
  tex: TexKey;
  sizePx: number;
  color: number;
}

/** Where a petard came from: the cat that threw it (null = a fan), the spot it was thrown from, and whether the belt already knocked it back. */
interface PetardTrip {
  by: Phaser.GameObjects.GameObject | null;
  origin: Point;
  returned: boolean;
}

const NO_TRIP: PetardTrip = { by: null, origin: { x: 0, y: 0 }, returned: false };

/** A petard on the floor (squash, hop, fuse): the belt can still knock it back until it goes off. */
interface Lying {
  x: number;
  y: number;
  item: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  trip: PetardTrip;
  /** It was knocked back (or the run ended): its tweens must do nothing any more. */
  cancelled: boolean;
}

const TAU = Math.PI * 2;

/** A bad pickup carried by a throw is a curse drop (a petard is `null`, a gift is a good pickup). */
const isCurse = (kind: PickupKind | null): kind is BadKind => kind !== null && isBadPickup(kind);

/**
 * One roll per wave, at the start (numbers: `FAN_THROW` in config/fanThrow.ts). If it hits, a fan in the stands winds up some seconds later
 * (only if that wave is still going), lets go, and the item flies in a lob to a spot near Varu with a growing shadow and a ring as the warning.
 * A GIFT turns into a normal pickup where it lands. A PETARD lies there hissing and goes off after `petard.fuseMs`: it hurts Varu if he is
 * inside the ring, and every cat in it too (so it is also a weapon). Runs on the game clock (the pause menu stops it); the flight and the
 * fuse are scene tweens. All visuals are code-drawn (the petard is `drawPetard` in assets/art/items.ts).
 */
export class FanThrowSystem {
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];
  /** Petards lying on the floor right now (v170: the belt can knock the cat-thrown ones back). */
  private readonly lying: Lying[] = [];
  /** Reused copies of `lying` for the belt handlers (see `snapshotInto`): swatting one removes it from `lying` mid-loop. */
  private readonly sweepScratch: Lying[] = [];
  private readonly flightScratch: Lying[] = [];
  /** Waves started in this run (an endless run counts from its own first wave) and throws let go so far (the first is always a gift). */
  private runWaves = 0;
  private thrown = 0;
  /** Throws still to come this wave, when the next one is due (Infinity = none) and when it is skipped for lack of a fan. */
  private left = 0;
  private dueAt = Infinity;
  private giveUpAt = Infinity;
  /** A fan is winding up: no other throw starts meanwhile. */
  private busy = false;
  private bossAlive = false;
  /** Federer is in the arena: a long rally then earns Varu a gift from the fans (`FEDERER.crowd`). */
  private federerAlive = false;
  private giftReadyAt = 0;
  /** The run is over (game over or victory): nothing lands or goes off any more. */
  private over = false;
  /** Dev key Q: the next throw ignores the wave and is a gift or a petard. */
  private forced: 'gift' | 'bad' | null = null;
  private nextForced: 'gift' | 'bad' = 'gift';
  /** Dev (debug card): the forced gift is this exact pickup (null = the usual weighted random one). */
  private forcedKind: PickupKind | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly src: FanThrowSources,
  ) {
    this.dust = scene.add
      .particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
        emitting: false,
        lifespan: { min: 320, max: 620 },
        speed: { min: 30, max: 120 },
        scale: { start: 1, end: 0.15 },
        alpha: { start: 0.8, end: 0 },
        tint: [...F.dust.tint],
      })
      .setDepth(F.depth.dust);
    const S = F.petard.spark;
    this.sparks = scene.add
      .particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
        emitting: false,
        lifespan: { min: S.lifeMs.min, max: S.lifeMs.max },
        speed: { min: S.speed.min, max: S.speed.max },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [...S.tint],
      })
      .setDepth(F.depth.sparks);
    this.off.push(
      listen<WavePayload>(Events.WaveStarted, () => this.onWaveStarted()),
      listen(Events.WaveCleared, () => this.cancel()), // what was not thrown by now is not thrown between waves
      listen<BossSpawnedPayload>(Events.BossSpawned, ({ boss }) => {
        this.bossAlive = true;
        if (boss === 'federer') this.federerAlive = true;
      }),
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ boss }) => {
        this.bossAlive = false;
        if (boss === 'federer') this.federerAlive = false;
      }),
      listen<RallyHitPayload>(Events.RallyHit, ({ hits }) => this.onRally(hits)),
      listen<ThrowPetardPayload>(Events.ThrowPetard, (e) => this.lobPetard(e)),
      listen<BeltSweepPayload>(Events.BeltSweep, (p) => this.onSweep(p)),
      listen<BeltFlightPayload>(Events.BeltFlight, (p) => this.onFlight(p)),
      listen(Events.GameOver, () => this.stop()),
      listen(Events.Victory, () => this.stop()),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off.forEach((f) => f());
      this.dust.destroy();
      this.sparks.destroy();
    });
  }

  /**
   * Dev key Q: right now a fan throws. `what` picks the item (`gift` = a random pickup, `bad` = a petard); without it a gift the first time,
   * a petard the next, and so on. `kind` makes a gift that exact pickup. Works between waves too.
   */
  force(what?: 'gift' | 'bad', kind?: PickupKind): void {
    if (this.over) return;
    this.forced = what ?? this.nextForced;
    this.forcedKind = this.forced === 'gift' ? kind ?? null : null;
    if (!what) this.nextForced = this.nextForced === 'gift' ? 'bad' : 'gift';
    this.left = Math.max(this.left, 1);
    this.dueAt = gameClock.now;
    this.giveUpAt = this.dueAt + F.giveUpMs;
  }

  /** v147: a rally of `FEDERER.crowd.rallyHits` hits on one ball against Federer: the fans throw Varu a gift (at most one per `giftCooldownMs`). */
  private onRally(hits: number): void {
    const C = FEDERER.crowd;
    if (!this.federerAlive || this.over || this.busy || hits < C.rallyHits || gameClock.now < this.giftReadyAt) return;
    this.giftReadyAt = gameClock.now + C.giftCooldownMs;
    this.force('gift');
  }

  update(now: number): void {
    if (this.busy || now < this.dueAt) return;
    if (this.over || (this.forced === null && !this.src.waves.inWave) || now > this.giveUpAt) {
      this.cancel(); // that wave is over already, or no fan was ever near enough
      return;
    }
    const player = this.src.player;
    const spot = this.src.beginThrow({
      x: player.x,
      y: player.y,
      minDist: F.fanFromVaruPx.min,
      maxDist: F.fanFromVaruPx.max,
      maxTier: F.maxTier,
      windUpMs: F.windUpMs,
    });
    if (!spot) {
      this.dueAt = now + F.retryMs; // Varu is far from every stand: look again in a moment
      return;
    }

    const bad = this.rollBad();
    this.forced = null;
    // A bad throw is a petard (null) or, when the curse gate allows one right now, sometimes a curse drop (the debug card can also force one as an exact gift).
    const drop = bad && this.src.curseAllowed() && Math.random() < F.curse.share ? weightedPick(F.curse.weights) : null;
    const kind: PickupKind | null = bad ? drop : this.forcedKind ?? this.src.rollKind();
    this.forcedKind = null;
    const look = this.lookOf(kind);
    const curse = isCurse(kind);
    const target = this.aim(spot, kind === null ? F.petard.radius * 0.25 : curse ? F.curse.radius * 0.25 : PICKUPS.size / 2);
    this.busy = true;
    const lines: readonly string[] = curse ? FAN_THROW_LINES.curse : bad ? FAN_THROW_LINES.bad : FAN_THROW_LINES.gift;
    this.src.say(spot.x, spot.y - F.shout.liftPx, pick(lines), bad || curse ? F.shout.bad : F.shout.gift, F.shout.size);
    this.scene.time.delayedCall(F.windUpMs, () => this.release(spot, target, look, kind));
  }

  /* ------------------------------------------------------------ when */

  private onWaveStarted(): void {
    this.runWaves += 1;
    this.cancel();
    if (!F.enabled || this.runWaves < F.minRunWave || Math.random() >= F.chance) return;
    this.left = 1 + (Math.random() < F.secondChance ? 1 : 0);
    this.dueAt = gameClock.now + Phaser.Math.Between(F.delayMs.min, F.delayMs.max);
    this.giveUpAt = this.dueAt + F.giveUpMs;
  }

  /** A cat (the bomber) lobs a petard: the very same flight, fuse and blast as a fan's petard. Cat throws are not fan throws: no crowd cheer, no wave logic. */
  private lobPetard(e: ThrowPetardPayload): void {
    if (this.over) return;
    this.fly({ x: e.x, y: e.y }, { x: e.toX, y: e.toY }, this.lookOf(null), null, { by: e.by ?? null, origin: { x: e.x, y: e.y }, returned: false });
  }

  /** Nothing more to throw this wave (a fan that is already winding up still lets go). */
  private cancel(): void {
    this.left = 0;
    this.dueAt = Infinity;
    this.giveUpAt = Infinity;
    this.forced = null;
  }

  private stop(): void {
    this.over = true;
    this.cancel();
    for (const l of this.lying) l.cancelled = true; // nothing is swatted any more
    this.lying.length = 0;
  }

  /* ------------------------------------------------------------ swat it back */

  private forget(l: Lying): void {
    const i = this.lying.indexOf(l);
    if (i >= 0) this.lying.splice(i, 1);
  }

  /** The belt swings or spins around (p.x, p.y): a cat-thrown petard that lies inside the arc is knocked back. */
  private onSweep(p: BeltSweepPayload): void {
    if (this.lying.length === 0) return;
    const reach = p.range + F.swat.hitRadiusPx;
    const items = snapshotInto(this.lying, this.sweepScratch);
    for (let i = 0; i < items.length; i++) {
      const l = items[i]!;
      if (hyp(l.x - p.x, l.y - p.y) > reach) continue;
      if (!isSwept(Math.atan2(l.y - p.y, l.x - p.x), p.startAngle, p.swept)) continue;
      this.swat(l);
    }
    this.sweepScratch.length = 0;
  }

  /** The thrown belt flew from (prevX, prevY) to (x, y) this frame. */
  private onFlight(p: BeltFlightPayload): void {
    if (this.lying.length === 0) return;
    const items = snapshotInto(this.lying, this.flightScratch);
    for (let i = 0; i < items.length; i++) {
      const l = items[i]!;
      if (distToSegment(l.x, l.y, p.prevX, p.prevY, p.x, p.y) <= p.radius + F.swat.hitRadiusPx) this.swat(l);
    }
    this.flightScratch.length = 0;
  }

  /** The belt hit a lying petard: if a cat threw it (and it was not knocked back yet) it flies back to her with a fresh fuse. */
  private swat(l: Lying): void {
    if (this.over || l.cancelled || l.trip.returned || !l.trip.by) return;
    const S = F.swat;
    l.cancelled = true;
    this.forget(l);
    this.scene.tweens.killTweensOf(l.item);
    l.item.destroy();
    l.ring.destroy();

    const thrower = l.trip.by as Enemy;
    const target = thrower.active ? { x: thrower.x, y: thrower.y } : l.trip.origin;
    const m = F.wallMargin;
    const to = this.src.arena.nearestOpen(
      Phaser.Math.Clamp(target.x, PLAY_AREA.left + m, PLAY_AREA.right - m),
      Phaser.Math.Clamp(target.y, PLAY_AREA.top + m, PLAY_AREA.bottom - m),
      F.petard.radius * 0.25,
    );
    this.dust.explode(F.dust.count, l.x, l.y);
    this.src.say(l.x, l.y + S.word.offsetY, pick(PETARD_SWAT_WORDS), S.word.color, S.word.size);
    const swatted: PointPayload = { x: l.x, y: l.y };
    bus.emit(Events.PetardSwatted, swatted);
    this.fly({ x: l.x, y: l.y }, to, this.lookOf(null), null, { by: l.trip.by, origin: l.trip.origin, returned: true });
  }

  /** Gift or petard? The first throw of a run is a gift, a boss in the arena means gifts only, and a hurt Varu gets pity. */
  private rollBad(): boolean {
    if (this.forced !== null) return this.forced === 'bad';
    if (this.thrown === 0 || this.bossAlive) return false;
    const p = this.src.player;
    if (p.hp / p.maxHp < F.mercyHpShare) return false;
    return Math.random() < F.badChance;
  }

  private lookOf(kind: PickupKind | null): ItemLook {
    if (kind === null) return { tex: F.petard.tex, sizePx: F.petard.sizePx, color: F.petard.ring.color };
    const visual = PICKUP_VISUALS[kind];
    return { tex: pickLook(kind), sizePx: visual.size ?? PICKUPS.size, color: visual.color };
  }

  /* ------------------------------------------------------------ where */

  /** A spot of open floor near Varu, on the side of the fan: `landFromVaruPx` away from him, turned by up to `spreadDeg`, and at least `minThrowPx` from the fan. */
  private aim(spot: ThrowSpot, clearance: number): Point {
    const p = this.src.player;
    const dx = spot.x - p.x;
    const dy = spot.y - p.y;
    const toFan = Math.atan2(dy, dx);
    const reach = Math.max(0, hyp(dx, dy) - F.minThrowPx);
    const near = Math.min(F.landFromVaruPx.min, reach);
    const far = Math.min(F.landFromVaruPx.max, reach);
    for (let i = 0; i < F.tries; i++) {
      const angle = toFan + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-F.spreadDeg, F.spreadDeg));
      const dist = Phaser.Math.FloatBetween(near, far);
      const x = Phaser.Math.Clamp(p.x + Math.cos(angle) * dist, PLAY_AREA.left + F.wallMargin, PLAY_AREA.right - F.wallMargin);
      const y = Phaser.Math.Clamp(p.y + Math.sin(angle) * dist, PLAY_AREA.top + F.wallMargin, PLAY_AREA.bottom - F.wallMargin);
      if (this.src.arena.isCircleFree(x, y, clearance)) return { x, y };
    }
    return this.src.arena.nearestOpen(p.x + Math.cos(toFan) * near, p.y + Math.sin(toFan) * near, clearance);
  }

  /** Open floor at Varu's feet: where a curse drop lands. */
  private aimAtVaru(): Point {
    const p = this.src.player;
    return this.src.arena.nearestOpen(p.x, p.y, F.curse.radius * 0.25);
  }

  /* ------------------------------------------------------------ the throw */

  /** The wind-up is over: the fan lets go, everybody hears it, and the item starts to fly. */
  private release(spot: ThrowSpot, target: Point, look: ItemLook, kind: PickupKind | null): void {
    this.src.releaseThrow();
    this.busy = false;
    if (this.over) return;
    this.thrown += 1;
    this.left -= 1;
    if (this.left > 0) {
      this.dueAt = gameClock.now + Phaser.Math.Between(F.gapMs.min, F.gapMs.max);
      this.giveUpAt = this.dueAt + F.giveUpMs;
    } else {
      this.dueAt = Infinity;
    }
    const landAt = isCurse(kind) ? this.aimAtVaru() : target; // a curse drop comes down where he stands NOW: the ring is the warning
    const thrown: FanThrowPayload = { x: spot.x, y: spot.y, toX: landAt.x, toY: landAt.y, bad: kind === null || isCurse(kind) };
    bus.emit(Events.FanThrow, thrown);
    this.fly(spot, landAt, look, kind);
  }

  /**
   * The lob: the item travels in a straight line over the floor while it is drawn higher and bigger at the top of its arc (closer to the
   * camera). Its shadow stays on the floor and its ring (already the real reach for a petard) fades in at the spot it is heading for.
   */
  private fly(from: ThrowSpot, to: Point, look: ItemLook, kind: PickupKind | null, trip: PetardTrip = NO_TRIP): void {
    const scene = this.scene;
    const A = F.arc;
    const M = F.marker;
    const petard = kind === null;
    const curse = isCurse(kind);
    const ringStyle = curse ? F.curse.ring : petard ? F.petard.ring : F.gift.ring;
    const radius = curse ? F.curse.radius : petard ? F.petard.radius : F.gift.ring.radius;
    const ringStart = curse ? F.curse.ring.startScale : petard ? F.petard.ring.startScale : M.ringStartScale;

    const item = scene.add.image(from.x, from.y, ...texArgs(look.tex)).setDepth(F.depth.item);
    const base = look.sizePx / Math.max(item.frame.realWidth, item.frame.realHeight);
    item.setScale(base * A.startScale);
    const shadow = scene.add.image(from.x, from.y, ...texArgs(Tex.Shadow)).setDepth(F.depth.marker).setAlpha(0);
    const ringBase = hoopScale(radius); // the ring is a tinted atlas hoop (flatShapes.ts); scale 1 of the old circle = `ringBase` now
    const ring = flatHoop(scene, to.x, to.y, radius, look.color, 1).setDepth(F.depth.marker).setAlpha(0);
    const spin = Math.random() < 0.5 ? -1 : 1;
    const flightMs = trip.returned ? F.swat.flightMs : F.flightMs; // a knocked-back petard comes back faster

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: flightMs,
      ease: 'Linear',
      onUpdate: (tween) => {
        const u = tween.getValue() ?? 0;
        const arc = Math.sin(Math.PI * u);
        const gx = from.x + (to.x - from.x) * u;
        const gy = from.y + (to.y - from.y) * u;
        item
          .setPosition(gx, gy - arc * A.heightPx)
          .setScale(base * (A.startScale + (1 - A.startScale) * u + (A.apexScale - 1) * arc))
          .setAngle(u * flightMs * A.spinDegPerMs * spin);
        const grow = (M.startShare + (1 - M.startShare) * u) * (1 - 0.3 * arc);
        shadow
          .setPosition(gx, gy)
          .setDisplaySize(look.sizePx * 2 * M.shadowW * grow, look.sizePx * 2 * M.shadowH * grow)
          .setAlpha(M.startAlpha + (M.endAlpha - M.startAlpha) * u);
        ring.setScale(ringBase * (ringStart + (1 - ringStart) * u)).setAlpha((0.25 + 0.75 * u) * ringStyle.stroke);
      },
      onComplete: () => {
        shadow.destroy();
        if (this.over) {
          item.destroy();
          ring.destroy();
          return;
        }
        if (kind === null) this.landPetard(item, ring, to, base, trip);
        else if (isCurse(kind)) this.landCurse(item, ring, to, kind);
        else this.landGift(item, ring, to, kind, look.color, look.tex);
      },
    });
  }

  /* ------------------------------------------------------------ the gift */

  /** The gift touches down: dust and a ring, and a real pickup takes its place (it pops in and expires like any other). */
  private landGift(item: Phaser.GameObjects.Image, ring: Phaser.GameObjects.Image, to: Point, kind: PickupKind, color: number, tex: TexKey): void {
    item.destroy();
    ring.destroy();
    this.src.spawnPickup(kind, to.x, to.y, tex); // the same look it had in the air
    this.dust.explode(F.dust.count, to.x, to.y);
    const P = F.gift.pop;
    const pop = flatHoop(this.scene, to.x, to.y, P.fromPx, color, 1).setDepth(F.depth.dust + 1);
    this.scene.tweens.add({ targets: pop, scale: hoopScale(P.toPx), alpha: 0, duration: P.ringMs, ease: 'Cubic.easeOut', onComplete: () => pop.destroy() });
    const landed: FanLandedPayload = { x: to.x, y: to.y, bad: false };
    bus.emit(Events.FanLanded, landed);
  }

  /* ------------------------------------------------------------ the curse drop */

  /** The item touches down: if Varu is still inside the ring he gets the curse, otherwise a word says he dodged it. The item then fades out. */
  private landCurse(item: Phaser.GameObjects.Image, ring: Phaser.GameObjects.Image, to: Point, kind: BadKind): void {
    const C = F.curse;
    const p = this.src.player;
    this.dust.explode(F.dust.count, to.x, to.y);
    const landed: FanLandedPayload = { x: to.x, y: to.y, bad: true };
    bus.emit(Events.FanLanded, landed);
    ring.destroy();
    this.scene.tweens.add({ targets: item, alpha: 0, duration: C.fadeMs, onComplete: () => item.destroy() });
    if (p.alive && Phaser.Math.Distance.Between(p.x, p.y, to.x, to.y) <= C.radius + p.hitRadius) this.src.curse(kind);
    else this.src.say(to.x, to.y + C.word.offsetY, pick(CURSE_DODGE_WORDS), C.word.color, C.word.size);
  }

  /* ------------------------------------------------------------ the petard */

  /** The petard hits the floor: it squashes, hops once and lies down hissing. The ring (the real blast reach) stays where it is. */
  private landPetard(item: Phaser.GameObjects.Image, ring: Phaser.GameObjects.Image, to: Point, base: number, trip: PetardTrip): void {
    const scene = this.scene;
    const P = F.petard;
    const lyingAngle = Math.random() * 360;
    const lying: Lying = { x: to.x, y: to.y, item, ring, trip, cancelled: false };
    this.lying.push(lying);
    item.setPosition(to.x, to.y).setAngle(lyingAngle).setScale(base).setDepth(F.depth.lying);
    this.dust.explode(F.dust.count, to.x, to.y);
    if (!trip.returned) this.src.say(to.x, to.y + P.word.offsetY, pick(PETARD_WORDS), P.word.color, P.word.size);
    const landed: FanLandedPayload = { x: to.x, y: to.y, bad: true };
    bus.emit(Events.FanLanded, landed);

    // Squash, then one small hop, then the fuse.
    scene.tweens.add({
      targets: item,
      scaleX: base * P.squash.x,
      scaleY: base * P.squash.y,
      duration: P.squash.ms,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        scene.tweens.add({
          targets: item,
          y: to.y - P.hop.heightPx,
          duration: P.hop.ms,
          ease: 'Quad.easeOut',
          yoyo: true,
          onComplete: () => this.burn(lying, to, base, lyingAngle),
        });
      },
    });
  }

  /** The fuse burns: sparks off its tip, the petard throbs faster and faster and flashes at the end, the ring grows and blinks red. Then it goes off. */
  private burn(lying: Lying, to: Point, base: number, angleDeg: number): void {
    const { item, ring } = lying;
    const P = F.petard;
    const R = P.ring;
    const ringBase = hoopScale(P.radius);
    const rad = Phaser.Math.DegToRad(angleDeg);
    const tipX = to.x + Math.sin(rad) * P.spark.tipPx; // the picture faces up at angle 0: the tip is `tipPx` along its length
    const tipY = to.y - Math.cos(rad) * P.spark.tipPx;
    let nextSparkAt = 0;
    let alarmed = false;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: P.fuseMs,
      ease: 'Linear',
      onUpdate: (tween) => {
        if (lying.cancelled) return; // knocked back: the picture is gone
        const u = tween.getValue() ?? 0;
        const elapsed = u * P.fuseMs;
        // The throb gets faster as the fuse gets shorter: the phase is the integral of the rate, so it never jumps.
        const phase = (elapsed / 1000) * (P.throb.slowHz + ((P.throb.fastHz - P.throb.slowHz) * u) / 2);
        item.setScale(base * (1 + P.throb.amount * Math.sin(phase * TAU)));
        if (u >= P.throb.flashFrom && Math.floor(elapsed / P.throb.flashMs) % 2 === 0) item.setTint(P.throb.flashTint);
        else item.clearTint();

        if (elapsed >= nextSparkAt) {
          nextSparkAt = elapsed + P.spark.everyMs;
          this.sparks.emitParticleAt(tipX, tipY, 1);
        }

        ring.setScale(ringBase * (R.startScale + (1 - R.startScale) * Math.min(1, u * 2)));
        if (!alarmed && u >= R.soonAt) {
          alarmed = true; // the last moments: the ring turns red
          ring.setTint(R.soonColor);
        }
        const blink = u >= R.soonAt && Math.floor(elapsed / R.blinkMs) % 2 === 0 ? 0.45 : 1;
        ring.setAlpha((0.4 + 0.6 * u) * blink * R.stroke);
      },
      onComplete: () => {
        if (lying.cancelled) return;
        this.forget(lying);
        item.destroy();
        ring.destroy();
        if (!this.over) this.explode(to, lying.trip);
      },
    });
  }

  /** Goes off: the usual blast event (it hurts Varu if he is inside, breaks barrels, shakes the screen) and every cat in the ring takes a hit. */
  private explode(at: Point, trip: PetardTrip): void {
    const P = F.petard;
    const blast: ExplosionPayload = { x: at.x, y: at.y, radius: P.radius, damage: P.damage, shockwave: true, fur: false };
    bus.emit(Events.Explosion, blast);
    for (const child of this.src.enemies.getChildren().slice()) {
      const enemy = child as Enemy;
      if (!enemy.active || !enemy.hittable) continue;
      const dist = Phaser.Math.Distance.Between(at.x, at.y, enemy.x, enemy.y) - enemy.hitRadius;
      if (dist <= P.radius) enemy.takeDamage(trip.returned ? F.swat.catDamage : P.catDamage, at.x, at.y, P.knockback);
    }
  }
}
