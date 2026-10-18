import Phaser from 'phaser';
import { ARENA_RULES, CAMERA, WORLD } from '../config/arena';
import { PAUSE, PAUSE_KEYS } from '../config/pause';
import { BELT, BOSS_TYPES, BUFFS, ENEMIES, WAVE_TIMING, isBossType, type BuffKind, type EnemyType } from '../config/balance';
import type { DebugId } from '../config/debug';
import { DEBUG } from '../config/debug';
import { TOUCH } from '../config/touch';
import { PICKUP_KINDS } from '../config/pickups';
import { Tex } from '../assets/keys';
import { VARU_LINES, WAVE_CLEARED_LINES, pick } from '../content/lines';
import { usesTouchControls } from '../core/device';
import { readRun, type RunOptions } from '../core/run';
import { gameClock } from '../core/clock';
import { saveEndlessUnlocked } from '../core/storage';
import { downloadTexture } from '../core/downloadTexture';
import { bus, Events, listen, type BossDefeatedPayload, type DebugActionPayload, type DebugStatsPayload, type ExplosionPayload, type MusicPayload, type PerfStatsPayload, type SpawnEnemyPayload } from '../core/events';
import { FlowField } from '../core/flowField';
import { Enemy, type EnemyContext } from '../entities/Enemy';
import { createEnemy } from '../entities/enemies';
import { Player } from '../entities/Player';
import type { InputSource } from '../input/InputSource';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { AutoAim } from '../input/touch/AutoAim';
import { TouchInput } from '../input/touch/TouchInput';
import { PERF } from '../config/perf';
import { getDebugInfo } from '../core/settings';
import { PerfMonitor } from '../systems/PerfMonitor';
import { retryFullscreenOnTap } from '../core/fullscreen';
import { TouchOverlay } from '../input/touch/TouchOverlay';
import { BeltSystem } from '../systems/BeltSystem';
import { CrowRainSystem } from '../systems/CrowRainSystem';
import { Effects } from '../systems/Effects';
import { HitStop } from '../systems/HitStop';
import { JokeSystem } from '../systems/JokeSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { applyPickup } from '../systems/pickupEffects';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { ArenaMap } from '../world/ArenaMap';
import { pickEnemySpawn } from '../world/spawns';
import type { GameOverData } from './GameOverScene';

/** Wires the systems together. Rules live in the systems, not here. */
export class GameScene extends Phaser.Scene {
  private arena!: ArenaMap;
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private input_!: InputSource;
  private touchOverlay: TouchOverlay | null = null;
  private touchInput: TouchInput | null = null;
  private readonly perf = new PerfMonitor();
  private belt!: BeltSystem;
  private effects!: Effects;
  private projectiles!: ProjectileSystem;
  private waves!: WaveSystem;
  private score!: ScoreSystem;
  private powerUps!: PowerUpSystem;
  private crowRain!: CrowRainSystem;
  private pickups!: PickupSystem;
  private enemyContext!: EnemyContext;
  /** Walking distances to whatever the cats chase (Varu or the laser dot). */
  private flow!: FlowField;
  private debugPickupIndex = 0;
  private debugBossIndex = 0;
  private hitStop!: HitStop;
  private run: RunOptions = readRun(undefined);
  private gameOver = false;

  constructor() {
    super('GameScene');
  }

  /** `{ mode: 'endless' }` starts the endless run (unlocked by winning). No data = the normal campaign. */
  init(data: Partial<RunOptions>): void {
    this.run = readRun(data);
  }

