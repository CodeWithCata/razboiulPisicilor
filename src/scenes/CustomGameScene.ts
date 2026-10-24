/** @file The custom game setup screen (opened from the main menu with C or a tap, and from the end screen of a custom run): four pages (quick presets, cats, bosses, rules), Înapoi / Aleatoriu / Resetează / JOACĂ. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { CUSTOM_PRESETS, CUSTOM_TABS, rowsOfTab, type CustomPresetId, type CustomRowId, type CustomTabId } from '../config/customGame';
import { CUSTOM_SCREEN } from '../config/customScreen';
import { FONT } from '../config/style';
import { CUSTOM_TEXT } from '../content/customGame';
import { applyPreset, getCustomSetup, randomizeSetup, resetSetup, setupProblem, stepChoice } from '../core/customGame';
import { usesTouchControls } from '../core/device';
import { CustomRow } from '../ui/CustomRow';
import { createMenuButton } from '../ui/MenuButton';
import { createMenuBackdrop } from '../ui/menuBackdrop';
import { MuteBadge } from '../ui/MuteBadge';
import { launchRun } from '../ui/launchRun';

/** The page that was open last, so a rebuild (the screen size changed) or a return from a run lands on the same page. */
let lastTab: CustomTabId = 'quick';

/** One preset card: a container whose middle is the middle of the card, plus the gold frame shown while it is selected. */
interface PresetCard {
  id: CustomPresetId;
  root: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
}

export class CustomGameScene extends Phaser.Scene {
  private tab: CustomTabId = 'quick';
  private rows: CustomRow[] = [];
  private cards: PresetCard[] = [];
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private pageObjects: Phaser.GameObjects.GameObject[] = [];
  private selectedRow = 0;
  private selectedCard = 0;
  private problemText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Container;
  private keysText: Phaser.GameObjects.Text | null = null;
  private keysPill: Phaser.GameObjects.Graphics | null = null;
  private started = false;
  private oy = 0;

  constructor() {
    super('CustomGameScene');
  }

  create(): void {
    const S = CUSTOM_SCREEN;
    const { width, height } = GAME;
    this.oy = (height - S.base.h) / 2;
    this.started = false;
    this.rows = [];
    this.cards = [];
    this.tabButtons = [];
    this.pageObjects = [];
    this.keysText = null;
    this.keysPill = null;
    this.selectedRow = 0;
    this.selectedCard = 0;
    this.tab = lastTab;

    createMenuBackdrop(this);
    const title = this.add.text(width / 2, this.oy + S.titleY, CUSTOM_TEXT.title, { fontFamily: FONT, fontSize: `${S.titleSize}px`, color: '#c9a7ff', stroke: '#1b2340', strokeThickness: 10 }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: title, scale: { from: 0.8, to: 1 }, duration: S.titlePopMs, ease: 'Back.easeOut' });

