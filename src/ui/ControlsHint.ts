/** @file Keyboard controls reminder at the bottom, with a keycap button that hides it. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { HUD } from '../config/hud';
import { COLORS, FONT, css } from '../config/style';
import { HUD_TEXT } from '../content/lines';
import { loadHelpHidden, saveHelpHidden } from '../core/storage';

const CAP_LIP = 0xd9bd84; // the darker cream edge under the key, same as the debug card

/**
 * The controls reminder at the bottom of the screen plus a small keycap button under/over it that hides it (and brings it back).
 * The choice is remembered. Keyboard only: phones have no keyboard and keep their own reminder.
 */
export class ControlsHint {
  private readonly help: Phaser.GameObjects.Text;
  private readonly chip: Phaser.GameObjects.Container;
  private readonly cap: Phaser.GameObjects.Graphics;
  private readonly keyText: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private hidden: boolean;

  constructor(private readonly scene: Phaser.Scene) {
    const h = HUD.help;
    this.hidden = loadHelpHidden();
    this.help = scene.add
      .text(GAME.width / 2, GAME.height - h.bottom, HUD_TEXT.helpKeyboard, {
        fontFamily: FONT,
        fontSize: `${h.size}px`,
        color: '#ffffff',
        stroke: css(COLORS.navy),
        strokeThickness: h.strokeThickness,
      })
      .setOrigin(0.5, 1)
      .setAlpha(h.alpha)
      .setVisible(!this.hidden);

    this.cap = scene.add.graphics();
    this.keyText = scene.add
      .text(0, 0, HUD_TEXT.hideKey, { fontFamily: FONT, fontSize: `${h.chipSize}px`, color: css(COLORS.navy) })
      .setOrigin(0.5);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: `${h.chipSize}px`, color: '#ffffff', stroke: css(COLORS.navy), strokeThickness: 4 })
      .setOrigin(0, 0.5);
    this.chip = scene.add.container(GAME.width / 2, this.chipY(), [this.cap, this.keyText, this.label]);
    this.refreshChip();

    const onKey = (): void => this.toggle();
    scene.input.keyboard?.on(`keydown-${HUD_TEXT.hideKey}`, onKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.keyboard?.off(`keydown-${HUD_TEXT.hideKey}`, onKey));
  }

  toggle(): void {
    const h = HUD.help;
    this.hidden = !this.hidden;
    saveHelpHidden(this.hidden);
    this.refreshChip();
    this.scene.tweens.killTweensOf([this.help, this.chip]);
    if (this.hidden) {
      this.scene.tweens.add({ targets: this.help, alpha: 0, duration: h.slideMs, onComplete: () => this.help.setVisible(false) });
    } else {
      this.help.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: this.help, alpha: h.alpha, duration: h.slideMs });
    }
    this.scene.tweens.add({ targets: this.chip, y: this.chipY(), duration: h.slideMs, ease: 'Cubic.easeOut' });
  }

  /** Over the reminder while it shows, down on the bottom edge once it is gone. */
  private chipY(): number {
    const h = HUD.help;
    const chipH = h.chipCapH + h.chipCapLip;
    return this.hidden ? GAME.height - h.bottom - chipH / 2 : GAME.height - h.bottom - h.size * 1.25 - h.chipGap - chipH / 2;
  }

  /** New label for the current state; the cap and label are re-centered because the label's width changes. */
  private refreshChip(): void {
    const h = HUD.help;
    this.label.setText(this.hidden ? HUD_TEXT.showControls : HUD_TEXT.hideControls);
    this.chip.setAlpha(this.hidden ? h.chipHiddenAlpha : h.chipAlpha);
    const capW = Math.max(h.chipCapMinW, this.keyText.width + 14);
    const total = capW + h.chipGapX + this.label.width;
    const left = -total / 2;
    const top = -(h.chipCapH + h.chipCapLip) / 2;
    this.cap.clear();
    this.cap.fillStyle(COLORS.navy, 1).fillRoundedRect(left - 2, top - 2, capW + 4, h.chipCapH + h.chipCapLip + 4, 8);
    this.cap.fillStyle(CAP_LIP, 1).fillRoundedRect(left, top + h.chipCapLip, capW, h.chipCapH, 6);
    this.cap.fillStyle(COLORS.cream, 1).fillRoundedRect(left, top, capW, h.chipCapH, 6);
    this.cap.fillStyle(COLORS.white, 0.55).fillRoundedRect(left + 3, top + 2, capW - 6, 3, 1.5);
    this.keyText.setPosition(left + capW / 2, top + h.chipCapH / 2 + 1);
    this.label.setPosition(left + capW + h.chipGapX, top + h.chipCapH / 2 + 1);
  }
}
