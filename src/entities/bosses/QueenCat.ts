/** @file Mid boss Regina Pisicilor: royal guard + shield, charges (with rush follow-ups), scepter spin, scepter throw, red carpet. Three tiers: phase 1, phase 2, RAGE. Her loose parts are animated by QueenRig. */
import Phaser from 'phaser';
import { QUEEN_GEMS } from '../../assets/art/queen';
import { Tex } from '../../assets/keys';
import { QUEEN_POSE_MS as MS, QUEEN_POSES as POSE } from '../../config/animation';
import { PLAY_AREA } from '../../config/arena';
import { BOSS_CURSE, byTier, QUEEN } from '../../config/bosses';
import { BOSS_CURSE_LINES, BOSS_TEXT } from '../../content/bosses';
import { clampToArena } from '../../core/arena';
import { gameClock } from '../../core/clock';
import { bus, Events, type CurseZonePayload, type ExplosionPayload, type SpawnProjectilePayload } from '../../core/events';
import { type AimedTelegraph, telegraphCircle, telegraphLineAimed, telegraphRect } from '../../systems/Telegraph';
import type { Enemy, EnemyContext } from '../Enemy';
import { Boss, type BossAttack } from './Boss';
import { QueenRig } from './QueenRig';
import type { BossLook } from './BossViews';

/** The scepter texture is drawn on the same 128 px canvas as her body; this is the middle of the staff (it spins around it). */
const TEX = 128;
const SCEPTER_CENTER = { x: QUEEN_GEMS.scepter.x, y: 52 } as const;
const SCEPTER_SPIN = 14; // radians per second while it flies
const RUNWAY_STEP = 20; // px between the checks when she looks for free floor ahead of a charge
const RUNWAY_SAFETY = 12; // she stops this far before the obstacle
/** Directions (radians) tried around the line to Varu when something blocks the charge: the closest free one wins. */
const CHARGE_OFFSETS = [0, 0.26, -0.26, 0.52, -0.52, 0.79, -0.79, 1.05, -1.05] as const;

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** One strike of the red carpet: the bands that hurt, and the one band that is safe. */
interface CarpetWave {
  lanes: Rect[];
  safe: Rect | null;
}

interface ScepterFlight {
  leg: 'out' | 'hover' | 'back';
  legMs: number;
  elapsed: number;
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  side: number; // which way the way back bends
}

interface TrailPiece {
  x: number;
  y: number;
  until: number;
  gfx: Phaser.GameObjects.Arc;
}

/**
 * MID BOSS. Regal and relentless:
 * - Decree: calls her royal guard. Elite guards (fat and ninja cats) put a shield around her: she takes half damage until they are gone.
 * - Charge: the red lane follows Varu and turns white just before she rushes. She leaves a red carpet that burns. In phase 2 she often
 *   rushes again, re-aimed (rush); in RAGE she does it every time.
 * - Spin: a ring that hurts, she slides toward Varu. Phase 2+: sparkles fly out in a spiral. Dizzy afterwards (shorter and shorter).
 * - Scepter: she throws it like a boomerang (the way back bends in phase 2+, RAGE adds a ring of sparkles).
 * - Red carpet (phase 2+): bands of floor strike one after the other, one band is safe (green).
 * - RAGE (last quarter of her health): faster everything, and attacks flow straight into rushes.
 */
export class QueenCat extends Boss {
  private readonly rig: QueenRig;
  private rage = false;
  private guards: Enemy[] = [];

  // circling while she waits
  private strafeDir = 1;
  private strafeFlipAt = 0;

  // charge, rush and scepter aiming
  private chargeAngle = 0;
  private throwAngle = 0;
  private chargeLane: AimedTelegraph | null = null;
  private throwLane: AimedTelegraph | null = null;
  private aimLocked = false;
  private extraCharges = 0;

  // red carpet trail
  private trail: TrailPiece[] = [];
  private trailNextAt = 0;

  // spin
  private spinNextTickAt = 0;
  private spinShotAt = 0;

  // scepter throw
  private flight: ScepterFlight | null = null;
  private scepterImg: Phaser.GameObjects.Image | null = null;
  private scepterRing: Phaser.GameObjects.Arc | null = null;

