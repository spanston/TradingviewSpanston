---
name: wyckoff-macro-analysis
description: Perform multi-timeframe macro Wyckoff analysis in TradingView using price, volume, value, liquidity, and scenario planning. Use when the user asks for Wyckoff, accumulation, distribution, markup, markdown, springs, UTAD, LPS, LPSY, buyer/seller control, or macro chart analysis of a symbol.
---

# Wyckoff Macro Analysis

You are producing an evidence-led Wyckoff read of a TradingView symbol. The goal is to identify who controls the auction now, where the path of least resistance is, and where the user can participate only if risk is definable.

Do not force labels. Wyckoff labels are useful only when they explain behavior. If the structure is unclear, say so and give the conditions that would clarify it.

For detailed definitions and checklists, load `references/wyckoff-operating-model.md`.

## Operating Standards

- Use TradingView MCP as the source of live chart facts, current price, OHLCV, visible indicators, drawings, and screenshots. Do not use web search, external quote pages, or local report files for the market read unless the user explicitly asks for non-chart context such as fundamentals or news.
- Read the market by price, volume, structure, value, and liquidity. News and opinions are secondary unless the user asks for macro/fundamental context.
- Start from context before entries. A lower-timeframe trigger is weaker if it runs straight into higher-timeframe supply or demand.
- Separate evidence from scenario. Use words like "confirmed", "probable", "possible", and "invalidated" deliberately.
- Never promise profit or certainty. Give a risk-defined trading posture, not a guarantee.
- Prefer "no clean trade" when price is mid-range, context conflicts, or invalidation is not obvious.
- Update bias when the latest meaningful imbalance contradicts the prior scenario.
- Apply evidence gates before labels. Do not write clean labels such as `Spring`, `SOS`, `LPS`, `UTAD`, `LPSY`, `JAC`, or `BUEC` unless the event is confirmed by the event evidence ledger. Until then, use `candidate`, `possible`, or `attempt`.
- Make effort/result, value/liquidity, acceptance rules, a no-trade gate, and a red-team pass mandatory for serious reports.
- For every `analysis_journal` package, fill the `wyckoff_evidence_stack_v1` JSON contract. Use `templates/evidence-contract.template.json` as the checklist source and run `npm run validate:wyckoff -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/evidence.json` before calling the package done.

## Default Timeframe Stack

For macro analysis, work top down:

1. Monthly: market cycle, major cause/effect, macro supply and demand.
2. Weekly: dominant range/trend, major Wyckoff phase, high-volume acceptance/rejection.
3. Daily: current campaign, recent shakeout, SOS/SOW, LPS/LPSY, breakout acceptance.
4. 4H/1H: execution refinement only when the user asks for entries, stops, or an actionable trade plan.

For intraday futures or very short-term requests, compress the stack to Weekly -> Daily -> 4H -> 1H/15m, but keep the same top-down logic.

## TradingView MCP Workflow

Use compact data first, then pull more only when structure needs it.

1. `layout_switch` to the saved layout `Wyckoff Layout` before symbol/timeframe setup so live Wyckoff drawings, indicators, and screenshots stay separate from HEW work.
2. If `Wyckoff Layout` cannot be loaded, run `layout_list`, report that the required saved layout is missing, and stop unless the user explicitly tells you to continue on another layout.
3. `chart_get_state` after the layout switch to confirm current symbol, timeframe, visible indicators, drawings, and new entity IDs.
4. `chart_set_symbol` if the requested symbol is not already loaded.
5. For any fresh annotated Wyckoff analysis, clear existing drawings with `draw_clear` after the requested symbol is loaded and before creating new chart proof, unless the user explicitly asks to preserve existing drawings. Do not clear drawings for read-only inspection tasks or when the user is asking about drawings already on the chart.
6. For each analysis timeframe:
   - `chart_set_timeframe`
   - autofit the chart or use `chart_set_visible_range` so the entire structure under analysis is visible
   - for trade-posture or scenario-path screenshots, fit the historical structure first, then pan/scroll forward to leave right-side time for the expected path. TradingView may clamp explicit visible ranges at the last real bar, so use UI panning when needed.
   - verify the displayed window with `chart_get_visible_range` when available
   - `quote_get`
   - `data_get_ohlcv` with `summary: true`
   - `data_get_study_values` if indicators are visible
   - `data_get_pine_lines`, `data_get_pine_labels`, `data_get_pine_tables`, and `data_get_pine_boxes` with `study_filter` when a relevant profile, VWAP, session, or level indicator is visible
   - `capture_screenshot` for visual evidence when writing a report or when the chart context is ambiguous
