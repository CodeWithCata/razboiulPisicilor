/** @file Base class of every cat and boss: chase / steer / knockback / death. Subclasses override `think()`. */
import Phaser from 'phaser';
import type { TexKey } from '../assets/keys';
import { ANIM, FLINCH } from '../config/animation';
import { ARENA_RULES } from '../config/arena';
import { ENEMIES, LASER, SURRENDER, type EnemyStats, type EnemyType } from '../config/balance';
import type { ArenaQuery } from '../core/arena';
import { bus, Events, type CatPoppedPayload, type CatSurrenderPayload, type EnemyKilledPayload } from '../core/events';
import { HIDEOUT } from '../config/props';
import { gameClock } from '../core/clock';
import type { FlowField } from '../core/flowField';
import { hasClearLine, steerAround } from '../core/steering';
import { NO_OBSTACLES } from '../world/SolidGrid';
import { Actor } from './Actor';
import type { Player } from './Player';

/** What a cat needs to know each frame. `lure` is set while the laser pointer is active. */
export interface EnemyContext {
  player: Player;
  lure: Phaser.Types.Math.Vector2Like | null;
  /** Every projectile in flight (the tennis cat watches for balls Varu sends back). */
  projectiles?: Phaser.Physics.Arcade.Group;
  /** The wave number (1 = first). The tennis cat gets smarter with it. */
  wave?: number;
  /** Every cat and boss alive (the queen counts her royal guard in it). */
  enemies?: Phaser.Physics.Arcade.Group;
}

/** How a cat slides on a mustard puddle (numbers in config/barrels.ts, started by systems/props/BarrelSystem.ts). */
export interface SlipOptions {
  /** How long the slide lasts (ms). */
  ms: number;
  /** The shove is made this many times faster (but never below `minSpeed`, and never more than `maxBoost` times). */
  boost: number;
  maxBoost: number;
  minSpeed: number;
  /** Share of the speed that is left after one second of sliding (below 1: it slows down by itself). */
  friction: number;
  /** Full turns the cat spins during the slide. */
  turns: number;
  /** After a slide the cat cannot slip again for this long (ms). */
  cooldownMs: number;
}

/** Where a cat that gave up is: waving the flag, walking to its exit, or fading out (see `Enemy.surrender`). */
type SurrenderPhase = 'flag' | 'walk' | 'fade';

interface GiveUp {
  phase: SurrenderPhase;
  /** Game time the current phase began. */
  phaseAt: number;
  /** Where it walks to. */
  exit: { x: number; y: number };
  /** The little white flag. A scene object of its own (it is drawn upright in world space while the cat turns); destroyed with the cat. */
  flag: Phaser.GameObjects.Graphics;
}

/**
 * Base class for every cat and boss. A new cat = a small subclass that sets its
 * texture + type and overrides `think()`. Stats live in config/balance.ts.
 */
export abstract class Enemy extends Actor {
  readonly enemyType: EnemyType;
  readonly stats: EnemyStats;
  /** The walls. GameScene hands the real arena over right after the cat is created. */
  protected obstacles: ArenaQuery = NO_OBSTACLES;
  /** Walking distances to Varu (or the laser dot), set by GameScene. Null = no pathfinding, only wall avoidance. */
  private flow: FlowField | null = null;
  private sightCheckedAt = -Infinity;
  private seesTarget = true;
  /** Walk-cycle animation state (see config/animation.ts). */
  private baseScale = 1;
  private gaitPhase = Math.random() * Math.PI * 2;
  private swayApplied = 0;
  /** Which way this cat turns first when a wall is in its way. */
  private readonly avoidSide: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  /** Pinball: another flung cat can hurt this one again only after this game time. */
  private bumpReadyAt = 0;
  /** When the belt last warned this cat (see `flinch`). */
  private flinchAt = -Infinity;
  /** Set once the cat has given up (`surrender`). From then on it never thinks again, can't be hit and can't hurt. */
  private giveUp: GiveUp | null = null;
  /** Weather fog (`systems/Fog.ts` sets it every frame): 1 = seen, lower = hidden in the mist. Bosses always stay 1. */
  fogAlpha = 1;
  /** The cat's own fade (surrender, the ninja's vanish). Multiplied with the fog in `refreshAlpha`. */
  protected fadeAlpha = 1;
  /** Slowed by the floor (a mustard puddle): 1 = normal. BarrelSystem sets it every frame before the cats think. */
  terrainSlow = 1;
  /** The slow that was applied to the velocity last frame (undone at the start of the next, so a cat that holds one velocity is never slowed twice). */
  private slowApplied = 1;
  /** Slipping on mustard (`startSlip`): when it began / ends (game ms, 0 = not slipping), and its spin, friction and cooldown. */
  private slipStart = 0;
  private slipUntil = 0;
  private slipReadyAt = 0;
  private slipFriction = 1;
  private slipCooldownMs = 0;
  private slipTurns = 0;
  private slipDir: 1 | -1 = 1;
  /** Extra turn (degrees) drawn on top of the cat's heading while it slips. */
  private slipAngle = 0;

