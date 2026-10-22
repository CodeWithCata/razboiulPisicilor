/** @file Numbers for hiding off-screen pictures (the stands fans now; actors later): the margin kept around the camera view. */

export const CULL = {
  /** A fan this far (px) outside the camera view is hidden. Its picture is about 70 px around its base point, plus its hop and lean. */
  standsMarginPx: 160,
} as const;
