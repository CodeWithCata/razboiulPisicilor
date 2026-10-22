/** @file Bed cages: each bed is READY (pillow) -> OCCUPIED -> COOLDOWN -> READY; a flung cat is locked in, then escapes. */
import Phaser from 'phaser';
import { ARENA } from '../../config/arena';
import { ENEMIES } from '../../config/balance';
import { BED_CAGE, HIDEOUT, PROP_TUNING } from '../../config/props';
import { gameClock } from '../../core/clock';
import { bus, Events, listen, type BedRearmedPayload, type CatCagedPayload, type CatJailedPayload, type CatReleasedPayload, type PropHitPayload } from '../../core/events';
import { nearestOnBox } from '../../core/reach';
import type { Enemy } from '../../entities/Enemy';
import type { Prop } from './Prop';
import { hyp } from '../../core/hyp';

type BedState = 'ready' | 'occupied' | 'cooldown';

/** One bed's state machine. `nx/ny` = the side the cat came in from (it leaves that way). */
interface Bed {
  id: number;
  prop: Prop;
  state: BedState;
  cat: Enemy | null;
  until: number;
  shakes: number;
  hard: boolean;
  nx: number;
  ny: number;
}

/**
 * Beds never spawn cats (no hide and seek here): they catch them. A cat flung into a READY bed at `captureSpeed` or more is locked in
 * (hidden, frozen, harmless; it stays `active`, so the wave still waits for it). It gets out after `holdMs`, after `escapeShakes` hits
 * on the bed, or when the bed breaks. Then the bed rests without its pillow for `rearmCooldownMs` and traps nothing.
 * v170: a caged cat does not hold the wave (GameScene.waveCatCount skips it). If the wave ends while it is still inside, it is JAILED for good:
 * the cat is removed and `Events.CatJailed` gives Varu a bonus and maybe a pickup (`BED_CAGE.jail`).
 */
export class BedCageSystem {
  private readonly beds: Bed[] = [];

