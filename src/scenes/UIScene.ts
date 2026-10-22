/** @file The HUD, running in parallel on top of GameScene; it only listens to events. */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { CUTSCENE } from '../config/cutscene';
import { HUD } from '../config/hud';
import { TOUCH } from '../config/touch';
import { ENDLESS } from '../config/waves';
import { MARTI_13 } from '../config/curses';
import { showWaveFanfare } from '../ui/WaveFanfare';
import { FONT } from '../config/style';
import { ENDLESS_TEXT, LUCKY_TEXT, MARTI_13_TEXT, PICKUP_LABELS, TOUCH_TEXT } from '../content/lines';
import { usesTouchControls } from '../core/device';
import { buzz } from '../core/haptics';
import { getAutoAttack } from '../core/settings';
import { readRun, type RunOptions } from '../core/run';
import { loadBest } from '../core/storage';
import { tutorialWanted } from '../core/tutorial';
import { BeltBadges } from '../ui/BeltBadges';
import { BuffBadges } from '../ui/BuffBadges';
import { CatMeter } from '../ui/CatMeter';
import { MuteBadge } from '../ui/MuteBadge';
import { showBossIntroCard } from '../ui/BossIntroCard';
import { BossLabPanel } from '../ui/BossLabPanel';
import { DebugPanel } from '../ui/DebugPanel';
import { PerfPanel } from '../ui/PerfPanel';
import { BossBar } from '../ui/BossBar';
import { ControlsHint } from '../ui/ControlsHint';
import { LowHpVignette } from '../ui/LowHpVignette';
import { Toast } from '../ui/Toast';
import { Tutorial } from '../ui/Tutorial';
import {
  Events,
  listen,
  type BeltCooldownPayload,
  type BossHealthPayload,
  type BossPhasePayload,
  type BossSpawnedPayload,
  type BuffsPayload,
  type CatSurrenderPayload,
  type HeartbeatPayload,
  type JokePayload,
  type PickupPayload,
  type CutsceneStartPayload,
  type PlayerHealthPayload,
  type ScorePayload,
  type TouchPressPayload,
  type WavePayload,
} from '../core/events';

/** HUD. Runs in parallel on top of GameScene and only listens to events. */
export class UIScene extends Phaser.Scene {
  private catMeter!: CatMeter;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private run: RunOptions = readRun(undefined);
  private bossBar!: BossBar;
  private buffBadges!: BuffBadges;
  private beltBadges!: BeltBadges;
  /** The cats gave up in this wave (Events.CatSurrender): the fanfare then says so instead of "CURĂȚAT!". */
  private surrenderedWave = false;

  constructor() {
    super('UIScene');
  }

  init(data: Partial<RunOptions>): void {
    this.run = readRun(data);
  }

