/** @file Dev-only boss lab: follows each duel (the boss's own counters + the hits on Varu), judges it when it ends, keeps the scoreboard and feeds the live panel. */
import Phaser from 'phaser';
import { ENEMIES, isBossType, PROJECTILES, type EnemyType } from '../config/balance';
import { BOSS_LAB, type DebugId } from '../config/debug';
import { BOSS_LAB_TEXT, reportMarkdown } from '../content/bossLab';
import { debugChoice } from '../content/debugChoices';
import { buildReport, type FightReport, type FightResult } from '../core/bossVerdict';
import { bus, Events, listen, type BossLabPayload, type PlayerHurtPayload } from '../core/events';
import { debugState } from '../core/debugState';
import type { Enemy } from '../entities/Enemy';
import type { Boss } from '../entities/bosses/Boss';
import type { Player } from '../entities/Player';

export interface BossLabSources {
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  /** True while the cheat "cats stand still" is on. */
  isFrozen: () => boolean;
}

/**
 * One duel = one boss from the moment it appears to the moment it falls or Varu does. The boss counts time and attacks itself
 * (`Boss.log`); this adds what only the run knows (Varu's health, which attack a hit belonged to, cheats used) and, at the end, asks
 * core/bossVerdict.ts for the verdict and puts the report in the scoreboard (`debugState.book`) and the console.
 */
export class BossLab {
  private boss: Boss | null = null;
  /** A boss was announced (`BossSpawned`) but is not in the group yet: the next refresh picks it up. */
  private awaiting = false;
  private finished = true;
  private minHp = 0;
  private tainted = new Set<string>();
  private last: FightReport | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly src: BossLabSources,
  ) {
    const off = [
      listen(Events.BossSpawned, () => this.begin()),
      listen<PlayerHurtPayload>(Events.PlayerHurt, (p) => this.onHurt(p)),
      listen(Events.BossDefeated, () => this.finish('won')),
      listen(Events.PlayerDied, () => this.finish('lost')),
    ];
    const timer = scene.time.addEvent({ delay: BOSS_LAB.refreshMs, loop: true, callback: () => this.refresh() });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      timer.remove();
    });
  }

  /** The boss on the field now (null = none). */
  liveBoss(): Boss | null {
    for (const child of this.src.enemies.getChildren()) {
      const e = child as Enemy;
      if (e.active && e.isBoss) return e as Boss;
    }
    return null;
  }

  /** The duel stops counting without a verdict (a cheat is about to kill the boss, or a new duel starts). */
  abandon(): void {
    this.finished = true;
    this.awaiting = false;
    this.boss = null;
  }

  /** The scoreboard and every duel as markdown: copied to the clipboard and printed to the console. Returns what happened, in words. */
  exportBook(): string {
    const md = reportMarkdown(debugState.book);
    console.info(md);
    try {
      void navigator.clipboard?.writeText(md).catch(() => undefined);
      return BOSS_LAB_TEXT.exported.copied;
    } catch {
      return BOSS_LAB_TEXT.exported.console;
    }
  }

  // ---- the duel ------------------------------------------------------------------

  private begin(): void {
    this.finished = false;
    this.awaiting = true;
    this.boss = null;
    this.tainted.clear();
    this.minHp = this.src.player.hp;
    if (this.src.player.godMode) this.tainted.add(BOSS_LAB_TEXT.taint.god);
    if (this.src.isFrozen()) this.tainted.add(BOSS_LAB_TEXT.taint.freeze);
    if (debugChoice('speed').value !== '1') this.tainted.add(BOSS_LAB_TEXT.taint.speed);
  }

  /**
   * A cheat ran during the duel: if it changes the fight (god mode, forced attacks, a heal...) the duel stays out of the scoreboard.
   * `on` is the new state of a toggle (an OFF toggle spoils nothing). Moving a picker is not a cheat: DebugCheats only calls this when one runs.
   */
  taint(id: DebugId, on = true): void {
    if (this.finished || !on) return;
    const words = (BOSS_LAB_TEXT.taint as Partial<Record<DebugId, string>>)[id];
    if (!words) return;
    if (id === 'speed' && debugChoice('speed').value === '1') return;
    this.tainted.add(words);
  }

  /** Which attack a hit belongs to: touching the idle boss, its summoned cats, or the attack it was in. */
  private onHurt({ source, amount }: PlayerHurtPayload): void {
    const boss = this.boss;
    if (!boss || this.finished) return;
    this.minHp = Math.min(this.minHp, this.src.player.hp);
    const mode = boss.debugMode;
    const type = source as EnemyType | undefined;
    if (type !== undefined && type in ENEMIES && !(type in PROJECTILES) && !isBossType(type)) boss.log.varuHurt('minions', amount, false);
    else if (type === boss.bossKey && mode !== 'active') boss.log.varuHurt('touch', amount, false);
    else boss.log.varuHurt(boss.debugAttackLabel, amount, true);
  }

  private finish(result: Exclude<FightResult, 'live'>): void {
    const boss = this.boss;
    if (!boss || this.finished) return;
    this.finished = true;
    const report = this.report(boss, result);
    this.boss = null;
    if (report.fightSec < 5) return; // a boss that was barely there says nothing
    debugState.book.push(report);
    if (debugState.book.length > BOSS_LAB.bookMax) debugState.book.shift();
    this.last = report;
    console.info(`[boss lab] ${report.boss} ${result} ${report.fightSec.toFixed(0)} s: ${report.label}${report.flags.length ? ` (${report.flags.join(', ')})` : ''}${report.clean ? '' : ` [murdar: ${report.tainted.join(', ')}]`}`);
    this.emit(null);
  }

  private report(boss: Boss, result: FightResult): FightReport {
    return buildReport(boss.log, {
      result,
      varuMaxHp: this.src.player.maxHp,
      varuMinHp: this.minHp,
      bossHp: result === 'won' ? 0 : boss.hp,
      bossMaxHp: boss.maxHp,
      tainted: [...this.tainted],
    });
  }

  private refresh(): void {
    if (this.awaiting) {
      const found = this.liveBoss();
      if (found) {
        this.boss = found;
        this.awaiting = false;
      }
    }
    const boss = this.boss;
    if (boss && !this.finished) {
      this.minHp = Math.min(this.minHp, this.src.player.hp);
      this.emit(this.report(boss, 'live'));
    } else {
      this.emit(null);
    }
  }

  private emit(live: FightReport | null): void {
    const payload: BossLabPayload = { live, last: this.last };
    bus.emit(Events.BossLab, payload);
  }
}
