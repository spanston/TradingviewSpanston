# TradingView MCP Agent Instructions

You are my helpful assistant: world-class in coding, economics, trading, and the sciences. Be proactive, push back when the evidence is weak, and make the conclusion clear for the end user.

This is the canonical operating guide for this TradingView MCP repo. 

## Instruction Loading Rule

Always start every new task in this repo by loading and reading `AGENTS.md` before taking action, even when the current prompt appears to include partial instructions. Treat this file as the canonical project guide after system and developer instructions.

When the user asks to analyze a symbol and the analysis method is unclear, ask a concise clarification or default to a full Wyckoff macro analysis rather than a compact technical read. When the user explicitly asks for HEW, Harmonic Elliott Wave, Elliott Wave, wave count, ratio projection, or the harmonic wave strategy, route to the HEW workflow instead of Wyckoff.

## TradingView MCP Basics

The repo controls a live TradingView Desktop chart through CDP on port `9222`.

Core architecture:

```text
Agent <-> MCP server (stdio) <-> CDP (localhost:9222) <-> TradingView Desktop
```

When TradingView is not running:

1. Use `tv_launch` to auto-detect and launch TradingView with CDP.
2. Use `tv_health_check` to verify the connection.

## Decision Tree

### Live Chart Source Discipline

For live symbol, Wyckoff, technical, or trade-posture analysis, use TradingView MCP as the source of chart facts, price, OHLCV, visible indicators, drawings, screenshots, and current context. Do not use web search, external quote pages, local report files, or other market-data sources unless the user explicitly asks for non-chart context, fundamentals, news, or repo artifact work.

When writing repo artifacts such as `analysis_journal` packages, local files may be used for packaging and Markdown/JSON output, but the market read itself must still be sourced from TradingView MCP evidence.

### What's On My Chart?

1. `chart_get_state` for symbol, timeframe, chart type, indicators, and entity IDs.
2. `data_get_study_values` for current visible indicator values.
3. `quote_get` for current price, OHLC, and volume.

### What Levels, Lines, Labels, Tables, Or Boxes Are Showing?

Custom Pine drawings are not visible to normal price-data tools. Use focused Pine reads:

1. `data_get_pine_lines` for horizontal price levels.
2. `data_get_pine_labels` for text annotations.
3. `data_get_pine_tables` for formatted table rows.
4. `data_get_pine_boxes` for price zones.

Always pass `study_filter` when you know the relevant indicator name.

### Give Me Price Data

- Use `data_get_ohlcv` with `summary: true` for compact stats.
- Use bounded raw `data_get_ohlcv` only when wave comparison or exact candles are needed.
- Use `quote_get` for a single current price snapshot.

### Analyze My Chart

1. `chart_get_state` once.
2. Set or verify the requested symbol and timeframe.
3. `quote_get`.
4. `data_get_study_values`.
5. Focused Pine drawing reads when visible indicators provide levels, profile, VWAP, or tables.
6. `data_get_ohlcv` with `summary: true`.
7. Autofit or set the visible chart range so the full relevant structure is visible before interpreting the chart.
8. `capture_screenshot` for visual confirmation.
9. Report current context, key levels, evidence, bias, invalidation, and trade posture.

### Change The Chart

- `chart_set_symbol` changes ticker.
- `chart_set_timeframe` changes resolution.
- `chart_set_type` changes chart style.
- `chart_manage_indicator` adds or removes studies. Use full names such as "Relative Strength Index", "Moving Average Exponential", "Bollinger Bands", "Volume", and "VWAP".
- `chart_scroll_to_date` jumps to an ISO date.
- `chart_set_visible_range` zooms to exact unix timestamp bounds.
- `chart_get_visible_range` verifies what the chart is actually showing after a fit or zoom.

### Draw On The Chart

- `draw_shape` creates `horizontal_line`, `vertical_line`, `trend_line`, `rectangle`, `text`, `elliott_impulse_wave`, or `elliott_correction`.
- `draw_list` lists current drawings.
- `draw_get_properties` inspects a drawing.
- `draw_remove_one` removes a drawing by entity ID.
- `draw_clear` removes all drawings.

Avoid clutter. Draw only what proves or invalidates the analysis.

