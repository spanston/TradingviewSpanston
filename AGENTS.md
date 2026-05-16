# KonsiliTradingview Agent Instructions

This is the canonical project guide after system/developer instructions. Read this file before acting in this repo.

The job is simple: produce accurate, human-actionable TradingView analysis packages. Do not create impressive-looking analysis that skips evidence, uses the wrong drawing tools, or leaves Johan unable to decide.

## Source of truth

Use the smallest set of authorities:

1. `AGENTS.md` — routing, live-tool discipline, and global workflow.
2. `WORKFLOW.md` — stage-gated workflow and output standard.
3. `strategies/<strategy>/manifest.json` — executable evidence/drawing/action contract.
4. `agents/<strategy>-analyst.md` — compact specialist prompt.
5. `scripts/validate_evidence.mjs` — validator.

Do not re-create strategy contracts in ad-hoc prose. If a required field, drawing role, checklist item, screenshot role, or critic rule changes, update the strategy manifest first.

## Context budget and lane loading

Keep context lean. Start with `AGENTS.md`, route the request, then load only the files for the selected strategy lane.

- Wyckoff lane: load `WORKFLOW.md`, `strategies/wyckoff/manifest.json`, and `agents/wyckoff-macro-analyst.md`. Do not load HEW prompts, manifests, skills, old reports, or templates unless Johan explicitly asks for HEW or cross-method confluence.
- HEW lane: load `WORKFLOW.md`, `strategies/hew/manifest.json`, and `agents/harmonic-elliott-wave-analyst.md`. Do not load Wyckoff prompts, manifests, skills, old reports, or templates unless Johan explicitly asks for Wyckoff or cross-method confluence.
- Load both lanes only when the request explicitly asks for both methods, confluence, comparison, or a package intentionally containing both strategies. State that reason before expanding context.
- Do not preload `analysis_journal`, screenshots, reports, or generated artifacts. Open only the current package or specific files needed for the task.

## Routing

Default to Wyckoff macro analysis when the user asks for general symbol analysis, macro structure, accumulation/distribution, buyer/seller control, springs, UTAD, LPS/LPSY, Creek/Ice, or value/effort work.

Route to HEW only when the user explicitly asks for HEW, Harmonic Elliott Wave, Elliott Wave, wave count, ratio projection, Wave-B ladder, Castaway model, A/B/C internals, or harmonic wave strategy.

Do not use web search, news, external quote pages, or fundamentals unless Johan explicitly asks for outside context. Chart analysis comes from TradingView MCP and local repo files only.

## Live TradingView discipline

For serious chart analysis:

1. Switch to the required saved layout:
   - Wyckoff: `Wyckoff Layout`
   - HEW: `HEW layout`
2. If the layout is missing, run `layout_list`, report the missing layout, and stop unless Johan explicitly overrides.
3. After layout switch, call `chart_get_state` because symbol, studies, drawings, and entity IDs may have changed.
4. Set/verify symbol and timeframe.
5. Work top down: Monthly -> Weekly -> Daily. Macro review always starts on Monthly, then Weekly, for both Wyckoff and HEW. Add 4H/1H only for explicit execution work.
6. Enter **extraction mode**: make the required pivot/scanner indicator visible, hide only non-essential proof drawings if they block labels, extract pivots with focused Pine reads (`data_get_pine_labels`, `data_get_pine_tables`, `data_get_pine_lines`, or `data_get_pine_boxes`), and screenshot the visible pivot layer. Pivot/scanner tools are scaffolding, not final presentation.
7. Enter **verification mode**: verify the extracted visual pivots with TradingView OHLCV data (`data_get_ohlcv(summary=true)`) on Monthly, Weekly, and Daily before interpreting Wyckoff or HEW structure.
8. If visual pivots and OHLCV disagree, iterate the pivot extraction, mark the conflict in `visual_pivot_evidence`, and downgrade or stop. Do not analyze the strategy from unverified pivots.
9. Enter **strategy-proof mode** after pivot verification: hide or reduce extraction clutter when it obscures structure, use compact reads (`quote_get`, `data_get_ohlcv(summary=true)`, `data_get_study_values`, focused Pine reads with `study_filter`), and draw only the method proof needed for the decision.
10. Fit or explicitly set the visible range before interpreting, drawing, or screenshotting.
11. Enter **presentation mode** before final response: hide extraction scaffolding such as Pivot Scanner/Pivots HL when it is no longer needed, leave only readable decision proof, capture the final screenshot, and verify live chart state. Do not leave Johan with the cluttered extraction chart unless he explicitly asks for audit mode.
12. Use screenshots for visual proof, but do not rely on screenshots while the live chart is missing the final proof layer.

