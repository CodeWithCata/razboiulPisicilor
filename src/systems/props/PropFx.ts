/** @file The show for props: leaves, chips, fluff, floating words, ambient things (listens to the bus). */
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { ARENA } from '../../config/arena';
import { BARREL } from '../../config/barrels';
import { BUSH_VARIANTS, FENCE_SPLINTERS, PROP_AMBIENT, PROP_DEBRIS, PROP_FX, PROP_LOOK, PROP_TUNING, ROCK_CRACKS, SMASH, type FxId } from '../../config/props';
import { FONT_SFX } from '../../config/style';
import { BARREL_DESTROY_WORDS, PROP_AMBIENT_TEXT, PROP_CRACK_WORDS, PROP_DESTROY_WORDS, PROP_WORDS, pick } from '../../content/lines';
import { gameClock } from '../../core/clock';
import { Events, listen, type PropAmbientPayload, type PropCrackedPayload, type PropDestroyedPayload, type PropHitPayload } from '../../core/events';
import type { Effects } from '../Effects';

const PARTICLE_DEPTH = 38;

/**
 * The show for props: flying leaves, chips, fluff and dust, floating words, and the little things they do on their own
 * (a leaf comes loose, a bed snores, a rock twinkles). It only LISTENS to the event bus, like systems/Effects.ts,
 * so the prop code never draws anything itself. Everything is code-drawn.
 */
