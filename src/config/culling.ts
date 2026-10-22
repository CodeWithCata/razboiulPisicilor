/** @file Numbers for doing less work off screen: the margin kept around the camera view for hiding the stands fans and far cats, and how rarely far-away walking cats think. */

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
  /**
   * Plain walking cats (`Enemy.cullsDraw`) whose centre is outside the camera view plus `marginPx` are not drawn (body and shadow hidden by
   * `Actor.setCulled`; their logic is untouched). Keep `marginPx` BELOW `catsThink.marginPx`: a cat inside the draw margin is then always
   * inside the think margin, so it has ticked this frame (fresh shadow position and alpha) by the time it is shown again. Half the biggest
   * walker's size is 50 px, so 120 px keeps a cat's edge, shadow and sway on screen until the whole picture is out.
   * `enabled: false` = every cat is drawn every frame, as before.
   */
  catsDraw: { enabled: true, marginPx: 120, rigs: true },
  // `rigs` (v202): also hide the loose parts of the flying, tennis and bomber cats (wings, racket arm + ball, throwing arm) with their body. Their rigs keep placing the parts every
  // frame and only switch drawing off (a flag of their own, never `visible`), so a cat that comes back is whole on that same frame. `rigs: false` = those three cats are always drawn
  // (NormalCat / FatCat are still culled). Bosses are never culled: see `docs/PERFORMANCE.md` v202.
} as const;
