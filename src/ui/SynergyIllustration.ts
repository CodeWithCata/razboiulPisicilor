/** @file The little looping picture at the top of the synergy card: the same mini arena as the upgrade cards, but each scene plays BOTH fused upgrades together (a wide spin, a thrown cat and a huge buckle, a quick beat ending in a heavy finisher, a weak-point window, a cowboy's long throw). Drawn in code, redrawn from the scene's clock. */
import type Phaser from 'phaser';
import { UPGRADE_ART as A } from '../config/beltUpgradeArt';
import type { BeltSynergyId } from '../config/beltSynergies';
import { COLORS } from '../config/style';
import { beat, drawBelt, drawBurst, drawCat, drawDashedArc, drawFlyingCat, drawHat, drawRecharge, drawStage, drawStar, drawSwish, drawTarget, drawVaru, easeInOut, easeOut, lerp } from './upgradeArt';

const TAU = Math.PI * 2;

type G = Phaser.GameObjects.Graphics;

/**
 * One looping synergy scene on its own Graphics, the twin of `UpgradeIllustration`. `update(timeMs)` redraws it for that moment (the loop
 * length is `UPGRADE_ART.synergyLoopMs`). Plain numbers only, nothing new is made per frame. `view` is already placed at the stage's middle.
 */
export class SynergyIllustration {
  readonly view: Phaser.GameObjects.Graphics;
  private readonly loopMs: number;

  /** `middleY` = the stage's middle, measured from the card's middle (the card's own origin). */
  constructor(scene: Phaser.Scene, private readonly id: BeltSynergyId, middleY: number) {
    this.view = scene.add.graphics().setPosition(0, middleY);
    this.loopMs = A.synergyLoopMs[id];
  }

  update(timeMs: number): void {
    const p = (timeMs % this.loopMs) / this.loopMs;
    const g = this.view.clear();
    drawStage(g);
    switch (this.id) {
      case 'cyclone':
        this.cyclone(g, p);
        break;
      case 'bombard':
        this.bombard(g, p);
        break;
      case 'ironBeat':
        this.ironBeat(g, p);
        break;
      case 'eagleEye':
        this.eagleEye(g, p);
        break;
      case 'cowboy':
        this.cowboy(g, p);
        break;
    }
  }

  destroy(): void {
    this.view.destroy();
  }

  /** Long belt + tornado: a dashed ring marks the old spin, the belt stretches past it, spins twice and flings the cats out; the recharge ring fills. */
  private cyclone(g: G, p: number): void {
    const C = A.synergy.cyclone;
    const grow = easeOut(beat(p, 0, C.growEnd));
    const spin = beat(p, C.growEnd, C.spinEnd);
    const home = easeInOut(beat(p, C.back, 0.95)); // 0 = out, 1 = back to the old size
    const angle = -Math.PI / 2 + C.turns * TAU * easeInOut(spin);
    const length = lerp(C.oldR, C.longR, grow * (1 - home));
    const push = easeOut(beat(p, C.growEnd + 0.04, C.spinEnd)) * (1 - home);
    const dist = C.catDist + C.fling * push;
    drawDashedArc(g, 0, C.y, C.oldR, 0, TAU, C.dash, 0.7); // the old spin
    for (let i = 0; i < C.cats; i++) {
      const a = Math.PI / 4 + (i / C.cats) * TAU;
      drawCat(g, Math.cos(a) * dist, C.y + Math.sin(a) * dist * C.catSquash, C.catR, 1, 1, 0, push > 0.5);
    }
    drawVaru(g, 0, C.y);
    if (spin > 0 && spin < 1) {
      drawSwish(g, 0, C.y, length, angle - 1.3, angle, 0.5);
      drawSwish(g, 0, C.y, length, angle - 2.5, angle - 1.3, 0.25);
    }
    drawBelt(g, 0, C.y, angle, length, C.buckleR);
    const R = A.tornado.ringBox;
    drawRecharge(g, R.x, R.y, R.r, R.width, (p * C.fills) % 1);
  }

