/** @file The scooter power-up: how hard it bumps cats, how the scooter under Varu looks and moves. Duration and speed live in BUFFS (balance.ts). */

export const SCOOTER = {
  /** The bump: a cat (not a boss) that touches Varu while he rides is shoved away instead of biting him. */
  bump: {
    /** Extra reach (px) added to Varu's and the cat's hit radii, so a cat that is just about to touch him already gets swept aside. */
    reachPad: 10,
    /** Damage of one bump (a normal cat has 2 HP: it takes four bumps; the scooter is about the big shove, not the damage). A cat can be bumped again only after `gapMs`. */
    damage: 0.5,
    gapMs: 450,
    /** The shove: force (px/s, cut by the cat's knockback resist: a fat cat barely moves) and how long the cat flies (it counts as flung: it can hit other cats). */
    force: 1150,
    flyMs: 480,
    /** How much of the shove follows Varu's own direction (0 = straight away from him, 1 = only along his heading). */
    alongHeading: 0.5,
  },
  /** How he stands on it: the scooter turns to where he moves, his feet follow it and only his upper body twists toward the aim (max `twistRad`). */
  ride: {
    turnRate: 0.2,
    minSpeed: 20,
    twistRad: 0.7,
  },
  /** The scooter seen from above, under Varu (it turns to where he moves). */
  look: {
    width: 64,
    height: 128,
    /** Where it sits relative to Varu (px along its length; negative = forward). 0 = the deck is right under him. */
    offsetForward: 0,
    /** Draw order: just under Varu's body (he is 20). */
    depth: 18,
    alpha: 1,
    /** Pops in from this fraction of its size, in this many ms. */
    popFrom: 0.3,
    popMs: 200,
    /** The last stretch blinks: the scooter is about to be gone. */
    blinkMs: 1500,
    blinkEveryMs: 140,
  },
} as const;
