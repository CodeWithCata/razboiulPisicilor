/** @file The living arena: creates props, reacts to belt / projectiles / walking / bosses, hide-and-seek, destruction. */
import Phaser from 'phaser';
import { ARENA, ARENA_RULES } from '../../config/arena';
import { BED_CAGE, BUSH_REGROW, HIDEOUT, KICKABLE, KICK_HIT, PROP_AMBIENT, PROP_HP, PROP_LOOK, PROP_TUNING, SMASH, type AmbientAction, type KickKind, type PropKind } from '../../config/props';
import type { ArenaQuery } from '../../core/arena';
import { gameClock } from '../../core/clock';
import {
  bus,
  Events,
  listen,
  type BeltFlightPayload,
  type BeltSweepPayload,
  type BallLandedPayload,
  type CrowImpactPayload,
  type ExplosionPayload,
  type PointPayload,
  type PropAmbientPayload,
  type PropCrackedPayload,
  type PropThinnedPayload,
  type PropDestroyedPayload,
  type ProjectileSmashPayload,
  type PropHitPayload,
} from '../../core/events';
import { nearestOnBox, segmentTouchesBox, sweepTouchesBox, type Box } from '../../core/reach';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { ArenaMap } from '../../world/ArenaMap';
import { BedCageSystem } from './BedCageSystem';
import { Fences } from './Fences';
import { Kickable, type KickHost } from './Kickable';
import { Prop } from './Prop';
import { hyp } from '../../core/hyp';
import { snapshotInto } from '../../core/snapshot';

const T = ARENA.tile;

/** Something on screen that can do a little thing by itself (see PROP_AMBIENT). */
interface AmbientSpot {
  kind: PropKind;
  action: AmbientAction;
  weight: number;
  x: number;
  y: number;
  prop: Prop | null;
}

/**
 * The living arena. It owns the props (bushes, rocks, boxes, scratchers, beds), the fences and the kickable cans and ball,
 * works out what touched what, and tells the world with `PropHit` events (PropFx draws the show, AudioSystem plays the sound).
 *
 * What touches props:
 *   the belt: a swing or spin (the same angle test the cats get), and the thrown belt flying through
 *   Varu and the cats walking into them (and over the cans and the ball), flying cats brushing past
 *   projectiles that end on a wall, kicked balls that hit one
 *   blasts: explosions and crow landings, a shock wave that travels outward
 * It does nothing when `ArenaMap.props` is null (the old still arena).
 */
