/** @file HUD dots for the belt swing chain (swing, swing, finisher): done, ready and empty dots, a pop on each new swing, a flash on the finisher. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { BELT_CHAIN } from '../config/finisher';
import { usesTouchControls } from '../core/device';
import { chainPipsSpot } from '../core/touchLayout';
import { Events, listen, type BeltChainPayload } from '../core/events';

/**
 * `BELT_CHAIN.steps` dots, centered on desktop at `pips.y` and on phones up-left of the attack button, wherever the player put it
 * (`chainPipsSpot`, moved again on `Events.TouchLayoutChanged`).
 * Done = gold, the next one when `ready` = orange and pulsing, the rest = grey; faint (`idleAlpha`) when there is no chain.
 * The dots are made once; `update` only sets the scale of each (no allocations per frame).
 */
export class ChainPips {
  private readonly dots: Phaser.GameObjects.Arc[] = [];
  private readonly popLeftMs: number[] = [];
  private step = 0;
  private ready = false;
  private flashLeftMs = 0;
  /** Where each dot rests (the wobble moves it off this and back). */
  private readonly baseY: number[] = [];
  private wobbleLeftMs = 0;
  private pulseMs = 0;
  private readonly touch = usesTouchControls();

  constructor(scene: Phaser.Scene) {
    const P = BELT_CHAIN.pips;
    const k = this.touch ? P.touch.rScale : 1;
    for (let i = 0; i < BELT_CHAIN.steps; i++) {
      this.dots.push(scene.add.circle(0, 0, P.r * k, P.emptyColor).setStrokeStyle(2, P.outlineColor));
      this.popLeftMs.push(0);
    }
    this.place();
    this.paint();
    if (this.touch) {
      const off = listen(Events.TouchLayoutChanged, () => this.place()); // the attack button was moved or resized in the pause menu
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    }
  }

  /** Put the dots in a row around their spot. */
  private place(): void {
    const P = BELT_CHAIN.pips;
    const k = this.touch ? P.touch.rScale : 1;
    const cx = this.touch ? chainPipsSpot().x : GAME.width / 2;
    const cy = this.touch ? chainPipsSpot().y : P.y;
    const n = this.dots.length;
    for (let i = 0; i < n; i++) {
      this.dots[i]!.setPosition(cx + (i - (n - 1) / 2) * P.gap * k, cy);
      this.baseY[i] = cy;
    }
    this.wobbleLeftMs = 0;
  }

  /** `Events.BeltChain`. */
  set(p: BeltChainPayload): void {
    if (p.finisher) {
      this.step = 0;
      this.ready = false;
      this.flashLeftMs = BELT_CHAIN.pips.flashMs; // all dots flash, then they clear
      this.wobbleLeftMs = BELT_CHAIN.pips.wobble.ms;
      this.popLeftMs.fill(0);
      this.paint();
      return;
    }
    this.flashLeftMs = 0;
    for (let i = this.step; i < p.step && i < this.popLeftMs.length; i++) this.popLeftMs[i] = BELT_CHAIN.pips.popMs; // a newly filled dot pops
    if (p.step > this.step) this.wobbleLeftMs = BELT_CHAIN.pips.wobble.ms; // a dot filled
    this.step = p.step;
    this.ready = p.ready;
    if (p.step === 0) this.popLeftMs.fill(0);
    this.paint();
  }

  update(delta: number): void {
    const P = BELT_CHAIN.pips;
    this.pulseMs += delta;
    const flashing = this.flashLeftMs > 0;
    if (flashing) {
      this.flashLeftMs = Math.max(0, this.flashLeftMs - delta);
      if (this.flashLeftMs === 0) this.paint(); // the flash is over: back to the faint empty dots
    }
    if (this.wobbleLeftMs > 0) {
      this.wobbleLeftMs = Math.max(0, this.wobbleLeftMs - delta);
      const left = this.wobbleLeftMs / P.wobble.ms; // 1 -> 0
      const shake = Math.sin((1 - left) * (P.wobble.ms / 1000) * P.wobble.hz * Math.PI * 2) * P.wobble.px * left;
      for (let i = 0; i < this.dots.length; i++) this.dots[i]!.y = this.baseY[i]! + shake;
    }
    const pulse = 1 + P.readyPulse.scale * 0.5 * (1 + Math.sin((this.pulseMs / P.readyPulse.ms) * Math.PI * 2));
    for (let i = 0; i < this.dots.length; i++) {
      let scale = 1;
      if (flashing) scale = 1 + (P.popFrom - 1) * (this.flashLeftMs / P.flashMs);
      else if (this.popLeftMs[i]! > 0) {
        this.popLeftMs[i] = Math.max(0, this.popLeftMs[i]! - delta);
        scale = 1 + (P.popFrom - 1) * (this.popLeftMs[i]! / P.popMs);
      } else if (this.ready && i === this.step) scale = pulse;
      this.dots[i]!.setScale(scale);
    }
  }

  /** Colors and alpha for the current state (only on a change, never per frame). */
  private paint(): void {
    const P = BELT_CHAIN.pips;
    const flashing = this.flashLeftMs > 0;
    const idle = !flashing && this.step === 0 && !this.ready;
    const alpha = idle ? P.idleAlpha : 1;
    for (let i = 0; i < this.dots.length; i++) {
      const color = flashing ? P.doneColor : i < this.step ? P.doneColor : i === this.step && this.ready ? P.readyColor : P.emptyColor;
      this.dots[i]!.setFillStyle(color, alpha).setStrokeStyle(2, P.outlineColor, alpha);
    }
  }
}
