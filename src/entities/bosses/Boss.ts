/** @file Boss state machine: intro -> idle -> telegraph -> active -> recover, phase 2, stun. Subclasses define attacks. */
import { texArgs } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex, type TexKey } from '../../assets/keys';
import { clampToArena } from '../../core/arena';
import { type BossType, type EnemyType } from '../../config/balance';
import { ANIM } from '../../config/animation';
import { BOSS, FINAL_BOSS, LIGHTS_OUT } from '../../config/bosses';
import { WEAK_POINT } from '../../config/weakPoint';
import { BOSS_LAST_WORDS, CUTSCENE } from '../../config/cutscene';
import { synergyEffect } from '../../core/beltSynergies';
import { BOSS_TEXT, LIGHTS_OUT_LINES } from '../../content/bosses';
import {
  bus,
  Events,
  type BossDefeatedPayload,
  type BossHealthPayload,
  type BossLastWordsPayload,
  type BossPhasePayload,
  type BossSpawnedPayload,
  type BossStunnedPayload,
  type BossWeakPayload,
  type ShoutPayload,
  type SpawnEnemyPayload,
} from '../../core/events';
import type { Telegraph } from '../../systems/Telegraph';
import { Enemy, type EnemyContext } from '../Enemy';
import { gameClock } from '../../core/clock';
import { getDifficulty } from '../../core/difficulty';
import { BossFightLog } from '../../core/bossLog';
import { lookFor, type BossLook, type BossLooks } from './BossViews';
import { WeakPoint } from './WeakPoint';

/**
 * One boss attack. The Boss class runs it through:
 *   telegraph (warning) -> active (the attack happens) -> recover (vulnerable pause)
 */
export interface BossAttack {
  id: string; // also the key of its shout in content/bosses.ts
  /** A function lets the warning time change with the phase (the queen gets quicker). */
  telegraphMs: number | (() => number);
  /** 0 = instant. A function lets it change with the phase. */
  activeMs: number | (() => number);
  recoverMs: number | (() => number);
  minPhase?: number;
  /** How likely it is to be picked (default 1). A function is read each time the boss picks, so it can look at the situation (Varu close, crew alive...). */
  weight?: number | (() => number);
  /** Never picked on its own: it only runs when another attack chains into it (`chainTo`). */
  chainOnly?: boolean;
  /** Return false when the attack makes no sense right now (a charge with a wall in the way): it is skipped when picking. */
  canUse?(): boolean;
  /** Keep the boss's facing where the attack set it (dashes, charges). */
  lockFacing?: boolean;
  onTelegraph?(): void;
  /** Every frame of the warning. `msLeft` = time until the attack fires; `delta` in ms. */
  onTelegraphTick?(msLeft: number, delta: number): void;
  onFire(): void;
  onActive?(time: number, delta: number): void;
  onEnd?(): void;
}

const resolve = (value: number | (() => number)): number => (typeof value === 'function' ? value() : value);

/** What a boss is doing: entrance, circling, winding up, attacking, catching its breath, or stunned. */
export type BossMode = 'intro' | 'idle' | 'telegraph' | 'active' | 'recover' | 'stunned';

/**
 * Generic boss brain: attack state machine, two phases, armor, stun.
 * A new boss = a small subclass with `idleMove`, `cooldown` and `defineAttacks`.
 */
export abstract class Boss extends Enemy {
  readonly bossKey: BossType;
  /** Counters for the dev boss lab (time per mode, attacks used, damage). Cheap, always on. */
  readonly log: BossFightLog;
  /** Saying its last words (see `beginLastWords`). */
  private speaking = false;
  /** The last words were said (the next killing blow kills for real). */
  private lastWordsDone = false;
  /** Dev (boss lab): when set, the boss only ever picks this attack. */
  debugOnly: string | null = null;
  protected phase = 1;
  /** v173: the lights are off (every boss turns them off at `LIGHTS_OUT.atHp`). */
  private lightsOff = false;
  protected ctx!: EnemyContext;
  /** A boss sets this (ms) to glide to a stop instead of freezing in one frame. */
  protected brakeMs = 0;
  /** Length of the current frame in ms (at most 50), set at the start of `think`: smoothing code needs it. */
  protected frameMs = 16;
  /** While set, touching this boss hurts Varu for this much (charges and dashes). */
  protected contactOverride: number | null = null;
  /** A scripted multiplier on the damage she takes (Federer's towel break: free hits). 1 = normal. */
  protected damageMult = 1;