export class PropSystem implements KickHost {
  private readonly props: Prop[] = [];
  /** Reused copies of the prop list for the belt and smash handlers (see `snapshotInto`). One list per handler: a nested call never clears another's. */
  private readonly sweepScratch: Prop[] = [];
  private readonly flightScratch: Prop[] = [];
  private readonly smashScratch: Prop[] = [];
  private readonly kickables: Kickable[] = [];
  private readonly propAt = new Map<number, Prop>();
  private fences: Fences | null = null;
  private readonly cages: BedCageSystem;
  private readonly fenceSweep = new Map<number, number>();
  private readonly off: Array<() => void> = [];
  private readonly grid: ArenaQuery;
  private readonly cols = ARENA.cols;
  private active = false;
  private sweepSerial = 0;
  private nextAmbientAt = 0;
  private nextGustAt = 0;
  /** Hideouts with a cat about to jump out, and when the next cat may hide. */
  private readonly busy = new Set<Prop>();
  private nextHideAt = 0;
  /** Cans and balls smashed by cats, waiting to come back where they lay. */
  private readonly kickRespawn: Array<{ kind: KickKind; tile: number; x: number; y: number; at: number }> = [];
  /** Smashed bushes waiting to grow back: their top-left tile and when (game ms). */
  private readonly regrowing: Array<{ col: number; row: number; at: number }> = [];
  /** The part of the world on screen (plus a margin), refreshed every frame. */
  private viewLeft = 0;
  private viewRight = 0;
  private viewTop = 0;
  private viewBottom = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly arena: ArenaMap,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
  ) {
    this.grid = arena.grid;
    this.cages = new BedCageSystem(scene);
    const layout = arena.props;
    if (!layout || !arena.fenceLayer) return;
    this.active = true;

    for (const o of layout.objects) {
      const prop = new Prop(scene, o.name, o.col, o.row, (p, stage) => this.cracked(p, stage));
      this.props.push(prop);
      if (BED_CAGE.enabled && BED_CAGE.kinds.includes(o.name)) this.cages.add(prop, gameClock.now);
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) this.propAt.set((o.row + dr) * this.cols + o.col + dc, prop);
      }
    }
    for (const d of layout.decor) {
      this.kickables.push(new Kickable(scene, d.kind, d.tile, (d.col + 0.5) * T, (d.row + 0.5) * T, this.grid, this));
    }
    this.fences = new Fences(scene, arena.fenceLayer, layout.fences, this.cols);

    const now = gameClock.now;
    this.nextAmbientAt = now + this.ambientDelay();
    this.nextGustAt = now + Phaser.Math.Between(PROP_AMBIENT.gust.everyMs.min, PROP_AMBIENT.gust.everyMs.max);

    this.off.push(
      listen(Events.BeltSwing, () => (this.sweepSerial += 1)),
      listen(Events.BeltSpin, () => (this.sweepSerial += 1)),
      listen<BeltSweepPayload>(Events.BeltSweep, (p) => this.onSweep(p)),
      listen<BeltFlightPayload>(Events.BeltFlight, (p) => this.onFlight(p)),
      listen<PointPayload>(Events.ProjectileBlocked, ({ x, y }) => this.onProjectileWall(x, y)),
      listen<ProjectileSmashPayload>(Events.ProjectileSmash, (p) => this.onProjectileSmash(p)),
      listen<ExplosionPayload>(Events.Explosion, ({ x, y, radius, fromBoss }) => {
        this.shock(x, y, radius, PROP_TUNING.shock.explosion);
        if (fromBoss) this.bossBlast(x, y, radius);
      }),
      listen<BallLandedPayload>(Events.BallLanded, ({ x, y, radius }) => this.shock(x, y, radius, PROP_TUNING.shock.ball)),
      listen<CrowImpactPayload>(Events.CrowImpact, ({ x, y, radius, variant }) => this.shock(x, y, radius, PROP_TUNING.shock.crow[variant])),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  update(now: number, delta: number): void {
    if (!this.active) return;
    const dt = Math.min(delta, PROP_TUNING.maxFrameMs) / 1000;
    const view = this.scene.cameras.main.worldView;
    const m = PROP_TUNING.viewMargin;
    this.viewLeft = view.x - m;
    this.viewRight = view.right + m;
    this.viewTop = view.y - m;
    this.viewBottom = view.bottom + m;

    this.regrowBushes(now);
    this.cages.update(now, dt, this.enemies); // before the physics stops a flung cat dead against the bed
    this.touchByActors(now);
    for (const prop of this.props) prop.update(dt, now, this.onScreen(prop.cx, prop.cy));
    for (const kick of this.kickables) kick.update(dt);
    this.kickablesVsCats(now);
    this.respawnKickables(now);
    this.fences?.update(dt);
    this.ambient(now);
  }

  // ---- bed cages (dev cheats, see BedCageSystem) ----

  /** Dev: lock a cat in the ready bed nearest to (x, y). False when no bed is ready. */
  debugCageCat(x: number, y: number, spawn: () => Enemy): boolean {
    return this.cages.debugCage(x, y, this.enemies, spawn);
  }

  /** Dev: let every caged cat out. Returns how many. */
  debugFreeCats(): number {
    return this.cages.debugFree();
  }

  /** Dev: re-arm every resting bed. Returns how many. */
  debugRearmBeds(): number {
    return this.cages.debugRearmAll();
  }

  // ---- hide and seek ----

  /**
   * Maybe hide the next cat in a bush or box (never a bed: beds catch cats, see BedCageSystem) near Varu (on screen, not too close, not too far). The hideout shakes as a warning,
   * then `reveal` gets the spot just outside it, on the side facing Varu. Returns false when the cat should spawn the normal way.
   * `force` (debug key R) always tries, ignoring the chance and the cooldown.
   */
  hideCat(radius: number, reveal: (x: number, y: number, dirX: number, dirY: number, kind: PropKind) => void, force = false): boolean {
    const now = gameClock.now;
    if (!this.active || !HIDEOUT.enabled) return false;
    if (!force && (now < this.nextHideAt || Math.random() >= HIDEOUT.chance)) return false; // the debug key (force) skips the chance and the cooldown

    const { minSpawnDistanceFromPlayer: min, maxSpawnDistanceFromPlayer: max } = ARENA_RULES;
    const spots = this.props.filter((p) => {
      if (!HIDEOUT.kinds.includes(p.kind) || BED_CAGE.kinds.includes(p.kind) || this.busy.has(p) || !this.onScreen(p.cx, p.cy)) return false;
      const dist = hyp(p.cx - this.player.x, p.cy - this.player.y);
      return dist >= min && dist <= max;
    });
    if (spots.length === 0) return false;

    const prop = Phaser.Utils.Array.GetRandom(spots);
    this.busy.add(prop);
    this.nextHideAt = now + HIDEOUT.telegraphMs + HIDEOUT.cooldownMs;

    // The warning: the hideout shakes, a few pulses, so you can see where the cat will come out.
    const pulses = Math.floor(HIDEOUT.telegraphMs / HIDEOUT.pulseMs);
    for (let i = 0; i < pulses; i++) {
      this.scene.time.delayedCall(i * HIDEOUT.pulseMs, () => {
        const angle = Math.random() * Math.PI * 2;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        prop.hit(dirX, dirY, HIDEOUT.pulsePower);
        this.emitHit(prop.kind, prop.cx, prop.box.y + prop.box.h * 0.3, dirX, dirY, HIDEOUT.pulsePower, true);
        const ambient = PROP_LOOK[prop.kind].ambient;
        if (i === 0 && ambient) {
          const payload: PropAmbientPayload = { x: prop.cx, y: prop.box.y + prop.box.h * 0.25, kind: prop.kind, action: ambient.action, ...(prop.kind === 'bush' ? { variant: prop.variant } : {}) };
          bus.emit(Events.PropAmbient, payload);
        }
      });
    }

    // The jump: a big shove and a burst, then the cat steps out facing Varu.
    this.scene.time.delayedCall(HIDEOUT.telegraphMs, () => {
      this.busy.delete(prop);
      const len = hyp(this.player.x - prop.cx, this.player.y - prop.cy) || 1;
      const dirX = (this.player.x - prop.cx) / len;
      const dirY = (this.player.y - prop.cy) / len;
      prop.hit(-dirX, -dirY, 1);
      this.emitHit(prop.kind, prop.cx, prop.cy, dirX, dirY, 1, false);
      const out = T + radius + HIDEOUT.exitGap; // from the center of the 2x2 object to just past its edge
      if (prop.kind === 'bush') {
        // a second puff of leaves as the cat bursts out
        for (let i = 0; i < HIDEOUT.exit.leaves; i++) {
          const leaves: PropAmbientPayload = { x: prop.cx + dirX * T * 0.6, y: prop.box.y + prop.box.h * 0.3, kind: 'bush', action: 'leaf', variant: prop.variant };
          bus.emit(Events.PropAmbient, leaves);
        }
      }
      reveal(prop.cx + dirX * out, prop.cy + dirY * out, dirX, dirY, prop.kind);
    });
    return true;
  }

  /** A rock got a new crack, or a bush got thinner (it has its own event: leaves, not chips). */
  private cracked(prop: Prop, stage: number): void {
    if (prop.kind === 'bush') {
      const thinned: PropThinnedPayload = { x: prop.cx, y: prop.cy - 6, stage, variant: prop.variant };
      bus.emit(Events.PropThinned, thinned);
      return;
    }
    const payload: PropCrackedPayload = { x: prop.cx, y: prop.cy - 6, stage };
    bus.emit(Events.PropCracked, payload);
  }

  // ---- KickHost: what the cans and the ball tell us ----

  landed(kick: Kickable, power: number): void {
    this.emitHit(kick.kind, kick.x, kick.y, 0, -1, power, true);
  }

  hitWall(kick: Kickable, dirX: number, dirY: number, speed: number): void {
    const now = gameClock.now;
    if (speed < KICKABLE.wallMinSpeed || now < kick.readyAt) return;
    kick.readyAt = now + PROP_TUNING.hitCooldownMs;
    const power = Math.min(1, speed / KICKABLE.shock);
    const reach = kick.radius + 3;
    // Whatever it ran into (a bush, a fence piece) feels it; the can or ball itself makes its sound too.
    this.hitCellAt(kick.x + dirX * reach, kick.y + dirY * reach, -dirX, -dirY, power * 0.8, now);
    this.emitHit(kick.kind, kick.x, kick.y, -dirX, -dirY, power, true);
  }

  // ---- the belt ----

  private onSweep(p: BeltSweepPayload): void {
    const key = this.sweepSerial * 16 + (p.lap % 16);
    const power = p.spin ? PROP_TUNING.sweep.spin : PROP_TUNING.sweep.swing;
    const reach = p.range + PROP_TUNING.reachSlack;
    const reachSq = (reach + T * 1.5) ** 2;

    const swept = snapshotInto(this.props, this.sweepScratch);
    for (let i = 0; i < swept.length; i++) {
      const prop = swept[i]!;
      if (prop.hitKey === key) continue;
      if ((prop.cx - p.x) ** 2 + (prop.cy - p.y) ** 2 > reachSq) continue;
      if (!sweepTouchesBox(p.x, p.y, prop.box, reach, p.startAngle, p.swept)) continue;
      prop.hitKey = key;
      this.hitFrom(prop, p.x, p.y, prop.box, power, (p.spin ? SMASH.player.spin : SMASH.player.swing) * this.player.damageMultiplier);
    }
    this.sweepScratch.length = 0;

    for (const kick of this.kickables) {
      if (kick.sweepKey === key) continue;
      const box = this.kickBox(kick);
      if (!sweepTouchesBox(p.x, p.y, box, reach, p.startAngle, p.swept)) continue;
      kick.sweepKey = key;
      this.kickFrom(kick, p.x, p.y, p.spin ? KICKABLE.belt.spin : KICKABLE.belt.swing, power);
    }

    const fences = this.fences;
    if (!fences) return;
    const c0 = Math.floor((p.x - reach) / T);
    const c1 = Math.floor((p.x + reach) / T);
    const r0 = Math.floor((p.y - reach) / T);
    const r1 = Math.floor((p.y + reach) / T);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!fences.has(col, row)) continue;
        const cell = row * this.cols + col;
        if (this.fenceSweep.get(cell) === key) continue;
        const box: Box = { x: col * T, y: row * T, w: T, h: T };
        if (!sweepTouchesBox(p.x, p.y, box, reach, p.startAngle, p.swept)) continue;
        this.fenceSweep.set(cell, key);
        this.hitFenceFrom(col, row, p.x, p.y, power);
      }
    }
  }

  private onFlight(p: BeltFlightPayload): void {
    const now = gameClock.now;
    const { power, cooldownMs } = PROP_TUNING.flight;

    const flown = snapshotInto(this.props, this.flightScratch);
    for (let i = 0; i < flown.length; i++) {
      const prop = flown[i]!;
      if (now < prop.readyAt || !segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, prop.box, p.radius)) continue;
      prop.readyAt = now + cooldownMs;
      this.hitFrom(prop, p.prevX, p.prevY, prop.box, power, SMASH.player.flight * this.player.damageMultiplier);
    }
    this.flightScratch.length = 0;
    for (const kick of this.kickables) {
      if (now < kick.readyAt || !segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, this.kickBox(kick), p.radius)) continue;
      kick.readyAt = now + cooldownMs;
      this.kickFrom(kick, p.prevX, p.prevY, KICKABLE.belt.flight, power);
    }

    const fences = this.fences;
    if (!fences) return;
    const reach = p.radius + T;
    const c0 = Math.floor((Math.min(p.x, p.prevX) - reach) / T);
    const c1 = Math.floor((Math.max(p.x, p.prevX) + reach) / T);
    const r0 = Math.floor((Math.min(p.y, p.prevY) - reach) / T);
    const r1 = Math.floor((Math.max(p.y, p.prevY) + reach) / T);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!fences.has(col, row)) continue;
        const box: Box = { x: col * T, y: row * T, w: T, h: T };
        if (segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, box, p.radius)) this.hitFenceFrom(col, row, p.prevX, p.prevY, power);
      }
    }
  }

  // ---- blasts and projectiles ----

  /** A shock wave from (x, y): everything within reach is shoved away, the far ones a moment later. */
  private shock(x: number, y: number, radius: number, strength: number): void {
    if (!Number.isFinite(radius) || !Number.isFinite(strength) || radius <= 0) return; // a blast with no real size would make NaN powers (and a NaN sound volume)
    const reach = radius * PROP_TUNING.shock.reachFactor;
    const speed = PROP_TUNING.shock.speed;

    const wave = (box: Box, apply: (dirX: number, dirY: number, power: number, at: PointPayload) => void): void => {
      const near = nearestOnBox(x, y, box);
      const dist = hyp(near.x - x, near.y - y);
      if (dist > reach) return;
      const power = strength * (1 - dist / reach);
      if (!(power >= PROP_TUNING.minPower)) return; // also catches NaN
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const len = hyp(cx - x, cy - y) || 1;
      const dirX = (cx - x) / len;
      const dirY = (cy - y) / len;
      this.scene.time.delayedCall((dist / speed) * 1000, () => apply(dirX, dirY, power, near));
    };

    for (const prop of this.props) {
      wave(prop.box, (dirX, dirY, power, at) => {
        if (prop.dead) return; // smashed while the wave was still on its way
        prop.hit(dirX, dirY, power);
        this.emitHit(prop.kind, at.x, at.y, dirX, dirY, power, false);
      });
    }
    for (const kick of this.kickables) {
      wave(this.kickBox(kick), (dirX, dirY, power) => {
        kick.kick(dirX, dirY, KICKABLE.shock * power, KICKABLE[kick.kind].pop);
        this.emitHit(kick.kind, kick.x, kick.y, dirX, dirY, power, false);
      });
    }

    const fences = this.fences;
    if (!fences) return;
    const c0 = Math.floor((x - reach) / T);
    const c1 = Math.floor((x + reach) / T);
    const r0 = Math.floor((y - reach) / T);
    const r1 = Math.floor((y + reach) / T);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!fences.has(col, row)) continue;
        wave({ x: col * T, y: row * T, w: T, h: T }, (dirX, dirY, power, at) => {
          if (fences.hit(col, row, dirX, dirY, power)) this.emitHit('fence', at.x, at.y, dirX, dirY, power, false);
        });
      }
    }
  }

  /**
   * v171: a smashing ball (Federer's ball machine) flies through props. Every prop on its way, nearest first, takes the ball's damage as a
   * boss hit: what breaks lets the ball fly on, the first one that survives stops it. Fences never break (PROP_HP), they end the ball as before.
   */
  private onProjectileSmash(p: ProjectileSmashPayload): void {
    if (!this.active) return;
    const len = hyp(p.x - p.prevX, p.y - p.prevY) || 1;
    const dirX = (p.x - p.prevX) / len;
    const dirY = (p.y - p.prevY) / len;
    // The props on the ball's way, nearest first. Built in a reused list; the sort is a plain insertion sort (no closure, stable).
    const touched = this.smashScratch;
    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i]!;
      if (segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, prop.box, p.radius)) touched.push(prop);
    }
    for (let k = 1; k < touched.length; k++) {
      const cur = touched[k]!;
      const curDist = hyp(cur.cx - p.prevX, cur.cy - p.prevY);
      let j = k;
      while (j > 0 && hyp(touched[j - 1]!.cx - p.prevX, touched[j - 1]!.cy - p.prevY) > curDist) {
        touched[j] = touched[j - 1]!;
        j--;
      }
      touched[j] = cur;
    }
    for (let k = 0; k < touched.length; k++) {
      const prop = touched[k]!;
      this.smash(prop, p.damage, dirX, dirY, true);
      if (this.props.includes(prop)) {
        p.absorbed = true; // it is still standing: the ball stops here
        break;
      }
    }
    touched.length = 0;
  }

  /** A yarn or a broken heart ended on a wall: whatever stands there feels the knock. */
  private onProjectileWall(x: number, y: number): void {
    const now = gameClock.now;
    const col = Math.floor(x / T);
    const row = Math.floor(y / T);
    const prop = this.propAt.get(row * this.cols + col);
    // The shove points from the hit toward the middle of the thing that was hit.
    const cx = prop ? prop.cx : (col + 0.5) * T;
    const cy = prop ? prop.cy : (row + 0.5) * T;
    const len = hyp(cx - x, cy - y) || 1;
    this.hitCellAt(x, y, (cx - x) / len, (cy - y) / len, 0.7, now);
  }

  // ---- walking ----

  /** Varu and the cats against props: bumping into them, running over the cans and the ball. */
  private touchByActors(now: number): void {
    this.touchBy(this.player, false, now);
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (enemy.active) this.touchBy(enemy, enemy.flies, now);
    }
  }

  private touchBy(actor: Player | Enemy, flies: boolean, now: number): void {
    const body = actor.body as Phaser.Physics.Arcade.Body | null;
    if (!body || !body.enable) return;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const speed = hyp(vx, vy);
    const bump = PROP_TUNING.bump;

    if (speed < bump.minSpeed) return;
    const dirX = vx / speed;
    const dirY = vy / speed;
    if ((actor as Enemy).isBoss) this.bossRampage(actor, dirX, dirY, speed, now);

    if (flies) {
      // Flying cats pass over props: a light brush, and a few leaves if it is a bush.
      const prop = this.propAt.get(Math.floor(actor.y / T) * this.cols + Math.floor(actor.x / T));
      if (prop && now >= prop.readyAt) {
        prop.readyAt = now + bump.flyerCooldownMs;
        prop.hit(dirX, dirY, bump.flyerPower);
        this.emitHit(prop.kind, actor.x, actor.y, dirX, dirY, bump.flyerPower, true);
      }
      return;
    }

    // Walking: look a little ahead of the body, the way it is going.
    const reach = actor.hitRadius + bump.probe;
    const power = Phaser.Math.Clamp(speed / bump.fullSpeed, 0.15, 1) * bump.power;
    this.hitCellAt(actor.x + dirX * reach, actor.y + dirY * reach, dirX, dirY, power, now);
  }

  /** A boss charging or dashing smashes what is in its way. */
  private bossRampage(actor: Player | Enemy, dirX: number, dirY: number, speed: number, now: number): void {
    const boss = SMASH.boss;
    if (speed < boss.minSpeed) return;
    const ahead = actor.hitRadius + Math.max(PROP_TUNING.bump.probe, speed * boss.lookAheadSec);
    const side = actor.hitRadius * 0.6;
    for (const offset of [-side, 0, side]) {
      // Three probes across the boss's width (a boss is wider than a prop tile), a little ahead of its body.
      const px = actor.x + dirX * ahead - dirY * offset;
      const py = actor.y + dirY * ahead + dirX * offset;
      const prop = this.propAt.get(Math.floor(py / T) * this.cols + Math.floor(px / T));
      if (!prop || prop.dead || now < prop.smashReadyAt) continue;
      prop.smashReadyAt = now + boss.cooldownMs;
      this.smash(prop, boss.contact, dirX, dirY, true);
    }
  }

  /** A boss blast (slam, serve, swing) damages every prop inside it, the far ones a moment later (as the shock wave arrives). */
  private bossBlast(x: number, y: number, radius: number): void {
    for (const prop of this.props.slice()) {
      const near = nearestOnBox(x, y, prop.box);
      const dist = hyp(near.x - x, near.y - y);
      if (dist > radius) continue;
      const len = hyp(prop.cx - x, prop.cy - y) || 1;
      const dirX = (prop.cx - x) / len;
      const dirY = (prop.cy - y) / len;
      const amount = SMASH.boss.blast * (1 - 0.5 * (dist / radius));
      this.scene.time.delayedCall((dist / PROP_TUNING.shock.speed) * 1000, () => this.smash(prop, amount, dirX, dirY, true));
    }
  }

  /** Damage a prop. Only what the kind allows (PROP_HP): a bush breaks to Varu, everything breaks to bosses, fences never. */
  private smash(prop: Prop, amount: number, dirX: number, dirY: number, byBoss: boolean): void {
    if (prop.dead) return;
    const rule = PROP_HP[prop.kind];
    if (!(byBoss ? rule.byBoss : rule.byPlayer)) return;
    if (byBoss) {
      prop.hit(dirX, dirY, 1);
      this.emitHit(prop.kind, prop.cx, prop.cy, dirX, dirY, 1, false);
    }
    if (prop.damage(amount)) this.destroyProp(prop, dirX, byBoss);
  }

  /** The prop is gone for good: its tiles stop being solid (cats and Varu can walk through) and path finding is told. */
  private destroyProp(prop: Prop, dirX: number, byBoss: boolean): void {
    const index = this.props.indexOf(prop);
    if (index >= 0) this.props.splice(index, 1);
    const col = Math.round(prop.box.x / T);
    const row = Math.round(prop.box.y / T);
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) this.propAt.delete((row + dr) * this.cols + col + dc);
    }
    this.cages.destroyed(prop); // a caged cat is let out
    this.arena.removeObject(col, row);
    prop.breakAway(dirX);
    if (prop.kind === 'bush') {
      this.regrowing.push({ col, row, at: gameClock.now + Phaser.Math.Between(BUSH_REGROW.delayMs.min, BUSH_REGROW.delayMs.max) });
    }
    const payload: PropDestroyedPayload = { x: prop.cx, y: prop.cy, kind: prop.kind, byBoss, ...(prop.kind === 'bush' ? { variant: prop.variant } : {}) };
    bus.emit(Events.PropDestroyed, payload);
  }

  // ---- regrowing ----

  /** Smashed bushes come back on their spot once their time is up and nobody stands there. */
  private regrowBushes(now: number): void {
    for (let i = this.regrowing.length - 1; i >= 0; i--) {
      const spot = this.regrowing[i]!;
      if (now < spot.at) continue;
      if (this.spotOccupied(spot.col, spot.row)) {
        spot.at = now + BUSH_REGROW.retryMs;
        continue;
      }
      this.regrowing.splice(i, 1);
      this.growBush(spot.col, spot.row);
    }
  }

  /** True if Varu or a walking cat is on (or right next to) the 2x2 spot. */
  private spotOccupied(col: number, row: number): boolean {
    const pad = BUSH_REGROW.clearPx;
    const box: Box = { x: col * T - pad, y: row * T - pad, w: T * 2 + pad * 2, h: T * 2 + pad * 2 };
    const touches = (actor: Player | Enemy): boolean => {
      const nx = Phaser.Math.Clamp(actor.x, box.x, box.x + box.w);
      const ny = Phaser.Math.Clamp(actor.y, box.y, box.y + box.h);
      return Phaser.Math.Distance.Between(actor.x, actor.y, nx, ny) <= actor.hitRadius;
    };
    if (touches(this.player)) return true;
    return this.enemies.getChildren().some((child) => {
      const cat = child as Enemy;
      return cat.active && !cat.flies && touches(cat);
    });
  }

  private growBush(col: number, row: number): void {
    this.arena.addObject('bush', col, row);
    const prop = new Prop(this.scene, 'bush', col, row, (p, stage) => this.cracked(p, stage));
    this.props.push(prop);
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) this.propAt.set((row + dr) * this.cols + col + dc, prop);
    }
    prop.growIn(BUSH_REGROW.growMs);
    const payload: PropAmbientPayload = { x: prop.cx, y: prop.box.y + prop.box.h * 0.3, kind: 'bush', action: 'leaf', variant: prop.variant };
    bus.emit(Events.PropAmbient, payload);
  }

  /**
   * Cans and balls against the cats (no foot kicks: only the belt, blasts and thrown things move them).
   * A can or ball that flies fast hurts and shoves the cat it hits, then bounces back. A cat that walks into one lying still smashes it.
   */
  private kickablesVsCats(now: number): void {
    if (this.kickables.length === 0) return;
    for (const child of this.enemies.getChildren()) {
      const cat = child as Enemy;
      if (!cat.active || cat.flies) continue;
      for (const kick of this.kickables.slice()) {
        const reach = cat.hitRadius + kick.radius;
        if ((kick.x - cat.x) ** 2 + (kick.y - cat.y) ** 2 > reach * reach) continue;
        if (kick.speed >= KICK_HIT.minSpeed) {
          if (kick.height > KICK_HIT.maxHeightPx || !cat.alive || !cat.hittable) continue;
          const len = hyp(kick.x - cat.x, kick.y - cat.y) || 1;
          const dirX = (kick.x - cat.x) / len;
          const dirY = (kick.y - cat.y) / len;
          if (cat.takeBump(KICK_HIT.damage[kick.kind], kick.x, kick.y, KICK_HIT.knockback, KICK_HIT.gapMs)) {
            this.emitHit(kick.kind, kick.x, kick.y, dirX, dirY, 0.8, false);
            kick.rebound(dirX, dirY, KICK_HIT.rebound);
          }
        } else if (KICK_HIT.catsSmash && cat.alive) {
          this.smashKickable(kick, now);
        }
      }
    }
  }

  /** A cat smashed a can pile or ball lying still: a loud hit, it is gone, and it comes back home later. */
  private smashKickable(kick: Kickable, now: number): void {
    const i = this.kickables.indexOf(kick);
    if (i < 0) return;
    this.kickables.splice(i, 1);
    this.emitHit(kick.kind, kick.x, kick.y, 0, -1, 1, false);
    this.kickRespawn.push({ kind: kick.kind, tile: kick.tile, x: kick.homeX, y: kick.homeY, at: now + Phaser.Math.Between(KICK_HIT.respawnMs.min, KICK_HIT.respawnMs.max) });
    kick.destroy();
  }

  /** Smashed cans and balls return to where they lay (never under Varu or a cat). */
  private respawnKickables(now: number): void {
    for (let i = this.kickRespawn.length - 1; i >= 0; i--) {
      const r = this.kickRespawn[i]!;
      if (now < r.at) continue;
      const radius = KICKABLE[r.kind].radius;
      const taken = [this.player, ...this.enemies.getChildren().map((c) => c as Enemy)].some(
        (a) => a.active && Phaser.Math.Distance.Between(a.x, a.y, r.x, r.y) < a.hitRadius + radius + 6,
      );
      if (taken) {
        r.at = now + BUSH_REGROW.retryMs;
        continue;
      }
      this.kickRespawn.splice(i, 1);
      const kick = new Kickable(this.scene, r.kind, r.tile, r.x, r.y, this.grid, this);
      kick.appear(KICK_HIT.popMs);
      this.kickables.push(kick);
    }
  }

  // ---- by themselves ----

  private ambient(now: number): void {
    if (now >= this.nextGustAt) {
      this.nextGustAt = now + Phaser.Math.Between(PROP_AMBIENT.gust.everyMs.min, PROP_AMBIENT.gust.everyMs.max);
      this.gust();
    }
    if (now < this.nextAmbientAt) return;
    this.nextAmbientAt = now + this.ambientDelay();

    const spots: AmbientSpot[] = [];
    for (const prop of this.props) {
      const look = PROP_LOOK[prop.kind].ambient;
      if (!look || !this.onScreen(prop.cx, prop.cy)) continue;
      const b = prop.box;
      spots.push({
        kind: prop.kind, action: look.action, weight: look.weight, prop,
        // Twinkles sit on the upper left of a rock, everything else rises from the top of it.
        x: look.action === 'glint' ? b.x + b.w * Phaser.Math.FloatBetween(0.25, 0.6) : prop.cx,
        y: look.action === 'glint' ? b.y + b.h * Phaser.Math.FloatBetween(0.2, 0.5) : b.y + b.h * 0.25,
      });
    }
    for (const kick of this.kickables) {
      const look = PROP_LOOK[kick.kind].ambient;
      if (!look || !this.onScreen(kick.x, kick.y)) continue;
      spots.push({ kind: kick.kind, action: look.action, weight: look.weight, prop: null, x: kick.x + Phaser.Math.Between(-8, 8), y: kick.y + Phaser.Math.Between(-8, 2) });
    }
    if (spots.length === 0) return;

    let roll = Math.random() * spots.reduce((sum, s) => sum + s.weight, 0);
    const chosen = spots.find((s) => (roll -= s.weight) <= 0) ?? spots[0]!;
    if (chosen.action === 'purr') chosen.prop?.hit(0, 0, PROP_AMBIENT.purr.wiggle); // the cat inside moved
    const payload: PropAmbientPayload = { x: chosen.x, y: chosen.y, kind: chosen.kind, action: chosen.action, ...(chosen.kind === 'bush' ? { variant: this.bushVariantAt(chosen.x, chosen.y) } : {}) };
    bus.emit(Events.PropAmbient, payload);
  }

  /** A gust of wind: the bushes on screen lean one after the other, from the left edge of the screen to the right. */
  private gust(): void {
    const cfg = PROP_AMBIENT.gust;
    let leaves = cfg.leaves;
    for (const prop of this.props) {
      if (prop.kind !== 'bush' || !this.onScreen(prop.cx, prop.cy)) continue;
      const delay = Math.max(0, prop.cx - this.viewLeft) * cfg.msPerPx;
      this.scene.time.delayedCall(delay, () => {
        if (!prop.sprite.active) return;
        prop.gust(cfg.power);
        if (leaves > 0 && Math.random() < 0.5) {
          leaves -= 1;
          const payload: PropAmbientPayload = { x: prop.cx, y: prop.box.y + prop.box.h * 0.3, kind: 'bush', action: 'leaf', variant: prop.variant };
          bus.emit(Events.PropAmbient, payload);
        }
      });
    }
  }

  private ambientDelay(): number {
    return Phaser.Math.Between(PROP_AMBIENT.everyMs.min, PROP_AMBIENT.everyMs.max);
  }

  // ---- shared helpers ----

  /** Hit whatever prop or fence piece stands on the tile at (x, y). Returns true if there was one. */
  private hitCellAt(x: number, y: number, dirX: number, dirY: number, power: number, now: number): boolean {
    const col = Math.floor(x / T);
    const row = Math.floor(y / T);
    const prop = this.propAt.get(row * this.cols + col);
    if (prop) {
      if (now >= prop.readyAt && power >= PROP_TUNING.minPower) {
        prop.readyAt = now + PROP_TUNING.hitCooldownMs;
        prop.hit(dirX, dirY, power);
        this.emitHit(prop.kind, x, y, dirX, dirY, power, power < PROP_TUNING.words.minPower);
      }
      return true;
    }
    if (this.fences?.has(col, row)) {
      if (power >= PROP_TUNING.minPower && this.fences.hit(col, row, dirX, dirY, power)) {
        this.emitHit('fence', x, y, dirX, dirY, power, power < PROP_TUNING.words.minPower);
      }
      return true;
    }
    return false;
  }

  /** The belt (or its flight) hit a prop: the shove points away from where the belt is, the bits fly from the closest edge. */
  private hitFrom(prop: Prop, fromX: number, fromY: number, box: Box, power: number, damage = 0): void {
    const near = nearestOnBox(fromX, fromY, box);
    const len = hyp(prop.cx - fromX, prop.cy - fromY) || 1;
    const dirX = (prop.cx - fromX) / len;
    const dirY = (prop.cy - fromY) / len;
    prop.hit(dirX, dirY, power);
    this.emitHit(prop.kind, near.x, near.y, dirX, dirY, power, false);
    if (damage > 0) this.smash(prop, damage, dirX, dirY, false);
  }

  private hitFenceFrom(col: number, row: number, fromX: number, fromY: number, power: number): void {
    const box: Box = { x: col * T, y: row * T, w: T, h: T };
    const near = nearestOnBox(fromX, fromY, box);
    const cx = box.x + T / 2;
    const cy = box.y + T / 2;
    const len = hyp(cx - fromX, cy - fromY) || 1;
    const dirX = (cx - fromX) / len;
    const dirY = (cy - fromY) / len;
    if (this.fences?.hit(col, row, dirX, dirY, power)) this.emitHit('fence', near.x, near.y, dirX, dirY, power, false);
  }

  /** The belt kicks a can pile or the ball away from where the belt is. */
  private kickFrom(kick: Kickable, fromX: number, fromY: number, speed: number, power: number): void {
    const len = hyp(kick.x - fromX, kick.y - fromY) || 1;
    const dirX = (kick.x - fromX) / len;
    const dirY = (kick.y - fromY) / len;
    kick.kick(dirX, dirY, speed * power, KICKABLE[kick.kind].pop);
    this.emitHit(kick.kind, kick.x, kick.y, dirX, dirY, power, false);
  }

  private kickBox(kick: Kickable): Box {
    return { x: kick.x - kick.radius, y: kick.y - kick.radius, w: kick.radius * 2, h: kick.radius * 2 };
  }

  private onScreen(x: number, y: number): boolean {
    return x >= this.viewLeft && x <= this.viewRight && y >= this.viewTop && y <= this.viewBottom;
  }

  private emitHit(kind: PropKind, x: number, y: number, dirX: number, dirY: number, power: number, quiet: boolean): void {
    const payload: PropHitPayload = { x, y, kind, power, dirX, dirY, quiet, ...(kind === 'bush' ? { variant: this.bushVariantAt(x, y) } : {}) };
    bus.emit(Events.PropHit, payload);
  }

  /** The look of the bush a hit or a falling leaf belongs to: the one under the point, else the nearest one. */
  private bushVariantAt(x: number, y: number): number {
    const under = this.propAt.get(Math.floor(y / T) * this.cols + Math.floor(x / T));
    if (under?.kind === 'bush') return under.variant;
    let best = 0;
    let bestDist = Infinity;
    for (const prop of this.props) {
      if (prop.kind !== 'bush') continue;
      const d = hyp(prop.cx - x, prop.cy - y);
      if (d < bestDist) {
        bestDist = d;
        best = prop.variant;
      }
    }
    return best;
  }
}
