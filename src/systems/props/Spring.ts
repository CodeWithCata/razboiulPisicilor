/**
 * A damped spring that pulls `value` back to 0. It is what makes a bush jiggle instead of just jumping back.
 * No Phaser import on purpose, so it can be tested with plain node.
 */
const MAX_STEP = 1 / 120; // seconds; long frames are cut into steps this small so a stiff spring never explodes
const REST_VALUE = 0.002;
const REST_SPEED = 0.03;

export class Spring {
  value = 0;
  velocity = 0;

  /** True when it has stopped moving: nothing to update or redraw. */
  get resting(): boolean {
    return this.value === 0 && this.velocity === 0;
  }

  /** Shove it with an instant speed. For a swing that peaks near `amount`, use `amount * 2 * PI * hz`. */
  kick(velocity: number): void {
    this.velocity += velocity;
  }

  /** `hz`: swings per second. `damping`: 0 rings for ever, 1 settles without any wobble. */
  step(dt: number, hz: number, damping: number): void {
    if (this.resting) return;
    const omega = Math.PI * 2 * hz;
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity += (-omega * omega * this.value - 2 * damping * omega * this.velocity) * h;
      this.value += this.velocity * h;
    }
    if (Math.abs(this.value) < REST_VALUE && Math.abs(this.velocity) < REST_SPEED) {
      this.value = 0;
      this.velocity = 0;
    }
  }
}
