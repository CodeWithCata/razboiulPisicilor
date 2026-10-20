/** @file Cats talk now and then: a short Romanian line above a random cat on screen (and a grumble when another cat is thrown into one). */
import Phaser from 'phaser';
import { isBossType } from '../config/balance';
import { CHATTER } from '../config/chatter';
import { CAT_BUMPED_LINES, CAT_CHATTER, pick } from '../content/lines';
import { gameClock } from '../core/clock';
import { Events, listen, type CatBumpPayload } from '../core/events';
import type { Enemy } from '../entities/Enemy';
import { FONT } from '../config/style';

interface Bubble {
  text: Phaser.GameObjects.Text;
  /** The cat it follows; null = it stays where the line started (a cat that was just bumped may be gone). */
  cat: Enemy | null;
  x: number;
  y: number;
  bornAt: number;
}

/**
 * Lines are picked from content/lines.ts, timing is in config/chatter.ts. Runs on the game clock (update-driven, no timers),
 * so lines freeze with the pause menu and never outlive their scene.
 */
export class CatChatter {
  private readonly bubbles: Bubble[] = [];
  private nextAt = gameClock.now + CHATTER.firstDelayMs;
  private lastBumpLineAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: Phaser.Physics.Arcade.Group,
  ) {
    const off = listen<CatBumpPayload>(Events.CatBump, (e) => this.onBump(e));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      this.bubbles.length = 0; // the texts belong to the scene and go with it
    });
  }

  update(now: number): void {
    if (!CHATTER.enabled) return;
    this.moveBubbles(now);
    if (now < this.nextAt || this.bubbles.length >= CHATTER.maxAtOnce) return;
    const cat = this.pickSpeaker();
    if (!cat) return; // nobody on screen: try again soon
    this.nextAt = now + Phaser.Math.Between(CHATTER.gapMs.min, CHATTER.gapMs.max);
    const type = cat.enemyType;
    if (isBossType(type)) return;
    this.say(pick(CAT_CHATTER[type]), cat, cat.x, cat.y, now);
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
        cat.y > view.y + m &&
        cat.y < view.bottom - m,
    );
    return candidates.length > 0 ? Phaser.Utils.Array.GetRandom(candidates) : null;
  }

  private onBump({ x, y }: CatBumpPayload): void {
    const now = gameClock.now;
    if (!CHATTER.enabled || this.bubbles.length >= CHATTER.maxAtOnce) return;
    if (now - this.lastBumpLineAt < CHATTER.bumpCooldownMs || Math.random() >= CHATTER.bumpChance) return;
    this.lastBumpLineAt = now;
    this.say(pick(CAT_BUMPED_LINES), null, x, y, now);
  }

  private say(line: string, cat: Enemy | null, x: number, y: number, now: number): void {
    const L = CHATTER.look;
    const text = this.scene.add
      .text(x, y, line, { fontFamily: FONT, fontSize: `${L.size}px`, color: L.color, stroke: L.stroke, strokeThickness: L.strokeThickness })
      .setOrigin(0.5, 1)
      .setDepth(L.depth);
    const bubble: Bubble = { text, cat, x, y, bornAt: now };
    this.bubbles.push(bubble);
    this.place(bubble, 0);
  }

  private moveBubbles(now: number): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i]!;
      const age = now - bubble.bornAt;
      const catGone = bubble.cat !== null && (!bubble.cat.active || !bubble.cat.alive);
      if (age >= CHATTER.lifeMs || !bubble.text.active) {
        bubble.text.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      if (catGone) bubble.cat = null; // the words stay where the cat was and fade out
      this.place(bubble, age);
    }
  }

  /** Above the cat's head (or the spot), drifting up a little, fading at the end. */
  private place(bubble: Bubble, age: number): void {
    const L = CHATTER.look;
    const cat = bubble.cat;
    if (cat) {
      bubble.x = cat.x;
      bubble.y = cat.y - cat.displayHeight / 2;
    }
    const rise = Phaser.Math.Clamp(age / L.riseMs, 0, 1) * L.risePx;
    bubble.text.setPosition(bubble.x, bubble.y - L.gapAboveHead - rise);
    bubble.text.setAlpha(Phaser.Math.Clamp((CHATTER.lifeMs - age) / CHATTER.fadeMs, 0, 1));
  }
}
