# KonsiliTradingview Agent Instructions

This is the canonical project guide after system/developer instructions. Read this file before acting in this repo.

The job is simple: produce accurate, human-actionable TradingView analysis packages using Ian Copsey Fractal Forecasting. The internal strategy id remains `hew`, but front-facing analysis should name the method as Ian Copsey / Fractal Forecasting. Do not create impressive-looking analysis that skips evidence, uses the wrong drawing tools, or leaves Johan unable to decide.

## Source of truth

Use the smallest set of authorities:

1. `AGENTS.md` - routing, live-tool discipline, and global workflow.
2. `WORKFLOW.md` - stage-gated workflow and output standard.
3. `strategies/hew/manifest.json` - executable HEW evidence/drawing/action contract.
4. `agents/harmonic-elliott-wave-analyst.md` - compact HEW specialist prompt.
5. `scripts/validate_evidence.mjs` - validator.

Do not re-create strategy contracts in ad-hoc prose. If a required field, drawing role, checklist item, screenshot role, or critic rule changes, update the HEW strategy manifest first.

## Context budget and lane loading

Keep context lean. Start with `AGENTS.md`, then load only the HEW workflow files needed for the task:

- `WORKFLOW.md`
- `strategies/hew/manifest.json`
- `agents/harmonic-elliott-wave-analyst.md`

Do not preload `analysis_journal`, screenshots, reports, or generated artifacts. Open only the current package or specific files needed for the task.

## Routing

Ian Copsey Fractal Forecasting is the only supported analysis method in this repo.

Default every symbol-analysis request to HEW/Copsey unless Johan explicitly says the task is not chart analysis. General requests about macro structure, corrections, trend position, zones, buyer/seller control, targets, invalidation, or investment posture still route to HEW.

Do not offer unsupported method alternatives from this repo. If Johan asks for another method, say this repo is currently HEW-only and either ask for permission to work outside the repo contract or keep the answer to HEW confluence only.

Do not use web search, news, external quote pages, or fundamentals unless Johan explicitly asks for outside context. Chart analysis comes from TradingView MCP and local repo files only.

## Live TradingView discipline

For serious chart analysis:

1. Switch to the required saved layout: `HEW layout`.
2. If the layout is missing, run `layout_list`, report the missing layout, and stop unless Johan explicitly overrides.
3. After layout switch, call `chart_get_state` because symbol, studies, drawings, and entity IDs may have changed.
4. Set/verify symbol and timeframe.
5. Work top down: Monthly -> Weekly -> Daily. Macro review always starts on Monthly, then Weekly. Add 4H/1H only for explicit execution work.
6. Enter **extraction mode**: make `Konsili Pivot Exporter` visible from `tradingview/konsili_pivot_exporter.pine`, hide only non-essential proof drawings if they block labels, extract KPE pivot rows with `data_get_pine_tables` or `data_get_pine_labels`, and screenshot the visible pivot layer. Pivot/scanner tools are scaffolding, not final presentation.
7. Enter **verification mode**: verify the extracted visual pivots with TradingView OHLCV data (`data_get_ohlcv(summary=true)`) on Monthly, Weekly, and Daily before interpreting HEW structure.
8. If visual pivots and OHLCV disagree, iterate the pivot extraction, mark the conflict in `visual_pivot_evidence`, and downgrade or stop. Do not count from unverified pivots.
9. Enter **Ian Copsey wave-map mode** for HEW: choose Elliott anchors from Copsey/Fractal Forecasting structure first. Do not let `hew_scan_chart`, Pivot Scanner, or any mechanical candidate choose the count. Mechanical HEW tools may validate ratios/rules only after the Copsey map is selected.
10. Enter **strategy-proof mode** after pivot verification: hide or reduce extraction clutter when it obscures structure, use compact reads (`quote_get`, `data_get_ohlcv(summary=true)`, `data_get_study_values`, focused Pine reads with `study_filter`), and draw only the HEW proof needed for the decision.
11. Fit or explicitly set the visible range before interpreting, drawing, or screenshotting.
12. Enter **presentation mode** before final response: hide extraction scaffolding such as Pivot Scanner/Pivots HL when it is no longer needed, leave only readable decision proof, capture the final screenshot, and verify live chart state. Do not leave Johan with the cluttered extraction chart unless he explicitly asks for audit mode.
13. Use screenshots for visual proof, but do not rely on screenshots while the live chart is missing the final proof layer.

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

HEW packages hard-code the structural proof inside the phase/evidence contract: `hew_structure_context` must reference drawings for preceding impulse context, primary-degree subwaves, secondary/internal subwaves, and the conditional forward impulse projection. `copsey_hew_purity` must prove the Copsey-specific A-B-C motive engine, A/C lower-degree five-wave action where visible, classical-rescue-device rejection, Castaway-as-overlay boundary, and Wave 3 176.4 rule. The `critic_review` gate must explicitly check those items; if any HEW structural or Copsey-purity critic check is not `pass`, the package fails.

If a gate cannot pass, stop or downgrade. Do not keep producing confident trade language after a failed gate.

## Chart mode protocol

Every serious run must explicitly move through four chart modes and record them in `chart_prep.chart_mode_checklist`:

1. **Extraction mode**
   - Purpose: harvest pivots from the visible TradingView pivot/scanner layer.
   - Required visible tools: `Konsili Pivot Exporter` and its Pine table/labels used for extraction.
   - Forbidden conclusion: no count selection, trade posture, or final chart claim from this mode alone.
   - Output: `visual_pivots` screenshot plus `visual_pivot_evidence` source text.
