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
