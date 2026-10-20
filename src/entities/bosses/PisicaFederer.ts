/** @file Final boss: tennis-ball volleys (deflect them), power serve, dash + racket swing, ball rain from the sky, ball boys in phase 2. Her loose parts are animated by FedererRig. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { FEDERER_POSE_MS as MS, FEDERER_POSES as POSE } from '../../config/animation';
import { clampToArena } from '../../core/arena';
import { lastFreePoint } from '../../core/steering';
import { byPhase, FEDERER } from '../../config/bosses';
import { bus, Events, type ExplosionPayload, type LobBallPayload, type SpawnProjectilePayload } from '../../core/events';
import { telegraphCircle, telegraphLine } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';
import { FedererRig } from './FedererRig';
import { gameClock } from '../../core/clock';

/**
 * FINAL BOSS. Volleys of tennis balls (swing the belt to DEFLECT them back: a returned ball stuns her and hurts a lot), a power
 * serve with a ground marker, a sideways dash that ends in a racket swing, and a ball rain: she smashes balls into the sky and
 * they come down on spots marked by a growing shadow (keep moving!). Phase 2: faster balls, more balls, ball boys, lime aura.
 */
export class PisicaFederer extends Boss {
  private readonly strafeDir = Math.random() < 0.5 ? 1 : -1;
  private ballsLeft = 0;
  private nextBallAt = 0;
  private lobsLeft = 0;
  private lobIndex = 0;
  private nextLobAt = 0;
  private readonly lobSpots: Array<{ x: number; y: number }> = [];
  private serveTarget = new Phaser.Math.Vector2();
  private dashEnd = new Phaser.Math.Vector2();
  private readonly rig: FedererRig;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'federer', Tex.BossFederer);
    this.rig = new FedererRig(scene, this);
  }

  protected cooldown(): number {
    return byPhase(FEDERER.cooldownMs, this.phase);
  }

  protected idleMove(): void {
    this.orbit(FEDERER.keepDistance, this.strafeDir);
  }

  /** Crouch and stretch on top of the walk cycle: the rig sets how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  protected override onPhaseTwo(): void {
    this.rig.setFury(true);
    this.rig.to(POSE.roar, MS.roar, 'out');
    this.rig.to(POSE.ready, MS.roarBack, 'out', MS.roarBackDelay);
    this.rig.twirl();
    this.summon('normal', FEDERER.phase2Summon, 140);
  }

  /** Getting stunned by a returned ball: she slumps, the racket droops, the ball drops out of her paw. */
  protected override onStunned(): void {
    this.rig.to(POSE.stunned, MS.stunned, 'out');
    this.rig.dropBall();
  }

  protected override onStunEnd(): void {
    this.rig.to(POSE.ready, MS.stunBack, 'out'); // a fresh ball comes with the ready pose
  }

  /** The loose parts follow her body after it has moved this frame (same trick as the Queen's cape). */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
  }

  override flash(color = 0xffffff, ms = 80): void {
    super.flash(color, ms);
    this.rig.flash(color, ms);
  }

  override destroy(fromScene?: boolean): void {
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: the racket flies off
    super.destroy(fromScene);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'volley',
        telegraphMs: FEDERER.volleyTelegraphMs,
        activeMs: () => byPhase(FEDERER.ballsPerVolley, this.phase) * FEDERER.ballIntervalMs + 100,
        recoverMs: 900,
        weight: 1.4,
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
          const ball: SpawnProjectilePayload = {
            kind: 'tennis', x: this.x, y: this.y, angle: this.angleToPlayer(), speed: byPhase(FEDERER.ballSpeed, this.phase),
          };
          bus.emit(Events.SpawnProjectile, ball);
        },
        onEnd: () => this.rig.to(POSE.ready, MS.volleyBack, 'out'),
      },
      {
        id: 'serve',
        telegraphMs: FEDERER.serveTelegraphMs,
        activeMs: 0,
        recoverMs: 1300,
        onTelegraph: () => {
          // The marker is locked where Varu stands NOW. Keep moving!
          this.serveTarget.set(this.ctx.player.x, this.ctx.player.y);
          this.track(telegraphCircle(this.scene, this.serveTarget.x, this.serveTarget.y, FEDERER.serveRadius, FEDERER.serveTelegraphMs));
          this.rig.to(POSE.serveToss, MS.serveToss, 'out'); // tosses the ball up, racket way back
        },
        onFire: () => {
          this.rig.hitBall();
          this.rig.to(POSE.serveSmash, MS.serveSmash, 'in');
          this.rig.to(POSE.ready, MS.serveBack, 'out', MS.serveBackDelay);
          const blast: ExplosionPayload = { x: this.serveTarget.x, y: this.serveTarget.y, radius: FEDERER.serveRadius, damage: FEDERER.serveDamage, fromBoss: true };
          bus.emit(Events.Explosion, blast);
        },
      },
      {
        id: 'dash',
        telegraphMs: FEDERER.dashTelegraphMs,
        activeMs: FEDERER.dashMs,
        recoverMs: 1100,
        lockFacing: true,
        onTelegraph: () => {
          // Sideways to Varu, stopping before any wall. If one side is cramped, take the roomier side.
          const sign = Math.random() < 0.5 ? 1 : -1;
          const reach = (dir: number) => {
            const side = this.angleToPlayer() + (Math.PI / 2) * dir;
            const target = clampToArena(this.x + Math.cos(side) * FEDERER.dashDistance, this.y + Math.sin(side) * FEDERER.dashDistance, 70);
            return lastFreePoint(this.x, this.y, target.x, target.y, this.hitRadius, this.obstacles);
          };
          let end = reach(sign);
          const other = reach(-sign);
          const length = (p: { x: number; y: number }) => Math.hypot(p.x - this.x, p.y - this.y);
          if (length(end) < FEDERER.dashDistance * 0.4 && length(other) > length(end)) end = other;
          this.dashEnd.copy(end);
          const path = Phaser.Math.Angle.Between(this.x, this.y, end.x, end.y);
          this.rotation = this.uprightRotation(path);
          const dashLength = Phaser.Math.Distance.Between(this.x, this.y, end.x, end.y);
          this.track(telegraphLine(this.scene, this.x, this.y, path, dashLength, 36, FEDERER.dashTelegraphMs));
          this.track(telegraphCircle(this.scene, end.x, end.y, FEDERER.swingRadius, FEDERER.dashTelegraphMs + FEDERER.dashMs));
          this.rig.to(POSE.dashWind, MS.dashWind, 'out'); // crouches, racket cocked
        },
        onFire: () => {
          const secs = FEDERER.dashMs / 1000;
          this.setVelocity((this.dashEnd.x - this.x) / secs, (this.dashEnd.y - this.y) / secs);
          this.contactOverride = 12;
          this.rig.to(POSE.dashGo, MS.dashGo, 'out'); // stretched out, tail streaming
        },
        onEnd: () => {
          const swing: ExplosionPayload = { x: this.x, y: this.y, radius: FEDERER.swingRadius, damage: FEDERER.swingDamage, fromBoss: true };
          bus.emit(Events.Explosion, swing);
          this.rig.to(POSE.dashSwing, MS.dashSwing, 'in'); // the big racket swing
          this.rig.pop();
          this.rig.to(POSE.ready, MS.dashBack, 'out', MS.dashBackDelay);
        },
      },
      {
        id: 'lob',
        telegraphMs: FEDERER.lob.telegraphMs,
        activeMs: () => byPhase(FEDERER.lob.balls, this.phase) * byPhase(FEDERER.lob.intervalMs, this.phase) + 120,
        recoverMs: FEDERER.lob.recoverMs,
        weight: FEDERER.lob.weight,
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
        },
      },
      {
        id: 'ballboys',
        telegraphMs: 500,
        activeMs: 0,
        recoverMs: 800,
        minPhase: 2,
        weight: 0.8,
        onTelegraph: () => {
          this.flash(0xffffff, 450);
          this.rig.to(POSE.callUp, MS.callUp, 'out'); // racket up: "balls over here!"
        },
        onFire: () => {
          this.rig.swat(false);
          this.rig.to(POSE.ready, MS.callBack, 'out', MS.callBackDelay);
          this.summon('normal', FEDERER.ballBoyCount, 130);
        },
      },
    ];
  }

  /** Smash one ball into the sky from the racket. Where it lands is picked here (the BallLobSystem flies it). */
  private lobBall(index: number): void {
    const L = FEDERER.lob;
    const from = this.rig.racketHead();
    const spot = this.lobSpot(index);
    this.lobSpots.push(spot);
    const lob: LobBallPayload = { x: from.x, y: from.y, toX: spot.x, toY: spot.y, radius: L.radius, damage: L.damage };
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
      const crowded = this.lobSpots.some((s) => Math.hypot(s.x - best.x, s.y - best.y) < L.spacing);
      if (!crowded) break;
    }
    return best;
  }
}
