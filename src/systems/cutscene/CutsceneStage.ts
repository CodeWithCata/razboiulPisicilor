/** @file The cutscene stage: who is who (Varu, the boss, props a script shows), where things are, and the camera the script drives. */
import Phaser from 'phaser';
import type { TexKey } from '../../assets/keys';
import { CAMERA } from '../../config/arena';
import { CUTSCENE } from '../../config/cutscene';
import type { CutSpot } from '../../core/cutscene';
import type { Actor } from '../../entities/Actor';
import type { Enemy } from '../../entities/Enemy';
import type { Player } from '../../entities/Player';
import type { ScriptedInput } from '../../input/ScriptedInput';

/** What the cutscene system needs from the run. GameScene hands this over (it owns all of it). */
export interface CutsceneHost {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  /** A floating word in the arena (Effects.floatText). */
  say(x: number, y: number, text: string, color: string, size: number): void;
  /** A cutscene is about to start: stop slow-mo and hit-stop, clear shots, hide the touch buttons. */
  prepare(): void;
  /** It is over: give everything back. */
  finish(): void;
}

/** Anything with a place that a script can move or turn: Varu, a cat, a boss, or a prop the script showed. */
export type Puppet = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

interface Focus {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Owns the camera during a cutscene (it follows a `focus` the script eases around) and the temporary actors a script `show`s.
 * Cats and bosses are only held still and moved by position: their AI never runs while a scene plays (GameScene skips it).
 */
export class CutsceneStage {
  private readonly props = new Map<string, Phaser.GameObjects.Image>();
  private focus: Focus = { x: 0, y: 0, zoom: 1 };
  private cameraOn = false;

  constructor(
    private readonly host: CutsceneHost,
    readonly input: ScriptedInput,
  ) {}

  // ---- the camera ------------------------------------------------------------
  /** Take the camera off Varu: from now on it looks at `focus`, starting where it looks right now. */
  begin(): void {
    const cam = this.host.scene.cameras.main;
    cam.stopFollow();
    cam.setFollowOffset(0, 0);
    this.focus = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
    this.cameraOn = true;
  }

  /** Give the camera back to Varu (follow, normal zoom, no fade). */
  end(): void {
    const scene = this.host.scene;
    const cam = scene.cameras?.main;
    this.cameraOn = false;
    if (!cam) return;
    cam.resetFX();
    cam.setZoom(1);
    cam.startFollow(this.host.player, CAMERA.roundPixels, CAMERA.lerp, CAMERA.lerp);
    cam.setFollowOffset(0, 0);
  }

  get camera(): Readonly<Focus> {
    return this.focus;
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.focus = { x, y, zoom };
  }

  /** Every frame of a cutscene: the camera follows the focus and everything that is not a scripted actor stays put. */
  update(): void {
    if (this.cameraOn) {
      const cam = this.host.scene.cameras.main;
      cam.setZoom(this.focus.zoom);
      cam.centerOn(this.focus.x, this.focus.y);
    }
    for (const child of this.host.enemies.getChildren()) {
      const cat = child as Phaser.Physics.Arcade.Sprite;
      if (cat.active && cat.body) cat.setVelocity(0, 0);
    }
  }

  // ---- who and where ---------------------------------------------------------
  /** 'varu', 'boss' (the first boss in the arena) or the id of a prop the script showed. Null = not there (a script bug or a boss that is gone). */
  actor(ref: string): Puppet | null {
    if (ref === 'varu') return this.host.player;
    if (ref === 'boss') {
      for (const child of this.host.enemies.getChildren()) {
        const cat = child as Enemy;
        if (cat.active && cat.isBoss) return cat;
      }
      return null;
    }
    return this.props.get(ref) ?? null;
  }

  /** A spot as plain pixels. An actor that is not there falls back to where the camera looks (and says so once in dev). */
  at(spot: CutSpot): { x: number; y: number } {
    if ('x' in spot) return { x: spot.x, y: spot.y };
    const who = this.actor(spot.at);
    if (!who) {
      if (import.meta.env.DEV) console.warn(`[cutscene] no actor "${spot.at}" on stage`);
      return { x: this.focus.x + (spot.dx ?? 0), y: this.focus.y + (spot.dy ?? 0) };
    }
    return { x: who.x + (spot.dx ?? 0), y: who.y + (spot.dy ?? 0) };
  }

  /** Put an actor at a place and keep its shadow under it. */
  place(who: Puppet, x: number, y: number): void {
    who.setPosition(x, y);
    if ('syncShadow' in who) (who as unknown as Actor).syncShadow();
  }

  /** Turn an actor to face a point. Varu turns through his input (his tick sets his rotation); everything else is rotated directly (sprites face UP). */
  face(ref: string, toward: { x: number; y: number }): void {
    const who = this.actor(ref);
    if (!who) return;
    const dx = toward.x - who.x;
    const dy = toward.y - who.y;
    if (ref === 'varu') this.input.look(dx, dy);
    else who.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
  }

  // ---- props a script shows --------------------------------------------------
  show(id: string, tex: TexKey, x: number, y: number, size: number, fadeMs: number): void {
    this.removeProp(id, 0);
    const scene = this.host.scene;
    const img = scene.add.image(x, y, tex).setDepth(CUTSCENE.actors.depth);
    img.setScale(size / Math.max(img.frame.realWidth, img.frame.realHeight));
    this.props.set(id, img);
    if (fadeMs > 0) {
      img.setAlpha(0);
      scene.tweens.add({ targets: img, alpha: 1, duration: fadeMs });
    }
  }

  hide(id: string, fadeMs: number): void {
    this.removeProp(id, fadeMs);
  }

  private removeProp(id: string, fadeMs: number): void {
    const img = this.props.get(id);
    if (!img) return;
    this.props.delete(id);
    if (fadeMs > 0 && this.host.scene.tweens) {
      this.host.scene.tweens.add({ targets: img, alpha: 0, duration: fadeMs, onComplete: () => img.destroy() });
    } else {
      img.destroy();
    }
  }

  /** The scene is over: every prop goes. */
  clear(): void {
    for (const img of this.props.values()) img.destroy();
    this.props.clear();
  }
}
