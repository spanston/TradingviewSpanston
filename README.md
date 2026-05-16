# KonsiliTradingview

Stage-gated operating repo for Johan's TradingView analysis agents.

The old problem was structural drift: rules lived in too many places, agents skipped steps, HEW counts were sometimes drawn with the wrong tools, and final reports were not always clear enough to act on. This repo now keeps the workflow narrow:

- `AGENTS.md` is the boot manual.
- `WORKFLOW.md` defines the eight stage gates and four chart modes.
- `strategies/wyckoff/manifest.json` and `strategies/hew/manifest.json` are the executable contracts.
- `agents/*.md` are compact specialist prompts.
- `scripts/validate_evidence.mjs` validates journal packages against the manifests.

## What must happen on every serious analysis

1. Route to the right strategy.
2. Load only the selected lane's manifest, specialist prompt, and strategy-specific skill material.
3. Switch to the required TradingView layout.
4. Enter extraction mode: keep pivot/scanner scaffolding visible and extract important pivots visually from Monthly, Weekly, and Daily.
5. Enter verification mode: verify those visual pivots with TradingView OHLCV before strategy analysis.
6. Read Monthly -> Weekly -> Daily using TradingView MCP only unless Johan asked for outside research.
7. Enter strategy-proof mode: hide/reduce pivot clutter and draw only method-specific proof.
8. Enter presentation mode: hide extraction scaffolding, leave a readable decision chart, and verify final live state.
9. Record visual pivots in `visual_pivot_evidence`, chart modes in `chart_prep.chart_mode_checklist`, and drawings in `chart_prep.drawing_manifest`.
10. Produce exactly one `journal.md` and one `evidence.json` per package.
11. Explain the action from the chosen strategy: setup, trigger, invalidation, target path, and no-trade condition.
12. Run final critic review.
13. Run the validator.

Do not load both HEW and Wyckoff context unless Johan explicitly asks for both, confluence, comparison, or a dual-strategy package.

## Required layouts

- Wyckoff: `Wyckoff Layout`
- HEW: `HEW layout`

If the required layout is missing, the agent should stop unless Johan explicitly overrides.

## Validation

```bash
npm test
npm run validate:<hew|wyckoff> -- analysis_journal/<PACKAGE>/evidence.json
```

Run the matching strategy validator. Do not run the HEW validator against a Wyckoff package or vice versa unless the package intentionally contains both methods.

## Journal package shape

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_<method>/
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

## Wyckoff output rule

Wyckoff reports are zone-first. The final call must identify accumulation, distribution, and no-trade zones before breakout confirmation. Event labels require event evidence ledger rows; incomplete events must be labeled `candidate`, `possible`, or `attempt`.

## Final answer standard

A usable answer starts with one of:

- `ACTIONABLE`
- `WATCHLIST ONLY`
- `NO CLEAN TRADE`
- `STAND ASIDE`

Then it states: strategy reason, trigger, invalidation, target/reward path, and what to ignore.
