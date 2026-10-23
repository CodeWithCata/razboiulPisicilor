/** @file Graffiti-style joke message near the bottom of the HUD, one at a time with a short queue. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { TOAST } from '../config/jokes';
import { READING } from '../config/reading';
import { COLORS, FONT } from '../config/style';
import { usesTouchControls } from '../core/device';
import { readMs } from '../core/readingTime';

interface ToastItem {
  text: string;
  color: string;
  size: number;
}

/**
 * A graffiti message near the bottom of the HUD: no card, just chunky letters in the joke's color with a thick navy outline,
 * a hard shadow and a few paint drips, sprayed on slightly crooked (left, then right, ...). It stamps in and fades away.
 * One at a time; a couple can wait in line, and older ones are dropped so it never falls behind the game. Numbers: TOAST in config/jokes.ts.
 */
export class Toast {
  private readonly box: Phaser.GameObjects.Container;
  private readonly drips: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly queue: ToastItem[] = [];
  private busy = false;
  private lean = 1;
  /** Where the toast rests (y). Phones keep it higher so it never covers the thumb buttons. */
  private readonly restY: number;

  constructor(private readonly scene: Phaser.Scene) {
    const touch = usesTouchControls();
    this.restY = GAME.height - (touch ? TOAST.bottomTouch : TOAST.bottom);
    this.drips = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, align: 'center', wordWrap: { width: touch ? TOAST.maxWidthTouch : TOAST.maxWidth } })
      .setOrigin(0.5)
      .setShadow(TOAST.shadow.x, TOAST.shadow.y, '#1b2340', 0, true, true);
    this.box = scene.add.container(GAME.width / 2, this.restY, [this.drips, this.label]).setAlpha(0).setDepth(100);
  }

  show(text: string, color = '#ffffff', size = 26): void {
    this.queue.push({ text, color, size });
    while (this.queue.length > TOAST.maxQueue + (this.busy ? 0 : 1)) this.queue.shift();
    if (!this.busy) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const size = Math.round(item.size * TOAST.sizeFactor);
    this.label
      .setText(item.text)
      .setFontSize(size)
      .setColor(item.color)
      .setStroke('#1b2340', Math.round(size * TOAST.strokeFactor));
    this.drawDrips(item.color);

    // The line stays long enough to be read (a long joke used to vanish after the same 2.3 s as a short one); when others wait, a bit less.
    const read = readMs(item.text, TOAST.holdMs);
    const hold = this.queue.length > 0 ? Math.max(TOAST.holdMs, read * READING.toastBackedUpShare) : read;
    const restY = this.restY;
    this.lean = -this.lean;
    this.box.setPosition(GAME.width / 2, restY).setAlpha(0).setScale(TOAST.popFromScale).setAngle(this.lean * TOAST.tiltDeg);
    this.scene.tweens.add({
      targets: this.box,
      alpha: 1,
      scale: 1,
      duration: TOAST.popMs,
      ease: 'Back.easeOut',
      onComplete: () =>
        this.scene.tweens.add({
          targets: this.box,
          alpha: 0,
          y: restY + 8,
          delay: hold,
          duration: TOAST.fadeOutMs,
          onComplete: () => this.next(),
        }),
    });
  }

  /** A few paint drips hanging from the bottom of the letters: navy outline first, then the color on top. */
  private drawDrips(color: string): void {
    const D = TOAST.drips;
    const fill = Phaser.Display.Color.HexStringToColor(color).color;
    const baseY = this.label.height / 2 - this.label.style.strokeThickness;
    this.drips.clear();
    for (let i = 0; i < D.count; i++) {
      const x = Phaser.Math.FloatBetween(-0.4, 0.4) * this.label.width;
      const w = Phaser.Math.FloatBetween(D.w[0], D.w[1]);
      const len = Phaser.Math.FloatBetween(D.len[0], D.len[1]);
      this.drips.fillStyle(COLORS.navy, 1).fillRoundedRect(x - w / 2 - D.outline, baseY - 6, w + D.outline * 2, len + 6 + D.outline, (w + D.outline * 2) / 2);
      this.drips.fillStyle(fill, 1).fillRoundedRect(x - w / 2, baseY - 6, w, len + 6, w / 2);
    }
  }
}
