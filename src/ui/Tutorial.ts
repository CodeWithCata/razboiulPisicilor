/** @file The first-run tutorial card: before the first wave a cream card slides up and walks Varu through move, hit, spin and throw, each step done when he really does it. Never stops the game; Enter or a tap skips it. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { COLORS, FONT, css } from '../config/style';
import { TUTORIAL as T } from '../config/tutorial';
import { TUTORIAL_TEXT, pick } from '../content/lines';
import { Events, bus, listen } from '../core/events';
import { saveTutorialDone } from '../core/storage';

type State = 'idle' | 'waiting' | 'done' | 'tip' | 'over';
type StepId = (typeof TUTORIAL_TEXT.steps)[number]['id'];

/** Keys (KeyboardEvent.code) that count as "Varu moved". */
const MOVE_KEYS: ReadonlySet<string> = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

/**
 * The tutorial of the first wave (see `config/tutorial.ts`). UIScene creates it when this device has not seen it yet and calls `begin()` when wave 1 starts.
 * It listens to the belt events, so a step is done by really doing the thing; a step nobody does moves on by itself after `maxStepMs`.
 * It saves "done" when it ends or is skipped, and cleans up after itself.
 */
export class Tutorial {
  private readonly card: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly counter: Phaser.GameObjects.Text;
  private readonly doneWord: Phaser.GameObjects.Text;
  private readonly cardY: number;
  private readonly offs: Array<() => void> = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private state: State = 'idle';
  private index = -1;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private destroyed = false;
  private released = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly touch: boolean,
  ) {
    const C = T.card;
    const w = touch ? C.widthTouch : C.width;
    const h = C.height;
    this.cardY = GAME.height - (touch ? C.bottomTouch : C.bottom) - h / 2;

    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.navy, 1).fillRoundedRect(-w / 2 - C.outline, -h / 2 - C.outline, w + C.outline * 2, h + C.outline * 2, C.radius + C.outline);
    bg.fillStyle(T.colors.lip, 1).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, C.radius);
    bg.fillStyle(T.colors.fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 4, C.radius);
    bg.fillStyle(COLORS.white, 0.55).fillRoundedRect(-w / 2 + 10, -h / 2 + 5, w - 20, 3, 1.5);

    const titleSize = touch ? T.text.titleSizeTouch : T.text.titleSize;
    this.title = scene.add
      .text(0, -6, '', { fontFamily: FONT, fontSize: `${titleSize}px`, color: T.colors.title, align: 'center', wordWrap: { width: w - 56 } })
      .setOrigin(0.5);
    this.doneWord = scene.add
      .text(0, -6, '', { fontFamily: FONT, fontSize: `${T.text.doneSize}px`, color: T.colors.done, stroke: css(COLORS.navy), strokeThickness: 5 })
      .setOrigin(0.5)
      .setVisible(false);
    this.counter = scene.add
      .text(-w / 2 + 18, -h / 2 + 12, '', { fontFamily: FONT, fontSize: `${T.text.stepSize}px`, color: T.colors.step })
      .setOrigin(0, 0);
    const skip = scene.add
      .text(0, h / 2 - 16, touch ? TUTORIAL_TEXT.skipTouch : TUTORIAL_TEXT.skipKeyboard, { fontFamily: FONT, fontSize: `${T.text.hintSize}px`, color: T.colors.hint })
      .setOrigin(0.5);

    this.card = scene.add
      .container(GAME.width / 2, GAME.height + h, [bg, this.title, this.doneWord, this.counter, skip])
      .setDepth(C.depth)
      .setAlpha(C.alpha)
      .setVisible(false);

    // Skip: Enter on a keyboard, a tap on the card on a phone.
    if (touch) {
      this.card.setSize(w, h).setInteractive();
      this.card.on('pointerdown', () => this.skip());
    } else {
      const onEnter = (): void => this.skip();
      scene.input.keyboard?.on('keydown-ENTER', onEnter);
      this.offs.push(() => scene.input.keyboard?.off('keydown-ENTER', onEnter));
    }

    // The steps are done by doing them.
    const steps: ReadonlyArray<readonly [StepId, string]> = [['swing', Events.BeltSwing], ['spin', Events.BeltSpin], ['throw', Events.BeltThrow], ['dodge', Events.DodgeRoll]];
    for (const [id, event] of steps) this.offs.push(listen(event, () => this.did(id)));
    if (touch) {
      const onTouch = (p: Phaser.Input.Pointer): void => {
        if (p.x < GAME.width / 2) this.moved();
      };
      scene.input.on('pointerdown', onTouch);
      this.offs.push(() => scene.input.off('pointerdown', onTouch));
    } else {
      const onKey = (e: KeyboardEvent): void => {
        if (MOVE_KEYS.has(e.code)) this.moved();
      };
      scene.input.keyboard?.on('keydown', onKey);
      this.offs.push(() => scene.input.keyboard?.off('keydown', onKey));
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** GameScene says the intro is over (`Events.TutorialStart`): the card slides in with the first step. Only the first call counts. */
  begin(): void {
    if (this.state !== 'idle') return;
    this.card.setVisible(true);
    this.scene.tweens.add({ targets: this.card, y: this.cardY, duration: T.slideMs, ease: 'Back.easeOut' });
    this.show(0);
  }

  /** Enter / a tap: the tutorial ends here and counts as seen. */
  skip(): void {
    if (this.state === 'idle' || this.state === 'over' || !this.card.visible) return;
    this.finish();
  }

  private currentId(): StepId | null {
    return this.index >= 0 ? TUTORIAL_TEXT.steps[this.index]!.id : null;
  }

  private show(i: number): void {
    this.index = i;
    this.state = 'waiting';
    this.moveTimer = null;
    const step = TUTORIAL_TEXT.steps[i]!;
    this.title.setText(this.touch ? step.touch : step.keyboard).setVisible(true).setScale(0.85);
    this.doneWord.setVisible(false);
    this.counter.setText(TUTORIAL_TEXT.counter(i + 1, TUTORIAL_TEXT.steps.length));
    this.scene.tweens.add({ targets: this.title, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.later(T.maxStepMs, () => {
      if (this.state === 'waiting' && this.index === i) this.complete(false); // nobody did it: move on without the praise
    });
  }

  private moved(): void {
    if (this.state !== 'waiting' || this.currentId() !== 'move' || this.moveTimer) return;
    this.moveTimer = this.later(T.moveHoldMs, () => this.did('move'));
  }

  private did(id: StepId): void {
    if (this.state === 'waiting' && this.currentId() === id) this.complete(true);
  }

  /** A step is done: a green word pops where the text was, then the next step comes. */
  private complete(praise: boolean): void {
    this.state = 'done';
    const next = this.index + 1;
    if (praise) {
      this.title.setVisible(false);
      this.doneWord.setText(pick(TUTORIAL_TEXT.done)).setVisible(true).setScale(0.6);
      this.scene.tweens.add({ targets: this.doneWord, scale: 1, duration: 200, ease: 'Back.easeOut' });
    }
    this.later(praise ? T.doneHoldMs : 0, () => {
      if (this.state !== 'done') return;
      if (next < TUTORIAL_TEXT.steps.length) this.show(next);
      else this.tip();
    });
  }

  /** The last card: a quick tip, nothing to wait for. */
  private tip(): void {
    this.state = 'tip';
    this.release(); // the steps are done: the cats may come now, the tip stays a few seconds more
    this.doneWord.setVisible(false);
    this.counter.setText('');
    this.title.setText(TUTORIAL_TEXT.tip).setVisible(true).setScale(0.85);
    this.scene.tweens.add({ targets: this.title, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.later(T.tipMs, () => this.finish());
  }

  /** Saved as seen, the card slides away and everything is released. */
  private finish(): void {
    if (this.state === 'over') return;
    this.state = 'over';
    saveTutorialDone();
    this.release();
    this.scene.tweens.add({
      targets: this.card,
      y: GAME.height + T.card.height,
      duration: T.slideMs,
      ease: 'Cubic.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  /** Tell GameScene the first wave may start (once). */
  private release(): void {
    if (this.released) return;
    this.released = true;
    bus.emit(Events.TutorialEnd);
  }

  private later(ms: number, fn: () => void): Phaser.Time.TimerEvent {
    const timer = this.scene.time.delayedCall(ms, fn);
    this.timers.push(timer);
    return timer;
  }

  private destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.state = 'over';
    for (const off of this.offs.splice(0)) off();
    for (const timer of this.timers.splice(0)) timer.remove(false);
    this.scene.tweens.killTweensOf([this.card, this.title, this.doneWord]);
    this.card.destroy();
  }
}
