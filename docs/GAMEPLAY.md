# GAMEPLAY and content reference

Read only the section you need. Numbers live in `src/config/`, text in `src/content/`.

## The belt
| Attack | Input | What it does |
|---|---|---|
| Swing | hold click / Space | 130 degree arc in front of Varu, quick |
| Spin | Shift / right click | Two full 360 degree turns (1.1s): Varu spins around with the belt, cats can be hit once per turn, wide reach (115), hits for 1.5, 2.2s cooldown, huge knockback, flings lots of milk. Good when surrounded |
| Throw | E | The belt flies where you aim, pierces cats, turns at max range (or the arena edge) and comes back. Hits on both legs. Swing and spin are locked while it is away |

All three hit each cat at most once per sweep (the throw once per leg), respect boss armor, and swat enemy projectiles (tennis balls are deflected back, everything else is destroyed).
A spin or throw pressed a moment too early is remembered (`BELT.inputBufferMs`) and fires as soon as it can.
Spin and throw have round cooldown badges in the bottom right (`ui/BeltBadges.ts`, look in `config/beltBadges.ts`): gold ring and bright icon = ready; while recharging a dark clock-sweep clears clockwise and the seconds left show; while the thrown belt is away the throw badge is grey with a dashed ring. When a badge becomes ready it pops, flashes, sends out a gold ring and drips milk (a milk cap slides over its top edge with random drip tongues, two drops fall off, then it drains away; numbers in `BELT_BADGES.milk`). The key (Shift / E) is a small pill under the badge on desktop, hidden on touch. Numbers: `BELT`, `BELT_SPIN`, `BELT_THROW` in `config/balance.ts`.
Swing look: the belt is drawn as a strap with a gold buckle that winds up, whips through and follows through (`core/ease.ts`, `BELT_FX` in `config/style.ts`). The strap bends back with the turn speed and the white streak is as long as the belt is fast. Hits ignore the easing (they only count the real arc), the belt in Varu's fist is hidden while it swings or flies.

Events (for audio later): `belt:swing`, `belt:spin`, `belt:throw`, `belt:caught`, `belt:cooldown`.
Adding another sweep attack = numbers in `balance.ts` + one more object in `systems/belt/attacks.ts`.

## The arena (Tiled map)
The arena is a real **Tiled** map: `public/assets/maps/arena.json`. 40px tiles, 32x18 tiles = exactly the 1280x720 game.

