/** @file One row of the custom game setup screen: the name and a hint on the left, the control on the right (a triangle each side, the value between them, a strip of segments under it). A tap on the value (or the right triangle) steps forward, the left triangle steps back; both wrap round. */
import Phaser from 'phaser';
import { CUSTOM_ROWS, type CustomRowId, type CustomSetup } from '../config/customGame';
import { CUSTOM_SCREEN } from '../config/customScreen';
import { FONT } from '../config/style';
import { CUSTOM_TEXT } from '../content/customGame';

export interface CustomRowHandlers {
  /** The pointer is over the row or tapped it: the scene makes it the selected one (keys act on it). */
  onSelect(): void;
  /** A tap on the value or a triangle: 1 = the next choice, -1 = the one before. The scene changes the setup and refreshes the rows. */
  onStep(delta: -1 | 1): void;
}

/**
 * A row is drawn once; after that only the value text, the strip, the stripe, the triangles and the selection change.
 * The colors say something: gold = the row you are on, the page color = how much (strip and stripe), lilac = changed from the start, grey = switched off.
 */
export class CustomRow {
  readonly id: CustomRowId;
  private readonly root: Phaser.GameObjects.Container;
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly frameSelected: Phaser.GameObjects.Graphics;
  private readonly stripe: Phaser.GameObjects.Graphics;
  private readonly meter: Phaser.GameObjects.Graphics;
  private readonly triangles: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly controlX: number;
  private selected = false;

  /** `x` = the row's left edge, `y` = the middle of its height. */
  constructor(scene: Phaser.Scene, id: CustomRowId, x: number, y: number, handlers: CustomRowHandlers) {
    const R = CUSTOM_SCREEN.rows;
    const L = CUSTOM_SCREEN.row;
    const text = CUSTOM_TEXT.rows[id];
    this.id = id;
    this.controlX = R.w - L.controlFromRight;

    this.back = scene.add.graphics();
    this.frameSelected = scene.add.graphics().setVisible(false);
    this.frameSelected.lineStyle(L.border, L.borderSelected, 1).strokeRoundedRect(0, -R.h / 2, R.w, R.h, L.radius);
    this.stripe = scene.add.graphics();
    this.meter = scene.add.graphics();
    this.triangles = scene.add.graphics();
    this.drawBack();
    this.drawTriangles();

    // No outline on the row text: the row is dark, so an outline in the same dark only eats the letters. Name and hint are one block, centered in the row.
    const textW = this.controlX - L.triOffset - L.triW / 2 - L.textGap - L.padX;
    this.name = scene.add.text(L.padX, 0, text.name, { fontFamily: FONT, fontSize: `${L.nameSize}px`, color: L.nameColor }).setOrigin(0, 0);
    if (this.name.width > textW) this.name.setScale(textW / this.name.width);
    this.hint = scene.add.text(L.padX, 0, text.hint, { fontFamily: FONT, fontSize: `${L.hintSize}px`, color: L.hintColor, wordWrap: { width: textW }, lineSpacing: 1 }).setOrigin(0, 0);
    const nameH = this.name.height * this.name.scaleY;
    const blockH = nameH + L.textGapY + this.hint.height;
    this.name.setY(-blockH / 2);
    this.hint.setY(-blockH / 2 + nameH + L.textGapY);

    this.valueText = scene.add.text(this.controlX, L.valueY, '', { fontFamily: FONT, fontSize: `${L.valueSize}px`, color: L.valueColor }).setOrigin(0.5);

    // Hit zones, the biggest first (the top one under the pointer wins): the whole row selects it, the two control zones also step.
    const leftX = this.controlX - L.triOffset;
    const nextFrom = leftX + L.leftHitW / 2;
    const rowZone = scene.add.zone(R.w / 2, 0, R.w, R.h).setInteractive({ useHandCursor: true });
    const backZone = scene.add.zone(leftX, 0, L.leftHitW, R.h).setInteractive({ useHandCursor: true });
    const nextZone = scene.add.zone((nextFrom + R.w) / 2, 0, R.w - nextFrom, R.h).setInteractive({ useHandCursor: true });
    for (const zone of [rowZone, backZone, nextZone]) zone.on('pointerover', () => handlers.onSelect());
    rowZone.on('pointerdown', () => handlers.onSelect());
    backZone.on('pointerdown', () => {
      handlers.onSelect();
      handlers.onStep(-1);
    });
    nextZone.on('pointerdown', () => {
      handlers.onSelect();
      handlers.onStep(1);
    });

    this.root = scene.add.container(x, y, [this.back, this.stripe, this.frameSelected, this.name, this.hint, this.meter, this.triangles, this.valueText, rowZone, backZone, nextZone]);
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.frameSelected.setVisible(on);
    this.drawBack();
    this.drawTriangles();
  }

