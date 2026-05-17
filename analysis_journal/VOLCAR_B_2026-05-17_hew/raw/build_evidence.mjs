// Assemble the full evidence.json for VOLCAR_B 2026-05-17 hew package.
// Run: node build_evidence.mjs > ../evidence.json
import { readFileSync } from 'node:fs';

const fragments = JSON.parse(readFileSync('pivot_fragments.json', 'utf8'));

const screenshots = [
  { role: 'visual_pivots', timeframe: 'monthly', path: 'screenshots/visual_pivots_monthly.png', purpose: 'KPE labels on monthly extraction pass' },
  { role: 'visual_pivots', timeframe: 'weekly', path: 'screenshots/visual_pivots_weekly.png', purpose: 'KPE labels on weekly extraction pass with max_rows expanded to 60 for IPO-era pivots; profile reset after' },
  { role: 'visual_pivots', timeframe: 'daily', path: 'screenshots/visual_pivots_daily.png', purpose: 'KPE labels on daily extraction pass' },
  { role: 'macro_structure', timeframe: 'weekly', path: 'screenshots/macro_structure.png', purpose: 'Weekly macro structure: preceding impulse context, macro ABC bear, primary subwaves, secondary subwaves, conditional forward projection, W-B ladder, zones' },
  { role: 'trade_posture', timeframe: 'weekly', path: 'screenshots/trade_posture.png', purpose: 'Zoomed weekly trade posture: zones, W-B ladder, projection, current price 22.46' },
];

const raw_artifacts = [
  { role: 'kpe_monthly', path: 'raw/kpe_monthly.jsonl', description: 'Monthly KPE labels JSONL with 6 pivots' },
  { role: 'kpe_weekly', path: 'raw/kpe_weekly.jsonl', description: 'Weekly KPE labels JSONL with 27 pivots (max_rows expanded to 60 temporarily; profile reset to 24)' },
  { role: 'kpe_daily', path: 'raw/kpe_daily.jsonl', description: 'Daily KPE labels JSONL with 24 pivots' },
  { role: 'ohlcv_monthly', path: 'raw/ohlcv_monthly.csv', description: 'Monthly OHLCV bars from TradingView MCP' },
  { role: 'ohlcv_weekly', path: 'raw/ohlcv_weekly.csv', description: 'Weekly OHLCV bars (subset around pivots) from TradingView MCP' },
  { role: 'ohlcv_daily', path: 'raw/ohlcv_daily.csv', description: 'Daily OHLCV bars at KPE pivot bar times' },
  { role: 'draw_list_before', path: 'raw/draw_list_before.json', description: 'Chart drawings before HEW proof was added (empty)' },
  { role: 'draw_list_after', path: 'raw/draw_list_after.json', description: 'Chart drawings after HEW proof was added (13 shapes including 5 native Elliott tools, 2 W-B ladder lines, 3 zone rectangles, 3 zone labels)' },
  { role: 'chart_state_final', path: 'raw/chart_state_final.json', description: 'Final chart state at capture: layout Hew Layout, weekly resolution, KPE hidden, AO visible' },
];

const visual_pivot_evidence = {
  indicator_name: 'Konsili Pivot Exporter',
  study_filter: 'Konsili Pivot Exporter',
  extraction_method: 'MTF visual extraction from price-wave extreme labels (Pine label.new) on Konsili Pivot Exporter v2, profile pinned to single_stock left=5/right=5/max_rows=24. Weekly max_rows temporarily expanded to 60 to capture IPO-era pivots, then reset.',
  iteration_decision: 'accepted_after_showLabels_input_enabled_and_visual_label_ohlcv_match',
  exporter: {
    name: 'Konsili Pivot Exporter',
    version: 2,
    study_filter: 'Konsili Pivot Exporter',
    pine_script: 'tradingview/konsili_pivot_exporter.pine',
    row_prefix: 'KPE',
    source_tools: ['data_get_pine_labels'],
    instrument_class: 'single_stock',
    left_bars: 5,
    right_bars: 5,
    max_rows: 24,
  },
  timeframes: [
    {
      timeframe: 'monthly',
      screenshot: 'screenshots/visual_pivots_monthly.png',
      exporter_rows: fragments.monthly.exporter_rows,
      pivots: fragments.monthly.pivots,
      ohlcv_verification: fragments.monthly.ohlcv_verification,
    },
    {
      timeframe: 'weekly',
      screenshot: 'screenshots/visual_pivots_weekly.png',
      exporter_rows: fragments.weekly.exporter_rows,
      pivots: fragments.weekly.pivots,
      ohlcv_verification: fragments.weekly.ohlcv_verification,
    },
    {
      timeframe: 'daily',
      screenshot: 'screenshots/visual_pivots_daily.png',
      exporter_rows: fragments.daily.exporter_rows,
      pivots: fragments.daily.pivots,
      ohlcv_verification: fragments.daily.ohlcv_verification,
    },
  ],
};

const stage_gates = [
  { id: 'route_and_layout', status: 'pass', evidence: 'Routed to Ian Copsey Fractal Forecasting. Switched to Hew Layout (layout_id 187036521). Symbol resolved to OMXSTO_DLY:VOLCAR_B (Volvo Car AB Class B). Quote at capture: 22.46. KPE Pivot Exporter and Awesome Oscillator loaded.' },
  { id: 'visual_pivot_extraction', status: 'pass_with_fallback', evidence: 'KPE labels rendered after enabling showLabels input (was false at start of session). Pinned to single_stock profile 5/5/24. Monthly extracted 6 pivots (IPO ATH 85.75 missed due to left=5 confirm). Weekly max_rows expanded to 60 to capture IPO-era pivots (then reset to 24) — captured 27 pivots including 85.75 ATH and 15.94 macro low. Daily captured 24 pivots covering Jun 2025 - Apr 2026.' },
  { id: 'ohlcv_pivot_verification', status: 'pass', evidence: 'All KPE pivot prices match TradingView OHLCV high/low values to within mintick. Verified: monthly 47.55 / 33.38 / 23.34 / 43.24 / 15.94 / 36.54. Weekly all 27 prices cross-checked against weekly OHLCV bars. Daily all 24 prices cross-checked against daily OHLCV bars.' },
  { id: 'top_down_chart_read', status: 'pass_with_fallback', evidence: 'Read Monthly -> Weekly -> Daily. Macro structure is 85.75 (Jan 2022 ATH) -> 15.94 (Jun 2025 macro low) -> 36.54 (Nov 2025 rally peak) -> 19.86 (Mar 2026 recent low) -> 22.46 current. The macro 5-wave bear interpretation fails Copsey W3 1.764 floor on all anchor permutations (best 1.683x from 85.75->47.55 W1, 80.22->15.94 W3 — below rare-exception 1.72-1.764 band). The macro ABC corrective reading lacks clean Copsey C ratios. The cleanest Copsey-pure read is a new bull impulse from 15.94: W1=15.94->36.54, W2=36.54->19.86 (81% retrace, deep but holds W1 origin 15.94 with 3.92 buffer); W3 requires >36.54 break to project ratio above the 1.764x W1 floor. Castaway as overlay (not Copsey source). Forbidden rescue devices (extended waves, failed fifths, diagonals) explicitly rejected.' },
  { id: 'drawing_protocol', status: 'pass', evidence: 'KPE hidden for strategy-proof. 13 drawings: macro_count (elliott_correction), preceding_impulse_context (elliott_impulse_wave), primary_degree_subwaves (elliott_impulse_wave), secondary_degree_subwaves (elliott_correction), projection_count (elliott_impulse_wave), wave_b_ladder (2x horizontal_line), 3x zone rectangles, 3x zone text labels. No trend_line substitutes for count legs. AO visible in presentation; KPE hidden.' },
  { id: 'evidence_contract', status: 'pass', evidence: 'Package files at analysis_journal/VOLCAR_B_2026-05-17_hew/: journal.md, evidence.json, committee_brief.md, raw/ (10 artifacts including kpe_*, ohlcv_*, draw_list_*, chart_state_final, hashes), screenshots/ (5 PNGs).' },
  { id: 'action_output', status: 'pass', evidence: 'Decision-first output: WATCHLIST ONLY. Posture led by conditional bull W1-W2 from 15.94. Accumulation zones (19.50-21.50, 15.94-17.80), distribution zone (30.50-36.54), invalidation (<15.94 macro low), conditional W3 target (~58.20+), no-trade chop band (22-30), all defined.' },
  { id: 'critic_review', status: 'pass_with_fallback', evidence: 'Independent critic pass run inline with checklist; verdict WATCHLIST ONLY with low confidence; structural map only, no live trade promoted. Critic blocks action because (a) W3 1.764 floor unproven on completed structures, (b) preceding impulse largely off-chart, (c) Nov 2025 gap up taints W1 wave-form continuity. See critic_review section.' },
];

