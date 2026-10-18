import type { BossType, EnemyType } from './balance';

/** A wave is just "how many of each cat". */
export type WaveDef = Partial<Record<EnemyType, number>>;

/**
 * The whole campaign, wave by wave. Clearing the LAST wave wins the game (endless mode, unlocked by winning, keeps going: see ENDLESS).
 * New cat types are introduced one at a time; bosses sit in waves 7, 10 and 15.
 */
export const WAVES: readonly WaveDef[] = [
  { normal: 8 },
  { normal: 12 },
  { normal: 9, kamikaze: 5 }, // kamikaze debut
  { normal: 9, fat: 2 }, // fat cat debut
  { normal: 9, ninja: 5 }, // ninja debut
  { normal: 8, flying: 5 }, // flying debut
  { queen: 1, normal: 6 }, // MID BOSS: Queen Cat
  { normal: 11, kamikaze: 6, fat: 2 },
  { normal: 9, ninja: 6, flying: 5 },
  { mafia: 1, normal: 6, kamikaze: 3 }, // MID BOSS: Mafia Cat
  { normal: 12, fat: 3, kamikaze: 6 },
  { normal: 12, ninja: 6, flying: 6, fat: 3, kamikaze: 6 },
  { normal: 14, ninja: 8, flying: 8, fat: 3, kamikaze: 8 },
  { normal: 15, ninja: 8, flying: 8, fat: 5, kamikaze: 9 },
  { federer: 1 }, // FINAL BOSS: Pisica Federer (her ball boys show up in phase 2)
];

export const FINAL_WAVE = WAVES.length;

/**
 * Endless mode (unlocked by winning). It starts right after the campaign and never ends:
 * every wave is the last campaign wave with `growthPerWave` more cats, and every `bossEvery`-th wave
 * is a boss (the three bosses take turns) with a smaller crowd.
 */
export const ENDLESS = {
  startWave: FINAL_WAVE + 1,
  growthPerWave: 0.12,
  bossEvery: 5,
  bosses: ['queen', 'mafia', 'federer'] as readonly BossType[],
  /** Cats that come with an endless boss, before growth. */
  bossWaveCats: { normal: 5, kamikaze: 2 } as WaveDef,
} as const;

function scaled(def: WaveDef, growth: number): WaveDef {
  const result: WaveDef = {};
  for (const [type, count] of Object.entries(def) as Array<[EnemyType, number]>) {
    result[type] = Math.ceil(count * growth);
  }
  return result;
}

/** 1-based wave number. Past the campaign table it follows the ENDLESS rules. */
export function getWave(n: number): WaveDef {
  if (n <= WAVES.length) return WAVES[n - 1]!;

  const sinceCampaign = n - FINAL_WAVE; // 1 = the first endless wave
  const growth = 1 + ENDLESS.growthPerWave * sinceCampaign;
  if (sinceCampaign % ENDLESS.bossEvery === 0) {
    const turn = sinceCampaign / ENDLESS.bossEvery - 1;
    const boss = ENDLESS.bosses[turn % ENDLESS.bosses.length]!;
    const wave = scaled(ENDLESS.bossWaveCats, growth);
    wave[boss] = 1;
    return wave;
  }
  return scaled(WAVES[WAVES.length - 2]!, growth);
}
