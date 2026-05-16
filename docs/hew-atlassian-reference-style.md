# HEW Atlassian Reference Style

Reference package: `analysis_journal/TEAM_2026-05-16_hew`.

Use this style for future HEW packages. Do not preload the TEAM package on every run; use it as the concrete example when updating style rules, auditing a package, or resolving ambiguity. The durable workflow rules live in `AGENTS.md`, `WORKFLOW.md`, and `strategies/hew/manifest.json`.

## Required Style

- Lead with `NO CLEAN TRADE`, `STAND ASIDE`, `WATCHLIST ONLY`, or `ACTIONABLE`.
- Express the investment posture through accumulation and potential distribution boxes with percentages.
- Derive probabilities from HEW ratio fit, projection context, AO divergence, and volume evidence.
- Use `review_conditions`, not trigger language, for future posture changes.
- Keep the final chart clean: `Konsili Pivot Exporter` and extraction scaffolding hidden unless audit mode is explicit.

## Drawing Rules

- Elliott wave markers must use TradingView native Elliott tools only: impulse, correction, triangle, double combo, or triple combo.
- Do not use text labels as Elliott wave marker substitutes.
- Do not use horizontal lines as count-leg substitutes.
- Prefer rectangles for accumulation, potential distribution, invalidation, no-trade, and target areas.
- Lower-degree subwaves inside macro waves must be visually distinct from macro counts through Elliott degree, color/style, and a companion HEW Fibonacci projection zone when it clarifies proof.
- If macro and lower-degree Elliott labels overlap, keep true pivot prices unchanged. Solve readability with native Elliott degree/style settings, visible-range choice, or separate screenshots.

## Macro/Subwave Standard

- Macro count comes first, but visible internals must be incorporated before the count is accepted.
- For any important macro wave, especially Wave 3, zoom into the macro wave's time range on a lower timeframe and extract KPE pivots there.
- If old pivots are hidden, temporarily expand KPE `max_rows` while preserving the manifest left/right profile. Record the drilldown and reset the profile afterward.
- Validate internal subwaves with HEW rules; Wave 3 still uses the 1.764 floor unless a rare exception is explicitly documented and downgraded.

## TEAM Pattern

The TEAM reference package used:

- Macro Wave 3 drilldown window: `2016-12-19` to `2019-07-22` on weekly timeframe.
- Internal Wave 3 sequence: `23.80 -> 53.45 -> 43.11 -> 98.21 -> 65.17 -> 149.80`.
- Internal Wave 3 validation: `1.8583x` Wave 1, above the `1.764` floor.
- Final chart objects: native Elliott drawings plus accumulation/distribution rectangles only.
- Final posture: zone-first and non-actionable because distribution probability exceeded accumulation probability.
