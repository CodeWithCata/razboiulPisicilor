/** @file Mustard barrels: scattered on random open floor, broken by the belt, blasts and bosses; the puddle they leave slows Varu and walking cats. */
import { texArgs, texRef } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { WORLD } from '../../config/arena';
import { BARREL } from '../../config/barrels';
import { MYSTERY, type BadKind } from '../../config/balance';
import { CURSE } from '../../config/curses';
import { PROP_TUNING, SMASH } from '../../config/props';
import { FONT_SFX } from '../../config/style';
import { CURSED_BARREL_LINES, CURSED_BARREL_WORDS, SLIP_WORDS, pick } from '../../content/lines';
import type { ArenaQuery, Point } from '../../core/arena';
import { gameClock } from '../../core/clock';
import { weightedPick } from '../../core/random';
import {
  bus, Events, listen,
  type BallLandedPayload, type BeltFlightPayload, type BeltSweepPayload, type CrowImpactPayload, type ExplosionPayload,
  type CurseZonePayload, type ProjectileSmashPayload, type PropDestroyedPayload, type PropHitPayload, type WavePayload,
} from '../../core/events';
import { segmentTouchesBox, sweepTouchesBox, type Box } from '../../core/reach';
import type { Enemy, SlipOptions } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { Effects } from '../Effects';
import type { Obstacle, Obstacles } from './Obstacles';
import { hyp } from '../../core/hyp';
import { snapshotInto } from '../../core/snapshot';

/** One barrel standing in the arena. */
interface Barrel {
  /** Where it stands on the floor (its base). */
  x: number;
  y: number;
  hp: number;
  readonly box: Box;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  /** What makes it solid (Varu and walking cats bump into it). */
  readonly obstacle: Obstacle;
  /** The belt sweep (and lap) that hit it last, so one swing hits it once. */
  hitKey: number;
  /** The thrown belt waits for this (game ms). */
  readyAt: number;
  /** Cursed barrel (bad luck): purple glow, and a purple cloud when it breaks. `rolled`: the chance was already rolled (only possible once curses exist in the run). */
  cursed: boolean;
  rolled: boolean;
  glow: Phaser.GameObjects.Arc | null;
}

/** A mustard puddle on the floor. */
interface Puddle {
  x: number;
  y: number;
  readonly sprite: Phaser.GameObjects.Image;
  /** When it was made, and when it starts to dry (game ms). */
  readonly bornAt: number;
  readonly dryAt: number;
  /** True once it is fading away: it slows less and less, then is gone. */
  drying: boolean;
}

/**
 * Mustard barrels. A run starts with a few on random open floor (never in a wall, not on top of Varu, spread apart) and a new
 * one pops up now and then. They are solid (Varu and walking cats bump into them, see Obstacles) and you can break them: the belt (swing, spin, throw), blasts (kamikaze cats,
 * crows, tennis balls) and boss attacks break them. Two hits from the belt, or one blast. A broken barrel bursts and leaves a
 * puddle that dries up after a while (BARREL.puddle.lifeMs): Varu and every walking cat that stands in it moves slower (`terrainSlow`, applied in
 * Player.tick and Enemy.tick). A cat that is flung while it stands in a puddle slips (spins and slides on, see Enemy.startSlip). The look of hits and the burst (particles, words, sound) comes from the event bus: PropFx and AudioSystem.
 */
