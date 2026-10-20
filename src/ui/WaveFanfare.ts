/** @file "Wave cleared" fanfare: the wave number slides in letter by letter. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { HUD } from '../config/hud';
import { FONT_SFX } from '../config/style';
import { WAVE_FANFARE_LINES, WAVE_FANFARE_SURRENDER_LINES, pick } from '../content/lines';

/**
 * "Wave cleared" fanfare: after a short pause the wave number slides in letter by letter (Kablammo),
 * a word pops under it, then everything slides out. Numbers in HUD.fanfare, words in WAVE_FANFARE_LINES.
 * `surrendered`: the last cats gave up instead of being beaten, so the word comes from WAVE_FANFARE_SURRENDER_LINES.
 */
export function showWaveFanfare(scene: Phaser.Scene, wave: number, surrendered = false): void {
  const F = HUD.fanfare;
  const cx = GAME.width / 2;
  const y = GAME.height / 2 + F.yOffset;
  const label = `VALUL ${wave}`;
  const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
    fontFamily: FONT_SFX, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: Math.round(size / 6),
  });

  // Measure where each letter goes (no outline, so the outline does not widen the gaps).
  const probe = scene.add.text(0, 0, '', { fontFamily: FONT_SFX, fontSize: `${F.numberSize}px` }).setVisible(false);
  const widthOf = (text: string): number => probe.setText(text).width;
  const total = widthOf(label);
  const left = cx - total / 2;
  const slots = [...label].map((ch, i) => ({ ch, x: left + widthOf(label.slice(0, i)) }));
  probe.destroy();

  const parts: Phaser.GameObjects.Text[] = [];
  let shown = 0;
  slots.forEach(({ ch, x }) => {
    if (ch === ' ') return;
    const letter = scene.add
      .text(x - F.slideFromPx, y + Phaser.Math.Between(-F.jitterPx, F.jitterPx), ch, style(F.numberSize, F.numberColor))
      .setOrigin(0, 0.5)
      .setAngle(Phaser.Math.Between(-F.tiltDeg, F.tiltDeg))
      .setAlpha(0)
      .setDepth(F.depth);
    parts.push(letter);
    scene.tweens.add({ targets: letter, x, alpha: 1, duration: F.slideMs, delay: shown * F.staggerMs, ease: 'Back.easeOut' });
    shown += 1;
  });

  const wordDelay = shown * F.staggerMs + F.slideMs * 0.6;
  const word = scene.add
    .text(cx, y + F.subOffsetY, pick(surrendered ? WAVE_FANFARE_SURRENDER_LINES : WAVE_FANFARE_LINES), style(F.subSize, F.subColor))
    .setOrigin(0.5)
    .setScale(0)
    .setDepth(F.depth);
  parts.push(word);
  scene.tweens.add({ targets: word, scale: 1, duration: F.popMs, delay: wordDelay, ease: 'Back.easeOut' });

  // Out: everything slides away to the right, one after another.
  const outAt = wordDelay + F.popMs + F.holdMs;
  parts.forEach((part, i) => {
    scene.tweens.add({
      targets: part, x: part.x + F.slideOutPx, alpha: 0, duration: F.outMs, delay: outAt + i * F.outStaggerMs, ease: 'Cubic.easeIn',
      onComplete: () => part.destroy(),
    });
  });
}
