/** @file Screen (opened from the pause menu, phones) where the attack, spin, throw and roll buttons are dragged to better spots, resized, or all put back to default. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { COLORS, FONT } from '../config/style';
import { MOVABLE_BUTTON_IDS, TOUCH, type MovableButtonId } from '../config/touch';
import { BUTTON_EDIT_TEXT } from '../content/pause';
import { hyp } from '../core/hyp';
import { clampSpot, cycleButtonSize, getButtonSize, resetAllButtons, setButtonSpot, spotIsFree, touchButton } from '../core/touchLayout';

const E = TOUCH.layoutEditor;

/**
 * The button editor. GameScene and UIScene stay paused underneath; the pause menu sleeps and wakes when this closes.
 * Tap a button to pick it (gold), drag it anywhere; "Mărime" cycles the size of the picked button; "Resetează tot" puts every
 * button back to its default spot and size. While dragging, the circle turns red on top of another button (or the pause button) and snaps back on release (`setButtonSpot` refuses a spot that is not free).
 * Everything is saved the moment it changes (core/touchLayout.ts) and the HUD follows through `Events.TouchLayoutChanged`.
 */
export class ButtonEditScene extends Phaser.Scene {
  private ring!: Phaser.GameObjects.Graphics;
  private warning!: Phaser.GameObjects.Text;
  private sizeLabel!: Phaser.GameObjects.Text;
  private labels = {} as Record<MovableButtonId, Phaser.GameObjects.Text>;
  /** Where each circle is drawn right now (the dragged one follows the finger). */
  private spots = {} as Record<MovableButtonId, { x: number; y: number; r: number }>;
  private selected: MovableButtonId = 'attack';
  private dragId: number | null = null;
  private dragging: MovableButtonId | null = null;
  private dragFree = true;
  private openedAt = 0;
  private leaving = false;

  constructor() {
    super('ButtonEditScene');
  }

