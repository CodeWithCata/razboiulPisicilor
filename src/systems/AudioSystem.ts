import Phaser from 'phaser';
import { musicKey, sfxKey, type MusicId, type SoundId } from '../assets/audioKeys';
import { AUDIO_MANIFEST, MUSIC_MANIFEST } from '../assets/audioManifest';
import { AUDIO } from '../config/audio';
import { Cooldowns } from '../core/cooldown';
import {
  Events,
  listen,
  type CrowImpactPayload,
  type MusicPayload,
  type MutePayload,
  type VolumePayload,
} from '../core/events';
import { isMuted, toggleMuted } from '../core/mute';
import { getVolume } from '../core/settings';
import { MusicPlayer } from './audio/MusicPlayer';
import { SoundBank } from './audio/SoundBank';

interface PlayOptions {
  /** Multiplies the pitch (1 = normal). */
  pitch?: number;
}

/**
 * ALL the sound in the game. It only LISTENS to the event bus (entities never play sounds),
 * so adding or changing a sound never touches gameplay code.
 *
 * Each sound id uses a real file when assets/audioManifest.ts lists one that loaded,
 * otherwise a placeholder synthesized with Web Audio (systems/audio/sounds.ts).
 * It lives as long as the game does (created once in BootScene), so the music runs across scenes.
 * N toggles mute (config AUDIO.muteKeyCode); the choice is saved.
 */
export class AudioSystem {
  private readonly ctx: AudioContext | null;
  private readonly master: GainNode | null;
  private readonly musicBus: GainNode | null;
  private readonly sfxBus: GainNode | null;
  private readonly bank: SoundBank | null;
  private readonly music: MusicPlayer | null;
  private readonly cooldowns = new Cooldowns();
  private readonly off: Array<() => void> = [];
  private track: MusicId | null = null;
  private fileMusic: Phaser.Sound.BaseSound | null = null;

  constructor(private readonly game: Phaser.Game) {
    this.ctx = AudioSystem.findContext(game);

    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.bank = new SoundBank(this.ctx, this.sfxBus);
      this.music = new MusicPlayer(this.ctx, this.musicBus);
    } else {
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.bank = null;
      this.music = null;
    }

    this.applyMute();
    this.applyVolumes();
    this.unlockOnFirstInput();
    this.listenToGame();

