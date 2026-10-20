/** @file Spin and throw cooldown badges (also the touch buttons for them). */
import Phaser from 'phaser';
import { poly } from '../assets/paint';
import { GAME, type BeltAttackId } from '../config/balance';
import { BELT_BADGES as B } from '../config/beltBadges';
import { FONT } from '../config/style';
import { TOUCH } from '../config/touch';
import { BELT_LABELS, TOUCH_TEXT } from '../content/lines';
import { usesTouchControls } from '../core/device';
import type { Pt } from '../core/polyClip';

export type BeltSpecial = Exclude<BeltAttackId, 'swing'>;

const DEG = Math.PI / 180;

interface MilkTongue {
  x: number;
  w: number;
  len: number;
}

/** One milk drip show: the tongues and which of them drop a drop (and when). Made fresh each time a badge becomes ready. */
interface Milk {
  tongues: MilkTongue[];
  drops: { tongue: number; delayMs: number }[];
}

interface Badge {
  id: BeltSpecial;
  cx: number;
  cy: number;
  /** How much bigger than the desktop badge it is drawn (touch buttons are bigger, see config/touch.ts). */
  k: number;
  gfx: Phaser.GameObjects.Graphics;
  seconds: Phaser.GameObjects.Text;
  tag?: Phaser.GameObjects.Text;
  totalMs: number;
  remainingMs: number;
  /** The belt is flying (throw only). */
  away: boolean;
  /** Counts down after the badge becomes ready again (drives the pop). */
  popMs: number;
  wasReady: boolean;
  /** Counts down while the milk is dripping. */
  milkMs: number;
  milk?: Milk;
  /** Counts down after a touch tap (the badge squashes). */
  pressMs: number;
}

/**
 * Cooldown badges for the belt specials (HUD, bottom right). On phones they are ALSO the spin and throw buttons:
 * the same badges, drawn bigger at the spots in config/touch.ts (TouchInput does the tapping), with their name under them for a few seconds.
 * A soft glow disc and a thin ring (like the pickups in the arena), the icon in the middle, the key under it.
 * Ready = full gold ring. Recharging = a faint disc, the gold ring filling up clockwise, and the seconds left. Belt away = dashed grey ring.
 * When a badge becomes ready it pops, flashes and sends out a gold ring. Icons are drawn in code like the other placeholders.
 */
export class BeltBadges {
  private readonly badges: Badge[];

  constructor(scene: Phaser.Scene) {
    const touch = usesTouchControls();
    const outer = B.r;
    const lastCx = GAME.width - B.right - outer;
    const deskCy = GAME.height - B.bottom - outer;
    this.badges = B.order.map((id, i) => {
      const spot = touch ? TOUCH.buttons[id] : null;
      const cx = spot ? spot.x : lastCx - (B.order.length - 1 - i) * (outer * 2 + B.gap);
      const cy = spot ? spot.y : deskCy;
      const k = spot ? spot.r / outer : 1;
      const gfx = scene.add.graphics({ x: cx, y: cy });
      const seconds = scene.add
        .text(cx, cy, '', { fontFamily: FONT, fontSize: `${B.seconds.size}px`, color: B.colors.seconds, stroke: B.colors.secondsStroke, strokeThickness: B.seconds.strokeThickness })
        .setOrigin(0.5)
        .setVisible(false);
      const badge: Badge = { id, cx, cy, k, gfx, seconds, totalMs: 1, remainingMs: 0, away: false, popMs: 0, wasReady: true, milkMs: 0, pressMs: 0 };
      // Under the badge: the key on a computer, the name of the button on a phone (it fades after the first seconds of a run).
      badge.tag = scene.add
        .text(0, 0, touch ? TOUCH_TEXT[id] : BELT_LABELS[id].key, { fontFamily: FONT, fontSize: `${B.tag.size}px`, color: B.colors.tagText, stroke: B.colors.tagStroke, strokeThickness: B.tag.strokeThickness })
        .setOrigin(0.5);
      if (touch) scene.tweens.add({ targets: badge.tag, alpha: 0, delay: TOUCH.hintMs, duration: TOUCH.hintFadeMs });
      return badge;
    });
    this.draw();
  }

  /** A special started recharging (durationMs 0 = ready right now). */
  startCooldown(attack: BeltSpecial, durationMs: number): void {
    const b = this.find(attack);
    b.totalMs = Math.max(durationMs, 1);
    b.remainingMs = durationMs;
    b.away = false;
  }

  /** A touch button was tapped: the badge squashes for a moment, ready or not. */
  press(attack: BeltSpecial): void {
    this.find(attack).pressMs = B.press.ms;
  }

