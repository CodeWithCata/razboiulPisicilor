/** @file Main menu: logo, Varu, tap to start (endless button once unlocked), mute badge, install button. */
import Phaser from 'phaser';
import { AUDIO } from '../config/audio';
import { GAME } from '../config/balance';
import { DIFFICULTY_MENU } from '../config/difficulty';
import { createDifficultyCat, difficultyCatHeight } from '../ui/DifficultyCat';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';
import { ALMANAC_TEXT } from '../content/almanac';
import { ENDLESS_TEXT, MENU_TEXT, TOUCH_TEXT } from '../content/lines';
import { TOUCH } from '../config/touch';
import { usesTouchControls } from '../core/device';
import { enterFullscreenLandscape, whenScaleSettled } from '../core/fullscreen';
import { cycleDifficulty, getDifficulty, getDifficultyId } from '../core/difficulty';
import { isStartingRun, setStartingRun, type RunOptions } from '../core/run';
import { loadBest, loadEndlessUnlocked, loadLifetime } from '../core/storage';
import { bus, Events, type MusicPayload } from '../core/events';
import { createMenuButton } from '../ui/MenuButton';
import { createMenuBackdrop } from '../ui/menuBackdrop';
import { createCatRing, createMenuVaru } from '../ui/MenuStage';
import { isPwaUiEvent, mountInstallButton } from '../ui/PwaUi';
import { MuteBadge } from '../ui/MuteBadge';
import { createTitleLogo } from '../ui/TitleLogo';
import { playIntroVideos, shouldPlayIntro, unlockIntroVideo } from '../ui/IntroVideo';

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

    // The almanac button (top left): opens the almanac instead of starting the game.
    const A = MENU.almanac;
    const almanacButton = createMenuButton(this, { x: A.x, y: A.y, w: touch ? A.touchW : A.w, h: touch ? A.touchH : A.h, size: A.size, label: ALMANAC_TEXT.menuButton, interactive: true });

    // The difficulty button (under the almanac button): a tap or D steps Ușor -> Normal -> Greu -> Coșmar. Saved on the device.
    const DM = DIFFICULTY_MENU;
    let difficultyButton!: Phaser.GameObjects.Container;
    let refreshFooter: () => void = () => undefined; // set below, once the footer exists
    const buildDifficultyButton = (): void => {
      difficultyButton?.destroy();
      const d = getDifficulty();
      difficultyButton = createDifficultyCat(this, { x: DM.x, y: DM.y, w: touch ? DM.touchW : DM.w, h: touch ? DM.touchH : DM.h, size: DM.size, label: `${d.name}`, textColor: d.color }); // a cat's head
      this.add
        .text(DM.x, DM.y + difficultyCatHeight(touch ? DM.touchH : DM.h) / 2 + 6, d.blurb, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#1b2340', strokeThickness: 4, align: 'center', wordWrap: { width: touch ? DM.touchW : DM.w } })
        .setOrigin(0.5, 0)
        .setAlpha(0.9)
        .setDepth(MENU.button.depth)
        .setName('difficultyCaption');
    };
    const refreshDifficulty = (): void => {
      this.children.getByName('difficultyCaption')?.destroy();
      cycleDifficulty();
      buildDifficultyButton();
      refreshFooter(); // the records belong to the difficulty
    };
    buildDifficultyButton();

    // Bottom line: the records (of the chosen difficulty), the lifetime total and the key reminders on desktop.
    const footerText = (): string => {
      const parts: string[] = [];
      const best = loadBest('campaign', getDifficultyId());
      if (best > 0) parts.push(`${MENU_TEXT.record}: ${best}`);
      const bestEndless = endlessUnlocked ? loadBest('endless', getDifficultyId()) : 0;
      if (bestEndless > 0) parts.push(`${MENU_TEXT.recordEndless}: ${bestEndless}`);
      const life = loadLifetime();
      if (!touch && life.kills > 0) parts.push(`${life.kills} pisici învinse`);
      if (!touch) parts.push(MENU_TEXT.keys);
      return parts.join(MENU.footer.separator);
    };
    const F = MENU.footer;
    const footer = this.add
      .text(width / 2, F.y, footerText(), { fontFamily: FONT, fontSize: `${F.size}px`, color: '#ffffff', stroke: '#1b2340', strokeThickness: F.strokeThickness })
      .setOrigin(0.5)
      .setAlpha(F.alpha)
      .setDepth(MENU.button.depth);
    refreshFooter = () => footer.setText(footerText());

    new MuteBadge(this, width - 46, 46);
    // "Instalează jocul" (a page button, only when installing is possible). Gone as soon as the menu closes.
    const removeInstallButton = mountInstallButton();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeInstallButton);
    const music: MusicPayload = { track: isStartingRun() ? null : 'menu' }; // never bring the menu song back once the start tap happened
    bus.emit(Events.MusicTrack, music);

    let started = false;
    const go = (run?: RunOptions): void => {
      if (started) return;
      started = true;
      setStartingRun(true);
      removeInstallButton();
      if (touch && TOUCH.fullscreenOnStart) enterFullscreenLandscape(this); // inside the tap, as browsers require (it also keeps the screen awake)
      // Fullscreen changes the canvas size a moment after the tap: build the run only once the size has settled.
      const playVideos = shouldPlayIntro(); // decided inside the tap: sound is allowed then
      if (playVideos) {
        unlockIntroVideo(); // iPhone: the video element must be started by THIS tap to get sound for every clip
        const silence: MusicPayload = { track: null };
        bus.emit(Events.MusicTrack, silence); // the menu song stops with the tap, not only when the first clip appears
      }
      void whenScaleSettled(this)
        .then(() => (playVideos ? playIntroVideos() : undefined)) // backstory + intro, with a skip button
        .then((intro) => {
          setStartingRun(false);
          this.scene.start('GameScene', run);
          if (!intro) return;
          // The black overlay keeps covering the menu until the game has been created and drawn, so the title never flashes.
          this.scene.manager.getScene('GameScene').events.once(Phaser.Scenes.Events.CREATE, () => {
            requestAnimationFrame(() => requestAnimationFrame(() => intro.dismiss()));
          });
          window.setTimeout(intro.dismiss, 4000); // safety: never leave the screen black
        });
    };
    // Tapping the endless button starts endless mode, anywhere else the normal game.
    // On a phone the start happens when the finger LIFTS: browsers only allow fullscreen after a finished tap, not on the touch-down.
    const startEvent = touch ? 'pointerup' : 'pointerdown';
    const onTap = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void => {
      if (isPwaUiEvent(pointer.event)) return; // a tap on the install button must not start the game
      this.input.off(startEvent, onTap);
      if (over.includes(difficultyButton)) {
        this.input.on(startEvent, onTap); // not a start: stay on the menu and step to the next difficulty
        refreshDifficulty();
        return;
      }
      if (over.includes(almanacButton)) {
        this.scene.start('AlmanacScene'); // the almanac button: not a start
        return;
      }
      go(endlessButton && over.includes(endlessButton) ? { mode: 'endless' } : undefined);
    };
    this.input.on(startEvent, onTap);
    // The mute key must not start the game; Enter starts endless mode once it is unlocked.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      // Only a real "start" key counts: not the mute key, and not Shift / Ctrl / Alt, F-keys or shortcuts like Ctrl+R.
      if (event.code === 'KeyD' && !started) {
        refreshDifficulty(); // D steps the difficulty
        return;
      }
      if (event.code === 'KeyA' && !started) {
        this.scene.start('AlmanacScene'); // A opens the almanac
        return;
      }
      if (event.code === AUDIO.muteKeyCode || event.ctrlKey || event.metaKey || event.altKey || IGNORED_START_KEYS.test(event.code)) return;
      const endless = endlessUnlocked && (event.code === 'Enter' || event.code === 'NumpadEnter');
      go(endless ? { mode: 'endless' } : undefined);
    });
  }
}
