/** @file Boss state machine: intro -> idle -> telegraph -> active -> recover, phase 2, stun. Subclasses define attacks. */
import Phaser from 'phaser';
import { Tex, type TexKey } from '../../assets/keys';
import { clampToArena } from '../../core/arena';
import { type BossType, type EnemyType } from '../../config/balance';
import { BOSS, FINAL_BOSS } from '../../config/bosses';
import { BOSS_TEXT } from '../../content/bosses';
import {
  bus,
  Events,
  type BossDefeatedPayload,
  type BossHealthPayload,
  type BossPhasePayload,
  type BossSpawnedPayload,
  type ShoutPayload,
  type SpawnEnemyPayload,
} from '../../core/events';
import type { Telegraph } from '../../systems/Telegraph';
import { Enemy, type EnemyContext } from '../Enemy';
import { gameClock } from '../../core/clock';

/**
 * One boss attack. The Boss class runs it through:
 *   telegraph (warning) -> active (the attack happens) -> recover (vulnerable pause)
 */
export interface BossAttack {
  id: string; // also the key of its shout in content/bosses.ts
  telegraphMs: number;
  /** 0 = instant. A function lets it change with the phase. */
  activeMs: number | (() => number);
  recoverMs: number;
  minPhase?: number;
  weight?: number;
  /** Keep the boss's facing where the attack set it (dashes, charges). */
  lockFacing?: boolean;
  onTelegraph?(): void;
  onFire(): void;
  onActive?(time: number, delta: number): void;
  onEnd?(): void;
}

type Mode = 'intro' | 'idle' | 'telegraph' | 'active' | 'recover' | 'stunned';

/**
 * Generic boss brain: attack state machine, two phases, armor, stun.
 * A new boss = a small subclass with `idleMove`, `cooldown` and `defineAttacks`.
 */
export abstract class Boss extends Enemy {
  readonly bossKey: BossType;
  protected phase = 1;
  protected ctx!: EnemyContext;
  /** While set, touching this boss hurts Varu for this much (charges and dashes). */
  protected contactOverride: number | null = null;

  private mode: Mode = 'intro';
  private modeUntil: number;
  private nextAttackAt = 0;
  private attackList: BossAttack[] | null = null;
  private current: BossAttack | null = null;
  private lastAttackId = '';
  private telegraphs: Telegraph[] = [];
  private stunStars: Phaser.GameObjects.Image[] = [];

  protected constructor(scene: Phaser.Scene, x: number, y: number, key: BossType, texture: TexKey) {
    super(scene, x, y, key, texture);
    this.bossKey = key;
    this.modeUntil = gameClock.now + BOSS.introMs;
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.setCollideWorldBounds(true);
    this.setDepth(15);

    const payload: BossSpawnedPayload = { boss: key, name: BOSS_TEXT[key].name, hp: this.hp, maxHp: this.maxHp };
    bus.emit(Events.BossSpawned, payload);
  }