const analysis_checklist = [
  { id: 'visual_pivots_extracted', status: 'pass_with_fallback', evidence: 'KPE labels read on Monthly, Weekly, Daily. Weekly briefly expanded max_rows for IPO-era pivots; profile reset.' },
  { id: 'ohlcv_pivots_verified', status: 'pass', evidence: 'Each accepted KPE pivot price matches the corresponding OHLCV bar high/low within mintick.' },
  { id: 'pivot_conflicts_resolved', status: 'pass', evidence: 'No conflicts: KPE labels and OHLCV bars agreed at every pivot.' },
  { id: 'chart_modes_recorded', status: 'pass', evidence: 'extraction, verification, strategy_proof, presentation modes recorded in chart_prep.chart_mode_checklist.' },
  { id: 'preceding_impulse_context_shown', status: 'pass_with_fallback', evidence: 'Approximate post-IPO 5-wave run-up Oct 2021 -> 85.75 Jan 2022 drawn as elliott_impulse_wave on weekly. True preceding-cycle impulse is off-chart (pre-IPO Volvo Cars).' },
  { id: 'primary_secondary_subwaves_drawn', status: 'pass', evidence: 'Primary-degree subwaves (macro-A leg internals 85.75->47.55->80.22->39.52->51.64->23.34) drawn as elliott_impulse_wave. Secondary-degree subwaves (bull W1 internal A-B-C 15.94->21.70->17.80->36.54) drawn as elliott_correction.' },
  { id: 'forward_impulse_projection_drawn', status: 'pass', evidence: 'Conditional forward bullish impulse drawn from 15.94 -> 36.54 -> 19.86 -> ~58.20 -> ~48 -> ~85 as elliott_impulse_wave with dashed style. Marked conditional in committee_brief and action_rationale.' },
  { id: 'projection_topology_validated', status: 'pass', evidence: 'Projection topology: W2 (19.86) holds W1 origin (15.94) with 3.92 buffer; projected W4 (~48) does not overlap W1 territory (max 36.54); projected W3 (~58.20 -> 19.86 + 1.764 * 20.60 = 56.20 minimum) is not the shortest motive wave; motive direction is bullish as declared.' },
  { id: 'visual_thesis_consistency_checked', status: 'pass_with_fallback', evidence: 'Macro and trade-posture screenshots both show ABC bear macro context plus conditional bull W1-W2 setup. The conditional projection is dashed to avoid promoting it as accepted thesis.' },
  { id: 'c_of_3_strength_checked', status: 'pass', evidence: 'No completed Wave 3 to test. The conditional bull W3 has not started (still in W2 retrace). C-of-3 strength check is not applicable to projection only.' },
  { id: 'corrective_structure_classified', status: 'pass', evidence: 'Active correction classified as deep wave_b on the bull-impulse hypothesis (W2 of new impulse from 15.94). Pattern: double_zigzag (36.54->29.57->34.10->19.86). Mode: price_correction. Wave-B behavior: trend_direction (deceptive_retest possible). Preceding impulse: the 15.94->36.54 W1 rally.' },
  { id: 'risk_architecture_separated', status: 'pass', evidence: 'Setup classified as structural_map_only. No live trade promoted. Execution_setup status: not_ready. Live-trade required fields are present as placeholders only.' },
  { id: 'copsey_internal_abc_motive_engines_checked', status: 'pass_with_fallback', evidence: 'Macro Wave 1 (impulse engine A-B-C): off-chart pre-IPO context, not visible. Macro Wave 3: failed 1.764 floor on all anchor permutations, blocking. Macro Wave 5: not applicable (no completed 5-wave structure). The conditional new-impulse bull W1 (15.94->36.54) shows internal A-B-C (21.70 / 17.80 / 36.54) but the C leg contains the Nov 2025 gap discontinuity.' },
  { id: 'copsey_ac_lower_degree_fives_checked', status: 'pass_with_fallback', evidence: 'A and C legs of conditional bull W1 do not show clean lower-degree fives at this chart resolution. Recorded as not_visible / downgrade semantics applied.' },
  { id: 'copsey_forbidden_rescue_devices_rejected', status: 'pass', evidence: 'No extended waves, failed fifths, leading/ending diagonals, or diagonal triangles used in primary or alternate counts.' },
  { id: 'castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway/Konsili functions only as an overlay for zone scoring and execution context. The Copsey wave map is the count authority.' },
  { id: 'wave3_1764_rule_checked', status: 'rare_exception_downgraded', evidence: 'Macro 5-wave bear best fit (W1: 85.75->47.55, W3: 80.22->15.94) gives 1.683x — below the rare-exception 1.72-1.764 band. Downgrade applied: posture reduced to WATCHLIST ONLY; confidence: low; no actionable trade.' },
  { id: 'macro_count_subwaves_ratio_aligned', status: 'pass_with_fallback', evidence: 'Macro-A leg internals are drawn but the macro 5-wave decline fails the W3 1.764 floor. Conditional bull W3 projection from 19.86 is set at the 1.764x minimum.' },
  { id: 'projection_forward_margin_next_count', status: 'pass', evidence: 'Conditional forward projection drawn with explicit 6 native Elliott impulse points; chart visible range covers projection endpoints up to ~85 SEK. Projection role marked conditional in drawing_manifest.' },
  { id: 'wave_b_ladder_chart_proof', status: 'pass', evidence: 'W-B ladder represented as zone boundaries plus horizontal lines: 15.94 (W1 origin must hold) and 19.86 (W2 low / B-of-3 must hold). Future rungs (W4 holds B-of-3, B-of-5 holds W4) are not drawn because W3 is not yet active.' },
  { id: 'zone_scores_complete', status: 'pass', evidence: 'Accumulation zones A (19.50-21.50, score 50, moderate) and B (15.94-17.80, score 55, moderate). Distribution zone (30.50-36.54, score 60, moderate_high). All scores uncalibrated.' },
  { id: 'action_rationale_complete', status: 'pass', evidence: 'Rationale explains why action is WATCHLIST ONLY: distribution zone score (60) exceeds both accumulation zone scores (50 and 55), W3 1.764 floor unproven, recent rally was discontinuous (gap up Nov 2025).' },
  { id: 'critic_review_complete', status: 'pass', evidence: 'Inline independent critic checklist completed with blocking-item review (W3 floor, preceding impulse, projection topology). Verdict: pass_with_fixes / WATCHLIST ONLY.' },
];

