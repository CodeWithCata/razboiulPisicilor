import Phaser from 'phaser';
import { GAME } from '../../config/balance';
import { TOUCH, TOUCH_BUTTON_IDS, type TouchButtonId } from '../../config/touch';
import { bus, Events, type TouchPressPayload } from '../../core/events';
import { buzz } from '../../core/haptics';
import { getAutoAttack } from '../../core/settings';
import type { InputSource } from '../InputSource';
import type { AutoAim } from './AutoAim';

/** A floating joystick: it appears where the thumb lands. */
export interface StickView {
  active: boolean;
  originX: number;
  originY: number;
  /** Where the knob is drawn (already limited to the stick radius). */
  knobX: number;
  knobY: number;
}

const newStick = (): StickView => ({ active: false, originX: 0, originY: 0, knobX: 0, knobY: 0 });

/**
 * Touch controls behind the same InputSource the keyboard uses, so no gameplay code knows the difference.
 * One thumb moves Varu (floating stick). The other thumb has the attack button (hold it to swing), spin and throw.
 * There is no aim stick: Varu looks the way he walks (and keeps that look when he stops). The belt swings only while the
 * attack button is held. With the auto-attack switch in the pause menu turned on (core/settings.ts) he instead turns to the
 * nearest cat (`assist`, AutoAim) and also swings by himself whenever it is in reach.
 * Numbers and button positions: config/touch.ts. The drawing is in TouchOverlay (stick, attack, pause) and ui/BeltBadges.ts (spin and throw).
 */
export class TouchInput implements InputSource {
  readonly move = new Phaser.Math.Vector2();
  readonly aim = new Phaser.Math.Vector2(0, -1);
  readonly aimPoint = new Phaser.Math.Vector2();
  attackHeld = false;
  spinPressed = false;
  throwPressed = false;
  /** True while the laser pointer is active: the right half of the screen then places the dot (TouchOverlay shows the zone). */
  laserAiming = false;
  /** True once the thumb has put the dot somewhere (the zone's hint goes away). */
  laserPlaced = false;

  /** For the overlay: the stick and which buttons are being held right now. */
  readonly moveStick = newStick();
  readonly heldButtons = new Set<TouchButtonId>();
  /** Set by GameScene once the cats and projectiles exist. Without it Varu just faces where he walks. */
  assist: AutoAim | null = null;
  /** True once the thumb has touched the stick (the overlay's caption goes away for good). */
  usedStick = false;

  /** The way Varu last walked: the laser dot sits in front of him this way, and he looks this way when there is nothing to hit. */
  private readonly heading = new Phaser.Math.Vector2(0, -1);
  private moveId: number | null = null;
  private laserId: number | null = null;
  /** Where the laser dot was placed, in world pixels (the camera moves, so the screen spot is converted when tapped). */
  private readonly laserPoint = new Phaser.Math.Vector2();
  private readonly buttonIds = new Map<number, TouchButtonId>();
  private spinQueued = false;
  private throwQueued = false;

