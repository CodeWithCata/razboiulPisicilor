/** @file Cutscene scripts as data (the step types, triggers) and the pure step runner (sequence / parallel, skip = fast-forward). No Phaser. */
import type { MusicId, SoundId } from '../assets/audioKeys';
import type { TexKey } from '../assets/keys';
import type { BossType } from '../config/balance';
import type { EaseName } from './ease';
import type { RunMode } from './run';

/** A place: fixed world pixels, or "where this actor is" (+ an offset). Actors: 'varu', 'boss', or the id of a `show` step. */
export type CutSpot = { x: number; y: number } | { at: string; dx?: number; dy?: number };

export type EmoteKind = 'pop' | 'shake' | 'spin';

/**
 * One thing that happens in a cutscene. A script is a list of these, played top to bottom.
 * Timed steps (wait, say, camera, move, walk, emote, fade) hold the script until they are done;
 * the others happen at once. `par` runs its steps at the same time, `seq` is a list inside a `par`.
 * Add a step: a type here + a case in `systems/cutscene/steps.ts`.
 */
export type CutsceneStep =
  | { do: 'wait'; ms: number }
  /** A line of dialogue. Waits for a tap, or closes by itself with `auto`. `who` is a key of SPEAKERS. */
  | { do: 'say'; who: string; text: string; auto?: boolean }
  /** The camera glides to a spot (it follows an actor if the spot is one) and can zoom. */
  | { do: 'camera'; to: CutSpot; zoom?: number; ms?: number; ease?: EaseName }
  /** A glide (not a walk). Good for cats and props; Varu should `walk`. */
  | { do: 'move'; actor: string; to: CutSpot; ms: number; ease?: EaseName; face?: boolean }
  /** Varu walks with his real walk animation (scripted input). Ends on arrival or after `maxMs`. */
  | { do: 'walk'; to: CutSpot; maxMs?: number }
  | { do: 'face'; actor: string; toward: CutSpot }
  | { do: 'emote'; actor: string; kind: EmoteKind; ms?: number }
  /** Put a code-drawn picture on the stage. `id` is how later steps name it. */
  | { do: 'show'; id: string; tex: TexKey; at: CutSpot; size?: number; fadeMs?: number }
  | { do: 'hide'; id: string; fadeMs?: number }
  /** A floating word in the arena (same look as the hit words). */
  | { do: 'text'; at: CutSpot; text: string; color?: string; size?: number }
  | { do: 'shake'; ms?: number; power?: number }
  | { do: 'flash'; ms?: number; color?: number }
  | { do: 'fade'; to: 'black' | 'clear'; ms?: number }
  | { do: 'music'; track: MusicId | null }
  | { do: 'sfx'; id: SoundId }
  /** Run a named function from `systems/cutscene/hooks.ts` (for anything a plain step cannot do). */
  | { do: 'call'; hook: string }
  | { do: 'seq'; steps: readonly CutsceneStep[] }
  | { do: 'par'; steps: readonly CutsceneStep[] };

export interface CutsceneScript {
  steps: readonly CutsceneStep[];
  /** Cinema bars (default true). */
  bars?: boolean;
  /** Hold to skip (default true). false = a scene that must be seen. */
  skippable?: boolean;
  /** The HUD fades out (default true). */
  hideHud?: boolean;
}

/** Something that happened in the run. Triggers are written in the same shape. */
export type CutsceneTrigger =
  | { on: 'runStart' }
  | { on: 'waveStart'; wave: number }
  | { on: 'waveCleared'; wave: number }
  | { on: 'bossSpawned'; boss?: BossType }
  | { on: 'bossDefeated'; boss?: BossType }
  | { on: 'victory' };

export interface CutsceneTriggerDef {
  when: CutsceneTrigger;
  /** A key of CUTSCENES. */
  play: string;
  /** 'always' (default), once per 'run', or once per device ('save'). */
  repeat?: 'always' | 'run' | 'save';
  /** Only in this mode (default: both). */
  mode?: RunMode;
  /** Wait this long after the event (default CUTSCENE.triggerDelayMs). */
  delayMs?: number;
}

