/** @file Cats talk in speech bubbles: a short Romanian line above a random cat on screen (a grumble when another cat is thrown into one, a taunt when a hide-and-seek cat lands) and a bigger bubble when a boss shouts. */
import Phaser from 'phaser';
import { isBossType } from '../config/balance';
import type { BubbleKind } from '../config/bubble';
import { CHATTER } from '../config/chatter';
import { READING } from '../config/reading';
import { CAT_BUMPED_LINES, CAT_CHATTER, HIDEOUT_SLEEPY_TAUNTS, HIDEOUT_TAUNTS, pick } from '../content/lines';
import { gameClock } from '../core/clock';
import { readMs } from '../core/readingTime';
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
  /** When the cat it followed died or left (game ms); -1 = it is still there. The bubble then pops away fast (`CHATTER.deathPopMs`). */
  goneAt: number;
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
    // The line belongs to the cat that was hit (the payload point is on it): it rides along, and pops away when that cat is killed.
    const cat = this.catNear(x, y);
    this.say(pick(CAT_BUMPED_LINES), cat, cat ? cat.x : x, cat ? cat.y : y, now);
  }

  /** A hide-and-seek cat landed after jumping out: a cheeky taunt (a sleepy line if it came out of a bed) that rides along with that cat (the payload point is just above its head, so the cat is the nearest one), when there is room for another line (it is a one-off moment, so no cooldown). */
  private onPopped({ x, y, sleepy }: CatPoppedPayload): void {
    const now = gameClock.now;
    if (!CHATTER.enabled || this.talkingCount() >= CHATTER.maxAtOnce) return;
    const line = pick(sleepy ? HIDEOUT_SLEEPY_TAUNTS : HIDEOUT_TAUNTS);
    const cat = this.catNear(x, y);
    if (cat) this.say(line, cat, cat.x, cat.y, now);
    else this.say(line, null, x, y, now);
  }

  /** The nearest normal cat to a point (within `CHATTER.popFollowRangePx`), so a bubble started from a point can follow the cat that made it. */
  private catNear(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist: number = CHATTER.popFollowRangePx;
    for (const cat of this.enemies.getChildren() as Enemy[]) {
      if (!cat.active || !cat.alive || cat.isBoss) continue;
      const d = Phaser.Math.Distance.Between(cat.x, cat.y, x, y);
      if (d <= bestDist) {
        best = cat;
        bestDist = d;
      }
    }
    return best;
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

  /** Is the spot a bubble points at on the screen right now? */
  private onScreen(x: number, y: number): boolean {
    const view = this.scene.cameras.main.worldView;
    const pad = CHATTER.visiblePadPx;
    return x >= view.x + pad && x <= view.right - pad && y >= view.y + pad && y <= view.bottom - pad;
  }

  private add(line: string, kind: BubbleKind, cat: Enemy | null, x: number, y: number, lift: number, now: number): void {
    if (!this.onScreen(cat ? cat.x : x, cat ? cat.y - lift : y)) return; // the speaker is off screen: no bubble at all
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
      goneAt: -1,
      lifeMs: readMs(line, shout ? CHATTER.shout.lifeMs : CHATTER.lifeMs, READING.bubbleMaxMs), // long lines stay long enough to be read
      fadeMs: shout ? CHATTER.shout.fadeMs : CHATTER.fadeMs,
    };
    this.bubbles.push(bubble);
    this.place(bubble, 0, now);
  }

  private moveBubbles(now: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i]!;
      const age = now - bubble.bornAt;
      const catGone = bubble.cat !== null && (!bubble.cat.active || !bubble.cat.alive || bubble.cat.caged); // dead, gone, or locked in a bed cage
      if (catGone) {
        bubble.cat = null; // the bubble stays where the cat was, but only for a moment
        bubble.goneAt = now;
      }
      if (age >= bubble.lifeMs || !bubble.view.active || (bubble.goneAt >= 0 && now - bubble.goneAt >= CHATTER.deathPopMs)) {
        bubble.view.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      this.place(bubble, age, now);
    }
  }

  /** The tail tip sits just above the cat's head (or the spot) and the bubble pops away (shrinks into the tail tip) at the end, or at once when its cat dies. */
  private place(bubble: Bubble, age: number, now: number): void {
    const cat = bubble.cat;
    if (cat) {
      bubble.x = cat.x;
      bubble.y = cat.y - bubble.lift;
    }
    let remaining = Phaser.Math.Clamp((bubble.lifeMs - age) / bubble.fadeMs, 0, 1);
    if (bubble.goneAt >= 0) remaining = Math.min(remaining, Phaser.Math.Clamp(1 - (now - bubble.goneAt) / CHATTER.deathPopMs, 0, 1)); // its cat is gone: pop away fast
    bubble.view.setVisible(this.onScreen(bubble.x, bubble.y)); // hidden while the speaker is off screen, back when it returns
    bubble.view.place(bubble.x, bubble.y - CHATTER.look.gapAboveHead, remaining, this.scene.cameras.main.worldView);
  }
}