7. Add indicators only when useful and not already present:
   - "Volume"
   - "VWAP"
   - a visible-range or session volume profile if available on the user's TradingView plan/layout
8. If wave comparison, value fallback, or phase labeling needs more detail, pull bounded OHLCV bars for that timeframe. Keep requests focused:
   - 20 bars for quick current context
   - 100 bars for active campaign wave comparison
   - 300-500 bars only when macro range boundaries or value fallback need it
7. If native profile/VWAP values are unavailable, compute an approximate value fallback from bounded OHLCV bars and label it as approximate:
   - approximate VPOC from volume-weighted price bins
   - HVN/LVN zones from high/low volume bins
   - range midpoint, range high, and range low
   - note what was unavailable and how confidence is affected

## Mandatory Evidence Stack

Treat indicators as evidence providers, not as signals. Price structure and volume are primary. Every serious run must fill `indicator_evidence_stack` with these IDs:

| ID | Purpose | Preferred Source | Fallback | Rule |
|---|---|---|---|---|
| `price_structure_volume` | Core Wyckoff read | TradingView MCP quote/OHLCV | None | Mandatory and highest priority |
| `value_profile` | Accepted value/liquidity | Native fixed/visible Volume Profile | Custom Pine table or OHLCV binned profile | Missing or unavailable blocks clean-trade language |
| `avwap_cost_basis` | Dynamic institutional cost basis | Anchored VWAP at campaign anchors | Computed AVWAP from OHLCV | Missing usually blocks clean-trade language unless asset-specific `not_applicable` is justified |
| `relative_strength` | Sponsorship/leadership | Ratio versus benchmark/sector | Manual swing comparison | Missing usually blocks clean-trade language unless asset-specific `not_applicable` is justified |
| `weis_wave_effort_result` | Automated effort/result | Weis Wave Volume | Manual 3-5 wave table | Mandatory for serious reports |
| `momentum_sot` | Shortening-of-thrust warning | MACD/AO divergence | Price slope/spread divergence | Secondary only; never an entry trigger |
| `order_flow_execution` | Entry confirmation at zones | Footprint/CVD/delta/OI/funding/liquidations | Volume/spread proxy | Mandatory only for lower-timeframe execution entries/stops |

If a native study fails to expose data through MCP, record the failure, then fill the fallback. Do not silently omit it. If the fallback is also unavailable, put the missing evidence into both `indicator_evidence_stack` and `missing_evidence`, then downgrade the trade posture.

## Asset Adapters

Select the asset adapter before interpreting indicator evidence and record it in `asset_context`.

- Equities, ADRs, and ETFs: use exchange volume; compare relative strength against `SPY` or `QQQ` plus a sector ETF when available; use earnings gaps, campaign highs/lows, spring/UTAD bars, and SOS/SOW bars as AVWAP anchors.
- Crypto spot and perps: use 24/7 sessions; compare against `BTC`, `ETH`, `TOTAL`, `BTC.D`, or sector leaders; treat exchange-volume differences explicitly; use CVD, open interest, funding, liquidation, and spot/perp divergence when available for execution.
- Futures: separate RTH/ETH when it changes the read; use session/visible profiles, VWAP, contract volume, CVD/footprint, and roll caveats.
- FX: spot volume is proxy evidence only; prefer futures proxies, DXY/cross-relative strength, and volume/profile only when the feed makes those measurements meaningful.

Clean-trade language is allowed only when the evidence contract permits it. A macro watchlist scenario can survive missing order flow. A precise execution entry cannot.

## Chart Proof Workflow

For serious Wyckoff reads, illustrate the analysis with 2-4 clean annotated screenshots rather than one overloaded chart.

