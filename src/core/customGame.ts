/** @file The custom game setup of this device: loaded and cleaned at start, changed by the setup screen (one choice, a preset, random, reset) and saved at every change. */
import {
  BOSS_ROW,
  CAT_ROW,
  CUSTOM_CATS,
  CUSTOM_PRESETS,
  CUSTOM_ROW_ORDER,
  CUSTOM_ROWS,
  type CustomPresetId,
  type CustomProblem,
  type CustomRowId,
  type CustomSetup,
} from '../config/customGame';
import { loadCustomSetup, saveCustomSetup } from './storage';

type MutableSetup = Record<CustomRowId, number>;

/** Every row on its starting choice. */
function defaultSetup(): MutableSetup {
  const out = {} as MutableSetup;
  for (const id of CUSTOM_ROW_ORDER) out[id] = CUSTOM_ROWS[id].start;
  return out;
}

/** A saved setup made safe: every row holds a whole number inside its choices, otherwise the row's starting choice. */
function sanitize(raw: Record<string, unknown> | null): CustomSetup {
  const out = defaultSetup();
  if (!raw) return out;
  for (const id of CUSTOM_ROW_ORDER) {
    const value = raw[id];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < CUSTOM_ROWS[id].values.length) out[id] = value;
  }
  return out;
}

/** The setup the setup screen shows and the next custom run plays. Never changed in place: every change makes a new object. */
let current: CustomSetup = sanitize(loadCustomSetup());

export const getCustomSetup = (): CustomSetup => current;

/** The chosen VALUE of a row (not its index). */
export function customValue(setup: CustomSetup, id: CustomRowId): number {
  const row = CUSTOM_ROWS[id];
  return row.values[setup[id]] ?? row.values[row.start] ?? 0;
}

function change(next: CustomSetup): CustomSetup {
  current = next;
  saveCustomSetup(next);
  return next;
}

/** One row steps to its next (+1) or previous (-1) choice and wraps round at the ends. Returns the new setup. */
export function stepChoice(id: CustomRowId, delta: number): CustomSetup {
  const count = CUSTOM_ROWS[id].values.length;
  const next: MutableSetup = { ...current };
  next[id] = (((current[id] + delta) % count) + count) % count;
  return change(next);
}

/** Every row back to its starting choice. */
export const resetSetup = (): CustomSetup => change(defaultSetup());

/** A quick setup: it starts from the default setup and sets the rows the preset lists (the preset holds VALUES, this finds their indexes; a value the row does not offer is ignored). */
export function applyPreset(id: CustomPresetId): CustomSetup {
  const next = defaultSetup();
  const preset = CUSTOM_PRESETS.find((p) => p.id === id);
  if (preset) {
    for (const [rowId, value] of Object.entries(preset.values) as Array<[CustomRowId, number]>) {
      const index = CUSTOM_ROWS[rowId].values.indexOf(value);
      if (index >= 0) next[rowId] = index;
    }
  }
  return change(next);
}

/** Why this setup cannot be played, or null if it can. */
export function setupProblem(setup: CustomSetup): CustomProblem | null {
  const noCats = CUSTOM_CATS.every((cat) => customValue(setup, CAT_ROW[cat]) <= 0);
  if (!noCats) return null;
  const noBosses = (Object.values(BOSS_ROW) as CustomRowId[]).every((row) => customValue(setup, row) <= 0);
  if (noBosses) return 'nothing';
  // Bosses only, no last wave and no repeats: after the bosses of the first waves every wave would be empty for ever.
  if (customValue(setup, 'waves') <= 0 && customValue(setup, 'bossRepeat') <= 0) return 'noCatsForever';
  return null;
}

/** The first choice of a row that is not "none" / "off" (its value is above 0). */
function firstOn(id: CustomRowId): number {
  const index = CUSTOM_ROWS[id].values.findIndex((value) => value > 0);
  return index >= 0 ? index : CUSTOM_ROWS[id].start;
}

/** Every row on a random choice, each boss off with a 50% chance, and fixed if the result cannot be played (ordinary cats come back). */
export function randomizeSetup(): CustomSetup {
  const next = defaultSetup();
  for (const id of CUSTOM_ROW_ORDER) next[id] = Math.floor(Math.random() * CUSTOM_ROWS[id].values.length);
  for (const row of Object.values(BOSS_ROW) as CustomRowId[]) {
    if (Math.random() < 0.5) next[row] = Math.max(0, CUSTOM_ROWS[row].values.indexOf(0)); // the boss is off
  }
  if (setupProblem(next)) next[CAT_ROW.normal] = firstOn(CAT_ROW.normal);
  return change(next);
}
