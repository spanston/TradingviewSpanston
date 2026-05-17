**Verdict**
STAND ASIDE was correct under the repo contract. The package is a correctly blocked fail-state package, not a successful HEW package that merely needs validator leniency.

The validator did not misuse the package. The package intentionally lacks KPE rows, native Elliott proof, `hew_structure_context`, and clean critic passes, so the 59 validation errors are expected final-gate failures. A package with `package_validity=fail`, `evidence_grade=failed`, `trade_permission=blocked`, and `confidence=very_low` should not pass final validation.

I could not re-run `npm run validate:hew` in this environment because the shell policy rejected that command, but the files and validator code match the reported failure mode.

**Evidence Reviewed**
Reviewed canon and package artifacts:

- `AGENTS.md`, `WORKFLOW.md`, `strategies/hew/manifest.json`
- `agents/harmonic-elliott-wave-analyst.md`, `agents/hew-independent-critic.md`
- `package.json`
- `analysis_journal/SOLUSDT_2026-05-17_hew/evidence.json`
- `journal.md`, `committee_brief.md`
- `raw/kpe_monthly.jsonl`, `raw/kpe_weekly.jsonl`, `raw/kpe_daily.jsonl`
- `raw/draw_list_before.json`, `raw/draw_list_after.json`, `raw/chart_state_final.json`
- `tradingview/konsili_pivot_exporter.pine`
- `scripts/validate_evidence.mjs`
- Adjacent tooling only for inspection: `C:/Users/Johan/Desktop/HEWAI BOT/tv-bot/src/core/data.js`, `src/core/stream.js`, `src/server.js`

Key facts:

- Repo contract says unreadable KPE rows are a pivot data-path failure and must not be promoted to clean evidence: [AGENTS.md](C:/Users/Johan/Desktop/KonsiliTradingview/AGENTS.md:122), [WORKFLOW.md](C:/Users/Johan/Desktop/KonsiliTradingview/WORKFLOW.md:90).
- Wave 3 1.764 is a hard floor unless rare exception is documented: [WORKFLOW.md](C:/Users/Johan/Desktop/KonsiliTradingview/WORKFLOW.md:48), [manifest](C:/Users/Johan/Desktop/KonsiliTradingview/strategies/hew/manifest.json:1122).
- SOL package records KPE `study_count=0` on M/W/D despite attached entity `TR8cKk`: [evidence.json](C:/Users/Johan/Desktop/KonsiliTradingview/analysis_journal/SOLUSDT_2026-05-17_hew/evidence.json:140), raw KPE files confirm same.
- Fallback Wave 3 ratio is `1.1118`, below 1.764: [evidence.json](C:/Users/Johan/Desktop/KonsiliTradingview/analysis_journal/SOLUSDT_2026-05-17_hew/evidence.json:247), [evidence.json](C:/Users/Johan/Desktop/KonsiliTradingview/analysis_journal/SOLUSDT_2026-05-17_hew/evidence.json:443).
- Final chart was clean: [chart_state_final.json](C:/Users/Johan/Desktop/KonsiliTradingview/analysis_journal/SOLUSDT_2026-05-17_hew/raw/chart_state_final.json:14).

**Root Cause Hypothesis Ranked 1-5**
1. MCP Pine graphics extraction implementation is stale/incomplete. Confidence: 55%.
   `src/core/data.js` reads `model().dataSources()`, filters on `meta.description || meta.shortDescription`, then only checks `s._graphics`. But `src/core/stream.js` uses the more robust path: `chart.getAllStudies()`, `chart.getStudyById()`, `study._study || study`, and `src._graphics || src._source._graphics`. Table extraction also differs: data path uses `dwgtablecells`, stream path uses `pc.ownFirstValue()`. This is the strongest code-level mismatch.

2. Chart visibility/render timing/operator state. Confidence: 20%.
   MCP instructions say Pine indicators must be visible. The final chart had KPE hidden, and the package says extraction mode had it visible, but the decisive diagnostic is live visibility at the exact read call plus a post-timeframe-change wait.

3. Pine script output/settings issue. Confidence: 10%.
   The KPE script does create both `table.new` and `label.new` with `KPE|v=2` rows. A bad input state like `showTable=false`, `showLabels=false`, or wrong profile could reduce output, but it should not zero both table and label reads on weekly/daily if visible and generating pivots.

4. TradingView internal API drift. Confidence: 10%.
   Possible if `dwglabels`, `dwgtablecells`, or primitive shapes changed globally. Needs a simple table/label test script to prove.