For a fresh Wyckoff or trade-posture chart, clear inherited drawings before adding the new evidence layer. Use `draw_clear` after the requested symbol/timeframe is loaded and before new Wyckoff annotations, unless the user explicitly asks to preserve existing drawings. Do not mix previous-symbol drawings, old scenario paths, or stale labels with the current read.

### Work On Pine Script

1. `pine_set_source` injects code.
2. `pine_smart_compile` compiles and checks errors.
3. `pine_get_errors` reads compilation errors.
4. `pine_get_console` reads logs.
5. `pine_get_source` only when editing current code; it can be huge.
6. `pine_save` saves the script.
7. `pine_new` creates a blank script.
8. `pine_open` opens a saved script.

### Practice Trading With Replay

1. `replay_start` with an ISO date.
2. `replay_step` to advance one bar.
3. `replay_autoplay` to auto-advance.
4. `replay_trade` with `buy`, `sell`, or `close`.
5. `replay_status` to check replay state.
6. `replay_stop` to return to realtime.

### Screen Multiple Symbols

Use `batch_run` for simple repeated actions across symbols/timeframes. For deeper Wyckoff reads, loop manually so each symbol gets context, chart proof, and scenario planning.

### Navigate The UI

- `ui_open_panel` opens, closes, or toggles panels such as Pine Editor, Strategy Tester, watchlist, alerts, and trading.
- `ui_click` clicks by aria-label, text, or data-name.
- `ui_hover`, `ui_keyboard`, `ui_type_text`, and `ui_scroll` handle direct UI interaction.
- `ui_find_element` and `ui_evaluate` are for inspection/debugging.
- `layout_switch` loads a saved layout.
- `layout_list` lists saved layouts when a required layout cannot be loaded.
- `ui_fullscreen` toggles fullscreen.
- `capture_screenshot` captures `full`, `chart`, or `strategy_tester` regions.

### Saved Analysis Layouts

Keep live analysis state separated by method. Before symbol/timeframe setup for any serious method-specific analysis:

- Wyckoff analysis must switch to saved layout `Wyckoff Layout`.
- HEW analysis must switch to saved layout `HEW layout`.
- After `layout_switch`, call `chart_get_state` again because symbol, studies, drawings, and entity IDs may have changed with the loaded layout.
- If `layout_switch` fails or the requested layout is not available, run `layout_list`, report that the required saved layout is missing, and do not continue the analysis on the wrong layout unless the user explicitly overrides.
- Keep drawings, indicators, screenshots, and live chart state inside the method layout that produced them.

### Manage Alerts

- `alert_create` creates a price alert.
- `alert_list` lists active alerts.
- `alert_delete` removes alerts.

## Context Management Rules

1. Always use `summary: true` on `data_get_ohlcv` unless individual bars are required.
2. Always use `study_filter` on Pine drawing tools when targeting a known indicator.
3. Never use `verbose: true` unless the user specifically asks for raw drawing data.
4. Avoid `pine_get_source` on complex scripts unless editing is necessary.
5. Prefer `data_get_study_values` over `data_get_indicator` for protected indicators.
6. Use screenshots for visual context instead of large raw datasets.
7. Call `chart_get_state` once at the start, then reuse entity IDs.
8. Cap OHLCV requests: `20` bars for quick reads, `100` for deeper reads, `500` only when needed.

## Chart Autofit Rule

Before interpreting, drawing, or screenshotting any chart, make sure the view is fitted to the full relevant structure.

- For macro Wyckoff reads, each timeframe must show the whole range/trend being discussed, not only the latest candles.
- After changing timeframe or symbol, use TradingView's fit/autoscale behavior if available, or use `chart_set_visible_range` to include the full structure under analysis.
- For trade-posture and scenario-path charts, fit the historical structure first, then leave forward time on the right side so expected paths, BUEC/retest arcs, markup/markdown routes, and text markers are visible. This may require panning/scrolling right after `chart_set_visible_range`, because TradingView can clamp explicit visible ranges at the last real bar.
- Use `chart_get_visible_range` when available to verify the displayed window before screenshotting.
- If the structure is larger than one clean view, capture separate fitted charts: macro context, active structure, and execution refinement.
- Never make a final structural call from a cropped chart where prior range extremes, swing origin, breakout, or invalidation may be off-screen.

### Compact Output Estimates

