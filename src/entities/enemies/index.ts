/** @file Registry: enemy type name -> class. Add every new cat / boss here (`createEnemy`). */
import type Phaser from 'phaser';
import type { EnemyType } from '../../config/balance';
import type { Enemy } from '../Enemy';
import { MafiaCat } from '../bosses/MafiaCat';
import { PisicaFederer } from '../bosses/PisicaFederer';
import { QueenCat } from '../bosses/QueenCat';
import { FatCat } from './FatCat';
import { FlyingCat } from './FlyingCat';
import { KamikazeCat } from './KamikazeCat';
import { LuckyCat } from './LuckyCat';
import { NinjaCat } from './NinjaCat';
import { NormalCat } from './NormalCat';
import { TennisCat } from './TennisCat';

type EnemyFactory = (scene: Phaser.Scene, x: number, y: number) => Enemy;

/** Register every cat and boss here. The wave spawner only needs the type name. */
const FACTORIES: Record<EnemyType, EnemyFactory> = {
  normal: (s, x, y) => new NormalCat(s, x, y),
  fat: (s, x, y) => new FatCat(s, x, y),
  ninja: (s, x, y) => new NinjaCat(s, x, y),
  kamikaze: (s, x, y) => new KamikazeCat(s, x, y),
  flying: (s, x, y) => new FlyingCat(s, x, y),
  lucky: (s, x, y) => new LuckyCat(s, x, y),
  tennis: (s, x, y) => new TennisCat(s, x, y),
  queen: (s, x, y) => new QueenCat(s, x, y),
  mafia: (s, x, y) => new MafiaCat(s, x, y),
  federer: (s, x, y) => new PisicaFederer(s, x, y),
};

export function createEnemy(scene: Phaser.Scene, type: EnemyType, x: number, y: number): Enemy {
  return FACTORIES[type](scene, x, y);
}