Clean chart proof starts from a clean drawing state. Before adding Wyckoff drawings for a new symbol, new report, or fresh trade-posture update, call `draw_clear` after the symbol is loaded. Skip this only when the user explicitly asks to preserve current drawings or when the task is to inspect existing drawings. If preserving drawings, state that the chart proof may include inherited annotations.

Before every screenshot, fit the chart so the full relevant structure is visible. For trade-posture path charts, keep the historical structure visible and also leave forward time on the right side for the projected path over the next few weeks or months. If one view cannot show both the macro range and the local trigger cleanly, split them into separate screenshots.

1. Macro context chart: higher-timeframe supply/demand, major range high/low, Creek/Ice, swing levels, and value/profile levels.
2. Wyckoff structure chart: active range, key waves, confirmed events, and current phase.
3. Trade posture chart: valid entry zone, trigger, invalidation, target levels, and no-trade zone when relevant.
4. Execution chart: optional 4H/1H/15m refinement only when the user asks for entries, stops, or execution timing.

Capture each chart with `capture_screenshot`. If producing a Markdown report, embed screenshots inline with relative Markdown image links instead of listing raw absolute paths.

## Drawing Grammar

Use TradingView drawings as evidence, not decoration.

One drawing layer should belong to one current analysis. Do not reuse stale drawings from a prior symbol, timeframe, or scenario. If a chart already has drawings, clear them before drawing the Wyckoff evidence layer unless the user asked to preserve or compare them.

- `rectangle`: supply zones, demand zones, value areas, active ranges, entry zones, invalidation zones, absorption/retest zones.
- `horizontal_line`: range high/low, Creek, Ice, VPOC, VAH, VAL, VWAP references, trigger levels, targets, invalidation. Use these sparingly on the trade-posture chart so levels do not bury the plan.
- `trend_line`: wave progress, shortening of thrust, channel behavior, failure swings, local break of structure, and expected scenario paths. For trade posture, build connected multi-segment paths from two-point `trend_line` drawings because the MCP drawing API does not expose a generic polyline.
- `text`: compact decision labels such as `Spring`, `UTAD`, `SOS`, `SOW`, `LPS`, `LPSY`, `BUEC`, `Trigger`, `Invalidation`, `Target 1`, `No Clean Trade`.

Do not mark every possible event. Label only the events that change the decision. If a phase is uncertain, state the uncertainty in the report rather than forcing a label onto the chart. If an event has not passed the evidence gate, include the qualifier in the chart label, such as `possible LPS`, `SOS attempt`, or `candidate spring`.

Trade posture rule:

- Prefer 2-3 forward scenario paths over a stack of horizontal lines.
- Set the screenshot viewport forward in time after fitting the historical range, so the path does not end at the right edge of the chart.
- Path A should show the preferred Wyckoff route, such as pullback into LPS, JAC, BUEC, then markup.
- Path B can show the alternate confirmation route, such as immediate breakout then BUEC.
- The failure path should show what invalidation looks like after the key level is lost.
- Place text markers at the decision points so the chart reads as a plan: `LPS hold`, `JAC`, `BUEC`, `Markup target`, `Lose LPS`, `Context flip`.

Timeframe visibility:

- Macro context drawings can remain visible across macro timeframes.
- Daily structure and trade-posture drawings must be restricted to daily and lower intervals, hidden on weekly/monthly.
- Evidence JSON must include the visibility policy or exact interval visibility settings needed to recreate each layer.

## Analysis Process

### 1. Define Environment

Classify each timeframe as:

- Accumulation or reaccumulation
- Markup
- Distribution or redistribution
- Markdown
- Balance/random range
- Unclear

Mark the prior trend, current range/trend, major highs/lows, value area, and obvious liquidity pools.

### 2. Map Structure

Identify:

- Range high and low as zones, not exact lines
- Creek for bullish structures and Ice for bearish structures
- Major swing highs/lows
- Phase A stopping action, if present
- Phase B cause-building, if present
- Phase C test: spring, terminal shakeout, UTAD, LPS, or LPSY
- Phase D confirmation: SOS/SOW, JAC, BUEC, breakdown retest
- Phase E trend behavior after breakout

