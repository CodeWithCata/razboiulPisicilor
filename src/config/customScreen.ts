/** @file Look of the custom game: the setup screen (tabs, rows, preset cards, footer) and its button on the main menu. Game pixels on the 1280x720 base. No Phaser. */
import type { CustomPresetId } from './customGame';
import { DIFFICULTY_MENU } from './difficulty';

/** The setup screen (scenes/CustomGameScene.ts, ui/CustomRow.ts). Everything is placed from the middle of the 1280x720 base, like the almanac. */
export const CUSTOM_SCREEN = {
  base: { w: 1280, h: 720 },
  titleY: 50,
  titleSize: 50,
  /** The four page tabs, side by side and centered. */
  tabs: { y: 108, w: 200, h: 44, gap: 14, size: 26 },
  /** The key reminder under the tabs (computers only): small text on a dark pill so it can be read on the grass. */
  keysY: 146,
  keysSize: 18,
  keys: { color: '#ffffff', padX: 18, padY: 6, pillAlpha: 0.9 },
  /**
   * The rows of a page, in a grid of columns: a page with more than `maxPerColumn` rows is split into two columns (the first column
   * is filled first, so Up / Down still walks the rows in list order). `w` = width of one column, `top` = top of the first row.
   */
  rows: { w: 540, h: 100, gap: 12, colGap: 28, top: 172, maxPerColumn: 4 },
  /**
   * Inside a row: the name and the hint stacked on the left; on the right the control: a triangle on each side, the value between
   * them and, under the value, a strip of segments that shows where the value sits among the choices.
   */
  row: {
    radius: 14,
    border: 3,
    fill: 0x121830,
    fillAlpha: 0.98,
    /** The selected row is lighter and has the gold frame. */
    fillSelected: 0x2c3a78,
    borderColor: 0x6c78ad,
    borderSelected: 0xf5c518,
    /** The colored stripe on the row's left edge. */
    stripeW: 9,
    padX: 28,
    /** The text column ends this far before the left triangle. */
    textGap: 18,
    nameSize: 26,
    hintSize: 17,
    textGapY: 3,
    nameColor: '#ffffff',
    hintColor: '#d3dbf7',
    /** Distance from the row's RIGHT edge to the middle of the control, and from that middle to each triangle. */
    controlFromRight: 140,
    triOffset: 112,
    triW: 16,
    triH: 28,
    /** Triangles: gold on the selected row, quiet blue-grey on the others. */
    triColor: 0xf5c518,
    triColorIdle: 0xa3aedb,
    valueSize: 27,
    valueY: -13,
    /** The value's color: cream = the row's starting choice, lilac = changed by you, grey = switched off. */
    valueColor: '#ffffff',
    changedColor: '#dcc4ff',
    offColor: '#a9b4dc',
    /** An off row's name and hint fade a little. */
    offTextAlpha: 0.78,
    /** The segment strip: width of the whole strip, height, gap between segments and its distance below the middle. */
    meterW: 196,
    meterH: 9,
    meterGap: 3,
    meterY: 27,
    meterEmpty: 0x3b4880,
    /** The color of the filled segments and of the row's stripe, per page; off rows use `offStripe`. */
    pageColors: { cats: 0xffa94d, bosses: 0xff7a7a, rules: 0x63d0ff },
    offStripe: 0x7480b0,
    /** Rows whose choice "0" does NOT mean off (0 waves = never ends). */
    zeroIsOn: ['waves'],
    /** Taps: the small zone round the left triangle steps back, everything right of it (value + right triangle) steps forward. */
    leftHitW: 92,
    hoverMs: 90,
  },
  /** The four preset cards of the quick page: a colored band on top (`accents`), the name and the blurb under it. */
  cards: {
    top: 190,
    w: 270,
    h: 320,
    gap: 22,
    radius: 18,
    border: 5,
    fill: 0x1b2340,
    fillAlpha: 0.96,
    borderColor: 0x4a5275,
    bandH: 22,
    nameSize: 36,
    nameY: 74,
    blurbSize: 22,
    blurbW: 224,
    blurbY: 124,
    selectedScale: 1.04,
    popMs: 110,
    accents: { bossRush: 0xd93a3a, invasion: 0xf59a3c, chill: 0x7ee081, chaos: 0xc9a7ff } satisfies Record<CustomPresetId, number>,
  },
  /** The "aplicat" word that flashes on a card when its preset is applied: `y` = its start below the middle of the card. */
  flash: { size: 40, color: '#9be28f', riseY: 40, ms: 700, y: 110 },
  /** The footer: Înapoi, Aleatoriu, Resetează and JOACĂ in a row, centered. */
  footer: { y: 668, h: 54, gap: 20, size: 26, backW: 190, randomW: 230, resetW: 230, playW: 320, playSize: 32, disabledAlpha: 0.4 },
  /** Why JOACĂ is switched off, just above the footer. */
  problem: { y: 626, size: 21, color: '#ff8a7a' },
  /** The pop of the title and the sliding of the page content. */
  titlePopMs: 320,
  contentFadeMs: 140,
} as const;

/**
 * The custom game button on the main menu (ui/CustomGameButton.ts): a "sliders" picture, the name under it and, under that, a blurb (and on
 * computers the key). It mirrors the difficulty cat on the other side of the screen: same height, `x` = the screen's width minus `DIFFICULTY_MENU.x`.
 */
export const CUSTOM_MENU = {
  /** Same middle height as the difficulty button. */
  y: DIFFICULTY_MENU.y,
  touchY: DIFFICULTY_MENU.touchY,
  /** The picture is a square badge (width = height). */
  iconW: 100,
  touchIconW: 114,
  size: 24,
  touchSize: 28,
  labelGap: 6,
  captionW: 190,
  /** The key reminder under the blurb ("(tasta C)"), desktop only. */
  keySize: 16,
  /** A new button pops in: scale from `from` to 1 in `ms`. */
  pop: { from: 0.8, ms: 240 },
  /** The badge: fill, border and the glow behind it. */
  badge: { radius: 22, border: 5, fill: 0x1b2340, borderColor: 0xc9a7ff, auraColor: 0xc9a7ff, auraAlpha: 0.2, auraRadius: 0.62 },
  /** Three sliders: height of each track (share of the badge), where its knob sits (0..1 along the track) and the knob's radius (share of the badge). */
  sliders: {
    trackW: 0.62,
    trackThickness: 7,
    trackColor: 0x4a5275,
    knobColor: 0xf5c518,
    knobBorder: 3,
    knobR: 0.09,
    rows: [
      { y: -0.24, knob: 0.7 },
      { y: 0, knob: 0.3 },
      { y: 0.24, knob: 0.55 },
    ],
  },
} as const;
