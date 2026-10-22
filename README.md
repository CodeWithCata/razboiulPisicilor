# Varu vs. Pisicile 🐱🧷

Phaser 4 + TypeScript + Vite game, all art and sound generated in code for now.

```
npm ci        # or: pnpm install
npm run dev   # or: pnpm dev
```

Controls: WASD move, mouse aim, hold click to swing the belt, Shift or right click to spin, E to throw, Space to dodge roll, Esc pause, N sound. Phones get touch controls automatically (`?touch=1` to test on a computer): left thumb moves, right thumb has a big attack button (hold to swing) plus spin, throw and "Tumbă" (dodge roll); Varu looks the way you walk. "Atac automat" (Varu swings by himself) is an optional switch in the pause menu, off by default.

Status: `npm run build` (tsc + vite) passes. The game has never been played in a browser or on a phone yet, so gameplay is untested: if something feels wrong, tell me what and where.

Developers and AI agents: start with `AGENTS.md`. File index with the purpose of every file: `docs/CODEMAP.md`. Design details: `docs/GAMEPLAY.md`. Version notes and open questions: `docs/HISTORY.md`. Before sending changes: `npm run check`.

Installable app + offline play: build with `npm run build`, deploy to Vercel (`vercel.json` is included; import the repo, framework Vite, nothing else to set) or test locally with `npm run preview`. The menu shows "Instalează jocul" when the browser allows it. Icons come from `art-source/logo.png` (`python3 scripts/make-icons.py`).
