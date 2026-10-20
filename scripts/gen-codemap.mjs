// Generates docs/CODEMAP.md: one line per source file with its PURPOSE and its exports.
// AI agents read this one file instead of opening or grepping src/.
//
// Purpose = the `@file` line at the top of the file (`/** @file ... */`), or, for older files, the first sentence of the
// comment that starts the file. Every file should have one: this script warns about files that do not.
//
// Run:    npm run codemap          (re-run after adding, renaming or removing a file or an export, or changing a @file line)
// Check:  npm run codemap:check    (exits 1 if docs/CODEMAP.md is out of date; `npm run check` runs it with the typecheck)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'docs', 'CODEMAP.md');
const CHECK = process.argv.includes('--check');

/** What each folder is for (shown as a line under its heading). Folders are listed in this order; any other folder goes last. */
const DIR_NOTES = {
  '.': 'Entry point.',
  scenes: 'Phaser scenes. GameScene only WIRES systems together; UIScene is the HUD; Pause / GameOver / Victory sit on top.',
  entities: 'Things in the arena: Varu (Player), the Enemy base, Pickup. `enemies/` = one file per cat, `bosses/` = Boss state machine + one file per boss.',
  systems: 'Game rules, one system per concern (belt, waves, score, projectiles, pickups, effects, audio, jokes). They talk through the event bus.',
  'systems/belt': 'The belt: swing / spin sweeps, thrown boomerang, strap drawing, goo particles.',
  'systems/props': 'The living arena: springy props, fences, kickable cans / ball, gold leaf, destruction, particles.',
  'systems/audio': 'Synthesized placeholder sound and music (Web Audio). Real files go through assets/audioManifest.ts.',
  input: 'Input behind the `InputSource` interface. Gameplay never reads keyboard, mouse or touch directly.',
  'input/touch': 'Touch controls for phones and tablets.',
  world: 'The Tiled arena map, the solid grid gameplay queries, spawn points, prop layout.',
  ui: 'HUD and menu pieces (Phaser objects). `ui/pause/` = pause rows, `ui/debug/` = dev cheat card.',
  'ui/pause': 'Pieces of the pause menu.',
  'ui/debug': 'Pieces of the dev-only debug card.',
  config: 'NUMBERS ONLY (no magic numbers in code). `balance.ts` = all gameplay. Layout and look configs sit next to it.',
  content: 'TEXT ONLY (Romanian jokes, names, labels). Edit here to personalise the game.',
  core: 'Small helpers with no gameplay rules: event bus, game clock, storage, viewport, fullscreen, PWA, math.',
  assets: 'Texture / sound keys, manifests for real files, and the generators for code-drawn placeholders.',
  'assets/art': 'One file per group of code-drawn art (Varu, cats, bosses, crows, items) + the shapes toolkit.',
};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );

const EXPORT_RE = /^export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:const enum|const|let|function\*?|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm;
const LIST_RE = /^export\s*\{([^}]+)\}/gm;

/** The one-line purpose of a file, or null if it has none. */
function purposeOf(text) {
  const tag = text.match(/^\/\*\*\s*@file\s+([\s\S]*?)\s*\*\//);
  if (tag) return tag[1].replace(/\s*\n\s*\*?\s*/g, ' ').trim();
  let block = null;
  if (text.startsWith('/*')) block = text.slice(0, text.indexOf('*/')).replace(/^\/\*+/, '');
  else if (text.startsWith('//')) block = text.split('\n').filter((l) => l.startsWith('//')).join('\n');
  if (block === null) return null;
  const clean = block.split('\n').map((l) => l.replace(/^\s*(\*|\/\/)\s?/, '').trim()).filter(Boolean).join(' ');
  // First sentence only (a ". " followed by a capital letter or the end), capped so the map stays one line per file.
  const first = clean.match(/^(.+?[.!?:])(?:\s+[A-Z`(]|$)/)?.[1] ?? clean;
  return first.length > 170 ? `${first.slice(0, 167).trimEnd()}...` : first;
}

const BOTTOM = new Set(['config', 'content', 'core', 'assets']);
const TOP = new Set(['scenes', 'systems', 'entities', 'ui', 'input', 'world']);
const IMPORT_RE = /from\s+'(\.[^']*)'/g;
/** Imports that point from a bottom folder up into a top folder (a layering mistake). */
const layerBreaks = [];

const byDir = new Map();
const missing = [];
for (const file of walk(SRC).sort()) {
  const text = readFileSync(file, 'utf8');
  const names = [];
  for (const m of text.matchAll(EXPORT_RE)) names.push(m[1]);
  for (const m of text.matchAll(LIST_RE)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop();
      if (n) names.push(n);
    }
  }
  const rel = relative(SRC, file).split(sep).join('/');
  if (BOTTOM.has(rel.split('/')[0])) {
    for (const m of text.matchAll(IMPORT_RE)) {
      const target = relative(SRC, join(file, '..', m[1])).split(sep)[0];
      if (TOP.has(target)) layerBreaks.push(`${rel} imports ${m[1]}`);
    }
  }
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '.';
  const lines = text.split('\n').length - 1;
  const purpose = purposeOf(text);
  if (!purpose) missing.push(rel);
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push({ name: rel.slice(dir === '.' ? 0 : dir.length + 1), lines, names, purpose });
}

const order = Object.keys(DIR_NOTES);
const dirs = [...byDir.keys()].sort((a, b) => {
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
});

let out = '# CODEMAP (generated by `npm run codemap`, do not edit by hand)\n\n';
out += 'One line per file under `src/`: `name (size, only if big) - purpose. Exports: ...`. Use this instead of grepping or opening files.\n';
out += 'Paths are relative to `src/`. A size like `~600 lines` means the file is expensive to open: read only the part you need.\n';
out += 'Layers: the bottom (`config`, `content`, `core`, `assets`) never imports from the top (`scenes`, `systems`, `entities`, `ui`, `input`, `world`). This is checked by `npm run codemap:check`.\n';
for (const dir of dirs) {
  const title = dir === '.' ? 'src/' : `${dir}/`;
  out += `\n## ${title}\n`;
  if (DIR_NOTES[dir]) out += `${DIR_NOTES[dir]}\n\n`;
  else out += '\n';
  for (const f of byDir.get(dir)) {
    const size = f.lines >= 200 ? ` (~${Math.round(f.lines / 50) * 50} lines)` : '';
    const exp = f.names.length ? ` Exports: ${f.names.join(', ')}` : '';
    out += `- ${f.name}${size} - ${f.purpose ?? '(no purpose line: add a /** @file ... */ header)'}${exp.length ? `${f.purpose?.match(/[.!?]$/) ? '' : '.'}${exp}` : ''}\n`;
  }
}

if (layerBreaks.length) {
  console.error(`layering broken: config / content / core / assets must not import scenes, systems, entities, ui, input or world:\n  ${layerBreaks.join('\n  ')}`);
  process.exit(1);
}
if (missing.length) console.warn(`warning: ${missing.length} file(s) without a purpose line:\n  ${missing.join('\n  ')}`);

if (CHECK) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    // Missing file counts as out of date.
  }
  if (current !== out || missing.length) {
    console.error('docs/CODEMAP.md is out of date (or a file has no @file line). Run: npm run codemap');
    process.exit(1);
  }
  console.log('docs/CODEMAP.md is up to date');
} else {
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(OUT, out);
  console.log(`docs/CODEMAP.md written (${out.length} chars, ${[...byDir.values()].flat().length} files)`);
}
