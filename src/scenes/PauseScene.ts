/** @file Pause menu on top of the run: resume, volumes, toggles, restart, menu. Esc opens and closes it. */
import Phaser from 'phaser';
import { PAUSE, PAUSE_KEYS, pauseGaps, pauseRowH } from '../config/pause';
import { FONT } from '../config/style';
import { BUTTON_EDIT_TEXT, PAUSE_TEXT } from '../content/pause';
import { isLayoutCustom } from '../core/touchLayout';
import { usesTouchControls } from '../core/device';
import { Events, listen } from '../core/events';
import { isMuted, toggleMuted } from '../core/mute';
import { readRun, type RunOptions } from '../core/run';
import { getAutoAttack, getDebugInfo, getVibration, getVolume, nudgeVolume, setVolume, toggleAutoAttack, toggleDebugInfo, toggleVibration, type VolumeKind } from '../core/settings';
import { GAME } from '../config/balance';
import { COLORS } from '../config/style';
import { createLogoWord } from '../ui/logoWord';
import { createSunburst, createVignette } from '../ui/menuBackdrop';
import { createPauseScene, createPeekingCats } from '../ui/pause/PauseDecor';
import { PauseRow, type PauseRowSpec } from '../ui/pause/PauseRow';

type RowId = 'resume' | 'music' | 'sfx' | 'sound' | 'autoAttack' | 'debugInfo' | 'vibration' | 'touchButtons' | 'restart' | 'menu';

interface RowDef extends PauseRowSpec {
  id: RowId;
  /** Starts a new block of rows (a bit more space above). */
  groupStart?: boolean;
}

/** The rows of the menu. Phones and tablets get four more: the auto-attack switch (computers swing with the mouse), vibration, the roll button screen and the debug numbers. */
const rowsFor = (touch: boolean): readonly RowDef[] => [
  { id: 'resume', kind: 'button', label: PAUSE_TEXT.resume, icon: 'play' },
  { id: 'music', kind: 'volume', label: PAUSE_TEXT.music, groupStart: true },
  { id: 'sfx', kind: 'volume', label: PAUSE_TEXT.sfx },
  { id: 'sound', kind: 'toggle', label: PAUSE_TEXT.sound },
  ...(touch
    ? [
        { id: 'autoAttack', kind: 'toggle', label: PAUSE_TEXT.autoAttack } satisfies RowDef,
        { id: 'vibration', kind: 'toggle', label: PAUSE_TEXT.vibration } satisfies RowDef,
        { id: 'touchButtons', kind: 'toggle', label: PAUSE_TEXT.touchButtons } satisfies RowDef,
        { id: 'debugInfo', kind: 'toggle', label: PAUSE_TEXT.debugInfo } satisfies RowDef,
      ]
    : []),
  { id: 'restart', kind: 'button', label: PAUSE_TEXT.restart, danger: true, groupStart: true },
  { id: 'menu', kind: 'button', label: PAUSE_TEXT.menu, danger: true },
];

/**
 * The pause menu. GameScene and UIScene are paused underneath; this scene draws on top of the frozen frame.
 * Keys: up/down choose, left/right change a volume, Enter confirms, Esc continues. The mouse works too.
 */
export class PauseScene extends Phaser.Scene {
  private run: RunOptions = readRun(undefined);
  private defs: readonly RowDef[] = rowsFor(false);
  private rows: PauseRow[] = [];
  private selected = 0;
  /** Restart / Menu need a second press. This is the row waiting for it. */
  private armed: RowId | null = null;
  private armTimer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;

  constructor() {
    super('PauseScene');
  }

  init(data: Partial<RunOptions>): void {
    this.run = readRun(data);
    this.defs = rowsFor(usesTouchControls());
    this.rows = [];
    this.selected = 0;
    this.armed = null;
    this.armTimer = null;
    this.leaving = false;
  }

