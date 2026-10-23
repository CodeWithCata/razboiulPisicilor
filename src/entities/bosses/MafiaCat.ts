/** @file Emo mid boss: keeps distance, fans of broken hearts, screamo shockwave, calls a crew of ninjas. */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { EMO_POSE_MS as MS, EMO_POSES as POSE, EMO_RIG } from '../../config/animation';
import { BOSS_CURSE, byPhase, MAFIA } from '../../config/bosses';
import { BOSS_CURSE_LINES, MAFIA_MOODS } from '../../content/bosses';
import { bus, Events, type CurseZonePayload, type ExplosionPayload, type SpawnProjectilePayload, type WeatherPayload } from '../../core/events';
import { telegraphCircle } from '../../systems/Telegraph';
import type { Enemy } from '../Enemy';
import { SmoothOrbit } from './SmoothOrbit';
import { Boss, type BossAttack } from './Boss';
import { EmoRig } from './EmoRig';
import { TearPuddles } from './TearPuddles';
import type { BossLook } from './BossViews';
import { gameClock } from '../../core/clock';

/**
 * MID BOSS (the emo cat). Keeps his distance and throws fans of broken hearts (the belt destroys them),
 * screams a shockwave around himself (run out of the pink circle), and calls his crew: ninjas, always.
 * He is sad the whole time: slumped, trudging, crying, with a little rain cloud over his head (see EmoRig).
 */
