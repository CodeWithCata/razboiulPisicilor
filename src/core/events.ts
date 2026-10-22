/** @file The event bus (`bus`), every event name (`Events`) and the payload type of each. Gameplay emits, UI / FX / audio listen. */
import Phaser from 'phaser';
import type { MusicId, SoundId } from '../assets/audioKeys';
import type { BadKind, BeltAttackId, BossType, BuffKind, CrowVariant, EnemyType, PickupKind, ProjectileKind } from '../config/balance';
import type { DebugId } from '../config/debug';
import type { FightReport } from './bossVerdict';
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
  PlayerHurt: 'player:hurt', // PlayerHurtPayload
  PlayerDied: 'player:died',
  SmokeBreak: 'player:smoke', // SmokeBreakPayload (Varu takes a drag of his cigarette)
  BadPickup: 'pickup:bad', // PickupPayload (the question mark gave a BAD pickup: red sparks, shake, word, sad sound; replaces PickupCollected for it)
  BackflipLand: 'player:backflip-land', // PointPayload (the energy drink back flip touched down: ring, dust, shake, word, thud)
  IdleHabit: 'player:habit', // IdleHabitPayload (Varu checks his belt or cracks his neck while standing still)
  EnemyHit: 'enemy:hit', // PointPayload
  EnemyKilled: 'enemy:killed', // EnemyKilledPayload (only when Varu kills it)
  CatBump: 'enemy:bump', // CatBumpPayload (a flung cat slammed into another cat)
  CatPopped: 'enemy:popped', // CatPoppedPayload (a cat that jumped out of a bush or box just landed: it says something cheeky)
  CatCaged: 'bed:caged', // CatCagedPayload (a flung cat was locked in a bed cage: the bed loses its pillow)
  CatReleased: 'bed:released', // CatReleasedPayload (a caged cat got out: the bed rests, then the pillow comes back)
  CatJailed: 'bed:jailed', // CatJailedPayload (the wave ended while a cat was still locked in a bed: it is taken away for good, Varu gets the bonus)
  BedRearmed: 'bed:rearmed', // BedRearmedPayload (the rest is over, the pillow is back and the bed can trap again)
  CatSurrender: 'enemy:surrender', // CatSurrenderPayload (a cat gave up and raised the white flag: its line, the sound, and the HUD's fanfare word)
  LuckySpawn: 'lucky:spawn', // PointPayload (the lucky cat just appeared: gold sparks, a word, the banner, a sound)
  LuckyGone: 'lucky:gone', // PointPayload (she got away: a line and a sound; catching her is a normal EnemyKilled with type 'lucky')
  FanThrow: 'fan:throw', // FanThrowPayload (a fan in the stands let go of something: the whoosh, the crowd cheers)
  BomberArrived: 'bomber:arrived', // PointPayload (the FIRST bomber cat of the run walks in: the crowd shouts, a sting plays)
  PetardSwatted: 'petard:swatted', // PointPayload (Varu's belt knocked a bomber's fresh petard back at her: a cheer, a sound)
  ThrowPetard: 'petard:throw', // ThrowPetardPayload (the bomber cat lobs a petard: FanThrowSystem flies it and sets it off, same as the fans' petards)
  FanLanded: 'fan:landed', // FanLandedPayload (it hit the floor: a gift pops out, or a petard starts to hiss)
  Heartbeat: 'player:heartbeat', // HeartbeatPayload (Varu is low on health: one beat, for the sound and the red edge)
  Explosion: 'fx:explosion', // ExplosionPayload
  Teleport: 'fx:teleport', // TeleportPayload
  SpawnProjectile: 'projectile:spawn', // SpawnProjectilePayload
  ProjectileBlocked: 'projectile:blocked', // PointPayload
  RainbowDrop: 'rainbow:drop', // PointPayload (a bonus pickup dropped under the rainbow: sparkle, sound)
  DodgeRoll: 'dodge:roll', // DodgeRollPayload (Varu starts the dodge: the wind-up crouch begins)
  DodgeLaunch: 'dodge:launch', // DodgeRollPayload (the wind-up is over and he pushes off: dust, whoosh)
  DodgeSave: 'dodge:save', // PointPayload (a hit missed because he was rolling: word, sparks, sound)
  DodgeCooldown: 'dodge:cooldown', // DodgeCooldownPayload (HUD badge)
  ScooterBump: 'scooter:bump', // PointPayload (the scooter shoved a cat out of the way: a word, sparks, a sound)
  IceCream: 'icecream:eaten', // PointPayload (Varu grabbed the ice cream: IceCreamSystem freezes the cats around him)
  IceBlast: 'icecream:blast', // IceBlastPayload (the freeze happened: ring, sparks, a word, a sound)
  UmbrellaBlock: 'umbrella:block', // PointPayload (the umbrella stopped a ball, a shot or a petard: sparks, a word, a sound)
  LightsOut: 'fx:lights-out', // LightsOutPayload (the emo cat turns the lights off / on: Blackout draws the dark, DayNight raises the lamps)
  ProjectileSmash: 'projectile:smash', // ProjectileSmashPayload (every frame a smashing projectile flies: props, barrels and lamps in its way take the hit)
  WaveStarted: 'wave:started', // WavePayload
  WaveCleared: 'wave:cleared', // WavePayload
  WeatherChanged: 'weather:changed', // WeatherPayload (every wave start says what the weather is for that wave, 'clear' too: fog, rain and the weather curses listen)
  ScoreChanged: 'score:changed', // ScorePayload
  PickupCollected: 'pickup:collected', // PickupPayload
  BuffsChanged: 'buffs:changed', // BuffsPayload
  BuffEnded: 'buff:ended', // BuffEndedPayload (a buff ran out by itself; NOT when it is cleared by the debug card or replaced)
  CrowImpact: 'crow:impact', // CrowImpactPayload
  LobBall: 'boss:lob', // LobBallPayload (the tennis cat smashes a ball into the sky; BallLobSystem flies it)
  CurseZone: 'boss:curse', // CurseZonePayload (a boss attack fired a ring that curses Varu if he stands in it)
  BallLanded: 'boss:ball-landed', // BallLandedPayload (a lobbed ball hit the ground: damage, juice, sound)
  SpawnEnemy: 'enemy:spawn', // SpawnEnemyPayload (bosses summoning cats)
  ProjectileDeflected: 'projectile:deflected', // PointPayload
  TennisReturn: 'projectile:returned', // PointPayload (the tennis cat smashed Varu's ball back at him)
  RallyHit: 'projectile:rally', // RallyHitPayload (a tennis ball was hit back again: Varu's swat or a return by a cat; `hits` counts them for this ball)
  BossSpawned: 'boss:spawned', // BossSpawnedPayload
  BossHealth: 'boss:health', // BossHealthPayload
  BossPhase: 'boss:phase', // BossPhasePayload
  BossStunned: 'boss:stunned', // BossStunnedPayload
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
  PropThinned: 'prop:thinned', // PropThinnedPayload (a bush got a size smaller: a few leaves fly)
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
  DebugRun: 'debug:run', // DebugRunPayload (dev only: the card was clicked, GameScene runs that cheat)
  DebugStep: 'debug:step', // DebugStepPayload (dev only: a picker on the card moved to another option)
  BossLab: 'debug:bosslab', // BossLabPayload (dev only: the live duel numbers, and the last verdict)
  CutsceneStart: 'cutscene:start', // CutsceneStartPayload (a cutscene begins: the HUD hides, the overlay scene opens)
  CutsceneEnd: 'cutscene:end', // CutsceneEndPayload (it is over, played or skipped: the HUD comes back, the bars leave)
  CutsceneLine: 'cutscene:line', // CutsceneLinePayload (the director says a line: the overlay types it)
  CutsceneLineEnd: 'cutscene:line-end', // the line is over: the box closes
  CutsceneAdvance: 'cutscene:advance', // the player tapped on a finished line (overlay -> director)
  CutsceneSkip: 'cutscene:skip', // the player held long enough to skip (overlay -> director)
  CutsceneBlip: 'cutscene:blip', // CutsceneBlipPayload (one typed letter: a tiny voice sound)
  CutsceneSfx: 'cutscene:sfx', // CutsceneSfxPayload (a script asks for a sound)
  TutorialStart: 'tutorial:start', // GameScene -> HUD: the intro is over, show the first-run tutorial card (the first wave is held back until it ends)
  TutorialEnd: 'tutorial:end', // HUD -> GameScene: the steps are done or skipped: the first wave may start
  PerfStats: 'perf:stats', // PerfStatsPayload (phones, "Date debug" switch on: fps and walking numbers for ui/PerfPanel.ts)
} as const;

