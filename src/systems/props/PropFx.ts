/** @file The show for props: leaves, chips, fluff, floating words, ambient things (listens to the bus). */
import { texArgs, texRef } from '../../assets/atlas';
import Phaser from 'phaser';
import { Tex } from '../../assets/keys';
import { BED_CAGE_FX } from '../../config/animation';
import { ARENA } from '../../config/arena';
import { BARREL } from '../../config/barrels';
import { BUSH_STATES, BUSH_VARIANTS, FENCE_SPLINTERS, PROP_AMBIENT, PROP_DEBRIS, PROP_FX, PROP_LOOK, PROP_TUNING, ROCK_CRACKS, SMASH, type FxId } from '../../config/props';
import { FONT_SFX } from '../../config/style';
import { BARREL_DESTROY_WORDS, BED_CAGE_WORDS, BED_CAGED_CAT_LINES, BED_ESCAPE_WORDS, BED_REARM_WORDS, LAMP_DESTROY_WORDS, PROP_AMBIENT_TEXT, PROP_CRACK_WORDS, PROP_DESTROY_WORDS, PROP_WORDS, pick } from '../../content/lines';
import { gameClock } from '../../core/clock';
import { Events, listen, type BedRearmedPayload, type CatCagedPayload, type CatReleasedPayload, type PropAmbientPayload, type PropCrackedPayload, type PropDestroyedPayload, type PropHitPayload, type PropThinnedPayload } from '../../core/events';
import type { Effects } from '../Effects';

const PARTICLE_DEPTH = 38;

