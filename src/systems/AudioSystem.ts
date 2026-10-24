/** @file ALL sound: listens to the bus, plays synthesized or real sounds and music, owns mute (N) and volumes. Game-lifetime. */
import Phaser from 'phaser';
import { musicKey, sfxKey, type MusicId, type SoundId } from '../assets/audioKeys';
import { AUDIO_MANIFEST, MUSIC_MANIFEST } from '../assets/audioManifest';
import { AUDIO } from '../config/audio';
import { MUSTARD_EGG } from '../config/easterEgg';
import { BAD_PICKUP_FX } from '../config/pickups';
import { PROP_LOOK } from '../config/props';
import { Cooldowns } from '../core/cooldown';
import {
  Events,
  listen,
  type CrowImpactPayload,
  type CutsceneBlipPayload,
  type CutsceneSfxPayload,
  type FanLandedPayload,
  type HeartbeatPayload,
  type IdleHabitPayload,
  type MusicPayload,
  type MustardEggPayload,
  type MutePayload,
  type PropDestroyedPayload,
  type PropHitPayload,
  type VolumePayload,
} from '../core/events';
import { isMuted, toggleMuted } from '../core/mute';
import { getVolume } from '../core/settings';
import { MusicPlayer } from './audio/MusicPlayer';
import { SoundBank } from './audio/SoundBank';
import { speak, stopSpeaking } from './audio/Voice';