  // red carpet bands
  private carpetWaves: CarpetWave[] = [];
  private carpetNext = 0;
  private carpetStrikeAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'queen', Tex.BossQueen);
    this.rig = new QueenRig(scene, this);
    this.setLooks({ base: 'front', front: Tex.BossQueen, back: Tex.BossQueenBack, side: Tex.BossQueenSide });
  }

  /** She turned to show her back or side: the rig hides the layers the new drawing already has. */
  protected override onLookChanged(look: BossLook, _left: boolean): void {
    this.rig.setLook(look);
  }

  // ---- tiers ------------------------------------------------------------------

  /** 1 = phase 1, 2 = phase 2, 3 = RAGE. */
  private get tier(): number {
    return this.rage ? 3 : this.phase;
  }

  protected override logTier(): number {
    return this.tier;
  }

  private pick<T>(triple: readonly [T, T, T]): T {
    return byTier(triple, this.tier);
  }

  /** A warning time, shortened by the tier (she gets quicker). */
  private tele(ms: number): number {
    return Math.round(ms * this.pick(QUEEN.telegraphFactor));
  }

  protected cooldown(): number {
    return this.pick(QUEEN.cooldownMs);
  }

  /** Far away: walk in (around walls). Close: circle Varu, flipping direction now and then, backing off if he is too near. She never just stands there. */
  protected idleMove(ctx: EnemyContext): void {
    const S = QUEEN.strafe;
    const now = gameClock.now;
    const speed = this.stats.speed * this.pick(QUEEN.speedFactor);
    const want = this.pick(QUEEN.preferredDistance);
    const dist = Math.hypot(ctx.player.x - this.x, ctx.player.y - this.y);
    if (dist > want + 60) {
      this.steerTo(ctx.player, speed);
      this.faceTarget();
      return;
    }
    if (now >= this.strafeFlipAt) {
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
      this.strafeFlipAt = now + S.minMs + Math.random() * (S.maxMs - S.minMs);
    }
    const toPlayer = this.angleToPlayer();
    const velocity = (dir: number): { x: number; y: number } => {
      const side = toPlayer + (Math.PI / 2) * dir;
      let vx = Math.cos(side) * speed * S.share;
      let vy = Math.sin(side) * speed * S.share;
      if (dist < want - 40) {
        vx -= Math.cos(toPlayer) * speed * S.backoffShare;
        vy -= Math.sin(toPlayer) * speed * S.backoffShare;
      } else if (dist > want + 20) {
        vx += Math.cos(toPlayer) * speed * S.backoffShare;
        vy += Math.sin(toPlayer) * speed * S.backoffShare;
      }
      return { x: vx, y: vy };
    };
    let v = velocity(this.strafeDir);
    const ahead = clampToArena(this.x + v.x * 0.5, this.y + v.y * 0.5, S.wallMargin);
    if (Math.abs(ahead.x - (this.x + v.x * 0.5)) > 1 || Math.abs(ahead.y - (this.y + v.y * 0.5)) > 1) {
      this.strafeDir = -this.strafeDir; // a wall is ahead: circle the other way
      v = velocity(this.strafeDir);
    }
    this.setVelocity(v.x, v.y);
    this.faceTarget();
  }

  /** Crouch and lunge on top of the walk cycle: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.pose.squash;
  }

  // ---- royal guard and shield ---------------------------------------------------

  /** True while at least one elite guard lives. */
  private get shielded(): boolean {
    this.guards = this.guards.filter((g) => g.active && g.alive);
    return this.guards.length > 0;
  }

  protected override get damageFactor(): number {
    return super.damageFactor * (this.shielded ? QUEEN.shieldFactor : 1);
  }

  /** Plain cats around her, and (while no shield is up) elite guards that carry the shield. */
  private summonGuards(normals: number): void {
    const group = this.ctx.enemies;
    const before = new Set<Phaser.GameObjects.GameObject>(group ? group.getChildren() : []);
    this.summon('normal', normals, QUEEN.summonRadius);
    if (!this.shielded) {
      this.summon('fat', this.pick(QUEEN.guards.fat), QUEEN.guards.radius);
      this.summon('ninja', this.pick(QUEEN.guards.ninja), QUEEN.guards.radius);
    }
    if (!group) return;
    for (const child of group.getChildren()) {
      const cat = child as Enemy;
      if (before.has(cat) || (cat.enemyType !== 'fat' && cat.enemyType !== 'ninja')) continue;
      this.guards.push(cat);
    }
  }

  // ---- phases -------------------------------------------------------------------

  protected override onPhaseTwo(): void {
    this.rig.reset(MS.furyPop);
    this.rig.setFury(true);
    this.rig.to(POSE.furyPop, MS.furyPop, 'out');
    this.rig.to(POSE.relaxed, MS.furyBack, 'out', MS.furyBackDelay);
    this.rig.burst();
    this.rig.pulse(QUEEN.summonRadius * 2);
    this.summonGuards(QUEEN.phase2Summon);
  }

  protected override think(time: number, delta: number, ctx: EnemyContext): void {
    super.think(time, delta, ctx);
    if (!this.rage && this.phase >= 2 && this.hp <= this.maxHp * QUEEN.rageAt) this.enterRage();
  }

  /** The last quarter of her health: she screams and everything gets faster (the tier number does the rest). */
  private enterRage(): void {
    this.rage = true;
    this.flash(0xff3d5a, 250);
    this.shout(BOSS_TEXT.queen.phase3 ?? '');
    this.rig.burst(14);
    this.rig.pulse(QUEEN.summonRadius * 2.4, 0xff3d5a);
    this.summonGuards(QUEEN.rageSummon);
  }

  protected override onStunned(): void {
    this.extraCharges = 0;
    this.chargeLane = null;
    this.throwLane = null;
    this.rig.reset(250);
  }

  // ---- per frame ----------------------------------------------------------------

  /** The loose parts follow her body after it has moved this frame (same trick as Varu's legs). */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
  }

  override tick(time: number, delta: number, ctx: EnemyContext): void {
    super.tick(time, delta, ctx);
    if (!this.active) return;
    this.rig.setShield(this.alive && this.shielded);
    this.updateScepter(delta);
    this.updateTrail(time);
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
  }

  override destroy(fromScene?: boolean): void {
    this.clearHazards();
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: the crown flies off
    super.destroy(fromScene);
  }

  private clearHazards(): void {
    this.trail.forEach((p) => p.gfx.destroy());
    this.trail = [];
    this.scepterImg?.destroy();
    this.scepterImg = null;
    this.scepterRing?.destroy();
    this.scepterRing = null;
    this.flight = null;
  }

  // ---- the attacks ----------------------------------------------------------------

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'decree',
        telegraphMs: () => this.tele(QUEEN.decreeTelegraphMs),
        activeMs: 0,
        recoverMs: () => this.pick(QUEEN.decreeRecoverMs),
        onTelegraph: () => {
          this.rig.to(POSE.decreeRaise, Math.min(MS.decreeRaise, this.tele(QUEEN.decreeTelegraphMs)), 'out');
          this.track(telegraphCircle(this.scene, this.x, this.y, BOSS_CURSE.queen.radius, this.tele(QUEEN.decreeTelegraphMs), BOSS_CURSE.queen.color)); // the royal decree reaches this far: stay out or be cursed
        },
        onFire: () => {
          const zone: CurseZonePayload = { x: this.x, y: this.y, radius: BOSS_CURSE.queen.radius, curse: { kind: BOSS_CURSE.queen.kind, line: BOSS_CURSE_LINES.queen } };
          bus.emit(Events.CurseZone, zone);
          this.summonGuards(this.pick(QUEEN.summonCount));
          this.rig.to(POSE.decreeSlam, MS.decreeSlam, 'in');
          this.rig.to(POSE.relaxed, MS.decreeBack, 'out', MS.decreeBackDelay);
          this.rig.pulse(QUEEN.summonRadius * 1.6);
          this.rig.burst(6);
          this.tryChain();
        },
      },
      this.chargeAttack('charge'),
      this.chargeAttack('rush'),
      {
        id: 'spin',
        telegraphMs: () => this.tele(QUEEN.spinTelegraphMs),
        activeMs: () => this.pick(QUEEN.spinMs),
        recoverMs: () => this.pick(QUEEN.spinRecoverMs),
        lockFacing: true,
        onTelegraph: () => {
          const ms = this.tele(QUEEN.spinTelegraphMs);
          this.track(telegraphCircle(this.scene, this.x, this.y, this.pick(QUEEN.spinRadius), ms));
          this.rig.to(POSE.spinWindup, Math.min(MS.spinWindup, ms), 'inOut');
        },
        onFire: () => {
          this.spinNextTickAt = gameClock.now + QUEEN.spinFirstHitMs;
          this.spinShotAt = gameClock.now + 200;
          this.rig.to(POSE.spinGo, MS.spinGo, 'out');
          this.rig.setDust(true);
          this.rig.setRing(true, this.pick(QUEEN.spinRadius));
        },
        onActive: (time, delta) => this.spinStep(time, delta),
        onEnd: () => {
          const radius = this.pick(QUEEN.spinRadius);
          this.rotation = Math.atan2(Math.sin(this.rotation), Math.cos(this.rotation)); // back to -PI..PI, so she turns the short way afterwards
          this.rig.setDust(false);
          this.rig.setRing(false);
          this.rig.to(POSE.relaxed, MS.spinEnd, 'out');
          this.rig.pulse(radius);
          // Visual blast only (and it smashes props around her): the spin itself hurts through `spinStep`.
          const blast: ExplosionPayload = { x: this.x, y: this.y, radius, damage: 0, harmsPlayer: false, fromBoss: true };
          bus.emit(Events.Explosion, blast);
          if (!this.tryChain()) this.rig.setDizzy(this.pick(QUEEN.spinRecoverMs)); // a combo leaves no time to be dizzy
        },
      },
      {
        id: 'scepter',
        telegraphMs: () => this.tele(QUEEN.scepter.telegraphMs),
        activeMs: () => this.scepterTotalMs(),
        recoverMs: () => this.pick(QUEEN.scepter.recoverMs),
        lockFacing: true,
        onTelegraph: () => {
          const ms = this.tele(QUEEN.scepter.telegraphMs);
          this.throwAngle = this.angleToPlayer();
          this.rotation = this.uprightRotation(this.throwAngle);
          this.aimLocked = false;
          const lane = telegraphLineAimed(this.scene, this.x, this.y, this.throwAngle, QUEEN.scepter.range, QUEEN.scepter.laneWidth, ms, QUEEN.scepter.edge);
          this.track(lane);
          this.throwLane = lane;
          this.rig.to(POSE.scepterWind, Math.min(MS.scepterWind, ms), 'out');
        },
        onTelegraphTick: (msLeft, delta) => {
          this.throwAngle = this.aimStep(this.throwAngle, this.throwLane, this.angleToPlayer(), msLeft, delta, QUEEN.scepter.lockMs, this.pick(QUEEN.scepter.trackRate));
        },
        onFire: () => {
          this.throwLane = null;
          this.rig.to(POSE.scepterThrow, MS.scepterThrow, 'out');
          this.launchScepter();
        },
        onEnd: () => {
          this.finishScepter(); // if it is still out, it snaps back into her hand
          this.rig.to(POSE.relaxed, MS.scepterBack, 'out');
          this.tryChain();
        },
      },
      {
        id: 'carpet',
        minPhase: 2,
        telegraphMs: () => this.pick(QUEEN.carpet.telegraphMs),
        activeMs: () => Math.max(0, this.carpetWaves.length - 1) * this.pick(QUEEN.carpet.waveGapMs) + QUEEN.carpet.lingerMs,
        recoverMs: () => this.pick(QUEEN.carpet.recoverMs),
        onTelegraph: () => {
          const ms = this.pick(QUEEN.carpet.telegraphMs);
          this.carpetWaves = this.buildCarpet();
          this.carpetNext = 0;
          this.warnWave(this.carpetWaves[0], ms);
          this.rig.to(POSE.decreeRaise, Math.min(MS.decreeRaise, ms), 'out');
        },
        onFire: () => {
          this.rig.to(POSE.decreeSlam, MS.decreeSlam, 'in');
          this.rig.to(POSE.relaxed, MS.decreeBack, 'out', MS.decreeBackDelay);
          this.strikeWave(this.carpetWaves[0]);
          this.carpetNext = 1;
          if (this.carpetWaves.length > 1) {
            const gap = this.pick(QUEEN.carpet.waveGapMs);
            this.warnWave(this.carpetWaves[1], gap);
            this.carpetStrikeAt = gameClock.now + gap;
          }
        },
        onActive: (time) => {
          if (this.carpetNext < 1 || this.carpetNext >= this.carpetWaves.length || time < this.carpetStrikeAt) return;
          this.strikeWave(this.carpetWaves[this.carpetNext]);
          this.carpetNext += 1;
          if (this.carpetNext < this.carpetWaves.length) {
            const gap = this.pick(QUEEN.carpet.waveGapMs);
            this.warnWave(this.carpetWaves[this.carpetNext], gap);
            this.carpetStrikeAt = time + gap;
          }
        },
        onEnd: () => {
          this.carpetWaves = [];
          this.carpetNext = 0;
          this.tryChain();
        },
      },
    ];
  }

  /** In RAGE an attack may flow straight into a rush (a combo). Returns true if it does. */
  private tryChain(): boolean {
    if (this.tier < 3 || Math.random() >= QUEEN.chainChance || !this.canRush()) return false;
    this.chainTo('rush', QUEEN.chainGapMs);
    return true;
  }

  // ---- charge and rush ----------------------------------------------------------------

  /** The charge (`charge`) and its quick re-aimed follow-up (`rush`, only reachable through a combo). */
  private chargeAttack(id: 'charge' | 'rush'): BossAttack {
    const rush = id === 'rush';
    const base = rush ? QUEEN.rushTelegraphMs : QUEEN.chargeTelegraphMs;
    return {
      id,
      chainOnly: rush,
      canUse: () => this.runway(this.bestChargeAngle()) >= QUEEN.chargeMinRunway,
      telegraphMs: () => this.tele(base),
      activeMs: () => this.chargeActiveMs(),
      recoverMs: () => this.pick(QUEEN.chargeRecoverMs),
      lockFacing: true,
      onTelegraph: () => {
        const ms = this.tele(base);
        this.chargeAngle = this.bestChargeAngle();
        this.rotation = this.uprightRotation(this.chargeAngle);
        this.aimLocked = false;
        const lane = telegraphLineAimed(this.scene, this.x, this.y, this.chargeAngle, this.chargeReach(this.chargeAngle) + this.stats.hitRadius, this.stats.hitRadius * 2, ms);
        this.track(lane);
        this.chargeLane = lane;
        this.rig.setAlarm(true);
        this.rig.to(POSE.chargeWindup, Math.min(MS.chargeWindup, ms), 'out');
      },
      onTelegraphTick: (msLeft, delta) => {
        const lockMs = rush ? QUEEN.rushLockMs : this.pick(QUEEN.chargeLockMs);
        const wasLocked = this.aimLocked;
        this.chargeAngle = this.aimStep(this.chargeAngle, this.chargeLane, this.bestChargeAngle(), msLeft, delta, lockMs, this.pick(QUEEN.chargeTrackRate));
        if (!this.aimLocked) this.chargeLane?.setLength(this.chargeReach(this.chargeAngle) + this.stats.hitRadius); // a wall or prop ends the lane
        if (!wasLocked && this.aimLocked) this.markSlam(msLeft);
      },
      onFire: () => {
        this.chargeLane = null;
        const speed = this.pick(QUEEN.chargeSpeed);
        this.setVelocity(Math.cos(this.chargeAngle) * speed, Math.sin(this.chargeAngle) * speed);
        this.contactOverride = rush ? QUEEN.rushDamage : QUEEN.chargeDamage;
        this.trailNextAt = 0;
        this.rig.to(POSE.chargeRush, MS.chargeRush, 'out');
        this.rig.setDust(true);
      },
      onActive: (time) => {
        this.dropTrail(time);
        this.plow();
      },
      onEnd: () => {
        this.rig.setDust(false);
        this.rig.setAlarm(false);
        this.rig.to(POSE.relaxed, MS.chargeEnd, 'out');
        this.chargeSlam();
        if (!rush) this.extraCharges = this.rollExtraCharges();
        if (this.extraCharges > 0) {
          this.extraCharges -= 1;
          if (this.canRush()) this.chainTo('rush', QUEEN.chainGapMs);
        }
      },
    };
  }

  /** While she charges, cats do not stop her (see `GameScene`'s cat collider): she shoves them out of her way. */
  override get ignoresCats(): boolean {
    const id = this.attackingId;
    return id === 'charge' || id === 'rush';
  }

  private plow(): void {
    const group = this.ctx.enemies;
    if (!group) return;
    for (const child of group.getChildren()) {
      const cat = child as Enemy;
      if (cat === this || cat.isBoss || !cat.alive || cat.isKnockedBack) continue;
      if (Math.hypot(cat.x - this.x, cat.y - this.y) > this.stats.hitRadius + cat.hitRadius + 8) continue;
      cat.applyKnockback(this.x, this.y, QUEEN.plow.force, QUEEN.plow.ms);
    }
  }

  /** How far a full charge would carry her. */
  private chargeRun(): number {
    return (this.pick(QUEEN.chargeSpeed) * QUEEN.chargeMs) / 1000;
  }

  /** Free floor (px) ahead of her along `angle`, up to a full charge: it ends at a wall, a barrel, a lamp or the fence. */
  private runway(angle: number): number {
    const reach = this.chargeRun();
    const r = this.stats.hitRadius - 6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let d = 0;
    while (d < reach) {
      const next = Math.min(reach, d + RUNWAY_STEP);
      const px = this.x + cos * next;
      const py = this.y + sin * next;
      const outside = px < PLAY_AREA.left + r || px > PLAY_AREA.right - r || py < PLAY_AREA.top + r || py > PLAY_AREA.bottom - r;
      if (outside || !this.obstacles.isCircleFree(px, py, r)) break;
      d = next;
    }
    return Math.max(0, d - RUNWAY_SAFETY);
  }

  /** How far she will really run along `angle` (the red lane is this long, plus her own size). */
  private chargeReach(angle: number): number {
    return Math.min(this.chargeRun(), this.runway(angle));
  }

  /** The direction to charge in: straight at Varu, or if something blocks that, the nearest direction with enough free floor. */
  private bestChargeAngle(): number {
    const toPlayer = this.angleToPlayer();
    let best = toPlayer;
    let bestRun = -1;
    for (const offset of CHARGE_OFFSETS) {
      const angle = toPlayer + offset;
      const run = this.runway(angle);
      if (run >= QUEEN.chargeMinRunway) return angle;
      if (run > bestRun) {
        bestRun = run;
        best = angle;
      }
    }
    return best;
  }

  private canRush(): boolean {
    return this.runway(this.bestChargeAngle()) >= QUEEN.chargeMinRunway;
  }

  /** The charge lasts until she has covered her runway (it is cut short if a wall is near, so she never stands pushing against it). */
  private chargeActiveMs(): number {
    return Math.max(250, (this.chargeReach(this.chargeAngle) / this.pick(QUEEN.chargeSpeed)) * 1000);
  }

  /** The lane just locked: mark on the floor where the end-of-charge slam will land. */
  private markSlam(ms: number): void {
    const reach = this.chargeReach(this.chargeAngle);
    const end = clampToArena(this.x + Math.cos(this.chargeAngle) * reach, this.y + Math.sin(this.chargeAngle) * reach, this.stats.hitRadius);
    this.track(telegraphCircle(this.scene, end.x, end.y, QUEEN.chargeSlam.radius, Math.max(100, ms) + QUEEN.chargeMs)); // fills up until she lands
  }

  /** Where the charge ends she slams down: a ring that hurts Varu if he stands near. */
  private chargeSlam(): void {
    const { radius, damage } = QUEEN.chargeSlam;
    this.rig.pulse(radius, 0xff3d5a);
    const blast: ExplosionPayload = { x: this.x, y: this.y, radius, damage: 0, harmsPlayer: false, fromBoss: true };
    bus.emit(Events.Explosion, blast);
    const player = this.ctx.player;
    if (Math.hypot(player.x - this.x, player.y - this.y) <= radius + player.hitRadius) player.takeDamage(damage, this.x, this.y);
  }

  /** How many rushes follow a charge: none in phase 1, maybe one in phase 2, one or two in RAGE. */
  private rollExtraCharges(): number {
    if (this.tier < 2) return 0;
    if (this.tier === 2) return Math.random() < QUEEN.doubleChargeChance ? 1 : 0;
    return Math.random() < QUEEN.doubleChargeChance ? 2 : 1;
  }

  /**
   * One frame of aiming during a warning: the lane turns toward Varu (limited by `rate`, radians per second) until `lockMs`
   * before the attack. Then it stops (turns white) and he has to move. Returns the new angle.
   */
  private aimStep(angle: number, lane: AimedTelegraph | null, target: number, msLeft: number, delta: number, lockMs: number, rate: number): number {
    if (msLeft <= lockMs) {
      if (!this.aimLocked) {
        this.aimLocked = true;
        lane?.lock();
      }
      return angle;
    }
    const next = Phaser.Math.Angle.RotateTo(angle, target, (rate * delta) / 1000);
    this.rotation = this.uprightRotation(next);
    lane?.aim(this.x, this.y, next);
    return next;
  }

  // ---- the red carpet trail the charge leaves behind -------------------------------------

  private dropTrail(time: number): void {
    if (time < this.trailNextAt) return;
    this.trailNextAt = time + QUEEN.trail.everyMs;
    const gfx = this.scene.add
      .circle(this.x, this.y, QUEEN.trail.radius, QUEEN.trail.color, 0.4)
      .setStrokeStyle(3, QUEEN.trail.edge, 0.8)
      .setDepth(6);
    this.trail.push({ x: this.x, y: this.y, until: time + this.pick(QUEEN.trail.lifeMs), gfx });
  }

  /** Fade the carpet out, and hurt Varu while he stands on it (his i-frames keep it from hurting every frame). */
  private updateTrail(time: number): void {
    if (this.trail.length === 0) return;
    const player = this.ctx.player;
    let burned = false;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const piece = this.trail[i]!;
      const left = piece.until - time;
      if (left <= 0) {
        piece.gfx.destroy();
        this.trail.splice(i, 1);
        continue;
      }
      piece.gfx.setAlpha(Math.min(1, left / 600));
      if (Math.hypot(player.x - piece.x, player.y - piece.y) <= QUEEN.trail.radius + player.hitRadius) burned = true;
    }
    if (burned) player.takeDamage(QUEEN.trail.damage, player.x, player.y + 1);
  }

  // ---- spin -----------------------------------------------------------------------------------

  /** One frame of the spin: turn, slide toward Varu, throw sparkles (phase 2+), and hurt him every tick while he is inside the ring. */
  private spinStep(time: number, delta: number): void {
    const turns = this.pick(QUEEN.spinTurns);
    const ms = this.pick(QUEEN.spinMs);
    this.rotation += ((turns * Math.PI * 2) / ms) * delta;
    this.steerTo(this.ctx.player, this.pick(QUEEN.spinDriftSpeed), QUEEN.spinStopDistance);

    const arms = this.pick(QUEEN.spinArms);
    if (arms > 0 && time >= this.spinShotAt) {
      this.spinShotAt = time + QUEEN.spinShotEveryMs;
      const base = this.rotation - Math.PI / 2; // she faces up when the rotation is 0
      for (let i = 0; i < arms; i++) this.fireSparkle(this.x, this.y, base + (i / arms) * Math.PI * 2);
    }

    if (time < this.spinNextTickAt) return;
    this.spinNextTickAt = time + QUEEN.spinTickMs;
    const player = this.ctx.player;
    if (Math.hypot(player.x - this.x, player.y - this.y) <= this.pick(QUEEN.spinRadius) + player.hitRadius) {
      player.takeDamage(QUEEN.spinDamage, this.x, this.y);
    }
  }

  private fireSparkle(x: number, y: number, angle: number): void {
    const payload: SpawnProjectilePayload = { kind: 'sparkle', x, y, angle, speed: QUEEN.sparkleSpeed };
    bus.emit(Events.SpawnProjectile, payload);
  }

  // ---- scepter throw ----------------------------------------------------------------------------

  private scepterTotalMs(): number {
    return this.pick(QUEEN.scepter.outMs) + this.pick(QUEEN.scepter.hoverMs) + this.pick(QUEEN.scepter.backMs);
  }

  /** The scepter leaves her hand: out along the lane, spins on the spot, then comes back (bending sideways in phase 2+). */
  private launchScepter(): void {
    this.finishScepter();
    const S = QUEEN.scepter;
    const far = clampToArena(this.x + Math.cos(this.throwAngle) * S.range, this.y + Math.sin(this.throwAngle) * S.range, 50);
    this.scepterImg = this.scene.add
      .image(this.x, this.y, Tex.BossQueenScepter)
      .setOrigin(SCEPTER_CENTER.x / TEX, SCEPTER_CENTER.y / TEX)
      .setDepth(30)
      .setScale(Math.abs(this.scaleX) * S.scale)
      .setRotation(this.throwAngle + Math.PI / 2);
    this.rig.setScepterHidden(true);
    this.flight = {
      leg: 'out',
      legMs: this.pick(S.outMs),
      elapsed: 0,
      ox: this.x,
      oy: this.y,
      tx: far.x,
      ty: far.y,
      x: this.x,
      y: this.y,
      side: Math.random() < 0.5 ? 1 : -1,
    };
  }

  /** The scepter is back in her hand (or she was beaten): remove the flying one. */
  private finishScepter(): void {
    this.scepterImg?.destroy();
    this.scepterImg = null;
    this.scepterRing?.destroy();
    this.scepterRing = null;
    this.flight = null;
    this.rig.setScepterHidden(false);
  }

  private updateScepter(delta: number): void {
    const f = this.flight;
    const img = this.scepterImg;
    if (!f || !img) return;
    const S = QUEEN.scepter;
    f.elapsed += delta;
    const k = Math.min(1, f.elapsed / f.legMs);

    if (f.leg === 'out') {
      f.x = Phaser.Math.Linear(f.ox, f.tx, k);
      f.y = Phaser.Math.Linear(f.oy, f.ty, k);
      if (k >= 1) this.nextLeg(f, 'hover', this.pick(S.hoverMs));
    } else if (f.leg === 'hover') {
      if (k >= 1) this.nextLeg(f, 'back', this.pick(S.backMs));
    } else {
      // Back to her (wherever she stands now), along a curve: it bends most in the middle.
      const dx = this.x - f.tx;
      const dy = this.y - f.ty;
      const len = Math.hypot(dx, dy) || 1;
      const bow = Math.sin(Math.PI * k) * this.pick(S.bow) * f.side;
      f.x = Phaser.Math.Linear(f.tx, this.x, k) + (-dy / len) * bow;
      f.y = Phaser.Math.Linear(f.ty, this.y, k) + (dx / len) * bow;
      if (k >= 1) {
        this.finishScepter();
        return;
      }
    }

    img.setPosition(f.x, f.y);
    img.rotation += (SCEPTER_SPIN * delta) / 1000;
    this.scepterRing?.setPosition(f.x, f.y);

    const player = this.ctx.player;
    const reach = (f.leg === 'hover' ? S.hoverRadius : S.hitRadius) + player.hitRadius;
    if (Math.hypot(player.x - f.x, player.y - f.y) <= reach) player.takeDamage(S.damage, f.x, f.y);
  }

  private nextLeg(f: ScepterFlight, leg: 'hover' | 'back', ms: number): void {
    f.leg = leg;
    f.legMs = Math.max(1, ms);
    f.elapsed = 0;
    if (leg === 'hover') {
      this.scepterRing = this.scene.add
        .circle(f.x, f.y, QUEEN.scepter.hoverRadius, QUEEN.scepter.edge, 0.14)
        .setStrokeStyle(3, QUEEN.scepter.edge, 0.9)
        .setDepth(7);
      const shots = this.pick(QUEEN.scepter.hoverShots);
      const offset = Math.random() * Math.PI * 2;
      for (let i = 0; i < shots; i++) this.fireSparkle(f.x, f.y, offset + (i / shots) * Math.PI * 2);
    } else {
      this.scepterRing?.destroy();
      this.scepterRing = null;
    }
  }

  // ---- red carpet bands -----------------------------------------------------------------------

  /**
   * Bands of floor across the whole arena, lined up on Varu. A corridor of side-by-side bands is safe (`safeBands` wide, green);
   * the rest hurts. The first corridor is centered 1 or 2 bands from Varu, the next ones 1 band from the previous one.
   */
  private buildCarpet(): CarpetWave[] {
    const player = this.ctx.player;
    const horizontal = Math.random() < 0.5;
    const w = QUEEN.carpet.laneWidth;
    const half = QUEEN.carpet.halfBands;
    const area = PLAY_AREA;

    const band = (slot: number): Rect | null => {
      const center = (horizontal ? player.y : player.x) + slot * w;
      const a = center - w / 2;
      const b = center + w / 2;
      const r: Rect = horizontal
        ? { x1: area.left, x2: area.right, y1: Math.max(a, area.top), y2: Math.min(b, area.bottom) }
        : { y1: area.top, y2: area.bottom, x1: Math.max(a, area.left), x2: Math.min(b, area.right) };
      return r.x2 - r.x1 > 8 && r.y2 - r.y1 > 8 ? r : null;
    };

    const waves: CarpetWave[] = [];
    let ref = 0;
    const count = this.pick(QUEEN.carpet.waves);
    const safeCount = this.pick(QUEEN.carpet.safeBands);
    for (let i = 0; i < count; i++) {
      const reach = i === 0 ? [-2, -1, 1, 2] : [-1, 1];
      const options = reach.map((o) => ref + o).filter((s) => Math.abs(s) <= half && band(s) !== null);
      const centerSlot = options.length > 0 ? options[Math.floor(Math.random() * options.length)]! : ref;
      const corridor = [centerSlot];
      const first = Math.random() < 0.5 ? 1 : -1;
      for (const side of [first, -first]) {
        if (corridor.length >= safeCount) break;
        const slot = centerSlot + side;
        if (Math.abs(slot) <= half && band(slot) !== null) corridor.push(slot);
      }
      const lanes: Rect[] = [];
      let safe: Rect | null = null;
      for (let s = -half; s <= half; s++) {
        const r = band(s);
        if (!r) continue;
        if (corridor.includes(s)) {
          safe = safe
            ? { x1: Math.min(safe.x1, r.x1), y1: Math.min(safe.y1, r.y1), x2: Math.max(safe.x2, r.x2), y2: Math.max(safe.y2, r.y2) }
            : { ...r };
        } else {
          lanes.push(r);
        }
      }
      waves.push({ lanes, safe });
      ref = centerSlot;
    }
    return waves;
  }

  /** Show where the next strike lands (red) and which band is safe (green). */
  private warnWave(wave: CarpetWave | undefined, ms: number): void {
    if (!wave) return;
    for (const r of wave.lanes) this.track(telegraphRect(this.scene, r.x1, r.y1, r.x2, r.y2, ms, QUEEN.carpet.color));
    const s = wave.safe;
    if (s) this.track(telegraphRect(this.scene, s.x1, s.y1, s.x2, s.y2, ms, QUEEN.carpet.safeColor, false));
  }

  /** The bands strike: a flash, and Varu is hurt if he stands in one. */
  private strikeWave(wave: CarpetWave | undefined): void {
    if (!wave) return;
    const player = this.ctx.player;
    let hit: Rect | null = null;
    for (const r of wave.lanes) {
      const flash = this.scene.add
        .rectangle((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, r.x2 - r.x1, r.y2 - r.y1, QUEEN.carpet.color, 0.55)
        .setStrokeStyle(4, QUEEN.carpet.edge, 1)
        .setDepth(8);
      this.scene.tweens.add({ targets: flash, alpha: 0, duration: QUEEN.carpet.strikeFadeMs, onComplete: () => flash.destroy() });
      const dx = Math.max(r.x1 - player.x, 0, player.x - r.x2);
      const dy = Math.max(r.y1 - player.y, 0, player.y - r.y2);
      if (Math.hypot(dx, dy) <= player.hitRadius) hit = r;
    }
    this.rig.burst(5);
    if (hit) player.takeDamage(QUEEN.carpet.damage, (hit.x1 + hit.x2) / 2, (hit.y1 + hit.y2) / 2);
  }
}
