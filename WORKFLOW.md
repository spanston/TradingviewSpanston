# KonsiliTradingview Agent Workflow

This repo is the operating contract for Johan's TradingView chart agents. The goal is not more prose. The goal is fewer missed steps, correct visual pivots, correct native TradingView Elliott tools, validated evidence, and a final output a human can act on.

Canonical files:

- `AGENTS.md` - the boot manual every agent reads first.
- `strategies/hew/manifest.json` - executable HEW contract.
- `agents/harmonic-elliott-wave-analyst.md` - compact HEW specialist role.
- `agents/hew-independent-critic.md` - independent final critic role.
- `scripts/validate_evidence.mjs` - manifest-driven validator for journal packages.
- `docs/hew-atlassian-reference-style.md` - distilled zone-first reference style.

Concrete reference fixture: `fixtures/hew/good/team_no_clean_trade/input`. Do not preload generated `analysis_journal` packages on ordinary runs; use the reference doc and manifest by default.

## The stage-gated workflow

Every serious analysis must pass eight gates in order. Do not skip forward. If a gate cannot pass, stop and return a `STAND ASIDE`, `watchlist only`, or `missing evidence` result.

1. Route and layout
   - Route every chart-analysis request to Ian Copsey Fractal Forecasting.
   - Load only `strategies/hew/manifest.json`, `agents/harmonic-elliott-wave-analyst.md`, and directly relevant HEW workflow material.
   - Switch to `HEW layout` before analysis.
   - If the required layout is unavailable, stop unless Johan explicitly overrides.

2. MTF visual pivot extraction / extraction mode
   - Confirm `Konsili Pivot Exporter` from `tradingview/konsili_pivot_exporter.pine` is visible after layout switch with `data_get_indicator`; `chart_get_state` showing the study name is not sufficient because it can be hidden.
   - Pin the exporter to the manifest instrument profile before reading rows. For crypto this means `left=7`, `right=7`, and `max_rows=32`; use the actual input IDs reported by `data_get_indicator` when needed.
   - Use this as visual-first wave-anchor scaffolding: Pine labels must sit on the actual price-wave extremes and show price first, date/time second, with `PH`/`PL` as the pivot marker. The structured KPE table stays hidden in the clean path.
   - Do one top-down extraction batch: switch Monthly, Weekly, and Daily; inspect the visible price-extreme labels; read focused Pine labels with `study_filter: "Konsili Pivot Exporter"`; capture pivot screenshots; do not interpret or select counts between timeframe reads.
   - Show the structured KPE table only if visual inspection is unavailable, labels are unreadable, or the AI cannot confidently extract pivots from the visible overlay. In that fallback, use `data_get_pine_tables` or switch label text to `Price + date + KPE`.
   - Normalize the collected visual label rows with `scripts/pivot_engine.mjs` `buildMtfPivotEvidence(...)`. The helper writes one `visual_pivot_evidence.timeframes[]` object, pins `instrument_class`, `left_bars`, `right_bars`, `max_rows`, and uses KPE table rows only as fallback.
   - Capture at least one `visual_pivots` screenshot before HEW interpretation. Separate Monthly/Weekly/Daily screenshots are allowed when readability requires them.
   - Record exporter metadata, raw `exporter_rows`, `exporter_row_id`, timeframe, pivot type, date, timestamp, price, source text, screenshot path, and `iteration_decision` through the MTF evidence object; each accepted pivot must match the referenced KPE row.

3. OHLCV pivot verification / verification mode
   - Retrieve TradingView OHLCV summaries for Monthly, Weekly, and Daily in the same MTF batch.
   - Let `buildMtfPivotEvidence(...)` compare each accepted KPE high/low with the matching OHLCV bar before HEW count selection.
   - If the helper returns errors, iterate extraction once after checking exporter visibility/inputs. If errors remain, stop or downgrade; do not hand-edit pivot evidence to pass validation.

