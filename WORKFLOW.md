# KonsiliTradingview Agent Workflow

This repo is the operating contract for Johan's TradingView chart agents. The goal is not more prose. The goal is fewer missed steps, correct visual pivots, correct Elliott drawing tools, validated evidence, and a final output a human can act on.

Canonical files:

- `AGENTS.md` - the boot manual every agent reads first.
- `strategies/hew/manifest.json` - executable HEW contract.
- `agents/harmonic-elliott-wave-analyst.md` - compact HEW specialist role.
- `scripts/validate_evidence.mjs` - manifest-driven validator for journal packages.

## The stage-gated workflow

Every serious analysis must pass eight gates in order. Do not skip forward. If a gate cannot pass, stop and return a `STAND ASIDE`, `watchlist only`, or `missing evidence` result.

1. Route and layout
   - Route every chart-analysis request to Ian Copsey Fractal Forecasting.
   - Load only `strategies/hew/manifest.json`, `agents/harmonic-elliott-wave-analyst.md`, and directly relevant HEW workflow material.
   - Switch to `HEW layout` before analysis.
   - If the required layout is unavailable, stop unless Johan explicitly overrides.

2. Visual pivot extraction / extraction mode
   - Confirm `Konsili Pivot Exporter` from `tradingview/konsili_pivot_exporter.pine` is visible after layout switch.
   - Use this as scaffolding: the exporter may be noisy here because the purpose is pivot harvest, not final decision display.
   - Extract important pivots visually from exporter output first, using focused Pine reads with `study_filter: "Konsili Pivot Exporter"` and structured `KPE|...` rows from tables or labels.
   - Capture a `visual_pivots` screenshot before HEW interpretation.
   - Record exporter metadata, raw `exporter_rows`, `exporter_row_id`, timeframe, pivot type, date, timestamp, price, source text, and screenshot path in `visual_pivot_evidence`; each accepted pivot must match the referenced KPE row.

3. OHLCV pivot verification / verification mode
   - Retrieve TradingView OHLCV summaries for Monthly, Weekly, and Daily.
   - Verify visual pivots against OHLCV highs/lows/ranges before HEW count selection.
   - If pivot evidence conflicts with OHLCV, iterate extraction and document the revision. If the conflict remains unresolved, stop or downgrade.

4. Top-down chart read
   - Use TradingView MCP as the chart source.
   - No web/news/fundamental source unless explicitly requested.
   - Read Monthly -> Weekly -> Daily by default. Macro review must always start on Monthly, then Weekly.
   - Copsey HEW source rules control the count. Konsili/Castaway is only the execution overlay for readiness, zones, risk, and action output after the count is proven.
   - Select Elliott anchors from an Ian Copsey / Fractal Forecasting read, not from a scanner ranking. `hew_scan_chart`, Pivot Scanner, and other mechanical tools are scaffolding only; mechanics may check HEW ratios/rules after the Copsey map is selected.
   - Before calling a macro leg an ABC/correction, identify the preceding impulse it corrects. An orphan ABC fails the phase because it does not answer "correcting what?"
   - Macro Waves 1, 3, and 5 must be tested as HEW A-B-C motive engines, with A and C showing lower-degree five-wave action where visible.
   - Reject classical Elliott rescue devices in HEW counts, including extended waves, failed fifths, leading diagonals, ending diagonals, and diagonal triangles.
   - Treat Wave 3 176.4% as the default hard floor. A downgrade or exception is allowed only as a rare, named, evidence-backed exception when the broader Copsey structure supports it.
   - Use compact reads first: quote, OHLCV summary, study values, focused Pine reads.
   - Fit/verify visible range before interpreting or drawing.

5. Drawing protocol / strategy-proof and presentation modes
   - Inventory drawings after symbol/layout setup; remove or hide only drawings classified as stale clutter.
   - Preserve current proof and uncertain drawings unless Johan explicitly requested a reset. Treat `draw_clear` as destructive, not routine cleanup.
   - In strategy-proof mode, hide or reduce pivot/scanner clutter when it obscures the structure and draw only the layer being proven.
   - Draw preceding impulse context, macro count/correction, primary-degree subwaves, secondary/internal subwaves, and conditional forward impulse projection with native Elliott tools. Projection and preceding impulse context must be `elliott_impulse_wave`; trend-line substitutes fail.
   - Record every meaningful drawing in `chart_prep.drawing_manifest` with `id`, `role`, `tool`, `timeframe_owner`, and `screenshot`.
   - If MCP cannot set per-drawing visibility, separate macro and daily proof with temporary screenshot passes only when necessary; immediately rebuild and verify the final presentation chart afterward.
   - In presentation mode, hide extraction scaffolding such as Pivot Scanner/Pivots HL unless Johan explicitly requested audit mode. Leave only readable decision proof, trigger, invalidation, and target/zone context.

6. Evidence contract
   - Fill exactly one `journal.md` and one `evidence.json` in `analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/`.
   - Record `ian_copsey_wave_map` with the selected anchors, Copsey rationale, drawing references, ratio-validation references, Fractal Forecasting alignment checks, and `scanner_used_for_count_selection: false`.
   - Screenshots live only under `screenshots/` and are referenced with package-relative paths.
   - Required sections, checklist IDs, screenshot roles, drawing roles, and critic fields come from the HEW strategy manifest, not duplicated prose.