### 3. Read Control

Compare buyer and seller evidence:

- Projection: which side makes better progress?
- Depth: are reactions shallow or deep?
- Speed: is urgency increasing or fading?
- Volume: is effort producing result, absorption, or exhaustion?
- Location: did failure occur at a range extreme, value edge, VWAP, VPOC, HVN/LVN, or prior swing?
- Latest imbalance: what happened after the most recent spring, UTAD, breakout, or breakdown?

For serious reports, include an effort/result wave table comparing at least the last 3-5 meaningful waves. For each wave record direction, start/end area, distance or percentage, duration in bars, volume versus average, spread/result, reaction, and conclusion. If only summaries are available, say the comparison is qualitative and lower confidence.

### 4. Use Value and Liquidity

When Volume Profile or VWAP information is available, include:

- VPOC as the main accepted price
- VAH/VAL as value boundaries
- HVNs as acceptance/magnet zones
- LVNs as rejection/fast-move zones
- VWAP as dynamic value

Best Wyckoff/value confluence examples:

- Spring below VAL followed by reclaim
- UTAD above VAH followed by rejection
- BUEC holding near prior Creek plus VAH/VPOC
- LPSY failing near broken Ice plus VPOC
- Trend pullback holding VWAP or an HVN in trend direction

If value tools are unavailable, provide the approximate fallback and mark it clearly. Do not pretend approximate value levels have the same authority as native Volume Profile or VWAP.

### 5. Build Scenarios

Always provide:

- Primary scenario
- Alternative scenario
- Confirmation behavior
- Invalidation condition
- Location where a trade would make sense
- Target logic
- Risk management note

Do not provide an entry if price is not at a valid location or if the setup has no clean invalidation.

### 6. Evidence Gate Before Labels

Every serious report must include an event evidence ledger. For each proposed Wyckoff event, include:

- Event
- Definition requirement
- Observed evidence
- Missing evidence
- Status: `candidate`, `probable`, `confirmed`, or `invalidated`
- Trade impact

Default status rules:

- `candidate`: location and rough behavior fit, but confirmation is missing.
- `probable`: most definition requirements are present, but one important test or acceptance condition is pending.
- `confirmed`: the event meets the definition and the reaction after it supports the label.
- `invalidated`: later price action contradicts the event logic.

Clean chart labels are allowed only for `confirmed` events. Use qualified labels for all other statuses.

### 7. Acceptance Rules

Any scenario that depends on acceptance above or below a level must define acceptance before presenting the trade posture. Specify the timeframe and behavior, for example:

- close beyond the level
- retest holding the level
- no immediate re-entry into the prior range within 1-3 bars
- supportive spread/volume or clear absence of opposing supply/demand
- higher-timeframe close required for macro confirmation

### 8. No-Trade Gate

Score the setup before stating actionability:

| Gate | Pass Criteria |
|---|---|
| Location | Price is at an extreme, retest, LPS/LPSY, BUEC, value edge, VWAP, or clear pullback zone |
| Trigger | Reclaim, rejection, structure break, SOS/SOW, low-volume test, or absorption plus initiative is present or precisely defined |
| Invalidation | Stop/invalidation is obvious and tied to the thesis |
| Reward | First target has enough room versus invalidation |
| Timeframe alignment | Lower-timeframe idea is not directly into higher-timeframe supply/demand unless it is explicitly a scalp |

If fewer than four gates pass now, the posture must be `No clean trade yet` or `watchlist only`.

### 9. Red-Team Pass

Before final bias, write the strongest argument against the primary scenario and what evidence would prove that countercase. This prevents the report from becoming label-preserving.

### 10. Review Loop

Every journal package must include review triggers:

- next price or candle condition to review
- expected behavior if the primary scenario is working
- failure behavior that invalidates or downgrades the scenario
- outcome status: `pending`, `confirmed`, `failed`, or `stale`

### 11. Evidence JSON Schema

When producing `evidence.json`, include these top-level sections. The first four are mandatory contract sections and should be copied from `templates/evidence-contract.template.json` before being filled with actual findings:

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

The package is not complete until `npm run validate:wyckoff -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/evidence.json` passes.