  /** Heavy buckle + knockback: a huge buckle and a huge burst, and the cat flies far past the dashed old distance. */
  private bombard(g: G, p: number): void {
    const B = A.synergy.bombard;
    const swing = beat(p, 0, B.hitAt);
    const fly = beat(p, B.hitAt, B.flyEnd);
    const back = beat(p, B.backFrom, B.backTo);
    const reach = B.catX - B.varuX - A.catR;
    const angle = back > 0 ? lerp(0, B.from, easeInOut(back)) : lerp(B.from, 0, easeOut(swing));
    // The old distance: a dashed line with a pale ghost cat on it.
    g.lineStyle(2, A.colors.ghost, 0.6);
    for (let y = B.y - 36; y < B.y + 34; y += 10) g.lineBetween(B.ghostX, y, B.ghostX, y + 5);
    g.lineStyle(2, A.colors.ghost, 0.45).strokeCircle(B.ghostX + 14, B.y, A.catR);
    const grow = easeOut(beat(p, 0, 0.08)) * (1 - beat(p, B.fade, 1));
    drawFlyingCat(g, B.catX, B.landX, B.y, fly, grow, B, fly > 0 && fly < B.flash ? 1 : 0);
    drawVaru(g, B.varuX, B.y);
    if (swing > 0.02 && back < 0.98) {
      const wave = 0.5 + 0.5 * Math.sin(p * TAU * 6);
      g.fillStyle(A.colors.buckle, 0.25 + 0.2 * wave).fillCircle(B.varuX + Math.cos(angle) * reach, B.y + Math.sin(angle) * reach, B.glowR);
    }
    drawSwish(g, B.varuX, B.y, reach, B.from, angle, swing > 0 && back === 0 ? 0.6 : 0);
    drawBelt(g, B.varuX, B.y, angle, reach, B.buckleR);
    drawBurst(g, B.catX - 4, B.y, B.burstMax, B.rays, beat(p, B.hitAt, B.hitAt + 0.18));
    if (p >= B.flyEnd) {
      const t = beat(p, B.flyEnd, B.fade);
      drawBurst(g, B.landX, B.y, B.landBurst, B.landRays, beat(p, B.flyEnd, B.flyEnd + 0.15));
      for (let i = 0; i < B.stars; i++) drawStar(g, B.landX - 10 + i * 10, B.y - A.catR - 5 - Math.sin(i + p * 40) * 2, 4, 1 - t);
    }
  }