export interface JokePayload extends PointPayload {
  category: JokeCategory;
  text: string;
  channel: JokeChannel;
  color: string;
  size: number;
}

export interface FanThrowPayload extends PointPayload {
  /** Where it lands. `x` / `y` (the base payload) is the fan's hand. */
  toX: number;
  toY: number;
  /** True for the bad item (a petard), false for a gift (a pickup). */
  bad: boolean;
}

/** A cat lobs a petard. `x` / `y` (the base payload) is where it leaves her paw. */
export interface ThrowPetardPayload extends PointPayload {
  /** Where it lands. */
  toX: number;
  toY: number;
  /** The cat that threw it (an Enemy; core cannot import entities). The belt can knock the petard back at her (FAN_THROW.swat). */
  by?: Phaser.GameObjects.GameObject;
}

export interface FanLandedPayload extends PointPayload {
  bad: boolean;
}

export interface CatBumpPayload extends PointPayload {
  /** The cat that got hit. */
  victimType: EnemyType;
}

/** A hide-and-seek cat landed after jumping out of a bush, box or bed. x/y is just above its head. */
export interface CatPoppedPayload extends PointPayload {
  /** The cat came out of a bed: it yawns and says a sleepy line instead of a taunt. */
  sleepy: boolean;
}

/** A cat was trapped in a bed cage. `bedId` is the bed's id (systems/props decides what it is). x/y is the bed's center. */
export interface CatCagedPayload extends PointPayload {
  /** The trapped cat (an Enemy; core cannot import entities, so systems cast it). */
  cat: Phaser.GameObjects.GameObject;
  bedId: number;
}

