/** @file The single source of truth for muted / unmuted (persisted, announced on the bus). */
import { bus, Events, type MutePayload } from './events';
import { loadMuted, saveMuted } from './storage';

/** The one place that knows if the game is muted. Persisted, and announced on the bus. */
let muted = loadMuted();

export const isMuted = (): boolean => muted;

export function setMuted(value: boolean): void {
  if (value === muted) return;
  muted = value;
  saveMuted(value);
  const payload: MutePayload = { muted };
  bus.emit(Events.MuteChanged, payload);
}

export const toggleMuted = (): void => setMuted(!muted);
