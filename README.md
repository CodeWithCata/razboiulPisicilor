# Varu vs. Pisicile 🐱🧷

Phaser 4 + TypeScript + Vite game, all art and sound generated in code for now.

```
pnpm install
pnpm dev
```

Controls: WASD move, mouse aim, hold click or Space to swing the belt, Shift or right click to spin, E to throw, Esc pause, N sound. Phones get touch controls automatically (`?touch=1` to test on a computer): left thumb moves, right thumb has a big attack button (hold to swing) plus spin and throw; Varu looks the way you walk. "Atac automat" (Varu swings by himself) is an optional switch in the pause menu, off by default.

Status: never played in a browser, never built with the real Phaser sandbox. If `pnpm build` prints errors, send the first 20 lines.

Developers and AI agents: start with `AGENTS.md`. Design details: `docs/GAMEPLAY.md`. File index: `docs/CODEMAP.md`.

Installable app + offline play: build with `pnpm build`, deploy to Vercel (`vercel.json` is included; import the repo, framework Vite, nothing else to set) or test locally with `pnpm preview`. The menu shows "Instalează jocul" when the browser allows it. Icons come from `art-source/logo.png` (`python3 scripts/make-icons.py`).
