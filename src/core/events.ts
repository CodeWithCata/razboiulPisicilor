import Phaser from 'phaser';
import type { MusicId } from '../assets/audioKeys';
import type { BeltAttackId, BossType, BuffKind, CrowVariant, EnemyType, PickupKind, ProjectileKind } from '../config/balance';
import type { DebugId } from '../config/debug';
import type { JokeCategory, JokeChannel } from '../config/jokes';

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
  EnemyHit: 'enemy:hit', // PointPayload
  EnemyKilled: 'enemy:killed', // EnemyKilledPayload (only when Varu kills it)
  Explosion: 'fx:explosion', // ExplosionPayload
  Teleport: 'fx:teleport', // PointPayload
  SpawnProjectile: 'projectile:spawn', // SpawnProjectilePayload
  ProjectileBlocked: 'projectile:blocked', // PointPayload
  WaveStarted: 'wave:started', // WavePayload
  WaveCleared: 'wave:cleared', // WavePayload
  ScoreChanged: 'score:changed', // ScorePayload
  PickupCollected: 'pickup:collected', // PickupPayload
  BuffsChanged: 'buffs:changed', // BuffsPayload
  CrowImpact: 'crow:impact', // CrowImpactPayload
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

export interface PlayerHealthPayload {
  hp: number;
  maxHp: number;
}

export interface EnemyKilledPayload extends PointPayload {
  type: EnemyType;
  score: number;
}

export interface ExplosionPayload extends PointPayload {
  radius: number;
  damage: number;
  /** Defaults to true. Friendly blasts (crows) only look cool. */
  harmsPlayer?: boolean;
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
