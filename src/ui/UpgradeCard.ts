/** @file One card of the belt upgrade screen: a little looping picture of what the upgrade does, name, what it does, level pips; gold when chosen. */
import Phaser from 'phaser';
import { UPGRADE_ART } from '../config/beltUpgradeArt';
import { BELT_UPGRADE_LOOK as L, type BeltUpgradeId } from '../config/beltUpgrades';
import { COLORS, FONT } from '../config/style';
import { BELT_UPGRADE_TEXT, BELT_UPGRADE_UI } from '../content/beltUpgrades';
import { beltUpgradeLevel, beltUpgradeMaxLevel, beltUpgradeValueAt } from '../core/beltUpgrades';
import { fitOneLine, type PickCard } from './PickCard';
import { UpgradeIllustration } from './UpgradeIllustration';

/** The upgrades whose number gets SMALLER when they improve (a shorter pause). */
const FASTER: readonly BeltUpgradeId[] = ['quick', 'tornado'];

/** "0%", "+20%" or "-18%": what an upgrade gives at a level. */
function percent(id: BeltUpgradeId, level: number): string {
  const v = beltUpgradeValueAt(id, level);
  const pct = Math.round((FASTER.includes(id) ? 1 - v : v - 1) * 100);
  const sign = FASTER.includes(id) ? '-' : '+';
  return pct === 0 ? '0%' : `${sign}${pct}%`;
}

export class UpgradeCard implements PickCard {
  readonly box: Phaser.GameObjects.Container;
  readonly id: BeltUpgradeId;
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly pips: Phaser.GameObjects.Graphics;
  private readonly art: UpgradeIllustration;
  private readonly texts: { name: Phaser.GameObjects.Text; body: Phaser.GameObjects.Text; change: Phaser.GameObjects.Text; level: Phaser.GameObjects.Text; key: Phaser.GameObjects.Text | null };
  private readonly level: number;
  private selected = false;
  private baseScale = 1;
  private scaleTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    id: BeltUpgradeId,
    x: number,
    y: number, // the card's center
    keyLabel: string | null,
  ) {
    const C = L.card;
    this.id = id;
    this.level = beltUpgradeLevel(id);
    const words = BELT_UPGRADE_TEXT[id];
    const top = -C.h / 2;

    this.back = scene.add.graphics();
    this.pips = scene.add.graphics();
    const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({ fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: 5, align: 'center' });
    this.art = new UpgradeIllustration(scene, id, top + UPGRADE_ART.stage.top + UPGRADE_ART.stage.h / 2); // what the upgrade does, as a small looping scene
    this.art.update(0);
    const name = scene.add.text(0, top + L.name.y, words.name, style(L.name.size, L.colors.normal)).setOrigin(0.5);
    fitOneLine(name, C.w - L.name.wrapPad * 2);
    const body = scene.add
      .text(0, top + L.text.y, words.text, { ...style(L.text.size, L.colors.dim), strokeThickness: 3, lineSpacing: L.text.lineSpacing, wordWrap: { width: C.w - L.text.wrapPad * 2 } })
      .setOrigin(0.5, 0);
    const next = Math.min(beltUpgradeMaxLevel(id), this.level + 1);
    const change = scene.add.text(0, top + L.change.y, `${percent(id, this.level)}  →  ${percent(id, next)}`, style(L.change.size, L.colors.up)).setOrigin(0.5);
    const level = scene.add.text(0, top + L.levelText.y, BELT_UPGRADE_UI.level(this.level, next), { ...style(L.key.size, L.colors.dim), strokeThickness: 3 }).setOrigin(0.5);
    const key = keyLabel ? scene.add.text(0, top + C.h - L.key.fromBottom, keyLabel, { ...style(L.key.size, L.colors.dim), strokeThickness: 3 }).setOrigin(0.5) : null;
    this.texts = { name, body, change, level, key };

    this.box = scene.add.container(x, y, [this.back, this.art.view, this.pips, name, body, change, level, ...(key ? [key] : [])]).setDepth(L.depth + 2);
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
    const C = L.card;
    this.scaleTween = this.scene.tweens.add({ targets: this.box, scale: this.baseScale * (on ? C.selectedScale : 1), duration: 140, ease: 'Sine.easeOut' });
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
    g.fillStyle(sel ? C.selectedFill : C.fill, sel ? 1 : C.alpha).fillRoundedRect(left, top, C.w, C.h, C.radius);
    g.lineStyle(C.borderWidth, sel ? COLORS.navy : C.borderColor, 1).strokeRoundedRect(left, top, C.w, C.h, C.radius);
    g.lineStyle(2, sel ? COLORS.navy : COLORS.cream, sel ? 0.25 : C.innerAlpha).strokeRoundedRect(left + C.innerInset, top + C.innerInset, C.w - C.innerInset * 2, C.h - C.innerInset * 2, C.radius - C.innerInset / 2);

    const T = this.texts;
    const ink = L.colors.selected;
    T.name.setColor(sel ? ink : L.colors.normal).setStroke(sel ? ink : '#1b2340', sel ? 0 : 5);
    T.body.setColor(sel ? ink : L.colors.dim).setStroke(sel ? ink : '#1b2340', sel ? 0 : 3);
    T.change.setColor(sel ? L.colors.upSelected : L.colors.up).setStroke(sel ? ink : '#1b2340', sel ? 0 : 5);
    T.level.setColor(sel ? ink : L.colors.dim).setStroke(sel ? ink : '#1b2340', sel ? 0 : 3);
    T.key?.setColor(sel ? ink : L.colors.dim).setStroke(sel ? ink : '#1b2340', sel ? 0 : 3);

    // Level pips: gold = you have it, green = what this pick adds, dark = still to come.
    const P = L.pips;
    const max = beltUpgradeMaxLevel(this.id);
    const total = max * P.w + (max - 1) * P.gap;
    const p = this.pips.clear();
    for (let i = 0; i < max; i++) {
      const color = i < this.level ? COLORS.gold : i === this.level ? 0x4cc46a : sel ? 0xb38b0c : P.offColor;
      const alpha = i < this.level ? 1 : i === this.level ? 1 : 0.9;
      p.fillStyle(color, alpha).fillRoundedRect(-total / 2 + i * (P.w + P.gap), -C.h / 2 + P.y, P.w, P.h, P.radius);
      p.lineStyle(2, COLORS.navy, 1).strokeRoundedRect(-total / 2 + i * (P.w + P.gap), -C.h / 2 + P.y, P.w, P.h, P.radius);
    }
  }
}
