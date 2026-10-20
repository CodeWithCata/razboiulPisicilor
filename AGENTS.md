# AGENTS.md: Varu vs. Pisicile

Top-down Phaser 4 arena game: Varu swings a belt at waves of cats and 3 bosses. Personal gift for a friend, shared by link.
Stack: Phaser 4.2.1, TypeScript 7.0.2 (strict), Vite 8.3.4. Node >= 22.12. Hosted on Vercel (it runs `npm run build`).

## Read order (saves tokens)
1. This file. 2. `docs/CODEMAP.md`: every source file with its purpose and exports (use it instead of grepping `src/`). 3. Only the files you change. 4. `docs/STANDS_ANIMATION_PLAN.md` only when animating the stand fans. 4b. `docs/GAMEPLAY.md` only for design questions (belt, arena, audio, jokes, cats, bosses, pickups). 5. `docs/HISTORY.md` only when debugging screen fit, phone viewport, touch, PWA or the living arena.
Do not read: `package-lock.json`, `dist/`, `public/assets/maps/arena.json` (generated), `art-source/` (big images), `src/assets/placeholders.ts` and `src/assets/art/*` (characters, projectiles, pickups drawn in code; shared toolkit in `art/shapes.ts`).
Every source file starts with `/** @file <one-line purpose> */`: read just that line to decide if a file matters.

## Commands
`npm ci` (or `pnpm install`) | `npm run dev` | `npm run typecheck` | `npm run build` (tsc + vite) | `npm run check` (typecheck + CODEMAP up to date + layering) | `npm run codemap` (regenerate CODEMAP after adding / renaming / removing a file or export, or changing a `@file` line) | `npm run gen:map` (regenerates `arena.json`, overwrites it).
The repo has `package-lock.json` and Vercel uses npm; `pnpm` also works. If you switch to pnpm for good, commit `pnpm-lock.yaml`, delete `package-lock.json` and update `.claude/settings.json`.
Dev keys (dev only, card in `ui/DebugPanel.ts`, texts `DEBUG_SECTIONS` in `content/lines.ts`, handlers `GameScene.setupDebugKeys`): 1-7 cats (6 = the lucky cat, 7 = the tennis cat), X horde, K kill all, O every cat surrenders, B boss, L next wave, V victory, J +score, G god mode, F full heal, C reset belt cooldowns, U all power-ups, P pickup, Z next crowd mood (cheer, roar, gloom, calm), Y hitboxes, T download tileset, I show / hide the card (hidden by default). Pause Esc, mute N, hide controls reminder H, end screens R/M.

## Status (be honest about it)
- Verified 2026-10-19: `npm ci`, `tsc --noEmit` and `vite build` pass.
- NOT verified: gameplay. The game has never been played in a browser or on a phone. Never claim it works; the owner tests. Open check-list and per-version notes: `docs/HISTORY.md`.
- If a build fails after your edit, fix the errors (`npm run typecheck` shows them).

