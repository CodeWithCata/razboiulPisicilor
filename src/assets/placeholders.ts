import Phaser from 'phaser';
import { COLORS } from '../config/style';
import { Tex } from './keys';
import { drawBossFederer, drawBossMafia, drawBossQueen } from './art/bosses';
import { CROW_GOLD, CROW_KAMIKAZE, CROW_NORMAL, POSE_FLAP, POSE_FOLD, POSE_OPEN, drawCrow, drawFeather } from './art/crows';
import { drawCatFat, drawCatFlying, drawCatKamikaze, drawCatNinja, drawCatNormal } from './art/cats';
import {
  drawBeltThrown, drawPickupCrochete, drawPickupGoldenBelt, drawPickupLapte, drawPickupLaser, drawPickupMonster,
  drawTennis, drawYarn,
} from './art/items';
import { drawVaru, drawVaruBelt, drawVaruLegL, drawVaruLegR } from './art/varu';
import { make, poly } from './paint';

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
  make(scene, Tex.CatNormal, 96, 96, drawCatNormal);
  make(scene, Tex.CatFat, 96, 96, drawCatFat);
  make(scene, Tex.CatNinja, 96, 96, drawCatNinja);
  make(scene, Tex.CatKamikaze, 96, 96, drawCatKamikaze);
  make(scene, Tex.CatFlying, 96, 96, drawCatFlying);
  make(scene, Tex.Yarn, 32, 32, drawYarn);
  make(scene, Tex.Tennis, 32, 32, drawTennis);
  make(scene, Tex.BeltThrown, 32, 96, (g) => drawBeltThrown(g));
  make(scene, Tex.BeltThrownGold, 32, 96, (g) => drawBeltThrown(g, true));

  make(scene, Tex.Shadow, 64, 32, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(32, 16, 60, 26);
  });

  make(scene, Tex.Particle, 16, 16, (g) => {
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 7);
  });

  // Grass tile; tufts stay clear of the edges so it repeats cleanly.
  make(scene, Tex.Grass, 128, 128, (g) => {
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
  make(scene, Tex.PickupLapte, 64, 64, drawPickupLapte);
  make(scene, Tex.PickupMonster, 64, 64, drawPickupMonster);
  make(scene, Tex.PickupGoldenBelt, 64, 64, drawPickupGoldenBelt);
  make(scene, Tex.PickupLaser, 64, 64, drawPickupLaser);

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


  make(scene, Tex.BossQueen, 128, 128, drawBossQueen);
  make(scene, Tex.BossMafia, 128, 128, drawBossMafia);
  make(scene, Tex.BossFederer, 128, 128, drawBossFederer);

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

  // Cigar smoke ring projectile.
  make(scene, Tex.Smoke, 40, 40, (g) => {
    g.lineStyle(13, NAVY, 1).strokeCircle(20, 20, 12);
    g.lineStyle(7, 0xe6e6ee, 1).strokeCircle(20, 20, 12);
  });
}
