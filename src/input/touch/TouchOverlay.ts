import Phaser from 'phaser';
import { GAME } from '../../config/balance';
import { TOUCH } from '../../config/touch';
import { COLORS, FONT } from '../../config/style';
import { TOUCH_TEXT } from '../../content/lines';
import type { StickView, TouchInput } from './TouchInput';

/**
 * Draws the touch move stick, the attack button and the pause button on top of the game (the spin and throw buttons are the
 * cooldown badges of ui/BeltBadges.ts). Same look as the badges: a soft disc, a cream ring, a navy outline, gold.
 * Pure visuals: all the logic is in TouchInput.
 */
export class TouchOverlay {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly attackTag: Phaser.GameObjects.Text;
  private readonly laserHint: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: TouchInput,
  ) {
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(TOUCH.depth);

    // A caption under the idle stick says where the thumb goes. It fades after a few seconds and never comes back once the stick was used.
    const spot = TOUCH.idleStickSpot;
    this.caption = scene.add
      .text(spot.x, spot.y + TOUCH.stickRadius + 28, TOUCH_TEXT.moveHint, {
        fontFamily: FONT,
        fontSize: `${TOUCH.hintSize}px`,
        color: '#ffffff',
        stroke: '#1b2340',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(TOUCH.depth + 1)
      .setAlpha(0.9);
    scene.tweens.add({ targets: this.caption, alpha: 0, delay: TOUCH.hintMs, duration: TOUCH.hintFadeMs });

    // The name of the attack button, under it, for the first seconds of a run (same look as the names under spin and throw).
    const a = TOUCH.buttons.attack;
    this.attackTag = scene.add
      .text(a.x, a.y + a.r + TOUCH.attackTagGap, TOUCH_TEXT.attack, {
        fontFamily: FONT,
        fontSize: `${TOUCH.attackTagSize}px`,
        color: '#ffffff',
        stroke: '#1b2340',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(TOUCH.depth + 1);
    scene.tweens.add({ targets: this.attackTag, alpha: 0, delay: TOUCH.hintMs, duration: TOUCH.hintFadeMs });

    // While the laser is active the right half of the screen is its tap zone: this line says so until the first tap.
    const L = TOUCH.laser;
    const zoneX = GAME.width * TOUCH.leftZone;
    this.laserHint = scene.add
      .text((zoneX + GAME.width) / 2, L.hintY, TOUCH_TEXT.laserHint, {
        fontFamily: FONT,
        fontSize: `${L.hintSize}px`,
        color: '#ffffff',
        stroke: '#1b2340',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(TOUCH.depth + 1)
      .setVisible(false);
  }

  update(): void {
    const g = this.gfx;
    g.clear();
    this.drawLaserZone();
    this.drawStick(this.input.moveStick);
    this.drawAttack();
    this.drawPause();
    if (this.input.usedStick) this.caption.setVisible(false);
    this.laserHint.setVisible(this.input.laserAiming && !this.input.laserPlaced);
  }

  /** The laser's tap zone: the right half of the screen in a soft red, with a navy-and-red border, pulsing a little. Drawn under the buttons. */
  private drawLaserZone(): void {
    if (!this.input.laserAiming) return;
    const g = this.gfx;
    const L = TOUCH.laser;
    const x = GAME.width * TOUCH.leftZone + L.inset;
    const y = L.inset;
    const w = GAME.width - x - L.inset;
    const h = GAME.height - L.inset * 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / L.zonePulseMs);
    g.fillStyle(L.zoneColor, L.zoneAlpha + L.zonePulseAlpha * pulse).fillRoundedRect(x, y, w, h, L.cornerRadius);
    g.lineStyle(L.borderWidth + 4, TOUCH.outlineColor, 0.5).strokeRoundedRect(x, y, w, h, L.cornerRadius);
    g.lineStyle(L.borderWidth, L.zoneColor, 0.55 + 0.3 * pulse).strokeRoundedRect(x, y, w, h, L.cornerRadius);
  }

  /** An active stick is drawn where the thumb started (and slides along); an idle one is a faint hint at its resting spot. */
  private drawStick(stick: StickView): void {
    const g = this.gfx;
    const spot = TOUCH.idleStickSpot;
    const x = stick.active ? stick.originX : spot.x;
    const y = stick.active ? stick.originY : spot.y;
    const kx = stick.active ? stick.knobX : x;
    const ky = stick.active ? stick.knobY : y;
    const alpha = stick.active ? TOUCH.activeAlpha : TOUCH.idleAlpha;
    const R = TOUCH.stickRadius;
    const r = TOUCH.knobRadius;
    const w = TOUCH.ringWidth;

    // Soft disc, then the ring (navy outline first, cream on top).
    g.fillStyle(TOUCH.ringColor, alpha * 0.3).fillCircle(x, y, R);
    g.lineStyle(w + 4, TOUCH.outlineColor, alpha).strokeCircle(x, y, R - w / 2);
    g.lineStyle(w, TOUCH.ringColor, alpha).strokeCircle(x, y, R - w / 2);

    // The knob: gold with a navy rim and a little shine.
    const knobAlpha = stick.active ? 0.95 : alpha;
    g.fillStyle(TOUCH.outlineColor, knobAlpha).fillCircle(kx, ky, r + 3);
    g.fillStyle(TOUCH.knobColor, knobAlpha).fillCircle(kx, ky, r);
    g.fillStyle(COLORS.white, knobAlpha * 0.4).fillCircle(kx - r * 0.32, ky - r * 0.32, r * 0.28);
  }

  /**
   * The attack button: a soft disc, a ring and a fist holding a belt, all with a navy outline like the other buttons.
   * It squashes and glows while a thumb holds it.
   */
  private drawAttack(): void {
    const g = this.gfx;
    const b = TOUCH.buttons.attack;
    const held = this.input.heldButtons.has('attack');
    const r = b.r * (held ? 1 - TOUCH.attackHeldSquash : 1);
    const tone = held ? COLORS.gold : COLORS.cream;
    g.fillStyle(tone, held ? 0.5 : 0.26).fillCircle(b.x, b.y, r);
    g.lineStyle(TOUCH.ringWidth + 4, TOUCH.outlineColor, held ? 0.9 : 0.55).strokeCircle(b.x, b.y, r - 2);
    g.lineStyle(TOUCH.ringWidth, tone, held ? 1 : 0.8).strokeCircle(b.x, b.y, r - 2);

    this.drawFistWithBelt(b.x, b.y, r);
  }

  /** A fist holding a belt: the strap goes through the fist and ends in a gold buckle. Every shape is drawn navy first (a bit bigger), then in color. */
  private drawFistWithBelt(cx: number, cy: number, r: number): void {
    const g = this.gfx;
    const I = TOUCH.attackIcon;
    const o = I.outline;
    const at = ([u, v]: readonly [number, number]): [number, number] => [cx + u * r, cy + v * r];

    // The strap, with holes near the buckle end, and the buckle on its tip.
    const [x0, y0] = at(I.strap.from);
    const [x1, y1] = at(I.strap.to);
    const sw = I.strap.width * r;
    g.lineStyle(sw + o * 2, TOUCH.outlineColor, 1).lineBetween(x0, y0, x1, y1);
    g.lineStyle(sw, I.strapColor, 1).lineBetween(x0, y0, x1, y1);
    g.fillStyle(TOUCH.outlineColor, 1);
    for (const k of I.strap.holes) g.fillCircle(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, I.strap.holeR * r);
    const half = I.buckle.half * r;
    g.fillStyle(TOUCH.outlineColor, 1).fillRect(x1 - half - o, y1 - half - o, (half + o) * 2, (half + o) * 2);
    g.fillStyle(TOUCH.knobColor, 1).fillRect(x1 - half, y1 - half, half * 2, half * 2);
    g.fillStyle(I.strapColor, 1).fillRect(x1 - half * 0.45, y1 - half * 0.45, half * 0.9, half * 0.9);

    // The fist over the strap: palm, four knuckles, thumb (outline pass, then skin).
    const P = I.palm;
    const K = I.knuckles;
    const T = I.thumb;
    const px = cx + P.x * r;
    const py = cy + P.y * r;
    const thumb = (grow: number, color: number): void => {
      const tx = cx + T.x * r;
      const ty = cy + T.y * r;
      const w = T.w * r + grow * 2;
      const h = T.h * r + grow * 2;
      const tilt = Phaser.Math.DegToRad(T.tiltDeg);
      const c = Math.cos(tilt);
      const s2 = Math.sin(tilt);
      const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => new Phaser.Math.Vector2(tx + u! * c - v! * s2, ty + u! * s2 + v! * c));
      g.fillStyle(color, 1).fillPoints(pts, true);
    };
    for (const pass of [o, 0]) {
      const color = pass > 0 ? TOUCH.outlineColor : I.skin;
      g.fillStyle(color, 1).fillRoundedRect(px - (P.w * r) / 2 - pass, py - (P.h * r) / 2 - pass, P.w * r + pass * 2, P.h * r + pass * 2, P.radius * r + pass);
      for (const kx of K.xs) g.fillCircle(cx + kx * r, cy + K.y * r, K.r * r + pass);
      thumb(pass, color);
    }
    // A shaded line under the knuckles and under the thumb, so the fingers read as a fist.
    g.lineStyle(Math.max(2, r * 0.03), I.skinShade, 1);
    const ly = cy + (K.y + K.r * 0.9) * r;
    g.lineBetween(cx + (K.xs[0]! - 0.02) * r, ly, cx + (K.xs[3]! + 0.02) * r, ly);
    g.lineBetween(cx + (T.x - T.w / 2 + 0.03) * r, cy + (T.y + T.h / 2) * r, cx + (T.x + T.w / 2 - 0.03) * r, cy + (T.y + T.h / 2) * r);
  }

  /** The pause button: a soft disc, a thin ring and two bars with a navy outline (like the speaker badge). */
  private drawPause(): void {
    const g = this.gfx;
    const b = TOUCH.buttons.pause;
    const held = this.input.heldButtons.has('pause');
    const tone = held ? COLORS.gold : COLORS.cream;
    g.fillStyle(tone, held ? 0.45 : 0.22).fillCircle(b.x, b.y, b.r);
    g.lineStyle(4, tone, 0.75).strokeCircle(b.x, b.y, b.r - 2);

    const barW = b.r * 0.22;
    const barH = b.r * 0.72;
    const gap = b.r * 0.26;
    for (const side of [-1, 1]) {
      const left = b.x + side * (gap / 2 + barW / 2) - barW / 2;
      g.fillStyle(COLORS.navy, 1).fillRoundedRect(left - 2.5, b.y - barH / 2 - 2.5, barW + 5, barH + 5, (barW + 5) / 2);
      g.fillStyle(COLORS.cream, 1).fillRoundedRect(left, b.y - barH / 2, barW, barH, barW / 2);
    }
  }
}