  /** The belt left Varu's hand: the throw badge goes dashed until it is caught. */
  beltAway(): void {
    this.find('throw').away = true;
  }

  update(delta: number): void {
    for (const b of this.badges) {
      b.remainingMs = Math.max(0, b.remainingMs - delta);
      b.popMs = Math.max(0, b.popMs - delta);
      b.pressMs = Math.max(0, b.pressMs - delta);
      const ready = !b.away && b.remainingMs <= 0;
      b.milkMs = Math.max(0, b.milkMs - delta);
      if (b.milkMs <= 0) b.milk = undefined;
      if (ready && !b.wasReady) {
        b.popMs = B.pop.ms;
        b.milk = this.newMilk();
        b.milkMs = B.milk.ms;
      }
      b.wasReady = ready;
    }
    this.draw();
  }

  private find(id: BeltSpecial): Badge {
    return this.badges.find((b) => b.id === id)!;
  }

  private draw(): void {
    for (const b of this.badges) this.drawBadge(b);
  }

  private drawBadge(b: Badge): void {
    const g = b.gfx;
    const ready = !b.away && b.remainingMs <= 0;
    const pop = b.popMs / B.pop.ms; // 1 -> 0 right after becoming ready
    const scale = 1 + B.pop.grow * Math.sin(pop * Math.PI);
    const r = B.r;
    g.clear();
    g.setScale(scale * b.k * (1 - B.press.squash * (b.pressMs / B.press.ms)));

    // Gold ring flying outwards from the ready badge.
    if (pop > 0) {
      g.lineStyle(B.pop.burstW, B.colors.ringReady, pop);
      g.strokeCircle(0, 0, r + (1 - pop) * B.pop.burst);
    }

    // Glow disc and ring.
    g.fillStyle(b.away ? B.colors.ringAway : B.colors.ringReady, ready ? B.glowAlpha : B.glowAlphaCooling);
    g.fillCircle(0, 0, r);
    this.drawRing(g, b, ready);

    // Icon: full color unless the belt is away; while recharging the clock pie below darkens the part not ready yet.
    const iconAlpha = b.away ? B.iconAlphaAway : 1;
    const iconColor = b.away ? B.colors.iconCooling : B.colors.iconReady;
    if (b.id === 'spin') this.drawSpinIcon(g, iconColor, iconAlpha, !b.away);
    else this.drawThrowIcon(g, iconColor, iconAlpha, !b.away);
    if (!b.away && !ready) this.drawSweep(g, b);

    if (pop > 0) {
      g.fillStyle(B.colors.flash, B.pop.flashAlpha * pop);
      g.fillCircle(0, 0, r);
    }

    this.drawMilk(g, b);

    // Seconds left, and the key under the badge.
    b.seconds.setScale(scale * (1 + (b.k - 1) * 0.5));
    if (!b.away && b.remainingMs > 0) {
      b.seconds.setVisible(true).setText(this.secondsText(b.remainingMs));
    } else {
      b.seconds.setVisible(false);
    }
    if (b.tag) b.tag.setScale(scale * Math.min(b.k, B.tag.maxScale)).setPosition(b.cx, b.cy + (B.r * b.k + B.tag.gap) * scale);
  }

  private secondsText(ms: number): string {
    return ms < B.seconds.decimalsBelowMs ? (Math.ceil(ms / 100) / 10).toFixed(1) : String(Math.ceil(ms / 1000));
  }

  private drawRing(g: Phaser.GameObjects.Graphics, b: Badge, ready: boolean): void {
    const rr = B.r - B.ringW / 2;
    if (b.away) {
      g.lineStyle(B.ringW, B.colors.ringAway, 1);
      const step = (Math.PI * 2) / B.dashes.count;
      for (let i = 0; i < B.dashes.count; i++) {
        g.strokePoints(poly(this.arc(rr, i * step, i * step + step * B.dashes.share, 5)), false);
      }
      return;
    }
    if (ready) {
      g.lineStyle(B.ringW, B.colors.ringReady, 1).strokeCircle(0, 0, rr);
      return;
    }
    // Recharging: just a faint ring; the clock pie (drawSweep) shows the progress.
    g.lineStyle(B.ringW, B.colors.ringReady, B.trackAlpha).strokeCircle(0, 0, rr);
  }

