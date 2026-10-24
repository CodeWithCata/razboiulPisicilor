/** @file The "what's new" cards (Romanian), newest first. Add a new entry at the TOP with a bigger `id` to show a card once on every device after the update. */

export interface WhatsNewEntry {
  /** Only ever goes up (use the version number). A device that saw `id` 246 sees the next card when an entry with a bigger id exists. */
  readonly id: number;
  readonly lines: readonly string[];
}

export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    id: 246,
    lines: [
      'Jos, sub cărți, stau bulinele curelei: vezi ce ai strâns înainte să mai alegi ceva.',
      'Lovitura finală trage camera puțin mai aproape. Să vezi bine pe cine a durut.',
      'Pisicile se turtesc pe unde le-ai lovit, nu doar clipesc alb. Nu e bug, așa fac ele.',
      'Cartea asta e nouă. Data viitoare apare doar dacă mai stric ceva.',
    ],
  },
];

export const WHATS_NEW_UI = {
  title: 'CE E NOU, VARULE?',
  tag: (id: number): string => `Versiunea ${id}`,
  button: 'Gata, la treabă!',
  hint: 'Enter, Esc sau click',
  hintTouch: 'Atinge oriunde',
} as const;