## Stage gates

Every serious report must record and pass these gates in `evidence.json.stage_gates`:

1. `route_and_layout`
2. `visual_pivot_extraction`
3. `ohlcv_pivot_verification`
4. `top_down_chart_read`
5. `drawing_protocol`
6. `evidence_contract`
7. `action_output`
8. `critic_review`

HEW packages also hard-code the structural proof inside the phase/evidence contract: `hew_structure_context` must reference drawings for preceding impulse context, primary-degree subwaves, secondary/internal subwaves, and the conditional forward impulse projection. The `critic_review` gate must explicitly check those items; if any HEW structural critic check is not `pass`, the package fails.

If a gate cannot pass, stop or downgrade. Do not keep producing confident trade language after a failed gate.

## Chart mode protocol

Every serious run must explicitly move through four chart modes and record them in `chart_prep.chart_mode_checklist`:

1. **Extraction mode**
   - Purpose: harvest pivots from the visible TradingView pivot/scanner layer.
   - Required visible tools: the selected pivot indicator/scanner and any Pine labels/tables/lines/boxes used for extraction.
   - Forbidden conclusion: no strategy call, trade posture, or final chart claim from this mode alone.
   - Output: `visual_pivots` screenshot plus `visual_pivot_evidence` source text.
2. **Verification mode**
   - Purpose: test the extracted pivots against OHLCV highs/lows/ranges on Monthly, Weekly, and Daily.
   - Required action: resolve or disclose conflicts before applying strategy rules.
   - Output: OHLCV verification rows tied to pivot IDs.
3. **Strategy-proof mode**
   - Purpose: apply Wyckoff or HEW rules after pivot verification.
   - Chart state: hide or reduce pivot/scanner clutter if it obscures the structure; draw only proof needed for the selected method.
   - Output: macro/trade posture screenshots and drawing manifest.
4. **Presentation mode**
   - Purpose: leave Johan with a clean, human-actionable live chart.
   - Chart state: extraction scaffolding hidden, not deleted unless clearly stale; key count/range/zones, trigger, invalidation, and target path visible.
   - Required verification: `chart_get_state`, `draw_list`, key drawing properties when available, and a final screenshot/visual check.
   - Failure condition: if Pivot Scanner/Pivots HL or equivalent scaffolding remains visibly cluttering the decision chart, the package is not complete unless Johan explicitly requested audit mode.

## Visual pivot protocol

Institutional-grade analysis is visual-first:

1. Load the selected strategy layout and confirm the pivot indicator is visible.
2. Extract important pivots from the visible indicator layer on Monthly, Weekly, and Daily. Use indicator labels, tables, lines, or boxes with `study_filter`; do not infer the first pivot map from raw OHLCV alone.
3. Capture a `visual_pivots` screenshot and record the indicator name, `study_filter`, extraction method, timeframe, pivot type, price, source text, and screenshot path in `visual_pivot_evidence`.
4. Retrieve TradingView OHLCV summaries for the same timeframes and verify that each visual pivot matches the relevant high/low/support/resistance evidence.
5. Only after the visual pivots are verified may the agent apply Wyckoff or HEW rules. If verification changes the pivots, repeat the extraction/verification loop and document the revision.

## Drawing protocol

Inventory drawings after loading the requested symbol/layout. Remove or hide only drawings classified as stale clutter; preserve current proof and uncertain drawings unless Johan explicitly requested a reset. Treat `draw_clear` as destructive.

Record meaningful drawings in `chart_prep.drawing_manifest`:

```json
{
  "id": "macro_count",
  "role": "macro_count",
  "tool": "elliott_impulse_wave",
  "timeframe_owner": "macro",
  "screenshot": "screenshots/macro.png"
}
```

Timeframe ownership:

