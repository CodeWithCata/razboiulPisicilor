/** @file The right-hand panel of the almanac: big picture, name, description, quote and four stat lines of the selected entry. */
import Phaser from 'phaser';
import { texArgs } from '../assets/atlas';
import { ALMANAC, almanacTex, type AlmanacId } from '../config/almanac';
import { COLORS, FONT } from '../config/style';
import { ALMANAC_ENTRIES, ALMANAC_TEXT, almanacStats } from '../content/almanac';

const NAVY = '#1b2340';

/** Built once; `show(id, seen)` swaps its contents. A card not met yet shows a "?" and a hint instead of the real entry. */
export class AlmanacDetail {
  private readonly picture: Phaser.GameObjects.Image;
  private readonly mark: Phaser.GameObjects.Text;
  private readonly name: Phaser.GameObjects.Text;
  private readonly desc: Phaser.GameObjects.Text;
  private readonly quote: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly values: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, ox: number, oy: number) {
    const P = ALMANAC.panel;
    const x = ox + P.x;
    const y = oy + P.y;
    const back = scene.add.graphics();
    back.fillStyle(P.fill, 1).fillRoundedRect(x, y, P.w, P.h, P.radius);
    back.lineStyle(5, COLORS.navy, 1).strokeRoundedRect(x, y, P.w, P.h, P.radius);

    const V = ALMANAC.preview;
    back.fillStyle(V.fill, 1).fillRoundedRect(x + V.x, y + V.y, V.w, V.h, 12);
    back.lineStyle(4, COLORS.navy, 1).strokeRoundedRect(x + V.x, y + V.y, V.w, V.h, 12);
    this.picture = scene.add.image(x + V.x + V.w / 2, y + V.y + V.h / 2, ...texArgs(almanacTex('normal'))).setDepth(2);
    this.mark = scene.add.text(x + V.x + V.w / 2, y + V.y + V.h / 2, '?', { fontFamily: FONT, fontSize: '110px', color: '#e3f3c8', stroke: NAVY, strokeThickness: 10 }).setOrigin(0.5).setDepth(2).setVisible(false);

    this.name = scene.add.text(x + P.w / 2, y + ALMANAC.name.y, '', { fontFamily: FONT, fontSize: `${ALMANAC.name.size}px`, color: '#1b2340', stroke: '#fff3d6', strokeThickness: 5 }).setOrigin(0.5).setDepth(2);

    const D = ALMANAC.desc;
    const Q = ALMANAC.quote;
    back.fillStyle(P.inner, P.innerAlpha).fillRoundedRect(x + 20, y + D.y, P.w - 40, D.h, 10);
    back.fillStyle(P.inner, P.innerAlpha * 0.8).fillRoundedRect(x + 20, y + Q.y, P.w - 40, Q.h, 10);
    const wrap = { width: P.w - 70 };
    this.desc = scene.add.text(x + 35, y + D.y + 10, '', { fontFamily: FONT, fontSize: `${D.size}px`, color: NAVY, wordWrap: wrap, lineSpacing: 2 }).setDepth(2);
    this.quote = scene.add.text(x + 35, y + Q.y + 8, '', { fontFamily: FONT, fontSize: `${Q.size}px`, color: '#8a4b12', wordWrap: wrap, lineSpacing: 2 }).setDepth(2);

    const S = ALMANAC.stats;
    for (let i = 0; i < 4; i++) {
      const cx = x + S.colX[i % 2]!;
      const cy = y + S.y + Math.floor(i / 2) * S.rowH;
      const label = scene.add.text(cx, cy, '', { fontFamily: FONT, fontSize: `${S.size}px`, color: '#1b2340' }).setDepth(2);
      const value = scene.add.text(cx, cy, '', { fontFamily: FONT, fontSize: `${S.size}px`, color: '#b3261e' }).setDepth(2);
      this.labels.push(label);
      this.values.push(value);
    }
  }

  /** Show this entry. `seen` false = not met yet (a "?", no real info). */
  show(id: AlmanacId, seen: boolean): void {
    const V = ALMANAC.preview;
    this.picture.setVisible(seen);
    this.mark.setVisible(!seen);
    if (seen) {
      this.picture.setTexture(...texArgs(almanacTex(id)));
      this.picture.setScale(1);
      this.picture.setScale(V.iconFit / Math.max(this.picture.width, this.picture.height));
    }
    const entry = ALMANAC_ENTRIES[id];
    const locked = ALMANAC_TEXT.locked;
    this.name.setText(seen ? entry.name : locked.name);
    this.desc.setText(seen ? entry.blurb : locked.blurb);
    this.quote.setText(seen ? entry.quote : locked.quote);
    const stats = almanacStats(id);
    for (let i = 0; i < 4; i++) {
      const stat = stats[i]!;
      this.labels[i]!.setText(seen ? `${stat.label}: ` : '').setVisible(seen);
      this.values[i]!.setText(seen ? stat.value : '').setVisible(seen);
      this.values[i]!.setX(this.labels[i]!.x + this.labels[i]!.width);
    }
  }
}
