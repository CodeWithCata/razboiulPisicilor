/** @file Tiny physics freeze on strong hits (config/hitstop.ts). */
import Phaser from 'phaser';
import { HIT_STOP } from '../config/hitstop';
import { BOSS_KILL } from '../config/slowMo';
import { Events, listen, type EnemyKilledPayload, type HitFreezePayload } from '../core/events';
import { gameClock } from '../core/clock';

/**
 * A tiny freeze on strong hits (see config/hitstop.ts). It only LISTENS to the event bus.
 * It pauses the physics world and resumes it with a scene timer, so it also respects the pause menu.
 * The scene must call `stop()` when the run ends (game over / victory): those pause the physics for good.
 */
export class HitStop {
  private readonly off: Array<() => void> = [];
  private timer: Phaser.Time.TimerEvent | null = null;
  private lastFreezeAt = -Infinity;
  /** When the running freeze began: extensions are cut off `HIT_STOP.maxChainMs` after it. */
  private freezeStartedAt = 0;
  private stopped = false;

  constructor(private readonly scene: Phaser.Scene) {
    if (!HIT_STOP.enabled) return;
    const d = HIT_STOP.durations;
    this.off.push(
      listen<EnemyKilledPayload>(Events.EnemyKilled, ({ type }) => {
        if (HIT_STOP.heavyKills.includes(type)) this.freeze(d.heavyKill);
      }),
      listen(Events.PlayerHurt, () => this.freeze(d.playerHurt)),
      listen(Events.BossStunned, () => this.freeze(d.bossStunned)),
      listen(Events.BossDefeated, () => {
        if (!BOSS_KILL.enabled) this.freeze(d.bossDefeated); // the boss kill slow-mo (SlowMoSystem) replaces the freeze
      }),
      listen<HitFreezePayload>(Events.HitFreeze, ({ ms }) => this.freeze(ms)), // HitFeel: tiny freezes on kills and big hits
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stop());
  }

  /** Ends any freeze right now and never starts another. */
  stop(): void {
    this.stopped = true;
    this.cancel();
    this.off.forEach((f) => f());
    this.off.length = 0;
  }

  /** Ends a running freeze right now (the physics goes back to normal). Used when the pause menu opens. */
  cancel(): void {
    if (this.timer === null) return;
    this.timer.remove(false);
    this.timer = null;
    this.scene.physics.world.resume();
  }

  private freeze(ms: number): void {
    if (this.stopped || ms <= 0) return;
    const now = gameClock.now;
    if (this.timer !== null) {
      // Already frozen: a longer freeze may extend it, a shorter one changes nothing.
      const room = this.freezeStartedAt + HIT_STOP.maxChainMs - now; // never longer than maxChainMs in total
      const wanted = Math.min(ms, room);
      if (wanted > this.timer.getRemaining()) this.restartTimer(wanted);
      return;
    }
    if (now - this.lastFreezeAt < HIT_STOP.minGapMs) return;
    this.lastFreezeAt = now;
    this.freezeStartedAt = now;
    this.scene.physics.world.pause();
    this.restartTimer(ms);
  }

  private restartTimer(ms: number): void {
    this.timer?.remove(false);
    this.timer = this.scene.time.delayedCall(ms, () => {
      this.timer = null;
      this.lastFreezeAt = gameClock.now;
      this.scene.physics.world.resume();
    });
  }
}
