/** @file The almanac screen (opened from the main menu, like the Suburban Almanac in Plants vs. Zombies): a grid of cards for every cat, boss and pickup, and a panel with the selected one. */
import Phaser from 'phaser';
import { ALMANAC, ALMANAC_ORDER, ALMANAC_TITLE_BOOK } from '../config/almanac';
import { GAME } from '../config/balance';
import { FONT } from '../config/style';
import { ALMANAC_TEXT } from '../content/almanac';
import { hasSeen } from '../core/almanac';
import { usesTouchControls } from '../core/device';
import { addAlmanacBook } from '../ui/AlmanacBook';
import { AlmanacCards } from '../ui/AlmanacCards';
import { AlmanacDetail } from '../ui/AlmanacDetail';
import { createMenuButton } from '../ui/MenuButton';
import { createMenuBackdrop } from '../ui/menuBackdrop';
import { MuteBadge } from '../ui/MuteBadge';

/** `?almanac=all` in the address shows every card as met (to look at the real entries without playing). */
const showAll = (): boolean => /[?&]almanac=all\b/.test(window.location.search);

export class AlmanacScene extends Phaser.Scene {
  constructor() {
    super('AlmanacScene');
  }

  create(): void {
    const { width, height } = GAME;
    const ox = (width - ALMANAC.base.w) / 2;
    const oy = (height - ALMANAC.base.h) / 2;
    const all = showAll();

    createMenuBackdrop(this);

    const title = this.add.text(width / 2, oy + ALMANAC.titleY, ALMANAC_TEXT.title, { fontFamily: FONT, fontSize: '56px', color: '#f5c518', stroke: '#1b2340', strokeThickness: 10 }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: title, scale: { from: 0.8, to: 1 }, duration: 320, ease: 'Back.easeOut' });
    // A book on each end of the title, so the screen says what it is before anyone reads it.
    for (const side of [-1, 1] as const) {
      const book = addAlmanacBook(this, width / 2 + side * (title.width / 2 + ALMANAC_TITLE_BOOK.gap), oy + ALMANAC.titleY, ALMANAC_TITLE_BOOK.h).setDepth(5).setAngle(side * 8);
      this.tweens.add({ targets: book, scale: { from: 0.6, to: 1 }, duration: 320, ease: 'Back.easeOut' });
    }

    const detail = new AlmanacDetail(this, ox, oy);
    const cards = new AlmanacCards(this, ox, oy, (id) => all || hasSeen(id), (id, seen) => detail.show(id, seen));

    const met = ALMANAC_ORDER.filter((id) => all || hasSeen(id)).length;
    this.add.text(ox + ALMANAC.counter.x, oy + ALMANAC.counter.y, ALMANAC_TEXT.found(met, ALMANAC_ORDER.length), { fontFamily: FONT, fontSize: `${ALMANAC.counter.size}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: 5 }).setDepth(5);

    const B = ALMANAC.back;
    const back = createMenuButton(this, { x: ox + B.x, y: oy + B.y, w: B.w, h: B.h, size: B.size, label: ALMANAC_TEXT.back, accent: true, interactive: true });
    const close = (): void => {
      this.scene.start('MenuScene');
    };
    back.on('pointerdown', close);

    if (!usesTouchControls()) {
      this.add.text(ox + ALMANAC.base.w - 44, oy + B.y, ALMANAC_TEXT.keys, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#1b2340', strokeThickness: 4 }).setOrigin(1, 0.5).setAlpha(0.85).setDepth(5);
    }
    new MuteBadge(this, width - 46, 46);

    const keys = this.input.keyboard;
    keys?.on('keydown-ESC', close);
    keys?.on('keydown-BACKSPACE', close);
    keys?.on('keydown-LEFT', () => cards.move(-1));
    keys?.on('keydown-RIGHT', () => cards.move(1));
    keys?.on('keydown-UP', () => cards.move(-ALMANAC.cols));
    keys?.on('keydown-DOWN', () => cards.move(ALMANAC.cols));
  }
}
