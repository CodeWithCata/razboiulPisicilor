/** @file Bad luck gate: every random curse asks here (cooldown, wave ramp, mercy), then Varu gets one of the six bad pickups. Also: cats that curse him on hit. */
import Phaser from 'phaser';
import { type BadKind } from '../config/balance';
import { CAT_HIT_CURSES, CURSE } from '../config/curses';
import { gameClock } from '../core/clock';
import { getDifficulty } from '../core/difficulty';
import { Events, listen, type BallLandedPayload, type CurseSpec, type CurseZonePayload, type PlayerHurtPayload } from '../core/events';
import type { Player } from '../entities/Player';
import type { WaveSystem } from './WaveSystem';

/**
 * The one place that decides IF a curse may happen. A source (cats on hit now; fan drops, bosses, barrels... later) calls `roll(chance, kind)`;
 * it fails when the curse is off, the wave is too early, Varu is low on health (mercy), or the last curse was less than `CURSE.cooldownMs` ago.
 * The chance is multiplied by the wave ramp. The curse itself is given by `give` (GameScene: the bad-pickup show + `applyPickup`, the same
 * path as the question mark). A bad pickup from the question mark also starts the cooldown (it is heard on `Events.BadPickup`).
 */
export class CurseSystem {
  /** Game time of the last curse (-Infinity = none yet). */
  private lastAt = -Infinity;
  /** Dev only (debug card): every random `roll` succeeds (the gate still applies: cooldown, wave, mercy). */
  debugSure = false;

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly waves: WaveSystem,
    private readonly give: (kind: BadKind, durationMs?: number) => void,
    /** How many GOOD buffs are active (`PowerUpSystem.goodCount`): greed makes random curses likelier. */
    private readonly goodBuffs: () => number,
    /** Floats a word in the world (Effects.floatText): the boss's funny line. */
    private readonly say: (x: number, y: number, text: string, color: string, size: number) => void,
  ) {
    const off = [
      listen(Events.BadPickup, () => this.mark()),
      listen<PlayerHurtPayload>(Events.PlayerHurt, ({ source }) => this.onHit(source)),
      listen<CurseZonePayload>(Events.CurseZone, ({ x, y, radius, curse }) => this.onZone(x, y, radius, curse)),
      listen<BallLandedPayload>(Events.BallLanded, ({ x, y, radius, curse }) => curse && this.onZone(x, y, radius, curse)),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** True when a random curse may be rolled right now. */
  get allowed(): boolean {
    if (!CURSE.enabled || !this.player.alive) return false;
    if (this.waves.wave < CURSE.firstWave) return false;
    if (this.player.hp / this.player.maxHp < CURSE.mercyHpShare) return false;
    return gameClock.now - this.lastAt >= CURSE.cooldownMs;
  }

  /** Seconds left of the cooldown (0 = ready). The debug card shows it. */
  get cooldownLeftSec(): number {
    return Math.max(0, Math.ceil((CURSE.cooldownMs - (gameClock.now - this.lastAt)) / 1000));
  }

  /** Dev only: forget the last curse, so the cooldown is over at once. */
  debugResetCooldown(): void {
    this.lastAt = -Infinity;
  }

  /** True once curses exist at all in this run (the first cursed wave has started): cursed barrels only appear from then on. */
  get waveOpen(): boolean {
    return CURSE.enabled && this.waves.wave >= CURSE.firstWave;
  }

  /** Greed: more than 1 while `CURSE.greed.minBuffs` or more good buffs are active, otherwise 1. */
  get greedFactor(): number {
    return this.goodBuffs() >= CURSE.greed.minBuffs ? CURSE.greed.multiplier : 1;
  }

  /** 0..1: how much of its base chance a roll keeps in this wave (small at the first cursed wave, 1 from `ramp.fullWave` on). */
  get waveFactor(): number {
    const { startShare, fullWave } = CURSE.ramp;
    const progress = Phaser.Math.Clamp((this.waves.wave - CURSE.firstWave) / Math.max(1, fullWave - CURSE.firstWave), 0, 1);
    return startShare + (1 - startShare) * progress;
  }

  /** Roll `chance` (0..1, before the wave ramp and greed). On success Varu gets `kind` (for `durationMs` if given, else its normal time) and the cooldown starts. Returns true when he did. */
  roll(chance: number, kind: BadKind, durationMs?: number): boolean {
    if (!this.allowed || (!this.debugSure && Math.random() >= chance * this.waveFactor * this.greedFactor * getDifficulty().curses)) return false;
    this.mark();
    this.give(kind, durationMs);
    return true;
  }

  /** A curse that was already announced and dodged or not (the fans' drop landed on him): no roll, no checks, it just happens and starts the cooldown. */
  force(kind: BadKind, durationMs?: number): void {
    if (!this.player.alive) return;
    this.mark();
    this.give(kind, durationMs);
  }

  /**
   * A curse that belongs to the STATE of a wave (rain, fog, Marți 13: `WeatherCurses`). Not a roll: no chance, no greed, and it ignores the
   * cooldown, but it still respects "no curses before the first cursed wave" and mercy (low health). It starts the cooldown, so random
   * curses wait after it. Returns true when Varu got it.
   */
  forceWaveState(kind: BadKind, durationMs?: number): boolean {
    if (!CURSE.enabled || !this.player.alive) return false;
    if (this.waves.wave < CURSE.firstWave) return false;
    if (this.player.hp / this.player.maxHp < CURSE.mercyHpShare) return false;
    this.force(kind, durationMs);
    return true;
  }

  /** A boss ring went off (or a cursed ball landed): Varu inside it is cursed, if the gate allows it right now (cooldown, wave, mercy). */
  private onZone(x: number, y: number, radius: number, curse: CurseSpec): void {
    if (!this.allowed) return;
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > radius + this.player.hitRadius) return;
    this.say(this.player.x, this.player.y - CURSE.boss.lineLiftPx, curse.line, CURSE.boss.lineColor, CURSE.boss.lineSize);
    this.force(curse.kind);
  }

  /** Starts the cooldown now. */
  private mark(): void {
    this.lastAt = gameClock.now;
  }

  /** Varu was hurt: a cat (or a thrown heart, or a blast) listed in `CAT_HIT_CURSES` may curse him. */
  private onHit(source: string | undefined): void {
    const kind = source === undefined ? undefined : CAT_HIT_CURSES[source];
    if (kind) this.roll(CURSE.catHitChance, kind);
  }
}
