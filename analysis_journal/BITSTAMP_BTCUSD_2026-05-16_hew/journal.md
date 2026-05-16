# BITSTAMP:BTCUSD HEW Journal - 2026-05-16

## Decision

**STAND ASIDE**

Setup: visual-first HEW revision after critical review. Monthly validates a completed macro bullish HEW impulse, but the active post-ATH structure is corrective/unclear and price is inside the 74912-82833 decision band.

Strategy reason: HEW needs visual pivots, a valid active count, Castaway permission, trigger, invalidation, and target path before trade language. Pivot Scanner is now readable and confirms the major pivots, but it rejects the earlier daily bullish impulse because several mechanical pivots were not visible-important labels.

Trigger: no active trade trigger. Bullish watch trigger is daily/weekly acceptance above 82833 followed by a retest holding above 79500/78384.

Invalidation: if a future bullish trigger activates, the trigger fails on a failed retest below 79500/78384. Broader local structure fails on a daily close below 74912. Macro support/hard failure is below 59930.

Target path: above 82833 opens checks at 97939, 109356, then 126272. Below 74912 opens 65623-64955, then 59930.

Do nothing on: price chopping between 74912 and 82833, or any long/short idea before a new visual-first HEW subdivision validates.

## Visual Pivot Gate

![Visual pivots](screenshots/01_visual_pivots.png)

Critical revision: the initial package was too conservative about the visual-pivot gate and too permissive about the daily impulse. The live chart now has readable `Pivot Scanner` output through `data_get_pine_labels`, with 503 labels extracted.

Primary visual pivots now used:

- Monthly: 15479, 31818, 24920, 73794, 49577, 109356, 126272, 59930
- Weekly: 126272, 103530, 116381, 80537, 97939, 59930
- Daily: 59930, 74075, 65623, 76013, 64955, 79500, 74912, 82833

Rejected evidence: the prior daily impulse `64955 -> 69268 -> 65696 -> 78384 -> 73753 -> 79500` came from mechanical minor pivots. Pivot Scanner does not label 69268, 65696, 78384, or 73753, so that count is not visual-first evidence and cannot carry trade bias.

## Monthly Macro

![Monthly macro](screenshots/02_monthly_macro.png)

Monthly visual pivots validate the historical macro HEW impulse:

- W0 15479
- W1 31818
- W2 24920
- W3 73794
- W4 49577
- W5 109356

W3/W1 = 2.9912, above the 1.764 HEW floor. The later 126272 high is treated as post-impulse extension/ATH context, not as an actionable current impulse by itself. The decline to 59930 and rebound into 82833 leave the active structure corrective and unresolved.

## Weekly Bridge

![Weekly bridge](screenshots/03_weekly_bridge.png)

Weekly structure from 126272 to 59930 is mechanically visible but not a clean HEW impulse:

- 126272 -> 103530 -> 116381 -> 80537 -> 97939 -> 59930
- W3/W1 = 1.5761, below the 1.764 HEW floor

That keeps macro pressure unresolved. A long bias needs acceptance above 82833 first, then proof that the retest can hold above 79500/78384.

## Daily Structure

![Daily scan](screenshots/04_daily_scan.png)

Daily visual pivots do not validate a fresh HEW impulse. The important visible pivots are:

- 59930 -> 74075 -> 65623 -> 76013 -> 64955 -> 79500 -> 74912 -> 82833

This sequence is useful as a decision map, not as a tradable bullish count. Current price near 78379 is between the latest visual support at 74912 and the latest visual pivot high/flip at 82833.

## Trade Posture

![Trade posture](screenshots/05_trade_posture.png)

Decision ladder:

- 59930: macro support / hard failure
- 74912: latest visible pivot support / local invalidation
- 78384: current decision/retest area and failed-breakout trigger invalidation
- 82833: bullish flip and confirmation level
- 97939: weekly supply
- 126272: macro ATH

Final posture remains **STAND ASIDE**. The improved evidence does not make the setup more actionable; it makes the no-trade call cleaner because the previously bullish daily mechanical count is not visually confirmed.

External critic note: Gemini agreed with the STAND ASIDE verdict and the ratio logic, but challenged the trigger invalidation. The package is tightened so any future 82833 breakout setup fails on a lost 79500/78384 retest before waiting for the wider 74912 structural break.

## Missing Evidence

- W3 and W5 internals for the monthly macro count.
- Validated visual-first daily HEW impulse after price leaves 74912-82833.
- 4H/1H execution confirmation only after a higher-timeframe trigger appears.
