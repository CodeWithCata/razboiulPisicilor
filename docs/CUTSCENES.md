# Cutscenes (made in the game, in code)

A cutscene is a **script of steps written as data** in `src/content/cutscenes.ts`. The game itself is held still
while it plays: GameScene runs only the director, the game clock does not move, cats and projectiles are frozen,
and Varu walks with his real walk on a scripted input. The campaign opens with the story scene (`story`: Varu's dream, a cat, "I have to beat this game to get home"); endless and custom runs keep the short `introArena`; the boss entrances and last words are still simple placeholders: change or delete them freely.

## How it fits together
| Piece | File | Job |
|---|---|---|
| Numbers (bars, box, typewriter, skip, camera) | `config/cutscene.ts` | `CUTSCENE.enabled = false` switches every scene off |
| Step types, triggers, pure runner | `core/cutscene.ts` | seq / par / skip = fast-forward to the end state |
| Voices, scripts, triggers, texts | `content/cutscenes.ts` | `SPEAKERS`, `CUTSCENES`, `CUTSCENE_TRIGGERS` |
| Director | `systems/cutscene/CutsceneSystem.ts` | plays, queues, skips, starts from run events |
| What each step does | `systems/cutscene/steps.ts` | one handle per step kind |
| Camera + actors | `systems/cutscene/CutsceneStage.ts` | focus camera, props, "who is varu / boss" |
| Named code hooks | `systems/cutscene/hooks.ts` | for what a step cannot do (`call` step) |
| Varu's scripted input | `input/ScriptedInput.ts` | an `InputSource`, so his animation is the real one |
| Overlay | `scenes/CutsceneScene.ts`, `ui/cutscene/*` | bars, dialogue box, hold-to-skip ring (talks via the bus) |

## Controls
Tap / click / Space / Enter: finish the typing, then next line. **Hold** (0.9 s): skip the whole scene (the ring fills).
A visible **Sari peste** button (top right) skips with one tap or click. Esc still pauses. A skipped scene ends in exactly the state it would have had (every step jumps to its end).

## Steps
`wait`, `say`, `camera`, `move`, `walk`, `face`, `emote`, `show`, `hide`, `text`, `shake`, `flash`, `fade`, `music`, `sfx`, `call`, and `seq` / `par` to group.
Actors are `'varu'`, `'boss'`, or the id of a prop a `show` step put on stage. A spot is `{ x, y }` or `{ at: 'boss', dx, dy }`.
Add a step: a type in `core/cutscene.ts` + a case in `systems/cutscene/steps.ts`.

## Example (NOT in the game: copy into `CUTSCENES` when you want one)
```ts
queenIntro: {
  steps: [
    { do: 'music', track: null },
    { do: 'par', steps: [
      { do: 'camera', to: { at: 'boss' }, zoom: 1.4, ms: 1000 },
      { do: 'walk', to: { at: 'boss', dy: 220 } },
    ] },
    { do: 'say', who: 'queen', text: 'Ai îndrăznit să intri în regatul meu?' },
    { do: 'emote', actor: 'boss', kind: 'pop' },
    { do: 'say', who: 'varu', text: 'Doar am venit după mingea mea.', auto: true },
    { do: 'shake' },
  ],
},
```
And in `CUTSCENE_TRIGGERS`: `{ when: { on: 'bossSpawned', boss: 'queen' }, play: 'queenIntro', repeat: 'run' }`.

Triggers: `runStart`, `waveStart`/`waveCleared` (+ `wave`), `upgradePicked` (a belt upgrade was picked), `bossSpawned`/`bossDefeated` (+ optional `boss`), `victory`
(plays BEFORE the victory screen), `bossLastWords` (+ optional `boss`: the killing blow landed, the boss stands on 1 HP and talks; when the scene ends or is skipped it falls). `repeat`: `'always'` (default), `'run'`, `'save'` (once per device). `mode`: campaign / endless.

## Rules for writing scenes
- Walk Varu with `walk` (it stops after `maxMs` and just places him, so a scene never hangs on a wall); glide cats with `move`.
- Keep the field clear: shots are cleared at the start, cats are frozen where they stand.
- Every step must have a sensible END state: skipping jumps there.
- Words go in the `say` steps (Romanian). Add a new talker to `SPEAKERS` (name, color, picture, voice pitch, optional fixed `side`). Speakers stand big on the top corners of the dialogue box and alternate left / right as the talker changes.
- The scene's camera returns to Varu by itself at the end.
