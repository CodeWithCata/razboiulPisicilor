/** @file Belt upgrade screen between waves: three cards (plus a rare synergy card) over the frozen game, pick one (keys 1-4, arrows + Enter, mouse or tap). */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { BELT_UPGRADE_LOOK as L, type BeltUpgradeId } from '../config/beltUpgrades';
import { BELT_SYNERGY_LOOK, type BeltSynergyId } from '../config/beltSynergies';
import { FONT } from '../config/style';
import { BELT_UPGRADE_UI } from '../content/beltUpgrades';
import { addBeltUpgrade } from '../core/beltUpgrades';
import { addBeltSynergy } from '../core/beltSynergies';
import { usesTouchControls } from '../core/device';
import { bus, Events, type BeltSynergyPayload, type BeltUpgradePayload } from '../core/events';
import { createLogoWord } from '../ui/logoWord';
import { createSunburst, createVignette } from '../ui/menuBackdrop';
import { OwnedUpgrades } from '../ui/OwnedUpgrades';
import type { PickCard } from '../ui/PickCard';
import { SynergyCard } from '../ui/SynergyCard';
import { UpgradeCard } from '../ui/UpgradeCard';

export interface UpgradeSceneData {
  wave: number;
  choices: BeltUpgradeId[];
  /** The rare 4th card (GameScene rolled it once for this pick). */
  synergy?: BeltSynergyId;
}

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const CONFIRM = ['Enter', 'NumpadEnter', 'Space'];

/**
 * The belt upgrade screen. GameScene and UIScene are paused underneath (like the pause menu). One card is picked, the upgrade goes up one
 * level (`core/beltUpgrades.ts`), `Events.BeltUpgradePicked` tells GameScene to refresh Varu's numbers, and the game goes on.
 * The rare synergy card (the last one) gives a synergy instead (`addBeltSynergy`, `Events.BeltSynergyPicked`) and levels nothing up.
 * There is no way to skip it: a pick is a free gift, and Esc is not needed.
 */
export class UpgradeScene extends Phaser.Scene {
  private wave = 0;
  private choices: BeltUpgradeId[] = [];
  private synergy: BeltSynergyId | null = null;
  private cards: PickCard[] = [];
  /** The chips along the bottom: what Varu already owns. Redrawn right after a pick so the new level shows while the card pops. */
  private owned: OwnedUpgrades | null = null;
  private selected = 0;
  private openedAt = 0;
  private leaving = false;

  constructor() {
    super('UpgradeScene');
  }

  init(data: UpgradeSceneData): void {
    this.wave = data.wave;
    this.choices = data.choices;
    this.synergy = data.synergy ?? null;
    this.cards = [];
    this.owned = null;
    this.selected = 0;
    this.leaving = false;
  }

  create(): void {
    const { width, height } = GAME;
    this.openedAt = this.time.now;

    // Same backdrop as the pause menu: navy tint over the frozen game (it also eats clicks), soft rays, dark edges.
    this.add.rectangle(0, 0, width, height, L.dimColor, L.dimAlpha).setOrigin(0).setDepth(L.depth).setInteractive();
    createSunburst(this, L.rayAlpha).setDepth(L.depth);
    createVignette(this)?.setDepth(L.depth);

    const title = this.add.container(width / 2, L.title.y, createLogoWord(this, BELT_UPGRADE_UI.title, L.title.size, '#f5c518', 0, L.title.stroke)).setDepth(L.depth + 3).setAngle(L.title.angleDeg);
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: L.title.introMs, ease: 'Back.easeOut' });
    this.add
      .text(width / 2, L.subtitle.y, BELT_UPGRADE_UI.subtitle(this.wave), { fontFamily: FONT, fontSize: `${L.subtitle.size}px`, color: '#fff3d6', stroke: '#1b2340', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(L.depth + 3);

    const C = L.card;
    const touch = usesTouchControls();
    const count = this.choices.length + (this.synergy ? 1 : 0);
    const natural = count * C.w + (count - 1) * C.gap;
    // With a 4th card the whole row shrinks (cards and gaps) until it fits `maxRowShare` of the screen width.
    const scale = Math.min(1, (width * BELT_SYNERGY_LOOK.maxRowShare) / natural);
    const step = (C.w + C.gap) * scale;
    const first = width / 2 - ((count - 1) * step) / 2;
    const place = (card: PickCard, i: number): void => {
      card.setBaseScale(scale);
      card.onPointer(
        () => this.select(i),
        () => {
          this.select(i);
          this.pick(i);
        },
      );
      card.intro(i);
      this.cards.push(card);
    };
    const cardY = C.top + C.h / 2;
    this.choices.forEach((id, i) => place(new UpgradeCard(this, id, first + i * step, cardY, null), i));
    if (this.synergy) {
      const i = this.choices.length;
      place(new SynergyCard(this, this.synergy, first + i * step, cardY, null), i);
    }
    this.select(0);

    this.add
      .text(width / 2, L.hint.y, touch ? BELT_UPGRADE_UI.hintTouch : BELT_UPGRADE_UI.hint(count), { fontFamily: FONT, fontSize: `${L.hint.size}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0.9)
      .setDepth(L.depth + 3);

    this.owned = new OwnedUpgrades(this, width / 2, L.owned.y);
    this.owned.intro();

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  update(time: number): void {
    for (const card of this.cards) card.update?.(time);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.leaving || e.repeat) return;
    if (LEFT.includes(e.code)) this.select((this.selected + this.cards.length - 1) % this.cards.length);
    else if (RIGHT.includes(e.code)) this.select((this.selected + 1) % this.cards.length);
    else if (CONFIRM.includes(e.code)) this.pick(this.selected);
    else {
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      const index = digit ? Number(digit[1]) - 1 : -1;
      if (index >= 0 && index < this.cards.length) this.pick(index);
    }
  }

  private select(index: number): void {
    this.selected = index;
    this.cards.forEach((card, i) => card.setSelected(i === index));
  }

  /** Take the card: the upgrade goes up a level, the others fade, then the game goes on. */
  private pick(index: number): void {
    if (this.leaving || this.time.now - this.openedAt < L.graceMs) return; // a held attack button must not pick by accident
    const isSynergy = this.synergy !== null && index === this.choices.length;
    const id = this.choices[index];
    if (!isSynergy && !id) return;
    this.leaving = true;
    this.select(index); // a number key picks without moving the selection: the picked card must look picked (gold), the rest dark while they fade
    if (isSynergy && this.synergy) {
      addBeltSynergy(this.synergy);
      const payload: BeltSynergyPayload = { id: this.synergy };
      bus.emit(Events.BeltSynergyPicked, payload); // no upgrade level-up for this card
      this.owned?.refreshAndPop(this.synergy);
    } else if (id) {
      const level = addBeltUpgrade(id);
      const payload: BeltUpgradePayload = { id, level };
      bus.emit(Events.BeltUpgradePicked, payload);
      this.owned?.refreshAndPop(id);
    }
    this.cards.forEach((card, i) => (i === index ? card.chosen() : card.fadeAway()));
    this.time.delayedCall(520, () => this.resume());
  }

  private resume(): void {
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    if (this.scene.isPaused('CutsceneScene')) this.scene.resume('CutsceneScene'); // paused with the game if a cutscene was playing
    this.scene.stop();
  }
}