  /** The other drawings of this boss (back / front / side). A subclass fills it in its constructor with `setLooks`; null = one drawing only. */
  private looks: BossLooks | null = null;
  private lookNow: BossLook = 'front';
  private lookLeft = false;

  private mode: BossMode = 'intro';
  private modeUntil: number;
  private nextAttackAt = 0;
  private attackList: BossAttack[] | null = null;
  private current: BossAttack | null = null;
  private lastAttackId = '';
  /** Until this time a stun is shrugged off (`BOSS.stunGraceMs`): set when a stun runs out. */
  private stunImmuneUntil = 0;
  /** The next attack is already decided (a combo): it starts after a short gap, with no cooldown. */
  private comboNext: { id: string; gapMs: number } | null = null;
  private telegraphs: Telegraph[] = [];
  private stunStars: Phaser.GameObjects.Image[] = [];
  /** The weak-point window after a big attack (`openWeakPoint`): extra damage while it is open, and the ring that shows it. */
  private readonly weak: WeakPoint;

  protected constructor(scene: Phaser.Scene, x: number, y: number, key: BossType, texture: TexKey) {
    super(scene, x, y, key, texture);
    this.bossKey = key;
    this.log = new BossFightLog(key);
    this.modeUntil = gameClock.now + BOSS.introMs;
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.setCollideWorldBounds(true);
    this.setDepth(15);
    this.weak = new WeakPoint(scene, (this.stats.size * WEAK_POINT.marker.sizeFactor) / 2);

    const payload: BossSpawnedPayload = { boss: key, name: BOSS_TEXT[key].name, hp: this.hp, maxHp: this.maxHp };
    bus.emit(Events.BossSpawned, payload);
  }

  // ---- turning to show another side ---------------------------------------
  /** Give this boss its back / front / side drawings. Its own texture must be the `base` one. */
  protected setLooks(looks: BossLooks): void {
    this.looks = looks;
    this.lookNow = looks.base;
  }

  /** Called when the boss shows another drawing: rigs hide their loose layers when `look` is not the base one. `left` = the side drawing is mirrored. */
  protected onLookChanged(_look: BossLook, _left: boolean): void {}