    this.problemText = this.add.text(width / 2, this.oy + S.problem.y, '', { fontFamily: FONT, fontSize: `${S.problem.size}px`, color: S.problem.color, stroke: '#1b2340', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(5);
    this.buildFooter();
    this.buildTabs();
    this.buildPage();
    this.refreshAll();
    new MuteBadge(this, width - 46, 46);
    this.bindKeys();
  }

  // ---- building ----

  private buildTabs(): void {
    const T = CUSTOM_SCREEN.tabs;
    for (const button of this.tabButtons) button.destroy();
    this.tabButtons = [];
    const total = CUSTOM_TABS.length * T.w + (CUSTOM_TABS.length - 1) * T.gap;
    CUSTOM_TABS.forEach((id, i) => {
      const x = GAME.width / 2 - total / 2 + T.w / 2 + i * (T.w + T.gap);
      const button = createMenuButton(this, { x, y: this.oy + T.y, w: T.w, h: T.h, size: T.size, label: CUSTOM_TEXT.tabs[id], accent: id === this.tab, interactive: true });
      button.setDepth(5).on('pointerdown', () => this.openTab(id));
      this.tabButtons.push(button);
    });
    if (!usesTouchControls()) {
      const K = CUSTOM_SCREEN.keys;
      this.keysText?.destroy();
      this.keysPill?.destroy();
      this.keysText = this.add
        .text(GAME.width / 2, this.oy + CUSTOM_SCREEN.keysY, this.tab === 'quick' ? CUSTOM_TEXT.keysQuick : CUSTOM_TEXT.keysRows, { fontFamily: FONT, fontSize: `${CUSTOM_SCREEN.keysSize}px`, color: K.color })
        .setOrigin(0.5)
        .setDepth(6);
      const w = this.keysText.width + K.padX * 2;
      const h = this.keysText.height + K.padY * 2;
      this.keysPill = this.add.graphics().setDepth(5);
      this.keysPill.fillStyle(0x1b2340, K.pillAlpha).fillRoundedRect(this.keysText.x - w / 2, this.keysText.y - h / 2, w, h, h / 2);
    }
  }

  private clearPage(): void {
    for (const row of this.rows) row.destroy();
    for (const card of this.cards) card.root.destroy();
    for (const object of this.pageObjects) object.destroy();
    this.rows = [];
    this.cards = [];
    this.pageObjects = [];
  }

  /** The rows of the open page, or the four preset cards of the quick page. */
  private buildPage(): void {
    this.clearPage();
    if (this.tab === 'quick') this.buildCards();
    else this.buildRows();
  }

  private buildRows(): void {
    const R = CUSTOM_SCREEN.rows;
    const ids = rowsOfTab(this.tab);
    this.selectedRow = Math.min(this.selectedRow, Math.max(0, ids.length - 1));
    // A long page is split into two columns; the first column is filled first, so Up / Down still walks the rows in list order.
    const columns = ids.length > R.maxPerColumn ? 2 : 1;
    const perColumn = Math.ceil(ids.length / columns);
    const gridW = columns * R.w + (columns - 1) * R.colGap;
    const left = GAME.width / 2 - gridW / 2;
    ids.forEach((id: CustomRowId, i) => {
      const col = Math.floor(i / perColumn);
      const line = i % perColumn;
      const x = left + col * (R.w + R.colGap);
      const y = this.oy + R.top + line * (R.h + R.gap) + R.h / 2;
      const row = new CustomRow(this, id, x, y, {
        onSelect: () => this.selectRow(i),
        onStep: (delta) => {
          stepChoice(id, delta);
          this.refreshAll();
        },
      });
      this.rows.push(row);
    });
    this.selectRow(this.selectedRow);
  }

  private buildCards(): void {
    const C = CUSTOM_SCREEN.cards;
    const total = CUSTOM_PRESETS.length * C.w + (CUSTOM_PRESETS.length - 1) * C.gap;
    CUSTOM_PRESETS.forEach((preset, i) => {
      const text = CUSTOM_TEXT.presets[preset.id];
      const cx = GAME.width / 2 - total / 2 + C.w / 2 + i * (C.w + C.gap);
      const cy = this.oy + C.top + C.h / 2;
      const back = this.add.graphics();
      back.fillStyle(C.fill, C.fillAlpha).fillRoundedRect(-C.w / 2, -C.h / 2, C.w, C.h, C.radius);
      back.fillStyle(C.accents[preset.id], 1).fillRoundedRect(-C.w / 2 + C.border, -C.h / 2 + C.border, C.w - C.border * 2, C.bandH, C.radius / 2);
      back.lineStyle(C.border, C.borderColor, 1).strokeRoundedRect(-C.w / 2, -C.h / 2, C.w, C.h, C.radius);
      const frame = this.add.graphics().setVisible(false);
      frame.lineStyle(C.border, 0xf5c518, 1).strokeRoundedRect(-C.w / 2, -C.h / 2, C.w, C.h, C.radius);
      const name = this.add.text(0, -C.h / 2 + C.nameY, text.name, { fontFamily: FONT, fontSize: `${C.nameSize}px`, color: '#fff3d6', stroke: '#1b2340', strokeThickness: 6 }).setOrigin(0.5);
      const blurb = this.add
        .text(0, -C.h / 2 + C.blurbY, text.blurb, { fontFamily: FONT, fontSize: `${C.blurbSize}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: 3, align: 'center', wordWrap: { width: C.blurbW } })
        .setOrigin(0.5, 0);
      const zone = this.add.zone(0, 0, C.w, C.h).setInteractive({ useHandCursor: true });
      const root = this.add.container(cx, cy, [back, frame, name, blurb, zone]).setDepth(5);
      zone.on('pointerover', () => this.selectCard(i));
      zone.on('pointerdown', () => {
        this.selectCard(i);
        this.applyCard(i);
      });
      this.cards.push({ id: preset.id, root, frame });
    });
    this.selectCard(this.selectedCard);
  }

  private buildFooter(): void {
    const F = CUSTOM_SCREEN.footer;
    const widths = [F.backW, F.randomW, F.resetW, F.playW];
    const total = widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * F.gap;
    let x = GAME.width / 2 - total / 2;
    const y = this.oy + F.y;
    const make = (w: number, label: string, size: number, accent: boolean): Phaser.GameObjects.Container => {
      const button = createMenuButton(this, { x: x + w / 2, y, w, h: F.h, size, label, accent, interactive: true });
      button.setDepth(5);
      x += w + F.gap;
      return button;
    };
    make(F.backW, CUSTOM_TEXT.buttons.back, F.size, false).on('pointerdown', () => this.goBack());
    make(F.randomW, CUSTOM_TEXT.buttons.random, F.size, false).on('pointerdown', () => {
      randomizeSetup();
      this.refreshAll();
    });
    make(F.resetW, CUSTOM_TEXT.buttons.reset, F.size, false).on('pointerdown', () => {
      resetSetup();
      this.refreshAll();
    });
    this.playButton = make(F.playW, CUSTOM_TEXT.buttons.play, F.playSize, true);
    // On a phone the run starts when the finger LIFTS: browsers only allow fullscreen after a finished tap.
    this.playButton.on(usesTouchControls() ? 'pointerup' : 'pointerdown', () => this.play());
  }

  private bindKeys(): void {
    const keys = this.input.keyboard;
    keys?.on('keydown-ESC', () => this.goBack());
    keys?.on('keydown-BACKSPACE', () => this.goBack());
    keys?.on('keydown-ENTER', () => this.play());
    keys?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault(); // Tab must not move the browser's focus away from the game
      this.openTab(CUSTOM_TABS[(CUSTOM_TABS.indexOf(this.tab) + 1) % CUSTOM_TABS.length] ?? 'quick');
    });
    keys?.on('keydown-UP', () => this.moveRow(-1));
    keys?.on('keydown-DOWN', () => this.moveRow(1));
    keys?.on('keydown-LEFT', () => this.horizontal(-1));
    keys?.on('keydown-RIGHT', () => this.horizontal(1));
    keys?.on('keydown-SPACE', () => {
      if (this.tab === 'quick') this.applyCard(this.selectedCard);
    });
  }

  // ---- state ----

  private openTab(tab: CustomTabId): void {
    if (tab === this.tab) return;
    this.tab = tab;
    lastTab = tab;
    this.selectedRow = 0;
    this.buildTabs();
    this.buildPage();
    this.refreshAll();
  }

  private selectRow(index: number): void {
    this.selectedRow = index;
    this.rows.forEach((row, i) => row.setSelected(i === index));
  }

  private selectCard(index: number): void {
    this.selectedCard = index;
    const C = CUSTOM_SCREEN.cards;
    this.cards.forEach((card, i) => {
      card.frame.setVisible(i === index);
      this.tweens.add({ targets: card.root, scale: i === index ? C.selectedScale : 1, duration: C.popMs, ease: 'Sine.easeOut' });
    });
  }

  private moveRow(delta: number): void {
    if (this.tab === 'quick' || this.rows.length === 0) return;
    this.selectRow((this.selectedRow + delta + this.rows.length) % this.rows.length);
  }

  /** Left / right: change the selected row's choice, or move over the preset cards. */
  private horizontal(delta: -1 | 1): void {
    if (this.tab === 'quick') {
      if (this.cards.length > 0) this.selectCard((this.selectedCard + delta + this.cards.length) % this.cards.length);
      return;
    }
    const row = this.rows[this.selectedRow];
    if (!row) return;
    stepChoice(row.id, delta);
    this.refreshAll();
  }

  private applyCard(index: number): void {
    const card = this.cards[index];
    if (!card) return;
    applyPreset(card.id);
    this.refreshAll();
    const F = CUSTOM_SCREEN.flash;
    const word = this.add
      .text(card.root.x, card.root.y + F.y, CUSTOM_TEXT.applied, { fontFamily: FONT, fontSize: `${F.size}px`, color: F.color, stroke: '#1b2340', strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(8);
    this.tweens.add({ targets: word, y: word.y - F.riseY, alpha: 0, duration: F.ms, ease: 'Sine.easeOut', onComplete: () => word.destroy() });
  }

  /** The rows show the setup, and JOACĂ shows whether it can be played (and why not). */
  private refreshAll(): void {
    const setup = getCustomSetup();
    for (const row of this.rows) row.refresh(setup);
    const problem = setupProblem(setup);
    this.problemText.setText(problem ? CUSTOM_TEXT.problems[problem] : '');
    this.playButton.setAlpha(problem ? CUSTOM_SCREEN.footer.disabledAlpha : 1);
  }

  private goBack(): void {
    if (this.started) return;
    this.scene.start('MenuScene');
  }

  private play(): void {
    if (this.started || setupProblem(getCustomSetup())) return;
    this.started = true;
    launchRun(this, { mode: 'custom', custom: getCustomSetup() });
  }
}
