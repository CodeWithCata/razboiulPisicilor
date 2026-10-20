/** @file Two cats peeking over the pause panel. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { PAUSE } from '../../config/pause';
import { PAUSE_CAT_LINES } from '../../content/pause';
import { SMOKE_LINES, pick } from '../../content/lines';
import { GAME } from '../../config/balance';
import { createSpeechBubble } from './SpeechBubble';

/** Two cats that peek over the top edge of the panel. Call this BEFORE the panel is drawn so the panel hides their bodies. */
export function createPeekingCats(scene: Phaser.Scene, panelLeft: number, panelRight: number, panelTop: number): void {
  const D = PAUSE.decor;
  D.peek.forEach((spec, i) => {
    const x = 'fromLeft' in spec ? panelLeft + spec.fromLeft : panelRight - spec.fromRight;
    const y = panelTop + D.peekLift;
    const cat = scene.add.image(x, y, spec.key).setScale(D.peekScale).setAngle(spec.tiltDeg).setDepth(PAUSE.depth);
    scene.tweens.add({ targets: cat, y: y - D.peekBob, duration: spec.bobMs, delay: i * 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });
}

/** Varu on a smoke break (left) with a rising smoke trail and a line, and a fat cat waiting for him (right). */
export function createPauseScene(scene: Phaser.Scene): void {
  const D = PAUSE.decor;
  const depth = PAUSE.depth + 1;
  const { width } = GAME;

  // Varu: the arm-at-mouth pose from the cigarette drag.
  const V = D.varu;
  scene.add.ellipse(V.x, V.y + 62, 150, 32, 0x000000, 0.28).setDepth(depth);
  const varu = scene.add.image(V.x, V.y, Tex.VaruDrag2).setScale(V.scale).setRotation(V.tilt).setDepth(depth);
  scene.tweens.add({ targets: varu, y: V.y - V.bobPx, duration: V.bobMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  createSpeechBubble(scene, V.x, V.bubbleY, pick(SMOKE_LINES));

  // Smoke puffs drifting up from his face. Timer and tweens belong to this scene, so they die with it.
  const S = D.smoke;
  scene.time.addEvent({
    delay: S.everyMs,
    loop: true,
    callback: () => {
      const puff = scene.add.image(V.x + S.dx, V.y + S.dy, Tex.Smoke).setScale(S.fromScale).setAlpha(S.alpha).setDepth(depth);
      scene.tweens.add({
        targets: puff,
        y: puff.y - S.riseBy,
        x: puff.x + Phaser.Math.Between(-S.driftMax, S.driftMax),
        scale: S.toScale,
        alpha: 0,
        duration: S.lifeMs,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    },
  });

  // The fat cat on the right, facing Varu, breathing and complaining.
  const C = D.fatCat;
  scene.add.ellipse(C.x, C.y + 70, 170, 34, 0x000000, 0.28).setDepth(depth);
  const cat = scene.add.image(C.x, C.y, Tex.CatFat).setScale(C.scale).setRotation(-Math.PI / 2).setDepth(depth);
  scene.tweens.add({ targets: cat, scale: C.scale * C.breatheTo, duration: C.breatheMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  createSpeechBubble(scene, Math.min(C.x, width - 120), C.bubbleY, pick(PAUSE_CAT_LINES));
}