  create(): void {
    const { width, height } = GAME;
    this.leaving = false;
    this.dragId = null;
    this.dragging = null;
    this.selected = 'attack';
    this.openedAt = this.time.now;
    this.input.addPointer(2); // thumbs: a second finger must not break a drag

    this.add.rectangle(0, 0, width, height, E.dimColor, E.dimAlpha).setOrigin(0).setDepth(E.depth).setInteractive();
    const style = (size: number): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: `${size}px`, color: '#fff3d6', stroke: '#1b2340', strokeThickness: 5, align: 'center' });
    this.add.text(width / 2, E.titleY, BUTTON_EDIT_TEXT.title, { ...style(E.titleSize), color: '#f5c518' }).setOrigin(0.5).setDepth(E.depth + 2);
    this.add.text(width / 2, E.helpY, BUTTON_EDIT_TEXT.help, style(E.helpSize)).setOrigin(0.5).setDepth(E.depth + 2);
    this.warning = this.add.text(width / 2, E.helpY + E.helpSize + 14, BUTTON_EDIT_TEXT.blocked, { ...style(E.helpSize), color: '#ff8a8a' }).setOrigin(0.5).setDepth(E.depth + 2).setVisible(false);

    // The pause button cannot be moved: a faint ghost so the player sees it is taken.
    const p = TOUCH.buttons.pause;
    const ghost = this.add.graphics().setDepth(E.depth + 1);
    ghost.fillStyle(E.ghostColor, E.ghostAlpha * 0.4).fillCircle(p.x, p.y, p.r);
    ghost.lineStyle(E.ringWidth - 2, E.ghostColor, E.ghostAlpha).strokeCircle(p.x, p.y, p.r);
    this.add.text(p.x, p.y, BUTTON_EDIT_TEXT.pause, { ...style(Math.round(p.r * 0.5)), color: '#c9cfe6' }).setOrigin(0.5).setAlpha(0.8).setDepth(E.depth + 2);

    this.ring = this.add.graphics().setDepth(E.depth + 3);
    for (const id of MOVABLE_BUTTON_IDS) this.labels[id] = this.add.text(0, 0, BUTTON_EDIT_TEXT.names[id], style(20)).setOrigin(0.5).setDepth(E.depth + 4);
    this.takeSpots();
    this.draw();

    this.makeButtons(style(E.buttonSize));

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onDown(ptr));
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.onMove(ptr));
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => this.onUp(ptr));
    this.input.on('pointerupoutside', (ptr: Phaser.Input.Pointer) => this.onUp(ptr));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !e.repeat) this.close();
    });
  }

  /** The three buttons under the screen: size (of the picked button), reset all, done. */
  private makeButtons(textStyle: Phaser.Types.GameObjects.Text.TextStyle): void {
    const { width } = GAME;
    const total = E.buttonW * 3 + E.buttonGap * 2;
    const first = width / 2 - total / 2 + E.buttonW / 2;
    const make = (index: number, label: string, fill: number, ink: string, action: () => void): Phaser.GameObjects.Text => {
      const x = first + index * (E.buttonW + E.buttonGap);
      const g = this.add.graphics().setDepth(E.depth + 2);
      g.fillStyle(fill, 1).fillRoundedRect(x - E.buttonW / 2, E.buttonsY - E.buttonH / 2, E.buttonW, E.buttonH, 16);
      g.lineStyle(4, COLORS.navy, 1).strokeRoundedRect(x - E.buttonW / 2, E.buttonsY - E.buttonH / 2, E.buttonW, E.buttonH, 16);
      const text = this.add.text(x, E.buttonsY, label, { ...textStyle, color: ink, strokeThickness: ink === '#1b2340' ? 0 : 5 }).setOrigin(0.5).setDepth(E.depth + 3);
      this.add
        .rectangle(x, E.buttonsY, E.buttonW, E.buttonH, 0xffffff, 0)
        .setDepth(E.depth + 5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this.time.now - this.openedAt > 250 && !this.leaving) action();
        });
      return text;
    };
    this.sizeLabel = make(0, '', 0x232c52, '#fff3d6', () => {
      cycleButtonSize(this.selected); // saved, and the HUD follows
      this.takeSpots();
      this.draw();
    });
    make(1, BUTTON_EDIT_TEXT.reset, 0x232c52, '#fff3d6', () => {
      resetAllButtons();
      this.takeSpots();
      this.draw();
    });
    make(2, BUTTON_EDIT_TEXT.done, COLORS.gold, '#1b2340', () => this.close());
  }

  /** Every circle goes to where its button really is now. */
  private takeSpots(): void {
    for (const id of MOVABLE_BUTTON_IDS) {
      const b = touchButton(id);
      this.spots[id] = { x: b.x, y: b.y, r: b.r };
    }
  }

  private draw(): void {
    const g = this.ring;
    g.clear();
    for (const id of MOVABLE_BUTTON_IDS) {
      const { x, y, r } = this.spots[id];
      const picked = id === this.selected;
      const bad = picked && this.dragging === id && !this.dragFree;
      const color = bad ? E.badColor : picked ? E.goodColor : E.ghostColor;
      g.fillStyle(color, picked ? 0.3 : 0.16).fillCircle(x, y, r);
      g.lineStyle(picked ? E.ringWidth : E.ringWidth - 2, color, picked ? 1 : 0.7).strokeCircle(x, y, r);
      this.labels[id].setPosition(x, y).setFontSize(Math.round(r * 0.36)).setColor(picked ? '#ffffff' : '#c9cfe6');
    }
    this.warning.setVisible(this.dragging !== null && !this.dragFree);
    this.sizeLabel?.setText(BUTTON_EDIT_TEXT.size(BUTTON_EDIT_TEXT.names[this.selected], BUTTON_EDIT_TEXT.sizeNames[getButtonSize(this.selected)]));
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.leaving || this.dragId !== null || this.time.now - this.openedAt < 250) return;
    for (const id of MOVABLE_BUTTON_IDS) {
      const s = this.spots[id];
      if (hyp(p.x - s.x, p.y - s.y) <= s.r + TOUCH.buttonSlop) {
        this.selected = id;
        this.dragId = p.id;
        this.dragging = id;
        this.dragFree = true;
        this.draw();
        return;
      }
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId || !this.dragging) return;
    const s = this.spots[this.dragging];
    const spot = clampSpot(p.x, p.y, s.r);
    s.x = spot.x;
    s.y = spot.y;
    this.dragFree = spotIsFree(this.dragging, spot.x, spot.y, s.r);
    this.draw();
  }

  /** Let go: keep the spot if it is free, otherwise the circle jumps back to where the button was. */
  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    const id = this.dragging;
    this.dragId = null;
    this.dragging = null;
    if (id) {
      const s = this.spots[id];
      if (!setButtonSpot(id, s.x, s.y)) this.takeSpots();
    }
    this.dragFree = true;
    this.draw();
  }

  private close(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.wake('PauseScene');
    this.scene.stop();
  }
}