## Owner's rules
- Placeholders, NOT assets: characters, projectiles, pickups and sound are generated in code. Only the SCENE is real art (`art-source/` -> `python3 scripts/build-scene-art.py` -> `public/assets/grass.png`, `arena_tiles.png`). Never add other image or audio files (one exception: the app icons in `public/icons/`, made from the owner's orange-cat logo `art-source/logo.png` by `python3 scripts/make-icons.py`). Real files go in through `src/assets/manifest.ts` and `audioManifest.ts`.
- Keep the Romanian humor and text. Text in `src/content/`, numbers in `src/config/` (no magic numbers). Small focused files.
- No Capacitor. Hobbyist owner: do not ask many questions; pick something sensible, say it in one line, build. Owner reads on a phone: short replies, answer first.
- Delivery: `npm run typecheck` + `npm run build`, update docs (`npm run codemap`), zip WITHOUT `node_modules` and `dist` into `/mnt/user-data/outputs/`, call `present_files`.
- Still to ask the owner (ask ONCE, in one short message): real nicknames / inside jokes (`content/jokes.ts` PLACEHOLDER lines, `bosses.ts`, `lines.ts`), friend photos, recorded "miau" sounds, real sprites.

## Architecture rules
0. Deadlines use `gameClock.now` (`core/clock.ts`), never `scene.time.now` (it keeps running during pause). `delayedCall` and tweens are fine.
1. Event bus (`core/events.ts`): gameplay emits, UI / effects / audio listen. `const off = listen(...)`, unsubscribe on scene `SHUTDOWN`. Only `AudioSystem` is game-lifetime.
2. Gameplay never touches tiles: it asks `ArenaQuery` (`core/arena.ts`, implemented by `world/SolidGrid.ts`). Walking cats path around walls with `core/flowField.ts` (BFS to Varu / laser dot, used by `Enemy.steerTo` when the straight line is blocked).
3. Sprites face UP (rotation = angle + PI/2). Sizes and hitboxes in game pixels via `fitToSize` / `setCircleHitbox`.
4. Input only through `InputSource` (`input/`). `GameScene` only wires things together.
5. Everything created in `create()` must be cleaned up or scene-owned (scenes restart).
6. tsconfig has `noUnusedLocals` / `noUnusedParameters`: prefix unused params with `_`.
7. Layers: `config`, `content`, `core`, `assets` never import from `scenes`, `systems`, `entities`, `ui`, `input`, `world`. `npm run check` enforces it.
8. New source file = start it with `/** @file one-line purpose */`, then run `npm run codemap`.
9. Screen fit (`Scale.EXPAND`, base 1280x720, Phaser grows ONE side so there are no bars): `GAME.width` / `GAME.height` (`config/balance.ts`) are LIVE getters. Scenes read `GAME` when created. Centered things use `GAME.width / 2`. Things hugging the right or bottom edge use `shiftRight(x)` / `shiftDown(y)` on their 1280x720 position; in config objects write getters (`get x() { return shiftRight(1150); }`), never a value computed at import. Never write a bare 1280 or 720 in layout. `core/relayout.ts` rebuilds Menu / GameOver / Victory when the size changes; a run (GameScene + UIScene) is NOT rebuilt mid-run. `MenuScene` waits for `whenScaleSettled` before starting a run (fullscreen resizes the canvas after the tap).

## Folders
`config/` numbers (`balance.ts` = all gameplay, `animation.ts` = procedural cat sway / squash / flap, set `enabled: false` once real animated sprites exist). `content/` text (`bosses.ts` has ENDING_MESSAGE). `assets/` keys, manifests, placeholder generators; `assets/art/` one file per group of code-drawn art. `core/` pure helpers, event bus, clock, storage, mute. `entities/` Varu, `Enemy` base, one file per cat, `Boss` state machine + one file per boss. `systems/` belt, waves, score, projectiles, pickups, effects, audio, jokes, hit-stop, props. `world/` Tiled map loader, solid grid, spawns, the stands and their living crowd (`Stands.ts` builds the fans, `StandsCrowd.ts` animates them, numbers in `config/crowd.ts`, words `CROWD_LINES`; visual only, real time, `CROWD.enabled: false` = still fans). `scenes/` Boot, Menu, Game, UI, Pause, GameOver, Victory. `ui/` HUD and menu pieces. `input/` keyboard + mouse and touch. Every file and its exports: `docs/CODEMAP.md`.
Touch: `touch/TouchInput.ts` = one move stick + attack button, no aim stick; `touch/AutoAim.ts` = nearest-cat aim + auto-swing, used only if the pause-menu switch "Atac automat" is on (otherwise Varu looks the way he walks); `touch/TouchOverlay.ts` draws stick + attack + pause; the spin and throw touch buttons are `ui/BeltBadges.ts`, placed by `config/touch.ts`.

## Recipes
- New cat: stats in `ENEMIES` (`balance.ts`); texture key in `assets/keys.ts` + placeholder in `assets/placeholders.ts`; `entities/enemies/MyCat.ts` extends `Enemy` (override `think`); register in `entities/enemies/index.ts`; use in `config/waves.ts`.
- New boss: stats in `ENEMIES` + `BOSS_TYPES` + `BOSS.armor` (`balance.ts`), numbers in `config/bosses.ts`; texture + placeholder; texts in `content/bosses.ts`; `entities/bosses/MyBoss.ts` extends `Boss` (`idleMove`, `cooldown`, `defineAttacks`: each attack = telegraph, fire, optional active / end); register in `entities/enemies/index.ts`; put in a wave.
- New pickup: kind in `PickupKind` (+ `BuffKind` if timed) and numbers in `balance.ts`; texture key + placeholder + line in `config/pickups.ts`; case in `systems/pickupEffects.ts`; label in `content/lines.ts`; weight in `PICKUP_SPAWN`.
- New belt attack: numbers in `balance.ts` + one object in `systems/belt/attacks.ts`.
- New prop behaviour: numbers in `config/props.ts`, words in `content/lines.ts` `PROP_WORDS`, code in `systems/props/`.
- Real art: only lines in `assets/manifest.ts` (tileset as `[Tex.Tileset]`). Photos in `public/assets/photos/`, ids `queen mafia federer gameOver ending`. Real audio in `public/assets/audio/` via `AUDIO_MANIFEST` / `MUSIC_MANIFEST`.
- Tiled map: tileset name `arena_tiles`; layers `ground walls decor spawns`; spawns are POINT objects with Type `player` | `enemy` | `boss`.

## Phaser 4 gotchas
- No `setTintFill`: `sprite.setTint(c).setTintMode(Phaser.TintModes.FILL)`; undo with `clearTint()` + `setTintMode(Phaser.TintModes.MULTIPLY)`.
- `Graphics.fillPoints` / `strokePoints` need real `Phaser.Math.Vector2[]` (`poly()` in `assets/paint.ts`).
- Sprites already have `state`: never name a field `state`.
- `import Phaser from 'phaser'`. Particles: `scene.add.particles(0, 0, key, config)` then `emitter.explode(count, x, y)`.
- Pure logic can run with `node --experimental-strip-types file.ts` only for files without constructor parameter properties and without runtime Phaser imports (works: `core/steering.ts`, `core/cooldown.ts`, `world/spawns.ts`).
- The sandbox bash is `/bin/sh`: no brace expansion.

## Subsystem rules (details and history: `docs/HISTORY.md`)
- Phone viewport: page height is `--app-h` (`100dvh`, then the real visible height from `core/viewport.ts`); `#game` sits inside `env(safe-area-inset-*)`; `main.ts` sets `scale.fullscreenTarget: 'game'` so `#game` itself goes fullscreen. `core/viewport.ts` must call `scale.getParentBounds()` before `refresh()`.
- PWA (installable + offline): `public/manifest.webmanifest`, `scripts/offline-plugin.mjs` writes `dist/sw.js` from `scripts/sw-template.js`, `core/pwa.ts` registers it (built game only), `ui/PwaUi.ts` is the DOM install / update UI. Do NOT remove the `event.addRoutes(...)` opt-out in `sw-template.js` `install` (Chrome ServiceWorkerAutoPreload bug, Chromium 466790291) or the `skipWaiting()`. `index.html` has a boot self-repair (unregisters the worker and wipes `varu-*` caches once per session if the game does not start) and a boot error reporter. Workbox / vite-plugin-pwa are deliberately NOT used. Test with `npm run build` then serve `dist/` (not `vite dev`: `server.open` opens a browser).
- Hosting: Vercel. `vercel.json` gives `/sw.js` `Cache-Control: max-age=0, must-revalidate` and the manifest its content type. A TypeScript error fails the deploy. `base: './'` also works from any folder (itch.io, GitHub Pages, Netlify, Cloudflare Pages).
- Font: self-hosted Lilita One + Kablammo in `public/fonts/` (`FONT_LOADING` in `config/style.ts`, `core/fonts.ts`); no third-party hosts.
- Mustard barrels (`config/barrels.ts`, `systems/props/BarrelSystem.ts`, art `assets/art/barrel.ts`): random decorations, broken by the belt / blasts (not solid). The puddle they leave slows Varu (`Player.terrainSlow`) and walking cats (`Enemy.terrainSlow`, undone / applied in `Enemy.tick`). A cat flung while standing in a puddle slips (`Enemy.startSlip`, started by `BarrelSystem`, numbers in `BARREL.puddle.slip`). Words and particles come from `PropFx` through `PropKind` `'barrel'`.
- Living arena (`config/props.ts`, `systems/props/`): `PROP_TUNING.enabled: false` gives the old still arena. `ArenaMap` hides the `walls` layer (it only collides), draws fences on `walls_visual`, skips `decor`; if that fails `ArenaMap.props` is null and the old way is used. Props are destroyed via `PropSystem.destroyProp` (removes collision tiles, `SolidGrid.clearTile`, emits `arena:changed` so `GameScene` calls `FlowField.invalidate()`). `GameScene.pendingHides` counts cats still hiding so a wave cannot end early. Likeliest bug spots: tile removal not freeing collision, cats walking through a gap before the flow field rebuilds.
