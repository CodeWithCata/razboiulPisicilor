import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { clampToArena } from '../../core/arena';
import { lastFreePoint } from '../../core/steering';
import { byPhase, FEDERER } from '../../config/bosses';
import { bus, Events, type ExplosionPayload, type SpawnProjectilePayload } from '../../core/events';
import { telegraphCircle, telegraphLine } from '../../systems/Telegraph';
import { Boss, type BossAttack } from './Boss';

/**
 * FINAL BOSS. Volleys of tennis balls (swing the belt to DEFLECT them back: a returned ball
 * stuns her and hurts a lot), a power serve with a ground marker, and a sideways dash that
 * ends in a racket swing. Phase 2: faster balls, more balls, ball boys.
 */
export class PisicaFederer extends Boss {
  private readonly strafeDir = Math.random() < 0.5 ? 1 : -1;
  private ballsLeft = 0;
  private nextBallAt = 0;
  private serveTarget = new Phaser.Math.Vector2();
  private dashEnd = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'federer', Tex.BossFederer);
  }

  protected cooldown(): number {
    return byPhase(FEDERER.cooldownMs, this.phase);
  }

  protected idleMove(): void {
    this.orbit(FEDERER.keepDistance, this.strafeDir);
  }

  protected override onPhaseTwo(): void {
    this.summon('normal', FEDERER.phase2Summon, 140);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'volley',
        telegraphMs: FEDERER.volleyTelegraphMs,
        activeMs: () => byPhase(FEDERER.ballsPerVolley, this.phase) * FEDERER.ballIntervalMs + 100,
        recoverMs: 900,
        weight: 1.4,
        onTelegraph: () => this.flash(0xd7f03a, 400),
        onFire: () => {
          this.ballsLeft = byPhase(FEDERER.ballsPerVolley, this.phase);
          this.nextBallAt = 0;
        },
        onActive: (time) => {
          if (this.ballsLeft <= 0 || time < this.nextBallAt) return;
          this.ballsLeft -= 1;
          this.nextBallAt = time + FEDERER.ballIntervalMs;
          this.faceTarget(0.5);
          const ball: SpawnProjectilePayload = {
            kind: 'tennis', x: this.x, y: this.y, angle: this.angleToPlayer(), speed: byPhase(FEDERER.ballSpeed, this.phase),
          };
          bus.emit(Events.SpawnProjectile, ball);
        },
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
        },
        onFire: () => {
          const blast: ExplosionPayload = { x: this.serveTarget.x, y: this.serveTarget.y, radius: FEDERER.serveRadius, damage: FEDERER.serveDamage };
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
          this.rotation = path + Math.PI / 2;
          const dashLength = Phaser.Math.Distance.Between(this.x, this.y, end.x, end.y);
          this.track(telegraphLine(this.scene, this.x, this.y, path, dashLength, 36, FEDERER.dashTelegraphMs));
          this.track(telegraphCircle(this.scene, end.x, end.y, FEDERER.swingRadius, FEDERER.dashTelegraphMs + FEDERER.dashMs));
        },
        onFire: () => {
          const secs = FEDERER.dashMs / 1000;
          this.setVelocity((this.dashEnd.x - this.x) / secs, (this.dashEnd.y - this.y) / secs);
          this.contactOverride = 12;
        },
        onEnd: () => {
          const swing: ExplosionPayload = { x: this.x, y: this.y, radius: FEDERER.swingRadius, damage: FEDERER.swingDamage };
          bus.emit(Events.Explosion, swing);
        },
      },
      {
        id: 'ballboys',
        telegraphMs: 500,
        activeMs: 0,
        recoverMs: 800,
        minPhase: 2,
        weight: 0.8,
        onTelegraph: () => this.flash(0xffffff, 450),
        onFire: () => this.summon('normal', FEDERER.ballBoyCount, 130),
      },
    ];
  }
}
