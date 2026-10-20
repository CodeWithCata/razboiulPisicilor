@AGENTS.md

## Claude Code / Claude Desktop workflow
- Start with `docs/CODEMAP.md` (every file, its purpose and exports), then open only the files you change.
- After editing run `npm run check` (typecheck + CODEMAP up to date + layering). For build, config or asset changes also run `npm run build`.
- Added, renamed or removed a file or export, or changed a `@file` line? Run `npm run codemap`.
- Never claim gameplay works: the game has never been played in a browser.
