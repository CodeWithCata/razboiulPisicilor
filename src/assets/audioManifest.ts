import type { MusicId, SoundId } from './audioKeys';

/**
 * SWAPPING PLACEHOLDER SOUNDS FOR REAL RECORDINGS:
 *  1. Drop the files into  public/assets/audio/  (mp3 or ogg)
 *  2. List them below. A sound with SEVERAL files plays a random one each time
 *     (perfect for "miau" recorded by different friends).
 * Any sound without a file keeps its synthesized placeholder.
 * The "miau" pitch is still randomized a little on top of that.
 *
 * Example:
 *   miau: ['assets/audio/miau_ana.mp3', 'assets/audio/miau_dan.mp3', 'assets/audio/miau_mihai.mp3'],
 *   hit: ['assets/audio/bonk.mp3'],
 */
export const AUDIO_MANIFEST: Partial<Record<SoundId, readonly string[]>> = {};

/** Looping music files (menu and fights). Without a file, a quiet generated loop plays. */
export const MUSIC_MANIFEST: Partial<Record<MusicId, string>> = {};