- `macro`: monthly/weekly and higher-than-daily proof.
- `daily`: daily decision proof.
- `execution`: lower-timeframe execution proof only when requested.
- `all`: allowed only when the same drawing intentionally belongs to every layer.

If TradingView MCP cannot set per-drawing visibility, separate proof with temporary screenshot passes only when necessary: capture the screenshot, immediately rebuild the final presentation chart, then verify the final live chart. Never finish immediately after `draw_clear` or leave the macro/decision proof as screenshot-only evidence.

## Wyckoff rules

Manifest: `strategies/wyckoff/manifest.json`.
Specialist prompt: `agents/wyckoff-macro-analyst.md`.
Validator: `npm run validate:wyckoff -- analysis_journal/<PACKAGE>/evidence.json`.

Wyckoff outputs must be zone-first:

- Accumulation zones: spring tests, LPS, BUEC, demand/value-low retests, absorption, reaccumulation pullbacks.
- Distribution zones: UTAD, LPSY, Ice retests, supply/value-high failures, redistribution rallies.
- No-trade zones: middle of range, unresolved confirmation, conflicting timeframe evidence.

Event labels require evidence ledger rows. If evidence is incomplete, use `candidate`, `possible`, or `attempt`; do not label clean `Spring`, `SOS`, `LPS`, `BUEC`, `UTAD`, `SOW`, or `LPSY` without the required behavior.

Drawing grammar:

- `rectangle` for zones.
- `horizontal_line` for precise levels only.
- `trend_line` for wave evidence or scenario paths.
- `text` for compact labels that affect the decision.

## HEW rules

Manifest: `strategies/hew/manifest.json`.
Specialist prompt: `agents/harmonic-elliott-wave-analyst.md`.
Validator: `npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json`.

HEW outputs must include:

- Primary and alternate count.
- Macro-first count before micro-counts.
- Preceding impulse context for any macro ABC/correction claim; an ABC that does not answer “correcting what?” fails chart proof.
- Primary-degree subwaves and secondary/internal subwaves drawn as separate visible evidence layers when evidence permits.
- Subwave evidence inside macro waves where visible.
- Ratio validation and rule validation.
- Wave-B invalidation ladder with chart proof.
- Castaway model before trade language.
- Accumulation/distribution zone probabilities.
- Conditional forward impulse projection after any completed 1-5 + ABC structure; label projection as scenario, not fact.
- Projection map tied to the highest-probability next count.
- Hard invalidation, flip level, target path, and stand-aside condition.

HEW drawing grammar is strict:

- Macro counts, subwaves, and projected Elliott paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
- Preceding impulse context and forward impulse projections must use `elliott_impulse_wave`.
- Primary-degree subwaves and secondary/internal subwaves must be represented as their own native Elliott drawing roles, not only text labels.
- `trend_line`, generic line drawings, and horizontal-line substitutes are forbidden for HEW count legs, subwave legs, and projected count legs.
- `horizontal_line` is allowed for ladder levels, hard invalidation, flip levels, and target boundaries only.
- `rectangle` is allowed for retracement, target, invalidation, accumulation, and distribution zones.

If the count cannot be proven with the correct drawing tools, mark the count `candidate`, `unclear`, or `missing` and say `STAND ASIDE`.

## Journal package contract

Each analysis package has exactly this shape:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_<method>/
  journal.md
  evidence.json
  screenshots/
```

Rules:

- Exactly one top-level `journal.md`.
- Exactly one top-level `evidence.json`.
- Screenshots only under `screenshots/`.
- `journal.md` embeds screenshots with package-relative links.
- `evidence.json.screenshots[*].path` must match files in `screenshots/`.
- The journal and evidence must describe the same levels, zones, posture, and screenshot set.

Before calling the package done:

```bash
npm test
npm run validate:<hew|wyckoff> -- analysis_journal/<PACKAGE>/evidence.json
```

Run the strategy-specific validator, not both, unless the package intentionally contains both strategy outputs.

## Final answer standard

Lead with the decision:

- `ACTIONABLE`, `WATCHLIST ONLY`, `NO CLEAN TRADE`, or `STAND ASIDE`.
- Setup.
- Strategy reason.
- Trigger.
- Invalidation.
- Target/reward path.
- What to ignore/do nothing on.

Every action must say why it follows from the selected strategy. If that explanation is weak, the correct answer is no trade.
