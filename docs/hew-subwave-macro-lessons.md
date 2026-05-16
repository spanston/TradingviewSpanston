# HEW Macro/Subwave Lessons

Date: 2026-05-16

## What Changed

- Macro counts remain the controlling structure. Lower-degree work is used to prove or challenge the macro count, not to replace it.
- When macro Wave 3 or another macro wave needs internal proof, zoom into that macro wave's own time range and extract lower-timeframe KPE pivots there.
- If the KPE current row window hides old pivots, keep the same left/right profile and temporarily expand `max_rows` only for historical drilldown. Record that as a drilldown, then reset the profile.
- Lower-degree subwaves inside macro waves must be visually distinct from the macro count: use a lower Elliott degree, separate color/style, and a HEW Fibonacci projection zone when it clarifies the proof.
- Elliott wave markers must come from TradingView native Elliott tools only: impulse, correction, triangle, double combo, or triple combo. Do not use text labels as EW count markers.
- Macro/subwave overlap should be solved with native Elliott degree/style separation and chart scaling. Do not falsify evidence pivot prices to make labels look cleaner.
- For macro investment posture, prefer accumulation and potential distribution boxes with probabilities over trigger/breakout/confirmation language.
- The accepted reference package for this style is `analysis_journal/TEAM_2026-05-16_hew`; use `docs/hew-atlassian-reference-style.md` as the distilled version for future runs.

## How The TEAM Wave 3 Drilldown Was Done

1. Started from monthly KPE macro anchors: macro Wave 3 was `23.80 -> 149.80`.
2. Switched to the macro Wave 3 date window, `2016-12-19` to `2019-07-22`, on weekly timeframe.
3. Kept KPE at `left=5/right=5` and temporarily expanded `max_rows` from `24` to `100` to expose historical weekly pivots.
4. Accepted the weekly internal sequence:
   `23.80 -> 53.45 -> 43.11 -> 98.21 -> 65.17 -> 149.80`.
5. Validated it with TradingView `hew_validate`; result was `full_valid_hew`, with internal Wave 3 at `1.8583x` Wave 1, above the `1.764` floor.
6. Drew the subwave count with a native Elliott impulse tool and added a HEW fib zone at `95.41-98.21`.
7. Reset KPE to the canonical single-stock profile and hid extraction scaffolding for presentation.

## Zone-First Output Rule

For current HEW packages, the final decision chart should show:

- Native Elliott drawings for counts and subwaves.
- Rectangle boxes for accumulation and potential distribution zones.
- Probabilities tied to HEW ratio fit, projection context, AO, and volume evidence in `evidence.json` and `journal.md`.
- No horizontal decision lines unless a future manifest explicitly re-allows them for a non-count, non-zone purpose.
- No text labels as Elliott wave markers.
