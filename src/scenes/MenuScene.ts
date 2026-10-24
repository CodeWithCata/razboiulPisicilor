/** @file Main menu: logo, Varu, tap to start (endless button once unlocked), almanac, difficulty and custom game buttons, mute badge, install button. */
import Phaser from 'phaser';
import { AUDIO } from '../config/audio';
import { GAME } from '../config/balance';
import { DIFFICULTY_MENU } from '../config/difficulty';
import { ALMANAC_MENU, ALMANAC_ORDER } from '../config/almanac';
import { createAlmanacButton } from '../ui/AlmanacBook';
import { createDifficultyCat, difficultyCatHeight } from '../ui/DifficultyCat';
import { MENU } from '../config/menu';
import { FONT } from '../config/style';
import { ALMANAC_TEXT } from '../content/almanac';
import { ENDLESS_TEXT, MENU_TEXT, TOUCH_TEXT } from '../content/lines';
import { CUSTOM_MENU } from '../config/customScreen';
import { CUSTOM_TEXT } from '../content/customGame';
import { createCustomGameButton, customGameButtonHeight } from '../ui/CustomGameButton';
import { launchRun } from '../ui/launchRun';
import { usesTouchControls } from '../core/device';
import { enterFullscreenLandscape, needsFullscreenTap } from '../core/fullscreen';
import { TOUCH } from '../config/touch';
import { hasSeen } from '../core/almanac';
import { cycleDifficulty, getDifficulty, getDifficultyId } from '../core/difficulty';
import { isStartingRun, type RunOptions } from '../core/run';
import { loadBest, loadEndlessUnlocked, loadLifetime } from '../core/storage';
import { bus, Events, type MusicPayload } from '../core/events';
import { createMenuButton } from '../ui/MenuButton';
import { createMenuBackdrop } from '../ui/menuBackdrop';
import { createCatRing, createMenuVaru } from '../ui/MenuStage';
import { isPwaUiEvent, mountInstallButton } from '../ui/PwaUi';
import { MuteBadge } from '../ui/MuteBadge';
import { WhatsNewCard } from '../ui/WhatsNewCard';
import { markWhatsNewSeen, pendingWhatsNew } from '../core/whatsNew';
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
    const start = createMenuButton(this, { x: width / 2, y: S.y, w: S.w, h: S.h, size: S.size, label: touch ? TOUCH_TEXT.start : MENU_TEXT.start, playIcon: true, accent: true, interactive: touch }); // on a phone the PLAY button is the only way to start (see onTap)
    this.tweens.add({ targets: start, scale: S.pulseTo, duration: S.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Endless mode shows up once the campaign has been won.
    let endlessButton: Phaser.GameObjects.Container | null = null;
    if (endlessUnlocked) {
      const E = MENU.endless;
      endlessButton = createMenuButton(this, { x: width / 2, y: E.y, w: E.w, h: touch ? E.touchH : E.h, size: E.size, label: touch ? ENDLESS_TEXT.unlockedMenu : ENDLESS_TEXT.menuButton, interactive: true });
    }

    // The almanac button (top left): the almanac's picture (a cat-face book) with how many entries were found. A tap opens the almanac instead of starting the game.
    const A = ALMANAC_MENU;
    const almanacButton = createAlmanacButton(this, {
      x: A.x,
      y: touch ? A.touchY : A.y,
      bookH: touch ? A.touchBookH : A.bookH,
      size: touch ? A.touchSize : A.size,
      label: ALMANAC_TEXT.menuButton,
      found: ALMANAC_ORDER.filter((id) => hasSeen(id)).length,
      total: ALMANAC_ORDER.length,
      hoverOpen: !touch,
    });

    // The difficulty button (under the almanac button): a tap or D steps Ușor -> Normal -> Greu -> Coșmar. Saved on the device.
    const DM = DIFFICULTY_MENU;
    let difficultyButton!: Phaser.GameObjects.Container;
    let refreshFooter: () => void = () => undefined; // set below, once the footer exists
    const buildDifficultyButton = (): void => {
      difficultyButton?.destroy();
      const d = getDifficulty();
      const faceW = touch ? DM.touchFaceW : DM.faceW;
      const size = touch ? DM.touchSize : DM.size;
      const y = touch ? DM.touchY : DM.y;
      difficultyButton = createDifficultyCat(this, { x: DM.x, y, id: getDifficultyId(), faceW, size, label: d.name, textColor: d.color }); // a cat's face: its mood is the level
      this.add
        .text(DM.x, y + difficultyCatHeight(faceW, size) / 2 + 4, d.blurb, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#1b2340', strokeThickness: 4, align: 'center', wordWrap: { width: DM.captionW } })
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

    // The custom game button (right column, same height as the difficulty cat): a tap or C opens the setup screen.
    const CM = CUSTOM_MENU;
    const customY = touch ? CM.touchY : CM.y;
    const customIconW = touch ? CM.touchIconW : CM.iconW;
    const customSize = touch ? CM.touchSize : CM.size;
    const customX = width - DM.x; // mirrors the difficulty cat on the left
    const customButton = createCustomGameButton(this, { x: customX, y: customY, iconW: customIconW, size: customSize, label: CUSTOM_TEXT.menu.button, textColor: '#c9a7ff' });
    const customCaptionY = customY + customGameButtonHeight(customIconW, customSize) / 2 + 4;
    const customCaption = this.add
      .text(customX, customCaptionY, CUSTOM_TEXT.menu.blurb, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#1b2340', strokeThickness: 4, align: 'center', wordWrap: { width: CM.captionW } })
      .setOrigin(0.5, 0)
      .setAlpha(0.9)
      .setDepth(MENU.button.depth);
    if (!touch) {
      this.add
        .text(customX, customCaptionY + customCaption.height + 2, CUSTOM_TEXT.menu.key, { fontFamily: FONT, fontSize: `${CM.keySize}px`, color: '#c9a7ff', stroke: '#1b2340', strokeThickness: 3 })
        .setOrigin(0.5, 0)
        .setAlpha(0.8)
        .setDepth(MENU.button.depth);
    }

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
    let whatsNew: WhatsNewCard | null = null; // the "what's new" card (once after an update): while it is up the menu does nothing else
    const go = (run?: RunOptions): void => {
      if (started) return;
      started = true;
      removeInstallButton();
      launchRun(this, run); // fullscreen inside the tap, size settle, opening videos, then GameScene
    };
    // Tapping the endless button starts endless mode, anywhere else the normal game.
    // On a phone the start happens when the finger LIFTS: browsers only allow fullscreen after a finished tap, not on the touch-down.
    const startEvent = touch ? 'pointerup' : 'pointerdown';
    const onTap = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void => {
      if (isPwaUiEvent(pointer.event)) return; // a tap on the install button must not start the game
      if (whatsNew?.isBlocking()) return;
      const onStart = over.includes(start);
      const onEndless = !!endlessButton && over.includes(endlessButton);
      // A phone: browsers only allow fullscreen from a tap, so the first tap of the session asks for it, whatever it hits (a start
      // button does it itself inside `launchRun`). That tap must NOT also start the run: the player may want to pick the difficulty.
      if (touch && TOUCH.fullscreenOnStart && !onStart && !onEndless && needsFullscreenTap(this)) enterFullscreenLandscape(this);
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
      if (over.includes(customButton)) {
        this.scene.start('CustomGameScene'); // the custom game button: not a start
        return;
      }
      // On a phone only the PLAY button and the endless button start a run. A tap beside a button does nothing, so a thumb that
      // misses the difficulty cat no longer starts the game. (Desktop: a click anywhere still starts it, as before.)
      if (touch && !onStart && !onEndless) {
        this.input.on(startEvent, onTap);
        return;
      }
      go(onEndless ? { mode: 'endless' } : undefined);
    };
    this.input.on(startEvent, onTap);
    // The mute key must not start the game; Enter starts endless mode once it is unlocked.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (whatsNew?.isBlocking()) return;
      // Only a real "start" key counts: not the mute key, and not Shift / Ctrl / Alt, F-keys or shortcuts like Ctrl+R.
      if (event.code === 'KeyD' && !started) {
        refreshDifficulty(); // D steps the difficulty
        return;
      }
      if (event.code === 'KeyA' && !started) {
        this.scene.start('AlmanacScene'); // A opens the almanac
        return;
      }
      if (event.code === 'KeyC' && !started && !event.ctrlKey && !event.metaKey && !event.altKey) {
        this.scene.start('CustomGameScene'); // C opens the custom game setup
        return;
      }
      if (event.code === AUDIO.muteKeyCode || event.ctrlKey || event.metaKey || event.altKey || IGNORED_START_KEYS.test(event.code)) return;
      const endless = endlessUnlocked && (event.code === 'Enter' || event.code === 'NumpadEnter');
      go(endless ? { mode: 'endless' } : undefined);
    });
    const news = isStartingRun() ? null : pendingWhatsNew();
    if (news) whatsNew = new WhatsNewCard(this, news, startEvent, () => markWhatsNewSeen(news));
  }
}
