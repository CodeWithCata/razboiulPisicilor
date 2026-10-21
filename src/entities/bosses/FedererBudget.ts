/** @file Counts the things Federer controls that can hurt Varu right now (her attack, the ball machine, her tennis ball boys) so there are never more than FEDERER.maxDamageSources at once. Plain data, no Phaser. */
import { FEDERER } from '../../config/bosses';

/** The independent damage sources she controls. */
export type DamageSource = 'attack' | 'machine' | 'boys';

export class FedererBudget {
  private readonly active = new Set<DamageSource>();

  /** Mark a source as active or not (call it every frame, it is cheap). */
  set(source: DamageSource, on: boolean): void {
    if (on) this.active.add(source);
    else this.active.delete(source);
  }

  /** How many sources are active now. */
  get count(): number {
    return this.active.size;
  }

  /** True if `source` may be active as well: it already is, or there is still room under the cap. */
  canAdd(source: DamageSource): boolean {
    return this.active.has(source) || this.active.size < FEDERER.maxDamageSources;
  }
}