4. Top-down chart read
   - Use TradingView MCP as the chart source.
   - No web/news/fundamental source unless explicitly requested.
   - Read Monthly -> Weekly -> Daily by default. Macro review must always start on Monthly, then Weekly.
   - Copsey HEW source rules control the count. Konsili/Castaway is only the execution overlay for readiness, zones, risk, and action output after the count is proven.
   - Select Copsey/Fractal Forecasting structural anchors from an Ian Copsey / Fractal Forecasting read, not from a scanner ranking. `hew_scan_chart`, Pivot Scanner, and other mechanical tools are scaffolding only; mechanics may check HEW ratios/rules after the Copsey map is selected.
   - Before calling a macro leg an ABC/correction, identify the preceding impulse it corrects. An orphan ABC fails the phase because it does not answer "correcting what?"
   - Macro Waves 1, 3, and 5 must be tested as HEW A-B-C motive engines, with A and C showing lower-degree five-wave action where visible.
   - Classify the active correction in `corrective_structure`: location, pattern, price/time mode, Wave-B behavior, and the preceding impulse it corrects. Wave 2 triangles are not accepted in the core workflow.
   - Reject forbidden rescue devices in Copsey/Fractal Forecasting counts, including extended waves, failed fifths, leading diagonals, ending diagonals, and diagonal triangles.
   - Treat Wave 3 176.4% as the default hard floor. A downgrade or exception is allowed only as a rare, named, evidence-backed exception when the broader Copsey structure supports it.
   - Measure C of 3 against A of 3 whenever Wave 3 completion is claimed. C of 3 shorter than A of 3 is a blocking structural failure until the count is repaired or downgraded.
   - Treat Wave 5 beyond the Copsey Wave 5 universe as a hard extended-fifth rejection on completed impulses.
   - Check R.N. Elliott rules 2 and 3 explicitly: Wave 3 cannot be shortest, and Wave 4 cannot overlap Wave 1.
   - Derive triple-confluence targets from pivot projections, not raw target numbers.
   - Use compact reads first: quote, OHLCV summary, study values, focused Pine reads.
   - Fit/verify visible range before interpreting or drawing.

5. Drawing protocol / strategy-proof and presentation modes
   - Inventory drawings after symbol/layout setup; remove or hide only drawings classified as stale clutter.
   - Preserve current proof and uncertain drawings unless Johan explicitly requested a reset. Treat `draw_clear` as destructive, not routine cleanup.
   - In strategy-proof mode, hide `Konsili Pivot Exporter` and reduce pivot/scanner clutter when it obscures the structure, then draw only the layer being proven.
   - Draw preceding impulse context, macro count/correction, primary-degree subwaves, secondary/internal subwaves, and conditional forward impulse projection with native TradingView Elliott tools. Projection and preceding impulse context must be `elliott_impulse_wave`; trend-line substitutes fail.
   - Treat projection topology as blocking before presentation: projected Wave 2 must hold the Wave 1 origin, projected Wave 4 must not overlap Wave 1 territory, Wave 3 cannot be the shortest motive wave, and motive legs must move in the declared direction.
   - Record every meaningful drawing in `chart_prep.drawing_manifest` with `id`, `role`, `tool`, `timeframe_owner`, and `screenshot`.
   - If MCP cannot set per-drawing visibility, separate macro and daily proof with temporary screenshot passes only when necessary; immediately rebuild and verify the final presentation chart afterward.
   - In presentation mode, hide `Konsili Pivot Exporter` and extraction scaffolding such as Pivot Scanner/Pivots HL unless Johan explicitly requested audit mode. Leave only readable HEW proof, accumulation/distribution boxes, invalidation, stand-aside conditions, and conditional target/zone context.

6. Evidence contract
   - Fill exactly one `journal.md`, one `evidence.json`, one `committee_brief.md`, and the manifest-required `raw/` artifacts in `analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/`.
   - Record `ian_copsey_wave_map` with the selected anchors, Copsey rationale, drawing references, ratio-validation references, Fractal Forecasting alignment checks, and `scanner_used_for_count_selection: false`.
   - Record `count_state` lineage, three to five structurally distinct hypotheses, structured correction classification, structured Castaway decision rows, `risk_architecture`, and `execution_quality` for visual QA/rerun-condition/drawing-spec checks.
   - Screenshots live only under `screenshots/` and raw audit files live only under `raw/`; both are referenced with package-relative paths.
   - Required sections, checklist IDs, screenshot roles, drawing roles, and critic fields come from the HEW strategy manifest, not duplicated prose.

