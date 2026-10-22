/** @file Guarded localStorage: best scores, mute, volumes, hints, unlocks. */
import type { RunMode } from './run';

const KEY_PREFIX = 'varu-vs-pisicile:';
const BEST_KEYS: Record<RunMode, string> = {
  campaign: `${KEY_PREFIX}best`, // same key as before, so old records survive
  endless: `${KEY_PREFIX}best-endless`,
};
const MUTED_KEY = `${KEY_PREFIX}muted`;
const HELP_HIDDEN_KEY = `${KEY_PREFIX}help-hidden`;
const ENDLESS_UNLOCKED_KEY = `${KEY_PREFIX}endless-unlocked`;
const AUTO_ATTACK_KEY = `${KEY_PREFIX}auto-attack`;
const SEEN_CUTSCENES_KEY = `${KEY_PREFIX}cutscenes-seen`;
const TUTORIAL_DONE_KEY = `${KEY_PREFIX}tutorial-done`;
const INTRO_SEEN_KEY = `${KEY_PREFIX}intro-seen`;
const ALMANAC_SEEN_KEY = `${KEY_PREFIX}almanac-seen`;
const DEBUG_INFO_KEY = `${KEY_PREFIX}debug-info`;
const volumeKey = (kind: string): string => `${KEY_PREFIX}volume-${kind}`;

/** localStorage can be blocked (private mode), so every access is guarded. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the setting just won't persist.
  }
}

/** The almanac entries the player has met (cat types and pickup kinds), as saved. */
export function loadAlmanacSeen(): string[] {
  try {
    const parsed: unknown = JSON.parse(read(ALMANAC_SEEN_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveAlmanacSeen(ids: readonly string[]): void {
  write(ALMANAC_SEEN_KEY, JSON.stringify(ids));
}

export function loadBest(mode: RunMode = 'campaign'): number {
  return Number(read(BEST_KEYS[mode])) || 0;
}

export function saveBest(score: number, mode: RunMode = 'campaign'): void {
  write(BEST_KEYS[mode], String(score));
}

export function loadMuted(): boolean {
  return read(MUTED_KEY) === '1';
}

export function saveMuted(muted: boolean): void {
  write(MUTED_KEY, muted ? '1' : '0');
}

/** A saved volume (0..1), or `fallback` if nothing valid is stored. */
export function loadVolume(kind: string, fallback: number): number {
  const raw = read(volumeKey(kind));
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

export function saveVolume(kind: string, level: number): void {
  write(volumeKey(kind), String(level));
}

export function loadEndlessUnlocked(): boolean {
  return read(ENDLESS_UNLOCKED_KEY) === '1';
}

export function saveEndlessUnlocked(): void {
  write(ENDLESS_UNLOCKED_KEY, '1');
}

/** Whether the player hid the controls reminder (HUD, key H). */
export function loadHelpHidden(): boolean {
  return read(HELP_HIDDEN_KEY) === '1';
}

export function saveHelpHidden(hidden: boolean): void {
  write(HELP_HIDDEN_KEY, hidden ? '1' : '0');
}

/** Whether the player turned on auto-attack for touch controls (pause menu). Off unless saved as on. */
export function loadAutoAttack(): boolean {
  return read(AUTO_ATTACK_KEY) === '1';
}

export function saveAutoAttack(on: boolean): void {
  write(AUTO_ATTACK_KEY, on ? '1' : '0');
}

/** Whether the player turned on the fps / debug numbers (pause menu, phones). Off unless saved as on. */
export function loadDebugInfo(): boolean {
  return read(DEBUG_INFO_KEY) === '1';
}

export function saveDebugInfo(on: boolean): void {
  write(DEBUG_INFO_KEY, on ? '1' : '0');
}

/** Ids of the cutscenes this device has already seen (only those with `repeat: 'save'`). */
export function loadSeenCutscenes(): string[] {
  const raw = read(SEEN_CUTSCENES_KEY);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveSeenCutscene(id: string): void {
  const seen = loadSeenCutscenes();
  if (!seen.includes(id)) write(SEEN_CUTSCENES_KEY, JSON.stringify([...seen, id]));
}

/** Has this device finished (or skipped) the first-run tutorial? */
export function loadTutorialDone(): boolean {
  return read(TUTORIAL_DONE_KEY) === '1';
}

export function saveTutorialDone(): void {
  write(TUTORIAL_DONE_KEY, '1');
}

/** Has this device already watched (or skipped) the opening videos? */
export function loadIntroSeen(): boolean {
  return read(INTRO_SEEN_KEY) === '1';
}

export function saveIntroSeen(): void {
  write(INTRO_SEEN_KEY, '1');
}
