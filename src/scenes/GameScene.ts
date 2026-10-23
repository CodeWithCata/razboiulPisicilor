/** @file The run: builds the arena, player, systems and collisions, and wires them together. Rules live in the systems. */
import Phaser from 'phaser';
import { ARENA_RULES, CAMERA, WORLD } from '../config/arena';
import { CULL } from '../config/culling';
import { PAUSE, PAUSE_KEYS } from '../config/pause';
import { BELT_UPGRADE_OFFER } from '../config/beltUpgrades';
import { FINAL_WAVE } from '../config/waves';
import { BELT_SYNERGY_TEXT, BELT_SYNERGY_UI, BELT_UPGRADE_TEXT, BELT_UPGRADE_UI } from '../content/beltUpgrades';
import { anyUpgradeOpen, beltUpgradeDue, resetBeltUpgrades, rollBeltChoices } from '../core/beltUpgrades';
import { eligibleSynergies, isBeltSynergyId, resetBeltSynergies, rollSynergy } from '../core/beltSynergies';
import type { UpgradeSceneData } from './UpgradeScene';
import { BELT, ENEMIES, WAVE_TIMING, isBossType, type EnemyType, type PickupKind } from '../config/balance';
import { TOUCH } from '../config/touch';
import type { PropKind } from '../config/props';
import { SLOW_MO } from '../config/slowMo';
import { FOG_LINES, RAINBOW_LINES, RAIN_LINES, VARU_LINES, WAVE_CLEARED_LINES, pick } from '../content/lines';
import { usesTouchControls } from '../core/device';
import { readRun, type RunOptions } from '../core/run';
import { gameClock } from '../core/clock';
import { saveEndlessUnlocked } from '../core/storage';
import { bus, Events, listen, type BeltSynergyPayload, type BeltUpgradePayload, type BallLandedPayload, type BossDefeatedPayload, type BossLastWordsPayload, type ExplosionPayload, type MusicPayload, type PerfStatsPayload, type SpawnEnemyPayload } from '../core/events';
import { FlowField } from '../core/flowField';
import { snapshotInto } from '../core/snapshot';
import { Enemy, type EnemyContext } from '../entities/Enemy';
import { createEnemy } from '../entities/enemies';
import { Player } from '../entities/Player';
import { Boss } from '../entities/bosses/Boss';
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
import { BallLobSystem } from '../systems/BallLobSystem';
import { CatChatter } from '../systems/CatChatter';
import { CrowRainSystem } from '../systems/CrowRainSystem';
import { Blackout } from '../systems/Blackout';
import { DayNight } from '../systems/DayNight';
import { DebugCheats } from '../systems/DebugCheats';
import { FanThrowSystem } from '../systems/FanThrowSystem';
import { Fog } from '../systems/Fog';
import { Rain } from '../systems/Rain';
import { Rainbow } from '../systems/Rainbow';
import { CostlyRewards } from '../systems/CostlyRewards';
import { COSTLY } from '../config/curses';
import { Weather } from '../systems/Weather';
import { WeatherCurses } from '../systems/WeatherCurses';
import { Effects } from '../systems/Effects';
import { CutsceneSystem } from '../systems/cutscene/CutsceneSystem';
import { HitStop } from '../systems/HitStop';
import { HitFeel } from '../systems/HitFeel';
import { JokeSystem } from '../systems/JokeSystem';
import { LuckyCatSystem } from '../systems/LuckyCatSystem';
import { LowHpSystem } from '../systems/LowHpSystem';
import { PinballSystem } from '../systems/PinballSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { SlowMoSystem } from '../systems/SlowMoSystem';
import { HapticsSystem } from '../systems/HapticsSystem';
import { CelebrationFx } from '../systems/CelebrationFx';
import { SurrenderSystem } from '../systems/SurrenderSystem';
import { announcePickup, applyPickup } from '../systems/pickupEffects';
import { CurseSystem } from '../systems/CurseSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { getDifficulty, getDifficultyId } from '../core/difficulty';
import { DodgeSystem } from '../systems/DodgeSystem';
import { UmbrellaSystem } from '../systems/UmbrellaSystem';
import { ScooterSystem } from '../systems/ScooterSystem';
import { IceCreamSystem } from '../systems/IceCreamSystem';
import { BarrelSystem } from '../systems/props/BarrelSystem';
import { Obstacles } from '../systems/props/Obstacles';
import { LampSystem } from '../systems/LampSystem';
import { PropFx } from '../systems/props/PropFx';
import { GoldLeafSystem } from '../systems/props/GoldLeaf';
import { PropSystem } from '../systems/props/PropSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { ComboSystem } from '../systems/ComboSystem';
import { BonusSystem } from '../systems/BonusSystem';
import { RunStats } from '../systems/RunStats';
import { BONUS } from '../config/bonus';
import type { RunSummary } from '../content/runStats';
import { addLifetime, loadBestCombo, saveBestCombo } from '../core/storage';
import { WaveSystem } from '../systems/WaveSystem';
import { TUTORIAL } from '../config/tutorial';
import { tutorialWanted } from '../core/tutorial';
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
  /** Reused copy of the cat list for the per-frame loop (see `snapshotInto`). */
  private readonly catScratch: Phaser.GameObjects.GameObject[] = [];
  /** The camera view widened by `CULL.catsThink.marginPx` (refilled every frame) and a frame counter: far walking cats think every few frames (`Enemy.tickThrottled`). */
  private readonly catView = new Phaser.Geom.Rectangle();
  /** The camera view widened by `CULL.catsDraw.marginPx`: a cat whose centre is outside is not drawn (`Enemy.cullDraw`). */
  private readonly catDrawView = new Phaser.Geom.Rectangle();
  private catFrame = 0;
  private belt!: BeltSystem;
  private effects!: Effects;
  private projectiles!: ProjectileSystem;
  private waves!: WaveSystem;
  private score!: ScoreSystem;
  private combo!: ComboSystem;
  private stats!: RunStats;
  private powerUps!: PowerUpSystem;
  private umbrella!: UmbrellaSystem;
  private scooter!: ScooterSystem;
  private dodge!: DodgeSystem;
  /** Bad luck gate. Null until it is built in `create` (the barrels are built before it and ask `canCurse`). */
  private curses: CurseSystem | null = null;
  private crowRain!: CrowRainSystem;
  private props!: PropSystem;
  private pinball!: PinballSystem;
  private lowHp!: LowHpSystem;
  private chatter!: CatChatter;
  private dayNight!: DayNight;
  private blackout!: Blackout;
  private fog!: Fog;
  private rain!: Rain;
  private rainbow!: Rainbow;
  private weatherCurses!: WeatherCurses;
  private slowMo!: SlowMoSystem;
  private cutscene!: CutsceneSystem;
  private surrender!: SurrenderSystem;
  private lucky!: LuckyCatSystem;
  private fanThrow!: FanThrowSystem;
  private goldLeaf!: GoldLeafSystem;
  private barrels!: BarrelSystem;
  private obstacles!: Obstacles;
  /** Cats that are hiding in a bush or box and will jump out in a moment: waves must still count them. */
  private pendingHides = 0;
  /** The first bomber cat of the run has been announced (`Events.BomberArrived`). */
  private bomberAnnounced = false;
  private pickups!: PickupSystem;
  private enemyContext!: EnemyContext;
  /** Walking distances to whatever the cats chase (Varu or the laser dot). */
  private flow!: FlowField;
  /** Dev only (`pnpm dev`): the cheats behind the debug card. */
  private debug: DebugCheats | null = null;
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
    this.pendingHides = 0;
    this.bomberAnnounced = false;
    this.curses = null;
    gameClock.reset(this.time.now); // game time starts here; it stops while the pause menu is open
    resetBeltUpgrades(); // a new run starts with a plain belt
    resetBeltSynergies(); // ...and no synergies
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
    this.obstacles = new Obstacles(this, this.arena.grid, this.player, this.enemies); // barrels and lamps are solid too (not map tiles)
    this.projectiles = new ProjectileSystem(this, this.player, this.enemies, this.arena.grid);
    this.dodge = new DodgeSystem(this.player); // the dodge roll: Space / the Tumbă button, 2 s cooldown
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
    new HapticsSystem(this); // phone vibration on dodge, hits, picks (unsubscribes on shutdown)
    new HitFeel(this, this.effects); // shake and tiny freezes on kills, the finisher and boss weak hits (it unsubscribes on shutdown)
    new PropFx(this, this.effects); // leaves, chips, fluff and words when the arena is hit
    this.goldLeaf = new GoldLeafSystem(this, this.player, this.arena.grid, this.effects); // a rare gold leaf from a bush: tiny heal
    this.props = new PropSystem(this, this.arena, this.player, this.enemies); // bushes, fences, cans... react to the belt, blasts and walking
    this.barrels = new BarrelSystem(this, this.arena.grid, this.player, this.enemies, this.effects, this.obstacles, () => this.curses?.waveOpen ?? false); // mustard barrels: solid, break them, the puddle slows Varu and cats
    this.score = new ScoreSystem(this, this.run.mode, () => this.combo?.multiplier ?? 1);
    this.hitStop = new HitStop(this);
    this.powerUps = new PowerUpSystem(this, this.player);
    this.umbrella = new UmbrellaSystem(this, this.player); // the umbrella buff: canopy over Varu, stops petards and the ball rain
    this.scooter = new ScooterSystem(this, this.player, this.enemies); // the scooter buff: scooter under Varu, bumps the cats that touch him
    new IceCreamSystem(this, this.enemies); // the ice cream: freezes the cats around him
    new JokeSystem(this, () => ({ x: this.player.x, y: this.player.y }));
    this.lowHp = new LowHpSystem(this); // heartbeat while Varu is low on health
    this.pinball = new PinballSystem(); // a flung cat hurts the cat it slams into
    this.chatter = new CatChatter(this, this.enemies); // cats say things now and then
    this.dayNight = new DayNight(this, this.run.mode, this.obstacles); // afternoon to night over the waves, lamps at night (solid)
    new LampSystem(this, this.player, this.dayNight.lamps); // the lamps can be broken
    this.blackout = new Blackout(this, this.player, this.enemies, this.dayNight.lamps); // the emo cat's lights out: dark with soft circles of light
    const weather = new Weather(this); // rolls fog / rain / clear once per wave BEFORE Fog and Rain are built (they only listen)
    this.fog = new Fog(this, this.enemies, this.player, (foggy) => {
      if (foggy) this.effects.floatText(this.player.x, this.player.y - 60, pick(FOG_LINES), '#dfeaf0', 26);
    }); // some waves start in a mist: cats far from Varu fade out until they come close
    this.rain = new Rain(this, () => this.effects.floatText(this.player.x, this.player.y - 60, pick(RAIN_LINES), '#bcd6ee', 26)); // some waves start in rain: streaks over the screen, the belt gets wet
    this.slowMo = new SlowMoSystem(this, this.effects, this.player); // the last cat of a wave and the last hit on a boss: slow motion
    new CelebrationFx(this); // confetti of the boss kill (listens to the slow-mo's bursts)
    this.crowRain = new CrowRainSystem(this, this.enemies, this.arena.grid);
    new BallLobSystem(this); // the tennis cat's ball rain: flies the balls, then tells us where they landed
    this.pickups = new PickupSystem(this, this.player, this.arena.grid, (kind) => this.applyToVaru(kind));
    // The wave after rain is clear with a rainbow over the screen and 2-3 bonus pickups under it.
    this.rainbow = new Rainbow(this, this.player, {
      rollKind: () => this.pickups.pickKind(),
      spawnPickup: (kind, x, y) => {
        this.pickups.spawnAt(kind, x, y);
      },
      announce: () => this.effects.floatText(this.player.x, this.player.y - 60, pick(RAINBOW_LINES), '#ffe066', 28),
    });
    this.enemyContext = { player: this.player, lure: null, projectiles: this.projectiles.group, enemies: this.enemies };
    this.flow = new FlowField(this.arena.grid);
    this.combo = new ComboSystem(this, () => this.waves.inWave); // kill chain: a score multiplier that a hit on Varu breaks
    this.waves = new WaveSystem((type) => this.spawnWaveCat(type), () => this.waveCatCount(), this.run.mode);
    this.stats = new RunStats(this); // numbers for the end screens
    new BonusSystem(this, {
      addScore: (points) => this.score.add(points),
      say: (line, text, color, size) => this.effects.floatText(this.player.x, this.player.y - 70 - line * BONUS.lineGap, text, color, size),
      isBossWave: () => this.waves.isBossWave,
    }); // perfect wave, quick clear, perfect dodge, flawless boss, kill milestones
    // Bad luck: the gate for every random curse (cooldown, wave ramp, mercy). Cats that curse him on hit listen to `PlayerHurt` inside it.
    const curses = new CurseSystem(this, this.player, this.waves, (kind, ms) => this.givePickup(kind, ms), () => this.powerUps.goodCount, (x, y, text, color, size) => this.effects.floatText(x, y, text, color, size));
    this.curses = curses;
    // Wave-state curses: rain = Rusty, fog = Emo, Marți 13 = a mild one; re-applied every ~25 s until the wave ends.
    new CostlyRewards(this, curses, (kind) => this.powerUps.has(kind), (text) => this.effects.floatText(this.player.x, this.player.y - COSTLY.lineLiftPx, text, COSTLY.lineColor, COSTLY.lineSize)); // rewards that cost something
    this.weatherCurses = new WeatherCurses(this, curses, (text, lift, color, size) => this.effects.floatText(this.player.x, this.player.y - lift, text, color, size));
    this.lucky = new LuckyCatSystem(this, { waves: this.waves, spawn: () => this.spawn('lucky') }); // a rare golden cat that runs from Varu
    // The last few cats of a wave may give up (rare). The system only decides when; the cats leave and the wave ends the normal way.
    this.surrender = new SurrenderSystem(this, {
      enemies: this.enemies,
      player: this.player,
      waves: this.waves,
      pendingHides: () => this.pendingHides,
      exits: this.arena.spawns.enemies,
      addScore: (points) => this.score.add(points),
    });
    // The cats in the stands: they cheer the last cat of a wave, and their shouts float up through the same Effects as every other word.
    this.arena.crowd.connect({
      say: (x, y, text, color, size) => this.effects.floatText(x, y, text, color, size),
      isLastCat: () => this.waves.inWave && this.waves.allSpawned && this.waveCatCount() === 1,
    });

    // The fans in the stands throw a gift (a pickup) or a petard into the arena now and then.
    this.fanThrow = new FanThrowSystem(this, {
      waves: this.waves,
      enemies: this.enemies,
      player: this.player,
      arena: this.arena.grid,
      beginThrow: (request) => this.arena.crowd.beginThrow(request),
      releaseThrow: () => this.arena.crowd.releaseThrow(),
      rollKind: () => this.pickups.pickKind(),
      spawnPickup: (kind, x, y, tex) => {
        this.pickups.spawnAt(kind, x, y, tex);
      },
      curseAllowed: () => curses.allowed,
      curse: (kind) => curses.force(kind),
      say: (x, y, text, color, size) => this.effects.floatText(x, y, text, color, size),
    });

    // Phones, "Date debug" switch on: every half second send the measured fps and walking numbers to the card (ui/PerfPanel.ts).
    this.time.addEvent({
      delay: PERF.everyMs,
      loop: true,
      callback: () => {
        const sample = this.perf.take(); // always, so the window restarts
        if (sample) this.arena.crowd.adapt(sample.frameAvgMs); // slow phone: fewer animated fans (config/perf.ts `adapt`)
        if (!sample || !getDebugInfo()) return;
        const payload: PerfStatsPayload = { ...sample, cats: this.enemies.countActive(true), balls: this.projectiles.group.countActive(true) };
        bus.emit(Events.PerfStats, payload);
      },
    });

    // Cats push each other apart (flying cats pass over); touching a cat hurts Varu.
    this.physics.add.collider(this.enemies, this.enemies, undefined, (a, b) => {
      const [first, second] = [a as Enemy, b as Enemy];
      if (first.flies || second.flies || first.ignoresCats || second.ignoresCats) return false;
      this.pinball.check(first, second); // runs before the physics pushes them apart, so a flung cat still has its speed
      return true;
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      if (this.cutscene.active) return; // a held-still cat must not bite during a scene
      const enemy = e as Enemy;
      if (this.player.scooter && !enemy.isBoss) return; // on the scooter the cat is bumped away (ScooterSystem) instead of biting
      if (enemy.contactDamage > 0) this.player.takeDamage(enemy.contactDamage, enemy.x, enemy.y, enemy.enemyType);
    });

    this.cutscene = new CutsceneSystem(
      {
        scene: this,
        player: this.player,
        enemies: this.enemies,
        say: (x, y, text, color, size) => this.effects.floatText(x, y, text, color, size),
        prepare: () => this.prepareCutscene(),
        finish: () => this.finishCutscene(),
      },
      this.run.mode,
    );

    const off = [
      listen(Events.PlayerDied, () => this.onPlayerDied()),
      listen(Events.TutorialEnd, () => this.waves.endTutorialHold(gameClock.now)),
      listen(Events.ArenaChanged, () => this.flow.invalidate()), // a prop was smashed: the walking routes changed
      listen(Events.PauseRequest, () => this.openPause()),
      listen<ExplosionPayload>(Events.Explosion, (e) => this.onExplosion(e)),
      listen<BallLandedPayload>(Events.BallLanded, (e) => this.onBallLanded(e)),
      listen<SpawnEnemyPayload>(Events.SpawnEnemy, ({ type, x, y }) => {
        if (this.gameOver || this.enemies.countActive(true) >= WAVE_TIMING.maxAliveWithSummons) return;
        const spot = this.arena.grid.nearestOpen(x, y, ENEMIES[type].hitRadius); // never inside a wall
        this.addEnemy(type, spot.x, spot.y);
        bus.emit(Events.Teleport, { x: spot.x, y: spot.y }); // puff of smoke
      }),
      // A boss took its killing blow: its last-words scene plays, and when it is over (or skipped, or there is none) the boss falls.
      listen<BossLastWordsPayload>(Events.BossLastWords, ({ boss }) => {
        const fall = (): void => this.finishBossLastWords();
        if (!this.cutscene.fire({ on: 'bossLastWords', boss }, fall)) fall();
      }),
      listen<BossDefeatedPayload>(Events.BossDefeated, ({ final }) => {
        if (final) this.scatterCats();
      }),
      listen(Events.Victory, () => this.onVictory()),
      listen(Events.EnemyKilled, () => {
        if (Math.random() < 0.18) this.effects.floatText(this.player.x, this.player.y - 50, pick(VARU_LINES), '#f5c518', 24);
      }),
      listen<{ wave: number }>(Events.WaveCleared, ({ wave }) => {
        const late = wave >= WAVE_TIMING.lateHeal.fromWave && wave <= WAVE_TIMING.lateHeal.toWave;
        this.player.heal((WAVE_TIMING.clearHeal + (late ? WAVE_TIMING.lateHeal.bonus : 0)) * getDifficulty().heal);
        this.effects.floatText(this.player.x, this.player.y - 56, pick(WAVE_CLEARED_LINES), '#9be28f', 26);
        // Belt upgrade pick (waves 3, 6, 9, 12 and 14; endless: every 3rd wave). The next wave waits until the screen has been and gone.
        if (beltUpgradeDue(wave, this.run.mode, FINAL_WAVE) && (anyUpgradeOpen() || eligibleSynergies().length > 0)) {
          this.waves.postpone(gameClock.now, BELT_UPGRADE_OFFER.delayMs + 600);
          this.time.delayedCall(BELT_UPGRADE_OFFER.delayMs, () => this.openUpgrades(wave));
        }
      }),
      listen<BeltUpgradePayload>(Events.BeltUpgradePicked, ({ id, level }) => {
        this.powerUps.refreshStats(); // the new multipliers go on Varu
        this.waves.postpone(gameClock.now, BELT_UPGRADE_OFFER.breatherMs);
        this.effects.floatText(this.player.x, this.player.y - 60, BELT_UPGRADE_UI.picked(BELT_UPGRADE_TEXT[id].name, level), '#f5c518', 30);
      }),
      listen<BeltSynergyPayload>(Events.BeltSynergyPicked, ({ id }) => {
        this.powerUps.refreshStats(); // the synergy multipliers are read through the same stats
        this.waves.postpone(gameClock.now, BELT_UPGRADE_OFFER.breatherMs);
        if (isBeltSynergyId(id)) this.effects.floatText(this.player.x, this.player.y - 60, BELT_SYNERGY_UI.picked(BELT_SYNERGY_TEXT[id].name), '#ff5ac8', 30);
      }),
    ];

    this.scene.launch('UIScene', this.run);
    const music: MusicPayload = { track: 'fight' };
    bus.emit(Events.MusicTrack, music);
    this.setupPause();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      this.cutscene.destroy();
      this.scene.stop('UIScene');
      this.scene.stop('CutsceneScene');
    });

    if (import.meta.env.DEV) {
      this.debug = new DebugCheats(this, {
        arena: this.arena,
        player: this.player,
        enemies: this.enemies,
        waves: this.waves,
        score: this.score,
        belt: this.belt,
        powerUps: this.powerUps,
        pickups: this.pickups,
        give: (kind) => this.givePickup(kind),
        weather,
        curses,
        fanThrow: this.fanThrow,
        surrender: this.surrender,
        slowMo: this.slowMo,
        clearShots: () => this.projectiles.clearAll(),
        spawn: (type) => this.spawn(type),
        spawnAt: (type, x, y) => this.addEnemy(type, x, y),
        cageCat: () => this.props.debugCageCat(this.player.x, this.player.y, () => this.spawn('normal')),
        freeCaged: () => this.props.debugFreeCats(),
        rearmBeds: () => this.props.debugRearmBeds(),
        hide: (type) => {
          if (!this.props.hideCat(ENEMIES[type].hitRadius, (x, y, dirX, dirY, kind) => this.revealCat(type, x, y, dirX, dirY, kind), true)) return false;
          this.pendingHides += 1; // same bookkeeping as a wave cat that hides (revealCat takes it back)
          return true;
        },
      });
    }

    // First time: the first wave waits and the cats stay away while the tutorial card (HUD) teaches the controls; wave 1 starts when it ends.
    if (tutorialWanted(this.run.mode)) {
      this.waves.tutorialHold = true;
      const startCard = (): void => {
        this.time.delayedCall(TUTORIAL.startDelayMs, () => bus.emit(Events.TutorialStart));
      };
      if (!this.cutscene.fire({ on: 'runStart' }, startCard)) startCard(); // after the opening scene, if the content has one
      this.time.delayedCall(TUTORIAL.safetyMs, () => this.waves.endTutorialHold(gameClock.now)); // never hold the game forever if the card does not answer
    } else {
      this.cutscene.fire({ on: 'runStart' }); // the opening scene, if the content has one
    }
  }

  update(time: number, delta: number): void {
    const now = gameClock.advance(time); // every timer in the game runs on this clock, not on `time`
    // `delta` is real frame time; `dt` is game time (slowed by the slow-mo of the last cat). Everything that moves or animates uses `dt`.
    const dt = gameClock.scaled(delta);
    this.arena.crowd.update(SLOW_MO.slowCrowd ? dt : delta); // before the game over return: the crowd roars or sulks on the end screens too
    if (this.gameOver) return;
    // A cutscene holds the game still: only the director runs (in real time) and Varu walks on its scripted input.
    if (this.cutscene.active) {
      this.cutscene.update(delta);
      this.player.tick(this.cutscene.input);
      gameClock.skipNextStep(); // scene time is not game time: no timer may catch up afterwards
      return;
    }
    // Camera snappiness per frame, from the real frame time: the same speed at any refresh rate (and when it wanders).
    const frames = Math.min(delta, CAMERA.maxStepMs) / (1000 / CAMERA.referenceFps);
    const lerp = 1 - (1 - CAMERA.lerp) ** frames;
    this.cameras.main.setLerp(lerp, lerp);
    this.input_.update(this.player);
    this.perf.record(time, this.player.x, this.player.y, this.input_.move.lengthSq() > 0);
    this.touchOverlay?.update();
    this.barrels.update(now); // puddle slow is set first, so Varu and the cats move slower this very frame
    this.dodge.update(now, this.input_); // before tick: the roll moves him this frame
    this.player.tick(this.input_);
    this.belt.update(now, dt, this.input_);
    this.pinball.update();
    this.powerUps.update(now, this.input_);
    this.umbrella.update(delta);
    this.scooter.update();
    this.enemyContext.lure = this.openLure(this.powerUps.lure);
    this.enemyContext.wave = this.waves.wave;
    const chased = this.enemyContext.lure ?? this.player;
    this.flow.setTarget(chased.x ?? 0, chased.y ?? 0);
    this.rain.update(dt);
    this.rainbow.update(dt);
    this.fog.update(dt); // sets each cat's fogAlpha, before the cats draw themselves this frame
    // A copy, because cats can add or remove cats while they think (summons, explosions).
    const cats = snapshotInto(this.enemies.getChildren(), this.catScratch);
    const seen = this.cameras.main.worldView;
    const pad = CULL.catsThink.marginPx;
    this.catView.setTo(seen.x - pad, seen.y - pad, seen.width + pad * 2, seen.height + pad * 2);
    const drawPad = Math.min(CULL.catsDraw.marginPx, pad); // never wider than the think margin: a drawn cat has always just ticked
    this.catDrawView.setTo(seen.x - drawPad, seen.y - drawPad, seen.width + drawPad * 2, seen.height + drawPad * 2);
    this.catFrame++;
    for (let i = 0; i < cats.length; i++) {
      const enemy = cats[i] as Enemy;
      if (!enemy.active) continue;
      if (this.debug?.frozen) enemy.setVelocity(0, 0); // dev: "Pisici înghețate"
      else enemy.tickThrottled(now, dt, this.enemyContext, this.catFrame, this.catView, this.catDrawView);
    }
    cats.length = 0;
    this.keepOutOfWalls();
    this.props.update(now, dt);
    this.goldLeaf.update(now);
    this.projectiles.update(now, dt);
    this.crowRain.update(now);
    this.pickups.update(now);
    this.waves.update(now);
    this.combo.update(now);
    this.weatherCurses.update(now);
    this.surrender.update(now);
    this.lucky.update(now);
    this.fanThrow.update(now);
    this.lowHp.update(now);
    this.chatter.update(now);
    this.dayNight.update(dt);
    this.blackout.update(dt);
    this.slowMo.update(delta); // the beat itself runs on REAL time
  }

  /** Cats the wave has to wait for: every cat alive except bonus cats (the lucky cat comes and goes by herself), plus the ones still hiding. A cat locked in a bed cage is not counted: when the wave ends it is jailed for a bonus (BedCageSystem). */
  private waveCatCount(): number {
    let count = this.pendingHides;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (enemy.active && !enemy.isBonus && !enemy.caged) count += 1; // a cat locked in a bed does not hold the wave (it is jailed when the wave ends)
    }
    return count;
  }

  /** Wave cats sometimes hide in a bush or box first (hide and seek, systems/props/PropSystem.ts); otherwise they spawn the normal way. */
  private spawnWaveCat(type: EnemyType): void {
    if (!isBossType(type) && this.props.hideCat(ENEMIES[type].hitRadius, (x, y, dirX, dirY, kind) => this.revealCat(type, x, y, dirX, dirY, kind))) {
      this.pendingHides += 1;
      return;
    }
    this.spawn(type);
  }

  private revealCat(type: EnemyType, x: number, y: number, dirX: number, dirY: number, kind: PropKind): void {
    this.pendingHides = Math.max(0, this.pendingHides - 1);
    if (this.gameOver) return;
    const spot = this.arena.grid.nearestOpen(x, y, ENEMIES[type].hitRadius); // never inside a wall
    this.addEnemy(type, spot.x, spot.y).popOut(dirX, dirY, kind === 'bed');
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
    if (type === 'bomber' && !this.bomberAnnounced) {
      this.bomberAnnounced = true;
      bus.emit(Events.BomberArrived, { x: enemy.x, y: enemy.y });
    }
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

  private onExplosion({ x, y, radius, damage, harmsPlayer, source }: ExplosionPayload): void {
    if (this.cutscene.active) return;
    const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (harmsPlayer !== false && dist <= radius + this.player.hitRadius) {
      if (this.umbrella.stopsBlast(source)) this.umbrella.announceBlock(); // a petard goes off on the umbrella: no damage
      else this.player.takeDamage(damage, x, y, source);
    }
  }

  /** What a pickup does to Varu (the same for the floor, the question mark, the debug card and bad luck). */
  private applyToVaru(kind: PickupKind, durationMs?: number): void {
    applyPickup(kind, { scene: this, player: this.player, powerUps: this.powerUps, crowRain: this.crowRain, curses: this.curses }, durationMs);
  }

  /** Announces a pickup (a bad one gets the GHINION! show) and then applies it: bad luck curses and the debug card use this, like the question mark's prize. */
  private givePickup(kind: PickupKind, durationMs?: number): void {
    announcePickup({ kind, x: this.player.x, y: this.player.y });
    this.applyToVaru(kind, durationMs);
  }

  /** A ball of the tennis cat's rain landed: it hurts Varu if he stands inside its ring. */
  private onBallLanded({ x, y, radius, damage }: BallLandedPayload): void {
    if (this.gameOver || this.cutscene.active) return;
    const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (dist > radius + this.player.hitRadius) return;
    if (this.umbrella.stopsBallRain()) this.umbrella.announceBlock(); // the ball rain bounces off the umbrella
    else this.player.takeDamage(damage, x, y);
  }

  private onPlayerDied(): void {
    this.gameOver = true;
    this.slowMo.stop(); // nothing stays slowed or zoomed on the end screens
    this.hitStop.stop(); // before the physics pause below, so the freeze can't un-pause it
    this.waves.stop();
    this.physics.pause();
    const silence: MusicPayload = { track: null };
    bus.emit(Events.MusicTrack, silence);
    bus.emit(Events.GameOver);

    // Quick "knocked out" spin, then on to the game over screen.
    this.tweens.add({ targets: this.player, angle: this.player.angle + 540, scale: 0.2, alpha: 0, duration: 800, ease: 'Cubic.easeIn' });
    const data = this.endData();
    this.time.delayedCall(950, () => this.scene.start('GameOverScene', data));
  }

  /** What the end screens show (score, record, and the run summary). Saves the best combo and the lifetime totals: call it once per run. */
  private endData(): GameOverData {
    const comboRecord = loadBestCombo();
    const newComboRecord = this.combo.best > comboRecord;
    if (newComboRecord) saveBestCombo(this.combo.best);
    addLifetime(this.score.kills);
    const summary: RunSummary = {
      difficulty: getDifficultyId(),
      timeMs: this.stats.timeMs,
      bestCombo: this.combo.best,
      comboRecord: Math.max(comboRecord, this.combo.best),
      newComboRecord,
      hits: this.stats.hits,
      perfectDodges: this.stats.perfectDodges,
    };
    return { score: this.score.score, kills: this.score.kills, wave: this.waves.wave, best: this.score.best, isNewBest: this.score.finish(), mode: this.run.mode, summary };
  }

  /** The last boss fell: a 'victory' cutscene (if the content has one) plays first, then the victory screen. */
  /** The last-words scene of a boss is over: the boss that was waiting for it falls for real. */
  private finishBossLastWords(): void {
    for (const child of this.enemies.getChildren()) {
      if (child instanceof Boss && child.isSpeaking) child.finishLastWords();
    }
  }

  private onVictory(): void {
    if (this.gameOver) return;
    // The final boss just fell: let its slow-mo and confetti play out before the ending starts.
    if (this.slowMo.bossBeatActive) {
      this.slowMo.whenBossBeatEnds(() => this.onVictory());
      return;
    }
    if (this.cutscene.fire({ on: 'victory' }, () => this.finishVictory())) return;
    this.finishVictory();
  }

  private finishVictory(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.slowMo.stop();
    this.hitStop.stop();
    this.physics.pause();
    if (this.run.mode === 'campaign') saveEndlessUnlocked();
    const silence: MusicPayload = { track: null };
    bus.emit(Events.MusicTrack, silence);
    const data = this.endData();
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

  /** A cutscene starts: nothing may keep moving or swinging while it plays. */
  private prepareCutscene(): void {
    this.slowMo.stop();
    this.hitStop.cancel();
    this.projectiles.clearAll();
    this.player.setVelocity(0, 0);
    this.touchOverlay?.setHidden(true);
  }

  /** A cutscene is over: the thumb controls come back and no key stays "held" from tapping through the scene. */
  private finishCutscene(): void {
    this.touchOverlay?.setHidden(false);
    this.input.keyboard?.resetKeys();
    gameClock.skipNextStep();
  }

  /** A wave with a belt pick was cleared: freeze the game and show the three cards. If a cutscene or the pause menu is in the way it tries again shortly. */
  private openUpgrades(wave: number): void {
    if (this.gameOver || !this.scene.isActive()) return;
    if (this.cutscene.active) {
      this.time.delayedCall(500, () => this.openUpgrades(wave));
      return;
    }
    const choices = rollBeltChoices();
    let synergy = rollSynergy(); // ONCE per pick: it keeps the miss counter
    if (choices.length === 0 && !synergy) synergy = eligibleSynergies()[0] ?? null; // every upgrade is maxed: the screen is only worth opening for a synergy
    if (choices.length === 0 && !synergy) return;
    this.hitStop.cancel();
    this.scene.pause();
    this.scene.pause('UIScene');
    if (this.scene.isActive('CutsceneScene')) this.scene.pause('CutsceneScene');
    const data: UpgradeSceneData = { wave, choices, ...(synergy ? { synergy } : {}) };
    this.scene.launch('UpgradeScene', data);
  }

  private openPause(): void {
    if (this.gameOver || this.scene.isPaused() || !this.scene.isActive()) return;
    this.hitStop.cancel();
    this.scene.pause();
    this.scene.pause('UIScene');
    if (this.scene.isActive('CutsceneScene')) this.scene.pause('CutsceneScene');
    this.scene.launch('PauseScene', this.run);
  }
}