export class MafiaCat extends Boss {
  private readonly circling = new SmoothOrbit(); // not `orbit`: Boss already has a method of that name
  protected override brakeMs: number = MAFIA.brakeMs;
  private readonly rig: EmoRig;
  private readonly puddles: TearPuddles;
  /** Until this game time he is worn out from a scream: wide open (`MAFIA.shield.exhaustedFactor`). */
  private exhaustedUntil = 0;
  /** v172: it rains (his cloud turned the weather), the lights are off, and the cry for help (hiding behind his hood). */
  private raining = false;
  private nextRainPuddleAt = 0;
  private hiding = false;
  private hidingUntil = 0;
  private nextCryAt = 0;
  private nextHideDropAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mafia', Tex.BossMafia);
    this.rig = new EmoRig(scene, this);
    this.puddles = new TearPuddles(scene);
    this.setLooks({ base: 'front', front: Tex.BossMafia, back: Tex.BossMafiaBack, side: Tex.BossMafiaSide });
  }

  /** He turned to show his back or side: the tears and sighs come from where his face is now. */
  protected override onLookChanged(look: BossLook, left: boolean): void {
    this.rig.setLook(look, left);
  }

  /** The slump, sobs and attack poses squash him; the rig works out how much. */
  protected override get poseSquash(): number {
    return this.rig.squash;
  }

  protected override get poseTiltDeg(): number {
    return this.rig.tiltDeg;
  }

  /** Slow, heavy, hunched shuffle instead of the normal boss gait. */
  protected override get gaitLook(): { readonly swayDeg: number; readonly squash: number; readonly stride: number } {
    return EMO_RIG.gait;
  }

  /** The loose bits (tears, cloud, sighs) follow his body after it has moved this frame. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.rig.sync(gameClock.scaled(delta));
    if (this.ctx) {
      this.puddles.update(this.ctx.player);
      this.moods(gameClock.now);
    }
  }

  /** v172: the rainy mood (cloud, rain, spreading puddles), lights out at low health, and the end of the cry for help. */
  private moods(now: number): void {
    if (this.hp <= 0) return;
    const frac = this.hp / this.maxHp;
    this.rig.setGloom(1 - frac);
    if (!this.raining && frac <= MAFIA.rain.startAtHp) this.startRain(now);
    if (this.raining && now >= this.nextRainPuddleAt) {
      const R = MAFIA.rain;
      const k = Phaser.Math.Clamp((R.startAtHp - frac) / R.startAtHp, 0, 1); // 0 = it just started, 1 = full storm
      this.puddles.spread(this.ctx.player.x, this.ctx.player.y, R.minFromVaruPx, Math.round(Phaser.Math.Linear(R.puddleMax[0], R.puddleMax[1], k)), R.puddleLifeMs);
      this.nextRainPuddleAt = now + Phaser.Math.Linear(R.puddleEveryMs[0], R.puddleEveryMs[1], k);
    }
    if (this.hiding) {
      if (now >= this.hidingUntil) {
        this.hiding = false;
        this.rig.setHiding(false);
      } else if (now >= this.nextHideDropAt) {
        this.nextHideDropAt = now + MAFIA.cry.puddleEveryMs;
        this.puddles.beneath(this.x, this.y, MAFIA.cry.puddleJitterPx);
      }
    }
  }

  /** The cloud turns the weather: real rain over the arena (the normal rain weather: streaks, rusty belt). */
  private startRain(now: number): void {
    this.raining = true;
    this.nextRainPuddleAt = now + 1500;
    const weather: WeatherPayload = { weather: 'rain', wave: this.ctx.wave ?? 0 };
    bus.emit(Events.WeatherChanged, weather);
    this.shout(MAFIA_MOODS.rain);
  }

  /** A hit between two attacks may make him cry for help: he hides behind his hood for a moment (less damage, puddles at his feet, no attacks). */
  private tryHide(): void {
    const C = MAFIA.cry;
    const now = gameClock.now;
    if (this.hiding || now < this.nextCryAt || now < this.exhaustedUntil || !this.isBetweenAttacks || Math.random() >= C.chance) return;
    this.hiding = true;
    this.hidingUntil = now + C.hideMs;
    this.nextCryAt = this.hidingUntil + C.cooldownMs;
    this.nextHideDropAt = now;
    this.interlude(C.hideMs);
    this.rig.to(POSE.hide, MS.hide, 'out');
    this.rig.to(POSE.slump, MS.hideBack, 'inOut', C.hideMs - MS.hideBack);
    this.rig.setHiding(true);
    this.rig.spray(12, true);
    this.flash(C.flash, 300);
    this.shout(Phaser.Utils.Array.GetRandom([...MAFIA_MOODS.cry]));
  }

  /** v148: his crew hides him (less damage while 2+ ninjas live), and right after a scream he is wide open. */
  protected override get damageFactor(): number {
    const S = MAFIA.shield;
    let factor = super.damageFactor;
    if (gameClock.now < this.exhaustedUntil) factor *= S.exhaustedFactor;
    else if (this.ninjaCount() >= S.minNinjas) factor *= S.crewFactor;
    if (this.hiding) factor *= MAFIA.cry.damageFactor; // v172: behind his hood
    return factor;
  }

  /** Getting hit makes him jolt and spurt tears. */
  protected override applyHit(effective: number, fromX: number, fromY: number, knockback: number): boolean {
    const killed = super.applyHit(effective, fromX, fromY, knockback);
    if (!killed) {
      this.rig.hurt();
      this.tryHide();
    }
    return killed;
  }

  protected override onStunned(): void {
    this.rig.to(POSE.stunned, MS.stunned, 'out');
    this.rig.spray(8);
  }

  protected override onStunEnd(): void {
    this.rig.to(POSE.slump, MS.stunBack, 'inOut');
  }

  override destroy(fromScene?: boolean): void {
    if (!fromScene) {
      // He is gone: the rain he made stops (the lights come back in `Boss.destroy`).
      if (this.raining) bus.emit(Events.WeatherChanged, { weather: 'clear', wave: this.ctx?.wave ?? 0 } satisfies WeatherPayload);
    }
    this.rig.destroy(!fromScene && this.hp <= 0); // beaten: he bursts into tears
    this.puddles.destroy(this.ctx?.player ?? null);
    super.destroy(fromScene);
  }

  protected cooldown(): number {
    return byPhase(MAFIA.cooldownMs, this.phase);
  }

  /** Smooth circling (see `SmoothOrbit`); he glides to a stop when he winds up (`brakeMs`). */
  protected idleMove(): void {
    this.circling.step(this, MAFIA, MAFIA.keepDistance, this.ctx.player, this.stats.speed, this.frameMs);
    this.faceTarget();
  }

  private distToPlayer(): number {
    return Phaser.Math.Distance.Between(this.x, this.y, this.ctx.player.x, this.ctx.player.y);
  }

  /** How many ninjas are alive right now (his crew): he calls more when few are left. */
  private ninjaCount(): number {
    let n = 0;
    for (const child of (this.ctx.enemies?.getChildren() ?? [])) {
      const cat = child as Enemy;
      if (cat.active && cat.enemyType === 'ninja') n += 1;
    }
    return n;
  }

  protected override onPhaseTwo(): void {
    // Emotional breakdown: he shakes and bawls, tears fly everywhere, and the cloud turns into a storm.
    this.rig.setStorm(true);
    this.rig.to(POSE.breakdown, MS.breakdown, 'out');
    this.rig.to(POSE.slump, MS.breakdownBack, 'out', MS.breakdownBackDelay);
    this.rig.spray(16, true);
    this.summon('ninja', MAFIA.phase2Summon, MAFIA.crewRadius - 10);
  }

  protected defineAttacks(): BossAttack[] {
    return [
      {
        id: 'hearts',
        weight: () => (this.distToPlayer() > MAFIA.decide.heartsFarPx ? MAFIA.decide.heartsFar : MAFIA.decide.heartsNear),
        telegraphMs: MAFIA.heartTelegraphMs,
        activeMs: () => (this.phase >= 2 ? MAFIA.secondVolleyDelayMs + 50 : 0),
        recoverMs: MAFIA.recoverMs.hearts,
        onTelegraph: () => {
          this.flash(MAFIA.heartFlash, 500);
          this.rig.to(POSE.heartsWind, MS.heartsWind, 'inOut'); // hunched over, sobbing
        },
        onFire: () => {
          this.rig.to(POSE.heartsFire, MS.heartsFire, 'out'); // the throw
          this.rig.to(POSE.slump, MS.heartsBack, 'inOut', 140);
          this.volley();
          // Phase 2: a second volley right behind the first one.
          if (this.phase >= 2) {
            this.scene.time.delayedCall(MAFIA.secondVolleyDelayMs, () => {
              if (this.attackingId === 'hearts') this.volley();
            });
          }
        },
      },
      {
        // v148: slow purple hearts that curve toward Varu. Outrun them or break them (the thrown belt needs 2 hits).
        id: 'sad',
        weight: () => (this.distToPlayer() > MAFIA.decide.sadFarPx ? MAFIA.decide.sadFar : MAFIA.decide.sadNear),
        telegraphMs: MAFIA.sadTelegraphMs,
        activeMs: 0,
        recoverMs: MAFIA.recoverMs.sad,
        onTelegraph: () => {
          this.flash(MAFIA.sadFlash, 500);
          this.rig.to(POSE.heartsWind, MS.heartsWind, 'inOut');
        },
        onFire: () => {
          this.rig.to(POSE.heartsFire, MS.heartsFire, 'out');
          this.rig.to(POSE.slump, MS.heartsBack, 'inOut', 140);
          this.sadHearts();
        },
      },
      {
        id: 'scream',
        weight: () => (this.distToPlayer() < MAFIA.screamRadius + MAFIA.decide.screamNearExtraPx ? MAFIA.decide.screamNear : MAFIA.decide.screamFar),
        telegraphMs: MAFIA.screamTelegraphMs,
        activeMs: 0,
        recoverMs: MAFIA.recoverMs.scream, // the scream wears him out: the moment to hit him
        onTelegraph: () => {
          this.track(telegraphCircle(this.scene, this.x, this.y, MAFIA.screamRadius, MAFIA.screamTelegraphMs, MAFIA.screamColor));
          this.rig.to(POSE.screamWind, MS.screamWind, 'inOut'); // curls up, shaking, tears pouring
        },
        onFire: () => {
          this.rig.to(POSE.screamFire, MS.screamFire, 'out'); // the big open-mouth scream
          this.rig.to(POSE.slump, MS.screamBack, 'inOut', 220);
          this.rig.spray(18, true);
          const blast: ExplosionPayload = { x: this.x, y: this.y, radius: MAFIA.screamRadius, damage: MAFIA.screamDamage, fromBoss: true };
          bus.emit(Events.Explosion, blast);
          const zone: CurseZonePayload = { x: this.x, y: this.y, radius: MAFIA.screamRadius, curse: { kind: BOSS_CURSE.mafia.kind, line: BOSS_CURSE_LINES.mafia } };
          bus.emit(Events.CurseZone, zone); // anyone inside the pink ring is cursed too
          this.heartRing(byPhase(MAFIA.screamHearts, this.phase)); // phase 2: a circle of hearts follows the shockwave
          const floodRadius = MAFIA.screamRadius * MAFIA.flood.reach;
          this.puddles.floodAround(this.x, this.y, floodRadius); // v180: the floor around him turns into one big puddle, wider than the ring...
          this.puddles.splash(byPhase(MAFIA.puddle.count, this.phase), this.x, this.y, floodRadius); // ...and v148: he leaves deeper puddles of tears in it
          this.exhaustedUntil = gameClock.now + MAFIA.recoverMs.scream; // and is wide open while he catches his breath
          this.openWeakPoint(); // the ring and the extra damage on top
        },
      },
      {
        id: 'crew',
        weight: () => (this.ninjaCount() < MAFIA.decide.crewFewBelow ? MAFIA.decide.crewFew : MAFIA.decide.crewMany),
        canUse: () => this.ninjaCount() < MAFIA.decide.crewMax, // never floods the arena
        telegraphMs: MAFIA.crewTelegraphMs,
        activeMs: 0,
        recoverMs: MAFIA.recoverMs.crew,
        onTelegraph: () => {
          this.flash(MAFIA.crewFlash, 600);
          this.rig.to(POSE.crewWind, MS.crewWind, 'inOut'); // sulky lean
        },
        onFire: () => {
          this.rig.to(POSE.crewFire, MS.crewFire, 'out'); // limp wave of the paw
          this.rig.to(POSE.slump, MS.crewBack, 'inOut', 200);
          this.summon('ninja', byPhase(MAFIA.crewCount, this.phase), MAFIA.crewRadius);
        },
      },
    ];
  }

  /** `count` broken hearts flying out evenly in a full circle (none when 0). */
  private heartRing(count: number): void {
    const offset = Math.random() * Math.PI * 2; // a different gap every time
    for (let i = 0; i < count; i++) {
      const heart: SpawnProjectilePayload = { kind: 'heart', x: this.x, y: this.y, angle: offset + (i / count) * Math.PI * 2, speed: MAFIA.heartSpeed };
      bus.emit(Events.SpawnProjectile, heart);
    }
  }

  /** Slow homing hearts in a wide fan around the way Varu is: they leave wide, then curve in on him. */
  private sadHearts(): void {
    const count = byPhase(MAFIA.sadHeartCount, this.phase);
    const spread = Phaser.Math.DegToRad(MAFIA.sadSpreadDeg);
    const base = this.angleToPlayer();
    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
      const heart: SpawnProjectilePayload = { kind: 'heart', x: this.x, y: this.y, angle: base + offset, speed: MAFIA.sadHeartSpeed, homing: true };
      bus.emit(Events.SpawnProjectile, heart);
    }
  }

  /** A fan of broken hearts aimed at Varu. */
  private volley(): void {
    const count = byPhase(MAFIA.heartCount, this.phase);
    const spread = Phaser.Math.DegToRad(MAFIA.heartSpreadDeg);
    const base = this.angleToPlayer();
    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1) - 0.5) * spread;
      const heart: SpawnProjectilePayload = { kind: 'heart', x: this.x, y: this.y, angle: base + offset, speed: MAFIA.heartSpeed };
      bus.emit(Events.SpawnProjectile, heart);
    }
  }
}