  create(): void {
    this.surrenderedWave = false; // scenes restart with their old fields
    const style = { fontFamily: FONT, color: '#ffffff', stroke: '#1b2340', strokeThickness: HUD.strokeThickness };

    const touch = usesTouchControls();
    const lowHp = new LowHpVignette(this); // first, so it sits behind every other HUD piece
    this.catMeter = new CatMeter(this);
    const toast = new Toast(this);
    // On a phone the speaker sits next to the pause button (top right) instead of under the score.
    if (touch) new MuteBadge(this, HUD.touch.mute.x, HUD.touch.mute.y);
    else new MuteBadge(this, GAME.width - HUD.muteBadge.right, HUD.muteBadge.y);
    this.buffBadges = new BuffBadges(this);
    this.beltBadges = new BeltBadges(this);
    this.bossBar = new BossBar(this);
    this.add.text(HUD.name.x, HUD.name.y, 'VARU', { ...style, fontSize: `${HUD.name.size}px` });
    this.scoreText = this.add.text(GAME.width - HUD.margin, HUD.score.y, 'Scor: 0', { ...style, fontSize: `${HUD.score.size}px` }).setOrigin(1, 0);
    this.bestText = this.add.text(GAME.width - HUD.margin, HUD.best.y, loadBest(this.run.mode) > 0 ? `Record: ${loadBest(this.run.mode)}` : '', { ...style, fontSize: `${touch ? HUD.touch.bestSize : HUD.best.size}px`, strokeThickness: HUD.best.strokeThickness }).setOrigin(1, 0).setAlpha(HUD.best.alpha);
    this.waveText = this.add.text(GAME.width / 2, HUD.wave.y, '', { ...style, fontSize: `${HUD.wave.size}px` }).setOrigin(0.5, 0);
    if (touch) {
      // The reminder is wrapped to fit between the two thumbs and fades away after the first seconds of the run.
      const help = this.add
        .text(GAME.width / 2, GAME.height - HUD.help.bottom, getAutoAttack() ? TOUCH_TEXT.helpAuto : TOUCH_TEXT.help, {
          ...style,
          fontSize: `${HUD.touch.helpSize}px`,
          strokeThickness: HUD.help.strokeThickness,
          align: 'center',
          wordWrap: { width: HUD.touch.helpWidth },
        })
        .setOrigin(0.5, 1)
        .setAlpha(HUD.help.alpha);
      this.tweens.add({ targets: help, alpha: 0, delay: TOUCH.hintMs, duration: TOUCH.hintFadeMs });
    } else {
      new ControlsHint(this);
    }
    if (touch) new PerfPanel(this); // fps and walking numbers, only visible when the pause-menu switch "Date debug" is on
    if (import.meta.env.DEV) new DebugPanel(this, HUD.debugPanel.left, GAME.height - HUD.debugPanel.bottom)
    if (import.meta.env.DEV) new BossLabPanel(this);

    // The first-run tutorial: only in the campaign, only the first time on this device (or with ?tutorial=1). GameScene holds the first wave and sends TutorialStart.
    const tutorial = tutorialWanted(this.run.mode) ? new Tutorial(this, touch) : null;

    // A cutscene hides the whole HUD (this scene's camera fades) and brings it back when it ends.
    this.cameras.main.setAlpha(1);
    const fadeHud = (alpha: number): void => {
      this.tweens.killTweensOf(this.cameras.main);
      this.tweens.add({ targets: this.cameras.main, alpha, duration: CUTSCENE.hud.fadeMs });
    };

    const off = [
      listen<CutsceneStartPayload>(Events.CutsceneStart, (p) => {
        if (p.hideHud) fadeHud(0);
      }),
      listen(Events.CutsceneEnd, () => fadeHud(1)),
      listen(Events.TutorialStart, () => tutorial?.begin()),
      listen<PlayerHealthPayload>(Events.PlayerHealth, ({ hp, maxHp }) => {
        this.catMeter.setHealth(hp, maxHp);
        lowHp.setHealth(hp, maxHp);
      }),
      listen<HeartbeatPayload>(Events.Heartbeat, ({ intensity }) => lowHp.beat(intensity)),
      listen(Events.PlayerHurt, () => {
        this.catMeter.hurt();
        buzz(TOUCH.haptics.hurtMs);
      }),
      listen<TouchPressPayload>(Events.TouchPress, ({ button }) => this.beltBadges.press(button)),
      listen<ScorePayload>(Events.ScoreChanged, ({ score, best }) => {
        this.scoreText.setText(`Scor: ${score}`);
        this.bestText.setText(best > 0 ? `Record: ${best}` : '');
        this.tweens.add({ targets: this.scoreText, scale: { from: HUD.score.popFromScale, to: 1 }, duration: HUD.score.popMs });
      }),
      listen<BeltCooldownPayload>(Events.BeltCooldown, ({ attack, durationMs }) => {
        if (attack === 'swing') return; // the plain swing has no HUD badge
        this.beltBadges.startCooldown(attack, durationMs);
      }),
      listen(Events.BeltThrow, () => {
        this.beltBadges.beltAway();
      }),
      listen<BuffsPayload>(Events.BuffsChanged, ({ buffs }) => {
        this.buffBadges.setBuffs(buffs);
      }),
      listen<PickupPayload>(Events.PickupCollected, ({ kind }) => {
        if (kind === 'crow') this.banner(PICKUP_LABELS.crow, HUD.banner.pickupColor);
      }),
      listen<JokePayload>(Events.Joke, ({ channel, text, color, size }) => {
        if (channel === 'toast') toast.show(text, color, size);
      }),
      listen<BossSpawnedPayload>(Events.BossSpawned, ({ boss, name, hp, maxHp }) => {
        showBossIntroCard(this, boss);
        this.bossBar.show(name, hp, maxHp);
        this.time.delayedCall(HUD.boss.nameBannerDelayMs, () => this.banner(name, HUD.boss.bannerColor, GAME.height / 2 + HUD.boss.bannerYOffset, HUD.boss.bannerSize));
      }),
      listen<BossHealthPayload>(Events.BossHealth, ({ hp, maxHp }) => {
        this.bossBar.setHealth(hp, maxHp);
      }),
      listen<BossPhasePayload>(Events.BossPhase, ({ text }) => this.banner(text, HUD.boss.phaseColor, GAME.height / 2 + HUD.boss.bannerYOffset, HUD.boss.bannerSize)),
      listen(Events.BossDefeated, () => {
        this.bossBar.defeat();
      }),
      listen(Events.LuckySpawn, () => this.banner(LUCKY_TEXT.banner, HUD.banner.luckyColor, GAME.height / 2 + HUD.banner.luckyYOffset, HUD.banner.luckySize)),
      listen<CatSurrenderPayload>(Events.CatSurrender, () => {
        this.surrenderedWave = true;
      }),
      listen<WavePayload>(Events.WaveCleared, ({ wave }) => {
        const surrendered = this.surrenderedWave; // read now: the next wave resets it before the fanfare starts
        this.time.delayedCall(HUD.fanfare.delayMs, () => showWaveFanfare(this, wave, surrendered));
      }),
      listen<WavePayload>(Events.WaveStarted, ({ wave }) => {
        this.surrenderedWave = false;
        const endless = this.run.mode === 'endless';
        this.waveText.setText(endless ? `Valul ${wave} · ${ENDLESS_TEXT.hud}` : `Valul ${wave}`);
        this.banner(`VALUL ${wave}`, HUD.banner.color);
        if (wave === MARTI_13.wave) this.banner(MARTI_13_TEXT.banner, HUD.banner.marti13Color, GAME.height / 2 + HUD.banner.marti13YOffset, HUD.banner.marti13Size);
        if (endless && wave === ENDLESS.startWave) this.banner(ENDLESS_TEXT.banner, HUD.banner.endlessColor, GAME.height / 2 + HUD.banner.endlessYOffset, HUD.banner.endlessSize);
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => off.forEach((f) => f()));
  }

  update(_time: number, delta: number): void {
    this.beltBadges.update(delta);
    this.buffBadges.update(delta);
    this.bossBar.update(delta);
  }

  /** Big centered text that pops in, holds, and fades. */
  private banner(text: string, color: string, y = GAME.height / 2 + HUD.banner.yOffset, size: number = HUD.banner.size): void {
    const b = HUD.banner;
    const label = this.add
      .text(GAME.width / 2, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#1b2340', strokeThickness: Math.round(size / 7) })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: label, alpha: 1, scale: { from: b.fromScale, to: 1 }, duration: b.popInMs, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: label, alpha: 0, delay: b.holdMs, duration: b.fadeOutMs, onComplete: () => label.destroy() }),
    });
  }
}
