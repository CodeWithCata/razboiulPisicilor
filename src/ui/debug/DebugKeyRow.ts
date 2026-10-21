/** @file One row of the debug card: keycap that presses, label, and a PORNIT / OPRIT pill or a < value > picker. Hover, click and right click work. */
import Phaser from 'phaser';
import { HUD } from '../../config/hud';
import { COLORS, FONT, css } from '../../config/style';
import { DEBUG_TEXT, type DebugRow } from '../../content/lines';

const CAP_LIP = 0xd9bd84; // the darker cream edge under the key, so it looks like a real keycap
const PILL_W = 60;
const PILL_H = 18;

export interface DebugRowHandlers {
  /** The row was clicked (left button). */
  run: () => void;
  /** A picker arrow was clicked, the wheel turned or the row was right-clicked: +1 next, -1 previous. */
  step: (step: number) => void;
  /** The mouse entered (true) or left (false) the row. */
  hover: (over: boolean) => void;
}

/**
 * One line of the debug card: a keycap that "presses" when its cheat runs, the label, and on the right either a PORNIT / OPRIT pill (toggles)
 * or a `‹ value ›` picker (choice and cycle rows). The whole row is clickable; the picker arrows step the value; a right click steps back.
 */
export class DebugKeyRow {
  private readonly face: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly hoverBox: Phaser.GameObjects.Graphics;
  private readonly activeBox: Phaser.GameObjects.Graphics;
  private readonly pill: Phaser.GameObjects.Graphics | null;
  private readonly pillText: Phaser.GameObjects.Text | null;
  private readonly value: Phaser.GameObjects.Text | null;
  private pillAt = { x: 0, y: 0 };

