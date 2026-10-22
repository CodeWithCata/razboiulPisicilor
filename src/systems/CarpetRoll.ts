/** @file The queen's red carpet attack as a real carpet: it rolls out over a band of floor during the warning (`rollCarpet`) and slams down solid when it strikes (`carpetStrike`). Plush red with a diamond pattern and gold trim. Visual only. */
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { CARPET_FX as FX } from '../config/animation';
import { telegraphDepth, type Telegraph } from './Telegraph';

interface Band {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The carpet pieces of one band: the plush body, gold trim along both long edges, and (while rolling) the roll at the leading edge. */
function build(scene: Phaser.Scene, r: Band, depth: number, withRoll: boolean) {
  const w = r.x2 - r.x1;
  const h = r.y2 - r.y1;
  const horizontal = w >= h;
  const body = scene.add.tileSprite(r.x1, r.y1, w, h, Tex.FxCarpetTile).setOrigin(0).setDepth(depth);
  const navy = [scene.add.rectangle(r.x1, r.y1, 10, 10, FX.navy).setOrigin(0).setDepth(depth + 0.01), scene.add.rectangle(r.x1, r.y1, 10, 10, FX.navy).setOrigin(0).setDepth(depth + 0.01)];
  const gold = [scene.add.rectangle(r.x1, r.y1, 10, 10, FX.gold).setOrigin(0).setDepth(depth + 0.02), scene.add.rectangle(r.x1, r.y1, 10, 10, FX.gold).setOrigin(0).setDepth(depth + 0.02)];
  const roll = withRoll ? scene.add.rectangle(r.x1, r.y1, 10, 10, FX.rollColor).setOrigin(0).setStrokeStyle(3, FX.navy, 1).setDepth(depth + 0.03) : null;
  const rollGold = withRoll ? scene.add.rectangle(r.x1, r.y1, 10, 10, FX.gold).setOrigin(0).setDepth(depth + 0.04) : null;
  const all: Phaser.GameObjects.GameObject[] = [body, ...navy, ...gold];
  if (roll && rollGold) all.push(roll, rollGold);

  /** Lay the carpet out over the first `k` (0..1) of its length. */
  const place = (k: number): void => {
    const len = Math.max(2, (horizontal ? w : h) * k);
    const t = FX.trimPx;
    if (horizontal) {
      body.setSize(len, h);
      navy[0]!.setPosition(r.x1, r.y1).setDisplaySize(len, t);
      navy[1]!.setPosition(r.x1, r.y2 - t).setDisplaySize(len, t);
      gold[0]!.setPosition(r.x1, r.y1 + 2).setDisplaySize(len, t - 4);
      gold[1]!.setPosition(r.x1, r.y2 - t + 2).setDisplaySize(len, t - 4);
      roll?.setPosition(r.x1 + len - FX.rollPx, r.y1).setDisplaySize(FX.rollPx, h);
      rollGold?.setPosition(r.x1 + len - FX.rollPx / 2 - 2, r.y1 + t).setDisplaySize(4, h - t * 2);
    } else {
      body.setSize(w, len);
      navy[0]!.setPosition(r.x1, r.y1).setDisplaySize(t, len);
      navy[1]!.setPosition(r.x2 - t, r.y1).setDisplaySize(t, len);
      gold[0]!.setPosition(r.x1 + 2, r.y1).setDisplaySize(t - 4, len);
      gold[1]!.setPosition(r.x2 - t + 2, r.y1).setDisplaySize(t - 4, len);
      roll?.setPosition(r.x1, r.y1 + len - FX.rollPx).setDisplaySize(w, FX.rollPx);
      rollGold?.setPosition(r.x1 + t, r.y1 + len - FX.rollPx / 2 - 2).setDisplaySize(w - t * 2, 4);
    }
  };
  place(1);
  return { all, place, setAlpha: (a: number) => all.forEach((o) => (o as Phaser.GameObjects.Image).setAlpha(a)), destroy: () => all.forEach((o) => o.destroy()) };
}

/** The warning: a carpet unrolls across the band in `ms`, a little see-through, with the roll at its tip. */
export function rollCarpet(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, ms: number): Telegraph {
  const c = build(scene, { x1, y1, x2, y2 }, telegraphDepth.value, true);
  c.setAlpha(FX.warnAlpha);
  const state = { k: 0.02 };
  c.place(state.k);
  const tween = scene.tweens.add({
    targets: state, k: 1, duration: ms, ease: 'Sine.easeInOut',
    onUpdate: () => c.place(state.k),
    onComplete: () => c.destroy(),
  });
  return { destroy: () => { tween.remove(); c.destroy(); } };
}

/** The strike: the carpet is solid for a moment, with a white flash, then fades away. */
export function carpetStrike(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, fadeMs: number): void {
  const depth = telegraphDepth.value + 1;
  const c = build(scene, { x1, y1, x2, y2 }, depth, false);
  const flash = scene.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1, 0xffffff, FX.flashAlpha).setDepth(depth + 0.1);
  scene.tweens.add({ targets: flash, alpha: 0, duration: FX.flashMs, onComplete: () => flash.destroy() });
  const fade = { a: 1 };
  scene.tweens.add({
    targets: fade, a: 0, delay: FX.holdMs, duration: fadeMs, ease: 'Sine.easeIn',
    onUpdate: () => c.setAlpha(fade.a),
    onComplete: () => c.destroy(),
  });
}
