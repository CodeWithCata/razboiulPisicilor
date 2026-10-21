/** @file What each cutscene step does when it runs: one small handle per step kind (timed ones hold the script, the rest happen at once). */
import { CUTSCENE } from '../../config/cutscene';
import { lineAutoMs, type CutsceneStep, type StepHandle } from '../../core/cutscene';
import { applyEase, type EaseName } from '../../core/ease';
import { bus, Events, type CutsceneSfxPayload, type MusicPayload } from '../../core/events';
import type { ScriptedInput } from '../../input/ScriptedInput';
import { CUTSCENE_HOOKS } from './hooks';
import type { CutsceneHost, CutsceneStage } from './CutsceneStage';

/** How the dialogue steps talk to the director (it owns the line counter and hears the player's taps). */
export interface LineChannel {
  /** Opens a line (emits it for the overlay). Returns its id. */
  begin(who: string, text: string, auto: boolean): number;
  /** True once, when the player tapped to close the open line. */
  consumeAdvance(): boolean;
  /** Closes the open line. */
  end(): void;
}

export interface StepContext {
  stage: CutsceneStage;
  host: CutsceneHost;
  input: ScriptedInput;
  lines: LineChannel;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A step that is over before it starts. */
const DONE: StepHandle = { done: true, update: () => {}, finish: () => {} };

function instant(run: () => void): StepHandle {
  run();
  return DONE;
}

/** A step that lasts `ms`: `frame(t)` runs with t from 0 to 1, `end` once when it is over (also when skipped, after `frame(1)`). */
class Timed implements StepHandle {
  private elapsed = 0;
  private over = false;

  constructor(
    private readonly ms: number,
    private readonly frame: (t: number) => void,
    private readonly end?: () => void,
  ) {}

  get done(): boolean {
    return this.over;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.elapsed += dtMs;
    const t = this.ms <= 0 ? 1 : Math.min(1, this.elapsed / this.ms);
    this.frame(t);
    if (t >= 1) this.complete();
  }

  finish(): void {
    if (this.over) return;
    this.frame(1);
    this.complete();
  }

  private complete(): void {
    this.over = true;
    this.end?.();
  }
}

/** A line of dialogue: open until the player taps (or its time is up, for `auto`). */
class SayStep implements StepHandle {
  private over = false;
  private elapsed = 0;
  private readonly autoMs: number | null;

  constructor(
    private readonly ctx: StepContext,
    who: string,
    text: string,
    auto: boolean,
  ) {
    ctx.lines.consumeAdvance(); // a tap meant for the line before must not close this one
    ctx.lines.begin(who, text, auto);
    this.autoMs = auto ? lineAutoMs(text, CUTSCENE.type, CUTSCENE.read) : null;
  }

  get done(): boolean {
    return this.over;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.elapsed += dtMs;
    if (this.ctx.lines.consumeAdvance() || (this.autoMs !== null && this.elapsed >= this.autoMs)) this.finish();
  }

  finish(): void {
    if (this.over) return;
    this.over = true;
    this.ctx.lines.end();
  }
}

/** Varu walks to a spot with his real walk. Ends on arrival, or after `maxMs` (then he is simply put there: a script never hangs on a wall). */
class WalkStep implements StepHandle {
  private over = false;
  private elapsed = 0;
  private readonly target: { x: number; y: number };

  constructor(
    private readonly ctx: StepContext,
    to: { x: number; y: number },
    private readonly maxMs: number,
  ) {
    this.target = to;
  }

  get done(): boolean {
    return this.over;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.elapsed += dtMs;
    const player = this.ctx.host.player;
    const dx = this.target.x - player.x;
    const dy = this.target.y - player.y;
    if (Math.hypot(dx, dy) <= CUTSCENE.walk.stopRadiusPx) {
      this.complete(false);
    } else if (this.elapsed >= this.maxMs) {
      this.complete(true);
    } else {
      this.ctx.input.walk(dx, dy);
    }
  }

  finish(): void {
    if (!this.over) this.complete(true);
  }

