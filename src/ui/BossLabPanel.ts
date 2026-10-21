/** @file Dev-only boss lab panel: the live numbers of the duel (time per mode, attack table, verdict) or the scoreboard of all bosses. Tab cycles hidden / live / scoreboard. */
import Phaser from 'phaser';
import { HUD } from '../config/hud';
import { COLORS, css } from '../config/style';
import { GAME } from '../config/balance';
import type { DebugId } from '../config/debug';
import { bookLines, BOSS_LAB_TEXT, liveLines } from '../content/bossLab';
import { debugChoice } from '../content/debugChoices';
import { debugState } from '../core/debugState';
import type { FightReport } from '../core/bossVerdict';
import { Events, listen, type BossLabPayload, type DebugActionPayload } from '../core/events';

const VERDICT_COLORS = { balanced: '#9be28f', boring: '#ffd166', brutal: '#ff7b6b', mixed: '#ffb86b', unclear: '#b9c2e0' } as const;
const MONO = 'monospace';

/**
 * Top-right card, text only. `live` shows the duel running now (or the last one when none runs); `book` the scoreboard.
 * It only listens (`BossLab` sends the numbers every `BOSS_LAB.refreshMs`) and redraws when the words change.
 */
export class BossLabPanel {
  private readonly box: Phaser.GameObjects.Container;
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly head: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly verdict: Phaser.GameObjects.Text;
  private data: BossLabPayload = { live: null, last: null };
  private drawn = '';

  constructor(scene: Phaser.Scene) {
    const cfg = HUD.bossLab;
    const font = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: MONO, fontSize: `${size}px`, color, lineSpacing: cfg.lineGap, wordWrap: { width: cfg.width - cfg.pad * 2 } });
    this.box = scene.add.container(GAME.width - cfg.width - cfg.right, cfg.y).setDepth(cfg.depth);
    this.back = scene.add.graphics();
    this.head = scene.add.text(cfg.pad, cfg.pad, '', { ...font(cfg.titleSize, css(COLORS.gold)), fontStyle: 'bold' });
    this.body = scene.add.text(cfg.pad, 0, '', font(cfg.size, '#e8ecff'));
    this.verdict = scene.add.text(cfg.pad, 0, '', { ...font(cfg.verdictSize, '#ffffff'), fontStyle: 'bold' });
    this.box.add([this.back, this.head, this.body, this.verdict]);
    this.redraw();

    const off = [
      listen<BossLabPayload>(Events.BossLab, (p) => {
        this.data = p;
        this.redraw();
      }),
      listen<DebugActionPayload>(Events.DebugAction, ({ id }) => {
        if ((id as DebugId) === 'bossReport') this.redraw();
      }),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  private redraw(): void {
    const mode = debugChoice('bossReport').value;
    this.box.setVisible(mode !== 'off');
    if (mode === 'off') return;
    let head: string;
    let body: string;
    let verdict = '';
    let color: string = VERDICT_COLORS.unclear;
    if (mode === 'book') {
      ({ head, body } = bookLines(debugState.book));
    } else {
      const report: FightReport | null = this.data.live ?? this.data.last;
      if (!report) {
        head = BOSS_LAB_TEXT.title;
        body = BOSS_LAB_TEXT.live.waiting;
      } else {
        const lines = liveLines(report, this.data.live ? `${Math.round(report.fightSec)} s` : BOSS_LAB_TEXT.live.last);
        ({ head, body, verdict } = lines);
        color = VERDICT_COLORS[report.label];
      }
    }
    const key = `${head}|${body}|${verdict}|${color}`;
    if (key === this.drawn) return; // the numbers did not change: nothing to rebuild
    this.drawn = key;
    const cfg = HUD.bossLab;
    this.head.setText(head);
    this.body.setText(body).setY(this.head.y + this.head.height + cfg.pad / 2);
    this.verdict.setText(verdict).setColor(color).setY(this.body.y + this.body.height + cfg.pad / 2);
    const h = (verdict ? this.verdict.y + this.verdict.height : this.body.y + this.body.height) + cfg.pad;
    this.back.clear();
    this.back.fillStyle(COLORS.navy, cfg.backAlpha).fillRoundedRect(0, 0, cfg.width, h, cfg.radius);
    this.back.lineStyle(2, COLORS.gold, 0.7).strokeRoundedRect(0, 0, cfg.width, h, cfg.radius);
  }
}
