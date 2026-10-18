import { AUDIO } from '../config/audio';
import { bus, Events, type VolumePayload } from './events';
import { loadAutoAttack, loadDebugInfo, loadVolume, saveAutoAttack, saveDebugInfo, saveVolume } from './storage';

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