  /** The clock: a dark pie over what is not ready yet. Its edge is a hand sweeping clockwise from the top and the pie shrinks behind it. */
  private drawSweep(g: Phaser.GameObjects.Graphics, b: Badge): void {
    const S = B.sweep;
    const left = Phaser.Math.Clamp(b.remainingMs / b.totalMs, 0, 1);
    if (left <= 0.001) return;
    const from = (-90 + 360 * (1 - left)) * DEG; // the hand
    const to = 270 * DEG; // back at the top
    const r = B.r - 1;
    g.fillStyle(S.color, S.alpha);
    g.slice(0, 0, r, from, to, false);
    g.fillPath();
    g.lineStyle(S.handW, S.handColor, S.handAlpha);
    g.lineBetween(0, 0, Math.cos(from) * r, Math.sin(from) * r);
  }

  // ---- Milk ----

  private newMilk(): Milk {
    const M = B.milk;
    const tongues: MilkTongue[] = M.tongues.xs.map((x) => ({
      x: x + Phaser.Math.FloatBetween(-M.tongues.jitter, M.tongues.jitter),
      w: Phaser.Math.FloatBetween(M.tongues.halfW[0], M.tongues.halfW[1]),
      len: Phaser.Math.FloatBetween(M.tongues.len[0], M.tongues.len[1]),
    }));
    const longest = tongues.map((_, i) => i).sort((a, c) => tongues[c]!.len - tongues[a]!.len).slice(0, M.drop.count);
    return { tongues, drops: longest.map((tongue, i) => ({ tongue, delayMs: i * M.drop.staggerMs })) };
  }

  /** The milk over the top of the badge: a pale outline pass first, then the milk itself, so the shapes merge into one blob. */
  private drawMilk(g: Phaser.GameObjects.Graphics, b: Badge): void {
    const m = b.milk;
    if (!m) return;
    const M = B.milk;
    const t = M.ms - b.milkMs;
    const amount = t < M.growMs ? 1 - (1 - t / M.growMs) ** 3 : t > M.ms - M.shrinkMs ? 1 - ((t - (M.ms - M.shrinkMs)) / M.shrinkMs) ** 2 : 1;
    if (amount <= 0.01) return;
    const capY = B.r * M.capY * amount - B.r * (1 - amount); // starts at the rim's top, slides down to its resting line
    const passes = [
      { grow: M.edge, color: B.colors.milkEdge },
      { grow: 0, color: B.colors.milk },
    ];
    for (const { grow, color } of passes) {
      g.fillStyle(color, 1);
      this.fillCap(g, capY + grow, B.r + grow);
      const reach = Math.sqrt(Math.max(0, B.r * B.r - capY * capY)); // half the cap's width: tongues beyond it would float in the air
      for (const tg of m.tongues) {
        const len = tg.len * amount * Phaser.Math.Clamp((reach - Math.abs(tg.x) - tg.w) / tg.w, 0, 1);
        if (len < 1) continue;
        const h = capY + len + grow - (capY - 3 - grow);
        g.fillRoundedRect(tg.x - tg.w - grow, capY - 3 - grow, (tg.w + grow) * 2, h, Math.min(tg.w + grow, h / 2));
      }
    }
    // Drops falling off the longest tongues.
    for (const d of m.drops) {
      const p = (t - (M.growMs * M.drop.startShare + d.delayMs)) / M.drop.fallMs;
      if (p < 0 || p >= 1) continue;
      const tg = m.tongues[d.tongue]!;
      const y = B.r * M.capY + tg.len + M.drop.fall * p * p;
      const r = M.drop.r * (1 - p ** 3);
      for (const { grow, color } of passes) {
        g.fillStyle(color, 1);
        const rr = r + grow;
        g.fillCircle(tg.x, y, rr);
        g.fillPoints(poly([[tg.x - rr * 0.85, y - rr * 0.3], [tg.x + rr * 0.85, y - rr * 0.3], [tg.x, y - rr * 2.7]]), true);
      }
    }
  }

  /** The part of a circle (radius `r`, centered on the badge) above the horizontal line `y`. */
  private fillCap(g: Phaser.GameObjects.Graphics, y: number, r: number): void {
    if (y >= r || y <= -r) return;
    const edge = Math.sqrt(r * r - y * y);
    if (edge < 1) return;
    g.fillPoints(poly(this.arc(r, Math.atan2(y, -edge), Math.atan2(y, edge), 24)), true);
  }

  // ---- Icons ----