/** A caged cat got out. `escaped` = it got out by itself (time or hits), false = the bed was destroyed or it was freed some other way. */
export interface CatReleasedPayload extends PointPayload {
  /** The trapped cat (an Enemy; core cannot import entities, so systems cast it). */
  cat: Phaser.GameObjects.GameObject;
  bedId: number;
  escaped: boolean;
}

/** The wave ended with this cat still in a bed cage: it is jailed for good. `points` go to Varu's score (no kill), `pickup` = the bed also drops a pickup. x/y is the bed's center. */
export interface CatJailedPayload extends PointPayload {
  type: EnemyType;
  points: number;
  pickup: boolean;
  bedId: number;
}

/** The bed's rest is over: the pillow is back. */
export interface BedRearmedPayload extends PointPayload {
  bedId: number;
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
  /** Only for pickers: the option now chosen (shown on the card and in its footer). */
  detail?: string;
}

/** The boss lab's numbers for its panel: the duel running now (null = none) and the last finished one. */
export interface BossLabPayload {
  live: FightReport | null;
  last: FightReport | null;
}

export interface DebugRunPayload {
  id: DebugId;
}

export interface DebugStepPayload {
  id: DebugId;
  /** +1 next option, -1 previous. */
  step: number;
}

export interface DebugStatsPayload {
  cats: number;
  wave: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  /** The bad-luck line of the card's strip (weather, cooldown, ramp, greed), already worded. */
  luck: string;
}

export interface DodgeRollPayload extends PointPayload {
  /** The way he rolls (radians). */
  angle: number;
}

export interface DodgeCooldownPayload {
  durationMs: number; // 0 = ready right now
}

