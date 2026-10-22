/** @file The grid of almanac cards (left side): one tappable card per entry, a gold border on the selected one, a "?" on the ones not met yet. */
import Phaser from 'phaser';
import { texArgs } from '../assets/atlas';
import { ALMANAC, ALMANAC_ORDER, almanacTex, type AlmanacId } from '../config/almanac';
import { COLORS, FONT } from '../config/style';

interface Card {
  readonly id: AlmanacId;
  readonly box: Phaser.GameObjects.Container;
  readonly frame: Phaser.GameObjects.Graphics;
  readonly seen: boolean;
}

export class AlmanacCards {
  private readonly cards: Card[] = [];
  private selected = 0;

  /** `seenOf` says whether an entry was met; `onSelect` is told every time the selection changes (a tap, an arrow key) and once at the start. */
  constructor(
    private readonly scene: Phaser.Scene,
    ox: number,
    oy: number,
    seenOf: (id: AlmanacId) => boolean,
    private readonly onSelect: (id: AlmanacId, seen: boolean) => void,
  ) {
    const G = ALMANAC.grid;
    ALMANAC_ORDER.forEach((id, i) => {
      const col = i % ALMANAC.cols;
      const row = Math.floor(i / ALMANAC.cols);
      const cx = ox + G.x + col * (G.cardW + G.gapX) + G.cardW / 2;
      const cy = oy + G.y + row * (G.cardH + G.gapY) + G.cardH / 2;
      const seen = seenOf(id);
      const frame = scene.add.graphics();
      const parts: Phaser.GameObjects.GameObject[] = [frame];
      if (seen) {
        const icon = scene.add.image(0, 0, ...texArgs(almanacTex(id)));
        icon.setScale(G.icon / Math.max(icon.width, icon.height));
        parts.push(icon);
      } else {
        parts.push(scene.add.text(0, 2, '?', { fontFamily: FONT, fontSize: '54px', color: '#e8ecf5', stroke: '#1b2340', strokeThickness: 6 }).setOrigin(0.5));
      }
      const box = scene.add.container(cx, cy, parts).setSize(G.cardW, G.cardH).setInteractive({ useHandCursor: true }).setDepth(3);
      box.on('pointerdown', () => this.select(i));
      box.on('pointerover', () => this.pop(box, i === this.selected ? ALMANAC.card.selectedScale : ALMANAC.card.hoverScale));
      box.on('pointerout', () => this.pop(box, i === this.selected ? ALMANAC.card.selectedScale : 1));
      this.cards.push({ id, box, frame, seen });
    });
    this.select(0);
  }

  /** Move the selection by a number of cards (arrow keys: +-1 sideways, +-cols up and down), staying inside the grid. */
  move(step: number): void {
    const next = this.selected + step;
    if (next >= 0 && next < this.cards.length) this.select(next);
  }

  private select(index: number): void {
    const C = ALMANAC.card;
    this.selected = index;
    this.cards.forEach((card, i) => {
      this.draw(card, i === index);
      this.pop(card.box, i === index ? C.selectedScale : 1);
    });
    const now = this.cards[index]!;
    this.onSelect(now.id, now.seen);
  }

  private pop(box: Phaser.GameObjects.Container, scale: number): void {
    this.scene.tweens.add({ targets: box, scale, duration: ALMANAC.card.popMs, ease: 'Sine.easeOut' });
  }

  private draw(card: Card, selected: boolean): void {
    const C = ALMANAC.card;
    const G = ALMANAC.grid;
    card.frame.clear();
    card.frame.fillStyle(card.seen ? C.fill : C.fillLocked, 1).fillRoundedRect(-G.cardW / 2, -G.cardH / 2, G.cardW, G.cardH, C.radius);
    card.frame.lineStyle(selected ? C.border + 2 : C.border, selected ? C.borderSelected : COLORS.navy, 1).strokeRoundedRect(-G.cardW / 2, -G.cardH / 2, G.cardW, G.cardH, C.radius);
    card.box.setDepth(selected ? 4 : 3);
  }
}
