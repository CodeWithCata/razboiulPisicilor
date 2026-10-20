/** @file Entry point: starts PWA + font loading, then creates the Phaser game (Scale.EXPAND, 1280x720 base) and registers all scenes. */
import Phaser from 'phaser';
import { bindGameSize, GAME_BASE_HEIGHT, GAME_BASE_WIDTH } from './config/balance';
import { usesTouchControls } from './core/device';
import { loadGameFont } from './core/fonts';
import { initPwa, markBootSuccess } from './core/pwa';
import { watchRelayout } from './core/relayout';
import { watchRotateHint } from './core/rotateHint';
import { watchViewport } from './core/viewport';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { mountOfflineToast } from './ui/PwaUi';

// Offline mode (service worker, built game only) and the install question. Must run before the game starts.
initPwa();
mountOfflineToast();
// The font is a small local file: start loading it right now, so it is ready long before BootScene needs it.
void loadGameFont();

// Phones: a long press must not open the browser's context menu (the game uses long presses all the time).
if (usesTouchControls()) window.addEventListener('contextmenu', (event) => event.preventDefault());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // With Scale.EXPAND these two are only the BASE size (16:9). Phaser keeps at least this much on one side and grows the other
  // side until the canvas fills the whole screen, so there are never black bars (see GAME in config/balance.ts).
  width: GAME_BASE_WIDTH,
  height: GAME_BASE_HEIGHT,
  backgroundColor: '#14182b',
  // The canvas is a block (no stray text-line gap under it) and every touch belongs to the game, never to the browser's scroll or zoom.
  canvasStyle: 'display: block; touch-action: none;',
  // smoothStep off: Phaser normally hands the game an AVERAGE of the last frame times. On a phone whose frames come unevenly
  // (8, 8, 16 ms...) that makes Varu advance the same distance every frame, so his speed on screen wobbles. Raw times fix it.
  fps: { smoothStep: false },
  // fullscreenTarget: go fullscreen with #game ITSELF. Without it Phaser wraps the canvas in a new div and fullscreens that, but keeps
  // measuring #game (inset by the notch / home bar), so the canvas stayed smaller than the screen and the rest showed black.
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: 'game' },
  // fixedStep off: physics moves things by the real time of each frame. With the default (60 fixed steps a second) a 90 or 120 Hz
  // phone shows Varu moving only every second frame, which looks choppy, and uneven when the refresh rate wanders.
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: false } },
  input: { activePointers: 4 }, // the move stick + spin + throw + pause at the same time
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, VictoryScene, PauseScene],
});

bindGameSize(game.scale); // GAME.width / GAME.height now follow the real canvas size
watchViewport(game); // phones: follow the visible height (address bar in or out, turning the phone)
watchRelayout(game); // menu and end screens are rebuilt when the screen size changes
watchRotateHint(); // tap on the "turn your phone" page = try fullscreen + landscape (it used to be a dead end)
// Tells the boot error reporter in index.html that the game started (it only reports errors before this).
game.events.once(Phaser.Core.Events.READY, () => {
  (window as unknown as { __varuReady?: boolean }).__varuReady = true;
  markBootSuccess(); // the boot self-repair (index.html) may try again next time something goes wrong
});
