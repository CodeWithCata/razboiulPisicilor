/** @file The "what's new" card over the main menu: title, a few joke lines, one button. Closes on tap, Enter, Space or Esc; the menu ignores its own taps and keys while it is up. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { COLORS, FONT } from '../config/style';
import { WHATS_NEW_LOOK as L } from '../config/whatsNew';
import { WHATS_NEW_UI } from '../content/whatsNew';
import type { WhatsNewEntry } from '../content/whatsNew';
import { usesTouchControls } from '../core/device';
import { createLogoWord } from './logoWord';
import { createMenuButton } from './MenuButton';

const CLOSE_KEYS = ['Enter', 'NumpadEnter', 'Space', 'Escape'];

export class WhatsNewCard {
  private open = true;
  private closedAt = -Infinity;
  private readonly openedAt = performance.now();
  private readonly root: Phaser.GameObjects.Container;
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private readonly onKey: (e: KeyboardEvent) => void;

  /** `closeEvent` is the pointer event the menu starts on ('pointerdown' on desktop, 'pointerup' on a phone), so one tap does one thing. */
  constructor(
    private readonly scene: Phaser.Scene,
    entry: WhatsNewEntry,
    closeEvent: 'pointerdown' | 'pointerup',
    private readonly onClose: () => void,
  ) {
    const C = L.card;
    const touch = usesTouchControls();
    this.overlay = scene.add.rectangle(0, 0, GAME.width, GAME.height, L.dimColor, L.dimAlpha).setOrigin(0).setDepth(L.depth).setInteractive();
    this.overlay.on(closeEvent, () => this.close());

    const inner = scene.add.container(0, 0);
    const text = (y: number, str: string, size: number, color: string, wrap: number): Phaser.GameObjects.Text =>
      scene.add.text(C.padX + (wrap < C.w - C.padX * 2 ? L.line.bulletGap : 0), y, str, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 3, lineSpacing: L.line.lineSpacing, wordWrap: { width: wrap } });

    let y = C.padTop;
    const title = scene.add.container(C.w / 2, y + L.title.size / 2, createLogoWord(scene, WHATS_NEW_UI.title, L.title.size, L.title.color, 0, L.title.stroke)).setAngle(L.title.angleDeg);
    inner.add(title);
    y += L.title.size + L.tag.gap;
    inner.add(scene.add.text(C.w / 2, y, WHATS_NEW_UI.tag(entry.id), { fontFamily: FONT, fontSize: `${L.tag.size}px`, color: L.tag.color, stroke: '#1b2340', strokeThickness: 3 }).setOrigin(0.5, 0));
    y += L.tag.size + L.line.gap + 6;

    const lineObjs: Phaser.GameObjects.GameObject[] = [];
    const bullets = scene.add.graphics().fillStyle(COLORS.gold, 1);
    inner.add(bullets);
    for (const line of entry.lines) {
      const t = text(y, line, L.line.size, L.line.color, C.w - C.padX * 2 - L.line.bulletGap);
      bullets.fillCircle(C.padX + L.line.bulletR, y + L.line.size * 0.62, L.line.bulletR);
      inner.add(t);
      lineObjs.push(t);
      y += t.height + L.line.gap;
    }

    y += L.button.gapTop - L.line.gap;
    const B = L.button;
    const button = createMenuButton(scene, { x: C.w / 2, y: y + B.h / 2, w: B.w, h: B.h, size: B.size, label: WHATS_NEW_UI.button, accent: true, interactive: true }).setDepth(0);
    button.on(closeEvent, () => this.close());
    inner.add(button);
    y += B.h + L.hint.gap;
    inner.add(scene.add.text(C.w / 2, y, touch ? WHATS_NEW_UI.hintTouch : WHATS_NEW_UI.hint, { fontFamily: FONT, fontSize: `${L.hint.size}px`, color: L.hint.color, stroke: '#1b2340', strokeThickness: 3 }).setOrigin(0.5, 0));
    y += L.hint.size + C.padBottom;

    const back = scene.add.graphics();
    back.fillStyle(0x000000, C.shadowAlpha).fillRoundedRect(0, C.shadowDy, C.w, y, C.radius);
    back.fillStyle(C.fill, C.alpha).fillRoundedRect(0, 0, C.w, y, C.radius);
    back.lineStyle(C.borderWidth, C.borderColor, 1).strokeRoundedRect(0, 0, C.w, y, C.radius);
    back.lineStyle(2, COLORS.cream, C.innerAlpha).strokeRoundedRect(C.innerInset, C.innerInset, C.w - C.innerInset * 2, y - C.innerInset * 2, C.radius - C.innerInset / 2);
    inner.addAt(back, 0);
    inner.setPosition(-C.w / 2, -y / 2);

    this.root = scene.add.container(GAME.width / 2, GAME.height / 2, [inner]).setDepth(L.depth + 1);
    scene.tweens.add({ targets: this.root, scale: { from: 0.8, to: 1 }, alpha: { from: 0, to: 1 }, duration: L.introMs, ease: 'Back.easeOut' });
    lineObjs.forEach((t, i) => {
      (t as Phaser.GameObjects.Text).setAlpha(0);
      scene.tweens.add({ targets: t, alpha: 1, duration: 220, delay: L.introMs * 0.5 + i * L.lineStaggerMs });
    });

    this.onKey = (e: KeyboardEvent): void => {
      if (e.repeat || !CLOSE_KEYS.includes(e.code)) return;
      this.close();
    };
    scene.input.keyboard?.on('keydown', this.onKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  /** True while the card is up and for a moment after it closed: the menu must not start the game or open anything then. */
  isBlocking(): boolean {
    return this.open || performance.now() - this.closedAt < L.menuGraceMs;
  }

  private close(): void {
    if (!this.open || performance.now() - this.openedAt < L.graceMs) return;
    this.open = false;
    this.closedAt = performance.now();
    this.onClose();
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.tweens.add({ targets: [this.root, this.overlay], alpha: 0, duration: L.fadeOutMs, onComplete: () => this.cleanup() });
  }

  private cleanup(): void {
    this.scene.input?.keyboard?.off('keydown', this.onKey);
    this.root.destroy();
    this.overlay.destroy();
  }
}
