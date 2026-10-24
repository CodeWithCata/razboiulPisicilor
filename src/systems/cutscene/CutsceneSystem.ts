/** @file The cutscene director: plays scripts (content/cutscenes.ts), starts them from run events, queues them, skips them, hands the game back. Run-lifetime. */
import { CUTSCENE_TRIGGERS, CUTSCENES } from '../../content/cutscenes';
import { CUTSCENE } from '../../config/cutscene';
import {
  createTimeline,
  triggerMatches,
  type CutsceneScript,
  type CutsceneTrigger,
  type StepHandle,
} from '../../core/cutscene';
import {
  bus,
  Events,
  listen,
  type BossDefeatedPayload,
  type BossSpawnedPayload,
  type CutsceneEndPayload,
  type CutsceneLinePayload,
  type CutsceneStartPayload,
  type WavePayload,
} from '../../core/events';
import type { RunMode } from '../../core/run';
import { loadSeenCutscenes, saveSeenCutscene } from '../../core/storage';
import { ScriptedInput } from '../../input/ScriptedInput';
import { CutsceneStage, type CutsceneHost } from './CutsceneStage';
import { launchStep, type LineChannel, type StepContext } from './steps';

const OVERLAY_SCENE = 'CutsceneScene';

interface Running {
  id: string;
  script: CutsceneScript;
  timeline: StepHandle;
  /** Set once the script is over and the camera is gliding back to Varu. */
  returning: StepHandle | null;
  /** Called when it is over, however it ended (the victory screen waits for its scene this way). */
  then?: () => void;
}

interface Queued {
  id: string;
  then?: () => void;
}

/**
 * A cutscene is a script of steps played in REAL time while the game itself is held still: GameScene skips every
 * gameplay system, the game clock does not move, Varu walks on a scripted input. The overlay (bars, dialogue box,
 * skip ring) lives in CutsceneScene and only talks to this through the bus.
 */
export class CutsceneSystem {
  /** GameScene feeds this to Player.tick while `active`. */
  readonly input = new ScriptedInput();
  private readonly stage: CutsceneStage;
  private readonly seenThisRun = new Set<string>();
  private readonly seenSaved = new Set<string>(loadSeenCutscenes());
  private readonly queue: Queued[] = [];
  private readonly off: Array<() => void>;
  private running: Running | null = null;
  private lineId = 0;
  private advanceTapped = false;
  private stopped = false;

  constructor(
    private readonly host: CutsceneHost,
    private readonly mode: RunMode,
  ) {
    this.stage = new CutsceneStage(host, this.input);
    this.off = [
      listen<WavePayload>(Events.WaveStarted, (p) => this.fire({ on: 'waveStart', wave: p.wave })),
      listen<WavePayload>(Events.WaveCleared, (p) => this.fire({ on: 'waveCleared', wave: p.wave })),
      listen(Events.BeltUpgradePicked, () => this.fire({ on: 'upgradePicked' })),
      listen<BossSpawnedPayload>(Events.BossSpawned, (p) => this.fire({ on: 'bossSpawned', boss: p.boss })),
      listen<BossDefeatedPayload>(Events.BossDefeated, (p) => this.fire({ on: 'bossDefeated', boss: p.boss })),
      listen(Events.PlayerDied, () => this.cancel()),
      listen(Events.CutsceneAdvance, () => {
        this.advanceTapped = true;
      }),
      listen(Events.CutsceneSkip, () => this.skip()),
    ];
  }

  /** A cutscene is playing: GameScene runs only `update` and the scripted Varu. */
  get active(): boolean {
    return this.running !== null;
  }

  /**
   * Something happened in the run: play the cutscene a trigger names (if any). Returns true if one will play,
   * and `then` runs when it is over. Without a matching trigger nothing happens and `then` is NOT called (the caller goes on itself).
   */
  fire(event: CutsceneTrigger, then?: () => void): boolean {
    if (!CUTSCENE.enabled || this.stopped) return false;
    const def = CUTSCENE_TRIGGERS.find((d) => triggerMatches(d.when, event) && (d.mode === undefined || d.mode === this.mode) && !this.seen(d.play, d.repeat));
    if (!def) return false;
    if (!CUTSCENES[def.play]) {
      if (import.meta.env.DEV) console.warn(`[cutscene] trigger names "${def.play}" but CUTSCENES has no such scene`);
      return false;
    }
    this.markSeen(def.play, def.repeat);
    const delay = def.delayMs ?? CUTSCENE.triggerDelayMs;
    if (delay > 0) this.host.scene.time.delayedCall(delay, () => this.play(def.play, then));
    else this.play(def.play, then);
    return true;
  }

