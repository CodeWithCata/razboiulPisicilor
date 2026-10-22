/** @file Texture atlas: packs code-drawn pictures into a few shared canvas pages (one Phaser texture per page, one frame per picture). Ask texArgs(key) / texRef(key) for what to show. */
import Phaser from 'phaser';
import { ATLAS } from '../config/atlas';

/** What to show a picture with: a texture, and the frame in it. `frame` is undefined for a picture that has a texture of its own. */
export interface TexRef {
  key: string;
  frame?: string;
}

/** Draws one picture onto a page (or onto its own canvas) with its top-left corner at (x, y). */
export type Draw = (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
/** Paints one picture with Graphics, the way the placeholder art is written. */
export type Painter = (g: Phaser.GameObjects.Graphics) => void;

export interface Placed {
  page: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Pending {
  scene: Phaser.Scene;
  key: string;
  w: number;
  h: number;
  draw: Draw;
}

interface Page {
  key: string;
  canvas: Phaser.Textures.CanvasTexture;
  /** Where the next picture on the current shelf starts. */
  cursorX: number;
  /** Top of the current shelf, and its height. */
  shelfY: number;
  shelfH: number;
}

/** Frame key -> where it sits. Only atlas frames; pictures on their own texture are not here. */
const placed = new Map<string, Placed>();
/** Keys queued but not packed yet (so hasPicture answers yes for them). */
const queued = new Set<string>();
let pending: Pending[] = [];
const pages: Page[] = [];
const warned = new Set<string>();
let lastScene: Phaser.Scene | null = null;
let tempCount = 0;

/** True when the picture exists already: packed, queued, or loaded / generated under this key. Used to skip a picture that is made already. */
export function hasPicture(scene: Phaser.Scene, key: string): boolean {
  return placed.has(key) || queued.has(key) || scene.textures.exists(key);
}

/** Queues a picture drawn by a draw function. Nothing happens if the picture exists already (a real image loaded under the key wins). Packed by flushPictures(). */
export function queueDrawn(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (hasPicture(scene, key)) return;
  lastScene = scene;
  queued.add(key);
  pending.push({ scene, key, w: Math.ceil(w), h: Math.ceil(h), draw });
}

/** Queues a picture painted with Graphics. */
export function queuePainted(scene: Phaser.Scene, key: string, w: number, h: number, paint: Painter): void {
  const pw = Math.ceil(w);
  const ph = Math.ceil(h);
  queueDrawn(scene, key, pw, ph, (ctx, x, y) => {
    const g = scene.make.graphics({}, false);
    paint(g);
    const temp = `atlas-temp:${tempCount++}`;
    g.generateTexture(temp, pw, ph);
    g.destroy();
    ctx.drawImage(scene.textures.get(temp).getSourceImage() as CanvasImageSource, x, y);
    scene.textures.remove(temp);
  });
}

/** Finds room for a w x h slot on the last page (new shelf, then new page). */
function place(scene: Phaser.Scene, iw: number, ih: number): { page: Page; x: number; y: number } {
  const S = ATLAS.pageSize;
  const last = pages[pages.length - 1];
  if (last) {
    if (last.cursorX + iw <= S && last.shelfY + Math.max(last.shelfH, ih) <= S) {
      const x = last.cursorX;
      last.cursorX += iw;
      last.shelfH = Math.max(last.shelfH, ih);
      return { page: last, x, y: last.shelfY };
    }
    const nextY = last.shelfY + last.shelfH;
    if (iw <= S && nextY + ih <= S) {
      last.shelfY = nextY;
      last.cursorX = iw;
      last.shelfH = ih;
      return { page: last, x: 0, y: nextY };
    }
  }
  const key = `atlas:${pages.length}`;
  const canvas = scene.textures.createCanvas(key, S, S);
  if (!canvas) throw new Error(`[atlas] could not create page ${key}`);
  pages.push({ key, canvas, cursorX: 0, shelfY: 0, shelfH: 0 });
  return place(scene, iw, ih);
}

/**
 * Packs every queued picture and draws it. Tall pictures go first so each shelf wastes little. A picture bigger than a page gets a texture of its own.
 * Each page is uploaded to the GPU once, at the end. Safe to call when nothing is queued.
 */
export function flushPictures(): void {
  if (pending.length === 0) return;
  const work = pending;
  pending = [];
  const queueOrder = new Map<Pending, number>(work.map((item, i) => [item, i]));
  work.sort((a, b) => b.h - a.h);
  const S = ATLAS.pageSize;
  const G = ATLAS.gutter;
  const jobs: Array<{ item: Pending; page: Page; x: number; y: number }> = [];
  for (const item of work) {
    queued.delete(item.key);
    // A picture that does not fit a page with its gap (a page's full width would recurse in place()) keeps a texture of its own.
    if (item.w + G > S || item.h + G > S) {
      const canvas = item.scene.textures.createCanvas(item.key, item.w, item.h);
      if (!canvas) continue;
      item.draw(canvas.getContext(), 0, 0);
      canvas.refresh();
      continue;
    }
    const spot = place(item.scene, item.w + G, item.h + G);
    spot.page.canvas.add(item.key, 0, spot.x, spot.y, item.w, item.h);
    placed.set(item.key, { page: spot.page.key, x: spot.x, y: spot.y, w: item.w, h: item.h });
    jobs.push({ item, page: spot.page, x: spot.x, y: spot.y });
  }
  // Draw in queue order: a picture may copy from one queued before it (the bush variants copy the plain bush).
  jobs.sort((a, b) => queueOrder.get(a.item)! - queueOrder.get(b.item)!);
  const touched = new Set<Page>();
  for (const job of jobs) {
    job.item.draw(job.page.canvas.getContext(), job.x, job.y);
    touched.add(job.page);
  }
  for (const page of touched) page.canvas.refresh();
}

/** Where the picture is: its atlas page and frame, or (for a picture on its own texture) just its key. Packs anything still queued first. */
export function texRef(key: string): TexRef {
  if (pending.length > 0) flushPictures();
  const at = placed.get(key);
  if (at) return { key: at.page, frame: key };
  if (lastScene && !lastScene.textures.exists(key) && !warned.has(key)) {
    warned.add(key);
    console.warn(`[atlas] no picture called "${key}"`);
  }
  return { key };
}

/** The texture and frame arguments for image, sprite, setTexture or tileSprite: `scene.add.image(x, y, ...texArgs(key))`. */
export function texArgs(key: string): [string, string | undefined] {
  const ref = texRef(key);
  return [ref.key, ref.frame];
}

/** A rectangle of an atlas page, to read its pixels back (used when one picture is cut from another). Null for a picture on its own texture. */
export function placedAt(key: string): Placed | null {
  return placed.get(key) ?? null;
}
