/** @file Dev-only cheat sheet card (dev build): keys, toggles, live numbers. */
import Phaser from 'phaser';
import { HUD } from '../config/hud';
import { COLORS, FONT, css } from '../config/style';
import type { DebugId } from '../config/debug';
import { DEBUG_CHOICES, debugChoice } from '../content/debugChoices';
import { DEBUG_SECTIONS, DEBUG_TEXT } from '../content/lines';
import { debugState } from '../core/debugState';
import { bus, Events, listen, type DebugActionPayload, type DebugRunPayload, type DebugStatsPayload, type DebugStepPayload } from '../core/events';
import { DebugKeyRow } from './debug/DebugKeyRow';

/**
 * Dev-only cheat sheet (shown in `pnpm dev`): blocks of keys in three columns on a dark card, with live fps / cats / wave / health / Varu's spot
 * in the title bar. Keys press and light up when a cheat runs, toggles show PORNIT / OPRIT, pickers show `‹ value ›`, and the footer says what
 * just happened. Press I to show / hide it (the cheat keys work either way; it stays open when a run restarts).
 * Mouse: click a row to run it, click a picker's arrows (or right-click the row, or turn the wheel over it) to change its value;
 * `,` and `.` step the picker used last (outlined). A click on the card never swings the belt (`debugState.overPanel`).
 * The cheats themselves live in GameScene (it hears `DebugRun` / `DebugStep`); this only shows them.
 */
export class DebugPanel {
  private readonly box: Phaser.GameObjects.Container;
  private shown = debugState.shown;
  private readonly size: { w: number; h: number };
  private hovered: DebugId | null = null;
  private readonly rows = new Map<string, DebugKeyRow>();
  private readonly stats: Phaser.GameObjects.Text;
  private readonly note: Phaser.GameObjects.Text;
  private readonly onKey: () => void;

  /** `x` is the left edge, `bottom` the bottom edge of the card (game pixels). */
  constructor(private readonly scene: Phaser.Scene, x: number, bottom: number) {
    const cfg = HUD.debugPanel;
    const colH = (col: 0 | 1 | 2): number => {
      const blocks = DEBUG_SECTIONS.filter((s) => s.column === col);
      return blocks.reduce((sum, s) => sum + cfg.sectionH + s.rows.length * cfg.rowH, 0) + (blocks.length - 1) * cfg.sectionGap;
    };
    const w = cfg.padX * 2 + cfg.colW * 3 + cfg.colGap * 2;
    const h = cfg.padY * 2 + cfg.titleH + Math.max(colH(0), colH(1), colH(2)) + cfg.footerH;
    this.size = { w, h };
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
    const cursor = [cfg.padY + cfg.titleH, cfg.padY + cfg.titleH, cfg.padY + cfg.titleH];
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
        const handlers = {
          run: (): void => {
            const payload: DebugRunPayload = { id: row.id };
            bus.emit(Events.DebugRun, payload);
          },
          step: (step: number): void => this.step(row.id, step),
          hover: (over: boolean): void => {
            this.hovered = over ? row.id : this.hovered === row.id ? null : this.hovered;
            this.rows.get(row.id)?.setHover(over);
          },
        };
        const view = new DebugKeyRow(scene, box, row, colX, cy, cfg.colW, handlers);
        this.rows.set(row.id, view);
        if (DEBUG_CHOICES[row.id]) view.setValue(debugChoice(row.id).label);
        if (row.id === 'bossAuto') view.setOn(debugState.autoDuel); // survives a restarted run, so the pill must show it
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
    const kb = scene.input.keyboard;
    kb?.on('keydown-I', this.onKey);
    const stepActive = (step: number): void => {
      if (debugState.active) this.step(debugState.active as DebugId, step);
    };
    const onPrev = (): void => stepActive(-1);
    const onNext = (): void => stepActive(1);
    kb?.on('keydown-COMMA', onPrev);
    kb?.on('keydown-PERIOD', onNext);
    const onWheel = (_p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void => {
      if (this.shown && this.hovered && DEBUG_CHOICES[this.hovered] && dy !== 0) this.step(this.hovered, dy > 0 ? 1 : -1);
    };
    const onPointer = (pointer: Phaser.Input.Pointer): void => this.trackPointer(pointer);
    scene.input.on('wheel', onWheel);
    scene.input.on('pointermove', onPointer);
    scene.input.on('pointerdown', onPointer);
    this.refreshActive();
    const off = [
      listen<DebugActionPayload>(Events.DebugAction, (p) => this.onAction(p)),
      listen<DebugStatsPayload>(Events.DebugStats, (p) => this.onStats(p)),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb?.off('keydown-I', this.onKey);
      kb?.off('keydown-COMMA', onPrev);
      kb?.off('keydown-PERIOD', onNext);
      scene.input.off('wheel', onWheel);
      scene.input.off('pointermove', onPointer);
      scene.input.off('pointerdown', onPointer);
      debugState.overPanel = false;
      off.forEach((f) => f());
    });
  }

  toggle(): void {
    this.shown = !this.shown;
    debugState.shown = this.shown;
    this.box.setVisible(this.shown);
    if (!this.shown) debugState.overPanel = false;
  }

  /** The mouse is on the card (and the card is open): the game must not take the click as a swing. */
  private trackPointer(pointer: Phaser.Input.Pointer): void {
    const { w, h } = this.size;
    debugState.overPanel = this.shown && pointer.x >= this.box.x && pointer.x <= this.box.x + w && pointer.y >= this.box.y && pointer.y <= this.box.y + h;
  }

  /** A picker moved: GameScene steps it (it knows what to do with the new value) and answers with `DebugAction`. */
  private step(id: DebugId, step: number): void {
    if (!DEBUG_CHOICES[id]) return;
    const payload: DebugStepPayload = { id, step };
    bus.emit(Events.DebugStep, payload);
  }

  private refreshActive(): void {
    for (const [id, row] of this.rows) row.setActive(id === debugState.active);
  }

  private onAction({ id, on, detail }: DebugActionPayload): void {
    const row = this.rows.get(id);
    row?.flash();
    if (on !== undefined) row?.setOn(on);
    if (DEBUG_CHOICES[id]) row?.setValue(debugChoice(id).label);
    this.refreshActive();
    const state = on === undefined ? '' : `: ${on ? DEBUG_TEXT.on : DEBUG_TEXT.off}`;
    const more = detail ? `: ${detail}` : '';
    this.scene.tweens.killTweensOf(this.note);
    this.note.setText(`${DEBUG_TEXT.done[id]}${state}${more}`).setAlpha(1);
    this.scene.tweens.add({ targets: this.note, alpha: 0.45, delay: HUD.debugPanel.footerFadeMs, duration: 600 });
  }

  private onStats({ cats, wave, hp, maxHp, x, y, luck }: DebugStatsPayload): void {
    const fps = Math.round(this.scene.game.loop.actualFps);
    this.stats.setText(
      DEBUG_TEXT.stats
        .replace('{fps}', String(fps))
        .replace('{cats}', String(cats))
        .replace('{wave}', String(wave))
        .replace('{hp}', String(Math.round(hp)))
        .replace('{max}', String(maxHp))
        .replace('{x}', String(Math.round(x)))
        .replace('{y}', String(Math.round(y)))
        .replace('{luck}', luck),
    );
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