  /** Play a scene by id now (or right after the one playing). Returns false if it does not exist or cutscenes are off. */
  play(id: string, then?: () => void): boolean {
    if (!CUTSCENE.enabled || this.stopped) return false;
    if (!CUTSCENES[id]) {
      if (import.meta.env.DEV) console.warn(`[cutscene] no scene "${id}" in content/cutscenes.ts`);
      return false;
    }
    if (this.running) {
      this.queue.push({ id, then });
      return true;
    }
    this.start(id, then);
    return true;
  }

  /** Every frame of a cutscene, with the REAL frame time. */
  update(deltaMs: number): void {
    const run = this.running;
    if (!run) return;
    const dt = Math.min(deltaMs, CUTSCENE.maxStepMs);
    this.stage.update();
    if (run.returning) {
      run.returning.update(dt);
      if (run.returning.done) this.stopCurrent(false);
      return;
    }
    run.timeline.update(dt);
    if (run.timeline.done) this.beginReturn(run);
  }

  /** Jump to the end of the scene (the player held long enough). */
  skip(): void {
    const run = this.running;
    if (!run || !(run.script.skippable ?? true) || run.returning) return;
    run.timeline.finish();
    this.stopCurrent(true);
  }

  /** The run is ending (Varu fell): drop everything without ceremony. */
  cancel(): void {
    this.queue.length = 0;
    if (this.running) {
      this.running.then = undefined;
      this.stopCurrent(true);
    }
  }

  /** The scene is shutting down: stop listening, remove props. The camera and the overlay are the scene's own business then. */
  destroy(): void {
    this.stopped = true;
    for (const off of this.off) off();
    this.queue.length = 0;
    this.running = null;
    this.stage.clear();
  }

  // ---- internals -------------------------------------------------------------
  private seen(id: string, repeat: 'always' | 'run' | 'save' | undefined): boolean {
    if (repeat === 'run') return this.seenThisRun.has(id);
    if (repeat === 'save') return this.seenSaved.has(id);
    return false;
  }

  private markSeen(id: string, repeat: 'always' | 'run' | 'save' | undefined): void {
    if (repeat === 'run') this.seenThisRun.add(id);
    if (repeat === 'save') {
      this.seenSaved.add(id);
      saveSeenCutscene(id);
    }
  }

  private readonly lines: LineChannel = {
    begin: (who, text, auto) => {
      this.lineId += 1;
      this.advanceTapped = false;
      const payload: CutsceneLinePayload = { lineId: this.lineId, speaker: who, text, auto };
      bus.emit(Events.CutsceneLine, payload);
      return this.lineId;
    },
    consumeAdvance: () => {
      const tapped = this.advanceTapped;
      this.advanceTapped = false;
      return tapped;
    },
    end: () => bus.emit(Events.CutsceneLineEnd),
  };

  private start(id: string, then?: () => void): void {
    const script = CUTSCENES[id];
    if (!script) return;
    const ctx: StepContext = { stage: this.stage, host: this.host, input: this.input, lines: this.lines };
    this.host.prepare();
    this.input.stop();
    this.stage.begin();
    this.advanceTapped = false;
    this.running = {
      id,
      script,
      timeline: createTimeline(script.steps, (step) => launchStep(step, ctx)),
      returning: null,
      then,
    };
    const payload: CutsceneStartPayload = {
      id,
      bars: script.bars ?? true,
      skippable: script.skippable ?? true,
      hideHud: script.hideHud ?? true,
    };
    bus.emit(Events.CutsceneStart, payload); // an overlay that is still sliding out from the last scene hears this and starts over
    const scenes = this.host.scene.scene;
    if (!scenes.isActive(OVERLAY_SCENE)) scenes.launch(OVERLAY_SCENE, payload);
  }

  /** The script is over: the camera glides back to Varu, then the game takes over. */
  private beginReturn(run: Running): void {
    const ctx: StepContext = { stage: this.stage, host: this.host, input: this.input, lines: this.lines };
    run.returning = launchStep({ do: 'camera', to: { at: 'varu' }, zoom: 1, ms: CUTSCENE.camera.returnMs }, ctx);
  }

  private stopCurrent(skipped: boolean): void {
    const run = this.running;
    if (!run) return;
    this.running = null;
    this.stage.end();
    this.stage.clear();
    this.input.stop();
    this.host.player.setVelocity(0, 0);
    this.host.finish();
    bus.emit(Events.CutsceneLineEnd);
    const payload: CutsceneEndPayload = { id: run.id, skipped };
    bus.emit(Events.CutsceneEnd, payload);
    run.then?.();
    const next = this.queue.shift();
    if (next) this.start(next.id, next.then);
  }
}
