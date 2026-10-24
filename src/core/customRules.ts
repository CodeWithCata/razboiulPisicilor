/** @file The difficulty numbers of a custom run: Normal, with every rule row of the setup multiplying the fields it owns (health of the cats, hits taken, healing, bonuses...). */
import { CUSTOM_LOOK, CUSTOM_ROW_ORDER, CUSTOM_ROWS, type CustomSetup } from '../config/customGame';
import { DIFFICULTIES, type DifficultyStats } from '../config/difficulty';
import { CUSTOM_TEXT } from '../content/customGame';
import { customValue } from './customGame';

/**
 * A copy of `DIFFICULTIES.normal` with the custom name, blurb and color, then every field a row lists in `scales` is multiplied by that row's
 * chosen value (`CUSTOM_ROWS[id].scales`). Two rows may own the same field: both multiply. `core/difficulty.ts` hands it to every system for the
 * length of the run (`setRunDifficulty`).
 */
export function customDifficulty(setup: CustomSetup): DifficultyStats {
  const stats: DifficultyStats = { ...DIFFICULTIES.normal, name: CUSTOM_TEXT.difficultyName, blurb: CUSTOM_TEXT.difficultyBlurb, color: CUSTOM_LOOK.color };
  for (const id of CUSTOM_ROW_ORDER) {
    const scales = CUSTOM_ROWS[id].scales;
    if (!scales) continue;
    const value = customValue(setup, id);
    for (const field of scales) stats[field] *= value;
  }
  return stats;
}
