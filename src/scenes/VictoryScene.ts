/** @file Ending screen after the final boss: hidden message, endless-mode unlock, again / menu input. */
import { texArgs } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { GAME } from '../config/balance';
import { PHOTO_FRAME } from '../config/jokes';
import { FONT } from '../config/style';
import { ENDING_MESSAGE, ENDING_TITLE } from '../content/bosses';
import { summaryShort } from '../content/runStats';
import { END_SCREEN_TEXT, ENDLESS_TEXT } from '../content/lines';
import { usesTouchControls } from '../core/device';
import type { RunOptions } from '../core/run';
import { bindEndScreenInput, padHitArea } from '../ui/endScreenInput';
import { MuteBadge } from '../ui/MuteBadge';
import { createPhotoFrame } from '../ui/PhotoFrame';
import type { GameOverData } from './GameOverScene';

const EMPTY: GameOverData = { score: 0, kills: 0, wave: 0, best: 0, isNewBest: false };

/**
 * The ending. The message under the title is the hidden message from content/bosses.ts.
 * (Friend photos / a proper ending sequence can go here later.)
 */
export class VictoryScene extends Phaser.Scene {
  private data_: GameOverData = EMPTY;

  constructor() {
    super('VictoryScene');
  }

  init(data: GameOverData): void {
    this.data_ = { ...EMPTY, ...data };
  }

  create(): void {
    const { width, height } = GAME;
    const d = this.data_;
    const text = (y: number, str: string, size: number, color = '#ffffff', stroke = 7) =>
      this.add.text(width / 2, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: stroke, align: 'center' }).setOrigin(0.5);

    this.add.tileSprite(0, 0, width, height, ...texArgs(Tex.Grass)).setOrigin(0).setAlpha(0.7);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.35).setOrigin(0);

    const title = text(130, ENDING_TITLE, 96, '#f5c518', 14);
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 500, ease: 'Back.easeOut' });

    const varu = this.add.image(width / 2, 300, ...texArgs(Tex.Varu)).setScale(1.5);
    this.tweens.add({ targets: varu, angle: { from: -10, to: 10 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The group photo for the ending (real picture via PHOTO_MANIFEST, otherwise a "FOTO" silhouette).
    const photo = createPhotoFrame(this, 'ending', PHOTO_FRAME.ending);
    this.tweens.add({ targets: photo, scale: { from: 0, to: 1 }, delay: 500, duration: 450, ease: 'Back.easeOut' });
    new MuteBadge(this, width - 46, 46);

    text(440, ENDING_MESSAGE, 36, '#fff3d6', 7);
    if (d.summary) text(478, summaryShort(d.summary), 22, '#ffd9a8', 5);
    text(515, `Scor: ${d.score}   •   ${d.kills} pisici`, 34);
    if (d.isNewBest) text(558, 'RECORD NOU!', 30, '#9be28f', 6);

    // Endless mode is unlocked by this screen (GameScene saves the flag when the campaign is won).
    const touch = usesTouchControls();
    const endlessText = text(height - 112, touch ? ENDLESS_TEXT.unlockedMenu : ENDLESS_TEXT.victoryButton, 32, '#f5c518', 6);
    const menuText = text(height - 66, touch ? END_SCREEN_TEXT.menuTouch : END_SCREEN_TEXT.menu, touch ? 30 : 24, '#ffffff', 5).setAlpha(0.85);
    // Roomy tap targets around the words (the menu one wins where they overlap, see bindEndScreenInput).
    const endlessButton = padHitArea(this, endlessText, touch ? 60 : 30, touch ? 8 : 6);
    const menuButton = padHitArea(this, menuText, touch ? 70 : 30, touch ? 8 : 6);
    const again = text(height - 26, touch ? END_SCREEN_TEXT.againTouch : END_SCREEN_TEXT.again, 24);
    this.tweens.add({ targets: again, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    const endless: RunOptions = { mode: 'endless' };
    bindEndScreenInput(
      this,
      600,
      { menu: menuButton, endless: endlessButton },
      {
        again: () => this.scene.start('GameScene'),
        menu: () => this.scene.start('MenuScene'),
        endless: () => this.scene.start('GameScene', endless),
      },
      { again: 'R', menu: 'M', endless: 'ENTER' },
    );
  }
}
