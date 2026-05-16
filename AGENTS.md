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
5. Work top down: Monthly -> Weekly -> Daily. Add 4H/1H only for explicit execution work.
6. Use compact reads first: `quote_get`, `data_get_ohlcv(summary=true)`, `data_get_study_values`, and focused Pine reads with `study_filter`.
7. Fit or explicitly set the visible range before interpreting, drawing, or screenshotting.
8. Use screenshots for visual proof.

## Stage gates

Every serious report must record and pass these gates in `evidence.json.stage_gates`:

1. `route_and_layout`
2. `top_down_chart_read`
3. `drawing_protocol`
4. `evidence_contract`
5. `action_output`
6. `critic_review`

If a gate cannot pass, stop or downgrade. Do not keep producing confident trade language after a failed gate.

## Drawing protocol

Clear stale drawings after loading the requested symbol/layout unless Johan asked to preserve them.

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

If TradingView MCP cannot set per-drawing visibility, use separate screenshot passes: draw/clear macro layer, then draw/clear daily layer. Record the intended visibility in evidence.

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
- Subwave evidence inside macro waves where visible.
- Ratio validation and rule validation.
- Wave-B invalidation ladder with chart proof.
- Castaway model before trade language.
- Accumulation/distribution zone probabilities.
- Projection map tied to the highest-probability next count.
- Hard invalidation, flip level, target path, and stand-aside condition.

HEW drawing grammar is strict:

- Macro counts, subwaves, and projected Elliott paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
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
