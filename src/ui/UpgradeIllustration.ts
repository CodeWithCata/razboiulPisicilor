/** @file The little looping picture at the top of a belt upgrade card: a mini top-down arena where Varu's belt does what the upgrade gives (a heavy hit, a longer reach, three quick swings, a spin that flings cats, a cat thrown far). Drawn in code, redrawn from the scene's clock. */
import type Phaser from 'phaser';
import { UPGRADE_ART as A } from '../config/beltUpgradeArt';
import type { BeltUpgradeId } from '../config/beltUpgrades';
import { COLORS } from '../config/style';
import { beat, drawBelt, drawBurst, drawCat, drawDashedArc, drawFlyingCat, drawRecharge, drawStage, drawStar, drawSwish, drawVaru, easeInOut, easeOut, lerp } from './upgradeArt';

const TAU = Math.PI * 2;

/**
 * One looping scene on its own Graphics. `update(timeMs)` redraws it for that moment (the loop length is `UPGRADE_ART.loopMs`). It is drawn
 * with plain numbers only (no new objects per frame). The card puts `view` inside its container; `view` is already placed at the stage's middle.
 */
export class UpgradeIllustration {
  readonly view: Phaser.GameObjects.Graphics;
  private readonly loopMs: number;

  /** `middleY` = the stage's middle, measured from the card's middle (the card's own origin). */
  constructor(scene: Phaser.Scene, private readonly id: BeltUpgradeId, middleY: number) {
    this.view = scene.add.graphics().setPosition(0, middleY);
    this.loopMs = A.loopMs[id];
  }

  update(timeMs: number): void {
    const p = (timeMs % this.loopMs) / this.loopMs;
    const g = this.view.clear();
    drawStage(g);
    switch (this.id) {
      case 'heavy':
        this.heavy(g, p);
        break;
      case 'long':
        this.long(g, p);
        break;
      case 'quick':
        this.quick(g, p);
        break;
      case 'tornado':
        this.tornado(g, p);
        break;
      case 'knock':
        this.knock(g, p);
        break;
    }
  }

  destroy(): void {
    this.view.destroy();
  }

  /** Heavy buckle: one swing, a big gold flash, the cat squashes and sits dazed with stars round its head. */
  private heavy(g: Phaser.GameObjects.Graphics, p: number): void {
    const H = A.heavy;
    const swing = beat(p, 0, H.swingEnd);
    const back = beat(p, H.backFrom, H.backTo);
    const angle = back > 0 ? lerp(0, H.from, easeInOut(back)) : lerp(H.from, 0, easeOut(swing));
    const hit = beat(p, H.swingEnd, H.swingEnd + 0.4);
    const dazed = p > H.swingEnd + 0.12 && p < 0.92;
    const squash = hit > 0 && hit < 1 ? 1 - hit : 0;
    const shake = hit > 0 && hit < 0.5 ? Math.sin(hit * 60) * H.shake * (1 - hit * 2) : 0;
    const catX = H.varuX + H.reach + shake;
    drawCat(g, catX, H.y, A.catR, 1 + 0.35 * squash, 1 - 0.3 * squash, hit > 0 && hit < 0.18 ? 1 : 0, dazed);
    if (dazed) {
      const spin = p * TAU * H.starSpin;
      const fade = p > 0.8 ? (0.92 - p) / 0.12 : 1;
      for (let i = 0; i < H.stars; i++) {
        const a = spin + (i / H.stars) * TAU;
        drawStar(g, catX + Math.cos(a) * (A.catR + 6), H.y - A.catR - 3 + Math.sin(a) * 4, H.starR, fade);
      }
    }
    drawVaru(g, H.varuX, H.y);
    if (swing > 0.02 && back < 0.98) {
      const wave = 0.5 + 0.5 * Math.sin(p * TAU * 6);
      g.fillStyle(A.colors.buckle, 0.25 + 0.2 * wave).fillCircle(H.varuX + Math.cos(angle) * H.reach, H.y + Math.sin(angle) * H.reach, H.glowR);
    }
    drawSwish(g, H.varuX, H.y, H.reach, H.from, angle, swing > 0 && back === 0 ? 0.55 * (1 - swing * 0.3) : 0);
    drawBelt(g, H.varuX, H.y, angle, H.reach, H.buckleR);
    drawBurst(g, catX - 4, H.y, H.burstMax, H.rays, hit);
  }