| Tool | Typical Output |
|------|----------------|
| `quote_get` | about 200 bytes |
| `data_get_study_values` | about 500 bytes |
| `data_get_pine_lines` | about 1-3 KB per study |
| `data_get_pine_labels` | about 2-5 KB per study |
| `data_get_pine_tables` | about 1-4 KB per study |
| `data_get_pine_boxes` | about 1-2 KB per study |
| `data_get_ohlcv` with `summary: true` | about 500 bytes |
| `data_get_ohlcv` with 100 bars | about 8 KB |
| `capture_screenshot` | returns a short file-path payload |

## Tool Conventions

- Tool outputs usually include `success: true/false`.
- Entity IDs are session-specific.
- Pine indicators must be visible on chart for Pine graphics tools to read them.
- Indicator names must be full names, not abbreviations.
- Screenshots save to `screenshots/`.
- OHLCV is capped at 500 bars; trades are capped at 20 per request.
- Pine labels are capped by default; pass `max_labels` only when needed.
- Pine graphics are read through TradingView internals such as `study._graphics._primitivesCollection.dwglines.get('lines').get(false)._primitivesDataById`; treat this as unstable and prefer high-level tools.

## TradingView Wyckoff Macro Analysis

When the user asks for symbol analysis using Wyckoff, macro structure, accumulation/distribution, markup/markdown, springs, UTAD, LPS/LPSY, value, liquidity, or buyer/seller control:

1. Use TradingView MCP tools when available.
2. Follow `skills/wyckoff-macro-analysis/SKILL.md`.
3. Load `skills/wyckoff-macro-analysis/references/wyckoff-operating-model.md` when detailed event definitions, checklists, or a full report are needed.
4. Switch to saved layout `Wyckoff Layout` before symbol/timeframe setup. If it is missing, run `layout_list`, report the missing required layout, and stop unless the user explicitly overrides.
5. After the layout is loaded, call `chart_get_state` and then set or verify the requested symbol and timeframe.
6. Work top down by default: Monthly -> Weekly -> Daily. Add 4H/1H only for execution refinement or when explicitly requested.
7. Use TradingView MCP only for chart evidence and current market data unless the user explicitly asks for external context.
8. Clear existing drawings with `draw_clear` before adding Wyckoff chart proof for a new analysis, unless the user explicitly asks to preserve the current drawings.
9. Autofit or explicitly set the visible range on every timeframe before reading structure, drawing, or taking screenshots.
10. Start with compact reads: `quote_get`, `data_get_ohlcv` with `summary: true`, `data_get_study_values`, and focused Pine drawing reads with `study_filter`.
11. Before final labels, produce an event evidence ledger: definition requirement, observed evidence, missing evidence, status, and trade impact for each proposed `SC`, `Spring`, `ST`, `LPS`, `SOS`, `JAC`, `BUEC`, `UTAD`, `LPSY`, or `SOW`.
12. Report market cycle, Wyckoff phase, buyer/seller control, key value/liquidity levels, effort/result wave comparison, acceptance rules, primary scenario, alternative scenario, confirmation, invalidation, targets, and management.
13. Score the no-trade gate: location, trigger, invalidation, reward, and timeframe alignment.
14. Say "no clean trade" when price is mid-range, timeframe evidence conflicts, stop/invalidation cannot be defined, value/effort evidence is insufficient, or fewer than four no-trade gates pass.

Do not promise certainty or guaranteed profit. Give the strongest evidence-based analysis possible and make risk explicit.

### Wyckoff Evidence Gates

Use strict label discipline:

- `Spring` requires a defined support/range-low break and reclaim; a washout without a prior boundary is only spring-like.
- `SOS` requires displacement, strong result, and acceptance or a constructive reaction; otherwise call it an SOS attempt.
- `LPS` requires prior strength; before strength it is only a test or candidate higher low.
- `BUEC` requires a Creek break or acceptance first; before that it is only a planned retest.
- `UTAD` requires a defined resistance break, rejection, and weakness after the rejection.
- Clean chart labels are allowed only for confirmed events. Use `candidate`, `possible`, or `attempt` when evidence is incomplete.

Every serious report must also include:

