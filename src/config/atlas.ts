/** @file Numbers for the texture atlas (assets/atlas.ts): page size and the gap between pictures. */

export const ATLAS = {
  /** Side of one atlas page in px (square). Pictures bigger than this keep a texture of their own. Phones cap textures at 2048 or more. */
  pageSize: 1024,
  /** Empty px left to the right and below every picture, so a scaled sprite never samples its neighbour. */
  gutter: 2,
} as const;