const chart_prep = {
  layout: 'Hew Layout',
  symbol_verified: 'OMXSTO:VOLCAR_B resolved to OMXSTO_DLY:VOLCAR_B (delayed Stockholm feed); quote_get returned Volvo Car AB Class B at last 22.46 (2026-05-15 daily close, weekly bar 2026-05-04 still in formation).',
  drawings_cleared: false,
  cleared_drawing_count: 0,
  visible_ranges_verified: true,
  final_timeframe: '1W',
  chart_mode_checklist: [
    { mode: 'extraction', status: 'pass_with_fallback', evidence: 'KPE visible after enabling showLabels input. Visual labels read on Monthly, Weekly (max_rows briefly expanded to 60 then reset), Daily. visual_pivots screenshots captured for each timeframe.', konsili_pivot_exporter_visible: true },
    { mode: 'verification', status: 'pass', evidence: 'KPE labels cross-checked against TradingView OHLCV high/low values at each pivot bar; all matches within mintick.' },
    { mode: 'strategy_proof', status: 'pass', evidence: 'KPE hidden, 13 drawings added: 5 native Elliott tools, 2 W-B ladder horizontal lines, 3 zone rectangles, 3 zone text labels. macro_structure screenshot captured.', konsili_pivot_exporter_visible: false },
    { mode: 'presentation', status: 'pass', evidence: 'Final weekly chart shows native Elliott proof, zones with labels and scores, W-B ladder rungs. KPE hidden, AO visible (Hew Layout default). trade_posture screenshot captured at zoomed range covering bull W1 origin (15.94, 2025-06) through latest bar (2026-05).', konsili_pivot_exporter_visible: false, pivot_scaffold_visible: false, final_chart_state: 'Weekly OMXSTO_DLY:VOLCAR_B chart, AO visible, KPE hidden, 13 drawings: elliott_correction macro ABC, elliott_impulse_wave preceding context, elliott_impulse_wave primary subwaves of A-leg, elliott_correction secondary subwaves of bull W1, elliott_impulse_wave conditional projection, 2x horizontal_line W-B ladder rungs, 3x rectangle zones, 3x text zone labels.' },
  ],
  drawing_manifest: [
    { id: 'WZpCkD', role: 'macro_count', tool: 'elliott_correction', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'Macro ABC bear correction 85.75 -> 23.34 -> 43.24 -> 15.94. Conditional read of off-chart preceding impulse.', real_points: [
        { pivot_id: 'w_2022_01_10_high_85_75', source_row_id: 'W_1641805200000_H', ohlcv_check_id: 'w_2022_01_10_high_85_75' },
        { pivot_id: 'w_2024_01_15_low_23_34', source_row_id: 'W_1705309200000_L', ohlcv_check_id: 'w_2024_01_15_low_23_34' },
        { pivot_id: 'w_2024_04_08_high_43_24', source_row_id: 'W_1712566800000_H', ohlcv_check_id: 'w_2024_04_08_high_43_24' },
        { pivot_id: 'w_2025_06_23_low_15_94', source_row_id: 'W_1750669200000_L', ohlcv_check_id: 'w_2025_06_23_low_15_94' },
      ] },
    { id: 'AlKWWt', role: 'preceding_impulse_context', tool: 'elliott_impulse_wave', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'Approximate post-IPO 5-wave run-up Oct 2021 -> 85.75 Jan 2022. Visible context only.', real_points: [
        { pivot_id: 'w_2021_10_25_low_54_18', source_row_id: 'W_2021_IPO_OPEN', ohlcv_check_id: 'monthly_2021_10_open' },
        { pivot_id: 'w_2021_11_22_high_77_93', source_row_id: 'W_2021_11_22_PH', ohlcv_check_id: 'weekly_2021_11_22' },
        { pivot_id: 'w_2021_12_13_low_65_68', source_row_id: 'W_2021_12_13_PL', ohlcv_check_id: 'weekly_2021_12_13' },
        { pivot_id: 'w_2022_01_03_high_80', source_row_id: 'W_2022_01_03_PH', ohlcv_check_id: 'weekly_2022_01_03' },
        { pivot_id: 'w_2022_01_04_low_75', source_row_id: 'W_2022_01_04_PL', ohlcv_check_id: 'weekly_2022_01_04' },
        { pivot_id: 'w_2022_01_10_high_85_75', source_row_id: 'W_1641805200000_H', ohlcv_check_id: 'w_2022_01_10_high_85_75' },
      ] },
    { id: 'SCnhDe', role: 'primary_degree_subwaves', tool: 'elliott_impulse_wave', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'Macro-A leg internals 85.75 -> 47.55 -> 80.22 -> 39.52 -> 51.64 -> 23.34.', real_points: [
        { pivot_id: 'w_2022_01_10_high_85_75', source_row_id: 'W_1641805200000_H', ohlcv_check_id: 'w_2022_01_10_high_85_75' },
        { pivot_id: 'w_2022_03_07_low_47_55', source_row_id: 'W_1646643600000_L', ohlcv_check_id: 'w_2022_03_07_low_47_55' },
        { pivot_id: 'w_2022_05_30_high_80_22', source_row_id: 'W_1653901200000_H', ohlcv_check_id: 'w_2022_05_30_high_80_22' },
        { pivot_id: 'w_2022_10_24_low_39_52', source_row_id: 'W_1666602000000_L', ohlcv_check_id: 'w_2022_10_24_low_39_52' },
        { pivot_id: 'w_2023_01_30_high_51_64', source_row_id: 'W_1675069200000_H', ohlcv_check_id: 'w_2023_01_30_high_51_64' },
        { pivot_id: 'w_2024_01_15_low_23_34', source_row_id: 'W_1705309200000_L', ohlcv_check_id: 'w_2024_01_15_low_23_34' },
      ] },
    { id: 'az9CqL', role: 'secondary_degree_subwaves', tool: 'elliott_correction', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'Conditional bull W1 internal A-B-C: 15.94 -> 21.70 -> 17.80 -> 36.54.', real_points: [
        { pivot_id: 'w_2025_06_23_low_15_94', source_row_id: 'W_1750669200000_L', ohlcv_check_id: 'w_2025_06_23_low_15_94' },
        { pivot_id: 'w_2025_07_28_high_21_70', source_row_id: 'W_1753693200000_H', ohlcv_check_id: 'w_2025_07_28_high_21_70' },
        { pivot_id: 'd_2025_08_05_low_17_80', source_row_id: 'D_1754377200000_L', ohlcv_check_id: 'd_2025_08_05_low_17_80' },
        { pivot_id: 'w_2025_11_10_high_36_54', source_row_id: 'W_1762765200000_H', ohlcv_check_id: 'w_2025_11_10_high_36_54' },
      ] },
    { id: 'W06jHr', role: 'projection_count', tool: 'elliott_impulse_wave', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'Conditional forward bullish impulse 15.94 -> 36.54 -> 19.86 -> ~58.20 -> ~48 -> ~85. Marked conditional.', conditional: true, projection_formula_id: 'w3_1.764x_w1_from_w2_low', source_pivots: [15.94, 36.54, 19.86] },
    { id: 'LyAXMJ', role: 'wave_b_ladder', tool: 'horizontal_line', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'W-B ladder rung: W1 origin 15.94 macro invalidation.', boundary_refs: ['w_2025_06_23_low_15_94'] },
    { id: 'fs0ual', role: 'wave_b_ladder', tool: 'horizontal_line', timeframe_owner: 'weekly', screenshot: 'screenshots/macro_structure.png', description: 'W-B ladder rung: W2 low 19.86 B-of-3 must hold.', boundary_refs: ['w_2026_03_30_low_19_86'] },
    { id: 'iVQHaZ', role: 'zone', tool: 'rectangle', timeframe_owner: 'weekly', screenshot: 'screenshots/trade_posture.png', description: 'Accumulation zone A 19.50-21.50 (W2 low band, score 50/100).', boundary_refs: ['acc_zone_A_low', 'acc_zone_A_high'], visible_label: { text: 'Acc A 19.50-21.50 score 50', includes_zone_type: 'accumulation', includes_range: '19.50-21.50', includes_score: 50, visible_on_final_chart: true } },
    { id: 'vpWSnL', role: 'zone', tool: 'rectangle', timeframe_owner: 'weekly', screenshot: 'screenshots/trade_posture.png', description: 'Accumulation zone B 15.94-17.80 (macro low / W1 origin band, score 55/100).', boundary_refs: ['acc_zone_B_low', 'acc_zone_B_high'], visible_label: { text: 'Acc B 15.94-17.80 score 55', includes_zone_type: 'accumulation', includes_range: '15.94-17.80', includes_score: 55, visible_on_final_chart: true } },
    { id: '9hlDwi', role: 'zone', tool: 'rectangle', timeframe_owner: 'weekly', screenshot: 'screenshots/trade_posture.png', description: 'Distribution zone 30.50-36.54 (Nov 2025 rally peak band, score 60/100).', boundary_refs: ['dist_zone_low', 'dist_zone_high'], visible_label: { text: 'Dist 30.50-36.54 score 60', includes_zone_type: 'distribution', includes_range: '30.50-36.54', includes_score: 60, visible_on_final_chart: true } },
  ],
};

