/** @file Loads real assets from the manifests, waits for the font, fills gaps with placeholders, starts the menu. */
import Phaser from 'phaser';
import { musicKey, sfxKey, type MusicId, type SoundId } from '../assets/audioKeys';
import { AUDIO_MANIFEST, MUSIC_MANIFEST } from '../assets/audioManifest';
import { photoKey, type PhotoId } from '../assets/keys';
import { adoptLoadedImage } from '../assets/atlas';
import { ATLAS_IMAGES, IMAGE_MANIFEST, PHOTO_MANIFEST } from '../assets/manifest';
import { generatePlaceholders } from '../assets/placeholders';
import { loadGameFont } from '../core/fonts';
import { AudioSystem } from '../systems/AudioSystem';
import { ArenaMap } from '../world/ArenaMap';

/**
 * Loads everything real that is listed in the manifests (art, photos, sounds, music, the Tiled map),
 * then fills every gap with a placeholder. Anything missing just keeps its placeholder.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const [key, path] of Object.entries(IMAGE_MANIFEST)) this.load.image(key, path);
    for (const id of Object.keys(PHOTO_MANIFEST) as PhotoId[]) {
      const path = PHOTO_MANIFEST[id];
      if (path) this.load.image(photoKey(id), path);
    }

    for (const id of Object.keys(AUDIO_MANIFEST) as SoundId[]) {
      (AUDIO_MANIFEST[id] ?? []).forEach((path, i) => this.load.audio(sfxKey(id, i), path));
    }
    for (const id of Object.keys(MUSIC_MANIFEST) as MusicId[]) {
      const path = MUSIC_MANIFEST[id];
      if (path) this.load.audio(musicKey(id), path);
    }

    ArenaMap.preload(this);
  }

  create(): void {
    for (const key of ATLAS_IMAGES) adoptLoadedImage(this, key); // real small images join the atlas pages (one texture switch less per crow pickup)
    generatePlaceholders(this);
    new AudioSystem(this.game); // lives as long as the game, so the music carries across scenes
    // The font must be ready before any text is drawn (it never blocks for long: see FONT_LOADING).
    void loadGameFont().then(() => this.scene.start('MenuScene'));
  }
}