  create(): void {
    this.gameOver = false;
    gameClock.reset(this.time.now); // game time starts here; it stops while the pause menu is open
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.arena = new ArenaMap(this); // the Tiled map (or a plain grass field if it can't load)

    // Phones and tablets get the touch controls (one move stick, Varu fights by himself); computers keep keyboard + mouse. Gameplay only sees InputSource.
    this.touchOverlay = null;
    this.touchInput = null;
    if (usesTouchControls()) {
      const touch = new TouchInput(this);
      this.touchInput = touch;
      this.input_ = touch;
      this.touchOverlay = new TouchOverlay(this, touch);
      if (TOUCH.fullscreenOnStart) retryFullscreenOnTap(this); // the menu's first try may have been refused
    } else {
      this.input_ = new KeyboardMouseInput(this);
    }
    const start = this.arena.spawns.player ?? { x: WORLD.width / 2, y: WORLD.height / 2 };
    this.player = new Player(this, start.x, start.y);
    // The world is bigger than the screen: the camera follows Varu and never shows what is outside the world.
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height).startFollow(this.player, CAMERA.roundPixels, CAMERA.lerp, CAMERA.lerp);
    this.enemies = this.physics.add.group();
    this.arena.collidePlayer(this.player);
    this.arena.collideEnemies(this.enemies, (enemy) => !(enemy as Enemy).flies); // flying cats pass over walls
    this.projectiles = new ProjectileSystem(this, this.player, this.enemies, this.arena.grid);
    this.belt = new BeltSystem(this, this.player, this.enemies, this.projectiles.group, this.arena.grid);
    // On a phone Varu turns to the nearest cat and swings by himself (and swats balls that fly at him): only the walking is up to the thumb.
    if (this.touchInput) {
      this.touchInput.assist = new AutoAim({
        enemies: this.enemies,
        projectiles: this.projectiles.group,
        reach: () => BELT.range * this.player.rangeMultiplier,
      });
    }
    this.effects = new Effects(this, () => this.player.goldenBelt);
    this.score = new ScoreSystem(this, this.run.mode);
    this.hitStop = new HitStop(this);
    this.powerUps = new PowerUpSystem(this, this.player);
    new JokeSystem(this, () => ({ x: this.player.x, y: this.player.y }));
    this.crowRain = new CrowRainSystem(this, this.enemies, this.arena.grid);
    this.pickups = new PickupSystem(this, this.player, this.arena.grid, (kind) =>
      applyPickup(kind, { player: this.player, powerUps: this.powerUps, crowRain: this.crowRain }),
    );
    this.enemyContext = { player: this.player, lure: null };
    this.flow = new FlowField(this.arena.grid);
    this.waves = new WaveSystem((type) => this.spawn(type), () => this.enemies.countActive(true), this.run.mode);

    // Phones, "Date debug" switch on: every half second send the measured fps and walking numbers to the card (ui/PerfPanel.ts).
    this.time.addEvent({
      delay: PERF.everyMs,
      loop: true,
      callback: () => {
        const sample = this.perf.take(); // always, so the window restarts
        if (!sample || !getDebugInfo()) return;
        const payload: PerfStatsPayload = { ...sample, cats: this.enemies.countActive(true), balls: this.projectiles.group.countActive(true) };
        bus.emit(Events.PerfStats, payload);
      },
    });

