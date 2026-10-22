# PERFORMANCE: hot paths and rules (read before touching per-frame code)

Per-frame code = anything called from `GameScene.update` (`scenes/GameScene.ts`). Rule of thumb: no new arrays, objects, closures or `Math.hypot` inside it.

## Rules
1. Distances: `hyp(dx, dy)` from `core/hyp.ts`, not `Math.hypot` (several times slower in V8). Exception: files that run under plain `node --experimental-strip-types` (`core/steering.ts`, `core/sweep.ts`, `core/reach.ts`, `world/spawns.ts`) cannot import it (no extension resolution), so they keep `Math.hypot`. Squared distances (compare to `r * r`) beat both when the real distance is not needed.
2. Looping a Phaser group that can change during the loop (cats spawn / die, shots break): `snapshotInto(group.getChildren(), this.scratch)` from `core/snapshot.ts`, then `scratch.length = 0` after the loop. Never `getChildren().slice()` per frame. A loop that cannot change the group iterates `getChildren()` directly.
3. Counting or searching a group: a plain `for` loop, not `.filter(...).length` / `.map(...)` (those allocate). Fine when it runs once per event, not once per frame.
4. Reuse state objects (`Vector2`, the crowd's `look`) as fields; pass `out` parameters instead of returning fresh objects.
5. Skip work that has nothing to do: see `Fog.clearApplied` (no per-cat loop in clear weather), `StandsCrowd.animate` (only fans in view), `PropSystem.onScreen`.
6. Deadlines on `gameClock.now`; effects on emitters (`emitter.explode`), not a new `Graphics` per effect, when it fires often.

## Done in v184 (nothing run: no npm, no browser; syntax checked, owner tests)
- `Math.hypot` -> `hyp` in all per-frame code (entities, systems, world, input, ui).
- `GameScene.update`, `ProjectileSystem.update`, `PickupSystem.update`: no more `slice()` copy per frame (`snapshotInto`).
- `Fog.update`: the per-cat loop is skipped while the fog is gone.
- `StandsCrowd.animate`: one reused `look` object instead of a new one every frame.
- `PickupSystem.hasRoom`: counting loop instead of `filter`.
Behaviour and look are unchanged on purpose.

## Done in v185 (same rules: nothing run, owner tests; look and feel unchanged on purpose)
- `Effects.floatText` reuses a pool of Text objects (`textPool`, max 16) instead of creating and destroying one per word (a new Text = new canvas + GPU texture = frame stutter). Any other word that pops often (`PropFx` zzz) could use the same idea.
- `FlowField.nextPoint` returns a cached shared point per tile (read only, never change it): no allocation per blocked cat per frame.
- `StandsCrowd.adapt` + `PERF.adapt` (`config/perf.ts`): if the average frame stays slow, fewer fans animate (the rest rest, like the existing `touchMaxAnimated` limit); back to full when smooth. A phone at 50+ fps never sees it. Fed every 0.5 s from `GameScene` (`perf.take()`).
- Checked and left alone on purpose: cat AI already throttles its sight checks (`ARENA_RULES.sightCheckMs`) and the wall probe is 2 cheap grid lookups, so thinking every 2nd frame would only risk the feel; Phaser `Scale.EXPAND` already renders at CSS-pixel size (no devicePixelRatio multiplication), so a lower render resolution gives nothing.

## Ideas not done (need a browser to measure, or risk the look)
- Graphics redrawn every frame (milk trail in `Player`, `Rain` streaks, surrender flag): drawing once and moving would be cheaper, but it changes how they are built: measure first.
- Vite: split Phaser into its own chunk for caching (Vite 8 / Rolldown chunk option names changed, test with `npm run build` first).
- Phaser `render.powerPreference: 'high-performance'` (not added: could not check the Phaser 4 typings without `npm ci`).

## Done in v194 (nothing run in a browser: owner tests; look unchanged on purpose except where noted)
- Touch overlay: stick, knob, attack and pause pictures baked once per state (`input/touch/touchPictures.ts`); a frame moves them and switches the picture of the new state. The attack arm is baked at 1:1 (128 px) and scaled (the one exception to "no scaling"; it may look slightly soft). Laser zone: three pictures, remade when the screen size changes.
- Fog: the haze and the edge image are hidden while the fog is gone (not drawn at alpha 0). Rain: the sheet and the streaks are hidden while the rain is gone.
- Rain: 110 `lineBetween` per frame replaced by pooled images, one baked streak picture per length (14..30 px); a frame only moves them and sets their alpha.
- Day-night: `mixColor` is a plain function (no closure per frame); the sheet is only re-set when its color or alpha changes; a sheet at alpha 0 is hidden. Not changed: wave 1 keeps its alpha 0.06 (setting `sky[0].alpha` to 0 would hide it, but changes the look).
- Blackout: one baked soft-light mask (`lights_out_mask`, made once per game) stamped with `drawImage` per light instead of a new radial gradient per light per frame. The canvas upload every frame stays (the holes move).
- Milk trail: `entities/MilkTrail.ts`. Path points and splotches live in fixed typed arrays (`MILK_TRAIL.maxPoints` / `maxBlobs`; when full the oldest goes); the ribbon's edge points are in a scratch array; no object, tuple or closure is made per frame.
- Perf card: shows the canvas backing size (`canvas.width` x `canvas.height`) and whether the WebGL context has antialias on.
Still open: Vite chunk split, `powerPreference`, the surrender flag Graphics.

## v195: first-draw hitch fix (written WITHOUT a browser: the owner reported a freeze at wave starts after v194)
- Cause (likely, not measured): a picture is uploaded to the GPU the first time it is drawn. v194 kept the fog's edge image and the laser zone hidden until they were needed, so the big upload landed mid-wave (fog starts in about 30% of waves).
- Fix: `PERF.warm` (`config/perf.ts`): both pictures are drawn at alpha 0.001 (invisible) for 2 frames when the run starts. Rule: a big picture that is first shown later must be warmed the same way.

## v196: per-frame allocations removed (written WITHOUT npm, tsc with Phaser types, vite or a browser: run `npm run check` and `npm run build`, then play)
- Belt and event handlers (`SweepAttack`, `ThrownBelt`, `PropSystem`, `BarrelSystem`, `FanThrowSystem`): `getChildren().slice()` / `props.slice()` / `lying.slice()` per frame replaced by `snapshotInto` with one scratch list per loop. Each loop clears its scratch after it runs. Behaviour is the same: a loop still works on a copy, so cats, props or petards removed mid-loop do not skip the next one.
- `PropSystem.onProjectileSmash`: the `filter` + `sort` with closures per smash frame is now a reused list and an insertion sort (stable, nearest first, same order).
- `BarrelSystem.breakByCats`: the barrel copy was made once per cat per frame; now it reuses a list.
- `BallMachines`: no spread `{...f}` per launcher (one reused frame, filled with `Object.assign`), no `forEach`/`some`/`map`/`filter`/`sort` closures, no arrays built in `glide` or `leftIdsTopFirst` (scratch lists, insertion sort that starts from index order so ties keep their order). `BallMachine.trackBarrel` no longer rebuilds the lane-fan width every frame (`widestRad`, set once).
- `PoseTween.update` (`core/poseTween.ts`, no import so it still runs under plain node) and `advanceMoves` in `EmoRig`, `FedererRig`, `QueenRig`: reused copy of the move list instead of `[...this.moves]`.
- `place` closures created every frame removed: `FedererRig`, `QueenRig`, `TennisCatRig` call a module-level `placeLayer(...)`; `FlyingCatRig` calls a private `placeWing(...)`; `Player.preUpdate` moves its two legs inline (`x - fx * s` is exactly `x + fx * -s`, so the picture is the same).
- `BedCageSystem.update`: the ready-bed list is a reused list (no `filter` per frame).
- `SurrenderSystem.update`: while the wave's one roll is still pending (it runs every frame) the alive-cat list is a reused list and the boss / teleport check is a loop, not `some`. The roll is in `giveUp`. `force()` (dev) still uses `aliveCats()`.
- Not changed on purpose: the `BeltSweep` / `BeltFlight` / `ProjectileSmash` payload objects (a listener could keep a reference: check first), `explode` and `flash` slices (once per event, not per frame), the texture atlas and culling (still open: they need a browser to measure).

## v197: item 4 (HUD redraws) and item 5 (MSAA setting). Written WITHOUT npm, a browser or a Phaser typecheck: run `npm run check` and `npm run build`, then play.
- `ui/BossBar.ts`: the `rect` closure built on every draw is now a module function `pill`. `draw()` skips the repaint when fill, ghost, hit flash and phase 2 are unchanged (in phase 2 the pulse repaints every frame). `show()` forces one paint.
- `ui/CatMeter.ts`: `update` repaints only when fill, ghost, mood, the blink state, or the hit / heal timers changed. A scared face and a face still being hit or healed always repaint (their pulse, heartbeat and shake follow the clock or decay every frame).
- `ui/CatBubble.ts`: the trailing dots are a fixed array rewritten in place (was a new `map` on every shift change). The cloud's half sizes (were `reduce` closures on every `place` call) are measured once after the bumps are built.
- Antialias: `PERF.render` is now `{ antialiasGL }` (the WebGL context setting; it was `antialias`, which is the texture filter). `main.ts` passes `render: { antialiasGL: PERF.render.antialiasGL }`. Default `true` = unchanged look. `ui/PerfPanel.ts` reads `getContextAttributes().antialias`, which is the value the context really got, so the panel shows whether the setting took effect.
- Not verified: that Phaser 4's GameConfig typing accepts `render.antialiasGL` (check on typecheck); that Phaser passes `antialiasGL` to the context attribute (the perf card shows it on a phone).

## Item 6 (v198): atlas and culling. Atlas DONE, fan culling DONE, actor culling still open
Counts from v196 source: `make()` calls in `assets/placeholders.ts`: 105 (each one a separate texture, via `assets/paint.ts`). `generateTexture` call sites in total: 7 (propTextures, paint, Stands x3, Rain, touchPictures); some run in loops, so the real texture count is higher. `add.image` call sites: 88 in total, 44 of them in `entities/`. Rigs (`EmoRig` 5, `FedererRig` 4, `QueenRig` 8, `TennisCatRig`, `FlyingCatRig`, `BomberCatRig`, `Player` 6) place each part image every frame with `placeLayer` / `setPosition`.

Atlas design: pack the code-drawn pictures once at boot into one or a few canvases per family (cats, bosses, pickups, fx, props), each page at most 2048 px (older phones cap texture size at 4096). Each `Tex` key becomes an atlas frame (`Texture.add`), `make()` keeps its "skip if a real image exists" check per frame name. Benefit: sprites that share a texture batch together, so fewer texture switches and draw calls. Measure before and after with the perf card and a WebGL frame capture; no number is claimed.

Culling design: the world is 2400 x 1440 px (60 x 36 tiles of 40 px, stands included); the view is about 1280 x 720 at zoom 1, so most of the world is off screen at any time. Two problems: (1) Phaser draws every display-list object unless hidden; I did not confirm from Phaser 4 source whether it skips off-screen images (no node_modules here). (2) Rig parts are separate Image objects positioned every frame, so culling an actor means hiding all its parts. Safe approach: one `culled` flag per actor, applied after the rig's own visibility (rigs set `visible` every frame, so a plain `setVisible` would be overwritten), with a margin around `cameras.main.worldView`. Do not put rig parts in containers: that changes the depth order between actors. Precedent: `CatBubble.setVisible` already hides a speaker's bubble off screen, and `StandsCrowd` already limits animation to `worldView`.

## v198: texture atlas + stands fan culling (written WITHOUT npm, a browser or a Phaser typecheck: run `npm run check`, `npm run build`, then play and compare fps)
Atlas (`assets/atlas.ts`, sizes and gap in `config/atlas.ts`):
- Every code-drawn picture is packed into a few shared canvas pages: the 104 `make()` pictures (`assets/placeholders.ts`), the prop pictures and cracks and the single tiles (`assets/propTextures.ts`), the stands windows and box fronts (`world/Stands.ts`), the fans (`world/Stands.ts`, the old fan atlas is now the same code), the rain streaks (`systems/Rain.ts`) and the touch buttons (`input/touch/touchPictures.ts`).
- A page is `ATLAS.pageSize` (1024) px square, pictures keep a `ATLAS.gutter` (2 px) gap, shelf packing with the tallest pictures first. Packing happens at the end of `generatePlaceholders` (boot) or on the first `texRef` / `texArgs` call that needs a queued picture. Each page is uploaded once per flush.
- Callers: `scene.add.image(x, y, ...texArgs(key))` (also `setTexture`, `tileSprite`, `sprite`), and for particle emitters `texRef(key).key` plus `frame: texRef(key).frame` in the config.
- Kept on their own texture on purpose: `Tex.Grass` and `Tex.FxCarpetTile` (a tileSprite repeats its texture, `makeRepeating`), the laser zone pictures (remade when the screen size changes, a page cannot drop a frame), real images loaded from the manifest (a real image under the key wins, `make()` skips it), and any picture bigger than a page (`atlas.ts` `flushPictures`). `texArgs` gives those their own key and no frame.
- Read back a sprite's picture with `sprite.frame.name`, NEVER `sprite.texture.key` (that is the page). Checked: `Player`, `PropFx`, `TouchOverlay` (it keeps its picture in the data slot `picture`, so a frame does not re-set the texture).
- Never test `scene.textures.exists(key)` for an atlas picture: use `hasPicture(scene, key)` (it also answers yes for a queued picture).
- Not measured: draw calls and texture switches. Expected: fewer texture binds per frame, since sprites that share a page batch together. Owner: count `drawElements` per frame with Spector.js (or the Chrome WebGL inspector) on a v197 build and a v198 build, same wave, same device. Count the pages in the console: `Object.keys(game.textures.list).filter(k => k.startsWith('atlas:'))`. Expected a few pages of 1024 px (about 4 MB each).

Culling (`world/StandsCrowd.ts` `cull()`, margin `CULL.standsMarginPx` in `config/culling.ts`):
- Every fan outside the camera view plus 160 px is hidden with `setVisible(false)`, one flag per fan (`StandsFan.culled`). It runs every frame after `animate` (also when the crowd is switched off). Nothing else sets a fan's `visible`, and nothing reads it for gameplay: a thrown fan is picked from all fans, and it simply flies in from off screen.
- NOT done, on purpose: actors (Varu, cats, bosses). Their rigs set each part's `visible` from the owner's `visible` (`placeLayer(..., o.visible)`), and gameplay reads that same flag (`EmoRig` drops, `FedererRig` trails, `Player` hide / back flip, `ball.visible`). So a culled flag on an actor needs a part-by-part list in every rig, applied after the rig's own placement. Each rig is one change, and each one needs a phone test. Left for the next version.
- The big stands pictures (the four bowl windows and the box fronts, `StandsPiece` in `world/Stands.ts`) are hidden too while their whole rectangle is outside the view plus the margin (same `cull()`, same flag idea: `StandsPiece.culled`).

## v200: batch breakers, crow in the atlas, far cats think less (typecheck, `npm run check` and `npm run build` pass; a headless Chromium boots the build to the menu with no JS errors; a run was NOT played: owner tests)
- `Pickup.glow` is now a tinted `Tex.FxRing` image (flat color via `TintModes.FILL`) instead of an `add.circle`. `systems/flatShapes.ts` (`flatDisc`, `flatHoop`) + new atlas pictures `Tex.FxDisc` / `Tex.FxHoop` do the same for the kamikaze scorch mark, the ninja puff and `telegraphCircle`. The backflip and explosion rings use `Tex.FxShock` tinted (like `QueenRig.pulse`). Look is close, not identical (ring strokes scale with the radius).
- NOT converted (same recipe, left for later): `telegraphLine` / `telegraphLineAimed` / `telegraphRect` (their outline stroke and the white `lock()` border need a 9-slice or edge images), and the pop rings / glows in `FanThrowSystem`, `BallLobSystem`, `BarrelSystem`, `FloorLamp`, `TennisCatRig`, `FedererRig`, `TearPuddles`, `CrowRainSystem`.
- `pickup_crow.png` is copied into an atlas page after load (`adoptLoadedImage`, list `ATLAS_IMAGES` in `assets/manifest.ts`); its own texture is dropped.
- `Enemy.tickThrottled` + `CULL.catsThink` (`config/culling.ts`): `NormalCat` and `FatCat` (`thinksRarely`) outside the camera view + 240 px tick every 3rd frame, skipped time added to the next step. Never skipped: flung, slipping, puddle-slowed, fading, surrendering, caged cats; bosses, ranged cats, kamikaze, ninja, lucky cat. `enabled: false` turns it off. `keepOutOfWalls` is left alone (it is the safety net).
- `Player`: one `scratchPoint` replaces `new Vector2()` in `exhale`, `goldenBeltFlourish`, `dropRust`; no array copy per rust flake.
- NOT done: enemy pooling (needs a safe `reset()` on every cat subclass) and pickup pooling (low churn).

## v201 (task 1 only): far NormalCat / FatCat are not drawn. NOT verified: no npm install worked (no network), so no real typecheck, build or run; owner tests
- `Actor.setCulled` hides the body and its shadow; `Actor.culled` reads it. It is a flag separate from `visible`. `Enemy.cullsDraw` (default false) opts a cat in; only `NormalCat` and `FatCat` do (no rig, nothing reads their `visible`).
- `Enemy.tickThrottled` now takes a second rectangle (`GameScene.catDrawView`, refilled each frame, no allocation) and calls `cullDraw` after the cat's step. `CULL.catsDraw` (`config/culling.ts`): `enabled`, `marginPx` 120 (kept below the 240 think margin, so a shown cat has always just ticked). A cat that comes back also gets `syncShadow` + `refreshAlpha` on the same frame (fog alpha included).
- Caged cats are skipped (`cage` hides, `release` shows; `cage` clears the cull flag first).
- Checked by loose `tsc` without Phaser types (same errors as v200) and `npm run codemap`. Not checked: Phaser typings, build, gameplay. Test: walk far from a crowd, come back, look for a cat or shadow that pops in late or at the wrong spot; compare `drawElements`.
- Not done: rigs (Flying, Tennis, Bomber, bosses), tasks 2 to 4.

## v201 (tasks 2 and 3; task 4 NOT done on purpose). Same state: no npm install worked here, so no real typecheck, build or run; owner tests
- Task 2, surrender flag: no more `Graphics` redrawn every frame. `assets/art/flag.ts` draws two atlas pictures once (`Tex.FlagPole`, `Tex.FlagCloth`). `Enemy.makeFlag` makes two images, `Enemy.placeFlag` only moves them: the pole turns about its base (sway), the cloth turns about the pole top (ripple). Look: same colors, sizes, sway and ripple numbers (`SURRENDER.flag`); the cloth now tilts as one rigid piece (at most about 7 degrees) instead of a sheared quad.
- Task 3, rust flakes and broken hearts: `entities/PlayerDrops.ts` has two emitters (`explode(1, x, y)` per drop) instead of an image and 4 to 5 tweens per drop. Numbers from `RUST_FX` / `EMO_FX`. Differences: each particle uses the MIDDLE of the size, fall, rise and spin ranges (an emitter cannot link distance to each particle's own life); spin is always one direction; pop and fade use named eases (Expo.easeOut, Quart.easeIn, Sine.easeIn) that are close to the old tweens, not identical. Life, tint, start angle and drift direction still vary.
- Not verified: Phaser 4 typings for `speedX`, `scaleX` / `scaleY`, `rotate`, `angle`, `ease` strings in the emitter configs (run `npm run check`); that the look matches; gameplay.
- Task 4 (telegraph lines / rects, pop rings and glows): not started, by the owner's choice.

## v201 (task 4, easy part only: circles to atlas images). Same state: no npm install worked here, so no real typecheck, build or run; owner tests
- Converted `add.circle` / `add.ellipse` to tinted atlas images (`flatDisc` / `flatHoop`, `systems/flatShapes.ts`; new helpers `hoopScale(r)` / `discScale(r)` = the image's scale when its edge is r px out): `FanThrowSystem` (landing ring, gift pop, petard ring incl. its red turn), `BallLobSystem` (ring, pop), `BarrelSystem` (curse glow, curse cloud), `FloorLamp` (bulb flash, dust, the glass is a disc stretched to the lens ellipse), `TennisCatRig` + `FedererRig` (hit pop), `FedererRig` (aura, head trail puff), `TearPuddles` (flood ripple, puddle ripple: a hoop squashed to the flat ellipse, scaleX / scaleY tweened separately), `CrowRainSystem` (landing ring).
- Rings that used to scale from 1 now scale from `hoopScale(radius)` (the code that set `ring.setScale(k)` sets `k * base`). Their per-frame alpha now includes the old stroke alpha (the image has one alpha, the old circle had a stroke alpha times the frame alpha), and the red turn is `setTint` instead of `setFillStyle`.
- Look: close, not identical. The hoop's stroke is about 5 px at a 126 px radius and scales with the ring (the old strokes were fixed widths, so small rings and the start of a pop are thinner now); its faint fill is about 0.11 of the ring alpha instead of the old fixed fill alphas (0.07 to 0.22).
- NOT done: `telegraphLine` / `telegraphLineAimed` / `telegraphRect`, and the circles in `QueenRig` / `EmoRig` (not on the list). Not verified: the look, gameplay.

## v202 (tasks A, B and C). Same state: no npm, no network, no Phaser typings, no browser. Owner tests
Task A, review of v201 by reading:
- `entities/PlayerDrops.ts`: the emitter configs used option names that no working emitter in the repo uses (`speedX`, `scaleX` / `scaleY`, `rotate: {start,end}`, `ease` strings). Replaced with names other files already use: `lifespan`, `speed` + `angle {0..360}` (a slow push in a random direction), `gravityY`, `scale {start,end}`, `rotate {min,max}`, `alpha {start,end}`, `tint`. The heart's tilt used `angle`, which in an emitter is the push direction, not the picture's turn: it is now `rotate {min,max}`. Removed the unused `CHIP_H` (would fail `noUnusedLocals`).
- Look changes from that: the rust flake no longer tumbles (one random turn), pop-in and fade are linear (no eases), drift has a few px of vertical jitter.
- Read and found nothing wrong: `Actor.setCulled`, `Enemy.cullDraw` / `tickThrottled` / `cage` / `release`, `GameScene` views, the flag art + `makeFlag` / `placeFlag`, and every ring / glow converted to `flatDisc` / `flatHoop` (no leftover `Arc` types, no `setFillStyle` on an image, every scale tween uses the new base).

Task B, draw culling of the rig cats (`CULL.catsDraw.rigs`, default true; false = these three always drawn):
- `Enemy.onCullChange(out)` (protected, default empty) runs after `cullDraw` shows / hides the body (after the shadow and alpha refresh) and from `cage`. Reason: rigs copy `visible` in `preUpdate`, which runs BEFORE `GameScene.update` culls, so without the hook the parts come back one frame late, and a cat caged while culled would keep its parts hidden.
- `FlyingCat` (wings), `TennisCat` (arm, racket, ball), `BomberCat` (arm) opt in with `cullsDraw` = `CULL.catsDraw.rigs`. Each rig has `setCulled` and a `culledOff` flag of its own; placement still runs every frame (so the racket head and the bomber's `paw` stay right) and only the visibility is `o.visible && !culledOff`. `setCulled` sets visibility and alpha at once.
- `BomberCat.held` (the petard in her hand) is NOT culled: its `visible` means "she is holding it" and `preUpdate` reads it.
- Boss rigs (`EmoRig`, `FedererRig`, `QueenRig`) NOT culled, on purpose: their `visible` is read for drops, trails and telegraphs, one boss at a time, near Varu: little gain, real risk.

Task C, ground warnings and the Queen's circles (built after the first v202 zip; same state, nothing compiled or played):
- New atlas picture `Tex.FxBar`: an 8 x 8 solid white block (`FX_BAR_PX`), drawn in `placeholders.ts` with `queueDrawn` and its edge pixels repeated 1 px into the atlas gap. Reason: the gap is transparent and the filter is linear, so a stretched frame would fade at its edge. The 2 px gap is shared with the left / upper neighbour, and the 1 px written is one that neighbour never samples. `flatBar(scene, x, y, w, h, color, alpha)` in `systems/flatShapes.ts` makes a tinted block (resize with `setDisplaySize`).
- `systems/Telegraph.ts`: `telegraphLine` and `telegraphLineAimed` share a private class `Lane`: a faint body, four edge bars (3 px, centred on the edge like the old stroke; the long ones start and end half a stroke out so the corners are filled) and the fill. Order is body, bars, fill (like the old rectangles). `aim` and `setLength` place everything with cos / sin, no allocation; `lock()` makes the bars 5 px, white, alpha 1. The fill is driven by an `addCounter` tween (it sets the fill length from the current lane length, so `setLength` still works while it fills); it starts at 0.02 like before. A destroyed lane ignores later `aim` / `lock` calls.
- `telegraphRect`: body, four edge bars (4 px, alpha 0.9), and (with `fillIt`) a fill that grows from the middle across the thin side from 0.05. `fillIt = false` (the safe carpet band) shows only body (alpha 0.14) and bars for `durationMs`.
- `QueenRig`: `glowCrown`, `glowScepter` and `aura` are `flatDisc` images (type `Image`, tinted with `setTint` + `setAlpha` each frame instead of `setFillStyle`), like `FedererRig`'s aura.
- NOT converted: the `EmoRig` puffs (navy outline + flash colour: they would need two discs each) and the `add.rectangle` / `setStrokeStyle` shapes left elsewhere (`CarpetRoll`, the Federer towel, `FloorLamp` stroke, UI and menu shapes).
- Not verified: Phaser typings (`addCounter` result `.remove()` has no precedent in the repo; the `onUpdate` parameter type is inferred), the look of the lane corners and of a rotated lane, `lock()` against the old white border, the carpet band, the Queen's glows. Test: every boss attack with a lane (Queen charge, Queen scepter throw, Federer dash, ball machine lane, carpet safe band), watch the lock turn white, a lane shortened by a wall, a lane cancelled by a stun, Queen glows in phase 2 and the Federer aura.

What was run: a loose `tsc` (no Phaser types, `types: []`) on the original v201 and on this build, error lists compared with line numbers stripped: identical (no new error; it cannot catch Phaser type mismatches); `node scripts/gen-codemap.mjs` and `--check`.
What was NOT run: `npm ci`, `npm run check`, `npm run build`, `npm run balance`, any browser, any play.
Test: far cats of every kind going off screen and coming back (wings, racket, arm, shadow, fog alpha on the same frame); a flying cat caged and released; rust flakes and broken hearts (look, direction); everything listed under v201.
Measure: Spector.js `drawElements` per frame for v199, v200, v201 and v202, same wave, same device, plus the in-game perf card.
