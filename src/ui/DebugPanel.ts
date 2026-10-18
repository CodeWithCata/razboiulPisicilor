import Phaser from 'phaser';
import { HUD } from '../config/hud';
import { COLORS, FONT, css } from '../config/style';
import { DEBUG_SECTIONS, DEBUG_TEXT } from '../content/lines';
import { Events, listen, type DebugActionPayload, type DebugStatsPayload } from '../core/events';
import { DebugKeyRow } from './debug/DebugKeyRow';

/**
 * Dev-only cheat sheet (shown in `pnpm dev`): blocks of keys in two columns on a dark card, with live fps / cats / wave
 * in the title bar. Keys press and light up when a cheat runs, toggles show PORNIT / OPRIT, and the footer says what
 * just happened. It starts hidden: press I to show / hide it (the cheat keys work either way). The cheats themselves live in GameScene; this only shows them.
 */
export class DebugPanel {
  private readonly box: Phaser.GameObjects.Container;
  private shown = false;
  private readonly rows = new Map<string, DebugKeyRow>();
  private readonly stats: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly onKey: () => void;

  /** `x` is the left edge, `bottom` the bottom edge of the card (game pixels). */
  constructor(private readonly scene: Phaser.Scene, x: number, bottom: number) {
    const cfg = HUD.debugPanel;
    const colH = (col: 0 | 1): number => {
      const blocks = DEBUG_SECTIONS.filter((s) => s.column === col);
      return blocks.reduce((sum, s) => sum + cfg.sectionH + s.rows.length * cfg.rowH, 0) + (blocks.length - 1) * cfg.sectionGap;
    };
    const w = cfg.padX * 2 + cfg.colW * 2 + cfg.colGap;
    const h = cfg.padY * 2 + cfg.titleH + Math.max(colH(0), colH(1)) + cfg.footerH;
    const box = scene.add.container(x, bottom - h).setDepth(cfg.depth).setAlpha(cfg.alpha);
    this.box = box.setVisible(this.shown);

    // The card: navy, gold edge, and a lighter line just inside it so it reads as a chunky panel like the menus.
    const back = scene.add.graphics();
    back.fillStyle(COLORS.navy, cfg.backAlpha).fillRoundedRect(0, 0, w, h, cfg.radius);
    back.lineStyle(2, COLORS.gold, 0.7).strokeRoundedRect(0, 0, w, h, cfg.radius);
    back.lineStyle(1, COLORS.white, 0.08).strokeRoundedRect(5, 5, w - 10, h - 10, cfg.radius - 4);
    // Title bar divider and footer divider.
    back.lineStyle(2, COLORS.gold, 0.25);
    back.lineBetween(cfg.padX, cfg.padY + cfg.titleH - 4, w - cfg.padX, cfg.padY + cfg.titleH - 4);
    back.lineBetween(cfg.padX, h - cfg.footerH - 2, w - cfg.padX, h - cfg.footerH - 2);
    box.add(back);

    box.add(this.paw(cfg.padX + 10, cfg.padY + cfg.titleH / 2 - 3));
    box.add(
      scene.add
        .text(cfg.padX + 30, cfg.padY + cfg.titleH / 2 - 3, DEBUG_TEXT.title, { fontFamily: FONT, fontSize: `${cfg.titleSize}px`, color: css(COLORS.gold), stroke: css(COLORS.navy), strokeThickness: 4 })
        .setOrigin(0, 0.5),
    );
    this.stats = scene.add
      .text(w - cfg.padX, cfg.padY + cfg.titleH / 2 - 3, '', { fontFamily: FONT, fontSize: `${cfg.statsSize}px`, color: '#9be28f', stroke: css(COLORS.navy), strokeThickness: 3 })
      .setOrigin(1, 0.5);
    box.add(this.stats);

    // The blocks, stacked down each column.
    const cursor = [cfg.padY + cfg.titleH, cfg.padY + cfg.titleH];
    for (const section of DEBUG_SECTIONS) {
      const colX = cfg.padX + section.column * (cfg.colW + cfg.colGap);
      const y = cursor[section.column]!;
      const header = scene.add
        .text(colX, y + cfg.sectionH / 2 + 2, section.title, { fontFamily: FONT, fontSize: `${cfg.sectionSize}px`, color: '#b9c2e0', stroke: css(COLORS.navy), strokeThickness: 3 })
        .setOrigin(0, 0.5);
      const rule = scene.add.graphics();
      rule.lineStyle(2, COLORS.gold, 0.35).lineBetween(colX + header.width + 8, y + cfg.sectionH / 2 + 3, colX + cfg.colW, y + cfg.sectionH / 2 + 3);
      box.add([header, rule]);
      section.rows.forEach((row, i) => {
        const cy = y + cfg.sectionH + i * cfg.rowH + cfg.rowH / 2;
        this.rows.set(row.id, new DebugKeyRow(scene, box, row, colX, cy, cfg.colW));
      });
      cursor[section.column] = y + cfg.sectionH + section.rows.length * cfg.rowH + cfg.sectionGap;
    }

    // Footer: what just happened on the left, how to hide the card on the right.
    this.note = scene.add
      .text(cfg.padX, h - cfg.footerH / 2 - 1, DEBUG_TEXT.idle, { fontFamily: FONT, fontSize: `${cfg.footerSize}px`, color: css(COLORS.gold), stroke: css(COLORS.navy), strokeThickness: 3 })
      .setOrigin(0, 0.5)
      .setAlpha(0.45);
    const hint = scene.add
      .text(w - cfg.padX, h - cfg.footerH / 2 - 1, DEBUG_TEXT.hide, { fontFamily: FONT, fontSize: `${cfg.hintSize}px`, color: '#b9c2e0', stroke: css(COLORS.navy), strokeThickness: 3 })
      .setOrigin(1, 0.5);
    box.add([this.note, hint]);

    this.onKey = (): void => this.toggle();
    scene.input.keyboard?.on('keydown-I', this.onKey);
    const off = [
      listen<DebugActionPayload>(Events.DebugAction, (p) => this.onAction(p)),
      listen<DebugStatsPayload>(Events.DebugStats, (p) => this.onStats(p)),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off('keydown-I', this.onKey);
      off.forEach((f) => f());
    });
  }

  toggle(): void {
    this.shown = !this.shown;
    this.box.setVisible(this.shown);
  }

  private onAction({ id, on }: DebugActionPayload): void {
    const row = this.rows.get(id);
    row?.flash();
    if (on !== undefined) row?.setOn(on);
    const state = on === undefined ? '' : `: ${on ? DEBUG_TEXT.on : DEBUG_TEXT.off}`;
    this.scene.tweens.killTweensOf(this.note);
    this.note.setText(`${DEBUG_TEXT.done[id]}${state}`).setAlpha(1);
    this.scene.tweens.add({ targets: this.note, alpha: 0.45, delay: HUD.debugPanel.footerFadeMs, duration: 600 });
  }

  private onStats({ cats, wave }: DebugStatsPayload): void {
    const fps = Math.round(this.scene.game.loop.actualFps);
    this.stats.setText(DEBUG_TEXT.stats.replace('{fps}', String(fps)).replace('{cats}', String(cats)).replace('{wave}', String(wave)));
  }

  /** A tiny cat paw (four toes and a pad) for the title: this is Varu's game after all. */
  private paw(cx: number, cy: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(COLORS.gold, 1);
    g.fillEllipse(cx, cy + 4, 13, 10);
    g.fillCircle(cx - 7, cy - 3, 3);
    g.fillCircle(cx - 2.5, cy - 7, 3);
    g.fillCircle(cx + 2.5, cy - 7, 3);
    g.fillCircle(cx + 7, cy - 3, 3);
    return g;
  }
}
