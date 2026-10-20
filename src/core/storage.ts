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
