/** @file Player settings saved on the device: music / sfx volume, auto-attack, vibration, fixed move stick, debug numbers. */
import { AUDIO } from '../config/audio';
import { FPS_LIMIT } from '../config/fpsLimit';
import { usesTouchControls } from './device';
import { bus, Events, type VolumePayload } from './events';
import { loadAutoAttack, loadDebugInfo, loadFpsLimit, loadStaticStick, loadVibration, loadVolume, saveAutoAttack, saveDebugInfo, saveFpsLimit, saveStaticStick, saveVibration, saveVolume } from './storage';

export type VolumeKind = VolumePayload['kind'];

/**
 * Player-chosen volumes (0..1), set in the pause menu. They multiply the numbers in config/audio.ts,
 * which stay the designer's balance. Persisted, and announced with `Events.VolumeChanged`.
 */
const levels: Record<VolumeKind, number> = {
  music: loadVolume('music', 1),
  sfx: loadVolume('sfx', 1),
};

export const getVolume = (kind: VolumeKind): number => levels[kind];

/** Snaps to the nearest step so the sliders and the saved value always agree. */
export function setVolume(kind: VolumeKind, level: number): void {
  const steps = AUDIO.volumeSteps;
  const snapped = Math.round(Math.min(1, Math.max(0, level)) * steps) / steps;
  if (snapped === levels[kind]) return;
  levels[kind] = snapped;
  saveVolume(kind, snapped);
  const payload: VolumePayload = { kind, level: snapped };
  bus.emit(Events.VolumeChanged, payload);
}

export const nudgeVolume = (kind: VolumeKind, direction: 1 | -1): void => setVolume(kind, levels[kind] + direction / AUDIO.volumeSteps);

/**
 * The frame-rate limit (fps), set with the pause-menu slider on phones and computers. Always one of `FPS_LIMIT.choices`
 * (a saved value that is not one snaps to the nearest). Read by core/fpsLimit.ts on every frame, so no event is needed.
 */
const nearestFpsIndex = (fps: number): number => {
  const exact = FPS_LIMIT.choices.indexOf(fps);
  if (exact >= 0) return exact; // includes 0 = no limit
  let best = 0;
  FPS_LIMIT.choices.forEach((c, i) => {
    if (c > 0 && Math.abs(c - fps) < Math.abs(FPS_LIMIT.choices[best]! - fps)) best = i; // 0 (no limit) is never "near" a number
  });
  return best;
};
let fpsIndex = nearestFpsIndex(loadFpsLimit(usesTouchControls() ? FPS_LIMIT.default.touch : FPS_LIMIT.default.desktop));
let fpsValue: number = FPS_LIMIT.choices[fpsIndex]!;

/** The limit in fps; 0 = no limit. */
export const getFpsLimit = (): number => fpsValue;

/** The slider's level (0..1) like a volume bar: the filled share of blocks. */
export const getFpsLevel = (): number => (fpsIndex + 1) / FPS_LIMIT.choices.length;

/** `level` is a bar level (0..1): the block that was clicked. */
export function setFpsLevel(level: number): void {
  const count = FPS_LIMIT.choices.length;
  const index = Math.min(count - 1, Math.max(0, Math.round(level * count) - 1));
  if (index === fpsIndex) return;
  fpsIndex = index;
  fpsValue = FPS_LIMIT.choices[index]!;
  saveFpsLimit(fpsValue);
}

export const nudgeFpsLimit = (direction: 1 | -1): void => setFpsLevel((fpsIndex + 1 + direction) / FPS_LIMIT.choices.length);

/**
 * Touch only: should Varu swing the belt by himself when a cat is in reach? Off by default: the attack button does it.
 * Set in the pause menu, saved, and read by TouchInput every frame (so no event is needed).
 */
let autoAttack = loadAutoAttack();

export const getAutoAttack = (): boolean => autoAttack;

export function setAutoAttack(on: boolean): void {
  autoAttack = on;
  saveAutoAttack(on);
}

export const toggleAutoAttack = (): void => setAutoAttack(!autoAttack);

/**
 * Phones: show the fps and a few numbers on screen (ui/PerfPanel.ts), to find out why the game feels laggy. Off by default.
 * Set in the pause menu and saved. The numbers come from systems/PerfMonitor.ts.
 */
let debugInfo = loadDebugInfo();

export const getDebugInfo = (): boolean => debugInfo;

export function toggleDebugInfo(): void {
  debugInfo = !debugInfo;
  saveDebugInfo(debugInfo);
}

/** Phones: short vibration on dodge, hit and pick (core/haptics.ts). On by default; a switch in the pause menu turns it off. */
let vibration = loadVibration();

export const getVibration = (): boolean => vibration;

export function setVibration(on: boolean): void {
  vibration = on;
  saveVibration(on);
}

export const toggleVibration = (): void => setVibration(!vibration);

/**
 * Phones: should the move stick stay at one fixed spot (`TOUCH.idleStickSpot`) instead of appearing where the thumb lands?
 * Off (floating) by default. Set in the button editor (scenes/ButtonEditScene.ts), saved, read by TouchInput when a thumb lands.
 */
let staticStick = loadStaticStick();

export const getStaticStick = (): boolean => staticStick;

export function setStaticStick(on: boolean): void {
  if (on === staticStick) return;
  staticStick = on;
  saveStaticStick(on);
  bus.emit(Events.TouchLayoutChanged); // the pause menu row (PERSONALIZAT / IMPLICIT) follows
}

export const toggleStaticStick = (): void => setStaticStick(!staticStick);
