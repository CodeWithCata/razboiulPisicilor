/** @file Draws the touch stick, attack button and pause button. Visuals only; logic is in TouchInput. */
import { texArgs } from '../../assets/atlas';
import type Phaser from 'phaser';
import { GAME } from '../../config/balance';
import { PERF } from '../../config/perf';
import { TOUCH } from '../../config/touch';
import { FONT } from '../../config/style';
import { TOUCH_TEXT } from '../../content/lines';
import type { StickView, TouchInput } from './TouchInput';
import { bakeLaserZone, bakeTouchButtons, TOUCH_TEX, type LaserZoneLayout } from './touchPictures';

/**
 * Shows the touch move stick, the attack button and the pause button on top of the game (the spin and throw buttons are the
 * cooldown badges of ui/BeltBadges.ts). Same look as the badges: a soft disc, a cream ring, a navy outline, gold.
 * Every picture is baked once (input/touch/touchPictures.ts), one per state. A frame only moves each picture, switches it to the
 * picture of its new state (idle / active, held / not held) and sets the laser zone's pulse alpha. Pure visuals: all the logic is in TouchInput.
 */
/** Switches a picture to another texture, only when it is not showing that one already. */
function switchTo(img: Phaser.GameObjects.Image, key: string): void {
  if (img.getData(PICTURE) === key) return;
  img.setData(PICTURE, key);
  img.setTexture(...texArgs(key));
}
/** The data slot where an image remembers which picture (key) it shows: an atlas frame is not a texture key, so the key is kept here. */
const PICTURE = 'picture';