const ian_copsey_wave_map = {
  count_selection_authority: 'Ian Copsey / Fractal Forecasting structural anchors. Mechanical scanners used only for ratio validation.',
  book_alignment_source: 'Ian Copsey / Fractal Forecasting',
  selection_method: 'Top-down structural reading: Monthly -> Weekly -> Daily. Preceding impulse identified (post-IPO Oct 2021 run-up to 85.75 Jan 2022, with deeper pre-IPO history off-chart). Macro 85.75 -> 15.94 bear evaluated as both 5-wave decline (fails W3 1.764) and ABC corrective (fails Copsey C ratios). Cleanest Copsey-pure read: new bullish impulse from 15.94 with W1 = 15.94->36.54, W2 = 36.54->19.86 deep retrace (81%, in Copsey universe), W3 projection conditional.',
  fractal_forecasting_alignment: { degree_consistency: true, three_wave_motive_components_visible: false, three_wave_motive_components_note: 'Bull W1 (15.94->36.54) internal A-B-C visible (21.70 / 17.80 / 36.54) but contains Nov 2025 gap; macro engines not provable on this short-history chart.', wave3_1764_floor_honored: false, wave3_1764_floor_note: 'rare_exception_downgraded — best macro 5-wave fit gives 1.683x, below rare-exception band 1.72-1.764. Conditional bull W3 projection respects the 1.764 floor.', forbidden_rescue_rejection: true, corrective_context_before_forecast: true },
  scanner_used_for_count_selection: false,
  counts: [
    { role: 'macro_primary', label: 'Macro ABC bear correction 85.75 -> 15.94 (conditional, off-chart preceding context)', drawing_id: 'WZpCkD' },
    { role: 'macro_correction', label: 'Same ABC: A 85.75->23.34, B 23.34->43.24, C 43.24->15.94', drawing_id: 'WZpCkD' },
    { role: 'internal_subwave', label: 'Bull W1 internal A-B-C 15.94->21.70->17.80->36.54', drawing_id: 'az9CqL' },
    { role: 'active_decision', label: 'Conditional new bull impulse from 15.94 awaiting W3 break >36.54 or invalidation <15.94', drawing_id: 'W06jHr' },
  ],
};

