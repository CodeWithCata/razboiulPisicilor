/** @file Skipping a cutscene: the "Sari peste" button (top right) plus the hold-to-skip ring and its hint line. */
import Phaser from 'phaser';
import { GAME } from '../../config/balance';
import { CUTSCENE } from '../../config/cutscene';
import { FONT } from '../../config/style';
import { CUTSCENE_TEXT } from '../../content/cutscenes';
import { usesTouchControls } from '../../core/device';

export class SkipHold {
  private readonly button: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly cx: number;
  private readonly cy: number;
  private shown = false;

  /** `onSkip` runs when the button is clicked / tapped. */
  constructor(
    private readonly scene: Phaser.Scene,
    onSkip: () => void,
  ) {
    const b = CUTSCENE.skip.button;
    this.label = scene.add
      .text(0, 0, CUTSCENE_TEXT.skipButton, { fontFamily: FONT, fontSize: `${b.size}px`, color: b.textColor })
      .setOrigin(0.5, 0.5);
    const w = Math.round(this.label.width + b.padX * 2);
    const h = Math.round(this.label.height + b.padY * 2);
    const left = GAME.width - b.right - w;
    this.button = scene.add
      .rectangle(left, b.top, w, h, b.fill)
      .setOrigin(0, 0)
      .setStrokeStyle(b.outlineWidth, b.outline)
      .setInteractive({ useHandCursor: true });
    this.label.setPosition(left + w / 2, b.top + h / 2).setDepth(1);
    this.button.on('pointerdown', () => this.button.setAlpha(b.pressedAlpha));
    this.button.on('pointerout', () => this.button.setAlpha(1));
    this.button.on('pointerup', () => {
      this.button.setAlpha(1);
      if (this.shown) onSkip();
    });

    const r = CUTSCENE.skip.ring;
    this.cx = left - r.gapPx - r.radius;
    this.cy = b.top + h / 2;
    this.ring = scene.add.graphics();
    this.hint = scene.add
      .text(this.cx - r.radius - CUTSCENE.skip.hint.gapPx, this.cy, usesTouchControls() ? CUTSCENE_TEXT.skipHintTouch : CUTSCENE_TEXT.skipHint, {
        fontFamily: FONT,
        fontSize: `${CUTSCENE.skip.hint.size}px`,
        color: CUTSCENE.skip.hint.color,
        stroke: '#1b2340',
        strokeThickness: CUTSCENE.skip.hint.stroke,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0);
    this.start(false);
  }

  /** A scene starts: a skippable one shows the button, and the hint for a few seconds. */
  start(skippable: boolean): void {
    this.shown = skippable;
    this.button.setVisible(skippable);
    this.label.setVisible(skippable);
    if (skippable) this.button.setInteractive();
    else this.button.disableInteractive();
    this.scene.tweens.killTweensOf(this.hint);
    this.hint.setAlpha(0);
    this.setProgress(0);
    if (!skippable) return;
    this.scene.tweens.add({
      targets: this.hint,
      alpha: CUTSCENE.skip.hint.alpha,
      duration: CUTSCENE.skip.hint.fadeMs,
      hold: CUTSCENE.skip.hint.showMs,
      yoyo: true,
    });
  }

  /** The scene is leaving: nothing to press any more. */
  stop(): void {
    this.shown = false;
    this.button.setVisible(false);
    this.label.setVisible(false);
    this.button.disableInteractive();
    this.setProgress(0);
  }

  /** 0 = nothing drawn, 1 = full ring (skip fires). */
  setProgress(progress: number): void {
    const { radius, width, color, backColor, backAlpha } = CUTSCENE.skip.ring;
    this.ring.clear();
    if (!this.shown || progress <= 0) return;
    this.ring.lineStyle(width, backColor, backAlpha);
    this.ring.strokeCircle(this.cx, this.cy, radius);
    this.ring.lineStyle(width, color, 1);
    this.ring.beginPath();
    this.ring.arc(this.cx, this.cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress));
    this.ring.strokePath();
  }
}
