/** @file Guarded localStorage: best scores, mute, volumes, hints, unlocks, vibration, roll button spot. */
import { DEFAULT_DIFFICULTY, isDifficultyId, type DifficultyId } from '../config/difficulty';
import type { RecordMode } from './run';

const KEY_PREFIX = 'varu-vs-pisicile:';
const BEST_KEYS: Record<RecordMode, string> = {
  campaign: `${KEY_PREFIX}best`, // same key as before, so old records survive
  endless: `${KEY_PREFIX}best-endless`,
};
/** The record key: Normal keeps the old key (old records survive), the other difficulties get their own. */
const bestKey = (mode: RecordMode, difficulty: DifficultyId): string => (difficulty === DEFAULT_DIFFICULTY ? BEST_KEYS[mode] : `${BEST_KEYS[mode]}-${difficulty}`);
const BEST_COMBO_KEY = `${KEY_PREFIX}best-combo`;
const LIFETIME_KILLS_KEY = `${KEY_PREFIX}lifetime-kills`;
const LIFETIME_RUNS_KEY = `${KEY_PREFIX}lifetime-runs`;
const MUTED_KEY = `${KEY_PREFIX}muted`;
const HELP_HIDDEN_KEY = `${KEY_PREFIX}help-hidden`;
const ENDLESS_UNLOCKED_KEY = `${KEY_PREFIX}endless-unlocked`;
const AUTO_ATTACK_KEY = `${KEY_PREFIX}auto-attack`;
const SEEN_CUTSCENES_KEY = `${KEY_PREFIX}cutscenes-seen`;
const TUTORIAL_DONE_KEY = `${KEY_PREFIX}tutorial-done`;
const INTRO_SEEN_KEY = `${KEY_PREFIX}intro-seen`;
const WHATS_NEW_KEY = `${KEY_PREFIX}whats-new-seen`;
const ALMANAC_SEEN_KEY = `${KEY_PREFIX}almanac-seen`;
const DIFFICULTY_KEY = `${KEY_PREFIX}difficulty`;
const CUSTOM_SETUP_KEY = `${KEY_PREFIX}custom-setup`;
const DEBUG_INFO_KEY = `${KEY_PREFIX}debug-info`;
const VIBRATION_KEY = `${KEY_PREFIX}vibration`;
const ROLL_LAYOUT_KEY = `${KEY_PREFIX}roll-layout`; // v224, roll button only: read once as a fallback
const TOUCH_LAYOUT_KEY = `${KEY_PREFIX}touch-layout`;
const STATIC_STICK_KEY = `${KEY_PREFIX}static-stick`;
const FPS_LIMIT_KEY = `${KEY_PREFIX}fps-limit`;
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

export function loadBest(mode: RecordMode = 'campaign', difficulty: DifficultyId = DEFAULT_DIFFICULTY): number {
  return Number(read(bestKey(mode, difficulty))) || 0;
}

export function saveBest(score: number, mode: RecordMode = 'campaign', difficulty: DifficultyId = DEFAULT_DIFFICULTY): void {
  write(bestKey(mode, difficulty), String(score));
}

/** The longest kill chain ever (all modes and difficulties). */
export const loadBestCombo = (): number => Number(read(BEST_COMBO_KEY)) || 0;
export const saveBestCombo = (count: number): void => write(BEST_COMBO_KEY, String(count));

/** Totals over every run on this device. */
export const loadLifetime = (): { runs: number; kills: number } => ({ runs: Number(read(LIFETIME_RUNS_KEY)) || 0, kills: Number(read(LIFETIME_KILLS_KEY)) || 0 });
export function addLifetime(kills: number): void {
  const now = loadLifetime();
  write(LIFETIME_RUNS_KEY, String(now.runs + 1));
  write(LIFETIME_KILLS_KEY, String(now.kills + kills));
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

/** The saved frame-rate limit (fps), or `fallback` if nothing valid is stored. */
export function loadFpsLimit(fallback: number): number {
  const raw = read(FPS_LIMIT_KEY);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1000 ? value : fallback; // 0 = no limit
}

export function saveFpsLimit(fps: number): void {
  write(FPS_LIMIT_KEY, String(fps));
}

/** Phone vibration (pause menu). On unless saved as off. */
export function loadVibration(): boolean {
  return read(VIBRATION_KEY) !== '0';
}

export function saveVibration(on: boolean): void {
  write(VIBRATION_KEY, on ? '1' : '0');
}

/** Whether the move stick stays at one fixed spot (button editor, phones). Floating (off) unless saved as on. */
export function loadStaticStick(): boolean {
  return read(STATIC_STICK_KEY) === '1';
}

export function saveStaticStick(on: boolean): void {
  write(STATIC_STICK_KEY, on ? '1' : '0');
}

/** One button's saved size id and its spot as an offset (game px) from the default spot. */
export interface SavedButton {
  size: string;
  dx: number;
  dy: number;
}

const isSaved = (v: unknown): v is SavedButton => {
  const d = v as Partial<SavedButton> | null;
  return !!d && typeof d.size === 'string' && typeof d.dx === 'number' && typeof d.dy === 'number' && Number.isFinite(d.dx) && Number.isFinite(d.dy);
};

/** The saved layout of the touch buttons, by button id (only buttons that were changed). The v224 roll-only save is still read. */
export function loadTouchLayout(): Record<string, SavedButton> {
  const out: Record<string, SavedButton> = {};
  try {
    const raw = read(TOUCH_LAYOUT_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Record<string, unknown>;
      for (const id of Object.keys(data)) if (isSaved(data[id])) out[id] = data[id];
      return out;
    }
    const old = read(ROLL_LAYOUT_KEY);
    if (old) {
      const data = JSON.parse(old) as unknown;
      if (isSaved(data)) out.roll = data;
    }
  } catch {
    // a broken save is the same as no save
  }
  return out;
}

export function saveTouchLayout(layout: Record<string, SavedButton>): void {
  write(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
}

/** The difficulty chosen on the main menu (Normal unless saved otherwise). */
export function loadDifficulty(): DifficultyId {
  const raw = read(DIFFICULTY_KEY);
  return isDifficultyId(raw) ? raw : DEFAULT_DIFFICULTY;
}

export function saveDifficulty(id: DifficultyId): void {
  write(DIFFICULTY_KEY, id);
}

/** The custom game setup (row id -> index of the chosen value) as saved, or null if there is none or it is not an object. `core/customGame.ts` cleans it. */
export function loadCustomSetup(): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(read(CUSTOM_SETUP_KEY) ?? 'null');
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function saveCustomSetup(setup: Readonly<Record<string, number>>): void {
  write(CUSTOM_SETUP_KEY, JSON.stringify(setup));
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

/** The id of the newest "what's new" card this device has seen (null = never saved). */
export function loadWhatsNewSeen(): number | null {
  const raw = read(WHATS_NEW_KEY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveWhatsNewSeen(id: number): void {
  write(WHATS_NEW_KEY, String(id));
}