  /** Quick hand + heavy buckle: three quick swings (a tick lights for each), then a big wind-up and a heavy finisher that dazes the cat. */
  private ironBeat(g: G, p: number): void {
    const I = A.synergy.ironBeat;
    const last = I.starts.length - 1;
    const bigStart = I.starts[last] ?? 0;
    let angle: number = I.from;
    let swishAlpha = 0;
    let hits = 0;
    let hitT = 1; // progress of the pop of the latest hit (1 = none going on)
    let big = false; // is that hit the finisher?
    for (let i = 0; i <= last; i++) {
      const start = I.starts[i] ?? 0;
      const finisher = i === last;
      const len = finisher ? I.bigLen : I.swingLen;
      const t = beat(p, start, start + len);
      if (p >= start) angle = lerp(finisher ? I.bigFrom : I.from, finisher ? I.bigTo : I.to, easeOut(t));
      if (t > 0 && t < 1) swishAlpha = finisher ? 0.7 : 0.5;
      if (p >= start + len) hits = i + 1;
      const ht = beat(p, start + len, start + len + (finisher ? 0.3 : 0.1));
      if (ht > 0 && ht < 1) {
        hitT = ht;
        big = finisher;
      }
    }
    const back = beat(p, I.restBack, I.restBack + 0.12);
    if (back > 0) angle = lerp(I.bigTo, I.from, easeInOut(back));
    const heavy = p >= bigStart - 0.02 && back < 1; // the finisher's buckle is bigger
    const catX = I.varuX + I.reach * 0.97;
    const squash = hitT < 1 ? (1 - hitT) * (big ? 1.4 : 1) : 0;
    const dazed = p > bigStart + I.bigLen + I.dazedAfter && p < I.dazedEnd;
    drawCat(g, catX, I.y, A.catR, 1 + 0.3 * squash, 1 - 0.25 * squash, hitT < (big ? 0.3 : 0.25) ? 1 : 0, dazed);
    if (dazed) {
      const spin = p * TAU * I.starSpin;
      const fade = p > I.dazedEnd - 0.12 ? (I.dazedEnd - p) / 0.12 : 1;
      for (let i = 0; i < I.stars; i++) {
        const a = spin + (i / I.stars) * TAU;
        drawStar(g, catX + Math.cos(a) * (A.catR + 6), I.y - A.catR - 3 + Math.sin(a) * 4, I.starR, fade);
      }
    }
    if (swishAlpha > 0) {
      g.lineStyle(3, A.colors.trail, 0.6);
      for (let i = 0; i < I.speedLines; i++) {
        const ly = I.y - 10 + i * 10;
        const len = 14 + ((i * 7) % 9) + 4 * Math.sin(p * 90 + i);
        g.lineBetween(I.varuX - 22, ly, I.varuX - 22 - len, ly);
      }
    }
    drawVaru(g, I.varuX, I.y);
    if (heavy && swishAlpha > 0) {
      const wave = 0.5 + 0.5 * Math.sin(p * TAU * 6);
      g.fillStyle(A.colors.buckle, 0.25 + 0.2 * wave).fillCircle(I.varuX + Math.cos(angle) * I.reach, I.y + Math.sin(angle) * I.reach, I.glowR);
    }
    drawSwish(g, I.varuX, I.y, I.reach, I.from, angle, swishAlpha);
    drawBelt(g, I.varuX, I.y, angle, I.reach, heavy ? I.bigBuckle : I.buckleR);
    drawBurst(g, catX - 4, I.y, big ? I.bigBurst : I.burstMax, big ? I.bigRays : I.rays, hitT);
    // One tick per swing: the last one is the big finisher.
    for (let i = 0; i <= last; i++) {
      const tx = (i - last / 2) * I.tickGap;
      const r = i === last ? I.bigTickR : I.tickR;
      g.fillStyle(i < hits ? A.colors.buckle : A.colors.plate, i < hits ? 1 : 0.55).fillCircle(tx, I.tickY, r);
      g.lineStyle(2, COLORS.navy, 1).strokeCircle(tx, I.tickY, r);
    }
  }

  /** Quick hand + tornado: a boss shows a weak point, a bar shows the window staying open past the gold mark (where the old window ended), and quick swings still land. */
  private eagleEye(g: G, p: number): void {
    const E = A.synergy.eagleEye;
    const open = beat(p, E.openAt, E.closeAt); // how much of the window has passed
    const showing = p >= E.openAt && p < E.closeAt;
    const fade = showing ? Math.min(1, (p - E.openAt) / E.fadeSpan, (E.closeAt - p) / E.fadeSpan) : 0;
    let angle: number = E.from;
    let swishAlpha = 0;
    let hitT = 1;
    for (let i = 0; i < E.swings.length; i++) {
      const start = E.swings[i] ?? 0;
      const t = beat(p, start, start + E.swingLen);
      if (p >= start) angle = lerp(E.from, E.to, easeOut(t));
      if (t > 0 && t < 1) swishAlpha = 0.55;
      const ht = beat(p, start + E.swingLen, start + E.swingLen + 0.12);
      if (ht > 0 && ht < 1) hitT = ht;
    }
    const back = beat(p, E.restBack, E.restBack + 0.12);
    if (back > 0) angle = lerp(E.to, E.from, easeInOut(back));
    const weakX = E.bossX + E.weakDx;
    const weakY = E.y + E.weakDy;
    drawCat(g, E.bossX, E.y, E.bossR, 1, 1, hitT < 0.2 ? 1 : 0);
    drawTarget(g, weakX, weakY, E.weakR * (1 + E.pulse * Math.sin(p * TAU * E.pulseTurns)), fade);
    drawVaru(g, E.varuX, E.y);
    drawSwish(g, E.varuX, E.y, E.reach, E.from, angle, swishAlpha);
    drawBelt(g, E.varuX, E.y, angle, E.reach, 5);
    drawBurst(g, weakX - 2, weakY, E.burstMax, E.rays, hitT);
    // The window bar: it empties while the window is open, and the gold mark shows where the old, shorter window would have closed.
    const B = E.bar;
    const left = -B.w / 2;
    g.fillStyle(A.colors.plate, 0.75).fillRoundedRect(left, B.y, B.w, B.h, 4);
    const inner = B.w - 4;
    const remain = showing ? 1 - open : 0;
    if (remain > 0) g.fillStyle(A.colors.ok, 1).fillRect(left + 2, B.y + 2, inner * remain, B.h - 4);
    g.lineStyle(2, COLORS.navy, 1).strokeRoundedRect(left, B.y, B.w, B.h, 4);
    const markX = left + 2 + inner * (1 - E.oldShare);
    g.lineStyle(3, A.colors.buckle, 0.9).lineBetween(markX, B.y - 4, markX, B.y + B.h + 4);
    const R = A.tornado.ringBox;
    drawRecharge(g, R.x, R.y, R.r, R.width, (p * E.fills) % 1);
  }