  /** The way the boss looks right now, in radians: at Varu, or along its path while locked into a charge or dash. */
  private lookHeading(): number {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.current?.lockFacing && body.speed > ANIM.views.dashSpeedPx) return Math.atan2(body.velocity.y, body.velocity.x);
    return this.angleToPlayer();
  }

  /** Swap the body drawing to match the heading (and mirror the side one when it looks left). */
  private updateLook(): void {
    const looks = this.looks;
    if (!looks || !this.ctx) return;
    const heading = this.lookHeading();
    const next = lookFor(heading, this.lookNow);
    const left = next === 'side' ? Math.cos(heading) < 0 : false;
    if (next === this.lookNow && left === this.lookLeft) return;
    if (next !== this.lookNow) this.setTexture(...texArgs(looks[next]));
    this.lookNow = next;
    this.lookLeft = left;
    this.setFlipX(left);
    this.onLookChanged(next, left);
  }

  // ---- what each boss must provide ----------------------------------------
  protected abstract defineAttacks(): BossAttack[];
  /** Movement while not attacking. */
  protected abstract idleMove(ctx: EnemyContext): void;
  /** Pause between attacks, usually shorter in phase 2. */
  protected abstract cooldown(): number;
  /** Slows the boss to a stop while it winds up or recovers: at once when `brakeMs` is 0, otherwise a glide (the smaller, the shorter). `delta` in ms. */
  protected brake(delta: number): void {
    if (this.brakeMs <= 0) {
      this.setVelocity(0, 0);
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    const k = Math.exp(-Math.min(delta, 50) / this.brakeMs);
    const vx = body.velocity.x * k;
    const vy = body.velocity.y * k;
    this.setVelocity(Math.abs(vx) < 4 ? 0 : vx, Math.abs(vy) < 4 ? 0 : vy);
  }
  /** Which tier the lab counts the time in: 1, 2 or 3 (rage). A boss with a rage overrides it. */
  protected logTier(): number {
    return this.phase;
  }
  /** Called once when the boss drops below the phase 2 threshold. */
  protected onPhaseTwo(): void {}
  /** Called when a deflected ball stuns the boss, and when the stun runs out. Visual hooks only. */
  protected onStunned(): void {}
  protected onStunEnd(): void {}

  // ---- overrides that make a boss a boss ---------------------------------
  override get isBoss(): boolean {
    return true;
  }

  override get contactDamage(): number {
    if (this.speaking) return 0; // saying its last words: harmless
    return this.contactOverride ?? this.stats.contactDamage;
  }

  /** The boss took its killing blow and is talking (see `BOSS_LAST_WORDS`): it cannot be hurt and cannot hurt until `finishLastWords`. */
  get isSpeaking(): boolean {
    return this.speaking;
  }

  /** The killing blow is held back: 1 HP, no attack, no movement, and the scene that makes it talk is asked for. */
  private beginLastWords(): void {
    this.speaking = true;
    this.hp = 1;
    this.cancelAttack();
    this.clearTelegraphs();
    this.clearStars();
    this.mode = 'stunned';
    this.modeUntil = Infinity;
    this.setVelocity(0, 0);
    this.flash(0xffffff, 300);
    const health: BossHealthPayload = { hp: this.hp, maxHp: this.maxHp };
    bus.emit(Events.BossHealth, health);
    const words: BossLastWordsPayload = { boss: this.bossKey, x: this.x, y: this.y };
    bus.emit(Events.BossLastWords, words);
  }

  /** The scene is over (or skipped): now the boss really falls, through the normal kill (BossDefeated, K.O., slow-mo). */
  finishLastWords(): void {
    if (!this.speaking || !this.alive) return;
    this.speaking = false;
    this.lastWordsDone = true;
    this.applyHit(this.hp, this.x, this.y, 0);
  }

  protected override get damageFactor(): number {
    const weak = this.weak.isOpen(gameClock.now) ? WEAK_POINT.damageFactor[this.bossKey] : 1;
    return (this.mode === 'stunned' ? BOSS.stunnedDamageFactor : BOSS.armor[this.bossKey]) * this.damageMult * weak;
  }

  /**
   * Call right after the boss's big attack: for a short while every hit does extra damage (`WEAK_POINT`), a ring pulses on it and a word says so.
   * A synergy (Ochi de vultur) keeps the window open longer. Does nothing when `WEAK_POINT.enabled` is false.
   */
  protected openWeakPoint(): void {
    if (!WEAK_POINT.enabled || !this.alive) return;
    const ms = WEAK_POINT.windowMs[this.bossKey] * synergyEffect('weakWindow');
    this.weak.open(gameClock.now, ms, this.x, this.y);
    const payload: BossWeakPayload = { x: this.x, y: this.y, boss: this.bossKey, durationMs: ms };
    bus.emit(Events.BossWeakPoint, payload);
  }

  protected override get facesVelocity(): boolean {
    return false; // bosses face Varu, or lock facing during dashes
  }

  /** Bosses can't be shoved around mid-attack. */
  override applyKnockback(fromX: number, fromY: number, force: number, durationMs?: number): void {
    if (this.mode === 'telegraph' || this.mode === 'active') return;
    super.applyKnockback(fromX, fromY, force, durationMs);
  }

  /**
   * The weak point: a tennis ball Varu swats back stuns the boss and ignores its armor. Numbers per boss in `BOSS` (stun length,
   * damage, poise): a boss with `stunGraceMs` can be stunned once, then shrugs off the next ones for a while, and balls landing meanwhile
   * only do `deflectFollowUpFactor` of the damage (no stun-lock). `rallies` = how many times the ball was returned to Varu before it landed.
   */
  override onDeflectedHit(_damage: number, fromX: number, fromY: number, rallies = 0): void {
    if (!this.alive) return;
    const key = this.bossKey;
    const poised = BOSS.stunGraceMs[key] > 0 && (this.mode === 'stunned' || gameClock.now < this.stunImmuneUntil);
    if (!poised) this.stun(BOSS.stunMs[key]);
    // A ball that has already been through a rally hits harder (`BOSS.rallyBonus`: only Federer returns balls, the others always have 0).
    const rallyFactor = 1 + BOSS.rallyBonus[key] * rallies;
    const damage = BOSS.deflectedBallDamage[key] * rallyFactor * (poised ? BOSS.deflectFollowUpFactor[key] : 1);
    this.log.ballHit(damage);
    this.applyHit(damage, fromX, fromY, 0);
  }

  protected override applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
    if (this.speaking) return false; // last words: nothing touches it
    if (!this.lastWordsDone && BOSS_LAST_WORDS.enabled && CUTSCENE.enabled && effective >= this.hp) {
      this.beginLastWords(); // the blow that would kill it is held back; a scene lets it talk first
      return false;
    }
    this.log.bossHit(effective);
    const wasWeak = this.weak.isOpen(gameClock.now);
    if (wasWeak) {
      this.weak.hit(gameClock.now);
      const hit: BossWeakPayload = { x: this.x, y: this.y, boss: this.bossKey, durationMs: 0 };
      bus.emit(Events.BossWeakHit, hit);
    }
    const killed = super.applyHit(effective, fromX, fromY, knockback);
    if (killed) {
      const payload: BossDefeatedPayload = { boss: this.bossKey, x: this.x, y: this.y, final: this.bossKey === FINAL_BOSS };
      bus.emit(Events.BossDefeated, payload);
    } else {
      const payload: BossHealthPayload = { hp: this.hp, maxHp: this.maxHp };
      bus.emit(Events.BossHealth, payload);
    }
    return killed;
  }

  override tick(time: number, delta: number, ctx: EnemyContext): void {
    super.tick(time, delta, ctx);
    this.updateLook();
    this.weak.update(time, this.x, this.y);
    this.stunStars.forEach((star, i) => {
      const a = time / 260 + (i * Math.PI * 2) / 3;
      star.setPosition(this.x + Math.cos(a) * 46, this.y - this.stats.size * 0.45 + Math.sin(a) * 12).setAngle(time / 4);
    });
  }

  override destroy(fromScene?: boolean): void {
    this.clearTelegraphs();
    this.weak.destroy();
    this.stunStars.forEach((s) => s.destroy());
    this.stunStars = [];
    if (this.lightsOff && !fromScene) bus.emit(Events.LightsOut, { on: false });
    super.destroy(fromScene);
  }

  // ---- the state machine ---------------------------------------------------
  protected think(time: number, delta: number, ctx: EnemyContext): void {
    this.ctx = ctx;
    if (this.speaking) {
      this.setVelocity(0, 0); // no phase change, no attack while it waits for its scene
      return;
    }
    this.frameMs = Math.min(delta, 50);
    this.log.tick(this.mode, delta, this.logTier());
    this.attackList ??= this.defineAttacks();
    this.checkPhase(time);
    this.checkLightsOut();

    switch (this.mode) {
      case 'intro':
        this.idleMove(ctx);
        if (time >= this.modeUntil) this.enterIdle(time, 600);
        break;
      case 'idle':
        this.idleMove(ctx);
        if (time >= this.nextAttackAt) this.beginAttack(time);
        break;
      case 'telegraph':
        this.brake(delta);
        if (!this.current?.lockFacing) this.faceTarget();
        this.current?.onTelegraphTick?.(this.modeUntil - time, delta);
        if (time >= this.modeUntil) this.fireAttack(time);
        break;
      case 'active':
        this.current?.onActive?.(time, delta);
        if (time >= this.modeUntil) this.endAttack(time);
        break;
      case 'recover':
        this.brake(delta);
        if (time >= this.modeUntil) this.enterIdle(time, this.comboNext ? 0 : this.cooldown() * this.mercyStretch() * getDifficulty().bossPace);
        break;
      case 'stunned':
        this.setVelocity(0, 0);
        if (time >= this.modeUntil) {
          this.clearStars();
          this.onStunEnd();
          this.stunImmuneUntil = time + BOSS.stunGraceMs[this.bossKey];
          this.enterIdle(time, 500);
        }
        break;
    }
  }

  /** 1 normally; a little more while Varu is nearly dead (`BOSS.mercy`), so the pause between attacks gives him room to breathe. */
  private mercyStretch(): number {
    const player = this.ctx.player;
    if (player.hp >= player.maxHp * BOSS.mercy.belowHp) return 1;
    return 1 + BOSS.mercy.cooldownStretch[this.bossKey];
  }

  private enterIdle(time: number, delayMs: number): void {
    this.mode = 'idle';
    this.nextAttackAt = time + delayMs;
  }

  private beginAttack(time: number): string {
    const comboId = this.comboNext?.id;
    this.comboNext = null;
    const usable = this.attackList!.filter((a) => !a.chainOnly && (a.minPhase ?? 1) <= this.phase && (a.canUse?.() ?? true));
    const fresh = usable.filter((a) => a.id !== this.lastAttackId);
    const pool = fresh.length > 0 ? fresh : usable;
    const total = pool.reduce((sum, a) => sum + resolve(a.weight ?? 1), 0);
    let roll = Math.random() * total;
    let chosen = pool[0]!;
    for (const a of pool) {
      roll -= resolve(a.weight ?? 1);
      if (roll <= 0) {
        chosen = a;
        break;
      }
    }
    const combo = comboId ? this.attackList!.find((a) => a.id === comboId) : undefined;
    if (combo) chosen = combo;
    const only = this.debugOnly ? this.attackList!.find((a) => a.id === this.debugOnly && (a.canUse?.() ?? true)) : undefined;
    if (only && !combo) chosen = only; // dev: the boss repeats the one attack under test

    this.current = chosen;
    this.lastAttackId = chosen.id;
    this.mode = 'telegraph';
    this.modeUntil = time + resolve(chosen.telegraphMs);
    this.shout(BOSS_TEXT[this.bossKey].attacks[chosen.id] ?? '');
    this.log.attackStarted(chosen.id);
    chosen.onTelegraph?.();
    return chosen.id;
  }

  private fireAttack(time: number): void {
    const attack = this.current!;
    this.mode = 'active';
    const active = typeof attack.activeMs === 'function' ? attack.activeMs() : attack.activeMs;
    this.modeUntil = time + active;
    attack.onFire();
    if (active <= 0) this.endAttack(time);
  }

  private endAttack(time: number): void {
    this.current?.onEnd?.();
    this.contactOverride = null;
    this.setVelocity(0, 0);
    this.mode = 'recover';
    this.modeUntil = time + (this.comboNext ? this.comboNext.gapMs : resolve(this.current?.recoverMs ?? 800) * getDifficulty().bossPace); // harder = she is back sooner (the warnings do not change)
    this.current = null;
  }

  /** Drop everything the boss was doing (stun, phase change). */
  private cancelAttack(): void {
    this.clearTelegraphs();
    this.contactOverride = null;
    this.current = null;
    this.comboNext = null;
    this.setVelocity(0, 0);
  }

  /** Low on health the boss turns the lights off for good (`Blackout` draws the dark, `DayNight` raises the lamps); `destroy` turns them back on. */
  private checkLightsOut(): void {
    if (this.lightsOff || this.hp <= 0 || this.hp > this.maxHp * LIGHTS_OUT.atHp[this.bossKey]) return;
    this.lightsOff = true;
    bus.emit(Events.LightsOut, { on: true });
    this.shout(LIGHTS_OUT_LINES[this.bossKey]);
  }

  private checkPhase(time: number): void {
    if (this.phase !== 1 || this.hp > this.maxHp * BOSS.phase2At) return;
    this.phase = 2;
    this.cancelAttack();
    this.clearStars();
    this.stunImmuneUntil = Math.max(this.stunImmuneUntil, time + BOSS.stunGraceMs[this.bossKey]); // a stun cut short by the phase change still counts
    this.mode = 'recover';
    this.modeUntil = time + BOSS.phasePauseMs;
    this.flash(0xffd166, 250);
    const payload: BossPhasePayload = { phase: 2, text: BOSS_TEXT[this.bossKey].phase2 };
    bus.emit(Events.BossPhase, payload);
    this.onPhaseTwo();
  }

  private stun(ms: number): void {
    this.log.stunned();
    this.cancelAttack();
    this.mode = 'stunned';
    this.modeUntil = gameClock.now + ms;
    this.flash(0xfff2a0, 150);
    this.onStunned();
    if (this.stunStars.length === 0) {
      for (let i = 0; i < 3; i++) {
        this.stunStars.push(this.scene.add.image(this.x, this.y, ...texArgs(Tex.Star)).setDisplaySize(22, 22).setDepth(60));
      }
    }
    const stunned: BossStunnedPayload = { x: this.x, y: this.y, boss: this.bossKey };
    bus.emit(Events.BossStunned, stunned);
  }

  private clearStars(): void {
    this.stunStars.forEach((s) => s.destroy());
    this.stunStars = [];
  }

  private clearTelegraphs(): void {
    this.telegraphs.forEach((t) => t.destroy());
    this.telegraphs = [];
  }

  // ---- dev: the boss lab (debug card) -----------------------------------------
  /** What the boss is doing right now. */
  get debugMode(): BossMode {
    return this.mode;
  }

  /** The attack the boss is in, or the last one it started (a ball or a heart can still land after the attack ended). */
  get debugAttackLabel(): string {
    return this.current?.id ?? this.lastAttackId;
  }

  /**
   * Starts this attack right now (null = a normal pick), dropping whatever the boss was doing and skipping the entrance.
   * Returns the id that started, or null when the boss has no such attack (or it cannot be used from here).
   */
  debugStartAttack(id: string | null): string | null {
    if (!this.alive || !this.ctx) return null;
    this.attackList ??= this.defineAttacks();
    if (id !== null && !this.attackList.some((a) => a.id === id)) return null;
    this.cancelAttack();
    const saved = this.debugOnly;
    this.debugOnly = id;
    const started = this.beginAttack(gameClock.now);
    this.debugOnly = saved;
    return id === null || started === id ? started : null;
  }

  /** Stuns the boss as a returned ball would. */
  debugStun(): void {
    if (this.alive) this.stun(BOSS.stunMs[this.bossKey]);
  }

  /** Sets the boss's health to this share of the maximum (at least 1 HP): 0.5 = phase 2, 0.25 = rage. */
  debugSetHp(share: number): void {
    if (!this.alive) return;
    this.hp = Math.max(1, Math.min(this.maxHp, Math.floor(this.maxHp * share)));
    const payload: BossHealthPayload = { hp: this.hp, maxHp: this.maxHp };
    bus.emit(Events.BossHealth, payload);
  }

  // ---- helpers for the attacks ---------------------------------------------
  protected get attackingId(): string | null {
    return this.mode === 'active' ? (this.current?.id ?? null) : null;
  }

  /** Call from an attack's `onFire` or `onEnd`: the attack with this id follows right after a short gap (a combo), with no cooldown. */
  protected chainTo(id: string, gapMs = 250): void {
    this.comboNext = { id, gapMs };
  }

  /** What the boss is doing right now (subclasses that react to the world, like Federer returning balls, read it). */
  protected get bossMode(): BossMode {
    return this.mode;
  }

  /** When the next attack may start (game ms). Only meaningful while the boss is idle (circling): a boss that hops away first reads it. */
  protected get attackDueAt(): number {
    return this.nextAttackAt;
  }

  /**
   * A scripted pause: drop whatever she was doing and stand still for `ms` (like recovering), then `thenId` runs at once with no cooldown
   * (if given). A stun cancels it like any other plan: the boss then has to ask for it again when the stun ends.
   */
  protected interlude(ms: number, thenId?: string): void {
    this.cancelAttack();
    this.mode = 'recover';
    this.modeUntil = gameClock.now + ms;
    if (thenId) this.comboNext = { id: thenId, gapMs: 0 };
  }

  /** True while he is circling or catching his breath: not winding up, firing or stunned (a safe moment to interrupt him). */
  protected get isBetweenAttacks(): boolean {
    return this.mode === 'idle' || this.mode === 'recover';
  }

  /** Push the next attack back so it does not start before `ms` from now (only matters while the boss is circling). */
  protected delayAttack(ms: number): void {
    this.nextAttackAt = Math.max(this.nextAttackAt, gameClock.now + ms);
  }

  protected angleToPlayer(): number {
    return Phaser.Math.Angle.Between(this.x, this.y, this.ctx.player.x, this.ctx.player.y);
  }

  /**
   * The body rotation for looking along `heading` (radians). Bosses are big drawings facing UP, so turning them all the way
   * round shows them upside down whenever Varu is below. Instead they stay upright and only lean toward the side of the
   * heading (up = 0, right = +maxLeanDeg, down = 0 again, left = -maxLeanDeg), smoothly.
   */
  protected uprightRotation(heading: number): number {
    const turn = Phaser.Math.Angle.Wrap(heading + Math.PI / 2);
    return Math.sin(turn) * Phaser.Math.DegToRad(BOSS.maxLeanDeg);
  }

  protected faceTarget(rate = 0.07): void {
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this.uprightRotation(this.angleToPlayer()), rate);
  }

  /** Keep a warning marker so it can be cancelled if the boss is stunned. */
  protected track(telegraph: Telegraph): Telegraph {
    this.telegraphs.push(telegraph);
    return telegraph;
  }

  protected shout(text: string): void {
    if (!text) return;
    const payload: ShoutPayload = { x: this.x, y: this.y - this.stats.size * 0.6, text };
    bus.emit(Events.BossShout, payload);
  }

  /** Call in cats around the boss (they appear with a puff of smoke). */
  protected summon(type: EnemyType, count: number, radius: number): void {
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      const pos = clampToArena(this.x + Math.cos(a) * radius, this.y + Math.sin(a) * radius, 40);
      const payload: SpawnEnemyPayload = { type, x: pos.x, y: pos.y };
      bus.emit(Events.SpawnEnemy, payload);
    }
  }

  /** Strafe sideways around Varu while keeping roughly `distance` away. */
  protected orbit(distance: number, strafeDir: number): void {
    const toPlayer = this.angleToPlayer();
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.ctx.player.x, this.ctx.player.y);
    const speed = this.stats.speed;
    let vx = Math.cos(toPlayer + (Math.PI / 2) * strafeDir) * speed * 0.55;
    let vy = Math.sin(toPlayer + (Math.PI / 2) * strafeDir) * speed * 0.55;
    if (dist > distance + 50) {
      vx += Math.cos(toPlayer) * speed;
      vy += Math.sin(toPlayer) * speed;
    } else if (dist < distance - 50) {
      vx -= Math.cos(toPlayer) * speed;
      vy -= Math.sin(toPlayer) * speed;
    }
    this.setVelocity(vx, vy);
    this.faceTarget();
  }
}