  constructor(private readonly scene: Phaser.Scene) {
    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('pointerupoutside', this.onUp, this);

    // A paused scene never sees the finger lift, so forget everything when the game continues.
    scene.events.on(Phaser.Scenes.Events.RESUME, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      input.off('pointerdown', this.onDown, this);
      input.off('pointermove', this.onMove, this);
      input.off('pointerup', this.onUp, this);
      input.off('pointerupoutside', this.onUp, this);
      scene.events.off(Phaser.Scenes.Events.RESUME, this.reset, this);
    });
  }

  update(origin: Phaser.Types.Math.Vector2Like): void {
    const ox = origin.x ?? 0;
    const oy = origin.y ?? 0;

    // Walk: the stick's direction, with the speed following how far it is pushed.
    const walk = this.pushOf(this.moveStick);
    if (walk.strength > 0) {
      this.move.set(walk.x, walk.y).scale(walk.strength);
      this.heading.set(walk.x, walk.y);
    } else {
      this.move.set(0, 0);
    }

    // Aim: Varu looks the way he walks. Only with auto-attack on does the nearest cat (or incoming ball) decide, when there is one.
    // Swing: while the attack button is held, and with auto-attack on also by himself when the target is in reach.
    const target = getAutoAttack() ? (this.assist?.pick(ox, oy) ?? null) : null;
    const tx = target ? target.x - ox : 0;
    const ty = target ? target.y - oy : 0;
    if (target && tx * tx + ty * ty > 1) {
      this.aim.set(tx, ty).normalize();
      this.attackHeld = this.heldButtons.has('attack') || target.inReach;
    } else {
      if (walk.strength > 0) this.aim.copy(this.heading);
      this.attackHeld = this.heldButtons.has('attack');
    }
    if (this.laserAiming && this.laserPlaced) this.aimPoint.copy(this.laserPoint);
    else this.aimPoint.set(ox + this.heading.x * TOUCH.aimPointDistance, oy + this.heading.y * TOUCH.aimPointDistance);

    // "Pressed" is true for one frame only.
    this.spinPressed = this.spinQueued;
    this.throwPressed = this.throwQueued;
    this.spinQueued = false;
    this.throwQueued = false;
  }

  /** The laser power-up starts or ends. A new laser starts without a placed dot. */
  setLaserAiming(on: boolean): void {
    if (on === this.laserAiming) return;
    this.laserAiming = on;
    this.laserPlaced = false;
    this.laserId = null;
  }

  /** Forget every finger (used when the game continues after a pause). */
  reset(): void {
    this.moveId = null;
    this.laserId = null;
    this.moveStick.active = false;
    this.buttonIds.clear();
    this.heldButtons.clear();
    this.spinQueued = false;
    this.throwQueued = false;
  }

  /** Direction (unit) and strength (0..1, dead zone removed, full speed a bit before the ring) of a stick. Strength 0 = untouched or inside the dead zone. */
  private pushOf(stick: StickView): { x: number; y: number; strength: number } {
    if (!stick.active) return { x: 0, y: 0, strength: 0 };
    const dx = stick.knobX - stick.originX;
    const dy = stick.knobY - stick.originY;
    const length = Math.hypot(dx, dy);
    const fraction = Math.min(1, length / TOUCH.stickRadius);
    if (length === 0 || fraction < TOUCH.deadZone) return { x: 0, y: 0, strength: 0 };
    const strength = Math.min(1, (fraction - TOUCH.deadZone) / (TOUCH.fullSpeedAt - TOUCH.deadZone));
    return { x: dx / length, y: dy / length, strength };
  }

  private buttonAt(x: number, y: number): TouchButtonId | null {
    for (const id of TOUCH_BUTTON_IDS) {
      const b = TOUCH.buttons[id];
      if (Math.hypot(x - b.x, y - b.y) <= b.r + TOUCH.buttonSlop) return id;
    }
    return null;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    const button = this.buttonAt(pointer.x, pointer.y);
    if (button) {
      this.buttonIds.set(pointer.id, button);
      this.heldButtons.add(button);
      if (button === 'spin') this.press('spin');
      else if (button === 'throw') this.press('throw');
      else if (button === 'attack') buzz(TOUCH.haptics.pressMs); // held, not queued: attackHeld follows the finger
      else bus.emit(Events.PauseRequest);
      return;
    }

    // While the laser is active, the right side of the screen is the zone where the dot goes (no other use there but the buttons).
    if (this.laserAiming && pointer.x >= GAME.width * TOUCH.leftZone && this.laserId === null) {
      this.laserId = pointer.id;
      this.placeLaser(pointer);
      buzz(TOUCH.laser.haptics.tapMs);
      return;
    }

    // The left side of the screen is the move stick. The right side has no stick: only the buttons.
    if (pointer.x < GAME.width * TOUCH.leftZone && this.moveId === null) {
      this.moveId = pointer.id;
      this.usedStick = true;
      this.start(this.moveStick, pointer);
    }
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.moveId) this.drag(this.moveStick, pointer);
    else if (pointer.id === this.laserId) this.placeLaser(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    const button = this.buttonIds.get(pointer.id);
    if (button) {
      this.buttonIds.delete(pointer.id);
      if (![...this.buttonIds.values()].includes(button)) this.heldButtons.delete(button);
    }
    if (pointer.id === this.moveId) {
      this.moveId = null;
      this.moveStick.active = false;
    }
    if (pointer.id === this.laserId) this.laserId = null;
  }

  /** Put the dot under the finger (screen spot -> world spot). */
  private placeLaser(pointer: Phaser.Input.Pointer): void {
    pointer.updateWorldPoint(this.scene.cameras.main);
    this.laserPoint.set(pointer.worldX, pointer.worldY);
    this.laserPlaced = true;
  }

  /** A spin or throw button was tapped: ask for the attack (BeltSystem remembers it a moment if it is not ready), buzz, tell the badge. */
  private press(id: TouchPressPayload['button']): void {
    if (id === 'spin') this.spinQueued = true;
    else this.throwQueued = true;
    buzz(TOUCH.haptics.pressMs);
    const payload: TouchPressPayload = { button: id };
    bus.emit(Events.TouchPress, payload);
  }

  private start(stick: StickView, pointer: Phaser.Input.Pointer): void {
    stick.active = true;
    stick.originX = pointer.x;
    stick.originY = pointer.y;
    stick.knobX = pointer.x;
    stick.knobY = pointer.y;
  }

  /** The knob follows the thumb up to the ring. Past it, the whole stick slides along (or the knob just stops, if stickFollows is off). */
  private drag(stick: StickView, pointer: Phaser.Input.Pointer): void {
    let dx = pointer.x - stick.originX;
    let dy = pointer.y - stick.originY;
    const length = Math.hypot(dx, dy);
    if (length > TOUCH.stickRadius) {
      const k = TOUCH.stickRadius / length;
      if (TOUCH.stickFollows) {
        stick.originX = pointer.x - dx * k;
        stick.originY = pointer.y - dy * k;
      }
      dx *= k;
      dy *= k;
    }
    stick.knobX = stick.originX + dx;
    stick.knobY = stick.originY + dy;
  }
}