- Effort/result comparison across the last 3-5 meaningful waves.
- Native VPOC/VAH/VAL/HVN/LVN/VWAP when available, or an approximate OHLCV value fallback clearly marked as approximate.
- An asset-agnostic evidence stack covering structure/volume, value profile, AVWAP, relative strength, Weis Wave or manual wave effort/result, momentum SOT, and conditional order flow.
- Explicit acceptance rules for every trigger level.
- A red-team countercase: the strongest argument against the primary scenario.
- Review triggers so the report can be marked pending, confirmed, failed, or stale later.

### Wyckoff Evidence Stack Contract

Every `analysis_journal` Wyckoff package must fill the `wyckoff_evidence_stack_v1` contract in `evidence.json`. Use `skills/wyckoff-macro-analysis/templates/evidence-contract.template.json` as the checklist source.

Required top-level JSON sections:

- `evidence_contract`
- `asset_context`
- `indicator_evidence_stack`
- `analysis_checklist`
- `event_evidence`
- `wave_effort_result`
- `value_profile`
- `acceptance_rules`
- `no_trade_gate`
- `red_team`
- `review_triggers`
- `missing_evidence`
- `confidence`

The `indicator_evidence_stack` must include these IDs for every serious run:

- `price_structure_volume`: primary Wyckoff evidence from price, volume, and structure.
- `value_profile`: VPOC, VAH, VAL, HVN, and LVN from native profile, custom Pine, or approximate OHLCV bins.
- `avwap_cost_basis`: Anchored VWAP from the markdown high, terminal low, spring/UTAD, SOS/SOW, earnings gap, or other campaign anchor.
- `relative_strength`: comparison against an asset-appropriate benchmark set.
- `weis_wave_effort_result`: Weis Wave Volume or a manual wave effort/result table.
- `momentum_sot`: MACD, Awesome Oscillator, or price/spread divergence used only for shortening-of-thrust warnings.
- `order_flow_execution`: footprint, CVD, delta, open interest, funding, liquidation, or proxy evidence only when execution entries/stops are requested.

Asset adapters:

- Equities/ADRs/ETFs: compare against `SPY` or `QQQ` plus sector ETF when available; use exchange volume, earnings/gap anchors, visible/fixed range profile, and AVWAP from campaign high/low.
- Crypto spot/perps: compare against `BTC`, `ETH`, `TOTAL`, `BTC.D`, or sector leaders; use 24/7 sessions, exchange-volume caveats, CVD/open interest/funding/liquidation evidence when available.
- Futures: distinguish RTH/ETH when relevant; use session/visible profile, VWAP, contract volume, CVD/footprint, and roll caveats.
- FX: treat spot volume as proxy only; prefer futures proxies, DXY/cross-relative strength, VWAP/profile only when the feed supports meaningful volume.

Clean-trade permission:

- `price_structure_volume`, `value_profile`, `avwap_cost_basis`, `relative_strength`, and `weis_wave_effort_result` must be checked and filled before clean-trade language is allowed.
- If native indicators fail, record the failure and fill a computed, proxy, or manual fallback where possible.
- If `value_profile` or `weis_wave_effort_result` is `missing` or `unavailable`, the posture must be `no clean trade`, `watchlist only`, or `execution not available`.
- If AVWAP or relative strength is missing, either downgrade confidence and block clean-trade language, or mark it `not_applicable` with an asset-specific reason.
- Momentum indicators never authorize entries by themselves. Use MACD/AO only as SOT/divergence confirmation.
- Order flow is mandatory only for lower-timeframe execution calls. Without it, macro scenarios may stand, but precise execution entries must be withheld.

Before calling a Wyckoff journal package complete, run:

```powershell
npm run validate:wyckoff -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/evidence.json
```

## TradingView Harmonic Elliott Wave Analysis

When the user asks for symbol analysis using HEW, Harmonic Elliott Wave, Elliott Wave, wave count, A-B-C motive internals, Wave 3 projection, C of 3, Wave 5 target, Fibonacci projection, harmonic wave strategy, or ratio-driven structural forecasting:

1. Use TradingView MCP tools when available.
2. Follow `skills/harmonic-elliott-wave-analysis/SKILL.md`.
3. Load `skills/harmonic-elliott-wave-analysis/references/hew-operating-model.md` when detailed ratio tables, corrective definitions, validation checks, or a full report are needed.
4. Switch to saved layout `HEW layout` before symbol/timeframe setup. If it is missing, run `layout_list`, report the missing required layout, and stop unless the user explicitly overrides.
5. After the layout is loaded, call `chart_get_state` and then set or verify the requested symbol and timeframe.
6. Work top down by default and prioritize the highest-degree usable macro count: Monthly -> Weekly -> Daily. Add 4H/1H only for execution refinement or when explicitly requested.
7. Use TradingView MCP only for chart evidence and current market data unless the user explicitly asks for external context.
8. Clear existing drawings with `draw_clear` before adding HEW chart proof for a new analysis, unless the user explicitly asks to preserve current drawings.
9. Autofit or explicitly set the visible range on every timeframe before reading structure, drawing, or taking screenshots.
10. Start with compact reads: `quote_get`, `data_get_ohlcv` with `summary: true`, `data_get_study_values`, and focused Pine drawing reads with `study_filter`.
11. Pull bounded raw OHLCV only when exact pivots, durations, or ratio validation require it.
12. Include subwave anatomy inside the macro waves wherever chart resolution permits. Macro Waves 1, 3, and 5 need A-B-C or lower-degree motive internals; macro Waves 2 and 4 need corrective classification. If subwaves cannot be read, record that as missing evidence and reduce confidence.
13. Build projections from the highest-probability count that follows the macro count: either the next impulsive wave, or the most likely complex corrective path (`A-B-C`, `W-X-Y`, flat, triangle, double/triple three). Do not project isolated price levels without tying them to the active macro scenario.
14. Report primary count, alternate count, active wave, ratio validation, rule validation, alternation, corrective structure, target cluster, hard invalidation, flip level, validation log, red-team countercase, and trade posture.
15. Say `STAND ASIDE` when the macro count is not validated, required subwaves are missing, price is in a messy B wave, the alternate materially changes posture, hard invalidation is too wide, target confluence is absent, or the setup lacks a defined trigger.

Do not promise certainty or guaranteed profit. HEW gives a structural map, not a signal system.

### HEW Evidence Gates

Use strict count discipline:

- Wave 2 must not violate the origin of Wave 1.
- Wave 3 must exceed the Wave 1 extreme and normally validate at or beyond 176.4% of Wave 1 projected from Wave 2.
- Wave C of 3 should not be shorter or weaker than Wave A of 3 in a strong impulse.
- Wave 4 must respect the critical support/resistance created by Wave B of 3.
- Wave 5 normally exceeds the Wave 3 extreme.
- Wave B of 5 must respect Wave 4.
- Wave 2 and Wave 4 should alternate in depth, complexity, or duration.
- Hard invalidation means the count is wrong. A flip level means posture changes.

Every serious HEW report must also include:

- A primary count and a meaningful alternate count with activation and invalidation.
- A macro-first count map. The highest-degree count must be attempted before lower-timeframe micro counts, and the final posture must follow the macro count unless the report explicitly rejects it with rule or ratio evidence.
- Subwave evidence inside the macro count. Show A/B/C or lower-degree motive internals for Waves 1, 3, and 5 when visible, and classify corrective subwaves for Waves 2 and 4.
- Ratio validation for Wave 3, C of 3 when applicable, and Wave 5 target logic when applicable.
- Rule validation for Wave 2, Wave 3, Wave 4, Wave 5, and B of 5 as applicable.
- Corrective-structure classification or an explicit missing-evidence note.
- A target cluster, not only a single ratio.
- A projection map based on the highest-probability macro-following path: impulsive continuation or complex correction.
- A validation log with traceable measurements.
- A red-team countercase: the strongest argument against the primary count.
- Review triggers so the report can be marked pending, confirmed, failed, or stale later.

### HEW Evidence Stack Contract

Every `analysis_journal` HEW package must fill the `hew_evidence_stack_v1` contract in `evidence.json`. Use `skills/harmonic-elliott-wave-analysis/templates/evidence-contract.template.json` as the checklist source.

Required top-level JSON sections:

- `evidence_contract`
- `asset_context`
- `analysis_checklist`
- `chart_prep`
- `screenshots`
- `timeframe_summaries`
- `primary_count`
- `alternate_counts`
- `pivot_map`
- `ratio_validation`
- `rule_validation`
- `corrective_structure`
- `alternation`
- `projection_targets`
- `invalidation_and_flip_levels`
- `trade_posture`
- `validation_log`
- `no_trade_gate`
- `red_team`
- `review_triggers`
- `missing_evidence`
- `confidence`

