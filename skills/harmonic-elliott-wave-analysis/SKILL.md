---
name: harmonic-elliott-wave-analysis
description: Perform Harmonic Elliott Wave analysis in TradingView using top-down wave counts, A-B-C motive internals, HEW ratio-model selection, Wave-B invalidation ladders, Castaway trade models, ratio validation, alternation, projection maps, primary and alternate counts, invalidation, flip levels, and risk-defined posture. Use when the user asks for HEW, Harmonic Elliott Wave, Elliott Wave, wave count, wave 3 projection, C of 3, wave 5 target, Fibonacci projection, harmonic wave strategy, or ratio-driven structural forecasting of a symbol.
---

# Harmonic Elliott Wave Analysis

You are producing a ratio-validated Harmonic Elliott Wave read of a TradingView symbol. HEW is a structural forecasting method, not an automated signal system. The job is to identify the active fractal, test it against rules and ratios, build a meaningful alternate, and decide whether the chart is in a campaign zone, confirmation zone, terminal zone, or no-trade zone.

For detailed definitions, ratio tables, corrective structures, and the full checklist, load `references/hew-operating-model.md`.

## Operating Standards

- Use TradingView MCP as the source of live chart facts, current price, OHLCV, visible indicators, drawings, screenshots, and current context. Do not use web search, external quote pages, or local report files for the market read unless the user explicitly asks for outside context.
- Work from higher timeframe to lower timeframe and prioritize the highest-degree viable macro count before any lower-timeframe micro count. Do not start by micro-counting every small swing.
- Treat A-B-C structures as the building blocks of motive waves. Waves 1, 3, and 5 should be internally A-B-C in the working HEW model, and serious reports must show those subwaves when chart resolution permits.
- A bare macro 1-5 count is incomplete without subwave evidence. If subwaves inside the macro waves cannot be read, state what is missing and downgrade confidence.
- Validate the count with ratios, ratio-model selection, support/invalidation, alternation, and degree logic. A count that looks clean but fails the ratio work is weak.
- Select the active HEW ratio model for serious reports: Model 1 standard, Model 2 extended, or Model 3 super-extended. Start with Model 1, upgrade only when price exceeds the lower model without terminal behavior, and treat Model 3 as terminal-risk mapping rather than permission to chase.
- Document the Wave-B invalidation ladder: Wave 1 origin -> Wave 2 -> B of 3 -> Wave 4 -> B of 5, inverted for bearish counts. Define whether violation means wick, close, daily close, weekly close, or structural break.
- Build projections only from the highest-probability macro-following path: either the next impulsive wave or the most likely complex correction that follows the macro count.
- Separate structural setup from execution setup using Castaway logic. The macro count only permits direction; the micro setup must define controllable risk; the reward model must define target management. A valid map does not authorize a trade unless trigger, invalidation, reward, and alternate-count response are defined.
- Never promise profit or certainty. State the primary path, the exact level that proves it wrong, and what price must do next.
- Prefer `STAND ASIDE` when the count is unresolved, price is mid-wave, the alternate changes posture materially, or risk/reward is poor.
- For every `analysis_journal` package, fill the `hew_evidence_stack_v1` JSON contract. Use `templates/evidence-contract.template.json` as the checklist source and run `npm run validate:hew -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/evidence.json` before calling the package done.

## Default Timeframe Stack

For macro analysis, work top down:

1. Monthly: major campaign, completed five-wave structures, higher-degree corrections.
2. Weekly: dominant count, likely active wave, major pivot map, hard invalidation.
3. Daily: active wave anatomy, A-B-C internals, ratio clusters, flip levels.
4. 4H/1H: execution refinement only when the user asks for entries, stops, or lower-timeframe timing.

For short-term futures or intraday requests, compress the stack to Weekly -> Daily -> 4H -> 1H/15m, but keep the same top-down logic.

## TradingView MCP Workflow

Use compact data first, then pull bounded bars only when pivots or ratios require it.

