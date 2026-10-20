/** @file Main menu: logo, Varu, tap to start (endless button once unlocked), mute badge, install button. */
import Phaser from 'phaser';
import { AUDIO } from '../config/audio';
import { GAME } from '../config/balance';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';
import { ENDLESS_TEXT, MENU_TEXT, TOUCH_TEXT } from '../content/lines';
import { TOUCH } from '../config/touch';
import { usesTouchControls } from '../core/device';
import { enterFullscreenLandscape, whenScaleSettled } from '../core/fullscreen';
import type { RunOptions } from '../core/run';
import { loadBest, loadEndlessUnlocked } from '../core/storage';
import { bus, Events, type MusicPayload } from '../core/events';
import { createMenuButton } from '../ui/MenuButton';
import { createMenuBackdrop } from '../ui/menuBackdrop';
import { createCatRing, createMenuVaru } from '../ui/MenuStage';
import { isPwaUiEvent, mountInstallButton } from '../ui/PwaUi';
import { MuteBadge } from '../ui/MuteBadge';
import { createTitleLogo } from '../ui/TitleLogo';

/** Keys that must not start the game: modifiers and the F1-F12 keys. */
const IGNORED_START_KEYS = /^(Shift|Control|Alt|Meta|CapsLock|Tab|F\d+)/;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width } = GAME;
    const touch = usesTouchControls();
    const endlessUnlocked = loadEndlessUnlocked();

    createMenuBackdrop(this);
    createCatRing(this);
    createMenuVaru(this);
    createTitleLogo(this);

    const S = MENU.start;
    const start = createMenuButton(this, { x: width / 2, y: S.y, w: S.w, h: S.h, size: S.size, label: touch ? TOUCH_TEXT.start : MENU_TEXT.start, playIcon: true, accent: true });
    this.tweens.add({ targets: start, scale: S.pulseTo, duration: S.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Endless mode shows up once the campaign has been won.
    let endlessButton: Phaser.GameObjects.Container | null = null;
    if (endlessUnlocked) {
      const E = MENU.endless;
      endlessButton = createMenuButton(this, { x: width / 2, y: E.y, w: E.w, h: touch ? E.touchH : E.h, size: E.size, label: touch ? ENDLESS_TEXT.unlockedMenu : ENDLESS_TEXT.menuButton, interactive: true });
    }

    // Bottom line: the records, and the key reminders on desktop.
    const parts: string[] = [];
    const best = loadBest('campaign');
    if (best > 0) parts.push(`${MENU_TEXT.record}: ${best}`);
    const bestEndless = endlessUnlocked ? loadBest('endless') : 0;
    if (bestEndless > 0) parts.push(`${MENU_TEXT.recordEndless}: ${bestEndless}`);
    if (!touch) parts.push(MENU_TEXT.keys);
    if (parts.length > 0) {
      const F = MENU.footer;
      this.add
        .text(width / 2, F.y, parts.join(F.separator), { fontFamily: FONT, fontSize: `${F.size}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: F.strokeThickness })
        .setOrigin(0.5)
        .setAlpha(F.alpha)
        .setDepth(MENU.button.depth);
    }

    new MuteBadge(this, width - 46, 46);
    // "Instalează jocul" (a page button, only when installing is possible). Gone as soon as the menu closes.
    const removeInstallButton = mountInstallButton();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeInstallButton);
    const music: MusicPayload = { track: 'menu' };
    bus.emit(Events.MusicTrack, music);

    let started = false;
    const go = (run?: RunOptions): void => {
      if (started) return;
      started = true;
      removeInstallButton();
      if (touch && TOUCH.fullscreenOnStart) enterFullscreenLandscape(this); // inside the tap, as browsers require (it also keeps the screen awake)
      // Fullscreen changes the canvas size a moment after the tap: build the run only once the size has settled.
      void whenScaleSettled(this).then(() => this.scene.start('GameScene', run));
    };
    // Tapping the endless button starts endless mode, anywhere else the normal game.
    // On a phone the start happens when the finger LIFTS: browsers only allow fullscreen after a finished tap, not on the touch-down.
    const startEvent = touch ? 'pointerup' : 'pointerdown';
    const onTap = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void => {
      if (isPwaUiEvent(pointer.event)) return; // a tap on the install button must not start the game
      this.input.off(startEvent, onTap);
      go(endlessButton && over.includes(endlessButton) ? { mode: 'endless' } : undefined);
    };
    this.input.on(startEvent, onTap);
    // The mute key must not start the game; Enter starts endless mode once it is unlocked.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      // Only a real "start" key counts: not the mute key, and not Shift / Ctrl / Alt, F-keys or shortcuts like Ctrl+R.
      if (event.code === AUDIO.muteKeyCode || event.ctrlKey || event.metaKey || event.altKey || IGNORED_START_KEYS.test(event.code)) return;
      const endless = endlessUnlocked && (event.code === 'Enter' || event.code === 'NumpadEnter');
      go(endless ? { mode: 'endless' } : undefined);
    });
  }
}