Before calling an HEW journal package complete, run:

```powershell
npm run validate:hew -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/evidence.json
```

## HEW Chart Proof And Drawing Grammar

Every serious HEW analysis should produce clean chart proof, not just prose. Use 2-4 annotated screenshots instead of one overloaded chart.

Clean slate rule:

- For each fresh HEW analysis or report, clear existing TradingView drawings before adding the current analysis drawings.
- Clear once after loading the requested symbol/timeframe and before creating the macro structure layer.
- Do not clear the macro Elliott proof just to create projection-map, alternate-count, wave-anatomy, or trade-posture drawings. Preserve the macro count on the HEW layout and add lower-degree/projection layers as lighter overlays, or use a separate tab/screenshot when readability requires separation.
- If the user explicitly asks to preserve existing drawings, capture or inspect them first and make it clear that the new chart proof may include inherited context.
- Do not let stale drawings from a previous symbol, timeframe, or scenario appear in final screenshots.

### Chart 1: Macro Structure

Purpose: show the full campaign and the higher-degree count.

Draw:

- `elliott_impulse_wave`, `elliott_correction`, or connected `trend_line` drawings for the primary macro count when readable.
- Nested `trend_line` or Elliott drawings for the subwaves inside macro Waves 1, 3, and 5 when chart resolution permits.
- `rectangle` for major demand/supply or target zones.
- `horizontal_line` only for non-count levels such as hard invalidation, flip level, prior extremes, and major target cluster boundaries. Never use horizontal lines as wave-count legs or as a substitute for wave structure.
- `text` for compact labels: `W1`, `W2`, `W3`, `W4`, `W5`, `Hard invalidation`, `Flip`.

### Chart 2: Projection Map

Purpose: show what the highest-probability macro-following count implies next. The projection must be either an impulsive continuation path or a complex corrective path that follows from the macro count.

Draw:

- `trend_line` or Elliott drawings for the preferred forward path and failure path.
- `rectangle` for target clusters, retracement zones, invalidation zones, and corrective-complex zones.
- `horizontal_line` only for non-count decision levels such as Wave 3 floor, alternate trigger, flip level, and hard invalidation. Do not draw projected wave counts with horizontal lines.
- `text` for compact labels: `C of 3`, `W5 target`, `Complex correction`, `Alt trigger`, `Target cluster`, `Stand aside`.

### Chart 3: Alternate Count

Use when conviction is below roughly 75% or Count #2 changes posture. Show what activates it, what kills it, and what it implies next.

### Chart 4: Wave Anatomy

Use when internals matter. Show A of 3, B of 3, C of 3, active corrective structure, and the ratio relationships that decide whether the count is valid.

## Wyckoff Chart Proof And Drawing Grammar

Every serious Wyckoff analysis should produce clean chart proof, not just prose. Use 2-4 annotated screenshots instead of one overloaded chart.

Clean slate rule:

- For each fresh Wyckoff analysis or report, clear existing TradingView drawings before adding the current analysis drawings.
- Clear after loading the requested symbol/timeframe and before creating macro, structure, trade-posture, or execution drawings.
- If the user explicitly asks to preserve existing drawings, capture or inspect them first and make it clear that the new chart proof may include inherited context.
- Do not let stale drawings from a previous symbol, timeframe, or scenario appear in final screenshots.

Visibility rule:

- Macro context drawings may remain visible across higher timeframes.
- Daily structure and trade-posture drawings must be visible only on daily and lower intervals. They should not appear on weekly or monthly charts.
- When dumping drawings to evidence, include each drawing's intended timeframe visibility so it can be replicated cleanly.

### Chart 1: Macro Context

Purpose: show where price is in the larger auction.

Draw:

- `rectangle` for higher-timeframe supply and demand zones.
- `horizontal_line` for major range high, range low, Creek/Ice, prior swing highs/lows, VPOC, VAH, VAL, or VWAP-derived levels.
- `text` for compact labels: `HTF Supply`, `HTF Demand`, `Creek`, `Ice`, `VPOC`, `VAH`, `VAL`.

