/** @file Cats talk in speech bubbles: a short Romanian line above a random cat on screen (a grumble when another cat is thrown into one, a taunt when a hide-and-seek cat lands) and a bigger bubble when a boss shouts. */
import Phaser from 'phaser';
import { isBossType } from '../config/balance';
import type { BubbleKind } from '../config/bubble';
import { CHATTER } from '../config/chatter';
import { CAT_BUMPED_LINES, CAT_CHATTER, HIDEOUT_SLEEPY_TAUNTS, HIDEOUT_TAUNTS, pick } from '../content/lines';
import { gameClock } from '../core/clock';
import { Events, listen, type CatBumpPayload, type CatPoppedPayload, type ShoutPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import { CatBubble } from '../ui/CatBubble';

interface Bubble {
  view: CatBubble;
  kind: BubbleKind;
  /** The cat it follows; null = it stays where the line started (a cat that was just bumped may be gone). */
  cat: Enemy | null;
  /** Where the tail points when there is no cat to follow. */
  x: number;
  y: number;
  /** When following: the tail tip's height above the cat's position. */
  lift: number;
  bornAt: number;
  lifeMs: number;
  fadeMs: number;
}

/**
 * Lines are picked from content/lines.ts, timing is in config/chatter.ts, the bubble itself is `ui/CatBubble.ts` (look: config/bubble.ts).
 * Runs on the game clock (update-driven, no timers), so bubbles freeze with the pause menu and never outlive their scene.
 */
export class CatChatter {
  private readonly bubbles: Bubble[] = [];
  private nextAt = gameClock.now + CHATTER.firstDelayMs;
  private lastBumpLineAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: Phaser.Physics.Arcade.Group,
  ) {
    const off = [
      listen<CatBumpPayload>(Events.CatBump, (e) => this.onBump(e)),
      listen<CatPoppedPayload>(Events.CatPopped, (e) => this.onPopped(e)),
      listen<ShoutPayload>(Events.BossShout, (e) => this.onShout(e)),
    ];
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off.forEach((f) => f());
      this.bubbles.length = 0; // the bubbles belong to the scene and go with it
    });
  }

  update(now: number): void {
    this.moveBubbles(now); // always: a shout bubble must also finish when chatter is switched off
    if (!CHATTER.enabled) return;
    if (now < this.nextAt || this.talkingCount() >= CHATTER.maxAtOnce) return;
    const cat = this.pickSpeaker();
    if (!cat) return; // nobody on screen: try again soon
    this.nextAt = now + Phaser.Math.Between(CHATTER.gapMs.min, CHATTER.gapMs.max);
    const type = cat.enemyType;
    if (isBossType(type)) return;
    this.say(pick(CAT_CHATTER[type]), cat, cat.x, cat.y, now);
  }

  /** Chatting bubbles on screen (a boss shout has its own place and does not count). */
  private talkingCount(): number {
    return this.bubbles.filter((b) => b.kind === 'talk').length;
  }

  /** A random normal cat that is on screen, not too close to the edge and not already talking. */
  private pickSpeaker(): Enemy | null {
    const view = this.scene.cameras.main.worldView;
    const m = CHATTER.screenMargin;
    const talking = new Set(this.bubbles.map((b) => b.cat));
    const candidates = (this.enemies.getChildren() as Enemy[]).filter(
      (cat) =>
        cat.active &&
        cat.alive &&
        !cat.isBoss &&
        !cat.surrendering && // a cat that gave up has said its line already
        !talking.has(cat) &&
        cat.x > view.x + m &&
        cat.x < view.right - m &&
        cat.y > view.y + CHATTER.screenMarginTop &&
        cat.y < view.bottom - m,
    );
    return candidates.length > 0 ? Phaser.Utils.Array.GetRandom(candidates) : null;
  }

  private onBump({ x, y }: CatBumpPayload): void {
    const now = gameClock.now;
    if (!CHATTER.enabled || this.talkingCount() >= CHATTER.maxAtOnce) return;
    if (now - this.lastBumpLineAt < CHATTER.bumpCooldownMs || Math.random() >= CHATTER.bumpChance) return;
    this.lastBumpLineAt = now;
    this.say(pick(CAT_BUMPED_LINES), null, x, y, now);
  }

  /** A hide-and-seek cat landed after jumping out: a cheeky taunt (a sleepy line if it came out of a bed) above its head, when there is room for another line (it is a one-off moment, so no cooldown). */
  private onPopped({ x, y, sleepy }: CatPoppedPayload): void {
    const now = gameClock.now;
    if (!CHATTER.enabled || this.talkingCount() >= CHATTER.maxAtOnce) return;
    this.say(pick(sleepy ? HIDEOUT_SLEEPY_TAUNTS : HIDEOUT_TAUNTS), null, x, y, now);
  }

  /** A boss yells (the payload point is just above its head): a shout bubble that rides along with the boss. */
  private onShout({ x, y, text }: ShoutPayload): void {
    const now = gameClock.now;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i]!.kind !== 'shout') continue;
      this.bubbles[i]!.view.destroy(); // one shout at a time
      this.bubbles.splice(i, 1);
    }
    const boss = (this.enemies.getChildren() as Enemy[]).find(
      (e) => e.active && e.alive && e.isBoss && Phaser.Math.Distance.Between(e.x, e.y, x, y) <= CHATTER.shout.followRangePx,
    );
    this.add(text, 'shout', boss ?? null, x, y, boss ? boss.y - y : 0, now);
  }

  private say(line: string, cat: Enemy | null, x: number, y: number, now: number): void {
    this.add(line, 'talk', cat, x, y, cat ? cat.displayHeight / 2 : 0, now);
  }

  private add(line: string, kind: BubbleKind, cat: Enemy | null, x: number, y: number, lift: number, now: number): void {
    const view = new CatBubble(this.scene, line, kind, CHATTER.look.depth);
    const shout = kind === 'shout';
    const bubble: Bubble = {
      view,
      kind,
      cat,
      x,
      y,
      lift,
      bornAt: now,
      lifeMs: shout ? CHATTER.shout.lifeMs : CHATTER.lifeMs,
      fadeMs: shout ? CHATTER.shout.fadeMs : CHATTER.fadeMs,
    };
    this.bubbles.push(bubble);
    this.place(bubble, 0);
  }

  private moveBubbles(now: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i]!;
      const age = now - bubble.bornAt;
      const catGone = bubble.cat !== null && (!bubble.cat.active || !bubble.cat.alive);
      if (age >= bubble.lifeMs || !bubble.view.active) {
        bubble.view.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      if (catGone) bubble.cat = null; // the bubble stays where the cat was and fades out
      this.place(bubble, age);
    }
  }

  /** The tail tip sits just above the cat's head (or the spot) and the bubble fades at the end. */
  private place(bubble: Bubble, age: number): void {
    const cat = bubble.cat;
    if (cat) {
      bubble.x = cat.x;
      bubble.y = cat.y - bubble.lift;
    }
    const alpha = Phaser.Math.Clamp((bubble.lifeMs - age) / bubble.fadeMs, 0, 1);
    bubble.view.place(bubble.x, bubble.y - CHATTER.look.gapAboveHead, alpha, this.scene.cameras.main.worldView);
  }
}
