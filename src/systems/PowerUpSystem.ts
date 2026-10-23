/** @file Timed buffs (best value wins) and the laser pointer dot cats chase. */
import Phaser from 'phaser';
import { WORLD } from '../config/arena';
import { BUFFS, LASER, type BuffKind } from '../config/balance';
import { stackRule } from '../config/buffStacks';
import { bus, Events, type BuffEndedPayload, type BuffInfo, type BuffsPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';
import { gameClock } from '../core/clock';
import { beltUpgradeValue } from '../core/beltUpgrades';

/**
 * Timed buffs. Several can be active; for each stat the BEST active value wins
 * (so energy drink + golden belt don't multiply into something absurd).
 * Also owns the laser pointer: while active, `lure` is the red dot that cats chase.
 */
export class PowerUpSystem {
  private readonly endsAt = new Map<BuffKind, number>();
  /** How long each running buff was started for (the HUD ring is remaining / this; a short override must not push it above 100%). */
  private readonly lengthMs = new Map<BuffKind, number>();
  /** Stacks of the running buffs that can stack (config/buffStacks.ts). Absent = 1. */
  private readonly stacks = new Map<BuffKind, number>();
  /** Scratch lists for `update` (runs every frame: no new arrays, see docs/PERFORMANCE.md rule 4). Cleared after each use. */
  private readonly endedKinds: BuffKind[] = [];
  private readonly endedStacks: number[] = [];
  private readonly dot: Phaser.GameObjects.Graphics;
  private readonly lurePoint = new Phaser.Math.Vector2();
  private dotDrawn = false;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
  ) {
    this.dot = scene.add.graphics().setDepth(35);
  }

  /** The laser dot while the laser is active, otherwise null. */
  get lure(): Phaser.Types.Math.Vector2Like | null {
    return this.endsAt.has('laser') ? this.lurePoint : null;
  }

  /** How many GOOD buffs are active right now (milk, Monster, golden belt, laser, umbrella, scooter). The bad ones do not count. Greed (config/curses.ts) reads it. */
  get goodCount(): number {
    let n = 0;
    for (const kind of this.endsAt.keys()) if (!BUFFS[kind].bad) n += 1;
    return n;
  }

  /** True while this buff is running. */
  has(kind: BuffKind): boolean {
    return this.endsAt.has(kind);
  }

  /** The stack of a running buff: 0 when it is not running, 1 when it does not stack. */
  stackOf(kind: BuffKind): number {
    return this.endsAt.has(kind) ? (this.stacks.get(kind) ?? 1) : 0;
  }

  /**
   * Start or refresh a buff. `durationMs` overrides `BUFFS[kind].durationMs` (the costly rewards give a SHORT snail or emo).
   * The end time never moves earlier: a 2 s snail added to a running 6 s snail changes nothing.
   * A buff that stacks (`BUFF_STACKS`) gains one stack when it is added while it still runs (up to its max), and a new run starts at 1.
   * Returns the stack after the call (1 for a buff that does not stack, 0 when nothing changed).
   */
  addBuff(kind: BuffKind, durationMs: number = BUFFS[kind].durationMs): number {
    const end = gameClock.now + durationMs;
    const running = this.endsAt.get(kind);
    if (running !== undefined && running >= end) return 0;
    const rule = stackRule(kind);
    if (rule) this.stacks.set(kind, running === undefined ? 1 : Math.min(rule.max, (this.stacks.get(kind) ?? 1) + 1));
    this.endsAt.set(kind, end);
    this.lengthMs.set(kind, durationMs);
    this.applyStats();
    this.emit();
    return this.stacks.get(kind) ?? 1;
  }

  /** Dev helper (debug card): makes a buff run out NOW by itself (starts it for 1 ms if it was not running), so `BuffEnded` and its costs fire as in a real run. */
  debugEnd(kind: BuffKind): void {
    this.addBuff(kind, 1);
    this.endsAt.set(kind, gameClock.now);
  }

  /** Dev helper (debug card): ends every BAD buff at once. */
  clearBad(): void {
    let any = false;
    for (const kind of [...this.endsAt.keys()]) {
      if (!BUFFS[kind].bad) continue;
      this.endsAt.delete(kind);
      this.lengthMs.delete(kind);
      this.stacks.delete(kind);
      any = true;
    }
    if (!any) return;
    this.applyStats();
    this.emit();
  }

  update(time: number, input: InputSource): void {
    const ended = this.endedKinds;
    const endedStacks = this.endedStacks;
    for (const [kind, end] of this.endsAt) {
      if (time >= end) {
        endedStacks.push(this.stacks.get(kind) ?? 1);
        this.endsAt.delete(kind);
        this.lengthMs.delete(kind);
        this.stacks.delete(kind);
        ended.push(kind);
      }
    }
    if (ended.length > 0) {
      this.applyStats();
      this.emit();
      for (let i = 0; i < ended.length; i++) {
        const payload: BuffEndedPayload = { kind: ended[i], stacks: endedStacks[i] };
        bus.emit(Events.BuffEnded, payload); // after the stats are right: a listener may add a buff at once (the golden belt goo)
      }
      ended.length = 0;
      endedStacks.length = 0;
    }
    this.updateLaser(time, input);
  }

  /** The permanent belt upgrades changed (a pick between waves): put the new numbers on Varu. */
  refreshStats(): void {
    this.applyStats();
  }

  private applyStats(): void {
    // Good buffs: the BEST value per stat wins. Bad ones (snail, dumbbell): the WORST wins. Then the two multiply,
    // so milk (x1.45) while the snail crawls (x0.55) comes out a little under normal speed.
    const good = { speed: 1, damage: 1, range: 1 };
    const bad = { speed: 1, damage: 1, range: 1 };
    for (const kind of this.endsAt.keys()) {
      const b = BUFFS[kind];
      const isBad = b.bad === true;
      const pickBest = (now: number, v: number | undefined): number => (v === undefined ? now : isBad ? Math.min(now, v) : Math.max(now, v));
      const side = isBad ? bad : good;
      side.speed = pickBest(side.speed, b.speed);
      side.damage = pickBest(side.damage, this.damageOf(kind, b.damage));
      side.range = pickBest(side.range, b.range);
    }
    // Bad stats where HIGHER is worse (cooldowns, size): the highest wins.
    const worse = { swingCooldown: 1, specialCooldown: 1, size: 1 };
    for (const kind of this.endsAt.keys()) {
      const b = BUFFS[kind];
      worse.swingCooldown = Math.max(worse.swingCooldown, b.swingCooldown ?? 1);
      worse.specialCooldown = Math.max(worse.specialCooldown, b.specialCooldown ?? 1);
      worse.size = Math.max(worse.size, b.size ?? 1);
    }
    // Permanent belt upgrades (picked between waves, core/beltUpgrades.ts) multiply on top of the timed buffs.
    this.player.swingCooldownMultiplier = worse.swingCooldown * beltUpgradeValue('quick');
    this.player.specialCooldownMultiplier = worse.specialCooldown * beltUpgradeValue('tornado');
    this.player.sizeMultiplier = worse.size;
    this.player.emo = this.endsAt.has('emo');
    this.player.speedMultiplier = good.speed * bad.speed;
    this.player.upgradeDamage = beltUpgradeValue('heavy');
    this.player.damageMultiplier = good.damage * bad.damage * this.player.upgradeDamage;
    this.player.rangeMultiplier = good.range * bad.range * beltUpgradeValue('long');
    this.player.knockbackMultiplier = beltUpgradeValue('knock');
    this.player.goldenBelt = this.endsAt.has('goldenBelt');
    this.player.umbrella = this.endsAt.has('umbrella');
    this.player.scooter = this.endsAt.has('scooter');
    this.player.milkTrail = this.endsAt.has('lapte');
    this.player.energyTrail = this.endsAt.has('monster');
    this.player.rustyFlakes = this.endsAt.has('rusty');
  }

  /** The belt damage multiplier of a running buff: the stack table when it stacks, otherwise `BUFFS[kind].damage`. */
  private damageOf(kind: BuffKind, plain: number | undefined): number | undefined {
    const rule = stackRule(kind);
    if (!rule) return plain;
    const level = Math.min(rule.max, this.stacks.get(kind) ?? 1);
    return rule.damage[level - 1] ?? plain;
  }

  private emit(): void {
    const now = gameClock.now;
    const buffs: BuffInfo[] = [...this.endsAt].map(([kind, end]) => ({
      kind,
      remainingMs: Math.max(0, end - now),
      durationMs: this.lengthMs.get(kind) ?? BUFFS[kind].durationMs,
      stacks: this.stacks.get(kind) ?? 1,
    }));
    const payload: BuffsPayload = { buffs };
    bus.emit(Events.BuffsChanged, payload);
  }

  /** The dot follows the cursor. Placeholder visual: a pulsing red circle. */
  private updateLaser(time: number, input: InputSource): void {
    input.setLaserAiming(this.lure !== null);
    if (!this.lure) {
      if (this.dotDrawn) {
        this.dot.clear();
        this.dotDrawn = false;
      }
      return;
    }
    this.lurePoint.set(
      Phaser.Math.Clamp(input.aimPoint.x, 0, WORLD.width),
      Phaser.Math.Clamp(input.aimPoint.y, 0, WORLD.height),
    );
    const pulse = 1 + 0.25 * Math.sin(time / 90);
    this.dot.clear();
    this.dot.fillStyle(0xff2222, 0.22).fillCircle(this.lurePoint.x, this.lurePoint.y, LASER.dotRadius * 2.6 * pulse);
    this.dot.fillStyle(0xff2222, 1).fillCircle(this.lurePoint.x, this.lurePoint.y, LASER.dotRadius);
    this.dot.fillStyle(0xffffff, 0.9).fillCircle(this.lurePoint.x - 2, this.lurePoint.y - 2, 3);
    this.dotDrawn = true;
  }
}
