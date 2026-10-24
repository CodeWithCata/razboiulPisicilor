/** @file The wave plan of a run: its first and last wave, what each wave holds and when a belt upgrade is due. Campaign, endless and custom runs each hand the systems one, so they never ask which mode it is. */
import { ENDLESS, FINAL_WAVE, getWave, type WaveDef } from '../config/waves';
import { beltUpgradeDue } from './beltUpgrades';
import { customFinalWave, customUpgradeDue, customWaveDef } from './customWaves';
import { getCustomSetup } from './customGame';
import type { RunOptions } from './run';

export interface WavePlan {
  /** The number of the first wave of the run (1, or the first endless wave). */
  firstWave: number;
  /** The wave whose clearing wins the run, or null when the run never ends. */
  finalWave: number | null;
  /** The cats and bosses of wave `n` (`endlessGrowth` = the difficulty's endless factor; only the endless waves read it). */
  waveDef(n: number, endlessGrowth: number): WaveDef;
  /** Is a belt upgrade pick due after wave `n` was cleared? */
  upgradeDue(n: number): boolean;
}

const CAMPAIGN: WavePlan = {
  firstWave: 1,
  finalWave: FINAL_WAVE,
  waveDef: getWave,
  upgradeDue: (n) => beltUpgradeDue(n, 'campaign', FINAL_WAVE),
};

const ENDLESS_PLAN: WavePlan = {
  firstWave: ENDLESS.startWave,
  finalWave: null,
  waveDef: getWave,
  upgradeDue: (n) => beltUpgradeDue(n, 'endless', FINAL_WAVE),
};

/** The plan a run plays. A custom run without a setup plays the one saved on this device. */
export function planFor(run: RunOptions): WavePlan {
  if (run.mode === 'campaign') return CAMPAIGN;
  if (run.mode === 'endless') return ENDLESS_PLAN;
  const setup = run.custom ?? getCustomSetup();
  return {
    firstWave: 1,
    finalWave: customFinalWave(setup),
    waveDef: (n) => customWaveDef(setup, n),
    upgradeDue: (n) => customUpgradeDue(setup, n),
  };
}