  // ---- what each boss must provide ----------------------------------------
  protected abstract defineAttacks(): BossAttack[];
  /** Movement while not attacking. */
  protected abstract idleMove(ctx: EnemyContext): void;
  /** Pause between attacks, usually shorter in phase 2. */
  protected abstract cooldown(): number;
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
    return this.contactOverride ?? this.stats.contactDamage;
  }

  protected override get damageFactor(): number {
    return this.mode === 'stunned' ? BOSS.stunnedDamageFactor : BOSS.armor[this.bossKey];
  }

  protected override get facesVelocity(): boolean {
    return false; // bosses face Varu, or lock facing during dashes
  }

  /** Bosses can't be shoved around mid-attack. */
  override applyKnockback(fromX: number, fromY: number, force: number, durationMs?: number): void {
    if (this.mode === 'telegraph' || this.mode === 'active') return;
    super.applyKnockback(fromX, fromY, force, durationMs);
  }

  /** The weak point: a deflected tennis ball stuns the boss and ignores its armor. */
  override onDeflectedHit(damage: number, fromX: number, fromY: number): void {
    if (!this.alive) return;
    this.stun(BOSS.stunMs);
    this.applyHit(damage, fromX, fromY, 0);
  }

  protected override applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
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
    this.stunStars.forEach((star, i) => {
      const a = time / 260 + (i * Math.PI * 2) / 3;
      star.setPosition(this.x + Math.cos(a) * 46, this.y - this.stats.size * 0.45 + Math.sin(a) * 12).setAngle(time / 4);
    });
  }

  override destroy(fromScene?: boolean): void {
    this.clearTelegraphs();
    this.stunStars.forEach((s) => s.destroy());
    this.stunStars = [];
    super.destroy(fromScene);
  }

  // ---- the state machine ---------------------------------------------------
  protected think(time: number, delta: number, ctx: EnemyContext): void {
    this.ctx = ctx;
    this.attackList ??= this.defineAttacks();
    this.checkPhase(time);

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
        this.setVelocity(0, 0);
        if (!this.current?.lockFacing) this.faceTarget();
        if (time >= this.modeUntil) this.fireAttack(time);
        break;
      case 'active':
        this.current?.onActive?.(time, delta);
        if (time >= this.modeUntil) this.endAttack(time);
        break;
      case 'recover':
        this.setVelocity(0, 0);
        if (time >= this.modeUntil) this.enterIdle(time, this.cooldown());
        break;
      case 'stunned':
        this.setVelocity(0, 0);
        if (time >= this.modeUntil) {
          this.clearStars();
          this.onStunEnd();
          this.enterIdle(time, 500);
        }
        break;
    }
  }

  private enterIdle(time: number, delayMs: number): void {
    this.mode = 'idle';
    this.nextAttackAt = time + delayMs;
  }

  private beginAttack(time: number): void {
    const usable = this.attackList!.filter((a) => (a.minPhase ?? 1) <= this.phase);
    const fresh = usable.filter((a) => a.id !== this.lastAttackId);
    const pool = fresh.length > 0 ? fresh : usable;
    const total = pool.reduce((sum, a) => sum + (a.weight ?? 1), 0);
    let roll = Math.random() * total;
    let chosen = pool[0]!;
    for (const a of pool) {
      roll -= a.weight ?? 1;
      if (roll <= 0) {
        chosen = a;
        break;
      }
    }

    this.current = chosen;
    this.lastAttackId = chosen.id;
    this.mode = 'telegraph';
    this.modeUntil = time + chosen.telegraphMs;
    this.shout(BOSS_TEXT[this.bossKey].attacks[chosen.id] ?? '');
    chosen.onTelegraph?.();
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
    this.modeUntil = time + (this.current?.recoverMs ?? 800);
    this.current = null;
  }

  /** Drop everything the boss was doing (stun, phase change). */
  private cancelAttack(): void {
    this.clearTelegraphs();
    this.contactOverride = null;
    this.current = null;
    this.setVelocity(0, 0);
  }

  private checkPhase(time: number): void {
    if (this.phase !== 1 || this.hp > this.maxHp * BOSS.phase2At) return;
    this.phase = 2;
    this.cancelAttack();
    this.clearStars();
    this.mode = 'recover';
    this.modeUntil = time + BOSS.phasePauseMs;
    this.flash(0xffd166, 250);
    const payload: BossPhasePayload = { phase: 2, text: BOSS_TEXT[this.bossKey].phase2 };
    bus.emit(Events.BossPhase, payload);
    this.onPhaseTwo();
  }

  private stun(ms: number): void {
    this.cancelAttack();
    this.mode = 'stunned';
    this.modeUntil = gameClock.now + ms;
    this.flash(0xfff2a0, 150);
    this.onStunned();
    if (this.stunStars.length === 0) {
      for (let i = 0; i < 3; i++) {
        this.stunStars.push(this.scene.add.image(this.x, this.y, Tex.Star).setDisplaySize(22, 22).setDepth(60));
      }
    }
    bus.emit(Events.BossStunned, { x: this.x, y: this.y });
  }

  private clearStars(): void {
    this.stunStars.forEach((s) => s.destroy());
    this.stunStars = [];
  }

  private clearTelegraphs(): void {
    this.telegraphs.forEach((t) => t.destroy());
    this.telegraphs = [];
  }

  // ---- helpers for the attacks ---------------------------------------------
  protected get attackingId(): string | null {
    return this.mode === 'active' ? (this.current?.id ?? null) : null;
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