| Layer | What |
|---|---|
| `ground` | The floor (grass, dirt, rug...), visual only |
| `walls` | Solid tiles: wall, bush, rock, crate, cat bed, post. Varu and walking cats bump into them |
| `decor` | Flowers, pebbles, paw prints...: walk-over, visual only |
| `spawns` | Object layer with POINT objects. Set the **Type** to `player` (Varu's start), `enemy` (any number: cats appear at one of them, never right next to Varu) or `boss` |

- A tile blocks movement when it has the boolean property `collides` (Tiled: tileset editor > Custom Properties). If no tile has it, every tile on `walls` blocks.
- Flying cats ignore walls. Yarn balls, tennis balls and smoke rings are destroyed by walls. The thrown belt turns around at a wall. Pickups, crow landings and ninja teleports never end up inside a wall. Federer's dash stops before a wall.
- Walking cats turn away from a wall in their path (cheap steering, no pathfinding), so keep obstacles sparse and chunky: no long dead-end corridors.
- If `arena.json` is missing or broken, the game falls back to one grass field with no walls and cats walking in from the screen edges.

**Edit it:**
1. Run `pnpm dev`, click into the game and press **T**: it downloads `arena_tiles.png` (the placeholder tileset).
2. Put that PNG next to `arena.json` (or anywhere), open `arena.json` in Tiled. If Tiled asks for the tileset image, point it at the PNG. Paint, save as JSON.
3. Keep the tileset name `arena_tiles` (it must match `ARENA.tilesetName` in `src/config/arena.ts`) and the layer names.

**Real tileset art:** paint over the PNG (same 8x3 grid of 40px tiles, same tile order: see `TILES` in `src/config/arena.ts`), save it in `public/assets/` and add `[Tex.Tileset]: 'assets/arena_tiles.png'` to `src/assets/manifest.ts`.
**Layout (v2):** plank plaza + crossing paths, 4 corner bushes, a bed at each end of the long path, scratchers/crates on the diagonals, 2 rocks by the short path, hand-placed decor. Objects are turned 180 degrees around the center. The script fails if two objects are closer than 2 free tiles or a spawn is walled in.
**Regenerate the placeholder map:** `node scripts/generate-arena-map.mjs` (it checks that spawns are free and nothing is walled in). This overwrites `arena.json`.
Numbers (tile size, probe distance, spawn distance): `src/config/arena.ts`.

## Health meter (cat face)
Varu's health (`ui/CatMeter.ts`, numbers in `config/catMeter.ts`, top left) is a Siamese cat face (cream, dark brown ears and mask, blue eyes), a heart and a health bar with the number inside. The bar shows the health: green from 60% up, yellow from 30%, red below (pulses, the heart beats). A pale chunk shows the health just lost and drains after a moment. The face shows the mood: smiling from 60% up, worried from 30%, scared below (sweat drop, red pulse), X eyes at 0. It blinks, flashes white and shakes when Varu is hit, and pops when healed. Drawn in code like the other characters; real art can replace it later.

## Audio
All sound is generated in code (Web Audio), so there are no audio files yet. `systems/AudioSystem.ts` only LISTENS to the event bus: entities never play sounds.
- Sounds: swing, hit, miau, kill, hurt, pickup, bonk, caw, explosion, deflect, stun, bossIntro, waveStart, victory, gameOver. Each has a small generator in `systems/audio/sounds.ts`.
- "Miau" gets a random pitch (+/- 15%, `AUDIO.miauPitchVariance`) every time.
- Two quiet generated music loops: menu and fight (`TRACKS` in `config/audio.ts`).
- **N** mutes everything; the choice is saved. The browser only allows sound after the first click or key press, so the menu music starts then.
- Volumes, per-sound loudness, the minimum gap between repeats of one sound: `src/config/audio.ts`.

**Use real recordings** (for example friends saying "miau"): put the files in `public/assets/audio/` and list them in `src/assets/audioManifest.ts`. A sound with several files plays a random one each time. Music files go in `MUSIC_MANIFEST`. Anything without a file keeps its generated sound.

## Jokes and friend photos
`systems/JokeSystem.ts` listens to the event bus and says something funny by situation: low HP, kill streak, wave start, wave cleared, boss intro, boss phase 2, pickup, surviving a near-death, game over. Each category has its own cooldown and chance, and normal jokes keep a gap between them so it never spams (`src/config/jokes.ts`). Floating ones rise from Varu, the others show in a bar at the bottom.

**Put your own jokes in:**
- `src/content/jokes.ts`: lines per situation (`{n}` = streak length), `BOSS_INTRO_LINES` (per boss) and `PHOTO_CAPTIONS`. Everything marked `PLACEHOLDER` is waiting for the real nicknames and inside jokes.
- `src/content/bosses.ts`: boss names, shouts and the ENDING MESSAGE.
- `src/content/lines.ts`: hit words, Varu's lines, game over lines.

**Friend photos** show on the boss intro cards (queen, mafia, federer), the game over screen and the ending. Without a photo the slot shows a silhouette labeled "FOTO". To add one: put the file in `public/assets/photos/` and list it in `PHOTO_MANIFEST` in `src/assets/manifest.ts` (ids: `queen`, `mafia`, `federer`, `gameOver`, `ending`). Any aspect ratio works.

## The cats
| Cat | Behavior |
|---|---|
| Normal | Runs straight at Varu |
| Fat | Slow, 8 HP, barely knocked back |
| Ninja | Teleports behind Varu's back |
| Kamikaze | Lights a fuse up close, then explodes. Kill it first and it just pops |
| Flying | Circles at range, throws yarn balls (the belt can swat them) |

## The campaign
15 waves (`src/config/waves.ts`). Clearing wave 15 wins the game.
Bosses are in waves 7, 10 and 15. Beating a boss drops a heal and a random pickup.

| Boss | Wave | Attacks |
|---|---|---|
| Regina Pisicilor (Queen Cat) | 7 | Summons cats; charges along a red lane (dodge sideways) |
| Pisica Mafiotă (Mafia Cat) | 10 | Fans of smoke rings; ground slam inside a red circle; calls ninja bodyguards |
| Pisica Federer (final) | 15 | Tennis ball volleys; power serve on a ground marker; sideways dash + racket swing |

Federer's weak point: swing the belt at a tennis ball to DEFLECT it back. A returned ball stuns her (belt hits count double) and ignores her armor.
Phase 2 (below 50% HP): faster balls, bigger volleys, ball boys, shorter pauses.
Bosses have armor, so belt hits are weaker against them (see `BOSS.armor`).

## Pickups
They appear on a timer (max 3 on the field), and cats sometimes drop one. Crochete is more common when Varu is hurt.
| Pickup | Effect |
|---|---|
| Crochete | Heals 30 HP, and Varu takes a drag of his cigarette |
| Lapte | Speed x1.45 for 6s |
| Monster (energy can) | Belt damage x2 for 8s, Varu takes a drag of his cigarette, and he leaves a trail of small green "Z z z" letters (`ENERGY_TRAIL` in `config/animation.ts`) |
| Cureaua de aur | Damage x2.5 and reach x1.25 for 7s. The belt turns gold and gets coated in thick white sticky goo (expired milk): gold strap with goo blobs and stretching strands, gooier trail and drops, big long-lasting puddles, a gold flash and goo splat when he grabs it |
| Laser | A red dot follows your mouse for 6s and cats chase it instead of Varu (flying cats ignore it). On touch the right half of the screen turns into a red tap zone (`TOUCH.laser`): tap or drag there to place the dot; before the first tap it sits in front of Varu |
| Cioara amețită | Crow Rain for 5s: crows drop with a warning shadow and bonk cats. Never hurts Varu |

Crow variants: normal, golden (big damage), kamikaze (screams, big blast), and one that misses and just stands there.
Buffs don't stack multiplicatively: for each stat the best active value wins.

Visual only (numbers in `config/animation.ts`): `SMOKE_BREAK` / `SMOKE_BREAK_ON` (the cigarette drag: arm swings up through 3 body frames `Tex.Varu`, `VaruDrag1`, `VaruDrag2`, the tip glows, a cloud of smoke is blown out the way he faces, a line floats above him; add `'lapte'` to `SMOKE_BREAK_ON` to make milk do it too) and `GOLD_BELT` (the golden belt look, see above).

## Main menu
Poster look (`scenes/MenuScene.ts`, numbers in `config/menu.ts`, text in `MENU_TEXT` in `content/lines.ts`): bright grass with static light rays and a vignette (`ui/menuBackdrop.ts`), the logo (`ui/TitleLogo.ts`), Varu with cats creeping around him (`ui/MenuStage.ts`), a gold start button and, once the campaign is won, an Endless button (`ui/MenuButton.ts`). The bottom line shows the records and the key hints. Any key or click still starts; Enter or the Endless button starts endless mode. Keep the light rays static: a big rotating Graphics shape glitched the sprites above it.

## Pause, font, hit-stop, endless, touch, clock, phones
- **Pause menu**: Esc (or the II button on touch, or losing window focus). Continue, music and effects volume (saved), sound on/off, "Atac automat" on/off and "Date debug" on/off (phones only, both off by default, saved; `core/settings.ts`), restart, menu (restart and menu ask twice). Same poster style as the main menu: navy tint + light rays + vignette over the frozen game, logo-style title (`ui/logoWord.ts`), a double-bordered panel, gold selected row (red for Restart / Menu), and a little scene around it: two cats peeking over the panel, Varu on a smoke break with a line from `SMOKE_LINES`, a fat cat waiting (`ui/pause/PauseDecor.ts`, `SpeechBubble.ts`; cat lines in `PAUSE_CAT_LINES`). Files: `scenes/PauseScene.ts`, `ui/pause/PauseRow.ts`, `config/pause.ts`, `content/pause.ts`.
- **Font**: Lilita One from Google Fonts, Impact fallback (`config/style.ts`, `core/fonts.ts`).
- **Hit-stop**: short physics freeze on fat-cat kills, boss stun/defeat, Varu hurt (`config/hitstop.ts`, `systems/HitStop.ts`).
- **Endless mode**: unlocked by winning. Menu / victory screen: Enter or tap "Mod infinit". Starts at wave 16, +12% cats per wave, a boss every 5th wave (`ENDLESS` in `config/waves.ts`). Separate record.
- **Touch controls**: automatic on phones/tablets (add `?touch=1` to the address to test on a computer). Left thumb walks, right thumb fights (`config/touch.ts`, `input/touch/`, `ui/BeltBadges.ts`). There is no aim stick:
  - **Left thumb**: a floating move stick anywhere on the left half. It appears where the thumb lands, reaches full speed a bit before its ring, and slides along if the thumb drifts past the ring (`stickFollows`), so it never needs re-centering.
  - **Look + swing**: Varu looks the way he walks and swings only while the **attack button** is held. With the **"Atac automat"** switch in the pause menu on (off by default) `input/touch/AutoAim.ts` takes over: he turns to the nearest cat within `autoAim.range` and also swings by himself when the target is within reach (`BELT.range` x the golden belt's range + `swingMargin`). Enemy balls close to him are picked first (`projectileBias`), so tennis balls get swatted back without any aiming. He keeps his target until another is clearly nearer (`stickyGain`). With nothing near he looks where he walks. The laser dot is placed by tapping the red zone on the right half while the laser lasts (see Laser in the pickups table).
  - **Right thumb**: a big attack button (hold it to keep swinging; drawn by `input/touch/TouchOverlay.ts`, look in `TOUCH.attackIcon`), and two buttons, spin and throw. They are the cooldown badges (milk drips, clock sweep, dashed ring while the belt is away) drawn bigger at the spots in `TOUCH.buttons`, so what you tap is what shows the recharge. A tap squashes the badge, buzzes (Android) and is remembered a moment if the attack is not ready (`BELT.inputBufferMs`). The throw flies at the nearest cat.
  - **Top right**: pause button (two bars) with the speaker next to it. Reminders (a caption under the stick, the help line, the names under the buttons) show for `TOUCH.hintMs` and fade; the stick caption goes away for good once the stick is used.
  - Phone-sized extras: pause menu rows and volume blocks are bigger (`PAUSE.touch`), end-screen "Meniu" / "Mod infinit" have roomy tap areas (`padHitArea`), the toast sits higher so it never covers a thumb (`TOAST.bottomTouch`), the endless button on the menu is taller (`MENU.endless.touchH`).
- **Date debug** (phones, pause-menu switch): a small card top left with fps, frame time, slow frames, walking stalls (frames where Varu did not move while walking) and step size, cats / balls, renderer, canvas size, pixel ratio, fullscreen. Measured by `systems/PerfMonitor.ts` in `GameScene`, sent as `Events.PerfStats` every `PERF.everyMs`, drawn by `ui/PerfPanel.ts`. Numbers in `config/perf.ts`.
- **Smooth movement**: arcade physics runs with `fixedStep: false` and the game loop with `fps.smoothStep: false` (`main.ts`) so movement follows the real, raw frame time (fixed 60 Hz steps and Phaser's averaged delta looked choppy on 90/120 Hz phones), the camera does not snap to whole pixels (`CAMERA.roundPixels`, false: it made steps uneven on scaled-up phone screens; if hairline seams show between tiles set it to true), and the camera's `lerp` is converted to the real frame time every frame (`CAMERA` in `config/arena.ts`, applied in `GameScene.update`). If the "Date debug" card still shows many blocked walking frames, look here first.
- **Game clock** (`core/clock.ts`): every timer in the game (wave delays, buffs, cooldowns, boss attacks, pickups) runs on `gameClock.now`, not on Phaser's `scene.time.now`, so **nothing keeps counting while the pause menu is open**. `GameScene.update` feeds it once per frame. Use `gameClock.now` for any new deadline.
- **Phones**: the first tap on the menu goes fullscreen (the game starts when the finger lifts, because browsers refuse fullscreen on the touch-down; if refused, the first finished tap in the game tries once more) (and tries to lock landscape, and asks the browser to keep the screen awake: `core/fullscreen.ts`); `index.html` stops pull-to-refresh, tap flashes and the long-press menu; turning the phone upright pauses the game and the page shows a "turn your phone" note (`index.html`, `config/pause.ts`). The game over and victory screens have tap buttons for "again" and "menu".
- **Never compiled or played with the real Phaser.** A loose type check against a Phaser stand-in passes, which catches our own mistakes but not wrong Phaser API use.