  /** `x` is the row's left edge, `cy` its vertical center, `width` the column width (all relative to `parent`). */
  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    row: DebugRow,
    x: number,
    cy: number,
    width: number,
    handlers: DebugRowHandlers,
  ) {
    const cfg = HUD.debugPanel;
    const picker = row.kind === 'choice' || row.kind === 'cycle';
    const widgetW = picker ? cfg.pickerW : row.kind === 'toggle' ? PILL_W : 0;
    const capW = Math.max(cfg.capMinW, row.key.length * cfg.capCharW + 14);
    const top = cy - (cfg.capH + cfg.capLip) / 2;
    const rowTop = cy - cfg.rowH / 2;

    // Under everything: the hover wash and the "last used picker" outline.
    this.hoverBox = scene.add.graphics().setAlpha(0);
    this.hoverBox.fillStyle(COLORS.white, 1).fillRoundedRect(x - 6, rowTop + 1, width + 12, cfg.rowH - 2, 8);
    this.activeBox = scene.add.graphics().setAlpha(0);
    this.activeBox.lineStyle(2, COLORS.gold, 1).strokeRoundedRect(x - 6, rowTop + 1, width + 12, cfg.rowH - 2, 8);

    const base = scene.add.graphics();
    base.fillStyle(COLORS.navy, 1).fillRoundedRect(x - 2, top - 2, capW + 4, cfg.capH + cfg.capLip + 4, 8);
    base.fillStyle(CAP_LIP, 1).fillRoundedRect(x, top + cfg.capLip, capW, cfg.capH, 6);

    const face = scene.add.graphics();
    face.fillStyle(COLORS.cream, 1).fillRoundedRect(x, top, capW, cfg.capH, 6);
    // A thin lighter strip along the top edge: the little highlight that makes it look chunky.
    face.fillStyle(COLORS.white, 0.55).fillRoundedRect(x + 3, top + 2, capW - 6, 3, 1.5);
    this.glow = scene.add.graphics().setAlpha(0);
    this.glow.fillStyle(COLORS.gold, 1).fillRoundedRect(x, top, capW, cfg.capH, 6);
    const keyText = scene.add
      .text(x + capW / 2, top + cfg.capH / 2 + 1, row.key, { fontFamily: FONT, fontSize: `${cfg.keySize}px`, color: css(COLORS.navy) })
      .setOrigin(0.5);
    this.face = scene.add.container(0, 0, [face, this.glow, keyText]);

    const label = scene.add
      .text(x + cfg.capMinW + cfg.labelGap, cy + 1, row.label, {
        fontFamily: FONT,
        fontSize: `${cfg.labelSize}px`,
        color: '#ffffff',
        stroke: css(COLORS.navy),
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);
    const labelMax = width - cfg.capMinW - cfg.labelGap - widgetW - 8;
    if (label.width > labelMax) label.setScale(labelMax / label.width); // a long label shrinks instead of running into the widget

    parent.add([this.hoverBox, this.activeBox, base, this.face, label]);

    this.pill = null;
    this.pillText = null;
    this.value = null;
    if (row.kind === 'toggle') {
      this.pill = scene.add.graphics();
      this.pillText = scene.add
        .text(x + width - PILL_W / 2, cy + 1, '', { fontFamily: FONT, fontSize: `${cfg.pillSize}px`, color: '#ffffff' })
        .setOrigin(0.5);
      parent.add([this.pill, this.pillText]);
      this.pillAt = { x: x + width - PILL_W, y: cy - PILL_H / 2 };
      this.setOn(false);
    } else if (picker) {
      const px = x + width - cfg.pickerW;
      const back = scene.add.graphics();
      back.fillStyle(COLORS.navy, 1).fillRoundedRect(px - 2, cy - PILL_H / 2 - 2, cfg.pickerW + 4, PILL_H + 4, PILL_H / 2 + 2);
      back.fillStyle(cfg.offColor, 1).fillRoundedRect(px, cy - PILL_H / 2, cfg.pickerW, PILL_H, PILL_H / 2);
      const arrow = (ax: number, glyph: string): Phaser.GameObjects.Text =>
        scene.add.text(ax, cy, glyph, { fontFamily: FONT, fontSize: `${cfg.pickerSize + 6}px`, color: css(COLORS.gold) }).setOrigin(0.5);
      this.value = scene.add.text(px + cfg.pickerW / 2, cy + 1, '', { fontFamily: FONT, fontSize: `${cfg.pickerSize}px`, color: '#ffffff' }).setOrigin(0.5);
      parent.add([back, arrow(px + cfg.arrowW / 2, '‹'), arrow(px + cfg.pickerW - cfg.arrowW / 2, '›'), this.value]);
    }

    // Hit areas: the whole row runs the cheat (right click = step back); the two arrows of a picker sit above it and step.
    const hit = scene.add.zone(x - 6, rowTop, width + 12, cfg.rowH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => handlers.hover(true));
    hit.on('pointerout', () => handlers.hover(false));
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) (picker ? handlers.step : () => undefined)(-1);
      else handlers.run();
    });
    parent.add(hit);
    if (picker) {
      const px = x + width - cfg.pickerW;
      const arrowZone = (ax: number, step: number): void => {
        const z = scene.add.zone(ax, cy - cfg.rowH / 2, cfg.arrowW, cfg.rowH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => handlers.hover(true)); // moving from the row onto an arrow must not drop the hover
        z.on('pointerout', () => handlers.hover(false));
        z.on('pointerdown', () => handlers.step(step));
        parent.add(z);
      };
      arrowZone(px, -1);
      arrowZone(px + cfg.pickerW - cfg.arrowW, 1);
    }
  }

  /** The cheat just ran: the key dips down and lights up gold for a moment. */
  flash(): void {
    const cfg = HUD.debugPanel;
    this.scene.tweens.killTweensOf([this.face, this.glow]);
    this.face.y = cfg.capLip - 1;
    this.glow.setAlpha(1);
    this.scene.tweens.add({ targets: this.face, y: 0, duration: cfg.flashMs, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: cfg.flashMs * 3, ease: 'Quad.easeOut' });
  }

  setOn(on: boolean): void {
    if (!this.pill || !this.pillText) return;
    const cfg = HUD.debugPanel;
    this.pill.clear();
    this.pill.fillStyle(COLORS.navy, 1).fillRoundedRect(this.pillAt.x - 2, this.pillAt.y - 2, PILL_W + 4, PILL_H + 4, PILL_H / 2 + 2);
    this.pill.fillStyle(on ? cfg.onColor : cfg.offColor, 1).fillRoundedRect(this.pillAt.x, this.pillAt.y, PILL_W, PILL_H, PILL_H / 2);
    this.pillText.setText(on ? DEBUG_TEXT.on : DEBUG_TEXT.off).setColor(on ? css(COLORS.navy) : '#cfd6f0');
  }

  /** A picker shows its chosen option (a long one shrinks to fit). */
  setValue(text: string): void {
    if (!this.value) return;
    const cfg = HUD.debugPanel;
    this.value.setScale(1).setText(text);
    const max = cfg.pickerW - cfg.arrowW * 2;
    if (this.value.width > max) this.value.setScale(max / this.value.width);
  }

  setHover(on: boolean): void {
    this.hoverBox.setAlpha(on ? HUD.debugPanel.hoverAlpha : 0);
  }

  /** The picker that `,` and `.` step is outlined. */
  setActive(on: boolean): void {
    this.activeBox.setAlpha(on ? HUD.debugPanel.activeAlpha : 0);
  }
}