  private complete(snap: boolean): void {
    this.over = true;
    this.ctx.input.stop();
    const player = this.ctx.host.player;
    player.setVelocity(0, 0);
    if (snap) this.ctx.stage.place(player, this.target.x, this.target.y);
  }
}

/** Starts one leaf step (the runner in core/cutscene.ts handles seq / par). */
export function launchStep(step: CutsceneStep, ctx: StepContext): StepHandle {
  const { stage, host } = ctx;
  const ease = (name: EaseName | undefined, t: number): number => applyEase(name ?? 'smooth', t);

  switch (step.do) {
    case 'wait':
      return new Timed(step.ms, () => {});

    case 'say':
      return new SayStep(ctx, step.who, step.text, step.auto ?? false);

    case 'camera': {
      const from = { ...stage.camera };
      const zoom = step.zoom ?? from.zoom;
      const ms = step.ms ?? CUTSCENE.camera.defaultMs;
      return new Timed(ms, (t) => {
        const to = stage.at(step.to); // read every frame: a camera sent to an actor follows it
        const k = ease(step.ease ?? CUTSCENE.camera.ease, t);
        stage.setCamera(lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.zoom, zoom, k));
      });
    }

    case 'move': {
      const who = stage.actor(step.actor);
      if (!who) return DONE;
      const from = { x: who.x, y: who.y };
      const to = stage.at(step.to);
      if (step.face ?? true) stage.face(step.actor, to);
      return new Timed(step.ms, (t) => {
        const k = ease(step.ease, t);
        stage.place(who, lerp(from.x, to.x, k), lerp(from.y, to.y, k));
      });
    }

    case 'walk':
      return new WalkStep(ctx, stage.at(step.to), step.maxMs ?? CUTSCENE.walk.maxMs);

    case 'face':
      return instant(() => stage.face(step.actor, stage.at(step.toward)));

    case 'emote': {
      const who = stage.actor(step.actor);
      if (!who) return DONE;
      if (step.actor === 'varu' && step.kind !== 'shake') return DONE; // his tick owns his turn and size every frame
      const ms = step.ms ?? CUTSCENE.emote.defaultMs;
      const base = { x: who.x, y: who.y, rotation: who.rotation, sx: who.scaleX, sy: who.scaleY };
      return new Timed(
        ms,
        (t) => {
          if (step.kind === 'pop') {
            const k = 1 + (CUTSCENE.emote.popScale - 1) * Math.sin(Math.PI * t);
            who.setScale(base.sx * k, base.sy * k);
          } else if (step.kind === 'shake') {
            const sway = Math.sin((t * ms * CUTSCENE.emote.shakeHz * Math.PI * 2) / 1000) * CUTSCENE.emote.shakePx * (1 - t);
            who.setX(base.x + sway);
          } else {
            who.setRotation(base.rotation + Math.PI * 2 * applyEase('smooth', t));
          }
        },
        () => {
          who.setScale(base.sx, base.sy);
          who.setRotation(base.rotation);
          stage.place(who, base.x, base.y);
        },
      );
    }

    case 'show':
      return instant(() => {
        const at = stage.at(step.at);
        stage.show(step.id, step.tex, at.x, at.y, step.size ?? CUTSCENE.actors.defaultSize, step.fadeMs ?? CUTSCENE.actors.fadeMs);
      });

    case 'hide':
      return instant(() => stage.hide(step.id, step.fadeMs ?? CUTSCENE.actors.fadeMs));

    case 'text':
      return instant(() => {
        const at = stage.at(step.at);
        host.say(at.x, at.y, step.text, step.color ?? CUTSCENE.text.color, step.size ?? CUTSCENE.text.size);
      });

    case 'shake':
      return instant(() => host.scene.cameras.main.shake(step.ms ?? CUTSCENE.shake.ms, step.power ?? CUTSCENE.shake.power));

    case 'flash':
      return instant(() => {
        const color = step.color ?? CUTSCENE.flash.color;
        host.scene.cameras.main.flash(step.ms ?? CUTSCENE.flash.ms, (color >> 16) & 255, (color >> 8) & 255, color & 255);
      });

    case 'fade': {
      const cam = host.scene.cameras.main;
      const ms = Math.max(1, step.ms ?? CUTSCENE.fade.ms);
      if (step.to === 'black') cam.fade(ms, 0, 0, 0, true);
      else cam.fadeIn(ms, 0, 0, 0);
      return new Timed(
        ms,
        () => {},
        () => {
          if (step.to === 'black') cam.fade(1, 0, 0, 0, true);
          else cam.resetFX(); // skipped or finished: the screen is clear
        },
      );
    }

    case 'music':
      return instant(() => {
        const payload: MusicPayload = { track: step.track };
        bus.emit(Events.MusicTrack, payload);
      });

    case 'sfx':
      return instant(() => {
        const payload: CutsceneSfxPayload = { id: step.id };
        bus.emit(Events.CutsceneSfx, payload);
      });

    case 'call':
      return instant(() => {
        const hook = CUTSCENE_HOOKS[step.hook];
        if (hook) hook(host);
        else if (import.meta.env.DEV) console.warn(`[cutscene] no hook "${step.hook}" in systems/cutscene/hooks.ts`);
      });

    case 'seq':
    case 'par':
      return DONE; // the runner (core/cutscene.ts) handles these; they never get here
  }
}