  /** Long belt + knockback: Varu in a cowboy hat stretches the belt far past the dashed old reach, hits a far cat, and it flies even farther. */
  private cowboy(g: G, p: number): void {
    const W = A.synergy.cowboy;
    const grow = beat(p, 0, W.growEnd);
    const swing = beat(p, W.growEnd, W.hitAt);
    const fly = beat(p, W.hitAt, W.flyEnd);
    const back = beat(p, W.backFrom, W.backTo);
    const reach = lerp(lerp(W.shortReach, W.longReach, easeOut(grow)), W.shortReach, easeInOut(back));
    const angle = back > 0 ? lerp(0, W.from, easeInOut(back)) : lerp(W.from, 0, easeOut(swing));
    const catX = W.varuX + W.longReach + A.catR;
    drawDashedArc(g, W.varuX, W.y, W.shortReach, -1.3, 0.5, W.dash, 0.7); // the old reach
    const catGrow = easeOut(beat(p, 0, 0.08)) * (1 - beat(p, W.fade, 1));
    drawFlyingCat(g, catX, W.landX, W.y, fly, catGrow, W, fly > 0 && fly < W.flash ? 1 : 0);
    drawVaru(g, W.varuX, W.y);
    drawHat(g, W.varuX, W.y);
    if (grow > 0 && grow < 1) {
      // A gold arrow from the old reach to the new one while the belt grows.
      const ax = W.varuX + reach;
      const ay = W.y + 20;
      g.lineStyle(3, A.colors.buckle, 0.9).lineBetween(W.varuX + W.shortReach, ay, ax - 4, ay);
      g.fillStyle(A.colors.buckle, 0.9).fillTriangle(ax + 5, ay, ax - 4, ay - 5, ax - 4, ay + 5);
    }
    drawSwish(g, W.varuX, W.y, reach, W.from, angle, swing > 0 && back === 0 ? 0.5 : 0);
    drawBelt(g, W.varuX, W.y, angle, reach, W.buckleR);
    drawBurst(g, catX - 6, W.y, W.burstMax, W.rays, beat(p, W.hitAt, W.hitAt + 0.15));
    if (p >= W.flyEnd) {
      const t = beat(p, W.flyEnd, W.fade);
      drawBurst(g, W.landX, W.y, W.landBurst, W.landRays, beat(p, W.flyEnd, W.flyEnd + 0.15));
      for (let i = 0; i < W.stars; i++) drawStar(g, W.landX - 10 + i * 10, W.y - A.catR - 5 - Math.sin(i + p * 40) * 2, 4, 1 - t);
    }
  }
}