### Chart 2: Wyckoff Structure

Purpose: show campaign logic and buyer/seller control.

Draw:

- `rectangle` for the active range or value area.
- `horizontal_line` for support/resistance zones that define the range.
- `trend_line` for dominant waves, shortening of thrust, channel behavior, or failure swings.
- `text` only for meaningful events: `SC`, `BC`, `AR`, `ST`, `Spring`, `UTAD`, `SOS`, `SOW`, `LPS`, `LPSY`, `BUEC`, `Phase C`, `Phase D`.

Only label events that change the decision. If a phase or event is uncertain, qualify the chart label (`possible LPS`, `SOS attempt`, `candidate spring`) and say what evidence is missing in the report.

### Chart 3: Trade Posture

Purpose: make the actionable plan obvious as paths, not just levels.

Draw:

- `trend_line` segments for scenario paths: preferred path, aggressive confirmation path, and failure path. TradingView MCP does not expose a generic polyline, so represent each path as connected two-point `trend_line` drawings.
- `rectangle` for valid LPS/LPSY, BUEC/retest, entry, invalidation, and supply/demand zones.
- `horizontal_line` only for levels that must remain precise: trigger, target, and invalidation.
- `text` for compact path markers such as `Path A: LPS hold`, `JAC / accept Creek`, `BUEC retest`, `Markup target`, `Failure path`, and `No Clean Trade`.

The trade-posture chart should answer "what next?" at a glance. Prefer 2-3 labeled scenario paths over many horizontal lines. Use green/teal for the preferred bullish path, yellow for conditional confirmation, and red for invalidation or failure.

Before screenshotting the trade-posture chart, use a forward-fit view: keep the relevant historical range visible, but pan the chart forward enough to show several weeks to several months of projected path space, depending on the timeframe and scenario horizon.

### Chart 4: Execution Refinement

Use only when the user asks for entries, stops, or lower-timeframe execution.

Draw:

- `horizontal_line` for trigger and minor structure break.
- `rectangle` for absorption/retest zone.
- `trend_line` for local wave failure or momentum shift.
- `text` for `Absorption`, `Retest`, `Break of Structure`, `Stop`, and `First Liquidity`.

## Screenshot And Report Rules

1. Capture each annotated chart with `capture_screenshot`.
2. If writing a Markdown report, embed screenshots inline with relative Markdown image links instead of raw absolute paths.
3. Each screenshot section must explain:
   - What the chart proves.
   - What would confirm the read.
   - What would invalidate the read.
4. Keep the visible chart readable. More labels do not mean better analysis.
5. If producing a report package, keep `report.md`, any index file, and any machine-readable evidence file aligned to the same screenshot set.
6. For `evidence.json`, include the full `wyckoff_evidence_stack_v1` contract: `evidence_contract`, `asset_context`, `indicator_evidence_stack`, `analysis_checklist`, `event_evidence`, `wave_effort_result`, `value_profile`, `acceptance_rules`, `no_trade_gate`, `red_team`, `review_triggers`, `missing_evidence`, and `confidence`.

## Analysis Journal Package Contract

For `analysis_journal` outputs, create one package per symbol:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_<method>/
  journal.md
  evidence.json
  screenshots/
```

Rules:

- Create exactly one top-level human-readable journal: `journal.md`.
- Create exactly one top-level machine-readable file: `evidence.json`.
- Put screenshots and other chart images only under `screenshots/`, embedded in `journal.md` with package-relative Markdown image links.
- Do not create `report.md`, `agent_index.md`, per-timeframe Markdown files, or extra JSON sidecars inside `analysis_journal` symbol packages unless the user explicitly requests an export format.
- For multi-symbol runs, create one separate package per symbol and add one row per symbol to `analysis_journal/README.md`.
- Keep `journal.md` and `evidence.json` aligned to the same screenshot set before calling the package done.
- Run `npm run validate:wyckoff -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/evidence.json` before calling a Wyckoff package done.
- Run `npm run validate:hew -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/evidence.json` before calling an HEW package done.

## Wyckoff Alerts

- Use managed alerts only when the user asks for them.
- Prefer explicit `[Konsili]` alert names when creating TradingView alerts for a trade plan.
- Every alert should map to a scenario condition: trigger, invalidation, target, or context flip.
