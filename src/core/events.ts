/** @file The event bus (`bus`), every event name (`Events`) and the payload type of each. Gameplay emits, UI / FX / audio listen. */
import Phaser from 'phaser';
import type { MusicId } from '../assets/audioKeys';
import type { BeltAttackId, BossType, BuffKind, CrowVariant, EnemyType, PickupKind, ProjectileKind } from '../config/balance';
import type { DebugId } from '../config/debug';
import type { JokeCategory, JokeChannel } from '../config/jokes';
import type { AmbientAction, PropKind } from '../config/props';

/**
 * Global event bus. Gameplay code EMITS things that happened ("a cat died"),
 * and other systems (UI, effects, score, audio later) LISTEN.
 * That way adding sound or score never means touching enemy code.
 */
export const bus = new Phaser.Events.EventEmitter();

export const Events = {
  PlayerHealth: 'player:health', // PlayerHealthPayload
  PlayerHurt: 'player:hurt', // PointPayload
  PlayerDied: 'player:died',
  SmokeBreak: 'player:smoke', // PointPayload (Varu takes a drag of his cigarette)
  BackflipLand: 'player:backflip-land', // PointPayload (the energy drink back flip touched down: ring, dust, shake, word, thud)
  IdleHabit: 'player:habit', // IdleHabitPayload (Varu checks his belt or cracks his neck while standing still)
  EnemyHit: 'enemy:hit', // PointPayload
  EnemyKilled: 'enemy:killed', // EnemyKilledPayload (only when Varu kills it)
  CatBump: 'enemy:bump', // CatBumpPayload (a flung cat slammed into another cat)
  CatSurrender: 'enemy:surrender', // CatSurrenderPayload (a cat gave up and raised the white flag: its line, the sound, and the HUD's fanfare word)
  LuckySpawn: 'lucky:spawn', // PointPayload (the lucky cat just appeared: gold sparks, a word, the banner, a sound)
  LuckyGone: 'lucky:gone', // PointPayload (she got away: a line and a sound; catching her is a normal EnemyKilled with type 'lucky')
  Heartbeat: 'player:heartbeat', // HeartbeatPayload (Varu is low on health: one beat, for the sound and the red edge)
  Explosion: 'fx:explosion', // ExplosionPayload
  Teleport: 'fx:teleport', // TeleportPayload
  SpawnProjectile: 'projectile:spawn', // SpawnProjectilePayload
  ProjectileBlocked: 'projectile:blocked', // PointPayload
  WaveStarted: 'wave:started', // WavePayload
  WaveCleared: 'wave:cleared', // WavePayload
  ScoreChanged: 'score:changed', // ScorePayload
  PickupCollected: 'pickup:collected', // PickupPayload
  BuffsChanged: 'buffs:changed', // BuffsPayload
  CrowImpact: 'crow:impact', // CrowImpactPayload
  LobBall: 'boss:lob', // LobBallPayload (the tennis cat smashes a ball into the sky; BallLobSystem flies it)
  BallLanded: 'boss:ball-landed', // BallLandedPayload (a lobbed ball hit the ground: damage, juice, sound)
  SpawnEnemy: 'enemy:spawn', // SpawnEnemyPayload (bosses summoning cats)
  ProjectileDeflected: 'projectile:deflected', // PointPayload
  BossSpawned: 'boss:spawned', // BossSpawnedPayload
  BossHealth: 'boss:health', // BossHealthPayload
  BossPhase: 'boss:phase', // BossPhasePayload
  BossStunned: 'boss:stunned', // PointPayload
  BossShout: 'boss:shout', // ShoutPayload
  BossDefeated: 'boss:defeated', // BossDefeatedPayload
  BeltSwing: 'belt:swing', // BeltAttackPayload
  BeltSpin: 'belt:spin', // BeltAttackPayload
  BeltThrow: 'belt:throw', // BeltAttackPayload (the belt leaves Varu's hand)
  BeltCaught: 'belt:caught', // PointPayload (the thrown belt is back)
  BeltCooldown: 'belt:cooldown', // BeltCooldownPayload (HUD)
  BeltSweep: 'belt:sweep', // BeltSweepPayload (every frame of a swing / spin, so the arena can react)
  BeltFlight: 'belt:flight', // BeltFlightPayload (every frame the thrown belt flies)
  PropHit: 'prop:hit', // PropHitPayload (a bush, rock, fence... was hit: particles, words, sound)
  PropCracked: 'prop:cracked', // PropCrackedPayload (a rock got a new crack)
  PropDestroyed: 'prop:destroyed', // PropDestroyedPayload (a bush, rock, box... was smashed for good)
  ArenaChanged: 'arena:changed', // the solid tiles changed (a prop was destroyed): path finding must rebuild
  PropAmbient: 'prop:ambient', // PropAmbientPayload (a prop does something by itself)
  Victory: 'game:victory',
  GameOver: 'game:over', // Varu is down, the game over screen is on its way
  Joke: 'joke:line', // JokePayload (JokeSystem decided something funny should be said)
  MuteChanged: 'audio:mute', // MutePayload
  MusicTrack: 'audio:music', // MusicPayload (scenes ask for the background track)
  PauseRequest: 'game:pause-request', // touch pause button (the keyboard uses Esc directly)
  TouchPress: 'touch:press', // TouchPressPayload (a touch spin / throw button was tapped: its badge squashes)
  VolumeChanged: 'audio:volume', // VolumePayload (pause menu sliders)
  DebugAction: 'debug:action', // DebugActionPayload (dev only: a cheat just ran, the debug card flashes it)
  DebugStats: 'debug:stats', // DebugStatsPayload (dev only: live numbers for the debug card)
  PerfStats: 'perf:stats', // PerfStatsPayload (phones, "Date debug" switch on: fps and walking numbers for ui/PerfPanel.ts)
} as const;