/** Does this event fire that trigger? A trigger without `boss` takes any boss. */
export function triggerMatches(when: CutsceneTrigger, event: CutsceneTrigger): boolean {
  if (when.on !== event.on) return false;
  if ('wave' in when) return 'wave' in event && when.wave === event.wave;
  if ('boss' in when && when.boss !== undefined) return 'boss' in event && event.boss === when.boss;
  return true;
}

// ---- the runner ------------------------------------------------------------

/** What a running step looks like to the runner. `finish()` must jump to the step's END state (that is what skipping does). */
export interface StepHandle {
  readonly done: boolean;
  update(dtMs: number): void;
  finish(): void;
}

/** Starts one leaf step (anything but seq / par). Side effects of a step happen here. */
export type StepLaunch = (step: CutsceneStep) => StepHandle;

function launchNode(step: CutsceneStep, launch: StepLaunch): StepHandle {
  if (step.do === 'seq') return new Sequence(step.steps, launch);
  if (step.do === 'par') return new Parallel(step.steps, launch);
  return launch(step);
}

/** Steps one after another. A step is only launched when it is its turn, so it reads the world as it is THEN. */
class Sequence implements StepHandle {
  private index = 0;
  private current: StepHandle | null = null;
  private readonly steps: readonly CutsceneStep[];
  private readonly launch: StepLaunch;

  constructor(steps: readonly CutsceneStep[], launch: StepLaunch) {
    this.steps = steps;
    this.launch = launch;
  }

  get done(): boolean {
    return this.current === null && this.index >= this.steps.length;
  }

  update(dtMs: number): void {
    let dt = dtMs;
    // A step that ends this frame hands over to the next one in the same frame (time left over is dropped, not carried).
    for (let guard = 0; guard < 10000; guard++) {
      if (this.current === null) {
        const next = this.steps[this.index];
        if (next === undefined) return;
        this.index += 1;
        this.current = launchNode(next, this.launch);
      }
      this.current.update(dt);
      dt = 0;
      if (!this.current.done) return;
      this.current = null;
    }
  }

  finish(): void {
    for (;;) {
      if (this.current === null) {
        const next = this.steps[this.index];
        if (next === undefined) return;
        this.index += 1;
        this.current = launchNode(next, this.launch);
      }
      this.current.finish();
      this.current = null;
    }
  }
}

/** Steps all at once; done when the last one is done. */
class Parallel implements StepHandle {
  private readonly handles: StepHandle[];

  constructor(steps: readonly CutsceneStep[], launch: StepLaunch) {
    this.handles = steps.map((step) => launchNode(step, launch));
  }

  get done(): boolean {
    return this.handles.every((handle) => handle.done);
  }

  update(dtMs: number): void {
    for (const handle of this.handles) if (!handle.done) handle.update(dtMs);
  }

  finish(): void {
    for (const handle of this.handles) if (!handle.done) handle.finish();
  }
}

/** A whole script as one handle. `update(dt)` plays it; `finish()` fast-forwards to the end state (the skip). */
export function createTimeline(steps: readonly CutsceneStep[], launch: StepLaunch): StepHandle {
  return new Sequence(steps, launch);
}

// ---- typewriter ------------------------------------------------------------

export interface TypeTiming {
  charsPerSec: number;
  /** Extra ms after a character. */
  pauses: Readonly<Record<string, number>>;
}

/** How many characters of `text` are shown after `elapsedMs` of typing. */
export function revealedCount(text: string, elapsedMs: number, timing: TypeTiming): number {
  const per = 1000 / timing.charsPerSec;
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    t += per;
    if (t > elapsedMs) return i;
    t += timing.pauses[text.charAt(i)] ?? 0;
  }
  return text.length;
}

/** How long typing the whole text takes (ms). */
export function typeDurationMs(text: string, timing: TypeTiming): number {
  let t = 0;
  for (let i = 0; i < text.length; i++) t += 1000 / timing.charsPerSec + (timing.pauses[text.charAt(i)] ?? 0);
  return t;
}

/** How long an `auto` line lives: its typing, plus time to read it. */
export function lineAutoMs(text: string, timing: TypeTiming, read: { msPerChar: number; minHoldMs: number }): number {
  return typeDurationMs(text, timing) + Math.max(read.minHoldMs, text.length * read.msPerChar);
}