interface PlayOptions {
  /** Multiplies the pitch (1 = normal). */
  pitch?: number;
  /** Multiplies the loudness (1 = normal). */
  gain?: number;
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
    sound(Events.BadPickup, 'bonk', { pitch: BAD_PICKUP_FX.pitch }); // the sad version of the pickup jingle
    sound(Events.Explosion, 'explosion');
    sound(Events.ProjectileDeflected, 'deflect');
    sound(Events.TennisReturn, 'deflect', { pitch: 0.8 });
    sound(Events.ProjectileBlocked, 'bonk');
    sound(Events.RainbowDrop, 'pickup', { pitch: 1.5, gain: 0.7 }); // a bright chime per drop
    sound(Events.DodgeLaunch, 'swing', { pitch: 0.7, gain: 0.7 }); // a low whoosh
    sound(Events.DodgeSave, 'deflect', { pitch: 1.6, gain: 0.7 });
    sound(Events.ScooterBump, 'bonk', { pitch: 1.3, gain: 0.8 }); // a light bonk per cat shoved
    sound(Events.IceBlast, 'deflect', { pitch: 1.9, gain: 0.9 }); // a bright icy ping
    sound(Events.UmbrellaBlock, 'deflect', { pitch: 1.4, gain: 0.8 }); // a taut "tok" on the canopy
    sound(Events.BackflipLand, 'bonk', { pitch: 0.7 });
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
      listen(Events.BallLanded, () => this.play('bonk', { pitch: AUDIO.pitch.ballLanded })), // a tennis ball: a higher, lighter bonk
      listen<CrowImpactPayload>(Events.CrowImpact, ({ variant }) => {
        if (variant !== 'miss') this.play('bonk');
        if (variant !== 'golden') this.play('caw');
      }),
      // Bushes, rocks, fences, cans... a little pitch variation so a row of fence pieces never sounds the same twice; harder hits are louder.
      listen<PropHitPayload>(Events.PropHit, ({ kind, power }) => {
        const look = PROP_LOOK[kind];
        this.play(look.sound, { pitch: look.pitch * (0.92 + Math.random() * 0.16), gain: 0.4 + 0.6 * power });
      }),
      listen<PropDestroyedPayload>(Events.PropDestroyed, ({ kind }) => {
        this.play('smash', { pitch: PROP_LOOK[kind].pitch });
        if (kind === 'bush') this.play('rustle', { pitch: 0.8 });
      }),
      listen<IdleHabitPayload>(Events.IdleHabit, ({ habit }) =>
        habit === 'neck' ? this.play('knock', { pitch: 1.7, gain: 0.5 }) : this.play('clank', { pitch: 1.8, gain: 0.35 }),
      ),
      listen(Events.CatBump, () => this.play('bonk', { pitch: AUDIO.pitch.bump })), // a flung cat hits another cat
      listen(Events.FanThrow, () => this.play('swing', { pitch: AUDIO.pitch.fanThrow })), // a fan lets go: a light whoosh
      listen<FanLandedPayload>(Events.FanLanded, ({ bad }) => (bad ? this.play('thud', { pitch: AUDIO.pitch.petardLand }) : this.play('boing', { pitch: AUDIO.pitch.fanGift }))), // a petard thuds, a gift boings
      listen(Events.ThrowPetard, () => this.play('bomberThrow')), // only the bomber cat throws through this event
      listen(Events.PetardSwatted, () => {
        this.play('deflect', { pitch: 1.2 });
        this.play('swing', { pitch: 0.8 });
      }),
      listen(Events.BomberArrived, () => this.play('bossIntro', { pitch: 1.5, gain: 0.8 })),
      listen(Events.CatJailed, () => {
        this.play('clank', { pitch: 0.7 }); // the cell door
        this.play('pickup', { pitch: 1.3 });
      }),
      listen(Events.LuckySpawn, () => this.play('pickup', { pitch: AUDIO.pitch.luckySpawn })), // a bright ding: the lucky cat is here
      listen(Events.LuckyGone, () => this.play('boing', { pitch: AUDIO.pitch.luckyGone })), // and a boing when she gets away
      listen(Events.CatSurrender, () => this.play('miau', { pitch: AUDIO.pitch.surrender })), // a small, high, sad "miau" as the white flag goes up
      listen<HeartbeatPayload>(Events.Heartbeat, ({ intensity }) => this.play('heartbeat', { gain: 0.65 + 0.35 * intensity })),
      listen<CutsceneBlipPayload>(Events.CutsceneBlip, ({ pitch }) => this.play('blip', { pitch })), // a cutscene voice: one chirp per typed letter
      listen<CutsceneSfxPayload>(Events.CutsceneSfx, ({ id }) => this.play(id)), // a cutscene asked for a sound
      listen(Events.PropCracked, () => this.play('thud', { pitch: 0.6 })),
      listen<MustardEggPayload>(Events.MustardEgg, ({ line }) => this.say(line)), // the mustard Easter egg: a voice asks who did it
      listen<MutePayload>(Events.MuteChanged, () => {
        this.applyMute();
        if (isMuted()) stopSpeaking(); // a line being said stops with the mute
      }),
      listen<VolumePayload>(Events.VolumeChanged, ({ kind }) => {
        this.applyVolumes();
        if (kind === 'sfx') this.play('pickup'); // a little "ding" so you can hear the new effects level
      }),
      listen<MusicPayload>(Events.MusicTrack, ({ track }) => this.setTrack(track)),
    );
  }

  /** Play one sound (a real file if there is one, the placeholder otherwise). Rate-limited per sound id. */
  private play(id: SoundId, { pitch = 1, gain = 1 }: PlayOptions = {}): void {
    if (isMuted()) return;
    const now = performance.now();
    if (!this.cooldowns.ready(id, now, AUDIO.minGapMs[id])) return;
    this.cooldowns.mark(id, now);

    const spread = id === 'miau' ? 1 + (Math.random() * 2 - 1) * AUDIO.miauPitchVariance : 1;
    const rate = pitch * spread;
    const volume = AUDIO.volumes[id] * gain;
    if (!Number.isFinite(rate) || !Number.isFinite(volume)) return; // a bad pitch / gain from some caller: skip the sound, never crash

    const files = this.loadedFiles(id);
    if (files.length > 0) {
      this.game.sound.play(files[Math.floor(Math.random() * files.length)]!, { volume: volume * AUDIO.masterVolume * getVolume('sfx'), rate });
      return;
    }
    this.bank?.play(id, rate, volume);
  }

  /** Say a line out loud with the device's voice (`systems/audio/Voice.ts`), at the effects volume the player chose. Nothing when muted. */
  private say(line: string): void {
    if (isMuted()) return;
    const voice = MUSTARD_EGG.voice;
    speak(line, { ...voice, volume: voice.volume * AUDIO.masterVolume * getVolume('sfx') });
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
    stopSpeaking();
    this.off.forEach((f) => f());
    this.off.length = 0;
  }
}