  protected constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType, texture: TexKey) {
    const stats: EnemyStats = ENEMIES[type];
    super(scene, x, y, texture, { maxHp: stats.hp, size: stats.size, hitRadius: stats.hitRadius });
    this.enemyType = type;
    this.stats = stats;
    this.baseScale = this.scaleX; // Actor already fitted the sprite to its size
  }

  setObstacles(arena: ArenaQuery): void {
    this.obstacles = arena;
  }

  setFlow(flow: FlowField): void {
    this.flow = flow;
  }

  /** Flying cats don't bump into other cats (or walls). */
  get flies(): boolean {
    return false;
  }

  /** True while this cat runs straight through other cats instead of being stopped by them (the queen's charge: the others are shoved aside). */
  get ignoresCats(): boolean {
    return false;
  }

  /** False while a cat can't be hit (a ninja mid-teleport, or a cat that gave up). Subclasses that override it must keep `&& super.hittable`. */
  get hittable(): boolean {
    return this.giveUp === null && !this.cagedIn;
  }

  /** True once the cat has raised the white flag (systems/CatChatter.ts skips it). */
  get surrendering(): boolean {
    return this.giveUp !== null;
  }

  get isBoss(): boolean {
    return false;
  }

  /** A bonus cat (the lucky cat) comes and goes by herself: the wave never waits for her and a surrender never includes her. */
  get isBonus(): boolean {
    return false;
  }

  /** Damage dealt to Varu when this cat touches him. */
  get contactDamage(): number {
    return this.giveUp || this.cagedIn ? 0 : this.stats.contactDamage;
  }

  /** Multiplier on damage from the belt and crows. Bosses use it for armor. */
  protected get damageFactor(): number {
    return 1;
  }

  /** Extra squash on top of the walk cycle (visual only): positive = wider and shorter, negative = stretched along its facing. Bosses use it to crouch and lunge. */
  protected get poseSquash(): number {
    return 0;
  }

  /** Extra lean in degrees on top of the walk sway (visual only). Bosses use it for slumps and sulking. */
  protected get poseTiltDeg(): number {
    return 0;
  }

  /** A boss can walk with its own gait instead of the shared boss one (sway degrees, squash, stride). Null = the shared one. */
  protected get gaitLook(): { readonly swayDeg: number; readonly squash: number; readonly stride: number } | null {
    return null;
  }

  /** Cats turn toward where they walk. Override to false to steer rotation yourself. */
  protected get facesVelocity(): boolean {
    return true;
  }

  /** Movement / attack logic. Runs every frame unless the cat is being knocked back. */
  protected abstract think(time: number, delta: number, ctx: EnemyContext): void;

  tick(time: number, delta: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    if (this.cagedIn) {
      this.setVelocity(0, 0); // locked in a bed: it does not think, move or show (it stays active, so the wave waits for it)
      return;
    }
    this.undoTerrainSlow();
    this.rotation -= this.swayApplied; // undo last frame's sway so think() steers from the true heading
    this.swayApplied = 0;
    if (this.giveUp) this.surrenderStep(); // a cat that gave up never thinks again: no chase, no fuse, no teleport, no shots
    else if (!this.isKnockedBack) this.think(time, delta, ctx);
    // think() may destroy the cat (kamikaze explosion), and so may the end of the surrender fade: body and shadow are gone then.
    if (!this.active || !this.body) return;
    this.stepSlip(delta);
    this.applyTerrainSlow();

    const body = this.body as Phaser.Physics.Arcade.Body;
    if ((this.facesVelocity || this.giveUp) && body.enable && body.speed > 10) {
      const facing = Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, facing, 0.25);
    }
    this.animate(delta, body.speed);
    this.syncShadow();
    this.refreshAlpha();
  }

  /**
   * The body and the ground shadow share one alpha: the cat's own fade times the fog. The loose parts (wings, racket)
   * copy the body's alpha in their own rigs, so they fade along with it.
   */
  private refreshAlpha(): void {
    const alpha = this.fadeAlpha * this.fogAlpha;
    this.setAlpha(alpha);
    this.setShadowAlpha(alpha);
  }

  /** True while the cat slides and spins on a mustard puddle. */
  get slipping(): boolean {
    return this.slipUntil > 0;
  }

  /**
   * A cat that is flung while it stands in a mustard puddle slips: it is shoved faster, spins and slides on, slowing down by
   * itself, and cannot think until it stops (a slide is a long knockback, so a sliding cat can also bump other cats like any flung cat).
   * Returns false if it could not start: bosses are too heavy, a cat that gave up or is already sliding or recovering, or one that is not moving.
   */
  startSlip(o: SlipOptions): boolean {
    const now = gameClock.now;
    if (this.isBoss || !this.alive || this.giveUp || !this.body || this.slipUntil > 0 || now < this.slipReadyAt) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.speed < 1) return false;
    body.velocity.scale(Math.min(o.maxBoost, Math.max(o.boost, o.minSpeed / body.speed)));
    this.slipStart = now;
    this.slipUntil = now + o.ms;
    this.knockbackUntil = Math.max(this.knockbackUntil, this.slipUntil);
    this.slipFriction = o.friction;
    this.slipCooldownMs = o.cooldownMs;
    this.slipTurns = o.turns;
    this.slipDir = Math.random() < 0.5 ? -1 : 1;
    return true;
  }

  /** One frame of a slide: the spin eases out (it ends on a whole number of turns, so the cat does not snap), the speed fades. */
  private stepSlip(delta: number): void {
    if (this.slipUntil === 0) return;
    const now = gameClock.now;
    // Over, or something else (a new hit, a pinball bump) took over the knockback: stop sliding.
    if (now >= this.slipUntil || !this.isKnockedBack || !this.body) {
      this.slipUntil = 0;
      this.slipAngle = 0;
      this.slipReadyAt = now + this.slipCooldownMs;
      return;
    }
    const t = Phaser.Math.Clamp((now - this.slipStart) / (this.slipUntil - this.slipStart), 0, 1);
    this.slipAngle = this.slipDir * this.slipTurns * 360 * (1 - (1 - t) * (1 - t));
    (this.body as Phaser.Physics.Arcade.Body).velocity.scale(Math.pow(this.slipFriction, delta / 1000));
  }

  /** Take last frame's slow off the velocity again, so think() steers from the cat's own speed. A knockback set a fresh velocity: leave it alone. */
  private undoTerrainSlow(): void {
    const applied = this.slowApplied;
    if (applied === 1) return;
    this.slowApplied = 1;
    if (this.isKnockedBack || !this.body) return;
    (this.body as Phaser.Physics.Arcade.Body).velocity.scale(1 / applied);
  }

  /** Walking through a puddle: the cat moves slower this frame (a knockback flies at its normal speed). */
  private applyTerrainSlow(): void {
    const slow = this.terrainSlow;
    if (slow >= 1 || this.isKnockedBack || !this.body) return;
    (this.body as Phaser.Physics.Arcade.Body).velocity.scale(slow);
    this.slowApplied = slow;
  }

  /**
   * The cat gives up (systems/SurrenderSystem.ts decides when; `exit` is where it walks off to). It stops thinking, can't be hit,
   * can't hurt, waves a white flag for a moment, walks to the exit and fades out. A safety timeout makes it fade where it stands
   * if it gets stuck, so it can never hold the wave. Nothing explodes (a kamikaze just walks away). The wave ends the normal way:
   * the cat is really removed, and WaveSystem sees `aliveCount() === 0`. Bosses never give up.
   */
  surrender(exit: Phaser.Types.Math.Vector2Like): void {
    if (!this.alive || this.giveUp || this.isBoss) return;
    this.knockbackUntil = 0; // no longer flying through the air (so pinball ignores it too)
    this.setVelocity(0, 0);
    this.clearTint(); // a lit kamikaze fuse blinks red: stop that
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    this.giveUp = {
      phase: 'flag',
      phaseAt: gameClock.now,
      exit: { x: exit.x ?? this.x, y: exit.y ?? this.y },
      flag: this.scene.add.graphics().setDepth(SURRENDER.flag.depth),
    };
    this.drawFlag(gameClock.now);
    const payload: CatSurrenderPayload = { x: this.x, y: this.y, type: this.enemyType };
    bus.emit(Events.CatSurrender, payload);
  }

  /** One frame of giving up: wave the flag, walk to the exit, fade out, get removed. */
  private surrenderStep(): void {
    const give = this.giveUp;
    if (!give) return;
    const now = gameClock.now;

    if (give.phase === 'flag') {
      this.setVelocity(0, 0);
      if (now - give.phaseAt >= SURRENDER.flagMs) this.goToPhase(give, 'walk', now);
    }
    if (give.phase === 'walk') {
      const arrived = Math.hypot(give.exit.x - this.x, give.exit.y - this.y) <= SURRENDER.exitRadius;
      if (arrived || now - give.phaseAt >= SURRENDER.walkTimeoutMs) this.goToPhase(give, 'fade', now);
      else this.steerTo(give.exit, Math.max(this.stats.speed * SURRENDER.walkSpeedFactor, SURRENDER.minWalkSpeed)); // flying cats just fly off
    }
    if (give.phase === 'fade') {
      this.setVelocity(0, 0);
      const left = 1 - Phaser.Math.Clamp((now - give.phaseAt) / SURRENDER.fadeMs, 0, 1);
      this.fadeAlpha = left; // body and shadow take it (with the fog) in refreshAlpha, at the end of tick
      give.flag.setAlpha(left);
      if (left <= 0) {
        this.destroy(); // really gone (the flag goes with it): this is what lets the wave end
        return;
      }
    }
    this.drawFlag(now);
  }

  private goToPhase(give: GiveUp, phase: SurrenderPhase, now: number): void {
    give.phase = phase;
    give.phaseAt = now;
  }

  /** Redraws the white flag above the cat's shoulder (code-drawn, no image): a pole that sways and a cloth whose free edge ripples. */
  private drawFlag(now: number): void {
    const give = this.giveUp;
    if (!give) return;
    const F = SURRENDER.flag;
    const wave = (now / 1000) * F.waveHz * Math.PI * 2;
    const baseX = this.x + F.anchorX * this.stats.size;
    const baseY = this.y + F.anchorY * this.stats.size;
    const topX = baseX + Math.sin(wave) * F.swayPx;
    const topY = baseY - F.poleLen;
    const ripple = Math.sin(wave + 1.3) * F.ripplePx;
    // The cloth hangs to the right of the pole top; its free edge (x + clothW) moves up and down.
    const x0 = topX;
    const y0 = topY;
    const x1 = topX + F.clothW;
    const y1 = topY + ripple;
    const x2 = x1;
    const y2 = y1 + F.clothH;
    const x3 = topX;
    const y3 = topY + F.clothH;

    const g = give.flag;
    g.clear();
    g.lineStyle(F.poleWidth + F.outlineWidth * 2, F.outlineColor, 1).lineBetween(baseX, baseY, topX, topY);
    g.lineStyle(F.poleWidth, F.poleColor, 1).lineBetween(baseX, baseY, topX, topY);
    g.fillStyle(F.clothColor, 1).fillTriangle(x0, y0, x1, y1, x2, y2).fillTriangle(x0, y0, x2, y2, x3, y3);
    g.lineStyle(F.outlineWidth, F.outlineColor, 1)
      .lineBetween(x0, y0, x1, y1)
      .lineBetween(x1, y1, x2, y2)
      .lineBetween(x2, y2, x3, y3)
      .lineBetween(x3, y3, x0, y0);
  }

  override destroy(fromScene?: boolean): void {
    this.giveUp?.flag.destroy(); // the flag is a scene object of its own: it must not outlive the cat
    super.destroy(fromScene);
  }

  /** Locked in a bed (`cage`). */
  private cagedIn = false;
  /** Hide and seek: when the cat sprang out of a bush or box (`popOut`) and for how long. 0 = not popping. */
  private popAt = 0;
  /** The landing taunt (Events.CatPopped) is sent once per pop. */
  private tauntSent = false;
  /** The cat came out of a bed (so its landing line is a sleepy one). */
  private popSleepy = false;

  /**
   * The cat springs out of a bush or box: a short hop toward `dirX/dirY` (it does not think meanwhile), a squash-and-stretch pop from small to
   * full size with a little overshoot, and a quick fade-in (HIDEOUT.exit). The pop is a bit of looks and a short move, nothing more.
   */
  popOut(dirX: number, dirY: number, sleepy = false): void {
    if (!ANIM.enabled) return; // the pop is part of the animation: without it the cat just walks out
    const X = HIDEOUT.exit;
    this.popAt = gameClock.now;
    this.tauntSent = false;
    this.popSleepy = sleepy;
    this.knockbackUntil = Math.max(this.knockbackUntil, this.popAt + X.ms);
    this.fadeAlpha = 0;
    this.setAlpha(0);
    if (this.body) this.setVelocity(dirX * this.stats.speed * X.hopSpeed, dirY * this.stats.speed * X.hopSpeed);
  }

  /**
   * The look of the pop at this moment: extra squash, a size factor and a cheeky wobble (radians), or null when it is over.
   * Also eases the hop and the fade. When the cat lands it tells the world (Events.CatPopped) so it can taunt Varu.
   */
  private popLook(): { squash: number; size: number; wiggle: number } | null {
    if (this.popAt === 0) return null;
    const X = HIDEOUT.exit;
    const t = (gameClock.now - this.popAt) / X.ms;
    if (t >= 1) {
      this.popAt = 0;
      this.fadeAlpha = 1;
      return null;
    }
    if (t >= X.tauntAt && !this.tauntSent) {
      this.tauntSent = true;
      const payload: CatPoppedPayload = { x: this.x, y: this.y - this.displayHeight / 2, sleepy: this.popSleepy };
      bus.emit(Events.CatPopped, payload);
    }
    this.fadeAlpha = Math.min(1, t / X.fadeInShare);
    // grow from small to full with a little overshoot (ease out back)
    const g = Math.min(1, t / 0.7) - 1;
    const back = 1 + 2.2 * g * g * g + 1.2 * g * g;
    const size = X.startScale + (1 - X.startScale) * back;
    // stretched while it springs out, then a squash when it lands (around 60%), then it settles
    const squash = t < 0.5 ? X.stretch * (1 - t / 0.5) : X.landSquash * Math.sin(Math.min(1, (t - 0.5) / 0.5) * Math.PI) * (1 - t) * 1.6;
    if (this.body) (this.body as Phaser.Physics.Arcade.Body).velocity.scale(0.94); // the hop slows down
    // the cheeky wobble: starts when it lands, swings a few times and dies out
    const after = Math.max(0, (t - X.tauntAt) / (1 - X.tauntAt));
    const wiggle = Math.sin(after * Math.PI * 2 * X.wiggleCycles) * (1 - after) * Phaser.Math.DegToRad(X.wiggleDeg);
    return { squash, size, wiggle };
  }

  /** Sway and squash. Scale changes the hitbox by a few percent at most, which is fine. */
  private animate(delta: number, speed: number): void {
    if (!ANIM.enabled) return;
    let squash: number;
    let swayRad = 0;
    if (speed < ANIM.idleSpeed) {
      this.gaitPhase += delta * ANIM.idle.rate;
      squash = Math.sin(this.gaitPhase) * ANIM.idle.squash;
    } else if (this.flies) {
      this.gaitPhase += delta * ANIM.flyer.rate;
      squash = Math.sin(this.gaitPhase) * ANIM.flyer.squash;
      swayRad = Math.sin(this.gaitPhase * 0.5) * Phaser.Math.DegToRad(ANIM.flyer.swayDeg);
    } else {
      const look = this.gaitLook ?? (this.isBoss ? ANIM.boss : this.enemyType === 'fat' ? ANIM.fat : ANIM.walk);
      this.gaitPhase += (speed * delta) / 1000 * ANIM.stridePerPx * look.stride;
      squash = Math.sin(this.gaitPhase * 2) * look.squash;
      swayRad = Math.sin(this.gaitPhase) * Phaser.Math.DegToRad(look.swayDeg);
    }
    const sinceFlinch = gameClock.now - this.flinchAt;
    if (sinceFlinch < FLINCH.ms) squash += FLINCH.squash * (1 - sinceFlinch / FLINCH.ms);
    squash += this.poseSquash;
    swayRad += Phaser.Math.DegToRad(this.poseTiltDeg);
    swayRad += Phaser.Math.DegToRad(this.slipAngle);
    const pop = this.popLook();
    if (pop) {
      squash += pop.squash;
      swayRad += pop.wiggle;
    }
    const size = pop ? pop.size : 1;
    this.setScale(this.baseScale * size * (1 + squash), this.baseScale * size * (1 - squash));
    this.swayApplied = swayRad;
    this.rotation += swayRad;
  }

  /** Walk toward a point (turning away from walls in the way). Stops within `stopRadius` of it. */
  protected steerTo(point: Phaser.Types.Math.Vector2Like, speed: number, stopRadius = 0): void {
    const dx = (point.x ?? 0) - this.x;
    const dy = (point.y ?? 0) - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= stopRadius || dist === 0) {
      this.setVelocity(0, 0);
      return;
    }
    let heading = Math.atan2(dy, dx);
    const probe = this.hitRadius + ARENA_RULES.probeMargin;
    if (!this.flies && dist > probe) {
      const around = this.pathAround(point, dist);
      if (around) heading = Math.atan2(around.y - this.y, around.x - this.x);
      else heading = steerAround(this.x, this.y, heading, probe, this.obstacles, this.avoidSide, ARENA_RULES.avoidAnglesDeg);
    }
    this.setVelocity(Math.cos(heading) * speed, Math.sin(heading) * speed);
  }

  /**
   * Smarter than turning away from walls: if a wall blocks the straight line to the target, return the
   * next tile center on the shortest walking route. Returns null when the cat can just walk straight
   * (or there is no route, or this is not the flow field's target), so the cheap wall avoidance takes over.
   */
  private pathAround(point: Phaser.Types.Math.Vector2Like, dist: number): { x: number; y: number } | null {
    const flow = this.flow;
    const tx = point.x ?? 0;
    const ty = point.y ?? 0;
    if (!flow || dist < ARENA_RULES.directRange || !flow.isTarget(tx, ty)) return null;

    const now = gameClock.now;
    if (now - this.sightCheckedAt >= ARENA_RULES.sightCheckMs) {
      this.sightCheckedAt = now - Math.random() * 40; // spread the checks of many cats over different frames
      const radius = Math.min(this.hitRadius, ARENA_RULES.sightRadiusMax);
      this.seesTarget = hasClearLine(this.x, this.y, tx, ty, radius, this.obstacles);
    }
    return this.seesTarget ? null : flow.nextPoint(this.x, this.y);
  }

  /** Chase Varu, or the laser dot if there is one (cats bunch up around the dot). */
  protected chase(ctx: EnemyContext, speed: number): void {
    if (ctx.lure) this.steerTo(ctx.lure, speed, LASER.stopRadius);
    else this.steerTo(ctx.player, speed);
  }

  /** Belt / crow hit. Returns true if it killed the cat. */
  takeDamage(amount: number, fromX: number, fromY: number, knockback: number): boolean {
    if (!this.alive || !this.hittable) return false;
    return this.applyHit(amount * this.damageFactor, fromX, fromY, knockback);
  }

  /** The belt is about to hit this cat: a quick squash and flash. Visual only, the cat does not move. */
  flinch(): void {
    if (!FLINCH.enabled || !this.alive) return;
    this.flinchAt = gameClock.now;
    this.flash(FLINCH.flashColor, FLINCH.flashMs);
  }

  /** Speed (px/s) while a hit is flinging this cat across the arena, otherwise 0. Bosses are too heavy to count. */
  get flungSpeed(): number {
    if (this.isBoss || !this.alive || !this.isKnockedBack || !this.body) return 0;
    return (this.body as Phaser.Physics.Arcade.Body).speed;
  }

  /** True while the cat is locked in a bed (see `cage` / `release`, systems/props/BedCageSystem.ts). */
  get caged(): boolean {
    return this.cagedIn;
  }

  /**
   * A bed locks the cat in: hidden, frozen, harmless and out of every collision, but still alive and `active`, so the wave waits for it.
   * Bosses are too heavy to be caged. `x/y` is where it is kept (the bed's center).
   */
  cage(x: number, y: number): void {
    if (this.isBoss || this.cagedIn || !this.body) return;
    this.cagedIn = true;
    this.knockbackUntil = 0;
    this.popAt = 0;
    this.fadeAlpha = 1;
    this.clearTint();
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.setPosition(x, y);
    this.setVisible(false);
    this.setShadowVisible(false);
  }

  /**
   * The cat gets out of the bed: it appears at (x, y) and leaves toward `dirX/dirY` at `speed`. With `flingMs` above 0 the exit
   * counts as a fling (pinball sees it); otherwise it is only a short hop out where it does not think.
   */
  release(x: number, y: number, dirX: number, dirY: number, speed: number, flingMs: number): void {
    if (!this.cagedIn) return;
    this.cagedIn = false;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    body.enable = true;
    body.reset(x, y);
    this.setVisible(true);
    this.setShadowVisible(true);
    this.syncShadow();
    this.setVelocity(dirX * speed, dirY * speed);
    this.knockbackUntil = gameClock.now + (flingMs > 0 ? flingMs : 200);
  }

  /** True while the cat is still springing out of its hideout (that hop is not a fling). */
  get popping(): boolean {
    return this.popAt !== 0;
  }

  /** A bed boinged this cat: it flies off at (vx, vy) and counts as flung for `ms`, so pinball sees it. */
  boing(vx: number, vy: number, ms: number): void {
    if (!this.body) return;
    this.setVelocity(vx, vy);
    this.knockbackUntil = Math.max(this.knockbackUntil, gameClock.now + ms);
  }

  /** A flung cat slammed into this one (pinball, systems/PinballSystem.ts). Bosses shrug it off. Returns true if the bump landed (the cat got hurt or killed). */
  takeBump(damage: number, fromX: number, fromY: number, knockback: number, gapMs: number): boolean {
    if (this.isBoss || !this.alive || !this.hittable) return false;
    const now = gameClock.now;
    if (now < this.bumpReadyAt) return false;
    this.bumpReadyAt = now + gapMs;
    this.applyHit(damage, fromX, fromY, knockback);
    return true;
  }

  /** A deflected tennis ball hit this cat. Bosses override this (stun!). `_rallies` = how often a tennis cat or Federer returned the ball first. */
  onDeflectedHit(damage: number, fromX: number, fromY: number, _rallies = 0): void {
    if (this.alive && this.hittable) this.applyHit(damage, fromX, fromY, 300);
  }

  /** Subtract HP, flash, knock back, die. `effective` is the final damage (armor already applied). */
  protected applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
    this.hp -= effective;
    this.flash();
    bus.emit(Events.EnemyHit, { x: this.x, y: this.y });

    if (this.hp <= 0) {
      const payload: EnemyKilledPayload = { x: this.x, y: this.y, type: this.enemyType, score: this.stats.score };
      bus.emit(Events.EnemyKilled, payload);
      this.destroy();
      return true;
    }
    this.applyKnockback(fromX, fromY, knockback * (1 - this.stats.knockbackResist));
    return false;
  }
}
