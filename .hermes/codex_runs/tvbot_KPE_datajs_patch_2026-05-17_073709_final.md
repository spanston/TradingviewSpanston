Implemented Phase 0 in the requested scope.

Changed:
- [src/core/data.js](C:/Users/Johan/Desktop/HEWAI%20BOT/tv-bot/src/core/data.js:11)
- [src/tools/data.js](C:/Users/Johan/Desktop/HEWAI%20BOT/tv-bot/src/tools/data.js:82)

What changed:
- Hardened Pine graphics extraction to prefer `getAllStudies()` / `getStudyById()`, while retaining `dataSources()` fallback.
- Added study unwrap and graphics fallback: `_study || study`, `_graphics`, `_source._graphics`, and original-object checks.
- Made `study_filter` case-insensitive across name/title/id plus `meta.description` and `meta.shortDescription`.
- Added table extraction fallback through `pc.ownFirstValue()` and normalized cells into `{ tid, row, col, t }` for existing `getPineTables()`.
- Kept existing output shape for Pine lines/labels/tables/boxes.
- Added `data_diagnose_pine_graphics`, returning compact per-study diagnostics: id/name/visible/match_basis/graphics_path/primitive_keys/counts/errors.

Verification passed:
- `node --check src/core/data.js`
- `node --check src/tools/data.js`
- `node -e "import('./src/core/data.js').then(m => console.log(Boolean(m.getPineGraphicsDiagnostics), Boolean(m.getPineTables)))"` returned `true true`

Caveat: I did not run live TradingView/KPE extraction in this turn. The MCP server/Hermes operator will need a restart or reload before the new `data_diagnose_pine_graphics` tool is available to clients.