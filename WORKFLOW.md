# KonsiliTradingview Agent Workflow

This repo is the operating contract for Johan's TradingView chart agents. The goal is not more prose. The goal is fewer missed steps, correct drawing tools, validated evidence, and a final output a human can act on.

Canonical files:

- `AGENTS.md` — the boot manual every agent reads first.
- `strategies/wyckoff/manifest.json` — executable Wyckoff contract.
- `strategies/hew/manifest.json` — executable HEW contract.
- `agents/wyckoff-macro-analyst.md` — compact Wyckoff subagent role.
- `agents/harmonic-elliott-wave-analyst.md` — compact HEW subagent role.
- `scripts/validate_evidence.mjs` — manifest-driven validator for journal packages.

## The stage-gated workflow

Every serious analysis must pass six gates in order. Do not skip forward. If a gate cannot pass, stop and return a `STAND ASIDE`, `watchlist only`, or `missing evidence` result.

1. Route and layout
   - Choose Wyckoff by default when the method is unclear.
   - Choose HEW only when the user asks for HEW, Elliott, wave count, ratios, Wave-B ladder, Castaway, or harmonic wave work.
   - Switch to `Wyckoff Layout` or `HEW layout` before analysis.
   - If the required layout is unavailable, stop unless Johan explicitly overrides.

2. Top-down chart read
   - Use TradingView MCP as the chart source.
   - No web/news/fundamental source unless explicitly requested.
   - Read Monthly -> Weekly -> Daily by default.
   - Use compact reads first: quote, OHLCV summary, study values, focused Pine reads.
   - Fit/verify visible range before interpreting or drawing.

3. Drawing protocol
   - Clear stale drawings after symbol/layout setup unless preserving drawings was explicitly requested.
   - Draw only the layer being proven.
   - Record every meaningful drawing in `chart_prep.drawing_manifest` with `id`, `role`, `tool`, `timeframe_owner`, and `screenshot`.
   - If MCP cannot set per-drawing visibility, separate macro and daily proof with distinct clear/redraw screenshot passes.

4. Evidence contract
   - Fill exactly one `journal.md` and one `evidence.json` in `analysis_journal/<SYMBOL>_<YYYY-MM-DD>_<method>/`.
   - Screenshots live only under `screenshots/` and are referenced with package-relative paths.
   - Required sections, checklist IDs, screenshot roles, drawing roles, and critic fields come from the strategy manifest, not duplicated prose.

5. Action output
   - The final call is decision-first: setup, strategy reason, trigger, invalidation, target path, and no-trade condition.
   - Every action must explain why it follows from the chosen strategy.
   - Trade planning is zone-first. Accumulation/distribution/no-trade zones come before breakout confirmation.
   - If the chart cannot support a strategy-derived action, say `STAND ASIDE`, `watchlist only`, or `no clean trade`.

6. Critic review
   - Run a final critic before calling a package complete.
   - The critic checks evidence accuracy, journal/evidence/screenshot alignment, human actionability, macro focus, risk clarity, disclosed missing evidence, and no day-trading leakage.
   - Record the critic result in `critic_review`.
   - Run the validator.

## Validation

```bash
npm test
npm run validate:<hew|wyckoff> -- analysis_journal/<PACKAGE>/evidence.json
```

Run the strategy-specific validator only, unless the package intentionally contains both methods.

The validator fails closed on:

- Missing stage gates.
- Mandatory stage gates with `fail`, `partial`, or `not_requested` status.
- `workflow_version` drift from the strategy manifest `contract_version`.
- Duplicate checklist IDs.
- Screenshot paths outside `screenshots/`.
- Drawing-manifest screenshots not listed in `evidence.json.screenshots`.
- Zone probability values outside 0-100 or malformed price ranges.
- Missing journal/screenshot alignment.
- Missing action rationale fields.
- Missing critic review checklist items.
- HEW macro/subwave/projection counts drawn with `trend_line` or other generic substitutes.

## Drawing rules that matter

Wyckoff:

- Use rectangles for accumulation/distribution zones.
- Use horizontal lines for precise levels only.
- Use trend lines only for wave evidence or scenario paths.
- Event labels require event evidence ledger rows. If evidence is incomplete, label `candidate`, `possible`, or `attempt`.

HEW:

- Macro counts, subwaves, and projected Elliott paths must use TradingView Elliott tools: `elliott_impulse_wave`, `elliott_correction`, `elliott_triangle_wave`, `elliott_double_combo`, or `elliott_triple_combo`.
- `trend_line` is forbidden for HEW count legs, subwave legs, and projected count legs.
- Wave-B ladder gets its own chart-proof layer.
- Projection maps must show the highest-probability next count path or explicitly document TradingView forward-margin clamp/fallback.

## Output standard

A usable answer must let Johan act or stand aside without decoding the process:

- What is the setup?
- Which strategy says so?
- What zone matters now?
- What confirms it?
- What invalidates it?
- What is the target/reward path?
- What should he do nothing on?

If that block is missing, the work is not done.
