# Wyckoff Macro Read: COINBASE:SUIUSD

**Date:** 2026-05-14
**Method:** Strict multi-timeframe Wyckoff (Monthly → Weekly → Daily)
**Current price:** $1.21
**Status:** `watchlist_only_pending_buec`
**Clean-trade permission:** **Blocked** until BUEC retest of $1.03–$1.18 holds and turns up.

---

## Executive Read

SUI completed a textbook Wyckoff Selling Climax on **Feb 5, 2026 at $0.789** (weekly volume 244M vs 153M average, 33% intra-week range, climactic reversal close), spent ~12 weeks building cause in a $0.79–$1.05 range, and produced a probable Sign of Strength on **May 6, 2026** with a +24.5% daily breakout to $1.42 on 6× average volume. Price has since pulled back to $1.21 — sitting on the lifetime-AVWAP −1σ band and the upper edge of the broken Creek. **The SUI/BTC ratio chart shows an even cleaner accumulation pattern** with a terminal shakedown low on May 1 and a ratio surge on May 6 that confirms institutional sponsorship. **The setup is real but the trigger has not fully fired yet** — buyers need to demonstrate they will defend the $1.05–$1.18 zone on retest. Long bias on a confirmed BUEC, no clean trade before that.

---

## Multi-Timeframe Map

| Timeframe | State | Phase | Control | Key Evidence | Invalidation |
|-----------|-------|-------|---------|--------------|--------------|
| Monthly | Markdown ending, early base | Reversal candle in progress | Neutral-bullish (first time) | May MTD +33%, prior month ranges 0.79–1.42 | Monthly close < 0.789 |
| Weekly | Accumulation | Phase D begun | Buyers | SC week 244M vol; SOS week 166M vol; 12-week base | Weekly close < 0.95 |
| Daily | Accumulation | Phase D in progress | Buyers (provisional) | May 6 SOS +24.5% on 74M; current BUEC retest | Daily close < 0.95 |

---

## Key Levels and Value

- **Macro supply:** $2.00–$2.40 (Oct 2025 distribution + lifetime-AVWAP cluster)
- **Lifetime AVWAP:** $2.3677 (anchor verified at start_time=0 = May 2023 inception — lifetime cumulative cost basis, **not a campaign-event anchor**; informative T2 reference, not strict-Wyckoff trapped-buyer cost basis)
- **Lifetime AVWAP −1σ band:** $1.1987 (current price level; mean-reversion magnet)
- **SOS high:** $1.42 (May 6, 2026)
- **BUEC retest zone:** **$1.03–$1.18** ← the trade lives here
- **Approximate POC (range):** $0.92
- **VAL / soft invalidation:** $0.84 / $0.95
- **SC low / hard invalidation:** **$0.789**

---

## Data Quality and Evidence Coverage

| Evidence | Status | Source | Finding | Confidence / Trade Impact |
|----------|--------|--------|---------|----------------------------|
| Price structure + volume | native | TV MCP OHLCV + quote | Textbook SC → AR → range → SOS pattern | **High** — primary evidence |
| Volume Profile / value | fallback | OHLCV-binned approximation | POC 0.92, VAL 0.84, VAH 1.02 | Moderate — supports planning, not clean execution |
| Anchored VWAP | fallback (anchor verified) | Visible AVWAP study; `start_time=0` confirmed via ui_evaluate | Lifetime VWAP 2.37, −1σ 1.20 (current), +1σ 3.54 | **Medium** — lifetime VWAP only; campaign-anchor missing |
| Relative strength (SUI/BTC) | proxy (BINANCE:SUIBTC) | TV MCP OHLCV on the pair | Descending-wedge ratio accumulation with May 1 shakedown low (0.0000116) and May 6 surge | **Strongest single piece of evidence** |
| Weis Wave / effort-result | manual | 5-wave manual table | Climactic exhaustion → low-effort base → high-effort SOS | High |
| MACD/AO SOT | fallback | Bar-spread/wave fallback | Shortening of thrust into the SC; no SOT yet on the markup | Secondary only |
| Order flow / execution | not_requested | — | Macro/swing scope; no CVD/footprint | N/A |