export class BarrelSystem {
  private readonly barrels: Barrel[] = [];
  private readonly puddles: Puddle[] = [];
  /** Reused copies of the barrel list for the per-frame loops (see `snapshotInto`). One list per loop, so a nested call never clears another's. */
  private readonly catScratch: Barrel[] = [];
  private readonly sweepScratch: Barrel[] = [];
  private readonly flightScratch: Barrel[] = [];
  private readonly smashScratch: Barrel[] = [];
  private readonly goo: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly off: Array<() => void> = [];
  private sweepSerial = 0;
  private nextSpawnAt: number;
  private nextGooAt = 0;
  private lastWordAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly arena: ArenaQuery,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly effects: Pick<Effects, 'floatText'>,
    private readonly obstacles: Obstacles,
    /** True once curses exist in this run (`CurseSystem.waveOpen`): only then can a barrel be cursed. */
    private readonly canCurse: () => boolean = () => false,
  ) {
    const g = BARREL.puddle.goo;
    this.goo = scene.add
      .particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
        emitting: false,
        lifespan: { ...g.lifespanMs },
        speed: { ...g.speed },
        gravityY: g.gravityY,
        scale: { start: 0.55, end: 0.1 },
        alpha: { start: 0.95, end: 0 },
        tint: [...g.tint],
      })
      .setDepth(g.depth);
    this.nextSpawnAt = gameClock.now + this.spawnDelay();

    const count = Phaser.Math.Between(BARREL.count.min, BARREL.count.max);
    for (let i = 0; i < count; i++) this.spawn(false);

    this.off.push(
      listen<WavePayload>(Events.WaveStarted, () => this.barrels.forEach((barrel) => this.rollCurse(barrel))), // barrels from before the first cursed wave roll now
      listen(Events.BeltSwing, () => (this.sweepSerial += 1)),
      listen(Events.BeltSpin, () => (this.sweepSerial += 1)),
      listen<BeltSweepPayload>(Events.BeltSweep, (p) => this.onSweep(p)),
      listen<BeltFlightPayload>(Events.BeltFlight, (p) => this.onFlight(p)),
      listen<ProjectileSmashPayload>(Events.ProjectileSmash, (p) => this.onProjectileSmash(p)),
      listen<ExplosionPayload>(Events.Explosion, ({ x, y, radius, fromBoss }) => this.blast(x, y, radius, fromBoss === true)),
      listen<BallLandedPayload>(Events.BallLanded, ({ x, y, radius }) => this.blast(x, y, radius, true)),
      listen<CrowImpactPayload>(Events.CrowImpact, ({ x, y, radius, variant }) => {
        if (variant !== 'miss') this.blast(x, y, radius, false);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  /** Call every frame BEFORE Varu and the cats move: it sets how slowed each of them is, and pops up new barrels. */
  update(now: number): void {
    if (now >= this.nextSpawnAt) {
      this.nextSpawnAt = now + this.spawnDelay();
      if (this.barrels.length < BARREL.count.max) this.spawn(true);
    }

    this.dryPuddles(now);
    if (BARREL.catsBreak) this.breakByCats();

    const slow = BARREL.puddle.slow;
    this.player.terrainSlow = this.slowAt(this.player.x, this.player.y, slow.player);
    const dropNow = now >= this.nextGooAt;
    if (dropNow) this.nextGooAt = now + BARREL.puddle.goo.everyMs;
    if (dropNow && this.player.terrainSlow < 1) this.goo.explode(1, this.player.x, this.player.y + 10);

    for (const child of this.enemies.getChildren()) {
      const cat = child as Enemy;
      if (!cat.active) continue;
      cat.terrainSlow = cat.flies ? 1 : this.slowAt(cat.x, cat.y, cat.isBoss ? slow.boss : slow.cat);
      // Flung (a belt hit, a pinball bump) while standing in mustard: it slips.
      if (cat.terrainSlow < 1 && cat.isKnockedBack && cat.startSlip(this.slipOptions())) this.onSlip(cat, now);
      if (dropNow && (cat.terrainSlow < 1 || cat.slipping)) this.goo.explode(1, cat.x, cat.y + 8); // a slider leaves a mustard trail
    }
  }

  /** A walking cat that runs into a barrel breaks it. */
  private breakByCats(): void {
    if (this.barrels.length === 0) return;
    for (const child of this.enemies.getChildren()) {
      const cat = child as Enemy;
      if (!cat.active || cat.flies || !cat.alive) continue;
      const barrels = snapshotInto(this.barrels, this.catScratch);
      for (let i = 0; i < barrels.length; i++) {
        const barrel = barrels[i]!;
        const b = barrel.box;
        const nx = Phaser.Math.Clamp(cat.x, b.x, b.x + b.w);
        const ny = Phaser.Math.Clamp(cat.y, b.y, b.y + b.h);
        if (Phaser.Math.Distance.Between(cat.x, cat.y, nx, ny) > cat.hitRadius + BARREL.catBreakSlackPx) continue;
        this.hit(barrel, cat.x, cat.y, barrel.hp, 1, false);
      }
      this.catScratch.length = 0;
    }
  }

  /** Puddles do not last forever: once their time is up they fade away, and a fading puddle stops slowing anyone. */
  private dryPuddles(now: number): void {
    const p = BARREL.puddle;
    for (const puddle of this.puddles) {
      // After its growth it slowly gets smaller (and so does its sticky zone) until it is dry.
      const age = now - puddle.bornAt;
      if (age >= p.growMs) {
        const t = Math.min(1, (age - p.growMs) / Math.max(1, p.lifeMs - p.growMs));
        puddle.sprite.setScale(p.scale * (1 - (1 - p.shrinkTo) * t));
      }
      if (puddle.drying || now < puddle.dryAt) continue;
      this.fadeOut(puddle, p.dryMs);
    }
  }

  /** Fade a puddle away and take it off the floor for good. */
  private fadeOut(puddle: Puddle, ms: number): void {
    puddle.drying = true;
    this.scene.tweens.killTweensOf(puddle.sprite);
    this.scene.tweens.add({
      targets: puddle.sprite,
      alpha: 0,
      duration: ms,
      onComplete: () => {
        const i = this.puddles.indexOf(puddle);
        if (i >= 0) this.puddles.splice(i, 1);
        puddle.sprite.destroy();
      },
    });
  }

  // ---- slipping ----

  private slipOptions(): SlipOptions {
    const s = BARREL.puddle.slip;
    return { ms: s.ms, boost: s.boost, maxBoost: s.maxBoost, minSpeed: s.minSpeed, friction: s.friction, cooldownMs: s.cooldownMs, turns: Phaser.Math.Between(s.turns.min, s.turns.max) };
  }

  /** A cat just started to slip: a mustard splat (PropFx and AudioSystem listen) and a word. */
  private onSlip(cat: Enemy, now: number): void {
    const payload: PropHitPayload = { x: cat.x, y: cat.y, kind: 'barrel', power: 0.6, dirX: 0, dirY: -1, quiet: true };
    bus.emit(Events.PropHit, payload);
    const word = BARREL.puddle.slip.word;
    if (now - this.lastWordAt < word.cooldownMs) return;
    this.lastWordAt = now;
    this.effects.floatText(cat.x, cat.y - 30, pick(SLIP_WORDS), word.color, word.size, FONT_SFX);
  }

  // ---- spawning ----

  private spawnDelay(): number {
    return Phaser.Math.Between(BARREL.respawn.everyMs.min, BARREL.respawn.everyMs.max);
  }

  /** Put one barrel on a random free spot. `pop`: it grows in (for barrels that appear during the run). */
  private spawn(pop: boolean): void {
    const spot = this.findSpot();
    if (!spot) return;
    const { scale, originY, depth, shadow, hitbox, solid } = BARREL;
    const shade = this.scene.add
      .image(spot.x, spot.y + shadow.offsetY, ...texArgs(Tex.Shadow))
      .setDisplaySize(shadow.width, shadow.height)
      .setDepth(depth - shadow.depthGap);
    const sprite = this.scene.add.image(spot.x, spot.y, ...texArgs(Tex.BarrelWhole)).setOrigin(0.5, originY).setScale(scale).setDepth(depth);
    this.barrels.push({
      x: spot.x,
      y: spot.y,
      hp: BARREL.hp,
      box: { x: spot.x - hitbox.halfWidth, y: spot.y - hitbox.height, w: hitbox.halfWidth * 2, h: hitbox.height },
      sprite,
      shadow: shade,
      obstacle: this.obstacles.add(spot.x, spot.y + solid.offsetY, solid.w, solid.h),
      hitKey: -1,
      readyAt: 0,
      cursed: false,
      rolled: false,
      glow: null,
    });
    this.rollCurse(this.barrels[this.barrels.length - 1]!);
    if (!pop) return;
    sprite.setScale(0);
    shade.setAlpha(0);
    this.scene.tweens.add({ targets: sprite, scale, duration: BARREL.respawn.popMs, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: shade, alpha: 1, duration: BARREL.respawn.popMs });
  }

  /** Bad luck: once curses exist in the run, a barrel rolls ONCE to be cursed (purple tint and a pulsing glow behind it). */
  private rollCurse(barrel: Barrel): void {
    if (barrel.rolled || !this.canCurse()) return;
    barrel.rolled = true;
    if (Math.random() >= CURSE.barrel.chance) return;
    const G = CURSE.barrel.glow;
    barrel.cursed = true;
    barrel.sprite.setTint(CURSE.barrel.tint);
    barrel.glow = this.scene.add.circle(barrel.x, barrel.y + G.offsetY, G.radiusPx, G.color, G.alphaMin).setDepth(BARREL.depth - 0.05);
    this.scene.tweens.add({ targets: barrel.glow, alpha: { from: G.alphaMin, to: G.alphaMax }, scale: { from: 0.9, to: 1.25 }, duration: G.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A cursed barrel broke: a purple cloud puffs out; Varu inside it is cursed (`CurseSystem` decides, it applies the cooldown, wave and mercy rules). */
  private releaseCloud(x: number, y: number): void {
    const C = CURSE.barrel;
    const cloud = this.scene.add.circle(x, y - 24, C.cloud.startPx, C.cloud.color, C.cloud.alpha).setDepth(BARREL.depth + 0.2);
    this.scene.tweens.add({ targets: cloud, scale: C.radius / C.cloud.startPx, alpha: 0, duration: C.cloud.ms, ease: 'Cubic.easeOut', onComplete: () => cloud.destroy() });
    this.effects.floatText(x, y + C.word.offsetY, pick(CURSED_BARREL_WORDS), C.word.color, C.word.size);
    const zone: CurseZonePayload = { x, y, radius: C.radius, curse: { kind: weightedPick<BadKind>(MYSTERY.badWeights), line: pick(CURSED_BARREL_LINES) } };
    bus.emit(Events.CurseZone, zone);
  }

  private findSpot(): Point | null {
    const { margin, clearRadius, minFromPlayer, minGap, tries } = BARREL;
    for (let i = 0; i < tries; i++) {
      const x = Phaser.Math.Between(margin, WORLD.width - margin);
      const y = Phaser.Math.Between(margin, WORLD.height - margin);
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minFromPlayer) continue;
      if (this.barrels.some((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) < minGap)) continue;
      if (!this.arena.isCircleFree(x, y, clearRadius)) continue;
      return { x, y };
    }
    return null;
  }

  // ---- hits ----

  private onSweep(p: BeltSweepPayload): void {
    const key = this.sweepSerial * 16 + (p.lap % 16);
    const reach = p.range + PROP_TUNING.reachSlack;
    const damage = (p.spin ? SMASH.player.spin : SMASH.player.swing) * this.player.damageMultiplier;
    const power = p.spin ? PROP_TUNING.sweep.spin : PROP_TUNING.sweep.swing;
    const swept = snapshotInto(this.barrels, this.sweepScratch);
    for (let i = 0; i < swept.length; i++) {
      const barrel = swept[i]!;
      if (barrel.hitKey === key) continue;
      if (!sweepTouchesBox(p.x, p.y, barrel.box, reach, p.startAngle, p.swept)) continue;
      barrel.hitKey = key;
      this.hit(barrel, p.x, p.y, damage, power);
    }
    this.sweepScratch.length = 0;
  }

  private onFlight(p: BeltFlightPayload): void {
    const now = gameClock.now;
    const flown = snapshotInto(this.barrels, this.flightScratch);
    for (let i = 0; i < flown.length; i++) {
      const barrel = flown[i]!;
      if (now < barrel.readyAt || !segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, barrel.box, p.radius)) continue;
      barrel.readyAt = now + BARREL.flightCooldownMs;
      this.hit(barrel, p.prevX, p.prevY, SMASH.player.flight * this.player.damageMultiplier, PROP_TUNING.flight.power);
    }
    this.flightScratch.length = 0;
  }

  /** v171: a smashing ball (Federer's ball machine) flies through barrels: each one on its way takes the ball's damage as a boss hit; one that survives stops the ball. */
  private onProjectileSmash(p: ProjectileSmashPayload): void {
    const smashed = snapshotInto(this.barrels, this.smashScratch);
    for (let i = 0; i < smashed.length; i++) {
      const barrel = smashed[i]!;
      if (!segmentTouchesBox(p.prevX, p.prevY, p.x, p.y, barrel.box, p.radius)) continue;
      this.hit(barrel, p.prevX, p.prevY, p.damage, PROP_TUNING.flight.power, true);
      if (this.barrels.includes(barrel)) {
        p.absorbed = true;
        break;
      }
    }
    this.smashScratch.length = 0;
  }

  /** A blast breaks every barrel in reach at once. */
  private blast(x: number, y: number, radius: number, byBoss: boolean): void {
    const reach = radius + BARREL.blastSlackPx;
    for (const barrel of this.barrels.slice()) {
      if (Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y) > reach) continue;
      this.hit(barrel, x, y, barrel.hp, 1, byBoss);
    }
  }

  /** `fromX / fromY`: where the hit came from (the barrel leans away). */
  private hit(barrel: Barrel, fromX: number, fromY: number, damage: number, power: number, byBoss = false): void {
    const dx = barrel.x - fromX;
    const dy = barrel.y - fromY;
    const len = hyp(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    barrel.hp -= damage;
    const payload: PropHitPayload = { x: barrel.x, y: barrel.y - 24, kind: 'barrel', power, dirX, dirY, quiet: false };
    bus.emit(Events.PropHit, payload);
    if (barrel.hp <= 0) this.breakBarrel(barrel, byBoss);
    else this.wobble(barrel, dirX);
  }

  private wobble(barrel: Barrel, dirX: number): void {
    const w = BARREL.wobble;
    const sprite = barrel.sprite;
    this.scene.tweens.killTweensOf(sprite);
    sprite.setScale(BARREL.scale).setAngle(0);
    this.scene.tweens.add({ targets: sprite, angle: { from: (dirX >= 0 ? 1 : -1) * w.deg, to: 0 }, duration: w.ms, ease: 'Elastic.easeOut' });
    this.scene.tweens.add({ targets: sprite, scaleX: BARREL.scale * (1 + w.squash), scaleY: BARREL.scale * (1 - w.squash), duration: w.squashMs, yoyo: true });
  }

  // ---- breaking and puddles ----

  private breakBarrel(barrel: Barrel, byBoss: boolean): void {
    const { x, y } = barrel;
    this.barrels.splice(this.barrels.indexOf(barrel), 1);
    this.scene.tweens.killTweensOf(barrel.sprite);
    barrel.sprite.destroy();
    barrel.shadow.destroy();
    if (barrel.glow) {
      this.scene.tweens.killTweensOf(barrel.glow);
      barrel.glow.destroy();
    }
    this.obstacles.remove(barrel.obstacle); // Varu and the cats can walk where it stood

    const payload: PropDestroyedPayload = { x, y: y - 24, kind: 'barrel', byBoss };
    bus.emit(Events.PropDestroyed, payload);

    // The burst picture pops for a moment and fades; the puddle grows underneath it and stays.
    const b = BARREL.burst;
    const burst = this.scene.add.image(x, y, ...texArgs(Tex.BarrelBroken)).setOrigin(0.5, BARREL.originY).setScale(BARREL.scale).setDepth(BARREL.depth + 0.1);
    this.scene.tweens.add({ targets: burst, scale: BARREL.scale * b.popScale, duration: b.ms, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: burst, alpha: 0, delay: b.fadeDelayMs, duration: b.ms - b.fadeDelayMs, onComplete: () => burst.destroy() });
    this.addPuddle(x, y + BARREL.puddle.offsetY);
    if (barrel.cursed) this.releaseCloud(x, y);
  }

  private addPuddle(x: number, y: number): void {
    const p = BARREL.puddle;
    const sprite = this.scene.add.image(x, y, ...texArgs(Tex.BarrelPuddle)).setOrigin(0.5, p.centerY).setScale(0.2).setDepth(p.depth);
    this.scene.tweens.add({ targets: sprite, scale: p.scale, duration: p.growMs, ease: 'Back.easeOut' });
    this.puddles.push({ x, y, sprite, bornAt: gameClock.now, dryAt: gameClock.now + p.lifeMs, drying: false });
    // Too many on the floor: the oldest ones that are not already drying go now.
    const standing = this.puddles.filter((q) => !q.drying);
    for (let i = 0; i < standing.length - p.max; i++) this.fadeOut(standing[i]!, p.fadeMs);
  }

  /** `slow` if the point is inside a puddle (its zone grows with the puddle), otherwise 1. */
  private slowAt(x: number, y: number, slow: number): number {
    const { zone, scale } = BARREL.puddle;
    for (const puddle of this.puddles) {
      // A drying puddle shrinks its sticky zone with its fade, so it never slows anyone while it looks gone.
      const grow = Math.min(1, puddle.sprite.scaleX / scale) * (puddle.drying ? puddle.sprite.alpha : 1);
      if (grow <= 0.15) continue;
      const nx = (x - puddle.x) / (zone.rx * grow);
      const ny = (y - puddle.y) / (zone.ry * grow);
      if (nx * nx + ny * ny <= 1) return slow;
    }
    return 1;
  }
}
