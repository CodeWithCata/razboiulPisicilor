/** @file Brings the stand fans to life: idle sway and fidgets, moods (calm / cheer / roar / gloom / boo), La Ola, arms-up frames, confetti, shouts and the fan that throws something. Visual only, real time. */
import { texRef } from '../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../assets/keys';
import { CULL } from '../config/culling';
import { CROWD, MOOD_KEYS, type CrowdMood, type MoodLook, type ShoutKind, type ThrowPick, type ThrowSpot } from '../config/crowd';
import { BOMBER_ENTRANCE, CROWD_LINES, pick } from '../content/lines';
import { PERF } from '../config/perf';
import { usesTouchControls } from '../core/device';
import { Events, listen } from '../core/events';
import type { BossStunnedPayload, PointPayload, WavePayload } from '../core/events';
import type { StandsBuild, StandsFan, StandsPiece } from './Stands';
import { RING_LENGTH, ringPosition } from './standsRing';

const TAU = Math.PI * 2;
/** Which mood wins when two want the crowd at once. */
const RANK: Record<CrowdMood, number> = { calm: 0, cheer: 1, boo: 1.5, roar: 2, gloom: 3 };
/** The order the dev key walks through the moods. */

/** What the scene hands the crowd once the rest of the game exists. */
export interface CrowdHooks {
  /** Floats a word over the stands (Effects.floatText). */
  say: (x: number, y: number, text: string, color: string, size: number) => void;
  /** True while exactly one cat is left in a wave that has already put every cat into the arena. */
  isLastCat: () => boolean;
}