    const onKey = (e: KeyboardEvent): void => {
      if (e.code === AUDIO.muteKeyCode && !e.repeat) toggleMuted();
    };
    window.addEventListener('keydown', onKey);
    this.off.push(() => window.removeEventListener('keydown', onKey));
    game.events.once(Phaser.Core.Events.DESTROY, () => this.destroy());
  }

  /**
   * The Web Audio context Phaser already made (the synthesized sounds share it), or null when the browser has no Web Audio
   * (then only real audio files can play). Checked by shape, not with `instanceof`, so it can't throw.
   */
  private static findContext(game: Phaser.Game): AudioContext | null {
    const context = (game.sound as unknown as { context?: unknown }).context;
    return typeof AudioContext !== 'undefined' && context instanceof AudioContext ? context : null;
  }

  /** Browsers keep audio locked until the player does something. The first click or key resumes it. */
  private unlockOnFirstInput(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    const unlock = (): void => {
      void ctx.resume().then(() => {
        if (ctx.state === 'running') events.forEach((name) => window.removeEventListener(name, unlock));
      });
    };
    events.forEach((name) => window.addEventListener(name, unlock));
    this.off.push(() => events.forEach((name) => window.removeEventListener(name, unlock)));
  }

  private listenToGame(): void {
    const sound = (event: string, id: SoundId, options?: PlayOptions) =>
      this.off.push(listen(event, () => this.play(id, options)));

    sound(Events.BeltSwing, 'swing');
    sound(Events.BeltSpin, 'swing', { pitch: AUDIO.pitch.spin });
    sound(Events.BeltThrow, 'swing', { pitch: AUDIO.pitch.throw });
    sound(Events.BeltCaught, 'pickup', { pitch: 0.8 });
    sound(Events.PlayerHurt, 'hurt');
    sound(Events.PickupCollected, 'pickup');
    sound(Events.Explosion, 'explosion');
    sound(Events.ProjectileDeflected, 'deflect');
    sound(Events.ProjectileBlocked, 'bonk');
    sound(Events.BossStunned, 'stun');
    sound(Events.BossSpawned, 'bossIntro');
    sound(Events.BossPhase, 'bossIntro', { pitch: 1.25 });
    sound(Events.WaveStarted, 'waveStart');
    sound(Events.Victory, 'victory');
    sound(Events.GameOver, 'gameOver');

    this.off.push(
      listen(Events.EnemyHit, () => {
        this.play('hit');
        if (Math.random() < AUDIO.miauOnHitChance) this.play('miau');
      }),
      listen(Events.EnemyKilled, () => {
        this.play('kill');
        this.play('miau', { pitch: AUDIO.pitch.killMiau });
      }),
      listen(Events.BossDefeated, () => {
        this.play('miau', { pitch: AUDIO.pitch.bossKillMiau });
        this.play('explosion');
      }),
      listen<CrowImpactPayload>(Events.CrowImpact, ({ variant }) => {
        if (variant !== 'miss') this.play('bonk');
        if (variant !== 'golden') this.play('caw');
      }),
      listen<MutePayload>(Events.MuteChanged, () => this.applyMute()),
      listen<VolumePayload>(Events.VolumeChanged, ({ kind }) => {
        this.applyVolumes();
        if (kind === 'sfx') this.play('pickup'); // a little "ding" so you can hear the new effects level
      }),
      listen<MusicPayload>(Events.MusicTrack, ({ track }) => this.setTrack(track)),
    );
  }

  /** Play one sound (a real file if there is one, the placeholder otherwise). Rate-limited per sound id. */
  private play(id: SoundId, { pitch = 1 }: PlayOptions = {}): void {
    if (isMuted()) return;
    const now = performance.now();
    if (!this.cooldowns.ready(id, now, AUDIO.minGapMs[id])) return;
    this.cooldowns.mark(id, now);

    const spread = id === 'miau' ? 1 + (Math.random() * 2 - 1) * AUDIO.miauPitchVariance : 1;
    const rate = pitch * spread;
    const volume = AUDIO.volumes[id];

    const files = this.loadedFiles(id);
    if (files.length > 0) {
      this.game.sound.play(files[Math.floor(Math.random() * files.length)]!, { volume: volume * AUDIO.masterVolume * getVolume('sfx'), rate });
      return;
    }
    this.bank?.play(id, rate, volume);
  }

  /** Cache keys of the real recordings for a sound that actually loaded (a missing file just falls back to the placeholder). */
  private loadedFiles(id: SoundId): string[] {
    const listed = AUDIO_MANIFEST[id] ?? [];
    return listed.map((_path, i) => sfxKey(id, i)).filter((key) => this.game.cache.audio.exists(key));
  }

  private setTrack(track: MusicId | null): void {
    if (track === this.track) return;
    this.track = track;
    this.stopMusic();
    if (track === null || !AUDIO.musicEnabled) return;

    const key = musicKey(track);
    if (MUSIC_MANIFEST[track] && this.game.cache.audio.exists(key)) {
      this.fileMusic = this.game.sound.add(key, { loop: true, volume: this.fileMusicVolume() });
      this.fileMusic.play();
    } else {
      this.music?.play(track);
    }
  }

  private stopMusic(): void {
    this.music?.stop();
    this.fileMusic?.destroy();
    this.fileMusic = null;
  }

  private fileMusicVolume(): number {
    return AUDIO.musicVolume * AUDIO.masterVolume * getVolume('music');
  }

  /** Player volumes (pause menu) on top of the balance numbers in config/audio.ts. */
  private applyVolumes(): void {
    if (this.ctx && this.musicBus && this.sfxBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.setTargetAtTime(AUDIO.musicVolume * getVolume('music'), now, 0.02);
      this.sfxBus.gain.setTargetAtTime(getVolume('sfx'), now, 0.02);
    }
    const file = this.fileMusic;
    if (file && 'volume' in file) (file as Phaser.Sound.BaseSound & { volume: number }).volume = this.fileMusicVolume();
  }

  private applyMute(): void {
    const muted = isMuted();
    this.game.sound.mute = muted; // real files
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.masterVolume, this.ctx.currentTime, 0.02); // synthesized ones
    }
  }

  private destroy(): void {
    this.stopMusic();
    this.off.forEach((f) => f());
    this.off.length = 0;
  }
}
