/** @file Dev-only cheats behind the debug card and its keys: spawn cats / bosses (also at the cursor), waves, speed, health, pickups, bad luck, fan throws. */
import Phaser from 'phaser';
import { BUFFS, ENEMIES, isBossType, type BuffKind, type EnemyType } from '../config/balance';
import { COSTLY, MARTI_13 } from '../config/curses';
import { BOSS_LAB, DEBUG, type DebugId } from '../config/debug';
import { BossLab } from './BossLab';
import { BOSS_LAB_TEXT } from '../content/bossLab';
import { debugState } from '../core/debugState';
import type { Boss } from '../entities/bosses/Boss';
import { PICKUP_KINDS } from '../config/pickups';
import type { PickupKind } from '../config/balance';
import { mysteryDebug, type MysteryForce } from './pickupEffects';
import { Tex } from '../assets/keys';
import { DEBUG_CAT_TYPES, DEBUG_CHOICES, debugChoice, debugSetChoice, debugStepChoice } from '../content/debugChoices';
import { DEBUG_SECTIONS, DEBUG_TEXT } from '../content/lines';
import { gameClock } from '../core/clock';
import { downloadTexture } from '../core/downloadTexture';
import { bus, Events, listen, type DebugActionPayload, type DebugRunPayload, type DebugStatsPayload, type DebugStepPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { ArenaMap } from '../world/ArenaMap';
import type { CrowdMood } from '../config/crowd';
import type { WeatherKind } from '../core/events';
import type { BeltSystem } from './BeltSystem';
import type { CurseSystem } from './CurseSystem';
import type { Weather } from './Weather';
import type { FanThrowSystem } from './FanThrowSystem';
import type { PickupSystem } from './PickupSystem';
import type { PowerUpSystem } from './PowerUpSystem';
import type { ScoreSystem } from './ScoreSystem';
import type { SlowMoSystem } from './SlowMoSystem';
import type { SurrenderSystem } from './SurrenderSystem';
import type { WaveSystem } from './WaveSystem';

/** What the cheats need from the run (GameScene hands it over). */
export interface DebugSources {
  arena: ArenaMap;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  waves: WaveSystem;
  score: ScoreSystem;
  belt: BeltSystem;
  powerUps: PowerUpSystem;
  pickups: PickupSystem;
  /** Hands Varu a pickup right now, as if he had grabbed it (announced, then applied). */
  give: (kind: PickupKind) => void;
  /** Bad luck: the weather roll (the card sets it by hand) and the curse gate (sure rolls, cooldown reset, the strip). */
  weather: Weather;
  curses: CurseSystem;
  fanThrow: FanThrowSystem;
  surrender: SurrenderSystem;
  slowMo: SlowMoSystem;
  /** The normal spawn (a spawn point, never next to Varu) and a spawn at an exact spot. */
  spawn: (type: EnemyType) => Enemy;
  spawnAt: (type: EnemyType, x: number, y: number) => Enemy;
  /** Hide and seek on demand: the cat jumps out of a bush or box near Varu. False when no hideout fits on screen. */
  hide: (type: EnemyType) => boolean;
  /** Bed cages: lock a cat in the bed nearest to Varu (false = no ready bed), free every caged cat, re-arm every resting bed (both return how many). */
  cageCat: () => boolean;
  freeCaged: () => number;
  rearmBeds: () => number;
  /** Every shot in the air vanishes (a boss duel starts clean). */
  clearShots: () => void;
}

/**
 * Every dev cheat, one switch (`run`). Keys (`DEBUG_SECTIONS` in content/lines.ts), clicks on the card (`Events.DebugRun`) and the pickers
 * (`Events.DebugStep`) all end up here, and each cheat answers with `Events.DebugAction` so the card flashes it and says what it did.
 * The pickers (which cat, boss, wave, pickup, mood, throw...) keep their option in `debugState` (content/debugChoices.ts).
 */
export class DebugCheats {
  /** Cats stand still (their thinking is skipped: GameScene reads this). */
  frozen = false;
  private atCursor = false;
  /** "Doar acest atac": the boss repeats the attack the picker holds. */
  private loop = false;
  private readonly lab: BossLab;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly src: DebugSources,
  ) {
    const kb = scene.input.keyboard;
    for (const section of DEBUG_SECTIONS) {
      for (const row of section.rows) {
        if (row.code) kb?.on(`keydown-${row.code}`, () => this.run(row.id));
      }
    }
    const digits = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
    DEBUG_CAT_TYPES.forEach((type, i) => {
      kb?.on(`keydown-${digits[i]}`, () => {
        debugSetChoice('spawnCat', type); // the key picks the cat on the card too
        this.run('spawnCat');
      });
    });

    this.lab = new BossLab(scene, { player: src.player, enemies: src.enemies, isFrozen: () => this.frozen });
    for (const code of ['F2', 'F3', 'F4', 'F8', 'F9', 'TAB']) kb?.addCapture(code); // the browser must not take these (find, focus, ...)
    this.applyStoredSpeed();
    this.applyMysteryForce();
    const off = [
      listen<DebugRunPayload>(Events.DebugRun, ({ id }) => this.run(id)),
      listen<DebugStepPayload>(Events.DebugStep, ({ id, step }) => this.step(id, step)),
    ];
    // Live numbers for the card's title bar.
    const stats = scene.time.addEvent({
      delay: DEBUG.statsEveryMs,
      loop: true,
      callback: () => {
        const { player, enemies, waves } = this.src;
        this.applyLoop();
        const payload: DebugStatsPayload = { cats: enemies.countActive(true), wave: waves.wave, hp: player.hp, maxHp: player.maxHp, x: player.x, y: player.y, luck: this.luckStrip() };
        bus.emit(Events.DebugStats, payload);
      },
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      stats.remove();
    });
    if (debugState.autoDuel) scene.time.delayedCall(BOSS_LAB.autoDuelDelayMs, () => this.run('bossDuel')); // a new run starts straight in the duel
  }

  /** Runs one cheat (and tells the boss lab, which keeps a duel with cheats out of its scoreboard). */
  run(id: DebugId): void {
    this.execute(id);
    const toggled: Partial<Record<DebugId, boolean>> = { god: this.src.player.godMode, freeze: this.frozen, curseSure: this.src.curses.debugSure, bossLoop: this.loop };
    this.lab.taint(id, toggled[id] ?? true);
  }

  private execute(id: DebugId): void {
    const { src } = this;
    switch (id) {
      case 'spawnCat': {
        const type = debugChoice('spawnCat').value as EnemyType;
        const n = this.spawnMany(type);
        return this.done(id, undefined, `${debugChoice('spawnCat').label} ×${n}`);
      }
      case 'spawnCount':
      case 'speed':
      case 'bossReport':
        return this.step(id, 1); // cycle rows: a press moves to the next value
      case 'spawnAt':
        this.atCursor = !this.atCursor;
        return this.done(id, this.atCursor);
      case 'hideout': {
        const type = debugChoice('spawnCat').value as EnemyType; // the 1-7 picker says which cat jumps out
        const ok = src.hide(type);
        return this.done(id, undefined, ok ? debugChoice('spawnCat').label : 'nicio tufă sau cutie prin apropiere');
      }
      case 'horde': {
        for (let i = 0; i < DEBUG.hordeSize; i++) this.spawnOne(Phaser.Utils.Array.GetRandom(DEBUG_CAT_TYPES));
        return this.done(id);
      }
      case 'boss': {
        this.spawnOne(debugChoice('boss').value as EnemyType);
        return this.done(id, undefined, debugChoice('boss').label);
      }
      case 'bossDuel':
        return this.duel();
      case 'bossAttack': {
        const boss = this.liveBoss();
        if (!boss) return this.done(id, undefined, BOSS_LAB_TEXT.noBoss);
        const pick = debugChoice('bossAttack').value;
        const started = boss.debugStartAttack(pick === 'all' ? null : pick);
        return this.done(id, undefined, started ? started : BOSS_LAB_TEXT.noAttack);
      }
      case 'bossLoop':
        this.loop = !this.loop;
        this.applyLoop();
        return this.done(id, this.loop, debugChoice('bossAttack').label);
      case 'bossHp': {
        const boss = this.liveBoss();
        if (!boss) return this.done(id, undefined, BOSS_LAB_TEXT.noBoss);
        boss.debugSetHp(Number(debugChoice('bossHp').value));
        return this.done(id, undefined, debugChoice('bossHp').label);
      }
      case 'bossStun': {
        const boss = this.liveBoss();
        if (!boss) return this.done(id, undefined, BOSS_LAB_TEXT.noBoss);
        boss.debugStun();
        return this.done(id);
      }
      case 'bossExport':
        return this.done(id, undefined, this.lab.exportBook());
      case 'bossAuto':
        debugState.autoDuel = !debugState.autoDuel;
        return this.done(id, debugState.autoDuel);
      case 'killAll':
        this.killAll();
        return this.done(id);
      case 'surrender':
        if (src.enemies.countActive(true) === 0) this.spawnOne('normal'); // nothing on the field: bring one cat so there is something to see
        src.surrender.force();
        return this.done(id);
      case 'freeze':
        this.frozen = !this.frozen;
        if (this.frozen) this.eachEnemy((e) => e.setVelocity(0, 0));
        return this.done(id, this.frozen);
      case 'nextWave':
        src.waves.skipToNextWave(gameClock.now);
        return this.done(id);
      case 'jumpWave': {
        const n = Number(debugChoice('jumpWave').value);
        src.waves.jumpToWave(n, gameClock.now); // first: the field empties without a "wave cleared"
        this.killAll();
        return this.done(id, undefined, debugChoice('jumpWave').label);
      }
      case 'holdWaves':
        src.waves.debugHold = !src.waves.debugHold;
        return this.done(id, src.waves.debugHold);
      case 'victory':
        this.done(id);
        bus.emit(Events.Victory); // jump to the ending
        return;
      case 'score':
        src.score.add(DEBUG.scoreBonus);
        return this.done(id);
      case 'god':
        src.player.godMode = !src.player.godMode;
        return this.done(id, src.player.godMode);
      case 'heal':
        src.player.heal(src.player.maxHp);
        return this.done(id);
      case 'setHp':
        src.player.debugSetHealth(Number(debugChoice('setHp').value));
        return this.done(id, undefined, debugChoice('setHp').label);
      case 'teleport': {
        const at = this.cursor();
        const spot = src.arena.grid.nearestOpen(at.x, at.y, src.player.hitRadius + DEBUG.cursorClearancePx);
        src.player.setPosition(spot.x, spot.y).setVelocity(0, 0);
        bus.emit(Events.Teleport, { x: spot.x, y: spot.y });
        return this.done(id);
      }
      case 'cooldowns':
        src.belt.resetCooldowns();
        return this.done(id);
      case 'allBuffs':
        (Object.keys(BUFFS) as BuffKind[]).filter((kind) => !BUFFS[kind].bad).forEach((kind) => src.powerUps.addBuff(kind)); // only the good ones
        return this.done(id);
      case 'pickup':
        src.pickups.spawnNearPlayer(debugChoice('pickup').value as PickupKind);
        return this.done(id, undefined, debugChoice('pickup').label);
      case 'badLuck':
        src.give(debugChoice('badLuck').value as PickupKind);
        return this.done(id, undefined, debugChoice('badLuck').label);
      case 'mysteryPrize':
        this.applyMysteryForce();
        src.pickups.spawnNearPlayer('mystery');
        return this.done(id, undefined, debugChoice('mysteryPrize').label);
      case 'clearBad':
        src.powerUps.clearBad();
        src.player.thaw();
        return this.done(id);
      case 'weather': {
        const picked = debugChoice('weather').value;
        if (picked === 'rainbow') src.weather.set('clear', src.waves.wave, true);
        else src.weather.set(picked as WeatherKind, src.waves.wave); // as if the wave had rolled it: the visual and the weather curse follow
        return this.done(id, undefined, debugChoice('weather').label);
      }
      case 'marti13':
        src.waves.jumpToWave(MARTI_13.wave, gameClock.now);
        this.killAll();
        return this.done(id);
      case 'curseSure':
        src.curses.debugSure = !src.curses.debugSure;
        return this.done(id, src.curses.debugSure);
      case 'curseCooldown':
        src.curses.debugResetCooldown();
        return this.done(id);
      case 'endBuff':
        src.powerUps.debugEnd(debugChoice('endBuff').value as BuffKind);
        return this.done(id, undefined, debugChoice('endBuff').label);
      case 'overuse': {
        const { x, y } = src.player;
        for (let i = 0; i < COSTLY.overuse.uses; i++) bus.emit(Events.BeltSpin, { x, y, angle: 0 }); // the same event a real spin sends
        return this.done(id);
      }
      case 'cageCat':
        return this.done(id, undefined, src.cageCat() ? undefined : 'niciun pat liber');
      case 'freeCat':
        return this.done(id, undefined, `×${src.freeCaged()}`);
      case 'rearmBeds':
        return this.done(id, undefined, `×${src.rearmBeds()}`);
      case 'crowd':
        src.arena.crowd.debugSet(debugChoice('crowd').value as CrowdMood);
        return this.done(id, undefined, debugChoice('crowd').label);
      case 'fanThrow': {
        const [what, kind] = debugChoice('fanThrow').value.split(':') as ['gift' | 'bad', PickupKind | undefined];
        src.fanThrow.force(what, kind && PICKUP_KINDS.includes(kind) ? kind : undefined);
        return this.done(id, undefined, debugChoice('fanThrow').label);
      }
      case 'hitboxes': {
        const world = this.scene.physics.world;
        const show = !world.drawDebug;
        if (!world.debugGraphic) world.createDebugGraphic(); // this also switches drawing on, so `show` was read first
        world.drawDebug = show;
        if (!show) world.debugGraphic.clear();
        return this.done(id, show);
      }
      case 'tileset':
        downloadTexture(this.scene.textures, Tex.Tileset, 'arena_tiles.png');
        return this.done(id);
    }
  }

  /** A picker moves by `step` options. Some pickers act at once (game speed); the rest are read the next time their cheat runs. */
  private step(id: DebugId, step: number): void {
    if (!DEBUG_CHOICES[id]) return;
    debugStepChoice(id, step);
    if (id === 'speed') {
      this.applyStoredSpeed();
      this.lab.taint(id);
    }
    if (id === 'mysteryPrize') this.applyMysteryForce();
    if (id === 'boss') {
      debugState.choice.bossAttack = 0; // another boss has other attacks
      this.done('bossAttack', undefined, debugChoice('bossAttack').label);
    }
    this.done(id, undefined, debugChoice(id).label);
  }

  /** What the question mark gives, as the card's picker says (also at the start of a new run, so the card never lies). */
  private applyMysteryForce(): void {
    const value = debugChoice('mysteryPrize').value;
    mysteryDebug.force = value === 'random' ? null : (value as MysteryForce);
  }

  /** The game speed the card holds (a new run starts from it too, so the card never lies). */
  private applyStoredSpeed(): void {
    this.src.slowMo.setDebugSpeed(Number(debugChoice('speed').value));
  }

  /** Tells the card that a cheat ran (it flashes the key and says so in its footer). `on` is only for toggles, `detail` for pickers. */
  private done(id: DebugId, on?: boolean, detail?: string): void {
    const payload: DebugActionPayload = { id, on, detail };
    bus.emit(Events.DebugAction, payload);
  }

  /* ------------------------------------------------------------ helpers */

  /** Weather, curse cooldown, wave ramp and greed in one short piece of text for the card's title strip. */
  private luckStrip(): string {
    const { curses, weather } = this.src;
    const T = DEBUG_TEXT;
    const cd = curses.cooldownLeftSec;
    return T.luck
      .replace('{weather}', T.weatherNames[weather.current])
      .replace('{cooldown}', cd > 0 ? `${cd}s` : T.luckReady)
      .replace('{ramp}', String(Math.round(curses.waveFactor * 100)))
      .replace('{greed}', curses.greedFactor > 1 ? T.greed : '');
  }

  private eachEnemy(fn: (enemy: Enemy) => void): void {
    for (const child of this.src.enemies.getChildren().slice()) fn(child as Enemy);
  }

  /** The boss on the field, if any. */
  private liveBoss(): Boss | null {
    return this.lab.liveBoss();
  }

  /** "Doar acest atac": the boss gets the picked attack as its only one (none while the picker says "Oricare"). */
  private applyLoop(): void {
    const boss = this.liveBoss();
    if (!boss) return;
    const pick = debugChoice('bossAttack').value;
    boss.debugOnly = this.loop && pick !== 'all' ? pick : null;
  }

  /**
   * A clean duel: the field empties, shots vanish, Varu is whole and back at his start, waves stop, and the picked boss walks in.
   * The lab starts counting when the boss appears (`BossSpawned`).
   */
  private duel(): void {
    const { src } = this;
    const type = debugChoice('boss').value as EnemyType;
    this.killAll(); // abandons the old duel first
    src.clearShots();
    src.powerUps.clearBad();
    src.player.thaw();
    src.player.heal(src.player.maxHp);
    src.belt.resetCooldowns();
    const start = src.arena.spawns.player;
    if (start) {
      const spot = src.arena.grid.nearestOpen(start.x, start.y, src.player.hitRadius + DEBUG.cursorClearancePx);
      src.player.setPosition(spot.x, spot.y).setVelocity(0, 0);
    }
    src.waves.debugHold = true; // no waves, no victory screen after the final boss
    this.done('holdWaves', true);
    src.spawn(type);
    this.done('bossDuel', undefined, debugChoice('boss').label);
  }

  private killAll(): void {
    this.lab.abandon(); // a boss killed by a cheat is not a won duel
    const { player } = this.src;
    this.eachEnemy((e) => e.takeDamage(999, player.x, player.y, 0));
  }

  /** The mouse cursor in the arena. */
  private cursor(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    pointer.updateWorldPoint(this.scene.cameras.main);
    return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
  }

  /** One cat (or boss) at a normal spawn point, or on the cursor when "Apar la cursor" is on. */
  private spawnOne(type: EnemyType, spread = 0): Enemy {
    if (!this.atCursor) return this.src.spawn(type);
    const at = this.cursor();
    const x = at.x + Phaser.Math.FloatBetween(-spread, spread);
    const y = at.y + Phaser.Math.FloatBetween(-spread, spread);
    const spot = this.src.arena.grid.nearestOpen(x, y, ENEMIES[type].hitRadius);
    const enemy = this.src.spawnAt(type, spot.x, spot.y);
    if (isBossType(type)) bus.emit(Events.Teleport, { x: enemy.x, y: enemy.y });
    return enemy;
  }

  /** As many cats as the "Câte deodată" picker says; on the cursor they are spread a little so they don't stack. */
  private spawnMany(type: EnemyType): number {
    const n = Number(debugChoice('spawnCount').value);
    for (let i = 0; i < n; i++) this.spawnOne(type, n > 1 ? 24 + n * 3 : 0);
    return n;
  }
}
