/** @file Speaker badge showing sound on / off; click or tap to toggle. */
import Phaser from 'phaser';
import { poly } from '../assets/paint';
import { AUDIO } from '../config/audio';
import { MUTE_BADGE as M } from '../config/muteBadge';
import { FONT } from '../config/style';
import { usesTouchControls } from '../core/device';
import type { Pt } from '../core/polyClip';
import { Events, listen, type MutePayload } from '../core/events';
import { isMuted, toggleMuted } from '../core/mute';

/**
 * A little speaker button that shows if the sound is on: a faint glow disc, a thin ring and a small speaker with a navy outline.
 * Muted = red ring and a red cross. Click or tap it to mute / unmute (same as the N key, which lives in AudioSystem).
 * On a phone it is drawn bigger with a roomier tap area, and the key reminder is left out (there is no keyboard).
 */
export class MuteBadge {
  private readonly icon: Phaser.GameObjects.Graphics;
  private hover = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const touch = usesTouchControls();
    const k = touch ? M.touchScale : 1;
    const pad = touch ? M.touchHitPad : M.hitPad;
    this.icon = scene.add.graphics({ x, y }).setScale(k).setDepth(M.depth);
    if (!touch) {
      const key = AUDIO.muteKeyCode.replace('Key', '');
      scene.add
        .text(x, y + M.r + M.key.gap, key, { fontFamily: FONT, fontSize: `${M.key.size}px`, color: M.colors.key, stroke: M.colors.keyStroke, strokeThickness: M.key.strokeThickness })
        .setOrigin(0.5, 0)
        .setAlpha(M.key.alpha)
        .setDepth(M.depth);
    }

    // The click area: the badge, and on a computer the key under it.
    const top = y - M.r * k - pad;
    const bottom = touch ? y + M.r * k + pad : y + M.r + M.key.gap + M.key.size + pad;
    const hit = scene.add
      .zone(x, (top + bottom) / 2, (M.r * k + pad) * 2, bottom - top)
      .setDepth(M.depth)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => toggleMuted());
    hit.on('pointerover', () => this.setHover(true));
    hit.on('pointerout', () => this.setHover(false));

    this.draw(isMuted());
    const off = listen<MutePayload>(Events.MuteChanged, ({ muted }) => this.draw(muted));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private setHover(hover: boolean): void {
    this.hover = hover;
    this.draw(isMuted());
  }

  private draw(muted: boolean): void {
    const g = this.icon;
    const i = M.icon;
    const tone = muted ? M.colors.muted : M.colors.on;
    g.clear();

    // Glow disc and ring.
    g.fillStyle(tone, M.glowAlpha + (this.hover ? M.hoverGlowBoost : 0)).fillCircle(0, 0, M.r);
    g.lineStyle(M.ringW, tone, M.ringAlpha).strokeCircle(0, 0, M.r - M.ringW / 2);

    // Every part is drawn twice: first a bit thicker in navy (the outline), then in its real color on top.
    const speaker = poly(i.speaker as unknown as Pt[]);
    const w = i.waves;
    for (const outline of [true, false]) {
      const extra = outline ? i.outline * 2 : 0;
      const c = outline ? M.colors.outline : M.colors.on;
      g.fillStyle(c, 1).fillPoints(speaker, true);
      if (outline) g.lineStyle(extra, c, 1).strokePoints(speaker, true);
      if (muted) {
        g.lineStyle(i.cross.lineW + extra, outline ? M.colors.outline : M.colors.muted, 1);
        g.lineBetween(i.cross.from[0], i.cross.from[1], i.cross.to[0], i.cross.to[1]);
        g.lineBetween(i.cross.from[0], i.cross.to[1], i.cross.to[0], i.cross.from[1]);
      } else {
        g.lineStyle(w.lineW + extra, c, 1);
        for (const r of w.radii) g.strokePoints(poly(this.arc(w.cx, r, -w.halfAngle, w.halfAngle)), false);
      }
    }
  }

  private arc(cx: number, r: number, from: number, to: number): Pt[] {
    const pts: Pt[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = from + ((to - from) * k) / 10;
      pts.push([cx + Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
}
