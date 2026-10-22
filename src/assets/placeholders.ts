/** @file Generates every placeholder texture at boot (calls the art/ drawers + small shapes), skipping keys that loaded a real image. */
import Phaser from 'phaser';
import { COLORS } from '../config/style';
import { Tex } from './keys';
import { drawBossMafia } from './art/bosses';
import { drawEmoBack, drawEmoSide, drawFedererFront, drawFedererSide, drawQueenBack, drawQueenSide } from './art/views';
import { drawBallMachine, drawBossFederer, drawFedererArm, drawFedererFootL, drawFedererFootR, drawFedererRacket, drawFedererTail } from './art/federer';
import { FLAG_CLOTH_H, FLAG_CLOTH_W, FLAG_POLE_H, FLAG_POLE_W, drawFlagCloth, drawFlagPole } from './art/flag';
import { FX_BAR_PX, FX_FLOOD_SIZE, drawFxBubbleEmo, drawFxBubbleQueen, drawFxCarpetPad, drawFxCarpetTile, drawFxDiamond, drawFxDisc, drawFxDrop, drawFxFlood, drawFxHoop, drawFxPuddle, drawFxPuff, drawFxRing, drawFxShock } from './art/fx';
import { drawBarrel, drawBarrelBroken, drawBarrelPuddle } from './art/barrel';
import { CROW_GOLD, CROW_KAMIKAZE, CROW_NORMAL, POSE_FLAP, POSE_FOLD, POSE_OPEN, drawCrow, drawFeather } from './art/crows';
import { drawBossQueen, drawQueenCape, drawQueenCrown, drawQueenFootL, drawQueenFootR, drawQueenScepter } from './art/queen';
import { drawBomberArm, drawCatBomber, drawCatFat, drawCatFlying, drawCatFlyingBody, drawWingLeft, drawWingRight, drawCatKamikaze, drawCatLucky, drawCatNinja, drawCatNormal, drawCatTennis, drawTennisArm, drawTennisRacket } from './art/cats';
import {
  drawBeltThrown, drawPetard, drawPickupCrochete, drawPickupCigarettes, drawPickupVape, drawPickupGoldenBelt, drawPickupLapte, drawPickupMilkBottle, drawPickupLaser, drawPickupUmbrella, drawUmbrellaCanopy, drawPickupMonster, drawPickupRedBull, drawPickupMystery, drawPickupRoulette, drawPickupSnail, drawPickupDumbbell, drawPickupEmo, drawPickupRusty, drawPickupBig, drawPickupSmoke,
  drawBrokenHeart, drawFireball, drawTennis, drawYarn,
} from './art/items';
import { drawDodgeIcon } from './art/dodgeIcon';
import { drawIceBlock, drawPickupIceCream, drawPickupScooter, drawScooterBody } from './art/rideAndIce';
import { drawLampBase, drawLampHead, drawLampStem } from './art/lamp';
import { drawVaru, drawVaruBelt, drawVaruLegL, drawVaruLegR } from './art/varu';
import { make, makeRepeating, poly } from './paint';
import { flushPictures, queueDrawn } from './atlas';

const NAVY = COLORS.navy;

/** Small 8-point star used for dazed-crow stars and sparkles. */
function star(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xffe066, 1).lineStyle(2, NAVY, 1);
  const pts = poly([[10, 0], [12.5, 7.5], [20, 10], [12.5, 12.5], [10, 20], [7.5, 12.5], [0, 10], [7.5, 7.5]]);
  g.fillPoints(pts, true).strokePoints(pts, true);
}