---

## Event Evidence Ledger

| Event | Requirement | Observed | Missing | Status | Trade Impact |
|-------|-------------|----------|---------|--------|--------------|
| Prior markdown | Decline into definable range | 5.37 → 0.789 (−85%) over 13 months | — | confirmed_context | Macro markdown intact above 2.40 |
| **Selling Climax** | Heavy sell met by strong buy, climactic vol, wide reversal | Feb 5: low 0.789, close 1.014, daily 64M vol (~5×), weekly 244M | Multi-bar Phase A | **confirmed** | Defines campaign low |
| Automatic Rally | Strong reaction off SC defining range top | Same Feb 5 bar high 1.03 | — | confirmed | Creek at 1.03–1.05 |
| Secondary Tests | Retest on declining supply, no LL | 4 STs (0.82–0.88) all > 0.789, declining volume | None — multi-test pattern | confirmed | Absorption proven |
| Spring | Boundary break and reclaim | No bar broke 0.789 | Did not occur | not_applicable | Not required (SC was terminal) |
| **SOS** | Displacement + acceptance/constructive reaction | May 6: +24.5% on 74M (~6×) to 1.42 | Acceptance via retest not yet shown | **probable** | Bullish trigger fired |
| **BUEC** | Retest of broken Creek holds and turns up | Pullback 1.42 → 1.18; sitting on Creek + AVWAP −1σ | Upward impulse off the retest | **candidate_in_progress** | Highest-leverage current event |
| LPS | Higher low after confirmed strength | — | Pending BUEC | pending | First clean long entry |

---

## Effort vs Result (Weekly)

| Wave | Direction | Distance | Duration | Volume | Result | Reaction | Read |
|------|-----------|----------|----------|--------|--------|----------|------|
| Jan markdown | Down | −57% | 4 weeks | Declining, climactic on final | Wide reversal at SC | Immediate AR | **Shortening of thrust → exhaustion** |
| AR | Up | +30% | 1 day | 64M (5×) | Wide reversal | Range establish | Defines Creek 1.05 |
| Phase B range | Sideways | 0.82–1.05 | 12 weeks | Collapsed 25M→8M daily avg | Narrowing ranges | Absorption | **Classic Phase B cause** |
| **SOS impulse** | Up | +60% in 6 sessions | 5 days | Peak 74M (6×) | Wide expansion | Pullback −17% | **Effort = result** |
| Current digestion | Sideways/Down | 1.42 → 1.18 | 4 days | Declining each bar (41→5M) | Narrowing | Holds Creek + AVWAP −1σ | **Constructive** |

---

## Chart Proof

### Macro Context — Monthly
![Monthly clean](screenshots/01_monthly_clean.png)

> **Chart prep note:** Initial chart state was inspected via the chart-widget-collection data sources list and confirmed clean of inherited user drawings before annotation. After the first annotation pass, drawings were cleared via `model.removeAllDrawingTools()` (since `draw_clear`/`draw_remove_one` returned `getChartApi is not defined`) and the final annotation set was redrawn. The AVWAP anchor was verified via study-inputs inspection — `start_time=0`, i.e., listing inception.


*What this proves:* Three full years of SUI history. The 0.36 ATL (Oct 2023), the markup to 5.37 ATH (Jan 2025), the 13-month markdown to 0.79 (Feb 2026), and the in-progress May 2026 reversal candle (+33% MTD). The macro pattern is "post-cycle markdown forming a higher low above the ATL."

*What confirms:* Monthly close above $1.50 in May would print the largest bullish monthly reversal since the 2024 markup.

*What invalidates:* Monthly close below $0.79 reopens markdown.

### Macro Context — Weekly
![Weekly clean](screenshots/02_weekly_clean.png)

*What this proves:* The Phase A SC week (Feb 2-9, 2026) on climactic 244M volume, the 12-week absorption range, and the May 6 SOS-attempt week (166M volume, +43%) breaking out of the base. Note also the retail sentiment headline at the bottom right ("SUI Price Turns Bearish… Stop Below $1 Coming Next?") which dropped *into* the SOS — classic contrarian sentiment divergence at a Wyckoff inflection.