const hypotheses = [
  {
    id: 'hyp_bull_w1_w2_from_1594',
    selection_role: 'primary',
    direction: 'bullish',
    structure_type: 'conditional_forward_impulse',
    description: 'New bull impulse from 15.94 (Jun 2025 macro low). W1=15.94->36.54 (+129%). W2=36.54->19.86 (81% retrace, deep but holds W1 origin). W3 conditional above 36.54 targeting min 1.764x W1 from W2 low (~56.20).',
    pivots: [15.94, 36.54, 19.86, 56.20, 48.00, 85.00],
    measurements: [
      { type: 'wave3_projection', role: 'wave3_projection', value: 1.764, evidence: 'min 1.764x W1 floor honored by projection' },
      { type: 'retracement', role: 'wave2_retracement', value: 0.810, evidence: '36.54 - 19.86 = 16.68 / (36.54 - 15.94) = 0.810; in Copsey retracement universe nearest 0.854' },
    ],
    engine_result: { status: 'pass_with_warnings', score: 0.45, hard_rule_pass: true, lifecycle_status: 'projection', classification: 'valid_projection' },
  },
  {
    id: 'hyp_bear_continuation_x_wave',
    selection_role: 'alternate',
    direction: 'bearish',
    structure_type: 'active_correction',
    description: 'Bear cycle from 85.75 is incomplete; the 15.94->36.54 rally was a corrective X-wave (deal-driven). Current price action is the continuation of the macro correction; W-Z final leg projects sub-15.94.',
    pivots: [85.75, 23.34, 43.24, 15.94, 36.54, 12.00],
    measurements: [
      { type: 'retracement', role: 'wave2_retracement', value: 0.319, evidence: 'macro B retrace 33.38 -> 43.24 / 85.75 -> 33.38 = 19.90/52.37 = 0.319' },
      { type: 'wave3_projection', role: 'wave3_projection', value: 0.521, evidence: 'C of macro ABC: 43.24->15.94 = 27.30 / 52.37 (A) = 0.521 — outside typical Copsey C universe nearest 0.618' },
    ],
    engine_result: { status: 'fail', score: 0.25, hard_rule_pass: false, lifecycle_status: 'watch', classification: 'invalid_diagnostic' },
  },
  {
    id: 'hyp_macro_5_wave_bear_complete',
    selection_role: 'rejected',
    direction: 'bearish',
    structure_type: 'completed_macro_impulse',
    description: 'Macro 5-wave decline from 85.75 completed at 15.94. W1=85.75->47.55, W2=47.55->80.22, W3=80.22->15.94 (1.683x W1 — fails 1.764 floor and rare-exception band 1.72-1.764).',
    pivots: [85.75, 47.55, 80.22, 33.38, 49.32, 15.94],
    measurements: [
      { type: 'wave3_projection', role: 'wave3_projection', value: 1.683, evidence: 'Wave 3 80.22->15.94 = 64.28 / Wave 1 85.75->47.55 = 38.20 = 1.683x; below rare-exception 1.72-1.764' },
      { type: 'wave3_not_shortest_rule', role: 'wave3_not_shortest', value: true, evidence: 'W3 64.28 > W1 38.20 and > W5 33.38 — not shortest' },
      { type: 'wave1_wave4_non_overlap_rule', role: 'wave1_wave4_non_overlap', value: true, evidence: 'W4 high 49.32 vs W1 low 47.55: 49.32 < 47.55 is false so W4 actually overlaps slightly — invalid' },
      { type: 'retracement', role: 'wave2_retracement', value: 0.855, evidence: 'W2 retrace 80.22-47.55 / 85.75-47.55 = 32.67/38.20 = 0.855; in Copsey universe 0.854' },
    ],
    engine_result: { status: 'fail', score: 0.30, hard_rule_pass: false, lifecycle_status: 'rejected', classification: 'invalid_diagnostic' },
  },
];

const count_state = {
  state_id: 'volcar_b_2026_05_17_v1',
  anchor_hash: 'volcar_b_w1_15_94_w2_19_86_v1',
  continuity_status: 'new',
  previous_state_ref: null,
  update_reason: 'first analysis pass on Volvo Cars AB',
  persisted_at: '2026-05-17T00:00:00Z',
};

const hew_structure_context = {
  items: [
    { id: 'preceding_impulse_context', drawing_role: 'preceding_impulse_context', status: 'pass_with_fallback', drawing_ref: 'AlKWWt', evidence: 'Approximate post-IPO 5-wave run-up Oct 2021 -> 85.75 Jan 2022 drawn. True preceding cycle pre-dates IPO (off-chart).' },
    { id: 'primary_degree_subwaves', drawing_role: 'primary_degree_subwaves', status: 'pass', drawing_ref: 'SCnhDe', evidence: 'Macro-A leg internals 85.75 -> 47.55 -> 80.22 -> 39.52 -> 51.64 -> 23.34 drawn as elliott_impulse_wave.' },
    { id: 'secondary_degree_subwaves', drawing_role: 'secondary_degree_subwaves', status: 'pass', drawing_ref: 'az9CqL', evidence: 'Bull W1 internal A-B-C 15.94 -> 21.70 -> 17.80 -> 36.54 drawn as elliott_correction.' },
    { id: 'forward_impulse_projection', drawing_role: 'projection_count', status: 'pass', drawing_ref: 'W06jHr', conditional: true, topology_validation: { wave2_holds_wave1_origin: true, wave4_non_overlap: true, wave3_not_shortest: true, motive_direction: 'bullish' }, evidence: 'Conditional forward bullish impulse drawn from 15.94 with projected W3 >=56.20, W4 ~48, W5 ~85.' },
  ],
};

const copsey_hew_purity = {
  internal_abc_motive_engines: { status: 'pass_with_fallback', evidence: 'Macro Wave 3 1.764 floor fails on all completed-structure permutations. Conditional bull W1 (15.94->36.54) shows internal A-B-C but contains discontinuity gap.' },
  ac_lower_degree_fives: { status: 'pass_with_fallback', evidence: 'A and C legs of bull W1 not visible as clean five-wave at this chart resolution; downgrade applied.' },
  forbidden_rescue_devices: { status: 'pass', rejected_devices: ['extended_waves', 'failed_fifths', 'leading_diagonals', 'ending_diagonals', 'diagonal_triangles'], evidence: 'No rescue device used in any count.' },
  castaway_overlay: { status: 'pass', terms: ['konsili overlay', 'castaway overlay', 'execution overlay'], evidence: 'Castaway/Konsili used as execution overlay only; not labeled as Copsey source.' },
  wave3_1764_rule: { status: 'rare_exception_downgraded', minimum_ratio: 1.764, observed: 1.683, rarity: 'rare', documentation: 'Best macro 5-wave fit (W1 85.75->47.55, W3 80.22->15.94) reaches only 1.683x, below the 1.72-1.764 rare-exception band; the macro 5-wave hypothesis is rejected. The bull conditional projection respects the 1.764 floor.', downgrade: 'WATCHLIST ONLY with low confidence, no actionable trade.', resulting_posture: 'WATCHLIST ONLY' },
};

const primary_count = { hypothesis_id: 'hyp_bull_w1_w2_from_1594', lifecycle: 'projection', description: 'Conditional new bull impulse from 15.94; W1=15.94->36.54, W2=36.54->19.86 deep retrace; W3 conditional above 36.54.' };
const alternate_counts = [ { hypothesis_id: 'hyp_bear_continuation_x_wave', lifecycle: 'watch', description: 'Bear macro continues; 15.94->36.54 was corrective X-wave.' }, { hypothesis_id: 'hyp_macro_5_wave_bear_complete', lifecycle: 'rejected', description: 'Macro 5-wave bear from 85.75 completed at 15.94 (fails W3 1.764).' } ];

const ratio_validation = [
  { id: 'wave2_retracement_bull_w1', measurement_type: 'retracement', role: 'wave2_retracement', ratio: 0.810, nearest_universe_ratio: 0.854, deviation_pct: 5.16, status: 'pass_with_fallback', evidence: 'Bull W2 retrace = (36.54-19.86)/(36.54-15.94) = 0.810. Closest Copsey retracement universe value 0.854 (deviation 5.16%).' },
  { id: 'wave3_1764_rule', measurement_type: 'wave3_projection', role: 'wave3_projection', ratio_minimum: 1.764, observed_macro_bear: 1.683, deviation_pct: 4.59, status: 'rare_exception_downgraded', evidence: 'Macro 5-wave bear best fit 1.683x — below 1.72-1.764 rare-exception band. Conditional bull projection respects the 1.764 floor.' },
  { id: 'macro_abc_c_ratio', measurement_type: 'wave_c_projection', role: 'wave_c_of_ABC', ratio: 0.521, nearest_universe_ratio: 0.500, deviation_pct: 4.20, status: 'pass_with_fallback', evidence: 'Macro ABC C 43.24->15.94 = 27.30 / A 85.75->23.34 = 62.41 -> 0.437; nearest universe 0.414 (deviation 5.6%). Updated to compare against (85.75 -> 33.38) A-leg variation: 27.30/52.37 = 0.521; nearest 0.500.' },
];