7. Action output
   - The final call is decision-first: setup, active count, alternate, HEW reason, trigger, invalidation, target path, and no-trade condition.
   - Every action must explain why it follows from the HEW count, ratio model, Wave-B ladder, and Castaway overlay.
   - Trade planning is zone-first after the count is proven. Copsey retracement, projection, invalidation, and no-trade zones come before action language.
   - If the chart cannot support a HEW-derived action, say `STAND ASIDE`, `watchlist only`, or `no clean trade`.

8. Critic review
   - Run a final critic before calling a package complete.
   - The critic checks visual-first sequence, evidence accuracy, journal/evidence/screenshot alignment, human actionability, macro focus, risk clarity, disclosed missing evidence, and no day-trading leakage.
   - HEW critic checks are blocking: Copsey source rules not overwritten by Konsili/Castaway overlay, no orphan ABC, macro Waves 1/3/5 tested as HEW A-B-C motive engines, A/C lower-degree five-wave action recorded where visible, no classical Elliott rescue devices, Wave 3 176.4 floor honored or rare exception documented, preceding impulse context present, primary and secondary subwaves present, and forward impulse projection drawn/marked conditional. A `pass_with_fixes` on those items is still a failure until fixed.
   - Record the critic result in `critic_review`.
   - Run the validator.

## Chart modes and handoffs

Agents must not stay in one visual state for the whole job. Record all four modes in `chart_prep.chart_mode_checklist`:

- **Extraction**: pivot/scanner tools visible; capture `visual_pivots`; no count selection yet.
- **Exporter data path**: `Konsili Pivot Exporter` table/label rows are the structured pivot source. If the exporter is missing or produces no KPE rows, fix the layout/exporter or downgrade; do not weaken the evidence contract by treating screenshot-only pivots as a clean pass.
- **Verification**: OHLCV checks against pivot IDs; conflicts resolved, revised, or explicitly downgraded.
- **Human wave map**: choose the Elliott wave anchors from chart structure; mechanical tools are limited to validating ratios/rules.
- **Strategy proof**: extraction clutter hidden/reduced; HEW proof drawn with native Elliott tools.
- **Presentation**: final live chart is readable; extraction scaffolding hidden; only decision proof, trigger, invalidation, zones/targets, and essential indicators remain visible.

If presentation mode fails, the package is not done even if the screenshots and evidence file validate.

## Validation

```bash
npm test
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

The validator fails closed on:

- Missing stage gates.
- Missing visual pivot evidence, missing Monthly/Weekly/Daily pivot extraction, or unverified OHLCV pivot checks.
- Missing `chart_prep.chart_mode_checklist`, missing extraction/verification/strategy_proof/presentation modes, or presentation mode that leaves pivot scaffolding visible.
- Mandatory stage gates with `fail`, `partial`, or `not_requested` status.
- `workflow_version` drift from the strategy manifest `contract_version`.
- Duplicate checklist IDs.
- Screenshot paths outside `screenshots/`.
- Drawing-manifest screenshots not listed in `evidence.json.screenshots`.
- Zone probability values outside 0-100 or malformed price ranges.
- Missing journal/screenshot alignment.
- Missing action rationale fields.
- Missing critic review checklist items.
- Missing HEW `hew_structure_context` proof for preceding impulse, primary-degree subwaves, secondary/internal subwaves, or conditional forward impulse projection.
- Missing HEW `copsey_hew_purity` proof for Copsey A-B-C motive engines, A/C lower-degree five-wave action where visible, classical-rescue-device rejection, Castaway-as-overlay boundary, or the Wave 3 176.4 rule.
- HEW critic structural checks that are anything other than `pass`.
- HEW macro/subwave/projection counts drawn with `trend_line` or other generic substitutes.

## Drawing rules that matter

- Copsey HEW source rules are the count authority; Konsili/Castaway is an execution overlay only after structural proof.
- Populate `copsey_hew_purity` in evidence packages; prose claims are not enough for the validator.
- Macro counts, subwaves, and projected Elliott paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
- Preceding impulse context and forward projections must be `elliott_impulse_wave` drawings.
- Primary-degree and secondary/internal subwaves must each have their own native Elliott drawing role.
- Macro Waves 1, 3, and 5 must be represented as HEW A-B-C motive engines when visible; A and C require lower-degree five-wave action where chart resolution permits.
- Do not use classical Elliott rescue devices in HEW counts: extended waves, failed fifths, leading diagonals, ending diagonals, or diagonal triangles.
- Wave 3 176.4% is the default hard floor. Any downgrade/exception must be rare, explicit, and supported by the broader Copsey structure rather than convenience.
- `trend_line` is forbidden for HEW count legs, subwave legs, and projected count legs.
- `horizontal_line` is allowed for Wave-B ladder levels, hard invalidation, flip levels, and target boundaries only.
- `rectangle` is allowed for retracement, projection target, invalidation, and no-trade zones.
- Wave-B ladder gets its own chart-proof layer.
- Projection maps must show the highest-probability next count path or explicitly document TradingView forward-margin clamp/fallback.

## Output standard

A usable answer must let Johan act or stand aside without decoding the process:

- What is the setup?
- What is the active HEW count and alternate?
- Which Copsey/HEW rule says so?
- What zone matters now?
- What confirms it?
- What invalidates it?
- What is the target/reward path?
- What should he do nothing on?

If that block is missing, the work is not done.