## Report Format

For `analysis_journal` outputs, use one package per symbol and keep the top level minimal:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/
  journal.md
  evidence.json
  screenshots/
```

Create exactly one top-level Markdown journal and exactly one top-level JSON evidence file for each symbol. Put screenshots under `screenshots/` and embed them in `journal.md` with relative Markdown image links. Do not create extra top-level reports, indexes, per-timeframe Markdown files, or JSON sidecars unless the user explicitly asks for an export format. For multi-symbol analysis, create a separate package per symbol and add one row per symbol to `analysis_journal/README.md`.

Use this structure unless the user asks for something shorter:

```markdown
## Wyckoff Macro Read: [SYMBOL]

### Executive Read
[2-4 sentences: control, phase, path of least resistance, trade posture.]

### Multi-Timeframe Map
| Timeframe | State | Phase | Control | Key Evidence | Invalidation |
|-----------|-------|-------|---------|--------------|--------------|

### Key Levels and Value
- Resistance/supply:
- Support/demand:
- Value/VWAP/profile:
- Liquidity:

### Data Quality and Evidence Coverage
| Evidence | Status | Source | Finding | Confidence / Trade Impact |
|----------|--------|--------|---------|----------------------------|
| Price structure + volume |  |  |  |  |
| Volume Profile / value |  |  |  |  |
| Anchored VWAP |  |  |  |  |
| Relative strength |  |  |  |  |
| Weis Wave / effort-result |  |  |  |  |
| MACD/AO SOT |  |  |  |  |
| Order flow / execution |  |  |  |  |

### Event Evidence Ledger
| Event | Requirement | Observed | Missing | Status | Trade Impact |
|-------|-------------|----------|---------|--------|--------------|

### Effort vs Result
| Wave | Direction | Distance | Duration | Volume | Result | Reaction | Read |
|------|-----------|----------|----------|--------|--------|----------|------|

### Acceptance Rules
- Bullish acceptance:
- Bearish acceptance:

### Chart Proof
![Macro context](screenshots/SYMBOL_macro_context.png)
[What this proves, what confirms it, what invalidates it.]

![Wyckoff structure](screenshots/SYMBOL_wyckoff_structure.png)
[What this proves, what confirms it, what invalidates it.]

![Trade posture](screenshots/SYMBOL_trade_posture.png)
[What this proves, what confirms it, what invalidates it.]

### Buyer vs Seller Evidence
- Bullish evidence:
- Bearish evidence:
- What matters most now:

### No-Trade Gate
| Gate | Status | Evidence |
|------|--------|----------|

### Red-Team Countercase
[Strongest argument against the primary scenario and what would confirm it.]

### Primary Scenario
[What must happen next, where confirmation appears, and where it targets.]

### Alternative Scenario
[What would flip or weaken the primary case.]

### Trade Posture
- Bias:
- Valid location:
- Trigger required:
- Invalidation:
- Targets:
- Management:

### Review Triggers
- Review when:
- Primary scenario should show:
- Downgrade/invalidates if:
- Outcome status:
```

## Decision Rules

- A spring is bullish only after reclaim and strength. A failed spring is bearish evidence.
- A UTAD is bearish only after rejection and weakness. A failed UTAD is bullish evidence.
- A breakout is not enough. Require acceptance, displacement, or a constructive retest.
- Heavy volume with little progress at lows suggests potential absorption by buyers.
- Heavy volume with little progress at highs suggests potential absorption by sellers.
- Shortening of the thrust is a warning, not a standalone entry.
- A cropped chart is insufficient evidence. Fit the view first, then reassess the structure.
- Trade the latest meaningful imbalance, but respect higher-timeframe supply and demand.
- `LPS` requires prior strength; before strength it is only a test or candidate higher low.
- `BUEC` requires a Creek break or acceptance first; before that it is only a planned retest.
- `SOS` requires displacement, strong result, and either acceptance or a constructive reaction; otherwise call it an SOS attempt.
- `Spring` requires a defined support/range low break and reclaim; a washout without a prior boundary is only spring-like.
- Do not upgrade an event label if the no-trade gate fails or value/effort evidence is missing; state the missing evidence directly.