/** Deterministic 0..1 from a number: the same fan always rolls the same. */
function hash01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The crowd. `update(delta)` is called once per frame by GameScene (also on the end screens' last frames, so it can roar or sulk).
 * It runs on REAL time: the slow-mo of the last cat must not slow it. Only the fans on screen (plus a margin) are moved, up to
 * `CROWD.maxAnimated`; a fan that leaves the view fades its motion out and then rests. No per-fan tweens, no allocation per frame.
 */
export class StandsCrowd {
  private readonly fans: readonly StandsFan[];
  private readonly looks: StandsBuild['looks'];
  private readonly pieces: readonly StandsPiece[];
  /** Fan indices in a fixed shuffled order, so when there are more fans on screen than `limit` the same ones rest (it looks random). */
  private readonly order: Int32Array;
  /** 0..1 per fan: how much of its motion it shows (fades in and out when it enters or leaves the animated set). */
  private readonly live: Float32Array;
  /** Which of the three pictures a fan shows now (0 = arms down, 1 / 2 = arms up). */
  private readonly shown: Int8Array;
  /** A steady 0..1 per fan: it has its arms up when this is below the mood's `arms` share. */
  private readonly armsRoll: Float32Array;
  /** The fans animated this frame (indices): confetti and shouts come from these. */
  private readonly visible: number[] = [];
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter | null;
  private readonly off: Array<() => void> = [];
  private readonly touch = usesTouchControls();
  /** This frame's mood numbers, filled in place by `animate` (one object for the whole run, not one per frame). */
  private readonly look = { hop: 0, tilt: 0, lean: 0, sway: 0, arms: 0 };
  private readonly baseLimit = this.touch ? CROWD.touchMaxAnimated : CROWD.maxAnimated;
  /** How many fans may animate at once: `baseLimit`, lowered while the phone is struggling (`adapt`). */
  private limit: number = this.baseLimit;
  private adaptScale = 1;
  private slowRun = 0;
  private fastRun = 0;
  private hooks: CrowdHooks | null = null;

  /** The eased numbers of the mood the crowd is in right now. */
  private readonly cur: MoodLook = { ...CROWD.moods.calm };
  private mood: CrowdMood = 'calm';
  /** Crowd time (ms, real, only moves while the scene runs) at which the mood ends. */
  private until = Infinity;
  private t = 0;
  private wave = 1;

  private pulseAmt = 0;
  private olaOn = false;
  private olaTravel = 0;
  private olaStart = 0;
  private confettiLeft = 0;
  private confettiAt = 0;
  private lastShoutAt = -Infinity;
  private lastKillAt = -Infinity;
  private streak = 0;
  private lastCatDone = false;
  private lastCatTimer = 0;

  /** The fan that is throwing something (index into `fans`), -1 = nobody. Crowd time (ms) it started winding up, when it let go (-1 = not yet) and how long the wind-up is. */
  private throwIndex = -1;
  private throwStart = 0;
  private throwReleasedAt = -1;
  private throwWindMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    stands: StandsBuild,
  ) {
    this.fans = stands.fans;
    this.pieces = stands.pieces;
    this.looks = stands.looks;
    this.order = Int32Array.from(this.fans.map((_fan, i) => i).sort((a, b) => this.fans[a]!.phase - this.fans[b]!.phase));
    this.live = new Float32Array(this.fans.length);
    this.shown = new Int8Array(this.fans.length);
    this.armsRoll = Float32Array.from(this.fans.map((fan, i) => hash01(fan.phase * 53.17 + i)));
    this.confetti = this.makeConfetti();
    if (!CROWD.enabled) return;

    this.off.push(
      listen<WavePayload>(Events.WaveStarted, ({ wave }) => {
        this.wave = wave;
        this.lastCatDone = false;
        this.hold('cheer', CROWD.cheer.waveStartMs);
        this.shout('cheer');
      }),
      listen<WavePayload>(Events.WaveCleared, () => this.roar(CROWD.roar.waveClearedMs, true)),
      listen(Events.EnemyKilled, () => this.onKill()),
      listen(Events.BossSpawned, () => {
        this.hold('cheer', CROWD.cheer.bossMs);
        this.pulseAmt = 1;
        this.shout('boss');
      }),
      listen(Events.BossDefeated, () => this.roar(CROWD.roar.bossDefeatedMs, false)),
      // v147: the stands boo when Federer is stunned (a word always shouts, even inside the usual quiet gap).
      listen<BossStunnedPayload>(Events.BossStunned, ({ boss }) => {
        if (boss !== 'federer') return;
        this.hold('boo', CROWD.boo.stunMs);
        this.shout('boo');
      }),
      listen(Events.CatSurrender, () => {
        this.hold('cheer', CROWD.cheer.surrenderMs);
        this.pulseAmt = 1;
        this.shout('surrender');
      }),
      // A fan let go of something (systems/FanThrowSystem.ts): everybody cheers and hops a little. The thrower's own motion is `beginThrow` / `releaseThrow`.
      listen(Events.FanThrow, () => {
        this.hold('cheer', CROWD.cheer.throwMs);
        this.pulseAmt = Math.max(this.pulseAmt, CROWD.thrower.pulse);
      }),
      // v170: the first bomber cat of the run: the stands cheer, a fan shouts at once (never held back by the quiet gap) and her name floats over her.
      listen<PointPayload>(Events.BomberArrived, ({ x, y }) => {
        this.hold('cheer', CROWD.cheer.bomberMs);
        this.pulseAmt = 1;
        this.shout('bomber');
        this.hooks?.say(x, y - CROWD.shout.bomberNameLiftPx, BOMBER_ENTRANCE, CROWD.shout.bomberNameColor, CROWD.shout.bomberNameSize);
      }),
      // v170: Varu's belt knocked a petard back at the bomber: the stands go wild for a moment.
      listen(Events.PetardSwatted, () => {
        this.hold('cheer', CROWD.cheer.throwMs);
        this.pulseAmt = Math.max(this.pulseAmt, CROWD.thrower.pulse);
      }),
      listen(Events.Victory, () => this.roar(CROWD.roar.victoryMs, true)),
      listen(Events.GameOver, () => {
        this.hold('gloom', Infinity);
        this.shout('gloom');
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  /** The scene gives the crowd its words and its "last cat" check once the other systems exist. */
  connect(hooks: CrowdHooks): void {
    this.hooks = hooks;
  }

  /** Dev (debug card): forces this mood right now. */
  debugSet(mood: CrowdMood): CrowdMood {
    this.mood = mood;
    this.until = mood === 'calm' || mood === 'gloom' ? Infinity : this.t + CROWD.debugHoldMs;
    if (mood === 'roar') this.startOla();
    if (mood === 'roar') this.startConfetti();
    this.shout(mood === 'roar' ? 'roar' : mood === 'gloom' ? 'gloom' : mood === 'boo' ? 'boo' : 'cheer');
    return mood;
  }

  /** Called every half second with the measured average frame time (ms): fewer animated fans while the game is slow, back to normal when it is smooth again (`PERF.adapt`). */
  adapt(frameAvgMs: number): void {
    const A = PERF.adapt;
    if (frameAvgMs > A.slowMs) {
      this.fastRun = 0;
      this.slowRun += 1;
      if (this.slowRun >= A.slowSamples) {
        this.slowRun = 0;
        this.adaptScale = Math.max(A.minScale, this.adaptScale - A.step);
      }
    } else if (frameAvgMs < A.fastMs) {
      this.slowRun = 0;
      this.fastRun += 1;
      if (this.fastRun >= A.fastSamples) {
        this.fastRun = 0;
        this.adaptScale = Math.min(1, this.adaptScale + A.step);
      }
    } else {
      this.slowRun = 0;
      this.fastRun = 0;
    }
    this.limit = Math.round(this.baseLimit * this.adaptScale);
  }

  update(deltaMs: number): void {
    if (!CROWD.enabled) {
      this.cull();
      return;
    }
    const dt = Math.min(deltaMs, CROWD.maxStepMs);
    this.t += dt;
    if (this.t >= this.until) {
      this.mood = 'calm';
      this.until = Infinity;
    }
    this.easeMood(dt);
    this.pulseAmt = Math.max(0, this.pulseAmt - dt / CROWD.pulse.decayMs);
    this.tickOla(dt);
    this.tickConfetti();
    this.tickLastCat(dt);
    this.tickThrower();
    this.animate(dt);
    this.cull();
  }

  /** Hides the fans outside the camera view plus CULL.standsMarginPx, and shows them again when they come back. A picture only: no physics, no logic reads it. */
  private cull(): void {
    const view = this.scene.cameras.main.worldView;
    const m = CULL.standsMarginPx;
    const x0 = view.x - m;
    const y0 = view.y - m;
    const x1 = view.right + m;
    const y1 = view.bottom + m;
    for (let i = 0; i < this.fans.length; i++) {
      const fan = this.fans[i]!;
      const culled = fan.baseX < x0 || fan.baseX > x1 || fan.baseY < y0 || fan.baseY > y1;
      if (culled === fan.culled) continue;
      fan.culled = culled;
      fan.sprite.setVisible(!culled);
    }
    // The big still pictures: hidden when their whole rectangle is outside the view plus the margin.
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i]!;
      const img = piece.image;
      const culled = img.x + img.displayWidth < x0 || img.x > x1 || img.y + img.displayHeight < y0 || img.y > y1;
      if (culled === piece.culled) continue;
      piece.culled = culled;
      img.setVisible(!culled);
    }
  }

  /**
   * A fan for a throw (systems/FanThrowSystem.ts): one of the first terrace rows, `minDist`..`maxDist` px from the given point (on screen or not).
   * It starts to wind up right away (arms up, leaning back) and keeps going until `releaseThrow`. Returns where it stands,
   * or null when no fan fits (or another fan is still throwing).
   */
  beginThrow(pick: ThrowPick): ThrowSpot | null {
    if (!CROWD.enabled || this.throwIndex >= 0) return null;
    const min2 = pick.minDist * pick.minDist;
    const max2 = pick.maxDist * pick.maxDist;
    const pool: number[] = [];
    for (let i = 0; i < this.fans.length; i++) {
      const fan = this.fans[i]!;
      if (fan.tier < 0 || fan.tier > pick.maxTier) continue; // no VIP boxes, and only the rows near the fence
      const dx = fan.baseX - pick.x;
      const dy = fan.baseY - pick.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < min2 || d2 > max2) continue;
      pool.push(i); // on screen or not: the item flies into view either way
    }
    if (pool.length === 0) return null;
    const i = pool[Math.floor(Math.random() * pool.length)]!;
    this.throwIndex = i;
    this.throwStart = this.t;
    this.throwReleasedAt = -1;
    this.throwWindMs = pick.windUpMs;
    const fan = this.fans[i]!;
    return { x: fan.baseX, y: fan.baseY };
  }

  /** The throwing fan lets go: it lunges at the field, then settles back (`CROWD.thrower`). Does nothing when nobody is winding up. */
  releaseThrow(): void {
    if (this.throwIndex >= 0 && this.throwReleasedAt < 0) this.throwReleasedAt = this.t;
  }

  /** Lets the thrower rest again once its lunge is over (or when the throw was never let go). */
  private tickThrower(): void {
    if (this.throwIndex < 0) return;
    const T = CROWD.thrower;
    const over = this.throwReleasedAt < 0 ? this.t - this.throwStart > T.maxHoldMs : this.t - this.throwReleasedAt >= T.releaseMs;
    if (over) this.throwIndex = -1;
  }

  /* ------------------------------------------------------------ moods and events */

  /** Puts the crowd in a mood for `ms`. A stronger mood is never pushed out by a weaker one; the same mood is only extended. */
  private hold(mood: CrowdMood, ms: number): void {
    if (this.mood !== 'calm' && this.t < this.until && RANK[this.mood] > RANK[mood]) return;
    if (this.mood === mood) {
      this.until = Math.max(this.until, this.t + ms);
      return;
    }
    this.mood = mood;
    this.until = this.t + ms;
  }

  private roar(ms: number, ola: boolean): void {
    this.hold('roar', ms);
    if (ola) this.startOla();
    this.startConfetti();
    this.shout('roar');
  }

  private onKill(): void {
    const s = CROWD.streak;
    this.streak = this.t - this.lastKillAt <= s.windowMs ? this.streak + 1 : 1;
    this.lastKillAt = this.t;
    if (this.streak % s.kills !== 0) return;
    this.hold('cheer', CROWD.cheer.streakMs);
    this.shout('cheer');
  }

  private tickLastCat(dt: number): void {
    if (this.lastCatDone || !this.hooks) return;
    this.lastCatTimer += dt;
    if (this.lastCatTimer < CROWD.lastCatEveryMs) return;
    this.lastCatTimer = 0;
    if (!this.hooks.isLastCat()) return;
    this.lastCatDone = true;
    this.hold('cheer', CROWD.cheer.lastCatMs);
    this.shout('cheer');
  }

  /** Every number of the mood glides toward the target one (faster when the crowd moves INTO a loud mood, slow when it calms down). */
  private easeMood(dt: number): void {
    const target = CROWD.moods[this.mood];
    const k = 1 - Math.exp(-dt / (CROWD.easeMs[this.mood] / 3));
    for (const key of MOOD_KEYS) this.cur[key] += (target[key] - this.cur[key]) * k;
  }

  /** A little louder with every wave, never more than `maxGain`. */
  private gain(): number {
    const w = CROWD.waves;
    return 1 + Math.min(w.maxGain, w.gainPerWave * Math.max(0, this.wave - 1));
  }

  /* ------------------------------------------------------------ La Ola, confetti, shouts */

  /** One pulse runs once round the whole ring, starting at the stands nearest to the camera. */
  private startOla(): void {
    if (!CROWD.ola.enabled) return;
    const view = this.scene.cameras.main.worldView;
    this.olaStart = ringPosition(view.centerX, view.centerY);
    this.olaTravel = 0;
    this.olaOn = true;
  }

  private tickOla(dt: number): void {
    if (!this.olaOn) return;
    this.olaTravel += (CROWD.ola.speedPxPerSec * dt) / 1000;
    if (this.olaTravel >= RING_LENGTH * CROWD.ola.laps + CROWD.ola.widthPx * 2) this.olaOn = false;
  }

  private makeConfetti(): Phaser.GameObjects.Particles.ParticleEmitter | null {
    const c = CROWD.confetti;
    if (!CROWD.enabled || !c.enabled) return null;
    return this.scene.add
      .particles(0, 0, texRef(Tex.Particle).key, { frame: texRef(Tex.Particle).frame,
        emitting: false,
        lifespan: { min: c.lifeMs.min, max: c.lifeMs.max },
        speed: { min: c.speed.min, max: c.speed.max },
        angle: { min: 0, max: 360 },
        scale: { start: c.scale.start, end: c.scale.end },
        alpha: { start: 1, end: 0 },
        tint: [...c.colors],
      })
      .setDepth(c.depth);
  }

  private startConfetti(): void {
    if (!this.confetti) return;
    const share = this.touch ? CROWD.confetti.touchShare : 1;
    this.confettiLeft = Math.max(1, Math.round(CROWD.confetti.bursts * share));
    this.confettiAt = this.t;
  }

  private tickConfetti(): void {
    const c = CROWD.confetti;
    const share = this.touch ? c.touchShare : 1;
    while (this.confetti && this.confettiLeft > 0 && this.t >= this.confettiAt) {
      this.confettiLeft -= 1;
      this.confettiAt += c.gapMs;
      const fan = this.randomVisible();
      if (fan) this.confetti.explode(Math.max(1, Math.round(c.perBurst * share)), fan.baseX, fan.baseY);
    }
  }

  private randomVisible(): StandsFan | undefined {
    const n = this.visible.length;
    if (n === 0) return undefined;
    return this.fans[this.visible[Math.floor(Math.random() * n)]!];
  }

  /** A word from a random fan on screen. Never more often than `minGapMs`, and only sometimes (`chance`). */
  private shout(kind: ShoutKind): void {
    const s = CROWD.shout;
    if (!s.enabled || !this.hooks) return;
    if (((kind !== 'boo' && kind !== 'bomber') && this.t - this.lastShoutAt < s.minGapMs) || Math.random() >= s.chance[kind]) return;
    const fan = this.randomVisible();
    if (!fan) return;
    this.lastShoutAt = this.t;
    this.hooks.say(fan.baseX, fan.baseY - s.liftPx, pick(CROWD_LINES[kind]), s.color, s.size);
  }

  /* ------------------------------------------------------------ the fans */

  private animate(dt: number): void {
    const view = this.scene.cameras.main.worldView;
    const m = CROWD.viewMarginPx;
    const x0 = view.x - m;
    const y0 = view.y - m;
    const x1 = view.right + m;
    const y1 = view.bottom + m;
    const liveStep = dt / CROWD.liveFadeMs;
    const g = this.gain();
    const L = this.cur;
    const look = this.look;
    look.hop = L.hop * g;
    look.tilt = L.tiltDeg * g;
    look.lean = L.lean * g;
    look.sway = L.swayDeg * g;
    look.arms = Math.min(1, L.arms * g);
    this.visible.length = 0;
    let used = 0;
    for (let n = 0; n < this.order.length; n++) {
      const i = this.order[n]!;
      const fan = this.fans[i]!;
      const inView = fan.baseX >= x0 && fan.baseX <= x1 && fan.baseY >= y0 && fan.baseY <= y1;
      const on = inView && used < this.limit;
      let live = this.live[i]!;
      if (on) {
        used += 1;
        this.visible.push(i);
        live = Math.min(1, live + liveStep);
      } else if (live > 0) {
        live = Math.max(0, live - liveStep);
      } else {
        continue; // at rest already
      }
      this.live[i] = live;
      this.pose(fan, i, live, look);
    }
  }

  /** Puts one fan where the mood, its own beat, La Ola and the pulse want it. `live` fades all of it in and out. */
  private pose(fan: StandsFan, i: number, live: number, look: { hop: number; tilt: number; lean: number; sway: number; arms: number }): void {
    const L = this.cur;
    const tSec = this.t / 1000;
    const phase01 = fan.phase / TAU;
    const side = fan.phase < Math.PI ? 1 : -1;
    const box = fan.tier < 0;

    // The hop: an arch per beat. Each fan has its own beat; with `sync` the beats line up along the ring, so one ripple runs round.
    const beat = tSec * L.hopHz + phase01 + (fan.ringPos / CROWD.rippleWavelengthPx - phase01) * L.sync;
    const arch = Math.sin(Math.PI * (beat - Math.floor(beat)));
    let hop = look.hop * arch;
    let tilt = look.tilt * arch;
    let lean = look.lean * arch;

    // Idle life: now and then a fan does one little hop of its own.
    const f = CROWD.fidget;
    const slot = this.t / f.periodMs + phase01;
    const slotNo = Math.floor(slot);
    if (hash01(slotNo * 17.13 + fan.phase * 91.7) < f.chance) {
      const local = (slot - slotNo) * f.periodMs;
      if (local < f.hopMs) {
        const bump = Math.sin((Math.PI * local) / f.hopMs);
        hop += f.hop * bump;
        tilt += f.tiltDeg * bump;
      }
    }

    // A one-off shock (a boss walks in, a cat gives up): everybody hops at once.
    const p = CROWD.pulse;
    hop += p.hop * this.pulseAmt * this.pulseAmt;
    tilt += p.tiltDeg * this.pulseAmt * this.pulseAmt;

    // La Ola: a bump that runs round the ring.
    let ola = 0;
    if (this.olaOn) {
      const o = CROWD.ola;
      const pos = this.olaStart - o.widthPx + this.olaTravel;
      const d = ((((fan.ringPos - pos + RING_LENGTH / 2) % RING_LENGTH) + RING_LENGTH) % RING_LENGTH) - RING_LENGTH / 2;
      if (Math.abs(d) < o.widthPx) ola = 0.5 + 0.5 * Math.cos((Math.PI * d) / o.widthPx);
      hop += o.hop * ola;
      lean += o.lean * ola;
      tilt += o.tiltDeg * ola;
    }

    // The fan that throws something: leans back, swells and wobbles while it winds up, lunges at the field when it lets go, then settles.
    const throwing = i === this.throwIndex;
    if (throwing) {
      const T = CROWD.thrower;
      if (this.throwReleasedAt < 0) {
        const k = Math.min(1, (this.t - this.throwStart) / Math.max(1, this.throwWindMs));
        hop = T.windGrow * k;
        lean = -T.windLeanPx * k;
        tilt = T.windTiltDeg * k * Math.sin(tSec * T.wobbleHz * TAU);
      } else {
        const out = 1 - Math.min(1, (this.t - this.throwReleasedAt) / T.releaseMs);
        hop = T.releaseGrow * out;
        lean = T.releaseLeanPx * out * out;
        tilt = 0;
      }
    }

    // The VIPs in the balcony boxes lean on the railing: they rock forward and back, and hop a bit less.
    if (box) {
      const b = CROWD.box;
      hop *= b.hopShare;
      lean = lean * b.leanShare + b.restLean * (1 + Math.sin(tSec * L.swayHz * TAU + fan.phase * 1.3));
    }

    // Arms: the mood gives a share of the crowd its arms up; a pulse or La Ola lifts everybody it touches.
    const armsUp = live > 0.5 && (throwing || this.armsRoll[i]! < look.arms || this.pulseAmt > p.armsAbove || ola > CROWD.ola.armsAbove);
    const picture = armsUp ? 1 + (Math.floor((this.t + fan.phase * CROWD.armSwapMs) / CROWD.armSwapMs) & 1) : 0;
    if (this.shown[i] !== picture) {
      const frame = this.looks[fan.look]![picture]!;
      fan.sprite.setTexture(frame.key, frame.frame);
      this.shown[i] = picture;
    }

    const breath = L.breath * Math.sin(tSec * L.breathHz * TAU + fan.phase * 1.7);
    const sway = look.sway * Math.sin(tSec * L.swayHz * TAU + fan.phase);
    const grow = (breath + L.slump + hop) * live;
    const turn = ((sway + tilt * side) * live * Math.PI) / 180;
    const push = lean * live;
    fan.sprite.setScale(fan.baseScale * (1 + grow));
    fan.sprite.setRotation(fan.baseRot + turn);
    fan.sprite.setPosition(fan.baseX + fan.fwdX * push, fan.baseY + fan.fwdY * push);
  }
}
