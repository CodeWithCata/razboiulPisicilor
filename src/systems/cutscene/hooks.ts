/** @file Named functions a cutscene can call with a `call` step, for anything a plain step cannot do (none yet). */
import type { CutsceneHost } from './CutsceneStage';

export type CutsceneHook = (host: CutsceneHost) => void;

/** Add one when a scene needs real game code (heal Varu, spawn smoke, turn the lamps on...). The key is what the `call` step names. */
export const CUTSCENE_HOOKS: Readonly<Record<string, CutsceneHook>> = {};
