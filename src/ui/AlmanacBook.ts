/** @file The almanac's picture as a game object (`addAlmanacBook`) and the main menu's almanac button built from it (`createAlmanacButton`): the book sways, sparkles twinkle, a pill shows how many entries were found. */
import Phaser from 'phaser';
import { ALMANAC_BOOK_ART, drawAlmanacBody, drawAlmanacFlap, drawAlmanacSpine, drawSparkle } from '../assets/art/almanacBook';
import { ALMANAC_MENU } from '../config/almanac';
import { MENU } from '../config/menu';
import { COLORS, FONT } from '../config/style';

/** The middle (art pixel row) of the cover flap, which spans y 8 to 86. */
const FLAP_MIDDLE_Y = 47;

/** The book as a game object: `root` is a container whose middle is the middle of the book; `setOpen(0..1)` swings the cover open (0 = closed, 1 = open, a little past 1 is fine). */
export interface AlmanacBookView {
  root: Phaser.GameObjects.Container;
  setOpen(open: number): void;
}

/**
 * The book, `height` px tall, in three pieces: the body (pages, back cover, a first page with mini cards), the spine and the cover flap. The flap is
 * drawn twice, its green outside and its pale inside; opening scales it sideways round the spine, and when it passes the edge-on moment the
 * inside face takes over. The whole book slides a little to the right while it opens, so the open book stays where the closed one was.
 */
export function createAlmanacBook(scene: Phaser.Scene, x: number, y: number, height: number): AlmanacBookView {
  const A = ALMANAC_BOOK_ART;
  const k = height / A.h;
  const baseX = -A.cx * k;

  const body = scene.add.graphics();
  drawAlmanacBody(body);
  const spine = scene.add.graphics();
  drawAlmanacSpine(spine);
  const outside = scene.add.graphics().setPosition(A.hinge, 0);
  drawAlmanacFlap(outside, false);
  const inside = scene.add.graphics().setPosition(A.hinge, 0).setVisible(false);
  drawAlmanacFlap(inside, true);

  const art = scene.add.container(baseX, -A.cy * k, [body, spine, outside, inside]).setScale(k);
  const root = scene.add.container(x, y, [art]);

  const O = ALMANAC_MENU.open;
  const setOpen = (open: number): void => {
    const sx = 1 - open * (1 - O.endScale);
    const sy = 1 - O.dip * Math.sin(Math.min(1, Math.max(0, open)) * Math.PI); // the cover tips toward the viewer a little on its way
    const py = (1 - sy) * FLAP_MIDDLE_Y; // tips round the cover's own middle, not round the top of the picture
    outside.setPosition(A.hinge, py).setScale(sx, sy).setVisible(sx > 0);
    inside.setPosition(A.hinge, py).setScale(sx, sy).setVisible(sx <= 0);
    art.x = baseX + open * O.shift * k;
  };
  setOpen(0);
  return { root, setOpen };
}

/** A closed book, `height` px tall, for places where it never opens (the almanac screen's title). */
export const addAlmanacBook = (scene: Phaser.Scene, x: number, y: number, height: number): Phaser.GameObjects.Container => createAlmanacBook(scene, x, y, height).root;

export interface AlmanacButtonOptions {
  x: number;
  y: number;
  bookH: number;
  size: number;
  label: string;
  found: number;
  total: number;
  /** The cover swings open while the pointer is over the button (desktop; a phone has no hover). */
  hoverOpen: boolean;
}

const labelHeight = (size: number): number => Math.round(size * 1.25);

/** Whole height of the button: the book plus the name under it (the spacing under the button uses this). */
export const almanacButtonHeight = (bookH: number, size: number): number => bookH + ALMANAC_MENU.labelGap + labelHeight(size);

/**
 * The container's middle is the middle of book + name together. The scene decides what a tap does (it checks the container is under the pointer).
 * A cat-face book says "this is the cat book" at a glance; the pill says how far along the player is (gold; green when everything is found).
 */
export function createAlmanacButton(scene: Phaser.Scene, o: AlmanacButtonOptions): Phaser.GameObjects.Container {
  const M = ALMANAC_MENU;
  const total = almanacButtonHeight(o.bookH, o.size);
  const bookCy = -total / 2 + o.bookH / 2;
  const bookW = (ALMANAC_BOOK_ART.w / ALMANAC_BOOK_ART.h) * o.bookH;

  const view = createAlmanacBook(scene, 0, bookCy, o.bookH);
  const book = view.root;
  const items: Phaser.GameObjects.GameObject[] = [book];

  // Idle life: the book sways and bobs, two sparkles twinkle.
  book.setAngle(-M.bob.deg);
  scene.tweens.add({ targets: book, angle: M.bob.deg, duration: M.bob.swayMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: book, y: bookCy - M.bob.px, duration: M.bob.bobMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  for (const s of M.sparkles) {
    const star = scene.add.graphics();
    drawSparkle(star);
    star.setPosition(s.x * o.bookH, bookCy + s.y * o.bookH).setScale(0).setAngle(0);
    items.push(star);
    scene.tweens.add({ targets: star, scale: s.scale, angle: 45, duration: M.sparkleMs, delay: s.delayMs, yoyo: true, repeat: -1, repeatDelay: M.sparkleMs * 0.6, ease: 'Sine.easeInOut' });
  }

  // The name under the book.
  items.push(
    scene.add
      .text(0, total / 2 - labelHeight(o.size) / 2, o.label, { fontFamily: FONT, fontSize: `${o.size}px`, color: '#fff3d6', stroke: '#1b2340', strokeThickness: 5 })
      .setOrigin(0.5),
  );

  // The pill: how many entries were found.
  const P = M.pill;
  const done = o.found >= o.total;
  const px = bookW / 2 - 2;
  const py = bookCy + o.bookH / 2 - 14;
  const pill = scene.add.graphics();
  pill.fillStyle(P.color, 1).fillRoundedRect(px - P.w / 2, py - P.h / 2, P.w, P.h, P.h / 2);
  pill.lineStyle(P.border, done ? COLORS.gold : 0x4a5275, 1).strokeRoundedRect(px - P.w / 2, py - P.h / 2, P.w, P.h, P.h / 2);
  items.push(pill);
  items.push(scene.add.text(px, py + 1, `${o.found}/${o.total}`, { fontFamily: FONT, fontSize: `${P.size}px`, color: done ? P.doneColor : P.textColor }).setOrigin(0.5));

  const button = scene.add.container(o.x, o.y, items).setDepth(MENU.button.depth);
  button.setSize(M.hitW, total).setInteractive({ useHandCursor: true });
  const pop = (scale: number): void => {
    scene.tweens.add({ targets: button, scale, duration: MENU.button.hoverMs, ease: 'Sine.easeOut' });
  };
  // Hover (desktop): the cover swings open, the sparkles get brighter; off the button it closes again.
  const state = { open: 0 };
  let swing: Phaser.Tweens.Tween | null = null;
  const openTo = (target: 0 | 1): void => {
    swing?.stop();
    swing = scene.tweens.add({
      targets: state,
      open: target,
      duration: target ? M.open.ms : M.open.closeMs,
      ease: target ? 'Back.easeOut' : 'Sine.easeInOut',
      onUpdate: () => view.setOpen(state.open),
    });
  };
  button.on('pointerover', () => {
    pop(MENU.button.hoverScale);
    if (o.hoverOpen) openTo(1);
  });
  button.on('pointerout', () => {
    pop(1);
    if (o.hoverOpen) openTo(0);
  });
  return button;
}
