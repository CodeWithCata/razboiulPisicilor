/** @file One pause-menu row (button, volume slider or toggle) with selection and confirm states. */
import Phaser from 'phaser';
import { AUDIO } from '../../config/audio';
import { PAUSE, pausePip, pauseRowH } from '../../config/pause';
import { COLORS, FONT } from '../../config/style';
import { usesTouchControls } from '../../core/device';

export type PauseRowKind = 'button' | 'volume' | 'toggle';

export interface PauseRowSpec {
  kind: PauseRowKind;
  label: string;
  /** Restart / Menu: red text, and they ask "are you sure?" first. */
  danger?: boolean;
  /** A gold "play" triangle in front of the label (Continue). Drawn, not a font glyph. */
  icon?: 'play';
}

export interface PauseRowHandlers {
  /** The mouse moved onto the row. */
  onHover: () => void;
  /** The row was clicked (buttons and toggles). */
  onActivate: () => void;
  /** A volume block was clicked: the new level, 0..1. */
  onSetLevel: (level: number) => void;
}

/** One line of the pause menu: a button, a volume bar, or an on/off switch. Draws itself and reports clicks. */
export class PauseRow {
  readonly kind: PauseRowKind;
  private readonly danger: boolean;
  private readonly icon: boolean;
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly value: Phaser.GameObjects.Text | null = null;
  private readonly pips: Phaser.GameObjects.Graphics | null = null;
  private selected = false;
  private level = 0;
  /** Phones get taller rows and fatter volume blocks (config/pause.ts). */
  private readonly rowH = pauseRowH(usesTouchControls());
  private readonly pip = pausePip(usesTouchControls());

  constructor(
    scene: Phaser.Scene,
    spec: PauseRowSpec,
    private readonly x: number,
    private readonly y: number, // the row's center
    handlers: PauseRowHandlers,
  ) {
    const R = PAUSE.row;
    this.kind = spec.kind;
    this.danger = spec.danger === true;
    this.icon = spec.icon === 'play';
    this.back = scene.add.graphics().setDepth(PAUSE.depth + 1);

    const textStyle = { fontFamily: FONT, color: R.normalColor, stroke: '#1b2340', strokeThickness: 5 };
    this.label = scene.add
      .text(x - R.w / 2 + R.padX + (spec.icon ? R.iconW + R.iconGap : 0), y, spec.label, { ...textStyle, fontSize: `${R.labelSize}px` })
      .setOrigin(0, 0.5)
      .setDepth(PAUSE.depth + 2);

    // The whole row reacts to the mouse. Activation is on pointer UP, so the click that closes the menu is
    // already released when the game resumes (otherwise Varu would swing as soon as it continues).
    scene.add
      .rectangle(x, y, R.w, this.rowH, 0xffffff, 0)
      .setDepth(PAUSE.depth + 3)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', handlers.onHover)
      .on('pointerup', () => {
        if (spec.kind !== 'volume') handlers.onActivate();
      });

    if (spec.kind === 'volume') {
      this.pips = scene.add.graphics().setDepth(PAUSE.depth + 2);
      this.createPipTargets(scene, handlers);
    } else if (spec.kind === 'toggle') {
      this.value = scene.add
        .text(x + R.w / 2 - R.padX, y, '', { ...textStyle, fontSize: `${R.valueSize}px` })
        .setOrigin(1, 0.5)
        .setDepth(PAUSE.depth + 2);
    }
    this.redraw();
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.redraw();
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  /** Toggle rows: the word on the right ("PORNIT" / "OPRIT"). */
  setValue(text: string): void {
    this.value?.setText(text);
  }

  /** Volume rows: fill the blocks up to this level (0..1). */
  setLevel(level: number): void {
    this.level = level;
    this.redraw();
  }

  private get pipsLeft(): number {
    const P = this.pip;
    const total = AUDIO.volumeSteps * P.w + (AUDIO.volumeSteps - 1) * P.gap;
    return this.x + PAUSE.row.w / 2 - PAUSE.row.padX - total;
  }

  /** One invisible click target per volume block, so you can click straight on the level you want. */
  private createPipTargets(scene: Phaser.Scene, handlers: PauseRowHandlers): void {
    const P = this.pip;
    for (let i = 0; i < AUDIO.volumeSteps; i++) {
      const cx = this.pipsLeft + i * (P.w + P.gap) + P.w / 2;
      scene.add
        .rectangle(cx, this.y, P.w + P.gap, this.rowH, 0xffffff, 0)
        .setDepth(PAUSE.depth + 4)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', handlers.onHover)
        .on('pointerup', () => {
          const target = (i + 1) / AUDIO.volumeSteps;
          // Clicking the lowest block while it is the only one lit turns that channel all the way down.
          handlers.onSetLevel(i === 0 && this.level === target ? 0 : target);
        });
    }
  }

  private redraw(): void {
    const R = PAUSE.row;
    const sel = this.selected;
    const color = sel ? (this.danger ? R.selectedDangerColor : R.selectedColor) : this.danger ? R.dangerColor : R.normalColor;
    this.label.setColor(color);
    this.value?.setColor(color);
    // Navy text on the gold pill needs no outline; everything else keeps its navy outline.
    const stroke = sel && !this.danger ? 0 : 5;
    this.label.setStroke('#1b2340', stroke);
    this.value?.setStroke('#1b2340', stroke);

    const left = this.x - R.w / 2;
    const top = this.y - this.rowH / 2;
    this.back.clear();
    const fill = sel ? (this.danger ? R.selectedDangerFill : R.selectedFill) : R.idleFill;
    this.back.fillStyle(fill, sel ? 1 : R.idleAlpha).fillRoundedRect(left, top, R.w, this.rowH, R.radius);
    if (sel) this.back.lineStyle(3, COLORS.navy, 1).strokeRoundedRect(left, top, R.w, this.rowH, R.radius);

    if (this.icon) {
      const h = R.labelSize * 0.62;
      const ix = left + R.padX;
      this.back.fillStyle(sel ? COLORS.navy : COLORS.gold, 1).fillTriangle(ix, this.y - h / 2, ix, this.y + h / 2, ix + R.iconW, this.y);
    }

    const pips = this.pips;
    if (!pips) return;
    const P = this.pip;
    const onColor = sel ? PAUSE.pip.selectedOnColor : PAUSE.pip.onColor;
    const offColor = sel ? PAUSE.pip.selectedOffColor : PAUSE.pip.offColor;
    pips.clear();
    for (let i = 0; i < AUDIO.volumeSteps; i++) {
      const on = (i + 1) / AUDIO.volumeSteps <= this.level + 1e-6;
      pips.fillStyle(on ? onColor : offColor, 1).fillRoundedRect(this.pipsLeft + i * (P.w + P.gap), this.y - P.h / 2, P.w, P.h, PAUSE.pip.radius);
    }
  }
}
