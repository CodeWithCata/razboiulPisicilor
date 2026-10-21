/** @file The dialogue box: a cream card with the speaker's picture and name, a typewriter, and a bobbing "tap" arrow. */
import Phaser from 'phaser';
import { photoKey } from '../../assets/keys';
import { GAME } from '../../config/balance';
import { CUTSCENE } from '../../config/cutscene';
import { FONT } from '../../config/style';
import { SPEAKERS } from '../../content/cutscenes';
import { revealedCount } from '../../core/cutscene';
import { bus, Events, type CutsceneBlipPayload, type CutsceneLinePayload } from '../../core/events';

export class DialogueBox {
  private readonly root: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image | null = null;
  private readonly name: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Graphics;
  private readonly width: number;
  private readonly boxX: number;
  private readonly boxY: number;
  private wrapped = '';
  private elapsed = 0;
  private shownCount = 0;
  private isTyping = false;
  private isOpen = false;
  private autoLine = false;
  /** Where the last speaker with a picture stood; the next new speaker takes the other side. */
  private side: 'left' | 'right' = 'right';
  private lastSpeaker: string | null = null;
  private pitch = 1;
  private bobTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    barHeight: number,
  ) {
    const b = CUTSCENE.box;
    this.width = Math.min(b.maxWidth, Math.round(GAME.width * b.widthShare));
    this.boxX = Math.round((GAME.width - this.width) / 2);
    this.boxY = GAME.height - barHeight - b.gapAboveBar - b.height;

    this.panel = scene.add.graphics();
    this.panel.fillStyle(b.fill, 1);
    this.panel.fillRoundedRect(0, 0, this.width, b.height, b.radius);
    this.panel.lineStyle(b.outlineWidth, b.outline, 1);
    this.panel.strokeRoundedRect(0, 0, this.width, b.height, b.radius);

    this.name = scene.add
      .text(b.pad, -b.nameLift, '', {
        fontFamily: FONT,
        fontSize: `${b.nameSize}px`,
        color: '#fff3d6',
        stroke: '#1b2340',
        strokeThickness: b.nameStroke,
      })
      .setOrigin(0, 0);
    this.body = scene.add
      .text(0, b.pad, '', {
        fontFamily: FONT,
        fontSize: `${b.textSize}px`,
        color: b.textColor,
        lineSpacing: b.lineSpacing,
      })
      .setOrigin(0, 0);
    this.prompt = scene.add.graphics();

    this.root = scene.add.container(this.boxX, this.boxY, [this.panel, this.name, this.body, this.prompt]);
    this.root.setVisible(false);
  }

  get open(): boolean {
    return this.isOpen;
  }

  get typing(): boolean {
    return this.isTyping;
  }

  /** The director said a line: open the box and start typing. */
  show(line: CutsceneLinePayload): void {
    const b = CUTSCENE.box;
    const speaker = SPEAKERS[line.speaker];
    this.pitch = speaker?.blipPitch ?? 1;
    this.autoLine = line.auto;

    // The picture: a friend's photo if it is loaded, else the code-drawn sprite, else none.
    this.portrait?.destroy();
    this.portrait = null;
    let key: string | undefined;
    if (speaker?.photo && this.scene.textures.exists(photoKey(speaker.photo))) key = photoKey(speaker.photo);
    else if (speaker?.tex) key = speaker.tex;

    // Who stands where: a new speaker takes the other side (a talker with a fixed side keeps it).
    if (key !== undefined) {
      if (speaker?.side) this.side = speaker.side;
      else if (line.speaker !== this.lastSpeaker) this.side = this.side === 'left' ? 'right' : 'left';
      this.lastSpeaker = line.speaker;
    }
    const left = this.side === 'left';
    const pt = b.portrait;
    if (key !== undefined) {
      const cx = left ? pt.inset + pt.size / 2 : this.width - pt.inset - pt.size / 2;
      const img = this.scene.add.image(cx, pt.overlap, key).setOrigin(0.5, 1);
      img.setScale(pt.size / Math.max(img.frame.realWidth, img.frame.realHeight));
      this.root.addAt(img, 0); // first in the container = behind the card: the box overflows the character's feet
      this.portrait = img;
      const slide = left ? -pt.slidePx : pt.slidePx;
      img.setX(cx + slide).setAlpha(0);
      this.scene.tweens.add({ targets: img, x: cx, alpha: 1, duration: pt.slideMs, ease: 'Back.easeOut' });
    }

    const textX = b.pad;
    const textWidth = this.width - textX - b.pad;
    this.body.setX(textX);
    this.body.setWordWrapWidth(textWidth);
    // Wrap once up front and type the wrapped text, so words never jump to the next line while they are being typed.
    this.body.setText(line.text);
    this.wrapped = this.body.getWrappedText().join('\n');
    this.body.setText('');

    const name = speaker?.name ?? line.speaker;
    this.name.setText(name);
    // The name tag sits on the top edge, right next to the portrait (on the inner side of it).
    const nameX = key === undefined ? b.pad : left ? pt.inset + pt.size + pt.nameGap : this.width - pt.inset - pt.size - pt.nameGap;
    this.name.setPosition(nameX, -b.nameLift).setOrigin(!left && key !== undefined ? 1 : 0, 0);
    this.name.setColor(speaker?.color ?? '#fff3d6');
    this.name.setVisible(name !== '');

    this.elapsed = 0;
    this.shownCount = 0;
    this.isTyping = true;
    this.isOpen = true;
    this.prompt.clear();
    this.root.setVisible(true);
    this.root.setScale(b.popFromScale).setAlpha(0);
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: b.popMs, ease: 'Back.easeOut' });
  }

  /** A new cutscene: the first speaker with a picture stands on the left again. */
  reset(): void {
    this.side = 'right';
    this.lastSpeaker = null;
  }

  hide(): void {
    this.isOpen = false;
    this.isTyping = false;
    this.root.setVisible(false);
    this.prompt.clear();
  }

  /** Show the rest of the line at once (the first tap while it types). */
  complete(): void {
    if (!this.isTyping) return;
    this.body.setText(this.wrapped);
    this.shownCount = this.wrapped.length;
    this.isTyping = false;
  }

  update(deltaMs: number): void {
    if (!this.isOpen) return;
    if (this.isTyping) {
      this.elapsed += deltaMs;
      const count = revealedCount(this.wrapped, this.elapsed, CUTSCENE.type);
      if (count !== this.shownCount) {
        const every = CUTSCENE.type.blipEveryChars;
        const last = this.wrapped.charAt(count - 1);
        if (count % every === 0 && last.trim() !== '') {
          const jitter = CUTSCENE.type.blipPitchJitter;
          const payload: CutsceneBlipPayload = { pitch: this.pitch * (1 + (Math.random() * 2 - 1) * jitter) };
          bus.emit(Events.CutsceneBlip, payload);
        }
        this.shownCount = count;
        this.body.setText(this.wrapped.slice(0, count));
      }
      if (count >= this.wrapped.length) this.isTyping = false;
      return;
    }
    if (this.autoLine) return; // an auto line closes by itself: no "tap" arrow
    // The arrow in the corner, bobbing: tap for the next line.
    const p = CUTSCENE.box.prompt;
    this.bobTime += deltaMs;
    const bob = Math.sin((this.bobTime / p.bobMs) * Math.PI * 2) * p.bobPx;
    const x = this.width - CUTSCENE.box.pad - p.size;
    const y = CUTSCENE.box.height - CUTSCENE.box.pad - p.size + bob;
    this.prompt.clear();
    this.prompt.fillStyle(p.color, 1);
    this.prompt.fillTriangle(x, y, x + p.size, y, x + p.size / 2, y + p.size * 0.8);
  }
}
