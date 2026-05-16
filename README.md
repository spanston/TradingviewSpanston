# KonsiliTradingview

Stage-gated operating repo for Johan's TradingView Ian Copsey Fractal Forecasting analysis agents.

This repo prevents structural drift: rules stay in one narrow HEW/Copsey lane, agents cannot skip evidence gates, HEW counts must use the right tools, and final reports must be clear enough to act on.

- `AGENTS.md` is the boot manual.
- `WORKFLOW.md` defines the eight stage gates and four chart modes.
- `strategies/hew/manifest.json` is the executable HEW contract.
- `agents/harmonic-elliott-wave-analyst.md` is the compact specialist prompt.
- `scripts/validate_evidence.mjs` validates journal packages against the HEW manifest.
- `tradingview/konsili_pivot_exporter.pine` is the required TradingView pivot data path.

## What must happen on every serious analysis

1. Route to Ian Copsey Fractal Forecasting.
2. Load only the HEW manifest, specialist prompt, and directly relevant workflow material.
3. Switch to `HEW layout`.
4. Enter extraction mode: keep `Konsili Pivot Exporter` visible and extract Monthly, Weekly, and Daily pivots from structured `KPE|...` table/label rows.
5. Enter verification mode: verify those visual pivots with TradingView OHLCV before HEW analysis.
6. Read Monthly -> Weekly -> Daily using TradingView MCP only unless Johan asked for outside research.
7. Enter strategy-proof mode: hide `Konsili Pivot Exporter`, reduce pivot clutter, and draw only HEW proof.
8. Enter presentation mode: keep `Konsili Pivot Exporter` and extraction scaffolding hidden unless audit mode is explicit, leave a readable decision chart, and verify final live state.
9. Record exporter metadata, raw `exporter_rows`, `exporter_row_id`, visual pivots with matching indicator date/time/price, chart modes, and drawings in the evidence package.
10. Produce exactly one `journal.md` and one `evidence.json` per package.
11. Explain the action from the HEW count: setup, active/alternate count, trigger, invalidation, target path, and no-trade condition.
12. Run final critic review.
13. Run the validator.

## Required layout

- `HEW layout`

If the required layout is missing, the agent should stop unless Johan explicitly overrides.

## Pivot Exporter

Add `tradingview/konsili_pivot_exporter.pine` to `HEW layout` as `Konsili Pivot Exporter`. During extraction, read `data_get_pine_tables` first and `data_get_pine_labels` as backup with `study_filter: "Konsili Pivot Exporter"`.

If the exporter is absent or returns no `KPE|...` rows, fix the layout/exporter or downgrade. Do not treat screenshot-only pivots, Pivot Points High Low, Pivot Scanner, or `hew_scan_chart` output as a clean pivot evidence pass.

## Validation

```bash
npm test
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

## Journal package shape

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
  journal.md
  evidence.json
  screenshots/
```

No extra top-level reports, sidecars, or orphan screenshots unless Johan explicitly asks for an export format.

## HEW drawing rule

HEW macro counts, subwaves, and projected Elliott paths must use native TradingView Elliott tools:

- `elliott_impulse_wave`
- `elliott_correction`
- `elliott_triangle_wave`
- `elliott_double_combo`
- `elliott_triple_combo`

`trend_line` is forbidden for HEW count legs, subwave legs, and projected count legs. If the agent cannot draw the count with the right tool, the count stays `candidate`/`unclear` and the posture is `STAND ASIDE`.

## Final answer standard

A usable answer starts with one of:

- `ACTIONABLE`
- `WATCHLIST ONLY`
- `NO CLEAN TRADE`
- `STAND ASIDE`

Then it states: setup, active HEW count and alternate, Copsey/HEW reason, trigger, invalidation, target/reward path, and what to ignore.
