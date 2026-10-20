/** @file Tiny physics freeze on strong hits (config/hitstop.ts). */
import Phaser from 'phaser';
import { HIT_STOP } from '../config/hitstop';
import { Events, listen, type EnemyKilledPayload } from '../core/events';
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
      listen(Events.BossDefeated, () => this.freeze(d.bossDefeated)),
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
    if (this.stopped) return;
    const now = gameClock.now;
    if (this.timer !== null) {
      // Already frozen: a longer freeze may extend it, a shorter one changes nothing.
      if (ms > this.timer.getRemaining()) this.restartTimer(ms);
      return;
    }
    if (now - this.lastFreezeAt < HIT_STOP.minGapMs) return;
    this.lastFreezeAt = now;
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