  /** Long belt: a dashed arc marks the old reach, the belt stretches past it, then reaches a cat the old belt could not. */
  private long(g: Phaser.GameObjects.Graphics, p: number): void {
    const L = A.long;
    const grow = beat(p, 0, L.growEnd);
    const shrink = beat(p, 0.82, 0.95);
    const reach = lerp(lerp(L.shortReach, L.longReach, easeOut(grow)), L.shortReach, easeInOut(shrink));
    const swing = beat(p, L.growEnd, L.swingEnd);
    const back = beat(p, L.backTo, 0.85);
    const angle = back > 0 ? lerp(0, L.from, easeInOut(back)) : lerp(L.from, 0, easeOut(swing));
    const hit = beat(p, L.swingEnd, L.swingEnd + 0.3);
    const catX = L.varuX + L.longReach + (hit > 0 && hit < 1 ? 6 * easeOut(Math.min(1, hit * 2)) * (1 - hit) : 0);
    drawDashedArc(g, L.varuX, L.y, L.shortReach, -1.3, 0.5, L.dash, 0.7); // the old reach
    drawCat(g, catX, L.y, A.catR, 1 + 0.25 * (1 - hit) * (hit > 0 && hit < 1 ? 1 : 0), 1, hit > 0 && hit < 0.15 ? 1 : 0);
    drawVaru(g, L.varuX, L.y);
    if (grow > 0 && grow < 1) {
      // A gold arrow from the old reach to the new one while the belt grows.
      const ax = L.varuX + reach;
      const ay = L.y + 20;
      g.lineStyle(3, A.colors.buckle, 0.9).lineBetween(L.varuX + L.shortReach, ay, ax - 4, ay);
      g.fillStyle(A.colors.buckle, 0.9).fillTriangle(ax + 5, ay, ax - 4, ay - 5, ax - 4, ay + 5);
    }
    drawSwish(g, L.varuX, L.y, reach, L.from, angle, swing > 0 && back === 0 ? 0.5 : 0);
    drawBelt(g, L.varuX, L.y, angle, reach, 6);
    drawBurst(g, catX - 6, L.y, L.burstMax, L.rays, hit);
  }

  /** Quick hand: three swings one right after the other, a tick lights up for each hit, speed lines behind Varu. */
  private quick(g: Phaser.GameObjects.Graphics, p: number): void {
    const Q = A.quick;
    let angle: number = Q.from;
    let swishAlpha = 0;
    let hits = 0;
    let hitT = 1;
    for (let i = 0; i < Q.starts.length; i++) {
      const start = Q.starts[i] ?? 0;
      const t = beat(p, start, start + Q.swingLen);
      if (p >= start) angle = lerp(Q.from, Q.to, easeOut(t));
      if (t > 0 && t < 1) swishAlpha = 0.55;
      if (p >= start + Q.swingLen) hits = i + 1;
      const ht = beat(p, start + Q.swingLen, start + Q.swingLen + 0.12);
      if (ht > 0 && ht < 1) hitT = ht;
    }
    const back = beat(p, Q.restBack, Q.restBack + 0.12);
    if (back > 0) angle = lerp(Q.to, Q.from, easeInOut(back));
    const catX = Q.varuX + Q.reach * 0.97;
    const squash = hitT < 1 ? 1 - hitT : 0;
    drawCat(g, catX, Q.y, A.catR, 1 + 0.3 * squash, 1 - 0.25 * squash, hitT < 0.25 ? 1 : 0);
    // Speed lines behind Varu while he is swinging.
    if (swishAlpha > 0) {
      g.lineStyle(3, A.colors.trail, 0.6);
      for (let i = 0; i < Q.speedLines; i++) {
        const ly = Q.y - 10 + i * 10;
        const len = 14 + ((i * 7) % 9) + 4 * Math.sin(p * 90 + i);
        g.lineBetween(Q.varuX - 22, ly, Q.varuX - 22 - len, ly);
      }
    }
    drawVaru(g, Q.varuX, Q.y);
    drawSwish(g, Q.varuX, Q.y, Q.reach, Q.from, angle, swishAlpha);
    drawBelt(g, Q.varuX, Q.y, angle, Q.reach, 5);
    drawBurst(g, catX - 4, Q.y, Q.burstMax, Q.rays, hitT);
    // One tick per hit.
    for (let i = 0; i < Q.starts.length; i++) {
      const tx = (i - (Q.starts.length - 1) / 2) * Q.tickGap;
      g.fillStyle(i < hits ? A.colors.buckle : 0x14182b, i < hits ? 1 : 0.55).fillCircle(tx, Q.tickY, Q.tickR);
      g.lineStyle(2, COLORS.navy, 1).strokeCircle(tx, Q.tickY, Q.tickR);
    }
  }