1. `layout_switch` to the saved layout `HEW layout` before symbol/timeframe setup so live HEW counts, projection drawings, indicators, and screenshots stay separate from Wyckoff work.
2. If `HEW layout` cannot be loaded, run `layout_list`, report that the required saved layout is missing, and stop unless the user explicitly tells you to continue on another layout.
3. `chart_get_state` after the layout switch to confirm current symbol, timeframe, visible indicators, drawings, and new entity IDs.
4. `chart_set_symbol` if the requested symbol is not already loaded.
5. For any fresh annotated HEW analysis, clear existing drawings with `draw_clear` once after the requested symbol is loaded and before creating the macro structure layer, unless the user explicitly asks to preserve drawings. Do not clear the macro Elliott proof just to create projection, alternate-count, wave-anatomy, or trade-posture screenshots; keep the macro layer on-chart and add lower-degree/projection layers as lighter overlays, or use a separate tab/screenshot when readability requires separation.
6. For each analysis timeframe:
   - `chart_set_timeframe`
   - autofit or `chart_set_visible_range` so the full wave structure under analysis is visible
   - verify the displayed window with `chart_get_visible_range` when available
   - `quote_get`
   - `data_get_ohlcv` with `summary: true`
   - `data_get_study_values` if indicators are visible
   - focused Pine reads with `study_filter` when custom fib, wave, profile, VWAP, or label studies are visible
   - bounded raw `data_get_ohlcv` only when exact swing highs/lows, durations, or ratio validation require it
   - `capture_screenshot` for chart evidence when writing a report
7. For trade-posture screenshots, fit the historical structure first, then leave forward chart space for the projection path. If `chart_set_visible_range` clamps at the last real bar, use UI panning/scrolling.

## HEW Count Rules

Apply these rules before accepting a five-wave HEW fractal. Invert them for bearish counts.

| Rule | Bullish Count | Bearish Count |
|---|---|---|
| Wave 2 | Must hold above Wave 1 origin | Must hold below Wave 1 origin |
| Wave 3 | Must exceed Wave 1 high | Must exceed Wave 1 low to the downside |
| Wave 3 projection | Minimum 176.4% of Wave 1 from Wave 2 | Minimum 176.4% of Wave 1 from Wave 2 |
| Wave 4 | Must hold above B of 3 | Must hold below B of 3 |
| Wave 5 | Normally exceeds Wave 3 high | Normally exceeds Wave 3 low |
| B of 5 | Must hold above Wave 4 | Must hold below Wave 4 |

If a hard rule fails, downgrade or reject the count. Do not protect a preferred count with failed fifths, diagonals, or vague extensions before testing a recount.

## Ratio Engine

Use ratios as validation, not decoration.

| Structure | Measurement | Common Ratios |
|---|---|---|
| Wave C | Wave A length projected from Wave B | 100.0%, 109.2%, 114.4%, 123.6%, 138.2%, 144.4%, 176.4% |
| Wave 3 | Wave 1 length projected from Wave 2 | 176.4%, 200.0%, 223.6%, 276.4%, 323.6% |
| C of 3 | A of 3 length projected from B of 3 | 123.6%, 138.2%, 176.4%, 223.6% |
| Wave 5 | Waves 1 + 3 projected from Wave 4 | 50.0%, 61.8%, 76.4%, 85.4% |

Common retracements: 23.6%, 38.2%, 41.4%, 50.0%, 58.6%, 61.8%, 66.7%, 76.4%, 85.4%, 91.2%, 98.2%.

## Analysis Process

### 1. Frame the Market

State the macro regime in one sentence:

```text
The market is in a bullish/bearish/corrective macro regime unless price breaks [level].
```

Mark the major high, major low, dominant channel if useful, and any obvious completed five-wave or A-B-C structure.

### 2. Identify Candidate Count

Map the most likely macro Waves 1, 2, 3, 4, and 5 or the active macro corrective sequence first. Then map the subwaves inside those macro waves: A/B/C internals for Waves 1, 3, and 5, and corrective structure for Waves 2 and 4. Do not overfit. The first count is a candidate until the validation log supports it.

### 3. Validate Wave 3

Measure Wave 1 and project 176.4%, 200.0%, and 223.6% from Wave 2. A candidate Wave 3 that fails the 176.4% floor is suspect and normally requires recounting.

### 3A. Select Ratio Model

