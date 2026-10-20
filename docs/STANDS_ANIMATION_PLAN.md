# Plan: animate the stand spectators

Written after v86 (stands redesign, outfits, cheering faces). Status (v89): Phases 1, 2 and 3 (cheer frames) are written, NOT tested in a browser. Phase 4 polish is only partly done (confetti, VIP lean; no shadow, no flag layer). The owner tests.

## Owner's answers
1. Crowd gets louder as the waves go on, but only a little (not yet strongly). Keep it a gentle slope in `config/crowd.ts`.
2. Crowd sounds: not yet. Do not add any audio in this task.
3. Low-HP reaction: not answered, so the crowd stays cheerful (no gasp on low HP). Add a `gasp` mood only if the owner asks.

## Where things stand
- `src/world/Stands.ts` builds the stands once. Fans are `scene.add.image` sprites made in `fanSpots()`, sorted by texture key so the renderer swaps textures rarely. Nothing keeps a reference to them.
- About 525 fans, 15 looks (`FANS` in `src/config/stands.ts`: fur + outfit + eyes). One 96x96 texture per look, drawn by `drawCatFan` in `src/assets/art/cats.ts`.
- Fans face the field (`FACING`), scale 0.3, depth about -10.8 (under the actors). Boxes and booths seat only `vip` (Roman) looks.

## Rules (from AGENTS.md)
- Read `AGENTS.md` and `docs/CODEMAP.md` first. No new image or audio files, everything is drawn in code. Numbers in `config/`.
- Gameplay emits events on the bus, visuals listen; unsubscribe on scene `SHUTDOWN`. Scenes restart: nothing may leak.
- Deadlines use `gameClock.now`, never `scene.time.now`.
- After editing: `npm run codemap`, `npm run check`, `npm run build`, a `docs/HISTORY.md` entry. Never claim gameplay works, the owner tests.
- Deliver a zip without `node_modules` and `dist`, then `present_files`.

## Phase 0: read first
- `config/animation.ts` (procedural sway / squash, has an `enabled` switch) and `core/ease.ts` (`sampleKeys`): copy its style.
- `core/events.ts`: which events exist (`WaveStarted`, `WaveCleared`, `CatSurrender`, `PropDestroyed`, ...).
- `config/perf.ts`, `ui/PerfPanel.ts`: the phone performance budget.
- `systems/SlowMoSystem.ts`: keep the crowd on real time (not slowed).

## Phase 1: idle life (no new textures)
- New `world/StandsCrowd.ts` and `config/crowd.ts`. `buildStands` returns the fans as `{ sprite, side, tier, ringPos, phase, baseScale, baseRot }`; `ArenaMap` keeps the crowd; `GameScene` calls `crowd.update(dt)` once per frame. No per-fan tweens.
- The view is top-down, so no real jumping: a "hop" is a scale pulse (about 1.0 to 1.12) plus a small tilt.
- Phase per fan comes from a hash of its position, so the crowd is never in sync. Idle = slow sway + gentle breathing.
- Only update fans inside `camera.worldView` plus a margin; the rest freeze.
- Switches: `CROWD.enabled`, `CROWD.maxAnimated`, a lower setting on touch.
- Done when: the crowd looks alive, not like one synchronized wave, and phone fps does not drop.

## Phase 2: moods (event driven)
| Mood | Trigger | Motion |
|---|---|---|
| calm | default | slow sway |
| cheer | wave start, kill streaks, last cat | bigger, faster pulses |
| roar | wave cleared, victory | full pulses, confetti on the terraces |
| gloom | game over | slumped, slow |
| (gasp) | low HP / boss attack | only if the owner wants it (question 3) |

- Moods ease in and out, never snap.
- Intensity grows slightly with the wave number (owner answer 1): a small gain per wave in `config/crowd.ts`, capped low.
- "La Ola" after a wave is cleared: each fan has a `ringPos` (distance around the whole ring), so one pulse sweeps round the stands.
- One-off reactions: a cat surrenders, a boss enters.
- Debug key in `DebugPanel` to force each mood (add it to the dev-keys list in `AGENTS.md`).

## Phase 3: cheer frame (needs art)
- Draw a second frame per look in `drawCatFan` (paws up, mouth wide). Bake all frames into ONE atlas texture so batching stays cheap. Do not make 30 loose textures.
- Swap to the cheer frame during cheer / roar.
- Flag looks: a separate flag layer pivoting at the paw so the flag waves. Small secondary motion on crests, plumes and laurel wreaths.

## Phase 4: polish
- Soft shadow that grows and shrinks with the pulse. Confetti and sparkle bursts on roar. Box / booth VIP behavior (a cat leaning on the railing).
- Crowd sounds are NOT in scope yet (owner answer 2).

## Watch out for
- Keep the sprites sorted by texture (or use the atlas) so texture swaps stay low.
- The day-night sheet (depth 30) and the fog must still sit over the crowd; fans stay under the actors.
- The stands have only been previewed in a headless canvas mock, never in a real browser or phone. Check the draw order and fps first.
