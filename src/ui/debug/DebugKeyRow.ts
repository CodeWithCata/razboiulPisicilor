import Phaser from 'phaser';
import { HUD } from '../../config/hud';
import { COLORS, FONT, css } from '../../config/style';
import { DEBUG_TEXT, type DebugRow } from '../../content/lines';

const CAP_LIP = 0xd9bd84; // the darker cream edge under the key, so it looks like a real keycap
const PILL_W = 60;
const PILL_H = 18;

/** One line of the debug card: a keycap that "presses" when its cheat runs, the label, and (for toggles) a PORNIT / OPRIT pill. */
export class DebugKeyRow {
  private readonly face: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly pill: Phaser.GameObjects.Graphics | null;
  private readonly pillText: Phaser.GameObjects.Text | null;
  private pillAt = { x: 0, y: 0 };

  /** `x` is the row's left edge, `cy` its vertical center, `width` the column width (all relative to `parent`). */
  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    row: DebugRow,
    x: number,
    cy: number,
    width: number,
  ) {
    const cfg = HUD.debugPanel;
    const capW = Math.max(cfg.capMinW, row.key.length * cfg.capCharW + 14);
    const top = cy - (cfg.capH + cfg.capLip) / 2;

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

    parent.add([base, this.face, label]);

    if (row.toggle) {
      this.pill = scene.add.graphics();
      this.pillText = scene.add
        .text(x + width - PILL_W / 2, cy + 1, '', { fontFamily: FONT, fontSize: `${cfg.pillSize}px`, color: '#ffffff' })
        .setOrigin(0.5);
      parent.add([this.pill, this.pillText]);
      this.pillAt = { x: x + width - PILL_W, y: cy - PILL_H / 2 };
      this.setOn(false);
    } else {
      this.pill = null;
      this.pillText = null;
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
}