Classify the count as Model 1, Model 2, or Model 3:

- `Model 1`: standard five-wave template; keep it primary while Wave 3 validates but remains proportionate.
- `Model 2`: extended template; use only after Model 1 targets are exceeded without reversal or consolidation.
- `Model 3`: super-extended template; use only after Model 1 and Model 2 are exceeded, usually in vertical C-of-3 behavior.

Record why the chosen model fits Wave 3, Wave 5, alternation, and the invalidation ladder. If no model fits, recount or mark the posture `STAND ASIDE`.

### 4. Validate Internal Structure

For Waves 1, 3, and 5, identify A, B, and C internals where visible. For Wave 3, specifically compare C of 3 versus A of 3. C of 3 should not be weaker or shorter than A of 3 in a strong impulse.

### 5. Validate Supports and Alternation

Check Wave 2 versus Wave 1 origin, B of 3 versus Wave 2, Wave 4 versus B of 3, and B of 5 versus Wave 4. Record this as the Wave-B invalidation ladder, with the exact violation standard. Then test alternation: Wave 2 and Wave 4 should differ in depth, duration, or complexity. If they are too similar, the count is weaker.

### 6. Build Projection Map

Create a primary count and a real alternate count. The alternate must have an activation level, invalidation level, and different next implication. Do not include token alternates.

The projection map must follow the highest-probability macro count. If the macro count implies continuation, project the next impulsive wave and its subwaves. If the macro count implies correction, project the most likely complex corrective structure (`A-B-C`, `W-X-Y`, flat, triangle, double three, or triple three). Do not publish isolated fib levels without a count path that explains why those levels matter.

### 7. Decide Posture

Use one of four posture labels:

- `BULLISH`: primary structure supports upside continuation and risk can be defined.
- `BEARISH`: primary structure supports downside continuation and risk can be defined.
- `ACCUMULATION`: macro thesis is positive, but timing remains corrective or early.
- `STAND ASIDE`: count unresolved, price mid-structure, or no execution edge.

Then select the Castaway trade model:

- `Model 1`: macro Wave 1 up followed by Wave 2 down.
- `Model 1.2`: nested 1-2 / i-ii after the macro Wave 2 holds.
- `Model 2.2`: micro flat pullback after the first push.
- `Model 3`: triangle after the first push.
- `Model 4`: breakout confirmation.
- `Model 5`: reward-risk management using 123.6%, 223.6%, and 423.6% of risk.
- `Model 6`: stand aside.

Use inverse logic for shorts. If the selected model is Model 6, or if no model can be selected with a defined trigger and stop, block trade language.

## Chart Proof Workflow

Use 2-4 clean screenshots rather than one overloaded chart.

1. Macro structure chart: full campaign, primary macro count, visible subwaves inside macro waves, regime header, flip level, hard invalidation, major target or demand/supply zone.
2. Projection map: highest-probability macro-following path, either impulsive continuation or complex correction, active wave, target cluster, alternate trigger, hard invalidation, forward structural path.
3. Alternate count chart: required when conviction is below roughly 75% or Count #2 changes posture.
4. Wave anatomy chart: use when internals matter, especially A of 3, B of 3, C of 3, Wave 4, or Wave 5.
5. Risk architecture chart: only when there is a live trade with entry, stop, target, and risk/reward.

Capture each chart with `capture_screenshot`. If producing a Markdown report, embed screenshots inline with package-relative Markdown image links.

Preserve macro proof across the screenshot set. Once the macro Elliott count is drawn, do not delete it to make the projection map cleaner unless the user explicitly asks for a clean-only projection chart; if it must be hidden or removed, recreate and verify the macro Elliott layer before final delivery.

## Drawing Grammar

- `elliott_impulse_wave` or `elliott_correction`: use when the drawing API supports it cleanly.
- `trend_line`: wave legs, subwave legs, channels, forward paths, and invalidation routes.
- `horizontal_line`: non-count decision levels only, such as hard invalidation, flip levels, Wave 3 floor, or target cluster boundaries. Never use horizontal lines as wave-count legs or as a substitute for wave structure.
- `rectangle`: target boxes, retracement zones, invalidation zones, accumulation/support zones.
- `text`: compact labels such as `W1`, `W2`, `A of 1`, `B of 1`, `C of 1`, `A of 3`, `B of 3`, `C of 3`, `W4`, `A of 5`, `B of 5`, `C of 5`, `W5`, `Alt trigger`, `Hard invalidation`, `Target cluster`, `Complex correction`, `Stand aside`.