  /** Shows the choice the setup holds for this row (value, strip, stripe and colors). */
  refresh(setup: CustomSetup): void {
    const L = CUSTOM_SCREEN.row;
    const def = CUSTOM_ROWS[this.id];
    const index = setup[this.id];
    const off = this.isOff(index);
    const changed = index !== def.start;

    this.valueText.setText(CUSTOM_TEXT.rows[this.id].labels[index] ?? '');
    this.valueText.setColor(off ? L.offColor : changed ? L.changedColor : L.valueColor);
    // A long choice ("La fiecare 3 valuri") shrinks to fit between the triangles instead of touching them.
    const maxW = (L.triOffset - L.triW / 2 - 8) * 2;
    this.valueText.setScale(this.valueText.width > maxW ? maxW / this.valueText.width : 1);

    const textAlpha = off ? L.offTextAlpha : 1;
    this.name.setAlpha(textAlpha);
    this.hint.setAlpha(textAlpha);

    const color = off ? L.offStripe : L.pageColors[def.tab];
    const R = CUSTOM_SCREEN.rows;
    this.stripe.clear();
    this.stripe.fillStyle(color, 1).fillRoundedRect(L.border + 1, -R.h / 2 + L.border + 8, L.stripeW, R.h - L.border * 2 - 16, L.stripeW / 2);

    // The strip: one segment per choice, filled up to the chosen one (none when the row is off).
    const count = def.values.length;
    const segW = (L.meterW - (count - 1) * L.meterGap) / count;
    this.meter.clear();
    for (let i = 0; i < count; i++) {
      const filled = !off && i <= index;
      this.meter.fillStyle(filled ? color : L.meterEmpty, 1);
      this.meter.fillRoundedRect(this.controlX - L.meterW / 2 + i * (segW + L.meterGap), L.meterY - L.meterH / 2, segW, L.meterH, Math.min(3, segW / 2));
    }
  }

  destroy(): void {
    this.root.destroy();
  }

  /** A choice of 0 means "none / off / never", except on the rows listed in `zeroIsOn`. */
  private isOff(index: number): boolean {
    const L = CUSTOM_SCREEN.row;
    const def = CUSTOM_ROWS[this.id];
    return def.values[index] === 0 && !(L.zeroIsOn as readonly string[]).includes(this.id);
  }

  private drawBack(): void {
    const R = CUSTOM_SCREEN.rows;
    const L = CUSTOM_SCREEN.row;
    this.back.clear();
    this.back.fillStyle(this.selected ? L.fillSelected : L.fill, L.fillAlpha).fillRoundedRect(0, -R.h / 2, R.w, R.h, L.radius);
    this.back.lineStyle(L.border, L.borderColor, 1).strokeRoundedRect(0, -R.h / 2, R.w, R.h, L.radius);
  }

  /** The triangles are drawn, never font glyphs (the font may lack them). Gold on the selected row only. */
  private drawTriangles(): void {
    const L = CUSTOM_SCREEN.row;
    const leftX = this.controlX - L.triOffset;
    const rightX = this.controlX + L.triOffset;
    this.triangles.clear();
    this.triangles.fillStyle(this.selected ? L.triColor : L.triColorIdle, 1);
    this.triangles.fillTriangle(leftX + L.triW / 2, -L.triH / 2, leftX + L.triW / 2, L.triH / 2, leftX - L.triW / 2, 0);
    this.triangles.fillTriangle(rightX - L.triW / 2, -L.triH / 2, rightX - L.triW / 2, L.triH / 2, rightX + L.triW / 2, 0);
  }
}
