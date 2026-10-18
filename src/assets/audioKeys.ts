/** Every sound effect id. Each one has a synthesized placeholder (systems/audio/sounds.ts). */
export const SOUND_IDS = [
  'swing', 'hit', 'miau', 'kill', 'hurt', 'pickup', 'bonk', 'caw',
  'explosion', 'deflect', 'stun', 'bossIntro', 'waveStart', 'victory', 'gameOver',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

export const MUSIC_IDS = ['menu', 'fight'] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

/** Phaser cache keys for real audio files. A sound with several files gets one key per file. */
export const sfxKey = (id: SoundId, variant: number): string => `sfx:${id}:${variant}`;
export const musicKey = (id: MusicId): string => `music:${id}`;