Avoid clutter. Label only pivots that affect the count or decision.

## Evidence JSON Contract

When producing `evidence.json`, include these top-level sections:

- `evidence_contract`
- `asset_context`
- `analysis_checklist`
- `chart_prep`
- `screenshots`
- `timeframe_summaries`
- `primary_count`
- `alternate_counts`
- `pivot_map`
- `ratio_model_selection`
- `ratio_validation`
- `rule_validation`
- `corrective_structure`
- `alternation`
- `projection_targets`
- `invalidation_and_flip_levels`
- `wave_b_invalidation_ladder`
- `trade_posture`
- `castaway_trade_model`
- `validation_log`
- `no_trade_gate`
- `red_team`
- `review_triggers`
- `missing_evidence`
- `confidence`

The package is not complete until `npm run validate:hew -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/evidence.json` passes.

## Report Format

For `analysis_journal` outputs, use one package per symbol and keep the top level minimal:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
  journal.md
  evidence.json
  screenshots/
```

Use this structure unless the user asks for something shorter:

```markdown
# HEW Structural Read: [SYMBOL]

## Thesis
[Primary count, active wave, posture, and the one level that changes the thesis.]

## Multi-Timeframe Count Map
| Timeframe | Count State | Active Wave | Evidence | Invalidation |
|-----------|-------------|-------------|----------|--------------|

## Primary Count
[Wave sequence and why it is preferred.]

## Alternate Count
[What activates it, what kills it, and what it implies next.]

## Ratio Validation
| Test | Measurement | Required / Target | Actual | Status |
|------|-------------|-------------------|--------|--------|

## Ratio Model Selection
- Selected model:
- Evidence for keeping/upgrading/downgrading:
- Terminal-risk note:

## Rule Validation
| Rule | Requirement | Observed | Status | Trade Impact |
|------|-------------|----------|--------|--------------|

## Projection Targets
- Wave 3:
- C of 3:
- Wave 5:
- Target cluster:

## Corrective Structure and Alternation
[Wave 2/Wave 4 behavior, active correction type, and what is still missing.]

## Invalidation and Flip Levels
- Hard invalidation:
- Flip level:
- Alternate trigger:

## Wave-B Invalidation Ladder
- Wave 1 origin:
- Wave 2:
- B of 3:
- Wave 4:
- B of 5:
- Violation standard:

## Chart Proof
![Macro structure](screenshots/SYMBOL_hew_macro_structure.png)
[What this proves, what confirms it, what invalidates it.]

![Projection map](screenshots/SYMBOL_hew_projection_map.png)
[What this proves, what confirms it, what invalidates it.]

## Trade / Stand-Aside Decision
- Posture:
- Castaway model:
- Valid location:
- Trigger required:
- Stop / invalidation:
- Targets:
- Risk/reward:

## Validation Log
[Traceable numbers and pass/fail conclusions.]

## Red-Team Countercase
[Strongest argument against the primary count and what would prove it.]

## Review Triggers
- Review when:
- Primary scenario should show:
- Downgrade/invalidates if:
- Outcome status:
```

## Decision Rules

- A Wave 3 is not high-conviction unless it reaches at least 176.4% of Wave 1 from Wave 2.
- A serious report must select Model 1, Model 2, or Model 3, or state why the ratio model is unavailable.
- Wave C of 3 should not be shorter or weaker than Wave A of 3.
- Wave 4 must respect B of 3, otherwise the five-wave count is damaged or invalid. The full Wave-B ladder must be checked before trade language is allowed.
- Wave B can be deceptive. Distinguish B inside an impulse from B inside a correction.
- Target zones should be clusters, not isolated ratios.
- Hard invalidation means the count is wrong. Flip level means posture changes.
- Do not use trade language when the setup is only structural. Castaway Model 6 means stand aside, not early entry.
