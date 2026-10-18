import Phaser from 'phaser';
import { JOKE_RULES, JOKE_TUNING, type JokeCategory } from '../config/jokes';
import { isBossType, type EnemyType } from '../config/balance';
import { getWave } from '../config/waves';
import { BOSS_INTRO_LINES, JOKE_LINES, fillLine } from '../content/jokes';
import { pick } from '../content/lines';
import type { Point } from '../core/arena';
import { Cooldowns } from '../core/cooldown';
import {
  bus,
  Events,
  listen,
  type BossPhasePayload,
  type BossSpawnedPayload,
  type JokePayload,
  type PlayerHealthPayload,
  type WavePayload,
} from '../core/events';
import { KillStreak } from '../core/streak';
import { gameClock } from '../core/clock';

/**
 * Decides WHEN something funny gets said. It listens to the event bus and answers with
 * Events.Joke; Effects shows the floating ones and the HUD toast shows the others.
 * Every category has its own cooldown and chance (config/jokes.ts), and normal jokes keep a
 * global gap between them, so it never spams. The lines live in content/jokes.ts.
 */
export class JokeSystem {
  private readonly cooldowns = new Cooldowns();
  private readonly streak = new KillStreak(JOKE_TUNING.streakWindowMs);
  private readonly off: Array<() => void> = [];
  private lastHpRatio = 1;
  private wasNearDeath = false;
  private lastJokeAt = Number.NEGATIVE_INFINITY;

  constructor(
    scene: Phaser.Scene,
    private readonly where: () => Point,
  ) {
    this.off.push(
      listen<PlayerHealthPayload>(Events.PlayerHealth, (p) => this.onHealth(p)),
      listen(Events.EnemyKilled, () => this.onKill()),
      listen<WavePayload>(Events.WaveStarted, ({ wave }) => {
        // A boss wave gets its own intro joke instead.
        const hasBoss = Object.keys(getWave(wave)).some((type) => isBossType(type as EnemyType));
        if (!hasBoss) this.say('waveStart');
      }),
      listen<WavePayload>(Events.WaveCleared, () => {
        this.say('waveCleared');
        this.survived(); // a quiet moment after a close call counts as surviving it
      }),
      listen<BossSpawnedPayload>(Events.BossSpawned, ({ boss }) => this.say('bossIntro', BOSS_INTRO_LINES[boss])),
      listen<BossPhasePayload>(Events.BossPhase, () => this.say('bossPhase2')),
      listen(Events.PickupCollected, () => this.say('pickup')),
      listen(Events.GameOver, () => this.say('gameOver')),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  private onHealth({ hp, maxHp }: PlayerHealthPayload): void {
    const ratio = maxHp > 0 ? hp / maxHp : 1;
    const dropped = ratio < this.lastHpRatio;
    this.lastHpRatio = ratio;

    if (ratio <= 0) return; // the game over joke takes over
    if (ratio <= JOKE_TUNING.nearDeathRatio) this.wasNearDeath = true;
    if (dropped && ratio <= JOKE_TUNING.lowHpRatio) this.say('lowHp');
    if (ratio > JOKE_TUNING.lowHpRatio) this.survived();
  }

  private onKill(): void {
    const n = this.streak.hit(gameClock.now);
    if ((JOKE_TUNING.streakMilestones as readonly number[]).includes(n)) this.say('killStreak', undefined, { n });
  }

  private survived(): void {
    if (!this.wasNearDeath) return;
    this.wasNearDeath = false;
    this.say('nearDeath');
  }

  /** Say something from `category` if its cooldown, chance and the global gap all allow it. */
  private say(category: JokeCategory, lines?: readonly string[], vars: Record<string, string | number> = {}): void {
    const rule = JOKE_RULES[category];
    const now = gameClock.now;
    if (!this.cooldowns.ready(category, now, rule.cooldownMs)) return;
    if (!rule.priority && now - this.lastJokeAt < JOKE_TUNING.globalGapMs) return;
    if (Math.random() >= rule.chance) return;

    const pool = lines && lines.length > 0 ? lines : JOKE_LINES[category];
    if (pool.length === 0) return;

    this.cooldowns.mark(category, now);
    this.lastJokeAt = now;
    const at = this.where();
    const payload: JokePayload = {
      category,
      text: fillLine(pick(pool), vars),
      channel: rule.channel,
      color: rule.color,
      size: rule.size,
      x: at.x,
      y: at.y + JOKE_TUNING.floatOffsetY,
    };
    bus.emit(Events.Joke, payload);
  }
}
