/** @file The row of small chips along the bottom of the belt pick screen: every upgrade Varu already owns (name + level pips) and every synergy (pink). */
import Phaser from 'phaser';
import { GAME } from '../config/balance';
import { BELT_SYNERGY_LOOK } from '../config/beltSynergies';
import { BELT_UPGRADE_IDS, BELT_UPGRADE_LOOK as L } from '../config/beltUpgrades';
import { FONT } from '../config/style';
import { BELT_SYNERGY_TEXT, BELT_UPGRADE_TEXT } from '../content/beltUpgrades';
import { ownedBeltSynergies } from '../core/beltSynergies';
import { beltUpgradeLevel, beltUpgradeMaxLevel } from '../core/beltUpgrades';

/** What one chip shows. `key` is the upgrade or synergy id (they never share a name), `level` / `max` the pips (a synergy has one, always full). */
interface ChipSpec {
  readonly key: string;
  readonly name: string;
  readonly level: number;
  readonly max: number;
  readonly accent: number;
}

interface Chip {
  readonly key: string;
  readonly box: Phaser.GameObjects.Container;
}

/**
 * Reads the run's state (`core/beltUpgrades.ts`, `core/beltSynergies.ts`) when it is built and again on `refresh`, so it never keeps a copy
 * that could drift. It is a plain picture: no clicks, no keys, nothing here can pick or block a card.
 */
export class OwnedUpgrades {
  readonly view: Phaser.GameObjects.Container;
  private chips: Chip[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.view = scene.add.container(x, y).setDepth(L.depth + 3);
    this.build();
  }

  /** The row fades in after the cards have slid up. */
  intro(): void {
    this.view.setAlpha(0);
    this.scene.tweens.add({ targets: this.view, alpha: 1, duration: L.owned.introMs, delay: L.owned.introDelayMs, ease: 'Sine.easeOut' });
  }

  /** The pick was made: draw the row again from the new state, and pop the chip that changed (a new chip, or one more pip). */
  refreshAndPop(key: string): void {
    this.build();
    const chip = this.chips.find((c) => c.key === key);
    if (!chip) return;
    const O = L.owned;
    this.scene.tweens.add({ targets: chip.box, scale: O.pop.scale, duration: O.pop.ms, yoyo: true, ease: 'Sine.easeOut' });
  }

  private specs(): ChipSpec[] {
    const list: ChipSpec[] = [];
    for (const id of BELT_UPGRADE_IDS) {
      const level = beltUpgradeLevel(id);
      if (level > 0) list.push({ key: id, name: BELT_UPGRADE_TEXT[id].name, level, max: beltUpgradeMaxLevel(id), accent: L.owned.accents[id] });
    }
    for (const id of ownedBeltSynergies()) list.push({ key: id, name: BELT_SYNERGY_TEXT[id].name, level: 1, max: 1, accent: BELT_SYNERGY_LOOK.borderColor });
    return list;
  }

  /** (Re)make every chip and center the row; shrink it if it is wider than the share of the screen it may use. */
  private build(): void {
    const O = L.owned;
    this.view.removeAll(true);
    this.view.setScale(1);
    this.chips = [];
    const specs = this.specs();
    if (specs.length === 0) return;

    const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: FONT, fontSize: `${O.size}px`, color: '#fff3d6', stroke: '#1b2340', strokeThickness: O.strokeThickness };
    const made = specs.map((spec) => {
      const name = this.scene.add.text(0, 1, spec.name, style).setOrigin(0, 0.5);
      const pipsW = spec.max * O.pip.w + (spec.max - 1) * O.pip.gap;
      return { spec, name, pipsW, w: O.padX * 2 + name.width + O.nameGap + pipsW };
    });
    const total = made.reduce((sum, m) => sum + m.w, 0) + (made.length - 1) * O.gap;
    let left = -total / 2;
    for (const m of made) {
      const box = this.scene.add.container(left + m.w / 2, 0);
      const back = this.scene.add.graphics();
      back.fillStyle(O.fill, O.fillAlpha).fillRoundedRect(-m.w / 2, -O.h / 2, m.w, O.h, O.radius);
      back.lineStyle(O.border, m.spec.accent, 1).strokeRoundedRect(-m.w / 2, -O.h / 2, m.w, O.h, O.radius);
      m.name.setX(-m.w / 2 + O.padX);
      const pips = this.scene.add.graphics();
      const pipsLeft = -m.w / 2 + O.padX + m.name.width + O.nameGap;
      for (let i = 0; i < m.spec.max; i++) {
        const on = i < m.spec.level;
        pips.fillStyle(on ? (m.spec.max === 1 ? m.spec.accent : O.pip.onColor) : O.pip.offColor, 1).fillRoundedRect(pipsLeft + i * (O.pip.w + O.pip.gap), -O.pip.h / 2, O.pip.w, O.pip.h, O.pip.radius);
      }
      box.add([back, m.name, pips]);
      this.view.add(box);
      this.chips.push({ key: m.spec.key, box });
      left += m.w + O.gap;
    }
    const room = GAME.width * O.maxWidthShare;
    if (total > room) this.view.setScale(room / total);
  }
}
