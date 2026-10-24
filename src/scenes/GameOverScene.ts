/** @file Game over screen: score, kills, wave, best; again / menu input. A custom game also ends here (won or lost): no record, and a way back to its setup screen. */
import { texArgs } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { GAME } from '../config/balance';
import type { CustomSetup } from '../config/customGame';
import { PHOTO_FRAME } from '../config/jokes';
import { FONT } from '../config/style';
import { CUSTOM_TEXT } from '../content/customGame';
import { summaryLines, type RunSummary } from '../content/runStats';
import { END_SCREEN_TEXT, ENDLESS_TEXT, GAME_OVER_LINES, GAME_OVER_TITLE, pick } from '../content/lines';
import { usesTouchControls } from '../core/device';
import type { RunMode, RunOptions } from '../core/run';
import { createPhotoFrame } from '../ui/PhotoFrame';
import { bindEndScreenInput, padHitArea } from '../ui/endScreenInput';
import { MuteBadge } from '../ui/MuteBadge';

export interface GameOverData {
  score: number;
  kills: number;
  wave: number;
  best: number;
  isNewBest: boolean;
  /** Which way this run was played (so "again" starts the same kind of run). */
  mode?: RunMode;
  /** Custom games: the setup this run played, so "again" plays the same one. */
  custom?: CustomSetup;
  /** A custom game that was won (every wave held). Campaign wins go to the victory screen instead. */
  won?: boolean;
  /** Time, best combo, hits... of the run (GameScene.endData). */
  summary?: RunSummary;
}

const EMPTY: GameOverData = { score: 0, kills: 0, wave: 0, best: 0, isNewBest: false };

export class GameOverScene extends Phaser.Scene {
  private data_: GameOverData = EMPTY;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverData): void {
    this.data_ = { ...EMPTY, ...data };
  }

  create(): void {
    const { width, height } = GAME;
    const d = this.data_;
    const text = (y: number, str: string, size: number, color = '#ffffff', stroke = 7) =>
      this.add.text(width / 2, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: stroke, align: 'center' }).setOrigin(0.5);

    this.add.tileSprite(0, 0, width, height, ...texArgs(Tex.Grass)).setOrigin(0).setAlpha(0.45);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0);

    const custom = d.mode === 'custom';
    const won = custom && d.won === true;
    const title = won ? text(150, CUSTOM_TEXT.winTitle, 88, '#9be28f', 12) : text(150, GAME_OVER_TITLE, 88, '#fff3d6', 12);
    this.tweens.add({ targets: title, scale: { from: 0.6, to: 1 }, duration: 380, ease: 'Back.easeOut' });
    text(222, won ? CUSTOM_TEXT.winLine : pick(GAME_OVER_LINES), 28, '#ffd9a8', 5);

    text(330, `Scor: ${d.score}`, 64, '#f5c518', 10);
    text(405, `Valul ${d.wave}   •   ${d.kills} pisici`, 32);
    if (d.mode === 'endless') text(264, ENDLESS_TEXT.gameOverTitle, 26, '#f5c518', 5);
    if (custom) text(264, CUSTOM_TEXT.gameOverTag, 26, '#c9a7ff', 5);
    if (!custom) text(455, d.isNewBest ? 'RECORD NOU!' : `Record: ${d.best}`, 30, d.isNewBest ? '#9be28f' : '#ffffff', 6); // a custom game has no record

    if (d.summary) {
      const [first, second] = summaryLines(d.summary);
      text(498, first, 24, '#ffd9a8', 5);
      text(530, second, 22, '#ffffff', 5).setAlpha(0.9);
    }

    // Friend photo slot (real picture via PHOTO_MANIFEST, otherwise a "FOTO" silhouette).
    const photo = createPhotoFrame(this, 'gameOver', PHOTO_FRAME.gameOver);
    this.tweens.add({ targets: photo, scale: { from: 0, to: 1 }, delay: 250, duration: 420, ease: 'Back.easeOut' });
    new MuteBadge(this, width - 46, 46);

    const touch = usesTouchControls();
    const prompt = text(height - 150, touch ? END_SCREEN_TEXT.againTouch : END_SCREEN_TEXT.again, 36);
    const menuText = text(height - 90, touch ? END_SCREEN_TEXT.menuTouch : END_SCREEN_TEXT.menu, touch ? 34 : 24, '#ffffff', 5).setAlpha(0.85);
    const menuButton = padHitArea(this, menuText, touch ? 70 : 30, touch ? 16 : 8); // a roomy tap target around the little word
    this.tweens.add({ targets: prompt, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    const again: RunOptions = custom ? { mode: 'custom', custom: d.custom } : { mode: d.mode ?? 'campaign' };
    // A custom game: Enter (or a tap on the small line under the menu word) goes back to the setup screen, through the slot the victory screen uses for endless.
    const editText = custom ? text(height - (touch ? 22 : 40), touch ? CUSTOM_TEXT.editRulesTouch : CUSTOM_TEXT.editRules, touch ? 28 : 22, '#c9a7ff', 5).setAlpha(0.9) : null;
    const editButton = editText ? padHitArea(this, editText, touch ? 70 : 30, touch ? 10 : 6) : undefined;
    bindEndScreenInput(
      this,
      500, // so a frantic click from the fight doesn't skip this screen
      { menu: menuButton, endless: editButton },
      { again: () => this.scene.start('GameScene', again), menu: () => this.scene.start('MenuScene'), endless: custom ? () => this.scene.start('CustomGameScene') : undefined },
      { again: 'R', menu: 'M', endless: 'ENTER' },
    );
  }
}
