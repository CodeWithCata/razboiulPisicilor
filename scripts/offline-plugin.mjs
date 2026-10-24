import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), 'sw-template.js');
const SW_FILE = 'sw.js';
/** Not worth saving on the player's phone. */
const SKIP = /(\.(map|txt|mp4|webm)$|(^|[\\/])assets[\\/]audio[\\/]voice[\\/])/i; // videos (public/videos) and recorded voice lines (public/assets/audio/voice) are streamed, not saved: they would add MBs to every update

/** All files below `dir` as paths relative to `root`, with forward slashes. */
function walk(dir, root) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full, root));
    else files.push(relative(root, full).split(sep).join('/'));
  }
  return files;
}

/**
 * Builds dist/sw.js after `vite build`: the service worker template with the list of every built file and a version
 * that changes whenever any of them (or the worker's own code) changes. No dependencies, so nothing extra to install.
 *
 * @returns {import('vite').Plugin}
 */
export function offlinePlugin() {
  let outDir = 'dist';
  return {
    name: 'varu-offline',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // Runs after the bundle AND the public/ folder are in dist/.
      const files = walk(outDir, outDir).filter((file) => file !== SW_FILE && !SKIP.test(file)).sort();
      // A worker without the page it serves would cache nothing useful (and then "work offline" with a blank page): stop the build instead.
      if (!files.includes('index.html')) throw new Error('[offline] dist/index.html is missing: cannot write the service worker');
      const template = readFileSync(TEMPLATE, 'utf8');
      const hash = createHash('sha256').update(template);
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const version = hash.digest('hex').slice(0, 12);
      const worker = template.replace('__VERSION__', () => version).replace('__PRECACHE__', () => JSON.stringify(files, null, 2));
      writeFileSync(join(outDir, SW_FILE), worker);
      console.log(`\n[offline] ${SW_FILE} written: ${files.length} files saved for offline play, version ${version}`);
    },
  };
}
