/** @file Numbers for doing less work off screen: the margin kept around the camera view for hiding the stands fans, and how rarely far-away walking cats think. */

export const CULL = {
  /** A fan this far (px) outside the camera view is hidden. Its picture is about 70 px around its base point, plus its hop and lean. */
  standsMarginPx: 160,
  /**
   * Plain walking cats (`Enemy.thinksRarely`: a straight chase, no timers) that are outside the camera view plus `marginPx` only run their
   * whole frame (think, walk animation, shadow, alpha) every `everyFrames`-th frame, each on its own slot so they do not all wake together.
   * The time they skipped is added to the next step, so their speed and cooldowns stay right. A cat inside the margin, flung, slipping,
   * slowed by a puddle, surrendering or caged runs every frame. Bosses, ranged cats, the kamikaze (fuse) and the ninja (teleport) never skip.
   * `enabled: false` = every cat every frame, as before.
   */
  catsThink: { enabled: true, marginPx: 240, everyFrames: 3 },
} as const;