export class TouchOverlay {
  private readonly laserFill: Phaser.GameObjects.Image;
  private readonly laserEdge: Phaser.GameObjects.Image;
  private readonly laserBorder: Phaser.GameObjects.Image;
  private readonly stick: Phaser.GameObjects.Image;
  private readonly knob: Phaser.GameObjects.Image;
  private readonly attack: Phaser.GameObjects.Image;
  private readonly attackIcon: Phaser.GameObjects.Image;
  private readonly pause: Phaser.GameObjects.Image;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly attackTag: Phaser.GameObjects.Text;
  private readonly laserHint: Phaser.GameObjects.Text;
  /** Where the laser zone pictures were made (they are made again when the screen size changes). */
  private laser: LaserZoneLayout;
  /** Set by `setHidden`: a cutscene hides every picture of the thumb controls. */
  private hidden = false;
  /** Frames left in which the laser zone is drawn once at `PERF.warm` alpha, so its textures are on the GPU before the first laser (see `PERF.warm`). */
  private laserWarm = PERF.warm.frames;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: TouchInput,
  ) {
    bakeTouchButtons(this.scene);
    this.laser = bakeLaserZone(this.scene);

    const d = TOUCH.depth;
    // Drawing order (same as before): laser zone, stick, knob, attack disc, attack arm, pause.
    this.laserFill = scene.add.image(this.laser.x, this.laser.y, ...texArgs(TOUCH_TEX.laserFill)).setOrigin(0).setScrollFactor(0).setDepth(d);
    this.laserEdge = scene.add.image(this.laser.x, this.laser.y, ...texArgs(TOUCH_TEX.laserEdge)).setOrigin(0).setScrollFactor(0).setDepth(d);
    this.laserBorder = scene.add.image(this.laser.x, this.laser.y, ...texArgs(TOUCH_TEX.laserBorder)).setOrigin(0).setScrollFactor(0).setDepth(d);
    this.stick = scene.add.image(0, 0, ...texArgs(TOUCH_TEX.stickIdle)).setScrollFactor(0).setDepth(d);
    this.knob = scene.add.image(0, 0, ...texArgs(TOUCH_TEX.knobIdle)).setScrollFactor(0).setDepth(d);
    this.attack = scene.add.image(0, 0, ...texArgs(TOUCH_TEX.attackIdle)).setScrollFactor(0).setDepth(d);
    this.attackIcon = scene.add.image(0, 0, ...texArgs(TOUCH_TEX.attackIcon)).setScrollFactor(0).setDepth(d);
    this.pause = scene.add.image(0, 0, ...texArgs(TOUCH_TEX.pauseIdle)).setScrollFactor(0).setDepth(d);
    for (const img of [this.laserFill, this.laserEdge, this.laserBorder]) img.setAlpha(PERF.warm.alpha);

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
    this.applyVisibility();
  }

  /** A cutscene hides the thumb controls (it never calls `update` meanwhile); false brings them back. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.applyVisibility();
  }

  update(): void {
    if (this.laserWarm > 0) this.laserWarm--;
    // The laser zone is made for the screen size it is drawn on; a size change (rotation, fullscreen) remakes it.
    if (GAME.width !== this.laser.screenW || GAME.height !== this.laser.screenH) this.remakeLaserZone();
    this.drawLaserZone();
    this.drawStick(this.input.moveStick);
    this.drawAttack();
    this.drawPause();
    if (this.input.usedStick) this.caption.setVisible(false);
    this.laserHint.setVisible(this.input.laserAiming && !this.input.laserPlaced);
    this.applyVisibility();
  }

  /** Makes the laser zone pictures for the new screen size and puts them in place. */
  private remakeLaserZone(): void {
    this.laser = bakeLaserZone(this.scene);
    for (const [img, key] of [
      [this.laserFill, TOUCH_TEX.laserFill],
      [this.laserEdge, TOUCH_TEX.laserEdge],
      [this.laserBorder, TOUCH_TEX.laserBorder],
    ] as const) {
      img.setTexture(...texArgs(key)).setPosition(this.laser.x, this.laser.y);
    }
  }

  /** The pictures that show on screen: all of them unless a cutscene hides them; the laser zone only while the laser is aiming. */
  private applyVisibility(): void {
    const on = !this.hidden;
    const zone = on && (this.input.laserAiming || this.laserWarm > 0);
    this.laserFill.setVisible(zone);
    this.laserEdge.setVisible(zone);
    this.laserBorder.setVisible(zone);
    this.stick.setVisible(on);
    this.knob.setVisible(on);
    this.attack.setVisible(on);
    this.attackIcon.setVisible(on);
    this.pause.setVisible(on);
    this.caption.setVisible(on && !this.input.usedStick);
    this.attackTag.setVisible(on);
    this.laserHint.setVisible(on && this.input.laserAiming && !this.input.laserPlaced);
  }

  /** The laser's tap zone: the right half of the screen in a soft red, with a navy-and-red border, pulsing a little. Drawn under the buttons. */
  private drawLaserZone(): void {
    if (!this.input.laserAiming) return;
    const L = TOUCH.laser;
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / L.zonePulseMs);
    this.laserFill.setAlpha(L.zoneAlpha + L.zonePulseAlpha * pulse);
    this.laserBorder.setAlpha(0.55 + 0.3 * pulse);
  }

  /** An active stick is drawn where the thumb started (and slides along); an idle one is a faint hint at its resting spot. */
  private drawStick(stick: StickView): void {
    const spot = TOUCH.idleStickSpot;
    const x = stick.active ? stick.originX : spot.x;
    const y = stick.active ? stick.originY : spot.y;
    const kx = stick.active ? stick.knobX : x;
    const ky = stick.active ? stick.knobY : y;
    switchTo(this.stick, stick.active ? TOUCH_TEX.stickActive : TOUCH_TEX.stickIdle);
    this.stick.setPosition(x, y);
    switchTo(this.knob, stick.active ? TOUCH_TEX.knobActive : TOUCH_TEX.knobIdle);
    this.knob.setPosition(kx, ky);
  }

  /**
   * The attack button: a soft disc and a ring with Varu's arm holding the belt in it, all with a navy outline like the other buttons.
   * It squashes and glows while a thumb holds it (the held picture is the squashed one; the arm is scaled to match).
   */
  private drawAttack(): void {
    const b = TOUCH.buttons.attack;
    const held = this.input.heldButtons.has('attack');
    const r = b.r * (held ? 1 - TOUCH.attackHeldSquash : 1);
    switchTo(this.attack, held ? TOUCH_TEX.attackHeld : TOUCH_TEX.attackIdle);
    this.attack.setPosition(b.x, b.y);
    this.attackIcon.setPosition(b.x, b.y).setScale(TOUCH.attackIcon.size * r);
  }

  /** The pause button: a soft disc, a thin ring and two bars with a navy outline (like the speaker badge). */
  private drawPause(): void {
    const b = TOUCH.buttons.pause;
    const held = this.input.heldButtons.has('pause');
    switchTo(this.pause, held ? TOUCH_TEX.pauseHeld : TOUCH_TEX.pauseIdle);
    this.pause.setPosition(b.x, b.y);
  }
}