*What confirms:* This week's close above $1.20 with constructive volume; next week impulse > $1.42.

*What invalidates:* Weekly close back inside the range (< $1.00) breaks the SOS thesis.

### Wyckoff Structure (Unannotated) — Daily
![Daily clean](screenshots/03_daily_clean.png)

*What this proves:* The unannotated price action. The Feb 5 SC wick at $0.789 is the clear lowest point. The three-month base 0.82–1.05 is visible as the consolidation zone. The May 6 breakout candle is the sharp spike at the right edge. No labels — the structure should be readable from price alone.

### Wyckoff Structure (Annotated) — Daily
![Daily structure annotated](screenshots/04_daily_structure.png)

*What this proves:* SC at $0.789 (lower red wick, left), the AR/Creek at $1.05 (teal dashed), the ~3-month accumulation range (gray rectangle), the May 6 SOS-candidate breakout (right cluster), the BUEC retest zone (teal shaded), the descending lifetime Anchored VWAP (green line) — anchored at SUI listing inception, currently at $2.37 — and the soft/hard invalidation lines.

*What confirms:* Daily impulse off the 1.18-1.21 retest with a close above $1.18 on rising volume.

*What invalidates:* Daily close below $1.05 puts the structure on watch; below $0.95 fails the SOS.

### Relative Strength — SUI/BTC
![SUI/BTC ratio](screenshots/05_suibtc_ratio.png)

*What this proves:* On the BTC ratio chart, SUI made *lower* lows into late April (terminal shakedown to 0.0000116 on May 1) **even though SUIUSD held above its Feb low** — i.e., the ratio took the final shakedown, not the spot. The May 6 ratio surge (+50% in 3 days vs BTC) is a textbook ratio-Wyckoff Sign of Strength. **This is the strongest single piece of evidence** in this report — institutional accumulation revealed itself in the cross.

*What confirms:* Ratio holds above 0.0000130 going forward.

*What invalidates:* Ratio loses 0.0000130 — would mean the ratio breakout is being absorbed back into the wedge.

### Trade Posture — Daily (initial)
![Trade posture initial](screenshots/06_trade_posture.png)

*What this proves:* Complete annotation set with watchlist sidebar visible. Forward-time projection was clamped by TradingView at the last real bar in this view — superseded by the next chart.

### Trade Posture — Daily (with forward paths)
![Trade posture with forward paths](screenshots/07_trade_posture_paths.png)

*What this proves:* The actionable plan as scenario paths, not just levels. **Path A (teal V)** shows the preferred bullish route — pullback from $1.21 into the BUEC retest zone ($1.05–$1.18, teal shaded), hold and turn up, markup to T1 at $1.80. **Path B (red dotted)** shows the failure route — break below $0.95, re-enter the prior range, retest or break $0.789. Forward time was achieved by extending the visible range by 60 bars via `timeScale.zoomToBarsRange(first, last+60)` after `chart_scroll_to_date` returned an error.

*What confirms Path A:* Daily impulse off the BUEC zone with close > $1.18 on rising volume.
*What confirms Path B:* Daily close < $0.95.

---

## Buyer vs Seller Evidence

**Bullish evidence:**
- Confirmed SC with climactic volume signature on both daily and weekly.
- 4 secondary tests, all higher lows than SC, all on declining volume → absorption.
- SOS day +24.5% on 6× average volume — strongest single bullish bar in the campaign.
- SUI/BTC ratio breakout confirms sponsorship.
- Current week digestion on light volume → no aggressive selling.
- Retail sentiment headlines bearish at the local low — classic sentiment divergence.

**Bearish evidence:**
- Macro markdown still intact above $2.40 — this is a swing trade inside a larger bear structure.
- Only one SOS attempt so far; no BUEC confirmation.
- BTC has slipped from 82k to 79k since May 6, weakening the alt-risk backdrop.
- Single-bar SC (no multi-bar Phase A) is a slight quality penalty.

