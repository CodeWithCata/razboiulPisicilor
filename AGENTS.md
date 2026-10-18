# AGENTS.md: Varu vs. Pisicile

Top-down Phaser 4 arena game: Varu swings a belt at waves of cats and 3 bosses. Personal gift for a friend, shared by link.
Stack: Phaser 4.2.1, TypeScript 7.0.2 (strict), Vite 8.3.4, pnpm 12. Node >= 22.12.

## Read order (saves tokens)
1. This file. 2. `docs/CODEMAP.md` (every file + its exports: use it instead of grepping `src/`). 3. Only the files you change. 4. `docs/GAMEPLAY.md` only for design questions (belt, arena, audio, jokes, cats, bosses, pickups).
Do not read: `pnpm-lock.yaml`, `dist/`, `public/assets/maps/arena.json` (generated), `src/assets/placeholders.ts` and `src/assets/art/*` (characters, projectiles, pickups drawn in code from the reference photos; shared toolkit in `art/shapes.ts`).

## Commands
`pnpm install` | `pnpm dev` | `pnpm typecheck` | `pnpm build` (tsc + vite) | `pnpm codemap` (regenerate CODEMAP after adding/renaming/removing exports) | `pnpm gen:map` (regenerate arena.json, overwrites it).
Dev keys (dev only, card in `ui/DebugPanel.ts`, texts `DEBUG_SECTIONS` in `content/lines.ts`, handlers `GameScene.setupDebugKeys`): 1-5 cats, X horde, K kill all, B boss, L next wave, V victory, J +score, G god mode, F full heal, C reset belt cooldowns, U all power-ups, P pickup, Y hitboxes, T download tileset, I show / hide the card (hidden by default). Pause Esc, mute N, hide controls reminder H, end screens R/M.