7. Action output
   - The final call is decision-first: setup, active count, alternate, HEW reason, accumulation/distribution zones with uncalibrated zone scores, invalidation, conditional target path, and no-trade condition.
   - Every action must explain why it follows from the HEW count, ratio model, Wave-B ladder, and Castaway overlay.
   - Separate structural setup from execution setup in `risk_architecture`. A structural map can say the area matters; a live trade must define entry condition, stop, target, risk/reward, position-sizing basis, alternate response, and a time or structural stop.
   - Trade planning is zone-first after the count is proven. Copsey accumulation, potential distribution, retracement, projection, invalidation, and no-trade zones come before action language.
   - Avoid trigger, breakout, confirmation, or reclaim framing in the package output. Use `review_conditions` and zone-score changes instead.
   - If the chart cannot support a HEW-derived action, say `STAND ASIDE`, `watchlist only`, or `no clean trade`.

8. Critic review
   - Run a final critic before calling a package complete.
   - The critic checks visual-first sequence, evidence accuracy, journal/evidence/screenshot alignment, visual thesis consistency, human actionability, macro focus, risk clarity, disclosed missing evidence, and no day-trading leakage.
   - HEW critic checks are blocking: Copsey source rules not overwritten by Konsili/Castaway overlay, no orphan ABC, macro Waves 1/3/5 tested as HEW A-B-C motive engines, A/C lower-degree five-wave action recorded where visible, C of 3 not shorter than A of 3, correction classification present, risk architecture separated, no forbidden rescue devices, Wave 3 176.4 floor honored or rare exception documented, preceding impulse context present, primary and secondary subwaves present, forward impulse projection drawn/marked conditional, and projected impulse topology passing the R.N. Elliott hard rules. A `pass_with_fixes` on those items is still a failure until fixed.
   - Record the critic result in `critic_review` with an independent reviewer record, clean-pivot-path check, and fallback confidence-cap check.
   - Run the validator.

## Chart modes and handoffs

Agents must not stay in one visual state for the whole job. Record all four modes in `chart_prep.chart_mode_checklist`:

- **Extraction**: `Konsili Pivot Exporter` visible with price-wave extreme labels showing price plus date/time; capture `visual_pivots`; collect Monthly/Weekly/Daily label rows as one batch; no count selection yet.
- **Exporter data path**: Pine labels are the normal clean source and the visual wave-anchor surface. Keep the structured table hidden unless visual inspection fails or is ambiguous. If label reads fail, show the table or switch label text to `Price + date + KPE` and use KPE rows as fallback. If the exporter is missing or produces no readable labels or fallback rows, fix the layout/exporter or downgrade; do not weaken the evidence contract by treating unrelated pivots as a clean pass.
- **Verification**: one MTF `visual_pivot_evidence` object from `buildMtfPivotEvidence(...)`; OHLCV checks against label-derived pivot IDs; conflicts resolved, revised, or explicitly downgraded.
- **Copsey wave map**: choose the Copsey/Fractal Forecasting structural anchors from chart structure; mechanical tools are limited to validating ratios/rules.
- **Strategy proof**: `Konsili Pivot Exporter` hidden and extraction clutter reduced; HEW proof drawn with native TradingView Elliott tools.
- **Presentation**: final live chart is readable; `Konsili Pivot Exporter` and extraction scaffolding hidden unless audit mode is explicit; only native TradingView Elliott-tool proof, accumulation/distribution boxes, invalidation/no-trade zones, conditional targets, and essential indicators remain visible.

If presentation mode fails, the package is not done even if the screenshots and evidence file validate.

## Validation

