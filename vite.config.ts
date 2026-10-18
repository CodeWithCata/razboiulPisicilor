import { defineConfig } from 'vite';
import { offlinePlugin } from './scripts/offline-plugin.mjs';
import { FONT_LOADING } from './src/config/style';

export default defineConfig({
  // Relative paths so the build works from any folder: GitHub Pages, Netlify, Cloudflare Pages (itch.io too, but it cannot install the app).
  base: './',
  server: { port: 5173, open: true },
  build: { chunkSizeWarningLimit: 2000 },
  // Writes dist/sw.js (offline mode + installable app) after the build. See scripts/sw-template.js.
  plugins: [offlinePlugin({ fontStylesheets: [FONT_LOADING.stylesheetUrl] })],
});