export function generatePlaceholders(scene: Phaser.Scene): void {
  // Characters, projectiles and pickups are drawn in src/assets/art/ (see shapes.ts for the toolkit).
  make(scene, Tex.Varu, 128, 128, (g) => drawVaru(g));
  make(scene, Tex.VaruLegL, 128, 128, drawVaruLegL);
  make(scene, Tex.VaruLegR, 128, 128, drawVaruLegR);
  make(scene, Tex.VaruBelt, 128, 128, (g) => drawVaruBelt(g));
  make(scene, Tex.VaruBeltGold, 128, 128, (g) => drawVaruBelt(g, true));
  make(scene, Tex.VaruDrag1, 128, 128, (g) => drawVaru(g, 0.5)); // cigarette drag: arm half way up...
  make(scene, Tex.VaruDrag2, 128, 128, (g) => drawVaru(g, 1)); // ...and at his mouth
  make(scene, Tex.VaruEmo, 128, 128, (g) => drawVaru(g, 0, 'up')); // emo: the hood is up...
  make(scene, Tex.VaruEmoDrag1, 128, 128, (g) => drawVaru(g, 0.5, 'half')); // ...he pushes it back to smoke (at his mouth he is the normal VaruDrag2)
  make(scene, Tex.CatNormal, 96, 96, drawCatNormal);
  make(scene, Tex.CatFat, 96, 96, drawCatFat);
  make(scene, Tex.CatNinja, 96, 96, drawCatNinja);
  make(scene, Tex.CatKamikaze, 96, 96, drawCatKamikaze);
  make(scene, Tex.CatFlying, 96, 96, drawCatFlying);
  make(scene, Tex.CatFlyingBody, 96, 96, drawCatFlyingBody);
  make(scene, Tex.CatWingL, 96, 96, drawWingLeft);
  make(scene, Tex.CatWingR, 96, 96, drawWingRight);
  make(scene, Tex.CatLucky, 96, 96, drawCatLucky);
  make(scene, Tex.CatBomber, 96, 96, drawCatBomber);
  make(scene, Tex.CatBomberArm, 96, 96, drawBomberArm);
  make(scene, Tex.CatTennis, 96, 96, drawCatTennis);
  make(scene, Tex.CatTennisArm, 96, 96, drawTennisArm);
  make(scene, Tex.CatTennisRacket, 96, 96, drawTennisRacket);
  make(scene, Tex.Yarn, 32, 32, drawYarn);
  make(scene, Tex.Tennis, 32, 32, drawTennis);
  make(scene, Tex.Fireball, 32, 32, drawFireball);
  make(scene, Tex.Heart, 32, 32, drawBrokenHeart);
  make(scene, Tex.BeltThrown, 32, 96, (g) => drawBeltThrown(g));
  make(scene, Tex.BeltThrownGold, 32, 96, (g) => drawBeltThrown(g, true));

  make(scene, Tex.Shadow, 64, 32, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(32, 16, 60, 26);
  });

  make(scene, Tex.Particle, 16, 16, (g) => {
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 7);
  });

  // Grass tile; tufts stay clear of the edges so it repeats cleanly.
  makeRepeating(scene, Tex.Grass, 128, 128, (g) => {
    g.fillStyle(0x5aa05a, 1).fillRect(0, 0, 128, 128);
    g.fillStyle(0x66ad63, 1).fillEllipse(34, 40, 44, 26).fillEllipse(94, 92, 50, 30);
    g.lineStyle(3, 0x468a48, 1);
    for (const [x, y] of [[20, 90], [70, 28], [108, 54], [52, 108]] as const) {
      g.lineBetween(x, y, x - 3, y - 8).lineBetween(x, y, x + 3, y - 8);
    }
    g.fillStyle(COLORS.cream, 1).fillCircle(100, 22, 3).fillCircle(30, 70, 3);
  });

  // Friend photo slot: a silhouette on a dark card. The "FOTO" label is added in code (ui/PhotoFrame.ts).
  make(scene, Tex.PhotoPlaceholder, 128, 128, (g) => {
    g.fillStyle(0x2c3558, 1).fillRect(0, 0, 128, 128);
    g.fillStyle(0x4a5683, 1).fillCircle(64, 52, 24);
    g.fillEllipse(64, 118, 84, 62);
    g.lineStyle(4, NAVY, 1).strokeRect(2, 2, 124, 124);
  });

  make(scene, Tex.PickupCrochete, 64, 64, drawPickupCrochete);
  make(scene, Tex.PickupCigarettes, 64, 64, drawPickupCigarettes);
  make(scene, Tex.PickupVape, 64, 64, drawPickupVape);
  make(scene, Tex.PickupLapte, 64, 64, drawPickupLapte);
  make(scene, Tex.PickupMilkBottle, 64, 64, drawPickupMilkBottle);
  make(scene, Tex.PickupMonster, 64, 64, drawPickupMonster);
  make(scene, Tex.PickupRedBull, 64, 64, drawPickupRedBull);
  make(scene, Tex.PickupGoldenBelt, 64, 64, drawPickupGoldenBelt);
  make(scene, Tex.PickupLaser, 64, 64, drawPickupLaser);
  make(scene, Tex.PickupUmbrella, 64, 64, drawPickupUmbrella);
  make(scene, Tex.UmbrellaCanopy, 128, 128, drawUmbrellaCanopy);
  make(scene, Tex.DodgeIcon, 64, 64, drawDodgeIcon);
  make(scene, Tex.PickupScooter, 64, 64, drawPickupScooter);
  make(scene, Tex.ScooterBody, 64, 128, drawScooterBody);
  make(scene, Tex.PickupIceCream, 64, 64, drawPickupIceCream);
  make(scene, Tex.IceBlock, 128, 128, drawIceBlock);
  make(scene, Tex.PickupMystery, 64, 64, drawPickupMystery);
  make(scene, Tex.PickupRoulette, 64, 64, drawPickupRoulette);
  make(scene, Tex.PickupSnail, 64, 64, drawPickupSnail);
  make(scene, Tex.PickupDumbbell, 64, 64, drawPickupDumbbell);
  make(scene, Tex.PickupEmo, 64, 64, drawPickupEmo);
  make(scene, Tex.PickupRusty, 64, 64, drawPickupRusty);
  make(scene, Tex.PickupBig, 64, 64, drawPickupBig);
  make(scene, Tex.PickupSmoke, 64, 64, drawPickupSmoke);
  make(scene, Tex.Petard, 32, 64, drawPetard);
  make(scene, Tex.LampStem, 14, 48, drawLampStem);
  make(scene, Tex.LampHead, 44, 64, drawLampHead);
  make(scene, Tex.LampBase, 36, 20, drawLampBase);

  // ---- Crows ----
  // Dazed crow lying on the ground (the Crow Rain pickup). Stars are added in code.
  make(scene, Tex.CrowDazed, 96, 96, (g) => {
    g.lineStyle(3, NAVY, 1);
    g.fillStyle(0x3d3d52, 1);
    g.fillTriangle(34, 46, 8, 24, 4, 56).strokeTriangle(34, 46, 8, 24, 4, 56);
    g.fillTriangle(34, 58, 8, 80, 4, 52).strokeTriangle(34, 58, 8, 80, 4, 52);
    g.fillStyle(0x2e2e3d, 1).fillEllipse(48, 52, 56, 34).strokeEllipse(48, 52, 56, 34);
    g.fillCircle(78, 52, 12).strokeCircle(78, 52, 12);
    g.fillStyle(0xe0a030, 1).fillTriangle(86, 47, 86, 57, 96, 52);
    g.lineStyle(2, 0xffffff, 1).lineBetween(72, 46, 78, 52).lineBetween(78, 46, 72, 52); // X eye
    g.lineStyle(3, 0xe0a030, 1).lineBetween(40, 68, 38, 82).lineBetween(54, 68, 56, 82);
  });

  // Crows: three wing poses each (open, flapping, tucked for the dive), plus a loose feather.
  make(scene, Tex.Crow, 128, 128, (g) => drawCrow(g, CROW_NORMAL, POSE_OPEN));
  make(scene, Tex.CrowFlap, 128, 128, (g) => drawCrow(g, CROW_NORMAL, POSE_FLAP));
  make(scene, Tex.CrowFold, 128, 128, (g) => drawCrow(g, CROW_NORMAL, POSE_FOLD));
  make(scene, Tex.CrowGold, 128, 128, (g) => drawCrow(g, CROW_GOLD, POSE_OPEN));
  make(scene, Tex.CrowGoldFlap, 128, 128, (g) => drawCrow(g, CROW_GOLD, POSE_FLAP));
  make(scene, Tex.CrowGoldFold, 128, 128, (g) => drawCrow(g, CROW_GOLD, POSE_FOLD));
  make(scene, Tex.CrowKamikaze, 128, 128, (g) => drawCrow(g, CROW_KAMIKAZE, POSE_OPEN));
  make(scene, Tex.CrowKamikazeFlap, 128, 128, (g) => drawCrow(g, CROW_KAMIKAZE, POSE_FLAP));
  make(scene, Tex.CrowKamikazeFold, 128, 128, (g) => drawCrow(g, CROW_KAMIKAZE, POSE_FOLD));
  make(scene, Tex.Feather, 16, 36, drawFeather);

  make(scene, Tex.Star, 20, 20, star);

  // Floor and shield effects (v174): puddle, bubble shields, magic ring, shockwave, carpet pad, dust puff, teardrop. See art/fx.ts.
  make(scene, Tex.FxPuddle, 160, 112, drawFxPuddle);
  make(scene, Tex.FxFlood, FX_FLOOD_SIZE, FX_FLOOD_SIZE, drawFxFlood);
  make(scene, Tex.FxBubbleQueen, 256, 256, drawFxBubbleQueen);
  make(scene, Tex.FxBubbleEmo, 256, 256, drawFxBubbleEmo);
  make(scene, Tex.FxRing, 256, 256, drawFxRing);
  make(scene, Tex.FxDiamond, 24, 32, drawFxDiamond);
  make(scene, Tex.FxShock, 256, 256, drawFxShock);
  make(scene, Tex.FxDisc, 128, 128, drawFxDisc);
  make(scene, Tex.FlagPole, FLAG_POLE_W, FLAG_POLE_H, drawFlagPole);
  make(scene, Tex.FlagCloth, FLAG_CLOTH_W, FLAG_CLOTH_H, drawFlagCloth);
  make(scene, Tex.FxHoop, 256, 256, drawFxHoop);
  // A solid block that is stretched a lot: its edge pixels are repeated 1 px into the atlas gap (the gap is transparent and the filter is linear, so without it a stretched frame fades at its edge).
  queueDrawn(scene, Tex.FxBar, FX_BAR_PX, FX_BAR_PX, (ctx, x, y) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, FX_BAR_PX + 2, FX_BAR_PX + 2);
  });
  make(scene, Tex.FxCarpetPad, 80, 80, drawFxCarpetPad);
  makeRepeating(scene, Tex.FxCarpetTile, 64, 64, drawFxCarpetTile);
  make(scene, Tex.FxPuff, 64, 64, drawFxPuff);
  make(scene, Tex.FxDrop, 16, 24, drawFxDrop);

  // Mustard barrel decoration: whole (with a cat face), broken, and the puddle that stays. See systems/props/BarrelDecor.ts.
  make(scene, Tex.BarrelWhole, 96, 96, drawBarrel);
  make(scene, Tex.BarrelBroken, 96, 96, drawBarrelBroken);
  make(scene, Tex.BarrelPuddle, 96, 96, drawBarrelPuddle);

  // Bits that fly off the arena props when they are hit (systems/props/PropFx.ts tints them per prop).
  make(scene, Tex.Leaf, 24, 24, (g) => {
    const blade = poly([[12, 1], [20, 7], [21, 15], [12, 23], [3, 15], [4, 7]]);
    g.fillStyle(0xffffff, 1).fillPoints(blade, true); // white: every bush color tints it (a green leaf would only ever look green)
    g.lineStyle(2, NAVY, 1).strokePoints(blade, true);
    g.lineStyle(2, 0xa8a8a8, 1).lineBetween(12, 5, 12, 19);
  });
  make(scene, Tex.Chip, 12, 10, (g) => {
    g.fillStyle(0xffffff, 1).fillPoints(poly([[1, 3], [9, 0], [12, 6], [5, 10]]), true);
  });


  make(scene, Tex.BossQueen, 128, 128, drawBossQueen);
  make(scene, Tex.BossQueenCape, 128, 128, drawQueenCape);
  make(scene, Tex.BossQueenCrown, 128, 128, drawQueenCrown);
  make(scene, Tex.BossQueenScepter, 128, 128, drawQueenScepter);
  make(scene, Tex.BossQueenFootL, 128, 128, drawQueenFootL);
  make(scene, Tex.BossQueenFootR, 128, 128, drawQueenFootR);
  make(scene, Tex.BossMafia, 128, 128, drawBossMafia);
  make(scene, Tex.BossMafiaBack, 128, 128, drawEmoBack); // the other looks of the three bosses (v148): they turn to show back, front or side
  make(scene, Tex.BossMafiaSide, 128, 128, drawEmoSide);
  make(scene, Tex.BossQueenBack, 128, 128, drawQueenBack);
  make(scene, Tex.BossQueenSide, 128, 128, drawQueenSide);
  make(scene, Tex.BossFedererFront, 128, 128, drawFedererFront);
  make(scene, Tex.BossFedererSide, 128, 128, drawFedererSide);
  make(scene, Tex.BossFederer, 128, 128, drawBossFederer);
  make(scene, Tex.BossFedererArm, 128, 128, drawFedererArm);
  make(scene, Tex.BossFedererRacket, 128, 128, drawFedererRacket);
  make(scene, Tex.BossFedererTail, 128, 128, drawFedererTail);
  make(scene, Tex.BossFedererFootL, 128, 128, drawFedererFootL);
  make(scene, Tex.BossFedererFootR, 128, 128, drawFedererFootR);
  make(scene, Tex.BallMachine, 96, 96, drawBallMachine);

  // Milk: a teardrop (the particles fall, so the tip points up) and a gooey puddle made of merged blobs.
  make(scene, Tex.MilkDrop, 24, 28, (g) => {
    g.fillStyle(0xdcd8f0, 1).fillCircle(12, 17, 9).fillTriangle(12, 1, 4, 14, 20, 14);
    g.fillStyle(0xffffff, 1).fillCircle(12, 16, 7).fillTriangle(12, 4, 6, 14, 18, 14);
    g.fillStyle(0xe9e6f7, 1).fillEllipse(13, 20, 9, 4);
    g.fillStyle(0xffffff, 1).fillCircle(9, 14, 2);
  });
  make(scene, Tex.MilkPuddle, 64, 48, (g) => {
    const blobs: Array<[number, number, number]> = [[30, 25, 14], [18, 28, 9], [44, 22, 10], [34, 36, 8], [24, 16, 7], [50, 33, 6]];
    g.fillStyle(0xdcd8f0, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r + 2);
    g.fillStyle(0xffffff, 1);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r);
    g.fillStyle(0xf1effb, 1).fillEllipse(32, 31, 22, 7);
  });

  // Smoke ring (used by the pause menu scene).
  make(scene, Tex.Smoke, 40, 40, (g) => {
    g.lineStyle(13, NAVY, 1).strokeCircle(20, 20, 12);
    g.lineStyle(7, 0xe6e6ee, 1).strokeCircle(20, 20, 12);
  });

  // Pack everything queued above into the atlas pages in one go (see assets/atlas.ts).
  flushPictures();
}
