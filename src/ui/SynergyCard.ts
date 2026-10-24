/** @file The rare 4th card of the belt pick screen: a synergy of two owned upgrades. Pink border, a "SINERGIE" tag, a looping picture of both upgrades working together, and their names. */
import Phaser from 'phaser';
import { UPGRADE_ART } from '../config/beltUpgradeArt';
import { BELT_UPGRADE_LOOK as L } from '../config/beltUpgrades';
import { BELT_SYNERGY_LOOK as S, type BeltSynergyId } from '../config/beltSynergies';
import { COLORS, FONT } from '../config/style';
import { BELT_SYNERGY_TEXT, BELT_SYNERGY_UI, synergyNeedNames } from '../content/beltUpgrades';
import { fitOneLine, type PickCard } from './PickCard';
import { SynergyIllustration } from './SynergyIllustration';

/** Same layout as `UpgradeCard`, but pink, with the two fused upgrades where a plain card shows its level. The picture plays both of them at once. */
export class SynergyCard implements PickCard {
  readonly box: Phaser.GameObjects.Container;
  readonly id: BeltSynergyId;
  private readonly back: Phaser.GameObjects.Graphics;
  /** The "SINERGIE" pill: drawn above the picture because it overlaps the picture's frame. */
  private readonly front: Phaser.GameObjects.Graphics;
  private readonly art: SynergyIllustration;
  private readonly texts: { name: Phaser.GameObjects.Text; body: Phaser.GameObjects.Text; fuse: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text; key: Phaser.GameObjects.Text | null };
  private selected = false;
  private baseScale = 1;
  private scaleTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    id: BeltSynergyId,
    x: number,
    y: number, // the card's center
    keyLabel: string | null,
  ) {
    const C = L.card;
    this.id = id;
    const words = BELT_SYNERGY_TEXT[id];
    const [needA, needB] = synergyNeedNames(id);
    const top = -C.h / 2;

    this.back = scene.add.graphics();
    this.front = scene.add.graphics();
    const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 5, align: 'center' });
    this.art = new SynergyIllustration(scene, id, top + UPGRADE_ART.stage.top + UPGRADE_ART.stage.h / 2); // both upgrades at work, as a small looping scene
    this.art.update(0);
    const name = scene.add.text(0, top + L.name.y, words.name, style(L.name.size, L.colors.normal)).setOrigin(0.5);
    fitOneLine(name, C.w - L.name.wrapPad * 2);
    const body = scene.add
      .text(0, top + L.text.y, words.text, { ...style(L.text.size, L.colors.dim), strokeThickness: 3, lineSpacing: L.text.lineSpacing, wordWrap: { width: C.w - L.text.wrapPad * 2 } })
      .setOrigin(0.5, 0);
    const fuse = scene.add.text(0, top + S.fuse.y, `${needA}\n+ ${needB}`, { ...style(S.fuse.size, S.colors.fuse), strokeThickness: 4 }).setOrigin(0.5);
    const tag = scene.add.text(0, top + S.tag.y, BELT_SYNERGY_UI.tag, { ...style(S.tag.size, S.tag.ink), strokeThickness: 0 }).setOrigin(0.5);
    const key = keyLabel ? scene.add.text(0, top + C.h - L.key.fromBottom, keyLabel, { ...style(L.key.size, L.colors.dim), strokeThickness: 3 }).setOrigin(0.5) : null;
    this.texts = { name, body, fuse, tag, key };

    this.box = scene.add.container(x, y, [this.back, this.art.view, this.front, name, body, fuse, tag, ...(key ? [key] : [])]).setDepth(L.depth + 2);
    this.box.setSize(C.w, C.h);
    this.redraw();
  }

  /** Called every frame by the pick screen: plays the picture. */
  update(timeMs: number): void {
    this.art.update(timeMs);
  }

  setBaseScale(scale: number): void {
    this.baseScale = scale;
    this.box.setScale(scale);
  }

  /** Make the card tappable: hover moves the selection, a press picks it. */
  onPointer(hover: () => void, press: () => void): void {
    this.box.setInteractive({ useHandCursor: true });
    this.box.on('pointerover', hover);
    this.box.on('pointerdown', press);
  }

  setSelected(on: boolean): void {
    if (this.selected === on) return;
    this.selected = on;
    this.redraw();
    this.scaleTween?.stop(); // only the grow/shrink: killing ALL tweens here would also kill the slide-in (intro) and leave the card see-through
    this.scaleTween = this.scene.tweens.add({ targets: this.box, scale: this.baseScale * (on ? L.card.selectedScale : 1), duration: 140, ease: 'Sine.easeOut' });
  }

  /** The cards slide up one after the other when the screen opens. */
  intro(index: number): void {
    const C = L.card;
    const y = this.box.y;
    this.box.setAlpha(0).setY(y + 46);
    this.scene.tweens.add({ targets: this.box, alpha: 1, y, duration: C.introMs, delay: index * C.introStaggerMs, ease: 'Back.easeOut' });
  }

  /** The pick: this card pops, the others sink away. */
  chosen(): void {
    this.scene.tweens.killTweensOf(this.box);
    this.scene.tweens.add({ targets: this.box, scale: this.baseScale * 1.12, duration: 160, yoyo: true, ease: 'Sine.easeOut' });
  }

  fadeAway(): void {
    this.scene.tweens.killTweensOf(this.box);
    this.scene.tweens.add({ targets: this.box, alpha: 0, y: this.box.y + 30, scale: this.baseScale * 0.92, duration: 260, ease: 'Sine.easeIn' });
  }

  private redraw(): void {
    const C = L.card;
    const sel = this.selected;
    const left = -C.w / 2;
    const top = -C.h / 2;
    const g = this.back.clear();
    g.fillStyle(0x000000, C.shadowAlpha).fillRoundedRect(left, top + C.shadowDy, C.w, C.h, C.radius);
    g.fillStyle(sel ? S.selectedFill : C.fill, sel ? 1 : C.alpha).fillRoundedRect(left, top, C.w, C.h, C.radius);
    g.lineStyle(C.borderWidth, sel ? COLORS.navy : S.borderColor, 1).strokeRoundedRect(left, top, C.w, C.h, C.radius);
    g.lineStyle(2, sel ? COLORS.navy : COLORS.cream, sel ? 0.25 : C.innerAlpha).strokeRoundedRect(left + C.innerInset, top + C.innerInset, C.w - C.innerInset * 2, C.h - C.innerInset * 2, C.radius - C.innerInset / 2);

    // The "SINERGIE" pill on the top edge.
    const T = S.tag;
    const f = this.front.clear();
    f.fillStyle(T.fill, 1).fillRoundedRect(-T.w / 2, top + T.y - T.h / 2, T.w, T.h, T.radius);
    f.lineStyle(3, COLORS.navy, 1).strokeRoundedRect(-T.w / 2, top + T.y - T.h / 2, T.w, T.h, T.radius);

    const X = this.texts;
    const ink = L.colors.selected;
    X.name.setColor(sel ? ink : L.colors.normal).setStroke(sel ? ink : '#1b2340', sel ? 0 : 5);
    X.body.setColor(sel ? ink : L.colors.dim).setStroke(sel ? ink : '#1b2340', sel ? 0 : 3);
    X.fuse.setColor(sel ? S.colors.fuseSelected : S.colors.fuse).setStroke(sel ? ink : '#1b2340', sel ? 0 : 4);
    X.key?.setColor(sel ? ink : L.colors.dim).setStroke(sel ? ink : '#1b2340', sel ? 0 : 3);
  }
}