5. Study-filter/name mismatch. Confidence: 5%.
   The reported `USER;ea527...` link suggests custom-script identity may be leaking through `meta.description`, while display name is KPE. But the journal says reads also failed without `study_filter`, so filter mismatch alone does not explain it.

**Diagnostics To Run Next**
1. Live state preflight:
   - `layout_switch` or equivalent to `HEW layout`
   - `chart_get_state`
   - `chart_set_symbol` `BINANCE:SOLUSDT`
   - `chart_set_timeframe` `1M`
   - `chart_get_state`
   Expected: KPE listed, entity id visible/known. If layout missing, stop.

2. Inspect KPE inputs by entity:
   - `data_get_indicator({ entity_id: "TR8cKk" })`
   Expected: visible true during extraction; `Left bars=7`, `Right bars=7`, `Export rows=32`, `Show export table=true`, `Show pivot labels=true` for crypto. If false/wrong, fix inputs and retry.

3. Read KPE both targeted and untargeted:
   - `data_get_pine_tables({ study_filter: "Konsili Pivot Exporter" })`
   - `data_get_pine_labels({ study_filter: "Konsili Pivot Exporter", max_labels: 200, verbose: true })`
   - `data_get_pine_tables({})`
   - `data_get_pine_labels({ max_labels: 200, verbose: true })`
   Expected:
   - If targeted zero but untargeted shows KPE under `USER;...`, filter/name bug.
   - If all zero while screenshot shows table/labels, MCP primitive extraction bug.
   - If all zero and screenshot has no KPE table/labels, chart/operator/input issue.

4. Repeat after timeframe wait:
   - Switch `1W`, wait for chart ready, call `chart_get_state`, then table/label reads.
   - Switch `1D`, same.
   Expected: weekly/daily should produce KPE rows if extractor works.

5. Minimal Pine control test:
   - Use `pine_set_source` with a tiny indicator that always draws one `table.new` cell and one `label.new("KPE_TEST")`.
   - `pine_smart_compile`
   - `data_get_pine_tables({ study_filter: "<test name>" })`
   - `data_get_pine_labels({ study_filter: "<test name>", verbose: true })`
   Expected:
   - If test fails too: MCP/TradingView internals drift.
   - If test passes: KPE script/input/render issue.

6. Code-level diagnostic in adjacent MCP:
   Add temporary debug around `src/core/data.js` `buildGraphicsJS` to return studies seen: display name, meta description, shortDescription, id, has `_graphics`, has `_source._graphics`, primitive collection keys. Do not change Konsili canon for this.

**Minimal Fix Proposal**
Patch adjacent MCP only, not KonsiliTradingview canon.

Location: `C:/Users/Johan/Desktop/HEWAI BOT/tv-bot/src/core/data.js`.

Minimal logic:

- Replace or extend `buildGraphicsJS` to iterate `chart.getAllStudies()` and resolve each study with `chart.getStudyById(s.id)`.
- Filter case-insensitively against all names: `s.name`, `s.title`, `meta.description`, `meta.shortDescription`, and `s.id`.
- Resolve graphics as:
  `src = study._study || study`
  `g = src._graphics || (src._source && src._source._graphics) || study._graphics`
- For tables, try `pc.ownFirstValue()` first, then fall back to `pc.dwgtablecells.get("tableCells")`.
- For labels, normalize both known shapes:
  `text = lbl.text || lbl.t || ""`
  `price = lbl.points?.[0]?.price ?? lbl.y`
- Return diagnostic metadata when a study matches but has zero primitives, instead of collapsing everything to `study_count: 0`.

The code already has a better extraction pattern in `src/core/stream.js`; port that into `src/core/data.js`.

**Re-run Recommendation**
Yes, re-run SOLUSDT after KPE extraction is fixed.

The 1.112x Wave 3 failure is enough to reject the specific OHLCV fallback candidate, but not enough to permanently settle SOL. The package itself names a super-cycle alternate that can only be tested with verified KPE pivots. If restored KPE rows confirm the same macro anchors, STAND ASIDE remains. If KPE rows expose a structurally different valid pivot path with Wave 3 >= 1.764, the analysis changes.

**Concerns**
The current package is honest, but operationally awkward: it is a fail-state package that looks package-shaped, so final validation naturally explodes. That is fine for audit, but the workflow would benefit from a distinct “blocked diagnostic package” mode so operators stop treating validator failure as surprising.

Do not invent KPE rows. Do not draw Elliott proof from OHLCV-only pivots. Fix the MCP data path first, then rerun.