  /** Every icon is drawn twice: first a bit thicker in navy (the outline), then the real colors on top. */
  private drawSpinIcon(g: Phaser.GameObjects.Graphics, color: number, alpha: number, ready: boolean): void {
    const s = B.icon.spin;
    const o = B.icon.outline;
    const a0 = s.startDeg * DEG;
    const a1 = (s.startDeg + s.sweepDeg) * DEG;
    // The strap is one filled band along the circle, thin at the tail (a0) and full width at the head (a1).
    const outer: Pt[] = [];
    const inner: Pt[] = [];
    for (let i = 0; i <= s.steps; i++) {
      const t = i / s.steps;
      const a = a0 + (a1 - a0) * t;
      const half = (s.strapW * (s.tailShare + (1 - s.tailShare) * t)) / 2;
      outer.push([Math.cos(a) * (s.r + half), Math.sin(a) * (s.r + half)]);
      inner.push([Math.cos(a) * (s.r - half), Math.sin(a) * (s.r - half)]);
    }
    const band = poly([...outer, ...inner.reverse()]);
    // The buckle sits on the strap's head, turned along the strap (tx, ty = along it, nx, ny = across it).
    const ex = Math.cos(a1) * s.r;
    const ey = Math.sin(a1) * s.r;
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    const nx = Math.cos(a1);
    const ny = Math.sin(a1);
    const { halfLen, halfWid } = s.buckle;
    const corners = poly(
      ([[1, 1], [1, -1], [-1, -1], [-1, 1]] as const).map(([u, v]): Pt => [ex + tx * u * halfLen + nx * v * halfWid, ey + ty * u * halfLen + ny * v * halfWid]),
    );
    for (const outline of [true, false]) {
      const extra = outline ? o * 2 : 0;
      // Speed streaks behind the head.
      g.lineStyle(s.streakW + extra, outline ? B.colors.outline : color, alpha);
      for (const k of s.streaks) g.strokePoints(poly(this.arc(s.r + k.dr, a0 + k.fromDeg * DEG, a0 + k.toDeg * DEG, 10)), false);
      // Strap.
      const c = outline ? B.colors.outline : ready ? B.colors.strap : color;
      g.fillStyle(c, alpha).fillPoints(band, true);
      if (outline) g.lineStyle(extra, c, alpha).strokePoints(band, true);
      if (!outline) {
        g.fillStyle(B.colors.outline, alpha);
        for (const k of s.holes.at) {
          const a = a0 + (a1 - a0) * k;
          g.fillCircle(Math.cos(a) * s.r, Math.sin(a) * s.r, s.holes.r);
        }
      }
      // Buckle.
      g.lineStyle(s.buckle.lineW + extra, outline ? B.colors.outline : B.colors.buckle, alpha);
      g.strokePoints(corners, true);
    }
  }

  private drawThrowIcon(g: Phaser.GameObjects.Graphics, color: number, alpha: number, ready: boolean): void {
    const t = B.icon.throw;
    const o = B.icon.outline;
    const [p0, p1] = t.strap as unknown as [Pt, Pt];
    const [bx, by] = t.buckle.at;
    const h = t.buckle.half;
    // The wings: one on each side of the strap, near its middle, swept back (dx, dy = along the strap).
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const dx = (p1[0] - p0[0]) / len;
    const dy = (p1[1] - p0[1]) / len;
    const wx = p0[0] + (p1[0] - p0[0]) * t.wings.at;
    const wy = p0[1] + (p1[1] - p0[1]) * t.wings.at;
    const wings = [1, -1].map((side) =>
      poly((t.wings.points as unknown as Pt[]).map(([u, v]): Pt => [wx + u * dx - side * v * dy, wy + u * dy + side * v * dx])),
    );
    for (const outline of [true, false]) {
      const extra = outline ? o * 2 : 0;
      g.lineStyle(t.streakW + extra, outline ? B.colors.outline : color, alpha);
      for (const s of t.streaks as unknown as Pt[][]) g.strokePoints(poly(s), false);
      const wingColor = outline ? B.colors.outline : color;
      g.fillStyle(wingColor, alpha);
      for (const wp of wings) {
        g.fillPoints(wp, true);
        if (outline) g.lineStyle(extra, wingColor, alpha).strokePoints(wp, true);
      }
      g.lineStyle(t.strapW + extra, outline ? B.colors.outline : ready ? B.colors.strap : color, alpha);
      g.strokePoints(poly([p0, p1]), false);
      if (!outline) {
        g.fillStyle(B.colors.outline, alpha);
        for (const k of t.holes.at) g.fillCircle(p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, t.holes.r);
      }
      g.lineStyle(t.buckle.lineW + extra, outline ? B.colors.outline : B.colors.buckle, alpha);
      g.strokePoints(poly([[bx, by - h], [bx + h, by], [bx, by + h], [bx - h, by]]), true);
    }
  }

  // ---- Shapes ----

  private arc(r: number, from: number, to: number, steps: number = B.arcSegments): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
}
