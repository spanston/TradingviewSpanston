---
name: chart-analysis
description: Analyze a chart — set up symbol/timeframe, add indicators, scroll to key dates, annotate, and screenshot. Use when the user wants technical analysis or chart review.
---

# Chart Analysis Workflow

You are performing technical analysis on a TradingView chart.

Use TradingView MCP as the source of live chart facts, current price, OHLCV, visible indicators, drawings, and screenshots. Do not use web search, external quote pages, or local report files for the market read unless the user explicitly asks for non-chart context.

## Step 1: Set Up the Chart

1. `chart_set_symbol` — switch to the requested symbol
2. `chart_set_timeframe` — set the appropriate timeframe
3. Wait for the chart to load (the tool handles this)

## Step 2: Add Indicators

Use `chart_manage_indicator` to add studies. Common names (must use FULL names):
- "Relative Strength Index" (not RSI)
- "Moving Average Exponential" (not EMA)
- "Moving Average" (for SMA)
- "MACD"
- "Bollinger Bands"
- "Volume"
- "VWAP"
- "Average True Range"

After adding, use `indicator_set_inputs` to customize settings (e.g., change EMA length to 200).

## Step 3: Navigate to Key Areas

- `chart_scroll_to_date` — jump to a specific date of interest
- `chart_set_visible_range` — zoom to a specific date window
- `chart_get_visible_range` — check what's currently visible
- Before analyzing or screenshotting, autofit or set a visible range that includes the full relevant structure so prior highs/lows, range boundaries, breakout points, and invalidation are not off-screen.
- For any forward scenario, path, forecast, or trade-posture screenshot, fit the historical structure first, then pan/scroll forward so the projected path has several weeks or months of right-side space. TradingView may clamp future timestamps in `chart_set_visible_range`, so use UI panning when needed.

## Step 4: Annotate

For a fresh technical analysis or Wyckoff/trade-posture chart, clear inherited drawings with `draw_clear` before adding the current analysis layer, unless the user explicitly asks to preserve existing drawings or the task is to inspect what is already drawn.

Use drawing tools to mark up the chart:
- `draw_shape` with `horizontal_line` for support/resistance
- `draw_shape` with `trend_line` for trend channels (needs two points)
- `draw_shape` with `text` for annotations

## Step 5: Capture and Analyze

1. `capture_screenshot` — screenshot the annotated chart
2. `data_get_ohlcv` — pull recent price data for quantitative analysis
3. `quote_get` — get the current real-time price
4. `symbol_info` — get symbol metadata (exchange, type, session)

## Step 6: Report

Provide the analysis:
- Current price and recent range
- Key support/resistance levels identified
- Indicator readings (RSI overbought/oversold, MACD crossover, etc.)
- Overall bias (bullish/bearish/neutral) with reasoning

## Cleanup

If you added indicators the user didn't ask for, remove them:
- `chart_manage_indicator` with action "remove" and the entity_id
- `draw_clear` to remove all drawings if they were temporary