export interface TouchPressPayload {
  button: Exclude<BeltAttackId, 'swing'> | 'roll';
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

export interface IceBlastPayload extends PointPayload {
  /** How far the freeze reaches (px). */
  radius: number;
  /** How many cats it froze. */
  frozen: number;
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

export interface PropThinnedPayload extends PointPayload {
  /** How many sizes smaller it is now (1 = first). */
  stage: number;
  /** Which BUSH_VARIANTS look the bush has (the leaves take its color). */
  variant: number;
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
  /** Who made the blast (`'kamikaze'`), so a hit from it can curse Varu (config/curses.ts `CAT_HIT_CURSES`). */
  source?: string;
  radius: number;
  damage: number;
  /** Defaults to true. Friendly blasts (crows) only look cool. */
  harmsPlayer?: boolean;
  /** A boss attack: it also smashes bushes, boxes, rocks... around it. */
  fromBoss?: boolean;
  /** A kamikaze cat's blast: extra shockwave rings, a scorch mark and a "BOOM!" (KAMIKAZE_BLAST). */
  shockwave?: boolean;
  /** Defaults to true: the blast throws a burst of cat fur. False for blasts that are not a cat's (the fans' petard). */
  fur?: boolean;
}

export interface SpawnProjectilePayload extends PointPayload {
  kind: ProjectileKind;
  angle: number; // radians
  speed: number;
  /** A homing heart (see `PROJECTILES.heart.homing`): it follows Varu for a while. */
  homing?: boolean;
  /** v171: damage to props, barrels and lamps in its way (Federer's ball machines). It breaks what it can and flies on; what survives the hit stops it. 0 / missing = it just ends on them like any ball. */
  smashDamage?: number;
}

/** A smashing projectile moved from (prevX, prevY) to (x, y) this frame. Whoever owns something breakable in the way hits it and sets `absorbed` when it survived (the ball is spent). */
export interface ProjectileSmashPayload {
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  absorbed: boolean;
}

export interface WavePayload {
  wave: number;
}

export interface LightsOutPayload {
  on: boolean;
}

/** The weather of a wave: exclusive, one per wave. */
export type WeatherKind = 'clear' | 'fog' | 'rain';

export interface WeatherPayload {
  weather: WeatherKind;
  wave: number;
  /** True on the wave after rain: the rainbow shows and drops bonus pickups (systems/Rainbow.ts). */
  rainbow?: boolean;
}

export interface ScorePayload {
  score: number;
  best: number;
  kills: number;
}

export interface PlayerHurtPayload extends PointPayload {
  /** How much health it took. */
  amount: number;
  /** What hurt him: a cat type (touch), a projectile kind or a blast source. Undefined = something that never curses. */
  source?: string;
}

export interface SmokeBreakPayload extends PointPayload {
  /** True when the pickup's own label already says it (the bad smoke break): no extra line over his head. */
  quiet?: boolean;
}

export interface PickupPayload extends PointPayload {
  kind: PickupKind;
}

export interface BuffInfo {
  kind: BuffKind;
  remainingMs: number;
  durationMs: number;
}

export interface BuffEndedPayload {
  kind: BuffKind;
}

export interface BuffsPayload {
  buffs: BuffInfo[];
}

export interface CrowImpactPayload extends PointPayload {
  variant: CrowVariant;
  radius: number;
}

/** A curse a boss attack carries: which bad pickup and the funny line said when it catches Varu. */
export interface CurseSpec {
  kind: BadKind;
  line: string;
}

export interface CurseZonePayload extends PointPayload {
  radius: number;
  curse: CurseSpec;
}

export interface LobBallPayload extends PointPayload {
  /** Set on the ball that curses Varu if he stands in its ring when it lands (Federer's first ball). */
  curse?: CurseSpec;
  /** Where it lands. `x` / `y` (the base payload) is where the racket sends it up. */
  toX: number;
  toY: number;
  /** How far the landing reaches (px) and how much it hurts Varu. */
  radius: number;
  damage: number;
}

export interface BallLandedPayload extends PointPayload {
  /** Copied from the lobbed ball: the curse it carries (`CurseSystem` reads it). */
  curse?: CurseSpec;
  radius: number;
  damage: number;
}

export interface SpawnEnemyPayload extends PointPayload {
  type: EnemyType;
}

export interface BossStunnedPayload extends PointPayload {
  boss: BossType;
}

/** A tennis ball was hit back again. `hits` = how many times it has been hit back so far (Varu's swats plus returns by a cat or Federer). */
export interface RallyHitPayload extends PointPayload {
  hits: number;
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

export interface CutsceneStartPayload {
  id: string;
  /** Black cinema bars slide in. */
  bars: boolean;
  /** Holding skips it. */
  skippable: boolean;
  /** The HUD fades out while it plays. */
  hideHud: boolean;
}

export interface CutsceneEndPayload {
  id: string;
  skipped: boolean;
}

export interface CutsceneLinePayload {
  /** Counts up per line, so a late tap for an old line is never mistaken for the new one. */
  lineId: number;
  /** A key of SPEAKERS (content/cutscenes.ts). */
  speaker: string;
  text: string;
  /** The line closes by itself (no tap needed). */
  auto: boolean;
}

export interface CutsceneBlipPayload {
  pitch: number;
}

export interface CutsceneSfxPayload {
  id: SoundId;
}

/** Subscribe and get back a function that unsubscribes (call it on scene shutdown). */
export function listen<T>(event: string, fn: (payload: T) => void): () => void {
  bus.on(event, fn);
  return () => bus.off(event, fn);
}