  /** Tornado: Varu spins the belt round twice, the cats around him are flung outward, and a ring in the corner fills again and again (the recharge). */
  private tornado(g: Phaser.GameObjects.Graphics, p: number): void {
    const T = A.tornado;
    const spin = beat(p, 0, T.spinEnd);
    const angle = -Math.PI / 2 + T.turns * TAU * easeInOut(spin);
    const push = easeOut(beat(p, 0.12, T.spinEnd)) * (1 - easeInOut(beat(p, T.back, 0.95)));
    const dist = T.ring + T.fling * push;
    for (let i = 0; i < T.cats; i++) {
      const a = Math.PI / 4 + (i / T.cats) * TAU;
      drawCat(g, Math.cos(a) * dist, T.y + Math.sin(a) * dist * 0.78, T.catR, 1, 1, 0, push > 0.5);
    }
    drawVaru(g, 0, T.y);
    const length = T.ring * 0.8;
    if (spin > 0 && spin < 1) {
      drawSwish(g, 0, T.y, length, angle - 1.3, angle, 0.5);
      drawSwish(g, 0, T.y, length, angle - 2.5, angle - 1.3, 0.25);
    }
    drawBelt(g, 0, T.y, angle, length, 5);
    // The recharge ring: it fills `fills` times in one loop, and flashes green when it is full.
    const R = T.ringBox;
    drawRecharge(g, R.x, R.y, R.r, R.width, (p * T.fills) % 1);
  }

  /** Knockback: the cat is hit, flies over a dashed line (the old distance) and lands far away in a puff of stars. */
  private knock(g: Phaser.GameObjects.Graphics, p: number): void {
    const K = A.knock;
    const swing = beat(p, 0, K.hitAt);
    const fly = beat(p, K.hitAt, K.flyEnd);
    const reach = K.catX - K.varuX - A.catR;
    const back = beat(p, 0.4, 0.55);
    const angle = back > 0 ? lerp(0, -0.9, easeInOut(back)) : lerp(-0.9, 0, easeOut(swing));
    // The old distance: a dashed line with a pale ghost cat on it.
    g.lineStyle(2, A.colors.ghost, 0.6);
    for (let y = K.y - 36; y < K.y + 34; y += 10) g.lineBetween(K.ghostX, y, K.ghostX, y + 5);
    g.lineStyle(2, A.colors.ghost, 0.45).strokeCircle(K.ghostX + 14, K.y, A.catR);
    const grow = easeOut(beat(p, 0, 0.08)) * (1 - beat(p, K.fade, 1));
    drawFlyingCat(g, K.catX, K.landX, K.y, fly, grow, K);
    const landed = p >= K.flyEnd;
    drawVaru(g, K.varuX, K.y);
    drawSwish(g, K.varuX, K.y, reach, -0.9, angle, swing > 0 && back === 0 ? 0.5 : 0);
    drawBelt(g, K.varuX, K.y, angle, reach, 5);
    drawBurst(g, K.catX, K.y, 22, 6, beat(p, K.hitAt, K.hitAt + 0.15));
    if (landed) {
      const t = beat(p, K.flyEnd, K.fade);
      drawBurst(g, K.landX, K.y, 24, 8, beat(p, K.flyEnd, K.flyEnd + 0.15));
      for (let i = 0; i < K.stars; i++) drawStar(g, K.landX - 10 + i * 10, K.y - A.catR - 5 - Math.sin(i + p * 40) * 2, 4, 1 - t);
    }
  }
}
