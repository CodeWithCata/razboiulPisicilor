import { Tex, type PhotoId, type TexKey } from './keys';

/**
 * SWAPPING PLACEHOLDERS FOR REAL ART:
 *  1. Drop your transparent PNG into  public/assets/
 *  2. Add its line below.
 * Any key without a file keeps its generated placeholder.
 * Sprites must face UP; the game rotates them in code.
 *
 * Only the SCENE is real art so far (built from art-source/ by scripts/build-scene-art.py).
 * Cats, bosses, Varu, projectiles and pickups are drawn in code on purpose (assets/placeholders.ts).
 *
 * Example:
 *   [Tex.Varu]: 'assets/varu.png',
 */
export const IMAGE_MANIFEST: Partial<Record<TexKey, string>> = {
  [Tex.Grass]: 'assets/grass.png', // seamless 256x256: menu backgrounds and the arena backdrop
  [Tex.CampusText]: 'assets/campus_text.png', // the "Campus!" dirt lettering, drawn once on the arena grass
  [Tex.Tileset]: 'assets/arena_tiles.png', // planks, fence, decorations (tile ids: config/arena.ts)
  [Tex.PickupCrow]: 'assets/pickup_crow.png', // the crow power-up (Crow Rain): the club logo
};

/**
 * FRIEND PHOTOS (boss intro cards, game over screen, ending):
 *  1. Drop the PNG/JPG into  public/assets/photos/
 *  2. Add its line below. Without a file the slot shows a silhouette labeled "FOTO".
 * Any aspect ratio works, the photo is fitted into the frame. The captions are in content/jokes.ts.
 *
 * Example:
 *   queen: 'assets/photos/ana.png',
 *   ending: 'assets/photos/toti.png',
 */
export const PHOTO_MANIFEST: Partial<Record<PhotoId, string>> = {};
