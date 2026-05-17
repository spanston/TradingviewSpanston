# HEW Atlassian Reference Style

Reference fixture: `fixtures/hew/good/team_no_clean_trade/input`.

Use this style for future HEW packages. Do not preload generated analysis packages on every run; use this distilled reference and the HEW fixture when updating style rules or resolving ambiguity. The durable workflow rules live in `strategies/hew/manifest.json`; `AGENTS.md` and `WORKFLOW.md` are routing/index summaries.

## Required Style

- Lead with `NO CLEAN TRADE`, `STAND ASIDE`, `WATCHLIST ONLY`, or `ACTIONABLE`.
- Express the investment posture through accumulation and potential distribution boxes with uncalibrated `zone_score` values.
- Derive zone scores from HEW ratio fit, projection context, AO divergence, and volume evidence; do not call them calibrated probabilities without a calibration set.
- Use `review_conditions`, not trigger language, for future posture changes.
- Keep the final chart clean: `Konsili Pivot Exporter` and extraction scaffolding hidden unless audit mode is explicit.
- In extraction mode, verify `Konsili Pivot Exporter` with `data_get_indicator` because a study can appear in `chart_get_state` while hidden. Record the final retry/accept/downgrade decision in `visual_pivot_evidence.iteration_decision`.

## Drawing Rules

- Wave markers must use TradingView native Elliott tools only: impulse, correction, triangle, double combo, or triple combo.
- Do not use text labels as wave-marker substitutes.
- Do not use horizontal lines as count-leg substitutes.
- Prefer rectangles for accumulation, potential distribution, invalidation, no-trade, and target areas.
- Lower-degree subwaves inside macro waves must be visually distinct from macro counts through TradingView Elliott degree, color/style, and a companion HEW Fibonacci projection zone when it clarifies proof.
- If macro and lower-degree TradingView Elliott labels overlap, keep true pivot prices unchanged. Solve readability with native TradingView Elliott degree/style settings, visible-range choice, or separate screenshots.

## Macro/Subwave Standard

- Macro count comes first, but visible internals must be incorporated before the count is accepted.
- For any important macro wave, especially Wave 3, zoom into the macro wave's time range on a lower timeframe and extract KPE pivots there.
- If old pivots are hidden, temporarily expand KPE `max_rows` while preserving the manifest left/right profile. Record the drilldown and reset the profile afterward.
- Validate internal subwaves with HEW rules; Wave 3 still uses the 1.764 floor unless a rare exception is explicitly documented and downgraded.
- When Wave 3 completion is claimed, measure C of 3 against A of 3. C of 3 shorter than A of 3 blocks the completed-Wave-3 claim.
- Classify the active correction in `corrective_structure`, including location, pattern, price/time mode, Wave-B behavior, and preceding impulse reference. Wave 2 triangles are rejected in the core workflow.
- Keep `risk_architecture` explicit: structural maps are not live trades unless execution status, stop, target, risk/reward, position sizing basis, alternate response, and time/structural stop are all defined.

## TEAM Pattern

The TEAM reference package used:

- Macro Wave 3 drilldown window: `2016-12-19` to `2019-07-22` on weekly timeframe.
- Internal Wave 3 sequence: `23.80 -> 53.45 -> 43.11 -> 98.21 -> 65.17 -> 149.80`.
- Internal Wave 3 validation: `1.8583x` Wave 1, above the `1.764` floor.
- Final chart objects: native TradingView Elliott-tool drawings plus accumulation/distribution rectangles only.
- Final posture: zone-first and non-actionable because distribution score exceeded accumulation score.