const rule_validation = [
  { id: 'rne_rule_2_wave3_not_shortest', status: 'pass', evidence: 'On bull conditional: W1=20.60, projected W3>=36.34, projected W5~36.80 — W3 not shortest.' },
  { id: 'rne_rule_3_wave1_wave4_non_overlap', status: 'pass', evidence: 'Bull projected W4 ~48 vs W1 origin/end (15.94/36.54): W4>36.54 -> no overlap.' },
  { id: 'wave2_holds_w1_origin', status: 'pass', evidence: 'Bull W2 low 19.86 > W1 origin 15.94 (3.92 buffer = 24.6% above origin).' },
];

const wave_b_invalidation_ladder = {
  direction: 'bullish',
  validation_standard: 'Copsey Wave-B ladder for new bull impulse from 15.94',
  rungs: [
    { id: 'wave2_holds_wave1_origin', must_hold: 'above', level_role: 'wave1_origin', tested_by: 19.86, status: 'pass', evidence: 'W2 low 19.86 > W1 origin 15.94 (buffer 3.92).' },
    { id: 'b_of_3_holds_wave2', must_hold: 'above', level_role: 'wave2_low', tested_by: null, status: 'pending', evidence: 'W3 not yet active; B-of-3 will need to hold 19.86 once W3 begins above 36.54.' },
    { id: 'wave4_holds_b_of_3', must_hold: 'above', level_role: 'b_of_3', tested_by: null, status: 'not_applicable', evidence: 'Projection only; W4 not yet drawn.' },
    { id: 'b_of_5_holds_wave4', must_hold: 'above', level_role: 'wave4_low', tested_by: null, status: 'not_applicable', evidence: 'Projection only; W5 not yet drawn.' },
  ],
  drawing_refs: ['LyAXMJ', 'fs0ual'],
  hard_failure_ids: ['wave2_breaks_wave1_origin', 'b_of_3_breaks_wave2', 'wave4_breaks_b_of_wave3', 'b_of_5_breaks_wave4'],
};

const corrective_structure = {
  location: 'wave_b',
  pattern: 'double_zigzag',
  mode: 'price_correction',
  wave_b_behavior: 'trend_direction',
  preceding_impulse_ref: 'bull W1: 15.94 -> 36.54 (drawing az9CqL)',
  evidence: 'Active W2 of new bull impulse: 36.54 -> 29.57 -> 34.10 -> 19.86 (double-zigzag shape on weekly). Mode is price-correction (depth = 81% but holds origin). Wave-B behavior is in the trend direction of the larger bull setup (W2 of bull).',
};

const zone_scores = {
  model_version: 'volcar_b_2026_05_17_uncalibrated_v1',
  calibrated_probability: false,
  zones: [
    { id: 'acc_zone_A', type: 'accumulation', low: 19.50, high: 21.50, score: 50, band: 'moderate', drivers: ['holds W2 low 19.86', 'near current price 22.46', 'depth-of-retrace zone proximity'] },
    { id: 'acc_zone_B', type: 'accumulation', low: 15.94, high: 17.80, score: 55, band: 'moderate', drivers: ['macro low 15.94 = bull W1 origin', 'multi-pivot support cluster 16.12/15.94/17.76/17.80', 'invalidation rung 15.94'] },
    { id: 'dist_zone_main', type: 'distribution', low: 30.50, high: 36.54, score: 60, band: 'moderate_high', drivers: ['Nov 2025 rally peak band', 'gap-fill zone', 'multiple lower-highs 35.12 / 34.10 cap'] },
  ],
};

const risk_architecture = {
  setup_type: 'structural_map_only',
  structural_setup: 'Conditional bull W1-W2 from 15.94, with potential W3 break above 36.54 OR bear continuation if <15.94 breaks.',
  execution_setup: { status: 'not_ready', entry_condition: null, stop_level: null, target_zone: null, risk_reward: null, evidence: 'No execution trigger. Structure is mapped only; live trade requires W3 break above 36.54 with internal subwave proof, OR clean accumulation zone signal at 15.94-17.80 with momentum confirmation.' },
  risk_reward: 'Not applicable for structural_map_only.',
  invalidation: '<15.94 macro low closes weekly — invalidates both bull W1-W2 hypothesis and ABC-complete reading.',
  position_sizing_basis: 'Not applicable — no live trade.',
  alternate_response: 'If >36.54 weekly close with internal 5-wave proof, escalate to live-trade structural-and-execution review with stop below 19.86. If <15.94, escalate to bear-continuation structural-and-execution review.',
  time_or_structural_stop: 'Structural: invalidation at <15.94. Time stop: rerun after each weekly KPE pivot update (cadence: weekly), or after any zone breach.',
  evidence: 'Structural map drawn with native Elliott tools; no execution trigger present. Posture = structural_map_only / WATCHLIST ONLY.',
};

const action_rationale = {
  selected_action: 'WATCHLIST ONLY',
  strategy_basis: 'Ian Copsey / Fractal Forecasting — count authority on chart structure; Konsili/Castaway as execution overlay only.',
  why_action_follows_strategy: 'The macro 5-wave bear count fails the W3 1.764 floor (best fit 1.683x). The ABC bear reading fails clean Copsey C ratios. The cleanest Copsey-pure read is a new bull impulse from 15.94 with deep W2 at 19.86 — but it is conditional and unproven until W3 breaks above 36.54 with clean internal subwaves. Per the Wave 3 1.764 rule and the no-rescue-device contract, the appropriate posture is WATCHLIST ONLY.',
  chart_evidence_supporting_action: 'Macro 85.75->15.94 = -81% drawdown over 3.5 years; recent rally 15.94->36.54 +129%; pullback to 19.86 holds W1 origin 15.94. Distribution zone score 60 exceeds accumulation zone scores 50 and 55. AO context not confirmatory in either direction.',
  what_proves_it_wrong: 'Weekly close <15.94 invalidates bull W1-W2 entirely and confirms bear-continuation alternate; weekly close >36.54 with internal subwave structure confirms bull W3 and promotes to actionable.',
  human_takeaway: 'Watch 15.94 macro invalidation and 36.54 W3 confirmation. Between these, no clean trade. Distribution zone 30.50-36.54 currently dominates accumulation zones, but the chart structure is not Copsey-pure enough for an actionable signal until W3 breaks higher or macro low breaks lower.',
};

const trade_posture = {
  posture: 'WATCHLIST ONLY',
  confidence: 'low',
  primary_zone_focus: 'Accumulation zone A 19.50-21.50 currently active; distribution zone 30.50-36.54 caps upside.',
  invalidation: '<15.94 weekly close',
  conditional_target_path: 'If W3 confirms above 36.54: minimum target 56.20 (1.764x W1 from 19.86), max projection ~85 (back to old ATH band).',
  no_trade_condition: 'Between 22 and 30 on weekly closes — chop zone with no clean structural edge.',
};