export interface JokePayload extends PointPayload {
  category: JokeCategory;
  text: string;
  channel: JokeChannel;
  color: string;
  size: number;
}

export interface CatBumpPayload extends PointPayload {
  /** The cat that got hit. */
  victimType: EnemyType;
}

export interface CatSurrenderPayload extends PointPayload {
  /** The cat that gave up. */
  type: EnemyType;
}

export interface IdleHabitPayload extends PointPayload {
  habit: 'belt' | 'neck';
}

export interface HeartbeatPayload {
  /** 0 = just under the low-health line, 1 = almost dead. */
  intensity: number;
}

export interface PerfStatsPayload {
  /** Frames per second over the last window, measured from real frame times. */
  fps: number;
  frameAvgMs: number;
  frameMinMs: number;
  frameMaxMs: number;
  /** Frames over PERF.slowFrameMs, and all frames, in the window. */
  slowFrames: number;
  frames: number;
  /** While walking: frames where Varu did not move at all (stalled) out of all walking frames, and how far he moves per frame (px). */
  walkFrames: number;
  stalledFrames: number;
  stepAvg: number;
  stepMax: number;
  cats: number;
  balls: number;
}

export interface DebugActionPayload {
  id: DebugId;
  /** Only for toggles: the new state. */
  on?: boolean;
}

export interface DebugStatsPayload {
  cats: number;
  wave: number;
}

export interface TouchPressPayload {
  button: Exclude<BeltAttackId, 'swing'>;
}

export interface MutePayload {
  muted: boolean;
}

export interface VolumePayload {
  kind: 'music' | 'sfx';
  /** 0..1 */
  level: number;
}

export interface MusicPayload {
  /** null = silence. */
  track: MusicId | null;
}

export interface PointPayload {
  x: number;
  y: number;
}

export interface BeltAttackPayload extends PointPayload {
  angle: number; // aim direction, radians
}

export interface BeltCooldownPayload {
  attack: BeltAttackId;
  durationMs: number; // 0 = ready right now
}

