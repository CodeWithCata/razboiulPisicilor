/** @file Final boss: tennis-ball volleys (deflect them, she may return or dodge them), power serve with a second serve, dash + racket swing, ball rain, set plays, hop-back, habits, ball machine and ball-boy tennis cats in phase 2, towel break and tie-break rage in the last quarter. Her loose parts are animated by FedererRig. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { FEDERER_POSE_MS as MS, FEDERER_POSES as POSE, FEDERER_RIG } from '../../config/animation';
import { PLAY_AREA } from '../../config/arena';
import type { EnemyType } from '../../config/balance';
import { clampToArena } from '../../core/arena';
import { lastFreePoint } from '../../core/steering';
import { BOSS_CURSE, byPhase, FEDERER } from '../../config/bosses';
import { BOSS_CURSE_LINES, BOSS_TEXT, FEDERER_RALLY_LINES, FEDERER_TOWEL_LINE } from '../../content/bosses';
import { bus, Events, listen, type ExplosionPayload, type LobBallPayload, type SpawnEnemyPayload, type SpawnProjectilePayload } from '../../core/events';
import { telegraphCircle, telegraphLine } from '../../systems/Telegraph';
import type { Enemy, EnemyContext } from '../Enemy';
import { TennisCat } from '../enemies/TennisCat';
import type { Projectile } from '../../systems/ProjectileSystem';
import { Boss, type BossAttack } from './Boss';
import { SmoothOrbit } from './SmoothOrbit';
import { FedererRig, type FedererPose } from './FedererRig';
import { FedererHabits, type HabitShifts } from './FedererHabits';
import { FedererBudget } from './FedererBudget';
import { BallMachines } from './BallMachines';
import type { BossLook } from './BossViews';
import { gameClock } from '../../core/clock';
import { hyp } from '../../core/hyp';

/**
 * FINAL BOSS. Volleys of tennis balls (swing the belt to DEFLECT them back: a returned ball stuns her and hurts a lot), a power
 * serve with a ground marker, a sideways dash that ends in a racket swing, and a ball rain: she smashes balls into the sky and
 * they come down on spots marked by a growing shadow (keep moving!). Phase 2: faster balls, more balls, ball boys, lime aura.
 *
 * RALLY (v146, `FEDERER.rally`): like the tennis cats she answers a ball Varu swatted back at her: she may smash it back (he can swat it
 * again, at most `maxReturns` times), sidestep it, or take it (the stun). She is busy while she winds up or fires a serve / dash / rain.
 *
 * v147 (numbers: `FEDERER` in config/bosses.ts):
 *  - SECOND SERVE: dodge a serve and she shouts "Fault!" and serves again, quicker and smaller.
 *  - SET PLAYS: three readable combos (serve + volley, dash + serve, phase 2: serve + dash + volley), each starts with its own tell. No random chains.
 *  - HOP BACK: about to attack with Varu within `hop.triggerPx`: she hops away first.
 *  - HABITS: the last ~10 s of Varu shift her attack weights (camping far = lobs and serves, hugging = dashes, swatting a lot = fewer volleys), at most 40 percent.
 *  - PLACEMENT: she stays out of the corners; her ball boys appear on the side away from Varu. At most 2 of them are tennis cats, the rest normal cats.
 *  - BALL MACHINES (phase 2): `BallMachines.ts` (3 launchers, 2 left and 1 right, gliding along the edges to follow Varu at an angle, firing in turn) + `BallMachine.ts` (one launcher). Slow telegraphed balls down lanes: a hazard and more balls to rally with.
 *  - TIE-BREAK RAGE (last quarter): a towel break (free hits), then she smashes her racket (a ring), turns red and attacks quicker.
 *  - Every new warning lasts at least `minWarningMs`, and `FedererBudget` keeps her damage sources (attack, machine, tennis ball boys) at two at most.
 */
/** What she decided to do about a ball Varu swatted back at her. */
type RallyPlan = 'return' | 'dodge' | 'stand';

/** The three set plays and the attacks each one runs, in order. */
type SetPlayId = 'serveVolley' | 'dashSmash' | 'triple';
const SET_PLAY_STEPS: Record<SetPlayId, readonly string[]> = {
  serveVolley: ['serve', 'volley'],
  dashSmash: ['dash', 'serve'],
  triple: ['serve', 'dash', 'volley'],
};

