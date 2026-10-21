/** @file The cutscene overlay scene: cinema bars, dialogue box and the hold-to-skip ring, over a held-still game. Talks to the director only through the bus. */
import Phaser from 'phaser';
import { CUTSCENE } from '../config/cutscene';
import {
  bus,
  Events,
  listen,
  type CutsceneLinePayload,
  type CutsceneStartPayload,
} from '../core/events';
import { CutsceneBars } from '../ui/cutscene/CutsceneBars';
import { DialogueBox } from '../ui/cutscene/DialogueBox';
import { SkipHold } from '../ui/cutscene/SkipHold';

export class CutsceneScene extends Phaser.Scene {
  private config: CutsceneStartPayload = { id: '', bars: true, skippable: true, hideHud: true };
  private bars!: CutsceneBars;
  private box!: DialogueBox;
  private skipHold!: SkipHold;
  private holding = false;
  private heldMs = 0;
  private skipSent = false;
  private leaving = false;

  constructor() {
    super('CutsceneScene');
  }

  init(data: Partial<CutsceneStartPayload>): void {
    this.config = {
      id: data.id ?? '',
      bars: data.bars ?? true,
      skippable: data.skippable ?? true,
      hideHud: data.hideHud ?? true,
    };
    this.holding = false;
    this.heldMs = 0;
    this.skipSent = false;
    this.leaving = false;
  }

  create(): void {
    this.bars = new CutsceneBars(this);
    this.box = new DialogueBox(this, this.config.bars ? this.bars.height : 0);
    this.skipHold = new SkipHold(this, () => bus.emit(Events.CutsceneSkip));
    this.begin(this.config);

    const off = [
      listen<CutsceneStartPayload>(Events.CutsceneStart, (p) => this.begin(p)), // a new scene while the old bars were leaving
      listen<CutsceneLinePayload>(Events.CutsceneLine, (line) => this.box.show(line)),
      listen(Events.CutsceneLineEnd, () => this.box.hide()),
      listen(Events.CutsceneEnd, () => this.leave()),
    ];

    const keyboard = this.input.keyboard;
    const onDown = (e: KeyboardEvent): void => {
      if (!e.repeat && CUTSCENE.skip.keys.includes(e.code)) this.press();
    };
    const onUp = (e: KeyboardEvent): void => {
      if (CUTSCENE.skip.keys.includes(e.code)) this.release();
    };
    keyboard?.on('keydown', onDown);
    keyboard?.on('keyup', onUp);
    // A press on the skip button is the button's business, not a tap for the dialogue.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.press();
    });
    this.input.on('pointerup', () => this.release());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((fn) => fn());
      keyboard?.off('keydown', onDown);
      keyboard?.off('keyup', onUp);
    });
  }

  update(_time: number, delta: number): void {
    this.box.update(delta);
    if (!this.holding || this.skipSent || !this.config.skippable) return;
    this.heldMs += delta;
    const { holdMs, ringDelayMs } = CUTSCENE.skip;
    this.skipHold.setProgress((this.heldMs - ringDelayMs) / (holdMs - ringDelayMs));
    if (this.heldMs >= holdMs) {
      this.skipSent = true;
      this.skipHold.setProgress(0);
      bus.emit(Events.CutsceneSkip);
    }
  }

  private begin(config: CutsceneStartPayload): void {
    this.config = config;
    this.leaving = false;
    this.box.hide();
    this.box.reset();
    if (config.bars) this.bars.slideIn();
    this.skipHold.start(config.skippable);
  }

  /** The scene is over: the bars slide out, then this scene closes itself. */
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.holding = false;
    this.box.hide();
    this.skipHold.stop();
    this.bars.slideOut(() => {
      if (this.leaving) this.scene.stop();
    });
  }

  private press(): void {
    if (this.holding || this.leaving) return;
    this.holding = true;
    this.heldMs = 0;
    this.skipSent = false;
  }

  /** Let go: a short press is a tap (finish the typing, or go to the next line). A long one that already skipped is nothing. */
  private release(): void {
    if (!this.holding) return;
    this.holding = false;
    const held = this.heldMs;
    this.heldMs = 0;
    this.skipHold.setProgress(0);
    if (this.skipSent) return;
    if (this.config.skippable && held > CUTSCENE.skip.tapMaxMs) return;
    if (this.box.typing) this.box.complete();
    else if (this.box.open) bus.emit(Events.CutsceneAdvance);
  }
}