export interface BeltSweepPayload extends PointPayload {
  /** Where the sweep started and how far it has turned since the current lap began (radians). Same numbers the cats are hit with. */
  startAngle: number;
  swept: number;
  /** Which full turn of a spin this is (0 for a swing); it changes every 360 degrees. */
  lap: number;
  range: number;
  /** True for the spin. */
  spin: boolean;
}

export interface BeltFlightPayload extends PointPayload {
  prevX: number;
  prevY: number;
  radius: number;
}

export interface PropHitPayload extends PointPayload {
  kind: PropKind;
  /** 0..1 */
  power: number;
  /** Unit vector pointing away from whatever hit it. */
  dirX: number;
  dirY: number;
  /** Rolling, landing and soft bumps: sound and a few bits, but no floating word. */
  quiet: boolean;
  /** Bushes only: which BUSH_VARIANTS look it has (leaf colors). */
  variant?: number;
}

export interface PropCrackedPayload extends PointPayload {
  /** 1 = first crack. */
  stage: number;
}

export interface PropDestroyedPayload extends PointPayload {
  kind: PropKind;
  /** Smashed by a boss (charge or blast) instead of by Varu. */
  byBoss: boolean;
  /** Bushes only: which BUSH_VARIANTS look it had. */
  variant?: number;
}

export interface PropAmbientPayload extends PointPayload {
  kind: PropKind;
  action: AmbientAction;
  /** Bushes only: which BUSH_VARIANTS look it has (leaf colors). */
  variant?: number;
}

export interface PlayerHealthPayload {
  hp: number;
  maxHp: number;
}

export interface EnemyKilledPayload extends PointPayload {
  type: EnemyType;
  score: number;
}

export interface TeleportPayload extends PointPayload {
  /** A ninja cat: a bigger puff, and (when it lands) a small word. */
  ninja?: 'out' | 'in';
}

export interface ExplosionPayload extends PointPayload {
  radius: number;
  damage: number;
  /** Defaults to true. Friendly blasts (crows) only look cool. */
  harmsPlayer?: boolean;
  /** A boss attack: it also smashes bushes, boxes, rocks... around it. */
  fromBoss?: boolean;
  /** A kamikaze cat's blast: extra shockwave rings, a scorch mark and a "BOOM!" (KAMIKAZE_BLAST). */
  shockwave?: boolean;
}

export interface SpawnProjectilePayload extends PointPayload {
  kind: ProjectileKind;
  angle: number; // radians
  speed: number;
}

export interface WavePayload {
  wave: number;
}

export interface ScorePayload {
  score: number;
  best: number;
  kills: number;
}

export interface PickupPayload extends PointPayload {
  kind: PickupKind;
}

export interface BuffInfo {
  kind: BuffKind;
  remainingMs: number;
  durationMs: number;
}

export interface BuffsPayload {
  buffs: BuffInfo[];
}

export interface CrowImpactPayload extends PointPayload {
  variant: CrowVariant;
  radius: number;
}

export interface LobBallPayload extends PointPayload {
  /** Where it lands. `x` / `y` (the base payload) is where the racket sends it up. */
  toX: number;
  toY: number;
  /** How far the landing reaches (px) and how much it hurts Varu. */
  radius: number;
  damage: number;
}

export interface BallLandedPayload extends PointPayload {
  radius: number;
  damage: number;
}

export interface SpawnEnemyPayload extends PointPayload {
  type: EnemyType;
}

export interface BossSpawnedPayload {
  boss: BossType;
  name: string;
  hp: number;
  maxHp: number;
}

export interface BossHealthPayload {
  hp: number;
  maxHp: number;
}

export interface BossPhasePayload {
  phase: number;
  text: string;
}

export interface ShoutPayload extends PointPayload {
  text: string;
}

export interface BossDefeatedPayload extends PointPayload {
  boss: BossType;
  final: boolean;
}

/** Subscribe and get back a function that unsubscribes (call it on scene shutdown). */
export function listen<T>(event: string, fn: (payload: T) => void): () => void {
  bus.on(event, fn);
  return () => bus.off(event, fn);
}