```bash
npm test
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage extraction
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage verification
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage anchors
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage ratios
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage drawings
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage writing
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage critic
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage final
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

`npm test` starts with `scripts/check_integrity.mjs`, which fails on NUL-corrupted tracked text files or invalid JSON before unit/contract tests run.
Stage validation runs only the validator groups relevant to that construction stage. `--stage final` and the no-stage command run the full suite and remain the acceptance gate.
`zone_scores` are canonical. `zone_probabilities` and `migration_policy` are removed legacy truth surfaces and must fail closed in new packages.

The validator fails closed on:

- Missing stage gates.
- Missing visual pivot evidence, missing Monthly/Weekly/Daily pivot extraction, or unverified OHLCV pivot checks.
- Missing `chart_prep.chart_mode_checklist`, missing extraction/verification/strategy_proof/presentation modes, or presentation mode that leaves pivot scaffolding visible.
- Mandatory stage gates with `fail`, `partial`, or `not_requested` status.
- `workflow_version` drift from the strategy manifest `contract_version`.
- Duplicate checklist IDs.
- Screenshot paths outside `screenshots/`.
- Drawing-manifest screenshots not listed in `evidence.json.screenshots`.
- Zone score values outside 0-100 or malformed price ranges.
- Missing required accumulation/distribution zone types, invalid score bands, or trigger/breakout/confirmation/reclaim language in zone-first output fields.
- Missing journal/screenshot alignment.
- Missing action rationale fields.
- Missing critic review checklist items.
- Missing independent critic reviewer, count-state lineage, execution-quality record, or structured Castaway decision table.
- Missing pinned Konsili Pivot Exporter parameters, unreadable price-extreme labels, or fallback KPE rows whose left/right settings drift from the manifest instrument profile.
- Hypotheses outside the 3-5 range, alternates that reuse the primary pivot path, raw-number triple-confluence targets, or missing R.N. Elliott rules 2/3 measurements.
- Conditional forward projections whose Wave 2 breaches or retests the Wave 1 origin, whose Wave 4 overlaps Wave 1 territory, whose Wave 3 is shortest, or whose motive legs move against the declared direction.
- Completed-impulse Wave 5 projections above the Copsey universe.
- `pass_with_fallback` without `low`/`very_low` confidence, fallback disclosure, and non-actionable output.
- Missing HEW `hew_structure_context` proof for preceding impulse, primary-degree subwaves, secondary/internal subwaves, or conditional forward impulse projection.
- Missing HEW `copsey_hew_purity` proof for Copsey A-B-C motive engines, A/C lower-degree five-wave action where visible, forbidden-rescue-device rejection, Castaway-as-overlay boundary, or the Wave 3 176.4 rule.
- HEW critic structural checks that are anything other than `pass`.
- HEW macro/subwave/projection counts drawn with `trend_line` or other generic substitutes.

## Drawing rules that matter

- Copsey HEW source rules are the count authority; Konsili/Castaway is an execution overlay only after structural proof.
- Populate `copsey_hew_purity` in evidence packages; prose claims are not enough for the validator.
- Macro counts, subwaves, and projected count paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
- Preceding impulse context and forward projections must be `elliott_impulse_wave` drawings.
- Primary-degree and secondary/internal subwaves must each have their own native TradingView Elliott-tool drawing role.
- Lower-degree subwaves inside macro waves must be visually distinct from macro counts through TradingView Elliott degree, color/style, and a HEW Fibonacci projection zone when it clarifies proof.
- If macro and lower-degree TradingView Elliott labels overlap, keep true pivot prices unchanged and solve readability through native TradingView Elliott style/degree settings, visible range, or separate screenshots.
- Final screenshots must not visually promote rejected or diagnostic counts as the accepted thesis. If the macro chart and trade-posture chart imply conflicting degrees, resolve it in drawings or downgrade before delivery.
- Macro Waves 1, 3, and 5 must be represented as HEW A-B-C motive engines when visible; A and C require lower-degree five-wave action where chart resolution permits.
- Do not use forbidden rescue devices in Copsey/Fractal Forecasting counts: extended waves, failed fifths, leading diagonals, ending diagonals, or diagonal triangles.
- Wave 3 176.4% is the default hard floor. Any downgrade/exception must be rare, explicit, and supported by the broader Copsey structure rather than convenience.
- `trend_line` is forbidden for HEW count legs, subwave legs, and projected count legs.
- Prefer `rectangle` for accumulation, potential distribution, retracement, projection target, invalidation, and no-trade zones.
- `horizontal_line` is allowed only when the manifest or package explicitly needs a non-count boundary layer; it is never a substitute for count legs or zone boxes.
- Wave-B ladder gets its own chart-proof layer.
- Projection maps must show the highest-scored next count path or explicitly document TradingView forward-margin clamp/fallback.

## Output standard

A usable answer must let Johan act or stand aside without decoding the process:

- What is the setup?
- What is the active HEW count and alternate?
- Which Copsey/HEW rule says so?
- What zone matters now?
- Which zone conditions improve or degrade it?
- What invalidates it?
- What is the target/reward path?
- What should he do nothing on?

If that block is missing, the work is not done.