export class PropFx {
  private readonly emitters = new Map<FxId, Phaser.GameObjects.Particles.ParticleEmitter>();
  /** One leaf emitter per bush color (BUSH_VARIANTS). */
  private readonly leafEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly off: Array<() => void> = [];
  private lastWordAt = -Infinity;
  /** Bits lying on the floor where props broke; the oldest vanish past SMASH.debrisMax. */
  private readonly debris: Phaser.GameObjects.Image[] = [];
  /** Splinters from fences hit hard; kept apart so they never push the bush and box bits away. */
  private readonly splinters: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly effects: Pick<Effects, 'floatText' | 'shake'>,
  ) {
    for (const id of Object.keys(PROP_FX) as FxId[]) this.emitters.set(id, this.makeEmitter(id));
    for (const variant of BUSH_VARIANTS) this.leafEmitters.push(this.makeEmitter('leaf', variant.leafTint));

    this.off.push(
      listen<PropHitPayload>(Events.PropHit, (hit) => this.onHit(hit)),
      listen<PropAmbientPayload>(Events.PropAmbient, (e) => this.onAmbient(e)),
      listen<PropDestroyedPayload>(Events.PropDestroyed, (e) => this.onDestroyed(e)),
      listen<PropCrackedPayload>(Events.PropCracked, ({ x, y }) => this.onCrack(x, y)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off.forEach((f) => f()));
  }

  private onHit({ x, y, kind, power, quiet, variant, dirX, dirY }: PropHitPayload): void {
    const look = PROP_LOOK[kind];
    const amount = (quiet ? 0.5 : 1) * (0.5 + 0.5 * power);
    for (const [id, count] of look.fx) {
      const n = Math.round(count * amount);
      if (n > 0) this.emitterFor(id, variant)?.explode(n, x, y);
    }
    if (quiet) return;
    if (kind === 'fence' && power >= FENCE_SPLINTERS.minPower) this.scatterSplinters(x, y, dirX, dirY);
    if (look.shake) this.effects.shake(60, look.shake * power);

    const now = gameClock.now;
    const words = PROP_TUNING.words;
    if (power < words.minPower || now - this.lastWordAt < words.cooldownMs) return;
    this.lastWordAt = now;
    this.effects.floatText(x, y - 22, pick(PROP_WORDS[kind]), look.wordColor, words.size, FONT_SFX);
  }

  /** A prop breaks for good: a big burst, a shake, a word, and bits left on the floor. */
  private onDestroyed({ x, y, kind, variant }: PropDestroyedPayload): void {
    if (kind === 'barrel') {
      this.emitters.get('goo')?.explode(BARREL.burst.goo, x, y); // the mustard splashes everywhere (the barrel system leaves the puddle)
      this.effects.shake(BARREL.burst.shake.ms, BARREL.burst.shake.intensity);
      this.effects.floatText(x, y - 20, pick(BARREL_DESTROY_WORDS), PROP_LOOK.barrel.wordColor, SMASH.word.size, FONT_SFX);
      return;
    }
    if (kind === 'fence' || kind === 'cans' || kind === 'ball') return; // only the 2x2 objects break
    for (const [id, count] of PROP_LOOK[kind].fx) this.emitterFor(id, variant)?.explode(Math.round(count * SMASH.burstFactor), x, y);
    this.emitters.get('dust')?.explode(SMASH.dust, x, y);
    this.effects.shake(SMASH.shake.ms, SMASH.shake.intensity);
    this.effects.floatText(x, y - 34, pick(PROP_DESTROY_WORDS[kind]), PROP_LOOK[kind].wordColor, SMASH.word.size, FONT_SFX);
    this.scatterDebris(kind, x, y, variant);
  }

  /** The emitter for an effect. Leaves take the color of the bush they come from. */
  private emitterFor(id: FxId, variant?: number): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
    if (id === 'leaf' && variant != null) return this.leafEmitters[variant] ?? this.emitters.get(id);
    return this.emitters.get(id);
  }

  private scatterDebris(kind: Exclude<PropDestroyedPayload['kind'], 'fence' | 'cans' | 'ball' | 'barrel'>, x: number, y: number, variant?: number): void {
    const def = PROP_DEBRIS[kind];
    const tints = kind === 'bush' && variant != null ? (BUSH_VARIANTS[variant]?.leafTint ?? def.tint) : def.tint;
    for (let i = 0; i < def.count; i++) {
      const spread = SMASH.debrisSpreadPx;
      const bit = this.scene.add
        .image(x, y, def.tex)
        .setDepth(ARENA.depth.decor + 0.2)
        .setTint(Phaser.Utils.Array.GetRandom([...tints]))
        .setAngle(Phaser.Math.Between(0, 360))
        .setScale(Phaser.Math.FloatBetween(0.55, 1));
      this.scene.tweens.add({ targets: bit, x: x + Phaser.Math.Between(-spread, spread), y: y + Phaser.Math.Between(-spread, spread * 0.8), duration: 240, ease: 'Cubic.easeOut' });
      this.debris.push(bit);
    }
    while (this.debris.length > SMASH.debrisMax) this.debris.shift()?.destroy();
  }

  /** Thin wood slivers fly off a fence that was hit hard and stay on the floor. */
  private scatterSplinters(x: number, y: number, dirX: number, dirY: number): void {
    const S = FENCE_SPLINTERS;
    const count = Phaser.Math.Between(S.count.min, S.count.max);
    const heading = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i++) {
      const angle = heading + Phaser.Math.FloatBetween(-0.9, 0.9);
      const dist = Phaser.Math.Between(S.throwPx.min, S.throwPx.max);
      const side = Phaser.Math.Between(-S.sidewaysPx, S.sidewaysPx) * 0.3;
      const sliver = this.scene.add
        .image(x, y, Tex.Chip)
        .setDepth(ARENA.depth.decor + 0.2)
        .setTint(Phaser.Utils.Array.GetRandom([...S.tint]))
        .setAngle(Phaser.Math.Between(0, 180))
        .setScale(Phaser.Math.FloatBetween(S.scaleX.min, S.scaleX.max), Phaser.Math.FloatBetween(S.scaleY.min, S.scaleY.max));
      this.scene.tweens.add({
        targets: sliver, x: x + Math.cos(angle) * dist - Math.sin(angle) * side, y: y + Math.sin(angle) * dist + Math.cos(angle) * side * 0.5,
        angle: sliver.angle + Phaser.Math.Between(-160, 160), duration: 260, ease: 'Cubic.easeOut',
      });
      this.splinters.push(sliver);
    }
    while (this.splinters.length > S.max) this.splinters.shift()?.destroy();
  }

  /** A rock splits a little more: a burst of chips and dust, a shake, a word. */
  private onCrack(x: number, y: number): void {
    const burst = ROCK_CRACKS.burst;
    this.emitters.get('stone')?.explode(burst.stone, x, y);
    this.emitters.get('dust')?.explode(burst.dust, x, y);
    this.effects.shake(ROCK_CRACKS.shake.ms, ROCK_CRACKS.shake.intensity);
    this.effects.floatText(x, y - 30, pick(PROP_CRACK_WORDS), ROCK_CRACKS.word.color, ROCK_CRACKS.word.size, FONT_SFX);
  }

  private onAmbient({ x, y, action, variant }: PropAmbientPayload): void {
    switch (action) {
      case 'leaf':
        this.leaf(x, y, variant);
        break;
      case 'glint':
        this.glint(x, y);
        break;
      case 'zzz':
        this.zzz(x, y);
        break;
      case 'purr':
        this.effects.floatText(x, y, pick(PROP_AMBIENT_TEXT.purr), PROP_AMBIENT.purr.color, PROP_AMBIENT.purr.size, FONT_SFX);
        break;
    }
  }

  /** A single leaf that comes loose, sways down and fades. */
  private leaf(x: number, y: number, variant = 0): void {
    const cfg = PROP_AMBIENT.leaf;
    const ms = Phaser.Math.Between(cfg.ms.min, cfg.ms.max);
    const leaf = this.scene.add
      .image(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-20, 4), Tex.Leaf)
      .setDepth(cfg.depth)
      .setScale(cfg.scale)
      .setAngle(Phaser.Math.Between(0, 360))
      .setTint(Phaser.Utils.Array.GetRandom([...(BUSH_VARIANTS[variant]?.leafTint ?? BUSH_VARIANTS[0]!.leafTint)]));
    const side = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({ targets: leaf, y: leaf.y + cfg.fallPx, duration: ms, ease: 'Quad.easeIn' });
    this.scene.tweens.add({
      targets: leaf, x: leaf.x + side * cfg.swayPx, angle: leaf.angle + Phaser.Math.Between(-100, 100),
      duration: ms / 3, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({ targets: leaf, alpha: 0, delay: ms * 0.55, duration: ms * 0.45, onComplete: () => leaf.destroy() });
  }

  /** A twinkle: a small star that pops in and out. */
  private glint(x: number, y: number): void {
    const cfg = PROP_AMBIENT.glint;
    const star = this.scene.add.image(x, y, Tex.Star).setDepth(cfg.depth).setScale(0);
    this.scene.tweens.add({
      targets: star, scale: cfg.scale, angle: 90, duration: cfg.ms, yoyo: true, ease: 'Sine.easeOut',
      onComplete: () => star.destroy(),
    });
  }

  /** "z Z": two sleepy letters rising from a bed. */
  private zzz(x: number, y: number): void {
    const cfg = PROP_AMBIENT.zzz;
    cfg.sizes.forEach((size, i) => {
      this.scene.time.delayedCall(i * cfg.gapMs, () => {
        const letter = this.scene.add
          .text(x + i * 10, y, PROP_AMBIENT_TEXT.zzz, { fontFamily: FONT_SFX, fontSize: `${size}px`, color: cfg.color, stroke: '#1b2340', strokeThickness: 4 })
          .setOrigin(0.5)
          .setDepth(cfg.depth);
        this.scene.tweens.add({
          targets: letter, y: y - cfg.risePx, x: letter.x + cfg.driftPx, alpha: 0, scale: 1.35, duration: cfg.ms, ease: 'Sine.easeOut',
          onComplete: () => letter.destroy(),
        });
      });
    });
  }

  private makeEmitter(id: FxId, tint: readonly number[] = PROP_FX[id].tint): Phaser.GameObjects.Particles.ParticleEmitter {
    const def = PROP_FX[id];
    return this.scene.add
      .particles(0, 0, def.tex, {
        emitting: false,
        lifespan: { ...def.lifespan },
        speed: { ...def.speed },
        gravityY: def.gravityY,
        scale: { ...def.scale },
        alpha: { ...def.alpha },
        tint: [...tint],
        ...(def.spin ? { rotate: { min: 0, max: 360 } } : {}),
      })
      .setDepth(PARTICLE_DEPTH);
  }
}