/** The stand-in for a caged cat (the real one is hidden): bars + lock over the cat, all in one container. */
interface CageRig {
  root: Phaser.GameObjects.Container;
  cat: Phaser.GameObjects.Image;
  bars: Phaser.GameObjects.Graphics;
  lock: Phaser.GameObjects.Graphics;
  miau: Phaser.Time.TimerEvent | null;
}

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
  /** One rig per caged bed (by bed id). */
  private readonly cages = new Map<number, CageRig>();

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
      listen<PropThinnedPayload>(Events.PropThinned, (e) => this.onThinned(e)),
      listen<CatCagedPayload>(Events.CatCaged, (e) => this.onCaged(e)),
      listen<CatReleasedPayload>(Events.CatReleased, (e) => this.onReleased(e)),
      listen<BedRearmedPayload>(Events.BedRearmed, (e) => this.onRearmed(e)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off.forEach((f) => f());
      this.cages.clear(); // the scene destroys the objects, tweens and timers itself
    });
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
    if (kind === 'lamp') {
      // The lantern shatters: glass glints and bits fly, then the light is gone.
      for (const [id, count] of PROP_LOOK.lamp.fx) this.emitterFor(id)?.explode(Math.round(count * SMASH.burstFactor), x, y);
      this.emitters.get('dust')?.explode(SMASH.dust, x, y + 40);
      this.effects.shake(SMASH.shake.ms, SMASH.shake.intensity);
      this.effects.floatText(x, y - 30, pick(LAMP_DESTROY_WORDS), PROP_LOOK.lamp.wordColor, SMASH.word.size, FONT_SFX);
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

  private scatterDebris(kind: Exclude<PropDestroyedPayload['kind'], 'fence' | 'cans' | 'ball' | 'barrel' | 'lamp'>, x: number, y: number, variant?: number): void {
    const def = PROP_DEBRIS[kind];
    const tints = kind === 'bush' && variant != null ? (BUSH_VARIANTS[variant]?.leafTint ?? def.tint) : def.tint;
    for (let i = 0; i < def.count; i++) {
      const spread = SMASH.debrisSpreadPx;
      const bit = this.scene.add
        .image(x, y, ...texArgs(def.tex))
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
        .image(x, y, ...texArgs(Tex.Chip))
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

  /** A bush got a size smaller: a few more leaves in its own color fly off. */
  private onThinned({ x, y, variant }: PropThinnedPayload): void {
    this.emitterFor('leaf', variant)?.explode(BUSH_STATES.burst.leaf, x, y);
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

  /** A cat was locked in: the bars drop and slam shut with a shake, the lock pops on, a word. The cat shows behind the bars and shakes, muffled. */
  private onCaged({ x, y, cat, bedId }: CatCagedPayload): void {
    this.dropRig(bedId, false);
    const C = BED_CAGE_FX;
    const sprite = cat as Phaser.GameObjects.Sprite;
    const k = Math.min(1, C.cat.fitW / sprite.displayWidth, C.cat.fitH / sprite.displayHeight);
    const image = this.scene.add
      .image(-C.cat.shakePx, 0, ...texArgs(sprite.frame.name))
      .setDisplaySize(sprite.displayWidth * k, sprite.displayHeight * k)
      .setTint(C.cat.tint)
      .setAlpha(C.cat.alpha);
    const bars = this.drawBars().setAlpha(0);
    bars.y = -C.drop.fromPx;
    const lock = this.drawLock().setScale(0);
    const root = this.scene.add.container(x, y + C.box.offsetY, [image, bars, lock]).setDepth(C.depth);
    const rig: CageRig = { root, cat: image, bars, lock, miau: null };
    this.cages.set(bedId, rig);

    this.scene.tweens.add({ targets: bars, y: 0, alpha: 1, duration: C.drop.ms, ease: 'Bounce.easeOut' });
    this.scene.tweens.add({ targets: lock, scale: 1, delay: C.lock.popDelayMs, duration: C.lock.popMs, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: root, x: root.x + C.slam.px, duration: C.slam.ms, yoyo: true, repeat: C.slam.repeats, ease: 'Sine.easeInOut', delay: C.drop.ms * 0.6 });
    this.scene.tweens.add({ targets: image, x: C.cat.shakePx, angle: C.cat.wobbleDeg, duration: C.cat.shakeMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.effects.shake(C.slam.cameraMs, C.slam.cameraIntensity);
    this.effects.floatText(x, y + C.word.offsetY, pick(BED_CAGE_WORDS), C.word.color, C.word.size, FONT_SFX);
    this.scheduleMiau(rig, x, y, C.miau.firstMs);
  }

  /** The cat is out (or the bed broke): the bars lift away, fluff flies (a bigger burst if it escaped by itself). */
  private onReleased({ x, y, bedId, escaped }: CatReleasedPayload): void {
    const R = BED_CAGE_FX.release;
    this.dropRig(bedId, true);
    this.emitters.get('fluff')?.explode(escaped ? R.fluffEscaped : R.fluff, x, y);
    if (!escaped) return;
    this.emitters.get('glint')?.explode(R.glintEscaped, x, y);
    this.effects.shake(R.shakeMs, R.shakeIntensity);
    this.effects.floatText(x, y + R.word.offsetY, pick(BED_ESCAPE_WORDS), R.word.color, R.word.size, FONT_SFX);
  }

  /** The pillow is back: a small pop, and a pillow drops onto the bed, squashes, springs back and fades into the real one. */
  private onRearmed({ x, y, bedId }: BedRearmedPayload): void {
    this.dropRig(bedId, false);
    const A = BED_CAGE_FX.rearm;
    const restY = y + A.restOffsetY;
    const pillow = this.drawPillow().setPosition(x, restY - A.startPx).setScale(0.5).setAlpha(0).setDepth(BED_CAGE_FX.depth);
    this.scene.tweens.add({
      targets: pillow, y: restY, scale: 1, alpha: 1, duration: A.fallMs, ease: 'Quad.easeIn',
      onComplete: () => {
        this.emitters.get('glint')?.explode(A.pop.glint, x, restY);
        this.emitters.get('fluff')?.explode(A.pop.fluff, x, restY);
        this.effects.floatText(x, y + A.word.offsetY, pick(BED_REARM_WORDS), A.word.color, A.word.size, FONT_SFX);
        this.scene.tweens.add({
          targets: pillow, scaleX: A.squashX, scaleY: A.squashY, duration: A.squashMs, ease: 'Quad.easeOut',
          onComplete: () => {
            this.scene.tweens.add({ targets: pillow, scaleX: 1, scaleY: 1, duration: A.springMs, ease: 'Elastic.easeOut' });
            this.scene.tweens.add({ targets: pillow, y: restY - A.hopPx, duration: A.springMs / 3, yoyo: true, ease: 'Sine.easeOut' });
            this.scene.tweens.add({ targets: pillow, alpha: 0, delay: A.springMs + A.holdMs, duration: A.fadeMs, onComplete: () => pillow.destroy() });
          },
        });
      },
    });
  }

  /** A muffled "miau" from the cage now and then, until the rig is gone. */
  private scheduleMiau(rig: CageRig, x: number, y: number, delayMs: number): void {
    const M = BED_CAGE_FX.miau;
    rig.miau = this.scene.time.delayedCall(delayMs, () => {
      this.effects.floatText(x, y + M.offsetY, pick(BED_CAGED_CAT_LINES), M.color, M.size, FONT_SFX);
      this.scheduleMiau(rig, x, y, Phaser.Math.Between(M.everyMs.min, M.everyMs.max));
    });
  }

  /** Remove a bed's cage picture. `lift` = the bars rise and fade (the cat got out), otherwise gone at once. */
  private dropRig(bedId: number, lift: boolean): void {
    const rig = this.cages.get(bedId);
    if (!rig) return;
    this.cages.delete(bedId);
    rig.miau?.remove(false);
    this.scene.tweens.killTweensOf([rig.root, rig.cat, rig.bars, rig.lock]);
    if (!lift) {
      rig.root.destroy();
      return;
    }
    const R = BED_CAGE_FX.release;
    this.scene.tweens.add({ targets: rig.root, y: rig.root.y - R.liftPx, alpha: 0, duration: R.liftMs, ease: 'Quad.easeOut', onComplete: () => rig.root.destroy() });
  }

  /** The bars: rails on top and bottom, thin steel bars between, navy outline like the rest of the art. */
  private drawBars(): Phaser.GameObjects.Graphics {
    const { box, bars: B } = BED_CAGE_FX;
    const g = this.scene.add.graphics();
    const w = box.halfW * 2;
    const h = box.halfH * 2;
    const gap = (w - B.width) / (B.count - 1);
    g.lineStyle(B.outlinePx, B.outline, 1);
    for (let i = 0; i < B.count; i++) {
      const bx = -box.halfW + i * gap;
      g.fillStyle(B.fill, 1).fillRect(bx, -box.halfH, B.width, h);
      g.strokeRect(bx, -box.halfH, B.width, h);
      g.fillStyle(B.light, 1).fillRect(bx + 1, -box.halfH + 3, 1.5, h - 6);
    }
    for (const ry of [-box.halfH - B.rail / 2, box.halfH - B.rail / 2]) {
      g.fillStyle(B.fill, 1).fillRoundedRect(-box.halfW - 3, ry, w + 6, B.rail, 2);
      g.strokeRoundedRect(-box.halfW - 3, ry, w + 6, B.rail, 2);
    }
    return g;
  }

  /** The padlock on the bottom rail (its origin is the lock's own center, so it pops from there). */
  private drawLock(): Phaser.GameObjects.Graphics {
    const { box, bars, lock: L } = BED_CAGE_FX;
    const g = this.scene.add.graphics().setPosition(0, box.halfH - bars.rail / 2);
    g.lineStyle(4, bars.outline, 1).beginPath().arc(0, -L.h / 2, L.shackleR, Math.PI, 0).strokePath();
    g.lineStyle(2, bars.fill, 1).beginPath().arc(0, -L.h / 2, L.shackleR, Math.PI, 0).strokePath();
    g.fillStyle(L.fill, 1).fillRoundedRect(-L.w / 2, -L.h / 2, L.w, L.h, 3);
    g.lineStyle(bars.outlinePx, bars.outline, 1).strokeRoundedRect(-L.w / 2, -L.h / 2, L.w, L.h, 3);
    g.fillStyle(L.keyhole, 1).fillCircle(0, -1, 2).fillRect(-1, -1, 2, 5);
    return g;
  }

  /** A plump pillow seen from above: pink oval, darker underside, a seam and two corner tufts. */
  private drawPillow(): Phaser.GameObjects.Graphics {
    const P = BED_CAGE_FX.rearm.pillow;
    const g = this.scene.add.graphics();
    g.fillStyle(P.shade, 1).fillEllipse(0, 3, P.w, P.h);
    g.fillStyle(P.fill, 1).fillEllipse(0, 0, P.w - 4, P.h - 6);
    g.lineStyle(P.outlinePx, P.outline, 1).strokeEllipse(0, 1, P.w, P.h);
    g.lineStyle(2, P.seam, 1).lineBetween(-P.w * 0.28, -2, P.w * 0.28, -2);
    g.fillStyle(P.shade, 1).fillCircle(-P.w / 2 + 2, 1, 3).fillCircle(P.w / 2 - 2, 1, 3);
    return g;
  }

  /** A single leaf that comes loose, sways down and fades. */
  private leaf(x: number, y: number, variant = 0): void {
    const cfg = PROP_AMBIENT.leaf;
    const ms = Phaser.Math.Between(cfg.ms.min, cfg.ms.max);
    const leaf = this.scene.add
      .image(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-20, 4), ...texArgs(Tex.Leaf))
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
    const star = this.scene.add.image(x, y, ...texArgs(Tex.Star)).setDepth(cfg.depth).setScale(0);
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
      .particles(0, 0, texRef(def.tex).key, { frame: texRef(def.tex).frame,
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
