/** Every texture key in the game. Add new art here first. */
export const Tex = {
  Varu: 'varu',
  VaruLegL: 'varu_leg_l',
  VaruLegR: 'varu_leg_r',
  VaruBelt: 'varu_belt',
  VaruBeltGold: 'varu_belt_gold',
  VaruDrag1: 'varu_drag_1',
  VaruDrag2: 'varu_drag_2',
  CatNormal: 'cat_normal',
  CatFat: 'cat_fat',
  CatNinja: 'cat_ninja',
  CatKamikaze: 'cat_kamikaze',
  CatFlying: 'cat_flying',
  BossQueen: 'boss_queen',
  BossMafia: 'boss_mafia',
  BossFederer: 'boss_federer',
  Yarn: 'yarn',
  Tennis: 'tennis',
  Smoke: 'smoke',
  MilkDrop: 'milk_drop',
  MilkPuddle: 'milk_puddle',
  BeltThrown: 'belt_thrown',
  BeltThrownGold: 'belt_thrown_gold',
  PickupCrochete: 'pickup_crochete',
  PickupLapte: 'pickup_lapte',
  PickupMonster: 'pickup_monster',
  PickupGoldenBelt: 'pickup_golden_belt',
  PickupLaser: 'pickup_laser',
  PickupCrow: 'pickup_crow',
  CrowDazed: 'crow_dazed',
  Crow: 'crow',
  CrowFlap: 'crow_flap',
  CrowFold: 'crow_fold',
  CrowGold: 'crow_gold',
  CrowGoldFlap: 'crow_gold_flap',
  CrowGoldFold: 'crow_gold_fold',
  CrowKamikaze: 'crow_kamikaze',
  CrowKamikazeFlap: 'crow_kamikaze_flap',
  CrowKamikazeFold: 'crow_kamikaze_fold',
  Feather: 'feather',
  Star: 'star',
  Shadow: 'shadow',
  Particle: 'particle',
  Grass: 'grass',
  Tileset: 'arena_tiles',
  CampusText: 'campus_text',
  PhotoPlaceholder: 'photo_placeholder',
} as const;

export type TexKey = (typeof Tex)[keyof typeof Tex];

/**
 * Friend photo slots. The three boss ids are the same as the boss types, so a boss intro card
 * finds its photo by the boss name. `gameOver` and `ending` are the two end screens.
 */
export const PHOTO_IDS = ['queen', 'mafia', 'federer', 'gameOver', 'ending'] as const;
export type PhotoId = (typeof PHOTO_IDS)[number];

/** Phaser cache key of a real photo loaded from the photo manifest. */
export const photoKey = (id: PhotoId): string => `photo:${id}`;