2. **Verification mode**
   - Purpose: test the extracted pivots against OHLCV highs/lows/ranges on Monthly, Weekly, and Daily.
   - Required action: resolve or disclose conflicts before applying HEW rules.
   - Output: OHLCV verification rows tied to pivot IDs.
3. **Strategy-proof mode**
   - Purpose: apply HEW/Copsey rules after pivot verification.
   - Chart state: hide or reduce pivot/scanner clutter if it obscures the structure; draw only HEW proof needed for the decision.
   - Output: macro/trade posture screenshots and drawing manifest.
4. **Presentation mode**
   - Purpose: leave Johan with a clean, human-actionable live chart.
   - Chart state: extraction scaffolding hidden, not deleted unless clearly stale; key count/range/zones, trigger, invalidation, and target path visible.
   - Required verification: `chart_get_state`, `draw_list`, key drawing properties when available, and a final screenshot/visual check.
   - Failure condition: if Pivot Scanner/Pivots HL or equivalent scaffolding remains visibly cluttering the decision chart, the package is not complete unless Johan explicitly requested audit mode.

## Visual pivot protocol

Institutional-grade analysis is visual-first:

1. Load `HEW layout` and confirm `Konsili Pivot Exporter` is visible.
2. Extract important pivots from the exporter on Monthly, Weekly, and Daily. Use `study_filter: "Konsili Pivot Exporter"` and read structured `KPE|...` rows from Pine tables or labels; do not infer the first pivot map from raw OHLCV alone.
3. Capture a `visual_pivots` screenshot and record the exporter metadata, raw `exporter_rows`, `exporter_row_id`, timeframe, pivot type, price, source text, and screenshot path in `visual_pivot_evidence`.
4. Retrieve TradingView OHLCV summaries for the same timeframes and verify that each visual pivot matches the relevant high/low/support/resistance evidence.
5. Only after the visual pivots are verified may the agent apply HEW rules. If verification changes the pivots, repeat the extraction/verification loop and document the revision.

If the exporter is absent or returns no readable KPE rows, treat this as a pivot data-path failure. Do not relax the evidence contract by promoting screenshot-only or `hew_scan_chart` pivots to a clean pass; stop, fix the exporter/layout, or explicitly downgrade.

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

## HEW rules

Manifest: `strategies/hew/manifest.json`.
Specialist prompt: `agents/harmonic-elliott-wave-analyst.md`.
Validator: `npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json`.

Copsey HEW source rules are the counting authority. Konsili/Castaway is an execution overlay used after the Copsey structure is proven; it may classify trade posture, zones, readiness, and risk, but it must not rewrite or rescue the wave count.

HEW outputs must include:

- Primary and alternate count.
- Macro-first count before micro-counts.
- `ian_copsey_wave_map` with Copsey/Fractal Forecasting-selected Elliott anchors, rationale for each anchor, a book-alignment ledger, and a clear boundary that mechanical tools were used only for HEW ratio/rule validation.
- Preceding impulse context for any macro ABC/correction claim; an ABC that does not answer "correcting what?" fails chart proof.
- Macro Waves 1, 3, and 5 proven as Copsey HEW A-B-C motive engines whenever visible; A and C inside each motive engine must show lower-degree five-wave action where the chart provides enough resolution.
- `copsey_hew_purity` evidence matching the strategy manifest; this is the field that separates Copsey HEW from classical Elliott labels and the Konsili/Castaway overlay.
- Primary-degree subwaves and secondary/internal subwaves drawn as separate visible evidence layers when evidence permits.
- Subwave evidence inside macro waves where visible.
- Ratio validation and rule validation.
- Wave 3 176.4% projection is the default hard floor. Downgrade or exception is rare and must be documented as an explicit exception only when the broader Copsey structure, neighboring motive engines, ratios, and verified pivots support it; otherwise say `STAND ASIDE`.
- Wave-B invalidation ladder with chart proof.
- Castaway model before trade language.
- Copsey retracement, projection, invalidation, and no-trade zone probabilities.
- Conditional forward impulse projection after any completed 1-5 + ABC structure; label projection as scenario, not fact.
- Projection map tied to the highest-probability next count.
- Hard invalidation, flip level, target path, and stand-aside condition.

HEW drawing grammar is strict:

- Macro counts, subwaves, and projected Elliott paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
- Preceding impulse context and forward impulse projections must use `elliott_impulse_wave`.
- Primary-degree subwaves and secondary/internal subwaves must be represented as their own native Elliott drawing roles, not only text labels.
- Classical Elliott rescue devices are forbidden in HEW counts: do not use extended waves, failed fifths, leading diagonals, ending diagonals, or diagonal triangles to save a weak count.
- `trend_line`, generic line drawings, and horizontal-line substitutes are forbidden for HEW count legs, subwave legs, and projected count legs.
- `horizontal_line` is allowed for ladder levels, hard invalidation, flip levels, and target boundaries only.
- `rectangle` is allowed for retracement, projection target, invalidation, and no-trade zones.

If the count cannot be proven with the correct drawing tools, mark the count `candidate`, `unclear`, or `missing` and say `STAND ASIDE`.

## Journal package contract

Each HEW analysis package has exactly this shape:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
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
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

## Final answer standard

Lead with the decision:

- `ACTIONABLE`, `WATCHLIST ONLY`, `NO CLEAN TRADE`, or `STAND ASIDE`.
- Setup.
- Active HEW count and alternate.
- Copsey/HEW reason.
- Trigger.
- Invalidation and flip level.
- Target/reward path.
- What to ignore/do nothing on.

Every action must say why it follows from the HEW count, ratio model, Wave-B ladder, and Castaway overlay. If that explanation is weak, the correct answer is no trade.