**What matters most now:** Whether the **$1.05–$1.18 zone holds on the retest**, and whether the **SUI/BTC ratio defends 0.0000130**. Everything else is secondary.

---

## No-Trade Gate

| Gate | Status | Evidence |
|------|--------|----------|
| Location | **Pass** | At broken Creek + AVWAP −1σ — clean retest zone |
| Trigger | **Partial** | SOS fired; BUEC not yet confirmed |
| Invalidation | **Pass** | 0.95 soft / 0.789 hard — both tight |
| Reward | **Pass** | Stop 0.95, T1 1.80 (~2.7R), T2 2.37 (~5.2R) |
| Timeframe alignment | **Pass with caveat** | D/W/M align constructively; macro markdown still above |

**4 of 5 gates pass, 1 partial.** Per skill rules: "If fewer than four gates pass now, the posture must be `No clean trade yet` or `watchlist only`." Four pass plus a partial Trigger → **`watchlist_only` until BUEC confirms**, then upgrade to clean-trade.

---

## Red-Team Countercase

**The strongest argument against the long thesis** is that this is the first SOS attempt failing as a UTAD-style trap. The $5.37 ATH leaves massive overhead supply, the $2.0–$2.4 macro band is intact, and cycle bears can use the May 6 spike to distribute back to range buyers. The recent BTC weakness (82k → 79k since May 6) is the macro tell that the alt-sponsorship may be fading. **What would confirm the countercase:** failure to hold $1.05 with two daily closes below, weak (<15M) volume on retest bounces, SUI/BTC losing 0.0000130, or BTC losing 78k support.

---

## Primary Scenario

**Phase D accumulation confirms via BUEC.** Price holds the $1.05–$1.18 zone on the current retest, prints a new daily higher low above $1.18 with rising volume (the LPS), and then resumes markup. First target $1.80 (prior swing high inside the May 6 expansion). Second target $2.37 — note this is the **lifetime** Anchored VWAP (anchor verified at listing inception), so it is the blended cost basis of *all* SUI buyers since launch, not the strict Wyckoff trapped-buyer cost basis of the 2024–2025 distribution; treat it as a plausible mean-reversion magnet, not as Wyckoff-grade T2 evidence. Stretch target $2.40 (macro supply edge), where the macro markdown thesis is challenged.

## Alternative Scenario

**Failed SOS / UTAD.** Price loses $1.05 within the next 5–10 sessions and re-enters the prior range. If $0.84 (VAL) holds, this becomes a deeper Phase B with another ST possible at the 0.82–0.88 zone. If $0.789 fails, the campaign low breaks and markdown resumes — thesis invalidated.

---

## Trade Posture

- **Bias:** Long pending BUEC confirmation
- **Valid location:** $1.05–$1.18 retest hold
- **Trigger required:** Daily close above $1.18 on rising volume after a tag of the $1.05–$1.18 zone; OR aggressive entry on a clear absorption candle inside the zone with a stop below $1.03
- **Invalidation:** Daily close < $0.95 (soft, exit); daily close < $0.789 (hard, structural)
- **Targets:** T1 $1.80 (~+50%, prior swing high), T2 $2.37 (lifetime AVWAP — *informative, not a strict-Wyckoff campaign anchor*), Stretch $2.40 (macro supply)
- **Management:** Trail stop to breakeven on first close above $1.42; partial off at T1; let runner work toward T2

---

## Review Triggers

- **Review when:** Daily close above $1.18 OR daily close below $1.05 OR 7 days without resolution
- **Primary scenario should show:** Constructive retest of $1.18-$1.05 on declining volume, then an upward impulse with volume expansion
- **Downgrade/invalidates if:** Daily close < $0.95 (soft) or < $0.789 (hard), or SUI/BTC ratio loses 0.0000130, or BTC loses 78k
- **Outcome status:** `pending`

---

*This report is evidence-based analysis, not a guarantee. Macro markdown structure is intact above $2.40 — treat the long thesis as a swing trade inside a larger bear range, not a confirmed cycle low. Position size accordingly.*