## Owner's rules
- Placeholders, NOT assets: characters, projectiles, pickups and sound are generated in code. Only the SCENE is real art (`art-source/` -> `python3 scripts/build-scene-art.py` -> `public/assets/grass.png`, `arena_tiles.png`). Never add other image or audio files (one exception: the app icons in `public/icons/`, made from the owner's orange-cat logo `art-source/logo.png` by `python3 scripts/make-icons.py`). Real files go in through `src/assets/manifest.ts` and `audioManifest.ts`.
- Keep the Romanian humor and text. Text in `src/content/`, numbers in `src/config/` (no magic numbers). Small focused files.
- No Capacitor. Hobbyist owner: do not ask many questions; pick something sensible, say it in one line, build. Owner reads on a phone: short replies, answer first.
- Be honest: the game has NEVER been played in a browser, and Parts 6-8 have never passed the real `tsc`/`vite build` (sandbox had no network). Never claim gameplay is verified. If `pnpm build` fails, fix errors; likeliest spots: `systems/AudioSystem.ts`, `world/ArenaMap.ts`, `ui/MuteBadge.ts`, `ui/PhotoFrame.ts`, `ui/pause/PauseRow.ts`, `input/touch/TouchOverlay.ts`, `core/fullscreen.ts`, `scenes/BootScene.ts`.
- Delivery: `pnpm typecheck` + `pnpm build`, update docs, zip WITHOUT `node_modules` and `dist` into `/mnt/user-data/outputs/`, call `present_files`.

## Architecture rules
0. Deadlines use `gameClock.now` (`core/clock.ts`), never `scene.time.now` (it keeps running during pause). `delayedCall` and tweens are fine.
1. Event bus (`core/events.ts`): gameplay emits, UI/effects/audio listen. `const off = listen(...)`, unsubscribe on scene `SHUTDOWN`. Only `AudioSystem` is game-lifetime.
2. Gameplay never touches tiles: it asks `ArenaQuery` (`core/arena.ts`, implemented by `world/SolidGrid.ts`). Walking cats path around walls with `core/flowField.ts` (BFS to Varu/laser dot, used by `Enemy.steerTo` when the straight line is blocked).
3. Sprites face UP (rotation = angle + PI/2). Sizes and hitboxes in game pixels via `fitToSize` / `setCircleHitbox`.
4. Input only through `InputSource` (`input/`). `GameScene` only wires things together.
5. Everything created in `create()` must be cleaned up or scene-owned (scenes restart).
6. tsconfig has `noUnusedLocals/Parameters`: prefix unused params with `_`.

## Folders (details: CODEMAP)
- `config/` numbers: `balance.ts` (all gameplay), `animation.ts` (procedural cat sway/squash/flap, set `enabled: false` once real animated sprites exist), `waves.ts`, `bosses.ts`, `arena.ts`, `audio.ts`, `hud.ts`, `jokes.ts`, `pause.ts`, `touch.ts`, `hitstop.ts`, `clock.ts`, `style.ts`, `pickups.ts`.
- `content/` text: `lines.ts`, `jokes.ts`, `bosses.ts` (incl. ENDING_MESSAGE), `pause.ts`.
- `assets/` keys, manifests, placeholder generators; `assets/art/` one file per group of code-drawn art (varu, cats, bosses, items) + `shapes.ts` toolkit (layer = navy outline + flat fill). `core/` pure helpers, event bus, clock, storage, mute.
- `entities/` Varu, `Enemy` base, `enemies/` one file per cat, `bosses/` `Boss` state machine + one file per boss.
- `systems/` belt, waves, score, projectiles, pickups, effects, audio, jokes, hit-stop. `world/` Tiled map loader, solid grid, spawns.
- `scenes/` Boot, Menu, Game, UI, Pause, GameOver, Victory. `ui/` toast, mute badge, photo frame, boss card, pause rows. `input/` keyboard+mouse, touch (`touch/TouchInput.ts` one move stick + attack button, no aim stick, `touch/AutoAim.ts` nearest-cat aim + auto-swing, used only if the pause-menu switch is on (otherwise Varu looks the way he walks), `touch/TouchOverlay.ts` stick + attack + pause drawing; the spin and throw touch buttons are `ui/BeltBadges.ts`, placed by `config/touch.ts`).

## Recipes
- New cat: stats in `ENEMIES` (`balance.ts`); texture key in `assets/keys.ts` + placeholder in `assets/placeholders.ts`; `entities/enemies/MyCat.ts` extends `Enemy` (override `think`); register in `entities/enemies/index.ts`; use in `config/waves.ts`.
- New boss: stats in `ENEMIES` + `BOSS_TYPES` + `BOSS.armor` (`balance.ts`), numbers in `config/bosses.ts`; texture + placeholder; texts in `content/bosses.ts`; `entities/bosses/MyBoss.ts` extends `Boss` (`idleMove`, `cooldown`, `defineAttacks`: each attack = telegraph, fire, optional active/end); register in `entities/enemies/index.ts`; put in a wave.
- New pickup: kind in `PickupKind` (+ `BuffKind` if timed) and numbers in `balance.ts`; texture key + placeholder + line in `config/pickups.ts`; case in `systems/pickupEffects.ts`; label in `content/lines.ts`; weight in `PICKUP_SPAWN`.
- New belt attack: numbers in `balance.ts` + one object in `systems/belt/attacks.ts`.
- Real art: only lines in `assets/manifest.ts` (tileset as `[Tex.Tileset]`). Photos in `public/assets/photos/`, ids `queen mafia federer gameOver ending`. Real audio in `public/assets/audio/` via `AUDIO_MANIFEST` / `MUSIC_MANIFEST`.
- Tiled map: tileset name `arena_tiles`; layers `ground walls decor spawns`; spawns are POINT objects with Type `player` | `enemy` | `boss`.

## Phaser 4 gotchas
- No `setTintFill`: `sprite.setTint(c).setTintMode(Phaser.TintModes.FILL)`; undo with `clearTint()` + `setTintMode(Phaser.TintModes.MULTIPLY)`.
- `Graphics.fillPoints/strokePoints` need real `Phaser.Math.Vector2[]` (`poly()` in `assets/paint.ts`).
- Sprites already have `state`: never name a field `state`.
- `import Phaser from 'phaser'`. Particles: `scene.add.particles(0, 0, key, config)` then `emitter.explode(count, x, y)`.
- Pure logic can run with `node --experimental-strip-types file.ts` only for files without constructor parameter properties and without runtime Phaser imports (works: `core/steering.ts`, `core/cooldown.ts`, `world/spawns.ts`).
- The sandbox bash is `/bin/sh`: no brace expansion.

## Still open (owner supplies)
Real nicknames/inside jokes (`content/jokes.ts` PLACEHOLDER lines, `bosses.ts`, `lines.ts`), friend photos, recorded "miau" sounds, real sprites (pickups, projectiles, tiles, screens, belt swoosh). Ask ONCE, in one short message.
Touch rework (v21: one stick, big attack button, look-where-you-walk, auto-aim + auto-swing only if the "Atac automat" pause-menu switch is on, big spin/throw badges as buttons, bigger pause/mute/end-screen taps, `index.html` phone fixes) was written WITHOUT running `tsc`, `vite` or a browser: expect to fix typos. Likeliest spots: `input/touch/AutoAim.ts`, `input/touch/TouchInput.ts`, `ui/BeltBadges.ts`, `ui/pause/PauseRow.ts`, `core/fullscreen.ts` (`navigator.wakeLock`).
Screen fit (v33, researched): `main.ts` uses Phaser `Scale.EXPAND` with base 1280x720 (docs.phaser.io Scale modes; Feronato's EXPAND article, Oct 2026): Phaser fills the whole `#game` box and grows ONE side, so no bars on any phone or tablet. `GAME.width/height` (`config/balance.ts`) are LIVE getters on the scale manager (`bindGameSize`). Rules: scenes read GAME when created; centered things use `GAME.width / 2`; things hugging the right or bottom edge use `shiftRight(x)` / `shiftDown(y)` on their 1280x720 position (use getters `get x() { return shiftRight(1150); }` in config objects, never a value computed at import); never write a bare 1280 or 720 in layout. `core/relayout.ts` rebuilds Menu / GameOver / Victory when the size changes (debounced, landscape only); `MenuScene` waits for fullscreen to settle (`whenScaleSettled`) before starting the run, because fullscreen resizes the canvas AFTER the tap. A run (GameScene + UIScene) is not rebuilt on a mid-run resize (UI text would keep its old spot until the next scene; the camera and touch buttons follow). Earlier tries (width guessed from the window, v31/v32) were wrong: removed. Untested in a browser.
Phone viewport (v30): page height is `--app-h` (`100dvh`, then the real visible height from `core/viewport.ts`), `#game` sits inside `env(safe-area-inset-*)`, Phaser re-measures on resize/orientation. Written WITHOUT a browser: owner to confirm the bottom border of the map and the attack button are fully visible, in and out of fullscreen.
Check in a browser (owner reports): touch feel (stick size, `TOUCH.autoAim` numbers, button spots), cats stuck on walls, boss vs tile collisions, audio unlock and spam, joke frequency, toast/photo layout overlap, pause (timers wait, clean restart), hit-stop never sticks, wave 15 balance, touch on phones.
Ideas: endless bosses with growing HP, settings screen, tutorial overlay, self-host the font (`public/fonts/`) for offline play.
PWA (v34, wired, NOT tested by the assistant: owner tests): installable + offline. `public/manifest.webmanifest`, icons in `public/icons/`, `index.html` links. `scripts/offline-plugin.mjs` (Vite plugin in `vite.config.ts`) writes `dist/sw.js` from `scripts/sw-template.js` after `pnpm build` (list of all built files + version hash; cache-first, Google Font cached too; first install takes over at once, UPDATES wait for the "Versiune nouă" button on the menu or the next app launch; `storage.persist()` requested). `core/pwa.ts` registers it (built game only, not `pnpm dev`) and holds the install prompt; `ui/PwaUi.ts` = DOM install button on the menu (`MenuScene`) + "ready for offline" note; numbers `config/pwa.ts`, texts `PWA_TEXT`. Test with `pnpm build && pnpm preview` (needs https or localhost; itch.io iframes cannot install).
Hosting: VERCEL (owner's choice). `vercel.json` (framework vite, output `dist`) gives `/sw.js` `Cache-Control: max-age=0, must-revalidate` (the browser must never keep an old service worker) and the manifest its `application/manifest+json` type. Vercel runs `npm run build` = `tsc --noEmit && vite build`, so a TypeScript error fails the deploy. The repo has `package-lock.json` (Vercel then uses npm); if you switch to pnpm, commit `pnpm-lock.yaml` and delete `package-lock.json`. Vercel is https, so install + offline work on the live link.
Deploy: `pnpm build` makes `dist/` (`base: './'`, works from any folder: itch.io, GitHub Pages, Netlify, Cloudflare Pages).