  constructor(scene: Phaser.Scene) {
    const off = [listen(Events.WaveCleared, () => this.jailAll()), listen(Events.Victory, () => this.jailAll())];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      this.clear();
    });
  }

  /** The wave is over: every cat still locked in a bed is taken away for good (it pays Varu), and the bed rests like after any release. */
  private jailAll(): void {
    const now = gameClock.now;
    for (const bed of this.beds) {
      const { cat, prop } = bed;
      if (bed.state !== 'occupied' || !cat || !cat.active) continue;
      const J = BED_CAGE.jail;
      const payload: CatJailedPayload = {
        x: prop.cx,
        y: prop.cy,
        type: cat.enemyType,
        points: Math.round(ENEMIES[cat.enemyType].score * J.scoreFactor),
        pickup: Math.random() < J.pickupChance,
        bedId: bed.id,
      };
      bed.state = 'cooldown';
      bed.cat = null;
      bed.until = now + BED_CAGE.rearmCooldownMs;
      cat.destroy(); // jailed, not killed: no kill, no EnemyKilled
      prop.hit(-bed.nx, -bed.ny, BED_CAGE.power.release);
      bus.emit(Events.CatJailed, payload);
    }
  }

  /** A bed from the map joins. It starts READY, or (startReady false) READY only if the map shows the pillow. */
  add(prop: Prop, now: number): void {
    const ready = BED_CAGE.startReady || prop.kind === BED_CAGE.readyKind;
    const bed: Bed = { id: this.beds.length, prop, state: ready ? 'ready' : 'cooldown', cat: null, until: ready ? 0 : now + BED_CAGE.rearmCooldownMs, shakes: 0, hard: false, nx: 0, ny: 1 };
    prop.setLook(ready ? BED_CAGE.readyKind : BED_CAGE.emptyKind);
    prop.onHit = (power) => this.shake(bed, power);
    this.beds.push(bed);
  }

  update(now: number, dt: number, enemies: Phaser.Physics.Arcade.Group): void {
    for (const bed of this.beds) {
      if (bed.state === 'occupied' && bed.cat && (!bed.cat.active || now >= bed.until)) this.release(bed, true);
      else if (bed.state === 'cooldown' && now >= bed.until) this.rearm(bed);
    }
    const ready = this.beds.filter((b) => b.state === 'ready' && !b.prop.dead);
    if (!BED_CAGE.enabled || ready.length === 0) return;
    for (const child of enemies.getChildren()) {
      const cat = child as Enemy;
      if (!cat.active || cat.flies || cat.popping || cat.caged || cat.isBonus) continue;
      const speed = cat.flungSpeed;
      if (speed < BED_CAGE.captureSpeed) continue;
      const body = cat.body as Phaser.Physics.Arcade.Body;
      const reach = cat.hitRadius + BED_CAGE.probe + speed * dt; // looks ahead: the physics would stop the cat dead on contact
      for (const bed of ready) {
        const near = nearestOnBox(cat.x, cat.y, bed.prop.box);
        let nx = cat.x - near.x;
        let ny = cat.y - near.y;
        const dist = hyp(nx, ny);
        if (dist > reach) continue;
        if (dist < 0.001) {
          nx = -body.velocity.x / speed;
          ny = -body.velocity.y / speed;
        } else {
          nx /= dist;
          ny /= dist;
        }
        if (body.velocity.x * nx + body.velocity.y * ny >= 0) continue; // only a cat heading into the bed
        this.trap(bed, cat, nx, ny, near.x, near.y);
        ready.splice(ready.indexOf(bed), 1);
        break;
      }
    }
  }

  /**
   * Dev cheat: locks a cat in the READY bed nearest to (x, y). The cat is the active one nearest to that bed (never a boss, a flier, a bonus cat or one
   * already caged), or a new one from `spawn` when there is none. It leaves toward (x, y). False when no bed is ready.
   */
  debugCage(x: number, y: number, enemies: Phaser.Physics.Arcade.Group, spawn: () => Enemy): boolean {
    let bed: Bed | null = null;
    let bestBed = Infinity;
    for (const b of this.beds) {
      if (b.state !== 'ready' || b.prop.dead) continue;
      const d = hyp(b.prop.cx - x, b.prop.cy - y);
      if (d < bestBed) {
        bestBed = d;
        bed = b;
      }
    }
    if (!bed) return false;
    let cat: Enemy | null = null;
    let bestCat = Infinity;
    for (const child of enemies.getChildren()) {
      const e = child as Enemy;
      if (!e.active || e.flies || e.popping || e.caged || e.isBonus || e.isBoss) continue;
      const d = hyp(e.x - bed.prop.cx, e.y - bed.prop.cy);
      if (d < bestCat) {
        bestCat = d;
        cat = e;
      }
    }
    cat ??= spawn();
    let nx = x - bed.prop.cx;
    let ny = y - bed.prop.cy;
    const len = hyp(nx, ny);
    if (len < 0.001) {
      nx = 0;
      ny = 1;
    } else {
      nx /= len;
      ny /= len;
    }
    const at = nearestOnBox(x, y, bed.prop.box);
    this.trap(bed, cat, nx, ny, at.x, at.y);
    return true;
  }

  /** Dev cheat: lets every caged cat out (as if it escaped). Returns how many. */
  debugFree(): number {
    let n = 0;
    for (const bed of this.beds) {
      if (bed.state !== 'occupied') continue;
      this.release(bed, true);
      n += 1;
    }
    return n;
  }

  /** Dev cheat: every resting bed gets its pillow back at once. Returns how many. A bed with a cat in it is left alone. */
  debugRearmAll(): number {
    let n = 0;
    for (const bed of this.beds) {
      if (bed.state !== 'cooldown' || bed.prop.dead) continue;
      this.rearm(bed);
      n += 1;
    }
    return n;
  }

  /** The bed broke: a caged cat is let out first (the bed's tiles are gone, it can walk away). */
  destroyed(prop: Prop): void {
    const bed = this.beds.find((b) => b.prop === prop);
    if (!bed) return;
    if (bed.state === 'occupied') this.release(bed, false);
    prop.onHit = null;
    this.beds.splice(this.beds.indexOf(bed), 1);
  }

  private trap(bed: Bed, cat: Enemy, nx: number, ny: number, hitX: number, hitY: number): void {
    const { prop } = bed;
    prop.hit(-nx, -ny, BED_CAGE.power.trap); // the bed squashes (state is still READY, so it does not count as a shake)
    const hit: PropHitPayload = { x: hitX, y: hitY, kind: prop.kind, power: BED_CAGE.power.trap, dirX: -nx, dirY: -ny, quiet: false };
    bus.emit(Events.PropHit, hit);
    Object.assign(bed, { state: 'occupied', cat, until: gameClock.now + BED_CAGE.holdMs, shakes: 0, hard: false, nx, ny });
    cat.cage(prop.cx, prop.cy);
    prop.setLook(BED_CAGE.emptyKind);
    const payload: CatCagedPayload = { x: prop.cx, y: prop.cy, cat, bedId: bed.id };
    bus.emit(Events.CatCaged, payload);
  }

  /** A hit on an occupied bed shakes the cat loose after `escapeShakes` of them. A hard one makes the escape a real fling. */
  private shake(bed: Bed, power: number): void {
    if (bed.state !== 'occupied' || BED_CAGE.escapeShakes <= 0 || power < PROP_TUNING.minPower) return;
    bed.shakes += 1;
    bed.hard = bed.hard || power >= PROP_TUNING.words.minPower;
    if (bed.shakes >= BED_CAGE.escapeShakes) this.release(bed, true);
  }

  private release(bed: Bed, escaped: boolean): void {
    const { prop, cat } = bed;
    const now = gameClock.now;
    bed.state = 'cooldown';
    bed.cat = null;
    bed.until = now + BED_CAGE.rearmCooldownMs;
    if (!cat) return;
    if (cat.active) {
      const out = ARENA.tile + cat.hitRadius + HIDEOUT.exitGap; // from the bed's center to just past its edge, on the side the cat came from
      cat.release(prop.cx + bed.nx * out, prop.cy + bed.ny * out, bed.nx, bed.ny, BED_CAGE.releaseFlingSpeed, bed.hard ? BED_CAGE.releaseFlingMs : 0);
    }
    prop.hit(-bed.nx, -bed.ny, BED_CAGE.power.release);
    const payload: CatReleasedPayload = { x: prop.cx, y: prop.cy, cat, bedId: bed.id, escaped };
    bus.emit(Events.CatReleased, payload);
  }

  private rearm(bed: Bed): void {
    bed.state = 'ready';
    bed.prop.setLook(BED_CAGE.readyKind);
    bed.prop.hit(0, -1, BED_CAGE.power.rearm);
    const payload: BedRearmedPayload = { x: bed.prop.cx, y: bed.prop.cy, bedId: bed.id };
    bus.emit(Events.BedRearmed, payload);
  }

  private clear(): void {
    for (const bed of this.beds) bed.prop.onHit = null;
    this.beds.length = 0;
  }
}
