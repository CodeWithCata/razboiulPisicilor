/** @file Numbers for the fans' throws: how often, which fan, where it lands, the flight, the gift and the petard. No Phaser. */
import { Tex } from '../assets/keys';

/**
 * Now and then a fan in the stands throws something into the arena (systems/FanThrowSystem.ts decides WHEN and flies the item;
 * the fan's wind-up is animated by world/StandsCrowd.ts, `CROWD.thrower`). It is one of two things:
 * - a GIFT: a normal pickup (the usual weighted random kind) that lands near Varu and pops out of its flight like any other pickup;
 * - a BAD item: a petard. It lands with a red ring that shows the real blast reach, hisses, and goes off. It hurts Varu AND the cats.
 * All times are game ms (the pause menu stops them), all sizes game px.
 */
export const FAN_THROW = {
  enabled: true,
  /** One roll per wave, at the start of the wave. Never in the first wave of a run (the warm-up). */
  chance: 0.65,
  minRunWave: 2,
  /** The first throw of a wave comes this long after the wave starts (random in the range), and only if that wave is still going. */
  delayMs: { min: 3000, max: 7000 },
  /** A wave that got a throw may get a second one, this long after the first. */
  secondChance: 0.4,
  gapMs: { min: 5000, max: 9000 },
  /**
   * Chance that a throw is a bad item. Three kindnesses: the first throw of a run is always a gift, no petards while a boss is in the
   * arena, and when Varu is below `mercyHpShare` of his health the fans take pity (gift).
   */
  badChance: 0.35,
  mercyHpShare: 0.3,
  /** No suitable fan yet (Varu is far from every stand)? Look again every `retryMs`, for at most `giveUpMs`. Then that throw is skipped. */
  retryMs: 400,
  giveUpMs: 8000,
  /**
   * Which fan throws: one of the first `maxTier + 1` terrace rows from the fence (0 = the row at the fence; the balcony boxes never throw),
   * standing `fanFromVaruPx` away from Varu. The fan does not have to be on screen (the item still flies into view), but it is never far. `windUpMs` is how long it winds up before it lets go.
   */
  maxTier: 1,
  fanFromVaruPx: { min: 280, max: 720 },
  windUpMs: 750,
  /**
   * Where it lands: `landFromVaruPx` from Varu, on the line from Varu to the fan turned by up to `spreadDeg` either way, and never
   * closer than `minThrowPx` to the fan. `tries` spots are tried (it must be open floor and stay `wallMargin` inside the fence).
   */
  landFromVaruPx: { min: 130, max: 300 },
  spreadDeg: 35,
  minThrowPx: 120,
  tries: 12,
  wallMargin: 70,
  /** The flight: a lob. The item is drawn higher and bigger at the top of its arc (closer to the camera); the shadow stays on the floor. */
  flightMs: 900,
  arc: { heightPx: 150, apexScale: 1.7, startScale: 0.7, spinDegPerMs: 0.5 },
  /** The marker on the floor while it flies: a shadow that grows and a ring that fades in. */
  marker: { shadowW: 1.1, shadowH: 0.55, startShare: 0.35, startAlpha: 0.2, endAlpha: 0.8, ringStartScale: 0.6 },
  /** What the fan says over its head while it winds up (the words are in content/lines.ts `FAN_THROW_LINES`). */
  shout: { liftPx: 30, size: 26, gift: '#ffe066', bad: '#ff9a8a' },
  /** The soft dust where something lands. */
  dust: { count: 8, tint: [0xe6d9b3, 0xc2b48c, 0xf5ecd0] },
  depth: { marker: 6, lying: 12, dust: 11, sparks: 49, item: 50 },

  /** A gift: the ring on the floor takes the glow color of the pickup it carries (`PICKUP_VISUALS`). */
  gift: {
    ring: { radius: 38, fill: 0.1, stroke: 0.8 },
    /** The pop where it lands: a ring that spreads and fades. */
    pop: { ringMs: 320, fromPx: 10, toPx: 70 },
  },

  /**
   * The CURSE drop: a third kind of bad throw. The fan throws a dumbbell, a rusty belt or a Big hoodie. It is aimed at where Varu stands when the
   * fan lets go, and the red ring is the warning: if he is still inside it when the item lands he gets that curse (dodge it or take it).
   * `share` of the bad throws become a curse drop, but only when `CurseSystem` allows a curse right then (cooldown, wave, mercy); otherwise
   * the bad throw stays a petard. The usual kindnesses of bad throws (first throw a gift, none while a boss lives, pity at low health) apply.
   */
  curse: {
    share: 0.4,
    weights: { dumbbell: 1, rusty: 1, big: 1 },
    /** The ring on the floor (it takes the red glow of the item). `radius` is the real reach, in px. */
    radius: 70,
    ring: { fill: 0.1, stroke: 0.8, startScale: 0.7 },
    /** After landing the item fades out this long. The word when Varu dodged it (`CURSE_DODGE_WORDS`). */
    fadeMs: 450,
    word: { offsetY: -44, size: 28, color: '#9be28f' },
  },

  /** The petard (the bad item). */
  petard: {
    tex: Tex.Petard,
    sizePx: 44,
    /** The fuse burns this long after it lands. The ring is the real blast reach; it grows, goes red and blinks near the end. */
    fuseMs: 200,
    radius: 105,
    /** Hurt to Varu if he is inside the ring when it goes off (he has `PLAYER.maxHp`), and to every cat in it (with this knockback). */
    damage: 16,
    catDamage: 4,
    knockback: 420,
    ring: { color: 0xff8a3c, soonColor: 0xff4d4d, fill: 0.08, stroke: 0.65, startScale: 0.7, soonAt: 0.7, blinkMs: 90 },
    /** Landing: a squash, then one small hop. */
    squash: { x: 1.3, y: 0.7, ms: 70 },
    hop: { heightPx: 34, ms: 190 },
    /** While the fuse burns the petard throbs (hits per second, faster toward the end) and flashes in the last stretch. */
    throb: { amount: 0.12, slowHz: 3, fastHz: 11, flashFrom: 0.7, flashMs: 80, flashTint: 0xff9a8a },
    /** Sparks fly off the tip of the fuse: `tipPx` from the middle of the petard along its length. */
    spark: { everyMs: 45, tipPx: 22, lifeMs: { min: 180, max: 320 }, speed: { min: 30, max: 110 }, tint: [0xffe066, 0xff8a3c, 0xffffff] },
    /** The word over it when it lands (`PETARD_WORDS`). */
    word: { offsetY: -44, size: 28, color: '#ffd166' },
  },

  /**
   * v170 SWAT IT BACK: a petard THROWN BY A CAT (the bomber) can be knocked back by the belt (swing, spin or thrown belt) while it lies on the
   * floor (the squash, the hop and the short fuse: about 0.7 s, so it is a matter of timing). It then flies back to where its thrower
   * stands NOW (or to where she threw it from if she is gone) in `flightMs`, with a fresh fuse, and hurts the cats in its ring for `catDamage`
   * instead of the usual `petard.catDamage` (enough to finish a bomber). A knocked-back petard cannot be swatted twice. Fans' petards cannot be swatted.
   * `hitRadiusPx` is how far from the petard's middle the belt still counts as touching it.
   */
  swat: { hitRadiusPx: 34, flightMs: 520, catDamage: 6, word: { offsetY: -64, size: 30, color: '#9be28f' } },
} as const;
