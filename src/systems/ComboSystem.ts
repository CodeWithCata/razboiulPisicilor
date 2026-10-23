/** @file The kill combo: counts kills in a row, gives the score multiplier, breaks on a hit or when the time bar runs out. */
import Phaser from 'phaser';
import { COMBO, comboTier } from '../config/combo';
import { gameClock } from '../core/clock';
import { getDifficulty } from '../core/difficulty';
import { bus, Events, listen, type ComboPayload } from '../core/events';

/**
 * Owns the chain. Every kill adds one and refills the bar (`COMBO.windowMs` x the difficulty's `comboWindow`). A hit on Varu or an empty bar
 * breaks it. A dodge roll that saves him gives time back. While no wave is running the bar waits. The HUD (ui/ComboMeter.ts) only listens
 * to `Events.ComboChanged`; `ScoreSystem` reads `multiplier`.
 */
export class ComboSystem {
  count = 0;
  /** Longest chain of this run. */
  best = 0;
  private remainingMs = 0;
  private frozen = false;
  private lastNow = gameClock.now;
  private readonly off: Array<() => void> = [];

  constructor(
    scene: Phaser.Scene,
    private readonly inWave: () => boolean,
  ) {
    if (!COMBO.enabled) return;
    this.off.push(
      listen(Events.EnemyKilled, () => this.kill()),
      listen(Events.PlayerHurt, () => this.breakChain()),
      listen(Events.DodgeSave, () => {
        if (this.count > 0) {
          this.remainingMs = Math.min(this.windowMs, this.remainingMs + COMBO.dodgeSaveMs);
          this.emit();
        }
      }),
      listen(Events.PlayerDied, () => this.breakChain(true)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  /** The score factor right now (1 = no combo). */
  get multiplier(): number {
    return comboTier(this.count).mult;
  }

  private get windowMs(): number {
    return COMBO.windowMs * getDifficulty().comboWindow;
  }

  /** Every frame (game time). */
  update(now: number): void {
    const dt = Math.max(0, now - this.lastNow);
    this.lastNow = now;
    if (!COMBO.enabled || this.count === 0) return;
    const waiting = !this.inWave();
    if (waiting !== this.frozen) {
      this.frozen = waiting;
      this.emit();
    }
    if (waiting) return;
    this.remainingMs -= dt;
    if (this.remainingMs <= 0) this.breakChain();
  }

  private kill(): void {
    const before = comboTier(this.count);
    this.count += 1;
    this.best = Math.max(this.best, this.count);
    this.remainingMs = this.windowMs;
    const after = comboTier(this.count);
    this.emit(after !== before && after.word ? { word: after.word, mult: after.mult, color: after.color } : undefined);
  }

  private breakChain(quiet = false): void {
    if (this.count === 0) return;
    const wasLong = this.count >= COMBO.breakWordFrom && !quiet;
    this.count = 0;
    this.remainingMs = 0;
    this.emit(undefined, wasLong);
  }

  private emit(tierUp?: ComboPayload['tierUp'], broken = false): void {
    const payload: ComboPayload = {
      count: this.count,
      multiplier: this.multiplier,
      color: comboTier(this.count).color,
      remainingMs: this.remainingMs,
      windowMs: this.windowMs,
      frozen: this.frozen,
      tierUp,
      broken,
    };
    bus.emit(Events.ComboChanged, payload);
  }
}