  create(): void {
    const { width, height } = GAME;
    const P = PAUSE;

    // Navy tint, soft rays and dark edges over the frozen game (the dim rectangle also eats clicks).
    this.add.rectangle(0, 0, width, height, P.dimColor, P.dimAlpha).setOrigin(0).setDepth(P.depth).setInteractive();
    createSunburst(this, P.rayAlpha).setDepth(P.depth);
    createVignette(this)?.setDepth(P.depth);

    const rowYs = this.layoutRows();
    const rowH = pauseRowH(usesTouchControls());
    const bottom = (rowYs[rowYs.length - 1] ?? 0) + rowH / 2 + P.panel.padY;
    const left = width / 2 - P.panel.w / 2;
    const panelH = bottom - P.panel.top;
    createPeekingCats(this, left, left + P.panel.w, P.panel.top); // before the panel, so it covers their bodies
    createPauseScene(this);

    // Title in the same lettering as the main menu logo.
    const title = this.add.container(width / 2, P.title.y, createLogoWord(this, PAUSE_TEXT.title, P.title.size, '#f5c518', 0, P.title.stroke)).setDepth(P.depth + 3).setAngle(P.title.angleDeg);
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: P.title.introMs, ease: 'Back.easeOut' });

    const g = this.add.graphics().setDepth(P.depth + 1);
    g.fillStyle(0x000000, P.panel.shadowAlpha).fillRoundedRect(left, P.panel.top + P.panel.shadowDy, P.panel.w, panelH, P.panel.radius);
    g.fillStyle(P.panel.fill, P.panel.alpha).fillRoundedRect(left, P.panel.top, P.panel.w, panelH, P.panel.radius);
    g.lineStyle(P.panel.borderWidth, P.panel.borderColor, 1).strokeRoundedRect(left, P.panel.top, P.panel.w, panelH, P.panel.radius);
    const inset = P.panel.innerInset;
    g.lineStyle(2, COLORS.cream, P.panel.innerAlpha).strokeRoundedRect(left + inset, P.panel.top + inset, P.panel.w - inset * 2, panelH - inset * 2, P.panel.radius - inset / 2);
    // A thin divider in the gap before each new group of rows.
    const spacing = pauseGaps(usesTouchControls());
    this.defs.forEach((def, i) => {
      if (!def.groupStart || i === 0) return;
      const y = rowYs[i]! - rowH / 2 - (spacing.gap + spacing.groupGap) / 2;
      g.lineStyle(2, COLORS.cream, P.row.dividerAlpha).lineBetween(width / 2 - P.row.w / 2 + 12, y, width / 2 + P.row.w / 2 - 12, y);
    });

    this.rows = this.defs.map((def, i) => new PauseRow(this, def, width / 2, rowYs[i]!, {
      onHover: () => this.select(i),
      onActivate: () => this.activate(i),
      onSetLevel: (level) => this.setLevel(def.id, level),
    }));

    this.add
      .text(width / 2, P.hint.y, usesTouchControls() ? PAUSE_TEXT.hintTouch : PAUSE_TEXT.hint, { fontFamily: FONT, fontSize: `${P.hint.size}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: 4 })
      .setOrigin(0.5)
      .setAlpha(0.9)
      .setDepth(P.depth + 3);

    this.refresh();
    this.select(0);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    const off = [listen(Events.MuteChanged, () => this.refresh()), listen(Events.VolumeChanged, () => this.refresh()), listen(Events.TouchLayoutChanged, () => this.refresh())];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  /** Center y of every row. Rows are stacked from the panel top; a group start adds extra space. */
  private layoutRows(): number[] {
    const R = pauseGaps(usesTouchControls());
    const rowH = pauseRowH(usesTouchControls());
    const ys: number[] = [];
    let y = PAUSE.panel.top + PAUSE.panel.padY + rowH / 2;
    this.defs.forEach((def, i) => {
      if (i > 0) y += rowH + R.gap + (def.groupStart ? R.groupGap : 0);
      ys.push(y);
    });
    return ys;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.leaving) return;
    const is = (list: readonly string[]): boolean => list.includes(e.code);
    const current = this.defs[this.selected]!;

    if (is(PAUSE_KEYS.close)) {
      if (!e.repeat) this.resume();
    } else if (is(PAUSE_KEYS.up)) {
      this.select((this.selected + this.defs.length - 1) % this.defs.length);
    } else if (is(PAUSE_KEYS.down)) {
      this.select((this.selected + 1) % this.defs.length);
    } else if (is(PAUSE_KEYS.left) || is(PAUSE_KEYS.right)) {
      if (current.kind === 'volume') nudgeVolume(current.id as VolumeKind, is(PAUSE_KEYS.right) ? 1 : -1);
      else if (current.kind === 'toggle' && !e.repeat) this.flip(current.id);
    } else if (is(PAUSE_KEYS.confirm) && !e.repeat) {
      this.activate(this.selected);
    }
  }

  private select(index: number): void {
    if (index !== this.selected) this.disarm();
    this.selected = index;
    this.rows.forEach((row, i) => row.setSelected(i === index));
  }

  private activate(index: number): void {
    if (this.leaving) return;
    const def = this.defs[index]!;
    switch (def.id) {
      case 'resume':
        this.resume();
        break;
      case 'sound':
      case 'autoAttack':
      case 'debugInfo':
      case 'vibration':
      case 'touchButtons':
        this.flip(def.id);
        break;
      case 'music':
      case 'sfx':
        break; // volume rows are changed with the arrows or by clicking a block
      case 'restart':
      case 'menu':
        if (this.armed !== def.id) this.arm(def.id);
        else if (def.id === 'restart') this.restart();
        else this.toMenu();
        break;
    }
  }

  /** An on/off row was chosen: switch it. */
  private flip(id: RowId): void {
    if (id === 'sound') toggleMuted();
    else if (id === 'touchButtons') this.openButtonEditor();
    else if (id === 'autoAttack' || id === 'debugInfo' || id === 'vibration') {
      if (id === 'autoAttack') toggleAutoAttack();
      else if (id === 'vibration') toggleVibration();
      else toggleDebugInfo();
      this.refresh(); // (the mute switch announces itself with an event; these do not need to)
    }
  }

  /** The screen where the touch buttons are moved and resized. This menu sleeps meanwhile and wakes when it is closed. */
  private openButtonEditor(): void {
    this.leaving = false;
    this.scene.launch('ButtonEditScene');
    this.scene.sleep();
  }

  private setLevel(id: RowId, level: number): void {
    if (id === 'music' || id === 'sfx') setVolume(id, level);
  }

  /** First press on Restart / Menu: ask to press again (and forget it after a moment). */
  private arm(id: RowId): void {
    this.disarm();
    this.armed = id;
    const index = this.defs.findIndex((r) => r.id === id);
    this.rows[index]?.setLabel(PAUSE_TEXT.confirm);
    this.armTimer = this.time.delayedCall(PAUSE.confirmResetMs, () => this.disarm());
  }

  private disarm(): void {
    this.armTimer?.remove(false);
    this.armTimer = null;
    if (this.armed === null) return;
    const index = this.defs.findIndex((r) => r.id === this.armed);
    this.rows[index]?.setLabel(this.defs[index]!.label);
    this.armed = null;
  }

  /** Put the saved settings on screen. */
  private refresh(): void {
    this.defs.forEach((def, i) => {
      const row = this.rows[i];
      if (!row) return;
      if (def.id === 'music' || def.id === 'sfx') row.setLevel(getVolume(def.id));
      if (def.id === 'sound') row.setValue(isMuted() ? PAUSE_TEXT.soundOff : PAUSE_TEXT.soundOn);
      if (def.id === 'autoAttack') row.setValue(getAutoAttack() ? PAUSE_TEXT.on : PAUSE_TEXT.off);
      if (def.id === 'vibration') row.setValue(getVibration() ? PAUSE_TEXT.on : PAUSE_TEXT.off);
      if (def.id === 'touchButtons') row.setValue(isLayoutCustom() ? BUTTON_EDIT_TEXT.custom : BUTTON_EDIT_TEXT.default);
      if (def.id === 'debugInfo') row.setValue(getDebugInfo() ? PAUSE_TEXT.on : PAUSE_TEXT.off);
    });
  }

  private resume(): void {
    this.leaving = true;
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    if (this.scene.isPaused('CutsceneScene')) this.scene.resume('CutsceneScene'); // paused with the game if a cutscene was playing
    this.scene.stop();
  }

  private restart(): void {
    this.leaving = true;
    this.scene.stop('UIScene');
    this.scene.stop('CutsceneScene');
    this.scene.stop('GameScene');
    this.scene.start('GameScene', this.run); // also stops this scene
  }

  private toMenu(): void {
    this.leaving = true;
    this.scene.stop('UIScene');
    this.scene.stop('CutsceneScene');
    this.scene.stop('GameScene');
    this.scene.start('MenuScene'); // also stops this scene
  }
}