export class PisicaFederer extends Boss {
  private readonly circling = new SmoothOrbit(); // not `orbit`: Boss already has a method of that name
  protected override brakeMs: number = FEDERER.brakeMs;
  private ballsLeft = 0;
  private nextBallAt = 0;
  private lobsLeft = 0;
  private lobIndex = 0;
  private nextLobAt = 0;
  private readonly lobSpots: Array<{ x: number; y: number }> = [];
  /** The ground markers of the current serve (one, or two in phase 2). */
  private serveTargets: Phaser.Math.Vector2[] = [];
  /** The dash: which way it goes, how long it is and how far into it she is (ms of game time). */
  private readonly dashDir = new Phaser.Math.Vector2();
  private dashLength = 0;
  private dashElapsed = 0;
  private readonly rig: FedererRig;
  /** The swatted ball she has decided about, and what she decided (see `FEDERER.rally`). */
  private planBall: Projectile | null = null;
  private plan: RallyPlan = 'stand';
  private returnSwung = false;
  private returnReadyAt = 0;
  /** A glide: the sidestep away from a ball and the hop back from Varu. Which way, how long (px, ms) and how far into it she is (ms of game time). */
  private gliding = false;
  private readonly glideDir = new Phaser.Math.Vector2();
  private glideLength = 0;
  private glideMs = 1;
  private glideElapsed = 0;
  private hopReadyAt = 0;
  /** v147: what she has seen of Varu, the cap on her damage sources, and the machine of phase 2. */
  private readonly habits = new FedererHabits();
  private readonly budget = new FedererBudget();
  private machine: BallMachines | null = null;
  /** Her tennis ball boys that are still alive (never more than `FEDERER.ballBoys.maxTennis`). */
  private tennisBoys: Enemy[] = [];
  /** The attacks of the set play she is running (the next one is `queue[0]`), empty when none. */
  private queue: string[] = [];
  /** The rain's balls are still in the air until this game time: the rain still counts as a damage source. */
  private attackLingerUntil = 0;
  /** Tie-break rage: the towel break started (`rageStarted`), the racket smash is still to come (`smashPending`), and the rage itself (`rage`). */
  private rageStarted = false;
  private smashPending = false;
  private rage = false;
  private towelUntil = 0;
  /** Her body tint is put back after a flash only when the flash is over (real scene time). */
  private flashEndsAt = 0;
  private readonly offSwat: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'federer', Tex.BossFederer);
    this.rig = new FedererRig(scene, this);
    this.setLooks({ base: 'back', front: Tex.BossFedererFront, back: Tex.BossFederer, side: Tex.BossFedererSide }); // her own drawing faces away: she shows her front when Varu is below her
    this.offSwat = listen(Events.ProjectileDeflected, () => this.habits.swat(gameClock.now)); // swatting a lot makes volleys rarer
  }

  /** She turned to show her front or side: the rig hides the loose racket arm, racket, tail and feet (the new drawings have them). */
  protected override onLookChanged(look: BossLook, _left: boolean): void {
    this.rig.setLook(look);
  }

  protected cooldown(): number {
    return byPhase(FEDERER.cooldownMs, this.phase) * (this.rage ? FEDERER.rage.cooldownFactor : 1);
  }

  /** A warning time: shorter in the rage, but never under `FEDERER.minWarningMs`. */
  private tele(ms: number): number {
    return Math.max(FEDERER.minWarningMs, Math.round(ms * (this.rage ? FEDERER.rage.telegraphFactor : 1)));
  }

  private get towelling(): boolean {
    return gameClock.now < this.towelUntil;
  }

  private habit(): HabitShifts {
    return this.habits.shifts(gameClock.now);
  }

  /**
   * Smooth circling (see `SmoothOrbit`, with a push out of the corners); she glides to a stop when she winds up (`brakeMs`). Before an attack she
   * hops away if Varu is close (`FEDERER.hop`), and she waits while her damage budget is full.
   */
  protected idleMove(): void {
    const now = gameClock.now;
    if (this.gliding) {
      this.faceTarget(); // answerBalls steps the glide this frame
      return;
    }
    if (this.bossMode === 'idle') {
      if (now >= this.attackDueAt && !this.budget.canAdd('attack')) this.delayAttack(120); // machine + ball boys are busy: she waits
      if (this.shouldHop(now) && this.startHop(now)) {
        this.faceTarget();
        return;
      }
    }
    const speed = this.stats.speed * (this.rage ? FEDERER.rage.speedFactor : 1);
    this.circling.step(this, FEDERER, FEDERER.keepDistance, this.ctx.player, speed, this.frameMs, this.cornerBias(speed));
    this.faceTarget();
  }

  // ---- placement: out of the corners (numbers: `FEDERER.place`) ---------------------------------------------------

  /** Distance from a point to the nearest corner of the play area. */
  private cornerDistance(x: number, y: number): number {
    const dx = Math.min(x - PLAY_AREA.left, PLAY_AREA.right - x);
    const dy = Math.min(y - PLAY_AREA.top, PLAY_AREA.bottom - y);
    return hyp(dx, dy);
  }

  /** 0 = far from every corner, up to 1 = in a corner. */
  private cornerPenalty(x: number, y: number): number {
    return Math.max(0, 1 - this.cornerDistance(x, y) / FEDERER.place.cornerPx);
  }

  /** An extra wish for the circling: toward the middle of the arena while she is near a corner. */
  private cornerBias(speed: number): { x: number; y: number } | undefined {
    const P = FEDERER.place;
    const k = this.cornerPenalty(this.x, this.y);
    if (k <= 0) return undefined;
    const home = Phaser.Math.Angle.Between(this.x, this.y, (PLAY_AREA.left + PLAY_AREA.right) / 2, (PLAY_AREA.top + PLAY_AREA.bottom) / 2);
    return { x: Math.cos(home) * speed * P.cornerPush * k, y: Math.sin(home) * speed * P.cornerPush * k };
  }

  /** Moves a point out of a corner (toward the middle), when it is close to one. */
  private outOfCorner(p: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const limit = FEDERER.place.cornerPx * 0.45;
    const d = this.cornerDistance(p.x, p.y);
    if (d >= limit) return p;
    const home = Phaser.Math.Angle.Between(p.x, p.y, (PLAY_AREA.left + PLAY_AREA.right) / 2, (PLAY_AREA.top + PLAY_AREA.bottom) / 2);
    p.x += Math.cos(home) * (limit - d);
    p.y += Math.sin(home) * (limit - d);
    return p;
  }

  // ---- hop back (numbers: `FEDERER.hop`) --------------------------------------------------------------------------

  /** She is about to attack, Varu is close and she has not just hopped. */
  private shouldHop(now: number): boolean {
    return now >= this.attackDueAt && now >= this.hopReadyAt && !this.towelling && this.distToPlayer() < FEDERER.hop.triggerPx;
  }

  /** Hop away from Varu: the best of a few directions (long reach, not toward a corner). False when there is no room (then she just attacks). */
  private startHop(now: number): boolean {
    const H = FEDERER.hop;
    const p = this.ctx.player;
    const away = Phaser.Math.Angle.Between(p.x, p.y, this.x, this.y);
    let best: { x: number; y: number; length: number } | null = null;
    let bestScore = -Infinity;
    for (const deg of [0, 40, -40, 80, -80]) {
      const reach = this.reachAlong(away + Phaser.Math.DegToRad(deg), H.distancePx);
      const score = reach.length - this.cornerPenalty(reach.x, reach.y) * 160 - Math.abs(deg) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = reach;
      }
    }
    if (!best || best.length < H.minPx) {
      this.hopReadyAt = now + 500; // no room: attack now, look again in a moment
      return false;
    }
    this.hopReadyAt = now + H.cooldownMs;
    this.startGlide(best.x - this.x, best.y - this.y, best.length, H.ms);
    this.delayAttack(H.ms + 80);
    this.rig.to(POSE.dodge, MS.dodge, 'out');
    this.rig.to(POSE.ready, MS.dodgeBack, 'out', MS.dodgeBackDelay);
    return true;
  }

  private distToPlayer(): number {
    return Phaser.Math.Distance.Between(this.x, this.y, this.ctx.player.x, this.ctx.player.y);
  }

  private playerSpeed(): number {
    return (this.ctx.player.body as Phaser.Physics.Arcade.Body).speed;
  }

  /** How many cats (not bosses) are on the field: she calls ball boys when it is quiet. */
  private catCount(): number {
    let n = 0;
    for (const child of this.ctx.enemies?.getChildren() ?? []) {
      const cat = child as Enemy;
      if (cat.active && !cat.isBoss) n += 1;
    }
    return n;
  }

  /** The point Varu is walking toward `leadMs * share` from now (his own spot when he stands still). */
  private predicted(share: number): { x: number; y: number } {
    const p = this.ctx.player;
    const v = (p.body as Phaser.Physics.Arcade.Body).velocity;
    const t = (FEDERER.aim.leadMs / 1000) * share;
    return { x: p.x + v.x * t, y: p.y + v.y * t };
  }

  /** Crouch and stretch on top of the walk cycle: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  protected override logTier(): number {
    return this.rage ? 3 : this.phase;
  }

  protected override onPhaseTwo(): void {
    this.queue.length = 0; // the phase change cancelled any set play she was in
    this.rig.setFury(true);
    this.rig.to(POSE.roar, MS.roar, 'out');
    this.rig.to(POSE.ready, MS.roarBack, 'out', MS.roarBackDelay);
    this.rig.twirl();
    this.callBoys(FEDERER.phase2Summon);
    const p = this.ctx.player;
    this.machine ??= new BallMachines(this.scene, p.y, gameClock.now); // the three ball launchers roll in
  }

  /** Getting stunned by a returned ball: she slumps, the racket droops, the ball drops out of her paw. A set play or towel break is over. */
  protected override onStunned(): void {
    this.queue.length = 0;
    this.towelUntil = 0;
    this.rig.setTowel(false);
    this.rig.to(POSE.stunned, MS.stunned, 'out');
    this.rig.dropBall();
  }

  protected override onStunEnd(): void {
    this.rig.to(POSE.ready, MS.stunBack, 'out'); // a fresh ball comes with the ready pose
    if (this.smashPending) this.interlude(0, 'racketSmash'); // the stun cut the towel break short: the racket smash still comes
  }

  /** The loose parts follow her body after it has moved this frame (same trick as the Queen's cape). */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
    // The rage keeps her body red (a flash clears the tint, so it comes back when the flash is over).
    if (this.rage && this.active && this.scene.time.now >= this.flashEndsAt) this.setTint(FEDERER_RIG.rage.tint).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
    this.flashEndsAt = this.scene.time.now + ms + 30;
  }

  override destroy(fromScene?: boolean): void {
    this.offSwat();
    this.machine?.destroy(!!fromScene);
    this.machine = null;
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: the racket flies off
    super.destroy(fromScene);
  }

  /**
   * The boss brain first, then the books (habits, towel break, damage budget), then the balls Varu sent back (her movement of this frame wins
   * over the circling), then the ball machine.
   */
  protected override think(time: number, delta: number, ctx: EnemyContext): void {
    super.think(time, delta, ctx);
    this.habits.sample(time, this.distToPlayer());
    this.checkTowel(time);
    this.syncBudget(time);
    this.answerBalls(time, delta, ctx);
    this.updateMachine(time);
  }

  // ---- the damage budget and the ball machine ---------------------------------------------------------------------

  /** Tell the budget which of her damage sources are active (see `FedererBudget`). */
  private syncBudget(time: number): void {
    const mode = this.bossMode;
    this.tennisBoys = this.tennisBoys.filter((cat) => cat.active && cat.alive);
    this.budget.set('attack', mode === 'telegraph' || mode === 'active' || time < this.attackLingerUntil);
    this.budget.set('boys', this.tennisBoys.length > 0);
    this.budget.set('machine', this.machine?.busy(time) ?? false);
  }

  private updateMachine(time: number): void {
    if (!this.machine) return;
    const p = this.ctx.player;
    this.machine.update({ now: time, playerX: p.x, playerY: p.y, allowed: this.budget.canAdd('machine'), paused: this.towelling, rage: this.rage });
  }

  // ---- tie-break rage: towel break, then the racket smash --------------------------------------------------------

  /** Below `FEDERER.rage.at` of her health (phase 2): the towel break starts as soon as she is not stunned. The smash follows by itself. */
  private checkTowel(time: number): void {
    const mode = this.bossMode;
    if (this.damageMult !== 1 && time >= this.towelUntil) {
      this.damageMult = 1; // the free hits are over
      this.rig.setTowel(false);
    }
    if (this.rageStarted || this.phase < 2 || mode === 'intro' || mode === 'stunned' || this.hp > this.maxHp * FEDERER.rage.at) return;
    const R = FEDERER.rage;
    this.rageStarted = true;
    this.smashPending = true;
    this.queue.length = 0;
    this.towelUntil = time + R.towelMs;
    this.damageMult = R.towelDamageFactor;
    this.interlude(R.towelMs, 'racketSmash'); // stands still, then the smash runs at once
    this.shout(FEDERER_TOWEL_LINE);
    this.rig.setTowel(true);
    this.rig.dropBall();
    this.rig.to(POSE.towel, MS.towel, 'out');
  }

  /** The racket is smashed: from now on she is red and quicker (the numbers are read through `rage`). */
  private enterRage(): void {
    this.rage = true;
    this.smashPending = false;
    this.rig.setRage(true);
    this.flash(0xff3d5a, 250);
    this.shout(BOSS_TEXT.federer.phase3 ?? '');
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'volley',
        telegraphMs: () => this.tele(FEDERER.volleyTelegraphMs),
        activeMs: () => byPhase(FEDERER.ballsPerVolley, this.phase) * FEDERER.ballIntervalMs + 100,
        recoverMs: 900,
        weight: () => (this.distToPlayer() > FEDERER.decide.volleyFarPx ? FEDERER.decide.volleyFar : FEDERER.decide.volleyNear) * this.habit().volley,
        onTelegraph: () => {
          this.flash(0xd7f03a, 400);
          this.rig.to(POSE.volleyWind, MS.volleyWind, 'out'); // racket cocked back
        },
        onFire: () => {
          this.ballsLeft = byPhase(FEDERER.ballsPerVolley, this.phase);
          this.nextBallAt = 0;
          this.rig.to(POSE.volleyHold, MS.volleyHold, 'out');
        },
        onActive: (time) => {
          if (this.ballsLeft <= 0 || time < this.nextBallAt) return;
          this.ballsLeft -= 1;
          this.nextBallAt = time + FEDERER.ballIntervalMs;
          this.faceTarget(0.5);
          this.rig.swat();
          const aim = this.predicted(byPhase(FEDERER.aim.volleyShare, this.phase)); // phase 2: a little ahead of where he runs
          const ball: SpawnProjectilePayload = {
            kind: 'tennis', x: this.x, y: this.y, angle: Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y), speed: byPhase(FEDERER.ballSpeed, this.phase) * (this.rage ? FEDERER.rage.ballSpeedFactor : 1),
          };
          bus.emit(Events.SpawnProjectile, ball);
        },
        onEnd: () => {
          this.rig.to(POSE.ready, MS.volleyBack, 'out');
          this.continueChain(FEDERER.setPlays.gapMs);
        },
      },
      {
        id: 'serve',
        weight: () => (this.playerSpeed() < FEDERER.decide.serveStillSpeed ? FEDERER.decide.serveStill : FEDERER.decide.serveMoving) * this.habit().lobServe,
        telegraphMs: () => this.tele(FEDERER.serveTelegraphMs),
        activeMs: 0,
        recoverMs: 1300,
        onTelegraph: () => {
          // The marker is locked where Varu is going to be (where he stands when he stands still). Phase 2: a second marker beside it.
          this.serveTargets = this.serveSpots(this.phase < 2 ? 1 : 2);
          for (const t of this.serveTargets) this.track(telegraphCircle(this.scene, t.x, t.y, FEDERER.serveRadius, this.tele(FEDERER.serveTelegraphMs)));
          this.rig.to(POSE.serveToss, MS.serveToss, 'out'); // tosses the ball up, racket way back
        },
        onFire: () => {
          this.rig.hitBall();
          this.rig.to(POSE.serveSmash, MS.serveSmash, 'in');
          this.rig.to(POSE.ready, MS.serveBack, 'out', MS.serveBackDelay);
          for (const t of this.serveTargets) {
            const blast: ExplosionPayload = { x: t.x, y: t.y, radius: FEDERER.serveRadius, damage: FEDERER.serveDamage, fromBoss: true };
            bus.emit(Events.Explosion, blast);
          }
          this.afterServe(FEDERER.serveRadius, false);
        },
      },
      {
        // v147 SECOND SERVE: only ever chained after a serve Varu dodged. Quicker warning, smaller ring.
        id: 'serve2',
        chainOnly: true,
        telegraphMs: () => this.tele(FEDERER.secondServe.telegraphMs),
        activeMs: 0,
        recoverMs: FEDERER.secondServe.recoverMs,
        onTelegraph: () => {
          const SS = FEDERER.secondServe;
          this.serveTargets = this.serveSpots(1);
          for (const t of this.serveTargets) this.track(telegraphCircle(this.scene, t.x, t.y, SS.radius, this.tele(SS.telegraphMs)));
          this.rig.to(POSE.serveToss, Math.min(MS.serveToss, 360), 'out');
        },
        onFire: () => {
          const SS = FEDERER.secondServe;
          this.rig.hitBall();
          this.rig.to(POSE.serveSmash, MS.serveSmash, 'in');
          this.rig.to(POSE.ready, MS.serveBack, 'out', MS.serveBackDelay);
          for (const t of this.serveTargets) {
            const blast: ExplosionPayload = { x: t.x, y: t.y, radius: SS.radius, damage: SS.damage, fromBoss: true };
            bus.emit(Events.Explosion, blast);
          }
          this.afterServe(SS.radius, true);
        },
      },
      {
        id: 'dash',
        weight: () => (this.distToPlayer() < FEDERER.decide.dashNearPx ? FEDERER.decide.dashNear : FEDERER.decide.dashFar) * this.habit().dash,
        telegraphMs: () => this.tele(FEDERER.dashTelegraphMs),
        activeMs: FEDERER.dashMs,
        recoverMs: 1100,
        lockFacing: true,
        onTelegraph: () => {
          // Sideways to Varu, stopping before any wall. If one side is cramped, take the roomier side.
          const sign = Math.random() < 0.5 ? 1 : -1;
          let end = this.sideReach(this.angleToPlayer(), sign, FEDERER.dashDistance);
          const other = this.sideReach(this.angleToPlayer(), -sign, FEDERER.dashDistance);
          if (end.length < FEDERER.dashDistance * 0.4 && other.length > end.length) end = other;
          // Never toward a corner when the other side is better.
          if (this.cornerPenalty(end.x, end.y) > this.cornerPenalty(other.x, other.y) && other.length >= FEDERER.dashDistance * 0.4) end = other;
          const path = Phaser.Math.Angle.Between(this.x, this.y, end.x, end.y);
          this.rotation = this.uprightRotation(path);
          const dashLength = Phaser.Math.Distance.Between(this.x, this.y, end.x, end.y);
          this.dashLength = dashLength;
          this.dashDir.set(Math.cos(path), Math.sin(path));
          this.track(telegraphLine(this.scene, this.x, this.y, path, dashLength, 36, this.tele(FEDERER.dashTelegraphMs)));
          this.track(telegraphCircle(this.scene, end.x, end.y, FEDERER.swingRadius, this.tele(FEDERER.dashTelegraphMs) + FEDERER.dashMs));
          this.rig.to(POSE.dashWind, MS.dashWind, 'out'); // crouches, racket cocked
        },
        onFire: () => {
          this.dashElapsed = 0;
          this.contactOverride = 12;
          this.rig.to(POSE.dashGo, MS.dashGo, 'out'); // stretched out, tail streaming
        },
        // Eased dash: she pushes off, is fastest in the middle and glides to a stop on the marked spot (no 800 px/s to 0 in one frame).
        onActive: (_time, delta) => {
          this.dashElapsed = Math.min(FEDERER.dashMs, this.dashElapsed + delta);
          const u = this.dashElapsed / FEDERER.dashMs;
          const speed = ((this.dashLength / FEDERER.dashMs) * 1000 * Math.PI * Math.sin(Math.PI * u)) / 2; // half sine: its area over the dash is exactly the dash length
          this.setVelocity(this.dashDir.x * speed, this.dashDir.y * speed);
        },
        onEnd: () => {
          this.setVelocity(0, 0);
          const swing: ExplosionPayload = { x: this.x, y: this.y, radius: FEDERER.swingRadius, damage: FEDERER.swingDamage, fromBoss: true };
          bus.emit(Events.Explosion, swing);
          this.rig.to(POSE.dashSwing, MS.dashSwing, 'in'); // the big racket swing
          this.rig.pop();
          this.rig.to(POSE.ready, MS.dashBack, 'out', MS.dashBackDelay);
          this.continueChain(FEDERER.setPlays.gapMs); // set plays: she lands beside him and the next move follows
        },
      },
      {
        id: 'lob',
        telegraphMs: () => this.tele(FEDERER.lob.telegraphMs),
        activeMs: () => byPhase(FEDERER.lob.balls, this.phase) * byPhase(FEDERER.lob.intervalMs, this.phase) + 120,
        recoverMs: FEDERER.lob.recoverMs,
        weight: () => FEDERER.lob.weight * this.habit().lobServe,
        onTelegraph: () => {
          this.flash(0xd7f03a, 450);
          this.rig.to(POSE.lobToss, MS.lobToss, 'out'); // the ball goes way up, racket back and low
        },
        onFire: () => {
          this.lobsLeft = byPhase(FEDERER.lob.balls, this.phase);
          this.lobIndex = 0;
          this.nextLobAt = 0;
          this.lobSpots.length = 0;
          this.rig.hitBall(); // the first smash
          this.rig.to(POSE.lobSmash, MS.lobSmash, 'in');
          this.rig.to(POSE.lobHold, MS.lobHold, 'out', MS.lobSmash);
        },
        onActive: (time) => {
          if (this.lobsLeft <= 0 || time < this.nextLobAt) return;
          this.nextLobAt = time + byPhase(FEDERER.lob.intervalMs, this.phase);
          this.lobsLeft -= 1;
          this.faceTarget(0.35);
          // The first ball leaves with the big smash; the rest follow with quick wrist flicks.
          if (this.lobIndex > 0) this.rig.swat(false);
          this.lobBall(this.lobIndex);
          this.lobIndex += 1;
        },
        onEnd: () => {
          this.rig.to(POSE.ready, MS.lobBack, 'out', MS.lobBackDelay);
          this.attackLingerUntil = gameClock.now + FEDERER.lob.lingerMs; // the balls are still falling: the rain still counts
        },
      },
      {
        id: 'ballboys',
        telegraphMs: 500,
        activeMs: 0,
        recoverMs: 800,
        minPhase: 2,
        weight: () => (this.catCount() < FEDERER.decide.ballBoysFewBelow ? FEDERER.decide.ballBoysFew : FEDERER.decide.ballBoysMany),
        canUse: () => this.catCount() < FEDERER.decide.ballBoysCatsMax, // never floods the arena
        onTelegraph: () => {
          this.flash(0xffffff, 450);
          this.rig.to(POSE.callUp, MS.callUp, 'out'); // racket up: "balls over here!"
        },
        onFire: () => {
          this.rig.swat(false);
          this.rig.to(POSE.ready, MS.callBack, 'out', MS.callBackDelay);
          this.callBoys(FEDERER.ballBoyCount);
        },
      },
      // v147 SET PLAYS: a tell, then the moves follow one by one (see `SET_PLAY_STEPS`).
      this.setPlayAttack('serveVolley', POSE.serveToss, 1),
      this.setPlayAttack('dashSmash', POSE.dashWind, 1),
      this.setPlayAttack('triple', POSE.roar, 2),
      {
        // v147 TIE-BREAK RAGE: the racket is smashed on the floor (a ring around her), then she is red and quicker. Only ever chained after the towel break.
        id: 'racketSmash',
        chainOnly: true,
        telegraphMs: FEDERER.rage.smash.telegraphMs,
        activeMs: 0,
        recoverMs: FEDERER.rage.smash.recoverMs,
        onTelegraph: () => {
          const S = FEDERER.rage.smash;
          this.track(telegraphCircle(this.scene, this.x, this.y, S.radius, S.telegraphMs));
          this.flash(0xff3d5a, S.telegraphMs);
          this.rig.setTowel(false);
          this.rig.to(POSE.rageWind, MS.rageWind, 'out');
        },
        onFire: () => {
          const S = FEDERER.rage.smash;
          this.rig.to(POSE.rageSmash, MS.rageSmash, 'in');
          this.rig.breakRacket();
          const ring: ExplosionPayload = { x: this.x, y: this.y, radius: S.radius, damage: S.damage, fromBoss: true };
          bus.emit(Events.Explosion, ring);
          this.enterRage();
          this.rig.to(POSE.ready, MS.rageBack, 'out', MS.rageBackDelay);
        },
      },
    ];
  }

  /** How far she can go along `heading` (radians): where she would stop before a wall or prop, and how far that is. */
  private reachAlong(heading: number, distance: number): { x: number; y: number; length: number } {
    const target = clampToArena(this.x + Math.cos(heading) * distance, this.y + Math.sin(heading) * distance, 70);
    const end = lastFreePoint(this.x, this.y, target.x, target.y, this.hitRadius, this.obstacles);
    return { x: end.x, y: end.y, length: hyp(end.x - this.x, end.y - this.y) };
  }

  /** How far she can go sideways of `heading` (`dir` +1 / -1 = which side). */
  private sideReach(heading: number, dir: number, distance: number): { x: number; y: number; length: number } {
    return this.reachAlong(heading + (Math.PI / 2) * dir, distance);
  }

  // ---- set plays, the second serve and the ball boys ----------------------------------------------------------------

  /** The tell attack of a set play: a coloured flash, a pose and a shout (the attack's text), no damage. Its `onFire` queues the moves. */
  private setPlayAttack(id: SetPlayId, pose: Partial<FedererPose>, minPhase: number): BossAttack {
    const SP = FEDERER.setPlays;
    return {
      id,
      telegraphMs: SP.tellMs,
      activeMs: 0,
      recoverMs: SP.gapMs,
      minPhase,
      weight: SP.weights[id],
      onTelegraph: () => {
        this.flash(SP.tellColors[id], SP.tellMs);
        this.rig.to(pose, 260, 'out');
      },
      onFire: () => {
        this.queue = [...SET_PLAY_STEPS[id]];
        this.rig.to(POSE.ready, 200, 'out');
        this.continueChain(SP.gapMs);
      },
    };
  }

  /** The next move of the set play follows after `gapMs` (nothing happens when no set play is running). */
  private continueChain(gapMs: number): void {
    const next = this.queue.shift();
    if (next) this.chainTo(next, gapMs);
  }

  /** After a serve: when Varu dodged it (not inside any ring) and it was the first serve, she says "Fault!" and serves again; then the set play goes on. */
  private afterServe(radius: number, second: boolean): void {
    const missed = !second && this.serveMissed(radius);
    if (missed) this.queue.unshift('serve2');
    this.continueChain(missed ? FEDERER.secondServe.gapMs : FEDERER.setPlays.gapMs);
  }

  /** True when Varu stands outside every ring of the serve that just landed (the same reach the blast uses: ring plus his hit radius). */
  private serveMissed(radius: number): boolean {
    const p = this.ctx.player;
    if (!p.alive) return false;
    return this.serveTargets.every((t) => Phaser.Math.Distance.Between(t.x, t.y, p.x, p.y) > radius + p.hitRadius);
  }

  /**
   * She calls ball boys on the side AWAY from Varu, out of the corners. At most `FEDERER.ballBoys.maxTennis` of her ball boys are tennis cats alive
   * at once (they never throw fireballs); the rest are normal cats.
   */
  private callBoys(count: number): void {
    const group = this.ctx.enemies;
    const before = new Set<Phaser.GameObjects.GameObject>(group ? group.getChildren() : []);
    this.tennisBoys = this.tennisBoys.filter((cat) => cat.active && cat.alive);
    const slots = Math.max(0, FEDERER.ballBoys.maxTennis - this.tennisBoys.length);
    const types: EnemyType[] = Array.from({ length: count }, (_, i): EnemyType => (i < slots ? 'tennis' : 'normal'));
    Phaser.Utils.Array.Shuffle(types);
    const P = FEDERER.place;
    const player = this.ctx.player;
    const away = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    const spread = Phaser.Math.DegToRad(P.boySpreadDeg);
    types.forEach((type, i) => {
      const a = count > 1 ? away + spread * (i / (count - 1) - 0.5) : away;
      const pos = this.outOfCorner(clampToArena(this.x + Math.cos(a) * P.boyRadiusPx, this.y + Math.sin(a) * P.boyRadiusPx, 60));
      const spawn: SpawnEnemyPayload = { type, x: pos.x, y: pos.y };
      bus.emit(Events.SpawnEnemy, spawn);
    });
    if (!group) return;
    for (const child of group.getChildren()) {
      if (before.has(child) || !(child instanceof TennisCat)) continue;
      child.setBallBoy();
      this.tennisBoys.push(child);
    }
  }

  // ---- the rally: answering a ball Varu swatted back (numbers: `FEDERER.rally`) ----------------------------------

  /** She answers balls while she circles, catches her breath or fires a volley; never while winding up a serve, dash or rain, and never stunned. */
  private canAnswerBalls(): boolean {
    if (this.towelling) return false; // the towel break: no ball is answered
    const mode = this.bossMode;
    return mode === 'idle' || mode === 'recover' || (mode === 'active' && this.attackingId === 'volley');
  }

  private answerBalls(time: number, delta: number, ctx: EnemyContext): void {
    if (!this.canAnswerBalls()) {
      this.dropPlan();
      return;
    }
    if (this.gliding) {
      this.stepGlide(delta);
      return;
    }
    const ball = this.incomingBall(ctx.projectiles);
    if (!ball) {
      this.planBall = null;
      return;
    }
    if (ball !== this.planBall) this.decide(time, ball);
    if (this.plan !== 'return') return;
    const R = FEDERER.rally;
    this.setVelocity(0, 0); // she plants her feet and waits for it
    this.faceTarget(0.3);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y);
    if (!this.returnSwung && dist <= R.reachPx + R.swingLeadPx) {
      this.returnSwung = true;
      this.rig.swat(false); // the racket starts to swing a moment before the ball is in reach
    }
    if (dist <= R.reachPx) this.smashBack(time, ball);
  }

  /** Forget the plan (she got busy or stunned): a sidestep in progress stops. */
  private dropPlan(): void {
    this.planBall = null;
    this.plan = 'stand';
    if (this.gliding) {
      this.gliding = false;
      this.setVelocity(0, 0);
    }
  }

  /** The closest swatted tennis ball that flies at her (inside `senseRange`, aimed within `lateralPx` of her middle), or null. */
  private incomingBall(group: Phaser.Physics.Arcade.Group | undefined): Projectile | null {
    if (!group) return null;
    const R = FEDERER.rally;
    let best: Projectile | null = null;
    let bestDist: number = R.senseRange;
    for (const child of group.getChildren()) {
      const p = child as Projectile;
      if (!p.active || !p.friendly || p.kind !== 'tennis' || !p.body) continue;
      const v = (p.body as Phaser.Physics.Arcade.Body).velocity;
      const speed = hyp(v.x, v.y);
      if (speed < 50) continue;
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = hyp(dx, dy);
      if (dist >= bestDist) continue;
      if ((v.x * dx + v.y * dy) / speed <= 0) continue; // flying away from her
      if (Math.abs(v.x * dy - v.y * dx) / speed > R.lateralPx) continue; // will miss her
      best = p;
      bestDist = dist;
    }
    return best;
  }

  /** Once per ball: smash it back, sidestep, or take it (and get stunned). A ball that is already too close when she sees it is always taken. */
  private decide(time: number, ball: Projectile): void {
    const R = FEDERER.rally;
    this.planBall = ball;
    this.returnSwung = false;
    this.plan = 'stand';
    if (Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y) < R.minReactPx) return; // point-blank: too late for her
    const roll = Math.random();
    const returnChance = byPhase(R.returnChance, this.phase);
    if (roll < returnChance) {
      // A ball that was returned `maxReturns` times already, or a return too soon after the last one, is just taken.
      if (ball.returns < R.maxReturns && time >= this.returnReadyAt) {
        this.plan = 'return';
        this.delayAttack(R.holdAttackMs);
      }
      return;
    }
    if (roll < returnChance + byPhase(R.dodgeChance, this.phase)) this.startDodge(ball);
  }

  /** Sidestep the line of the ball, to the side she already stands on (the other one if that is cramped). Cornered: no dodge, she takes it. */
  private startDodge(ball: Projectile): void {
    const R = FEDERER.rally;
    const v = (ball.body as Phaser.Physics.Arcade.Body).velocity;
    const flight = Math.atan2(v.y, v.x);
    const sign = -v.y * (this.x - ball.x) + v.x * (this.y - ball.y) >= 0 ? 1 : -1;
    let end = this.sideReach(flight, sign, R.dodgePx);
    const other = this.sideReach(flight, -sign, R.dodgePx);
    if (end.length < R.dodgePx * 0.6 && other.length > end.length) end = other;
    if (end.length < R.dodgeMinPx) return; // no room: the plan stays 'stand'
    this.plan = 'dodge';
    this.startGlide(end.x - this.x, end.y - this.y, end.length, R.dodgeMs);
    this.delayAttack(R.holdAttackMs);
    this.shout(Phaser.Utils.Array.GetRandom(FEDERER_RALLY_LINES as string[]));
    const back = this.attackingId === 'volley' ? POSE.volleyHold : POSE.ready; // mid-volley she goes back to the volley stance
    this.rig.to(POSE.dodge, MS.dodge, 'out');
    this.rig.to(back, MS.dodgeBack, 'out', MS.dodgeBackDelay);
  }

  /** Start a glide (a sidestep or the hop back): `length` px toward (dx, dy) in `ms`. */
  private startGlide(dx: number, dy: number, length: number, ms: number): void {
    this.gliding = true;
    this.glideElapsed = 0;
    this.glideLength = length;
    this.glideMs = ms;
    this.glideDir.set(dx, dy).normalize();
  }

  /** Eased like her dash: pushes off, is fastest in the middle, glides to a stop (the area under the half sine is exactly the glide length). */
  private stepGlide(delta: number): void {
    this.glideElapsed = Math.min(this.glideMs, this.glideElapsed + Math.min(delta, 50));
    const u = this.glideElapsed / this.glideMs;
    const speed = ((this.glideLength / this.glideMs) * 1000 * Math.PI * Math.sin(Math.PI * u)) / 2;
    this.setVelocity(this.glideDir.x * speed, this.glideDir.y * speed);
    if (u >= 1) {
      this.gliding = false;
      this.setVelocity(0, 0);
    }
  }

  /** The ball is in reach: the racket meets it and it flies back at Varu (a normal ball again, he can swat it once more). */
  private smashBack(time: number, ball: Projectile): void {
    const R = FEDERER.rally;
    const aim = this.predicted(byPhase(FEDERER.aim.volleyShare, this.phase)); // phase 1: where he stands, phase 2: a little ahead
    ball.sendBack(Phaser.Math.Angle.Between(ball.x, ball.y, aim.x, aim.y), R.speedFactor, R.maxSpeed);
    this.rig.pop();
    this.plan = 'stand';
    this.returnReadyAt = time + R.cooldownMs;
    this.delayAttack(R.holdAttackMs); // the ball may come back: she does not wind up a serve in its way
    bus.emit(Events.TennisReturn, { x: ball.x, y: ball.y });
  }

  /** The ground marker(s) of a serve: ahead of Varu's walk (always inside the arena and on open floor); phase 2 adds a second one beside the first. */
  private serveSpots(count: 1 | 2): Phaser.Math.Vector2[] {
    const aim = this.predicted(byPhase(FEDERER.aim.serveShare, this.phase));
    const spot = (x: number, y: number): Phaser.Math.Vector2 => {
      const inside = clampToArena(x, y, 60);
      const open = this.obstacles.nearestOpen(inside.x, inside.y, FEDERER.serveRadius * 0.3);
      return new Phaser.Math.Vector2(open.x, open.y);
    };
    const first = spot(aim.x, aim.y);
    if (count < 2) return [first];
    const side = this.angleToPlayer() + (Math.PI / 2) * (Math.random() < 0.5 ? 1 : -1);
    return [first, spot(first.x + Math.cos(side) * FEDERER.twinServeOffsetPx, first.y + Math.sin(side) * FEDERER.twinServeOffsetPx)];
  }

  /** Smash one ball into the sky from the racket. Where it lands is picked here (the BallLobSystem flies it). */
  private lobBall(index: number): void {
    const L = FEDERER.lob;
    const from = this.rig.racketHead();
    const spot = this.lobSpot(index);
    this.lobSpots.push(spot);
    // The first ball of each rain (aimed at Varu) is the cursed one: if he is in its ring when it lands, he gets the curse.
    const curse = index === 0 ? { kind: BOSS_CURSE.federer.kind, line: BOSS_CURSE_LINES.federer } : undefined;
    const lob: LobBallPayload = { x: from.x, y: from.y, toX: spot.x, toY: spot.y, radius: L.radius, damage: L.damage, curse };
    bus.emit(Events.LobBall, lob);
  }

  /** Every `aimEvery`-th ball comes down where Varu is heading; the others anywhere around him (never on top of the last ones). */
  private lobSpot(index: number): { x: number; y: number } {
    const L = FEDERER.lob;
    const player = this.ctx.player;
    const velocity = (player.body as Phaser.Physics.Arcade.Body).velocity;
    let best = { x: player.x, y: player.y };
    for (let attempt = 0; attempt < 5; attempt++) {
      let x: number;
      let y: number;
      if (index % L.aimEvery === 0) {
        x = player.x + (velocity.x * L.leadMs) / 1000 + Phaser.Math.Between(-L.aimJitter, L.aimJitter);
        y = player.y + (velocity.y * L.leadMs) / 1000 + Phaser.Math.Between(-L.aimJitter, L.aimJitter);
      } else {
        const angle = Math.random() * Math.PI * 2;
        const reach = L.scatterMin + Math.random() * (L.scatterMax - L.scatterMin);
        x = player.x + Math.cos(angle) * reach;
        y = player.y + Math.sin(angle) * reach;
      }
      const edge = clampToArena(x, y, L.edgeMargin);
      best = this.obstacles.nearestOpen(edge.x, edge.y, L.radius * 0.4);
      const crowded = this.lobSpots.some((s) => hyp(s.x - best.x, s.y - best.y) < L.spacing);
      if (!crowded) break;
    }
    return best;
  }
}