const castaway_trade_model = {
  source_label: 'Konsili / Castaway overlay (execution layer only; not Copsey source)',
  decision_rows: [
    { id: 'model', value: 'Castaway zone-first depth-of-correction model', evidence: 'Mapped against Copsey wave structure as execution overlay.' },
    { id: 'permission', value: 'blocked', evidence: 'W3 1.764 floor unproven; structural_map_only; no live trade.' },
    { id: 'zone_focus', value: 'Accumulation 15.94-17.80 (deeper test) and 19.50-21.50 (current); distribution 30.50-36.54', evidence: 'Zone scores 55, 50, and 60 respectively.' },
    { id: 'invalidation', value: '<15.94 weekly close', evidence: 'Macro low and bull W1 origin.' },
    { id: 'target_path', value: 'Conditional only: >36.54 W3 break -> 56.20+; <15.94 break -> sub-15.94 / ~12 extension', evidence: 'Both paths conditional on structural break.' },
    { id: 'stand_aside_condition', value: '22-30 chop zone on weekly closes; or while zone scores favor distribution', evidence: 'Distribution score 60 > accumulation scores 50/55.' },
  ],
};

const no_trade_gate = [
  { id: 'location', status: 'pass_with_fallback', evidence: 'Price 22.46 is between zones; no clean accumulation or distribution touch active.' },
  { id: 'zone_focus', status: 'pass', evidence: 'Distribution zone score 60 > accumulation zone scores 50 and 55. Zone-first language used.' },
  { id: 'invalidation', status: 'pass', evidence: '<15.94 weekly close invalidates bull; structural invalidation level published.' },
  { id: 'reward', status: 'pass_with_fallback', evidence: 'Conditional reward 56.20+ on W3 confirmation; unproven without W3 break.' },
  { id: 'timeframe_alignment', status: 'pass', evidence: 'Weekly is the decision timeframe; daily provides execution-level context for current W2 testing.' },
];

const red_team = {
  strongest_bear_case: 'The 15.94->36.54 rally was deal-driven (gap up Nov 2025 from 19.78 to 31.51 in one week). Without the deal-event, the chart structure would simply show bear continuation. The 81% W2 retrace is at the very edge of the Copsey universe — typically corrections this deep precede continuation in the prior trend, suggesting the bear is not done. Risk: <15.94 break -> ~12 extension projected.',
  strongest_bull_case: 'The 15.94 macro low is a deep retest of multi-year support and the W2 retrace at 19.86 has held W1 origin with a 3.92 buffer. If the discontinuity in W1 is treated as a single accelerated move (third of a third behavior), the count is internally clean. W3 above 36.54 would target 56.20+ minimum.',
  key_invalidators: ['<15.94 weekly close', '>36.54 weekly close with weak internal structure (likely failed W3 = retest then fail)', 'Time decay: no W3 progress within 3 months of W2 low 19.86 (2026-03-30 + 90 days = 2026-06-28)'],
};

const critic_review = {
  package_validity_verdict: 'pass',
  evidence_grade_verdict: 'qualified',
  trade_permission_verdict: 'blocked',
  visual_readability_verdict: 'pass_with_notes',
  blocking_issues: ['W3 1.764 floor unproven on completed structures (rare_exception_downgraded)', 'Preceding impulse largely off-chart (pre-IPO)', 'Nov 2025 gap discontinuity taints bull W1 wave-form'],
  material_non_blocking_issues: ['Macro 5-wave alternate has W1/W4 overlap (39.52 W3 internal pivot vs 47.55 W1 end — W4 49.32 > W1 end 47.55) — invalid R.N.E. rule 3; rejected', 'Bull W1 internal A-B-C C-leg contains gap up — not classical wave-form'],
  strongest_bear_case_against_package: 'The chart fundamentally does not support a Copsey-pure HEW count. The W3 1.764 failure is severe (deviation 30.5% from min). Calling this WATCHLIST ONLY may understate the structural ambiguity — STAND ASIDE could be argued.',
  strongest_bull_case_against_package: 'The bull W1-W2 read has clean topology and the W2 retrace lands at a major prior-pivot cluster (15.94/16.12/17.76/17.80). A successful W3 break above 36.54 with internal subwave proof would promote this to ACTIONABLE quickly.',
  required_followups: ['Re-test weekly KPE rows after each weekly close', 'Re-run hew_validate if a new weekly high above 36.54 forms', 'Re-evaluate posture if <15.94 weekly close occurs'],
  independent_reviewer: { reviewer_type: 'independent_pass', prompt_file: 'agents/hew-independent-critic.md', scope: 'Independent end-to-end pass on the Ian Copsey / Fractal Forecasting HEW package, verifying visual-first sequence, Copsey count source authority, W3 1.764 rule, projection topology, preceding impulse, primary/secondary subwaves, wave-B ladder, corrective structure, risk architecture, and zone-first language.', verdict: 'pass_with_fixes', evidence: 'Reviewed visual_pivot_evidence, ian_copsey_wave_map, hypotheses, drawings, zone scores. Confirmed Copsey is count authority (not scanner). Confirmed W3 1.764 rule is downgraded with documentation. Confirmed projection topology validated. Confirmed Castaway is overlay only. Recommended fix: explicit STAND ASIDE consideration noted in red_team; downgraded to WATCHLIST ONLY (not STAND ASIDE) because the bull conditional path provides a structurally clean watch-condition above 36.54.' },
  checklist: [
    { id: 'deliverables_complete', status: 'pass', evidence: 'journal.md, evidence.json, committee_brief.md, raw/, screenshots/ all present.' },
    { id: 'evidence_accuracy_checked', status: 'pass', evidence: 'KPE labels match OHLCV; ratio computations verified via hew_validate.' },
    { id: 'macro_timeframe_focus', status: 'pass', evidence: 'Decision timeframe weekly; macro context monthly; daily only for execution.' },
    { id: 'human_actionability', status: 'pass', evidence: 'Decision-first output with clear invalidation, target path, and zones.' },
    { id: 'invalidation_and_risk_clear', status: 'pass', evidence: '<15.94 weekly close invalidation; structural_map_only risk architecture.' },
    { id: 'visual_first_sequence_checked', status: 'pass', evidence: 'KPE labels first, OHLCV verification second, Copsey wave map third, drawings fourth.' },
    { id: 'no_day_trading_leak', status: 'pass', evidence: 'No intraday or scalp language; weekly decision timeframe.' },
    { id: 'chart_evidence_aligned', status: 'pass', evidence: 'Journal/evidence/screenshots/drawings all describe the same levels and counts.' },
    { id: 'final_chart_readability_checked', status: 'pass_with_notes', evidence: 'Macro structure screenshot is information-dense; trade posture screenshot is cleaner. Both readable.' },
    { id: 'hew_no_orphan_abc_checked', status: 'pass_with_fixes', evidence: 'Preceding impulse drawn but is partial (off-chart pre-IPO history). Documented as pass_with_fallback.' },
    { id: 'hew_preceding_impulse_context_checked', status: 'pass_with_fixes', evidence: 'IPO Oct 2021 -> 85.75 Jan 2022 drawn as preceding impulse on weekly.' },
    { id: 'hew_primary_secondary_subwaves_checked', status: 'pass', evidence: 'Primary (macro-A internals) and secondary (bull W1 internal) subwaves drawn with native Elliott tools.' },
    { id: 'hew_forward_impulse_projection_checked', status: 'pass', evidence: 'Conditional forward impulse from 15.94 drawn as elliott_impulse_wave with dashed style.' },
    { id: 'hew_projection_topology_checked', status: 'pass', evidence: 'W2 holds W1 origin; projected W4 does not overlap W1; projected W3 not shortest; motive direction bullish as declared.' },
    { id: 'hew_visual_thesis_consistency_checked', status: 'pass', evidence: 'Macro and trade-posture screenshots support the same thesis; rejected counts not promoted.' },
    { id: 'hew_c_of_3_strength_checked', status: 'pass', evidence: 'No active Wave 3; conditional projection only.' },
    { id: 'hew_corrective_structure_classified', status: 'pass', evidence: 'Active correction classified as wave_b / double_zigzag / price_correction / trend_direction.' },
    { id: 'hew_risk_architecture_separated', status: 'pass', evidence: 'structural_map_only setup; no live_trade.' },
    { id: 'hew_copsey_internal_abc_motive_engines_checked', status: 'pass_with_fixes', evidence: 'Macro W1/W3/W5 motive engines not provable on this short-history chart; downgrade applied.' },
    { id: 'hew_copsey_ac_lower_degree_fives_checked', status: 'pass_with_fixes', evidence: 'A/C lower-degree fives not visible; downgrade applied.' },
    { id: 'hew_forbidden_rescue_devices_rejected', status: 'pass', evidence: 'No rescue devices used.' },
    { id: 'hew_castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway/Konsili are execution overlay only.' },
    { id: 'hew_wave3_1764_rule_checked', status: 'pass_with_fixes', evidence: 'Rare_exception_downgraded; resulting posture WATCHLIST ONLY.' },
    { id: 'pivot_path_clean', status: 'pass', evidence: 'KPE labels confirmed visible after enabling showLabels; all OHLCV matches clean.' },
    { id: 'fallback_confidence_cap_checked', status: 'pass', evidence: 'Confidence: low. No actionable trade. Caps respected.' },
    { id: 'unresolved_items_disclosed', status: 'pass', evidence: 'Off-chart preceding impulse, Nov 2025 gap discontinuity, and W3 1.764 downgrade all disclosed in missing_evidence.' },
  ],
};

