/** Remembers when things last happened, so they can't fire again too soon. No Phaser, just numbers. */
export class Cooldowns {
  private readonly last = new Map<string, number>();

  ready(key: string, now: number, cooldownMs: number): boolean {
    const at = this.last.get(key);
    return at === undefined || now - at >= cooldownMs;
  }

  mark(key: string, now: number): void {
    this.last.set(key, now);
  }
}