    // Cats push each other apart (flying cats pass over); touching a cat hurts Varu.
    this.physics.add.collider(this.enemies, this.enemies, undefined, (a, b) => !(a as Enemy).flies && !(b as Enemy).flies);
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const enemy = e as Enemy;
      if (enemy.contactDamage > 0) this.player.takeDamage(enemy.contactDamage, enemy.x, enemy.y);
    });

    const off = [
      listen(Events.PlayerDied, () => this.onPlayerDied()),
      listen(Events.PauseRequest, () => this.openPause()),
      listen<ExplosionPayload>(Events.Explosion, (e) => this.onExplosion(e)),
      listen<SpawnEnemyPayload>(Events.SpawnEnemy, ({ type, x, y }) => {
        if (this.gameOver || this.enemies.countActive(true) >= WAVE_TIMING.maxAliveWithSummons) return;
        const spot = this.arena.grid.nearestOpen(x, y, ENEMIES[type].hitRadius); // never inside a wall
        this.addEnemy(type, spot.x, spot.y);
        bus.emit(Events.Teleport, { x: spot.x, y: spot.y }); // puff of smoke
      }),
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ final }) => {
        if (final) this.scatterCats();
      }),
      listen(Events.Victory, () => this.onVictory()),
      listen(Events.EnemyKilled, () => {
        if (Math.random() < 0.18) this.effects.floatText(this.player.x, this.player.y - 50, pick(VARU_LINES), '#f5c518', 24);
      }),
      listen<{ wave: number }>(Events.WaveCleared, () => {
        this.player.heal(WAVE_TIMING.clearHeal);
        this.effects.floatText(this.player.x, this.player.y - 56, pick(WAVE_CLEARED_LINES), '#9be28f', 26);
      }),
    ];

    this.scene.launch('UIScene', this.run);
    const music: MusicPayload = { track: 'fight' };
    bus.emit(Events.MusicTrack, music);
    this.setupPause();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      this.scene.stop('UIScene');
    });

    if (import.meta.env.DEV) this.setupDebugKeys();
  }

  update(time: number, delta: number): void {
    const now = gameClock.advance(time); // every timer in the game runs on this clock, not on `time`
    if (this.gameOver) return;
    // Camera snappiness per frame, from the real frame time: the same speed at any refresh rate (and when it wanders).
    const frames = Math.min(delta, CAMERA.maxStepMs) / (1000 / CAMERA.referenceFps);
    const lerp = 1 - (1 - CAMERA.lerp) ** frames;
    this.cameras.main.setLerp(lerp, lerp);
    this.input_.update(this.player);
    this.perf.record(time, this.player.x, this.player.y, this.input_.move.lengthSq() > 0);
    this.touchOverlay?.update();
    this.player.tick(this.input_);
    this.belt.update(now, delta, this.input_);
    this.powerUps.update(now, this.input_);
    this.enemyContext.lure = this.openLure(this.powerUps.lure);
    const chased = this.enemyContext.lure ?? this.player;
    this.flow.setTarget(chased.x ?? 0, chased.y ?? 0);
    // A copy, because cats can add or remove cats while they think (summons, explosions).
    for (const child of this.enemies.getChildren().slice()) {
      const enemy = child as Enemy;
      if (enemy.active) enemy.tick(now, delta, this.enemyContext);
    }
    this.keepOutOfWalls();
    this.projectiles.update(now, delta);
    this.crowRain.update(now);
    this.pickups.update(now);
    this.waves.update(now);
  }

  /**
   * Bosses appear at the map's boss point, cats at one of its enemy points (never right next to Varu).
   * Without a map they fall back to the old logic: boss near the top center, cats outside a random screen edge.
   */
  private spawn(type: EnemyType): Enemy {
    const radius = ENEMIES[type].hitRadius;

    if (isBossType(type)) {
      const at = this.arena.spawns.boss ?? { x: WORLD.width / 2, y: 90 };
      const spot = this.arena.grid.nearestOpen(at.x, at.y, radius);
      const boss = this.addEnemy(type, spot.x, spot.y);
      bus.emit(Events.Teleport, { x: boss.x, y: boss.y });
      return boss;
    }

    const point = pickEnemySpawn(
      this.arena.spawns.enemies,
      this.player,
      ARENA_RULES.minSpawnDistanceFromPlayer,
      ARENA_RULES.maxSpawnDistanceFromPlayer,
    );
    if (point) {
      const spot = this.arena.grid.nearestOpen(point.x, point.y, radius);
      return this.addEnemy(type, spot.x, spot.y);
    }

    const m = ARENA_RULES.edgeSpawnMargin;
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? -m : side === 1 ? WORLD.width + m : Phaser.Math.Between(0, WORLD.width);
    const y = side === 2 ? -m : side === 3 ? WORLD.height + m : Phaser.Math.Between(0, WORLD.height);
    return this.addEnemy(type, x, y);
  }

  private addEnemy(type: EnemyType, x: number, y: number): Enemy {
    const enemy = createEnemy(this, type, x, y);
    enemy.setObstacles(this.arena.grid);
    enemy.setFlow(this.flow);
    this.enemies.add(enemy);
    return enemy;
  }

  /** The final boss falls and every cat still standing collapses with her. */
  private scatterCats(): void {
    for (const child of this.enemies.getChildren().slice()) {
      (child as Enemy).takeDamage(999, this.player.x, this.player.y, 0);
    }
  }

  /** The laser dot can be dragged over a wall: cats then gather at the nearest open spot instead of pushing into the wall. */
  private openLure(lure: Phaser.Types.Math.Vector2Like | null): Phaser.Types.Math.Vector2Like | null {
    if (!lure) return null;
    const x = lure.x ?? 0;
    const y = lure.y ?? 0;
    return this.arena.grid.isSolidAt(x, y) ? this.arena.grid.nearestOpen(x, y, 0) : lure;
  }

  /** Safety net: knockback or a teleport can leave something inside a wall. Move it to the nearest open spot. */
  private keepOutOfWalls(): void {
    this.arena.rescue(this.player, this.player.hitRadius);
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (enemy.active && !enemy.flies) this.arena.rescue(enemy, enemy.hitRadius);
    }
  }

  private onExplosion({ x, y, radius, damage, harmsPlayer }: ExplosionPayload): void {
    const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (harmsPlayer !== false && dist <= radius + this.player.hitRadius) this.player.takeDamage(damage, x, y);
  }

  private onPlayerDied(): void {
    this.gameOver = true;
    this.hitStop.stop(); // before the physics pause below, so the freeze can't un-pause it
    this.waves.stop();
    this.physics.pause();
    const silence: MusicPayload = { track: null };
    bus.emit(Events.MusicTrack, silence);
    bus.emit(Events.GameOver);

    // Quick "knocked out" spin, then on to the game over screen.
    this.tweens.add({ targets: this.player, angle: this.player.angle + 540, scale: 0.2, alpha: 0, duration: 800, ease: 'Cubic.easeIn' });
    const data: GameOverData = {
      score: this.score.score,
      kills: this.score.kills,
      wave: this.waves.wave,
      best: this.score.best,
      isNewBest: this.score.finish(),
      mode: this.run.mode,
    };
    this.time.delayedCall(950, () => this.scene.start('GameOverScene', data));
  }

  private onVictory(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.hitStop.stop();
    this.physics.pause();
    if (this.run.mode === 'campaign') saveEndlessUnlocked();
    const silence: MusicPayload = { track: null };
    bus.emit(Events.MusicTrack, silence);
    const data: GameOverData = {
      score: this.score.score,
      kills: this.score.kills,
      wave: this.waves.wave,
      best: this.score.best,
      isNewBest: this.score.finish(),
      mode: this.run.mode,
    };
    this.time.delayedCall(1300, () => this.scene.start('VictoryScene', data));
  }

  /** Esc opens the pause menu; so does losing window focus. GameScene and UIScene freeze, PauseScene draws on top. */
  private setupPause(): void {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && PAUSE_KEYS.close.includes(e.code)) this.openPause();
    });

    // A paused scene never sees key-up events, so a key held while pausing would stay "down" after resuming.
    const onResume = (): void => {
      this.input.keyboard?.resetKeys();
      gameClock.skipNextStep(); // the time spent in the pause menu is not game time
    };
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);

    const onBlur = (): void => this.openPause();
    if (PAUSE.pauseOnBlur) this.game.events.on(Phaser.Core.Events.BLUR, onBlur);

    // A phone turned upright: the page shows a "turn your phone" note, so pause instead of playing blind.
    const portrait = window.matchMedia('(orientation: portrait)');
    const onTurn = (e: MediaQueryListEvent): void => {
      if (e.matches) this.openPause();
    };
    const watchPortrait = PAUSE.pauseOnPortrait && usesTouchControls();
    if (watchPortrait) portrait.addEventListener('change', onTurn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      if (watchPortrait) portrait.removeEventListener('change', onTurn);
    });
  }

  private openPause(): void {
    if (this.gameOver || this.scene.isPaused() || !this.scene.isActive()) return;
    this.hitStop.cancel();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('PauseScene', this.run);
  }

  /** Tells the debug card that a cheat ran (it flashes the key and says so in its footer). `on` is only for toggles. */
  private debugDone(id: DebugId, on?: boolean): void {
    const payload: DebugActionPayload = { id, on };
    bus.emit(Events.DebugAction, payload);
  }

  /**
   * Dev-only helpers (the card in ui/DebugPanel.ts lists them): 1-5 spawn a cat type, X horde, K kill all, B cycle bosses,
   * L next wave, V victory screen, J +score, G god mode, F full heal, C reset belt cooldowns, U all power-ups,
   * P cycle pickups, Y toggle hitboxes, T download the tileset PNG.
   */
  private setupDebugKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const cats = (Object.keys(ENEMIES) as EnemyType[]).filter((t) => !isBossType(t));
    const digitKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
    cats.forEach((type, i) => {
      kb.on(`keydown-${digitKeys[i]}`, () => {
        this.spawn(type);
        this.debugDone('spawnCat');
      });
    });
    kb.on('keydown-X', () => {
      for (let i = 0; i < DEBUG.hordeSize; i++) this.spawn(Phaser.Utils.Array.GetRandom(cats));
      this.debugDone('horde');
    });
    kb.on('keydown-K', () => {
      this.enemies.getChildren().slice().forEach((e) => (e as Enemy).takeDamage(999, this.player.x, this.player.y, 0));
      this.debugDone('killAll');
    });
    kb.on('keydown-B', () => {
      this.spawn(BOSS_TYPES[this.debugBossIndex % BOSS_TYPES.length]!);
      this.debugBossIndex += 1;
      this.debugDone('boss');
    });
    kb.on('keydown-L', () => {
      this.waves.skipToNextWave(gameClock.now);
      this.debugDone('nextWave');
    });
    kb.on('keydown-V', () => {
      this.debugDone('victory');
      bus.emit(Events.Victory); // jump to the ending
    });
    kb.on('keydown-J', () => {
      this.score.add(DEBUG.scoreBonus);
      this.debugDone('score');
    });
    kb.on('keydown-G', () => {
      this.player.godMode = !this.player.godMode;
      this.debugDone('god', this.player.godMode);
    });
    kb.on('keydown-F', () => {
      this.player.heal(this.player.maxHp);
      this.debugDone('heal');
    });
    kb.on('keydown-C', () => {
      this.belt.resetCooldowns();
      this.debugDone('cooldowns');
    });
    kb.on('keydown-U', () => {
      (Object.keys(BUFFS) as BuffKind[]).forEach((kind) => this.powerUps.addBuff(kind));
      this.debugDone('allBuffs');
    });
    kb.on('keydown-P', () => {
      this.pickups.spawnNearPlayer(PICKUP_KINDS[this.debugPickupIndex % PICKUP_KINDS.length]!);
      this.debugPickupIndex += 1;
      this.debugDone('pickup');
    });
    kb.on('keydown-Y', () => {
      const world = this.physics.world;
      const show = !world.drawDebug;
      if (!world.debugGraphic) world.createDebugGraphic(); // this also switches drawing on, so `show` was read first
      world.drawDebug = show;
      if (!show) world.debugGraphic.clear();
      this.debugDone('hitboxes', show);
    });
    kb.on('keydown-T', () => {
      downloadTexture(this.textures, Tex.Tileset, 'arena_tiles.png');
      this.debugDone('tileset');
    });

    // Live numbers for the card's title bar.
    this.time.addEvent({
      delay: DEBUG.statsEveryMs,
      loop: true,
      callback: () => {
        const payload: DebugStatsPayload = { cats: this.enemies.countActive(true), wave: this.waves.wave };
        bus.emit(Events.DebugStats, payload);
      },
    });
  }
}