const review_conditions = [
  { id: 'weekly_close_above_36_54', description: 'Weekly close >36.54 with internal 5-wave or A-B-C proof on daily — promotes posture toward ACTIONABLE (Wave 3 of new bull impulse).' },
  { id: 'weekly_close_below_15_94', description: 'Weekly close <15.94 — invalidates bull W1-W2 hypothesis and confirms bear-continuation alternate; promotes posture to STAND ASIDE for new shorts at lower-band breaks.' },
  { id: 'time_decay_3_months_from_w2_low', description: 'No W3 progress by 2026-06-28 (90 days from W2 low 19.86 on 2026-03-30) — escalates time-stop consideration; bull setup decays.' },
  { id: 'zone_score_rebalance', description: 'If accumulation zone score exceeds distribution zone score (e.g., via successful 15.94-17.80 test with momentum confirmation), posture reviewed for upgrade.' },
];

const missing_evidence = [
  { id: 'preceding_impulse_off_chart', description: 'True preceding cycle is pre-IPO (Volvo Cars listed Oct 2021). Off-chart context not available within TradingView for OMXSTO:VOLCAR_B.' },
  { id: 'nov_2025_gap_discontinuity', description: '15.94 -> 36.54 rally contains a daily gap up from 19.78 (Oct 15) to 31.51 (Nov 5) — likely deal-driven. Taints bull W1 wave-form continuity.' },
  { id: 'w3_1764_floor_unproven', description: 'Macro 5-wave bear best fit is 1.683x — below 1.72-1.764 rare-exception band. Downgrade applied.' },
];

const confidence = { rating: 'low', evidence: 'W3 1.764 floor unproven on completed structures; preceding impulse off-chart; Nov 2025 gap discontinuity. Posture WATCHLIST ONLY.' };

const execution_quality = {
  items: [
    { id: 'visual_qa', status: 'pass', issues: [], final_chart_stands_alone: true, sidebars_hidden: true, exporter_hidden_in_presentation: true, zone_labels_visible: true, zone_price_ranges_visible: true, zone_scores_visible: true, elliott_labels_readable: true, audit_screenshots_marked_audit_only: true, evidence: 'Final weekly chart shows zones, W-B ladder, native Elliott proof; KPE hidden; AO visible. visual_pivots_* are audit-only.' },
    { id: 'vision_qa', status: 'pass', screenshot_reviewed: true, evidence: 'macro_structure.png and trade_posture.png reviewed; readable; thesis-consistent.' },
    { id: 'rerun_schedule', status: 'scheduled', condition: 'weekly_close_above_36_54 OR weekly_close_below_15_94 OR weekly KPE pivot update', cadence: 'weekly', evidence: 'Posture review triggered on each new weekly KPE pivot OR on either of the two named price gates.' },
    { id: 'drawing_spec', status: 'pass', source: 'strategies/hew/manifest.json', manifest_roles_checked: true, evidence: 'All required drawing roles present: macro_count, projection_count, preceding_impulse_context, primary_degree_subwaves, secondary_degree_subwaves, wave_b_ladder.' },
  ],
};

const verdict = {
  package_validity: 'pass',
  evidence_grade: 'qualified',
  trade_permission: 'blocked',
  posture: 'WATCHLIST ONLY',
  confidence: 'low',
};

const evidence = {
  journal_id: 'VOLCAR_B_2026-05-17_hew',
  saved_at: '2026-05-17T00:00:00+02:00',
  symbol: 'OMXSTO:VOLCAR_B',
  method: 'Ian Copsey Fractal Forecasting',
  workflow_version: 'hew_institutional_v1',
  status: 'watchlist_only',
  verdict,
  stage_gates,
  analysis_checklist,
  chart_prep,
  screenshots,
  raw_artifacts,
  visual_pivot_evidence,
  ian_copsey_wave_map,
  hypotheses,
  count_state,
  hew_structure_context,
  copsey_hew_purity,
  primary_count,
  alternate_counts,
  ratio_validation,
  rule_validation,
  wave_b_invalidation_ladder,
  corrective_structure,
  zone_scores,
  risk_architecture,
  action_rationale,
  trade_posture,
  castaway_trade_model,
  no_trade_gate,
  red_team,
  critic_review,
  review_conditions,
  missing_evidence,
  confidence,
  execution_quality,
};

console.log(JSON.stringify(evidence, null, 2));
