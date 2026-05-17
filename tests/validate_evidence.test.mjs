import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { scoreHewHypothesis } from '../scripts/ratio_engine.mjs';
import { validateEvidenceFile } from '../scripts/validate_evidence.mjs';
import {
  assembleHewPackageFromCollectedData,
  createHewEvidenceSkeleton
} from '../scripts/create_hew_package.mjs';

const requiredVisualFirstGates = ['visual_pivot_extraction', 'ohlcv_pivot_verification'];

function kpeRow(tf, id, type, time, price, date) {
  return `KPE|v=2|tf=${tf}|id=${id}|type=${type}|date=${date}|time=${time}|price=${price}|timezone=Etc/UTC|left=5|right=5|confirmed=true`;
}

function derivedTripleTargets() {
  return [
    { id: 't1', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.4, direction: 'bullish' },
    { id: 't2', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.48, direction: 'bullish' },
    { id: 't3', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.44, direction: 'bullish' }
  ];
}

function baseHypothesis(overrides = {}) {
  const hypothesis = {
    id: 'hypothesis_primary',
    selection_role: 'primary',
    direction: 'bullish',
    structure_type: 'completed_primary_impulse',
    wave_iii_complete: true,
    pivots: [
      { id: 'p0', price: 100 },
      { id: 'p1', price: 125 },
      { id: 'p2', price: 110 },
      { id: 'p3', price: 170 },
      { id: 'p4', price: 140 },
      { id: 'p5', price: 187 },
      { id: 'a0', price: 190 },
      { id: 'a1', price: 150 },
      { id: 'b1', price: 210 },
      { id: 'c1', price: 145 },
      { id: 'b_of_3', price: 130 }
    ],
    measurements: [
      {
        id: 'macro_wave3',
        type: 'wave3_projection',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3' }
      },
      {
        id: 'macro_c',
        type: 'wave_c_projection',
        points: { wave_a_start: 'a0', wave_a_end: 'a1', wave_b_end: 'b1', wave_c_end: 'c1' }
      },
      {
        id: 'c_of_3_strength',
        type: 'c_of_3_strength_rule',
        points: { wave_a_start: 'a0', wave_a_end: 'a1', wave_b_end: 'b1', wave_c_end: 'c1' }
      },
      {
        id: 'macro_wave5',
        type: 'wave5_projection',
        points: { wave1_start: 'p0', wave3_end: 'p3', wave4_end: 'p4', wave5_end: 'p5' }
      },
      {
        id: 'wave2_retracement',
        type: 'retracement',
        role: 'wave2_retracement',
        points: { prior_start: 'p0', prior_end: 'p1', retracement_end: 'p2' }
      },
      {
        id: 'wave4_retracement',
        type: 'retracement',
        role: 'wave4_retracement',
        points: { prior_start: 'p2', prior_end: 'p3', retracement_end: 'p4' }
      },
      {
        id: 'alternation',
        type: 'alternation_sum',
        trend_context: 'corrective',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3', wave4_end: 'p4' }
      },
      {
        id: 'triple_target',
        type: 'triple_confluence',
        targets: derivedTripleTargets()
      },
      {
        id: 'wave4_b3',
        type: 'wave4_b3_rule',
        direction: 'bullish',
        points: { wave4_extreme: 'p4', b_of_3_extreme: 'b_of_3' }
      },
      {
        id: 'wave3_not_shortest',
        type: 'wave3_not_shortest_rule',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3', wave4_end: 'p4', wave5_end: 'p5' }
      },
      {
        id: 'wave1_wave4_non_overlap',
        type: 'wave1_wave4_non_overlap_rule',
        direction: 'bullish',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave4_extreme: 'p4' }
      }
    ],
    ...overrides
  };
  return {
    ...hypothesis,
    engine_result: scoreHewHypothesis(hypothesis)
  };
}

function packageDir(method = 'hew') {
  const dir = mkdtempSync(join(tmpdir(), `konsili-${method}-`));
  mkdirSync(join(dir, 'screenshots'));
  mkdirSync(join(dir, 'raw'));
  writeFileSync(join(dir, 'screenshots', 'pivots.png'), 'fake');
  writeFileSync(join(dir, 'screenshots', 'macro.png'), 'fake');
  writeFileSync(join(dir, 'screenshots', 'trade.png'), 'fake');
  writeFileSync(join(dir, 'journal.md'), '# Journal\n\n![Pivots](screenshots/pivots.png)\n![Macro](screenshots/macro.png)\n![Trade](screenshots/trade.png)\n');
  writeFileSync(join(dir, 'committee_brief.md'), '# Committee Brief\n\nPosture: STAND ASIDE\n');
  const rawFiles = {
    'raw/kpe_monthly.jsonl': '{"row":"monthly"}\n',
    'raw/kpe_weekly.jsonl': '{"row":"weekly"}\n',
    'raw/kpe_daily.jsonl': '{"row":"daily"}\n',
    'raw/ohlcv_monthly.csv': 'time,open,high,low,close\n',
    'raw/ohlcv_weekly.csv': 'time,open,high,low,close\n',
    'raw/ohlcv_daily.csv': 'time,open,high,low,close\n',
    'raw/draw_list_before.json': '[]\n',
    'raw/draw_list_after.json': '[]\n',
    'raw/chart_state_final.json': '{}\n'
  };
  const hashes = {};
  for (const [relative, content] of Object.entries(rawFiles)) {
    writeFileSync(join(dir, relative), content);
    hashes[relative] = createHash('sha256').update(content).digest('hex');
  }
  writeFileSync(join(dir, 'raw', 'hashes.json'), JSON.stringify({ files: hashes }, null, 2));
  return dir;
}

function rawArtifacts() {
  const roles = {
    'raw/kpe_monthly.jsonl': 'kpe_monthly',
    'raw/kpe_weekly.jsonl': 'kpe_weekly',
    'raw/kpe_daily.jsonl': 'kpe_daily',
    'raw/ohlcv_monthly.csv': 'ohlcv_monthly',
    'raw/ohlcv_weekly.csv': 'ohlcv_weekly',
    'raw/ohlcv_daily.csv': 'ohlcv_daily',
    'raw/draw_list_before.json': 'draw_list_before',
    'raw/draw_list_after.json': 'draw_list_after',
    'raw/chart_state_final.json': 'chart_state_final'
  };
  return {
    generated_at: '2026-05-16T08:00:00+02:00',
    files: Object.entries(roles).map(([path, role]) => ({
      role,
      path,
      sha256: createHash('sha256').update({
        'raw/kpe_monthly.jsonl': '{"row":"monthly"}\n',
        'raw/kpe_weekly.jsonl': '{"row":"weekly"}\n',
        'raw/kpe_daily.jsonl': '{"row":"daily"}\n',
        'raw/ohlcv_monthly.csv': 'time,open,high,low,close\n',
        'raw/ohlcv_weekly.csv': 'time,open,high,low,close\n',
        'raw/ohlcv_daily.csv': 'time,open,high,low,close\n',
        'raw/draw_list_before.json': '[]\n',
        'raw/draw_list_after.json': '[]\n',
        'raw/chart_state_final.json': '{}\n'
      }[path]).digest('hex')
    }))
  };
}

function baseEvidence(overrides = {}) {
  return {
    journal_id: 'TEST_2026-05-16_hew',
    saved_at: '2026-05-16T08:00:00+02:00',
    symbol: 'TEST:SYMBOL',
    method: 'Ian Copsey Fractal Forecasting macro',
    workflow_version: 'hew_institutional_v1',
    status: 'watchlist_only',
    verdict: {
      package_validity: 'pass',
      evidence_grade: 'qualified',
      trade_permission: 'blocked',
      posture: 'STAND ASIDE',
      confidence: 'low',
      confidence_cap_reason: 'Institutional fixture uses qualified evidence to exercise material critic caveats.'
    },
    stage_gates: [
      { id: 'route_and_layout', status: 'pass', evidence: 'HEW layout loaded.' },
      { id: 'visual_pivot_extraction', status: 'pass', evidence: 'Visible pivot indicator extracted on Monthly/Weekly/Daily.' },
      { id: 'ohlcv_pivot_verification', status: 'pass', evidence: 'TradingView OHLCV verified the visual pivots.' },
      { id: 'top_down_chart_read', status: 'pass', evidence: 'M/W/D read.' },
      { id: 'drawing_protocol', status: 'pass', evidence: 'Native Elliott drawings used.' },
      { id: 'evidence_contract', status: 'pass', evidence: 'Required fields filled.' },
      { id: 'action_output', status: 'pass', evidence: 'Decision-first action block complete.' },
      { id: 'critic_review', status: 'pass', evidence: 'Final critic passed.' }
    ],
    analysis_checklist: [
      { id: 'visual_pivots_extracted', status: 'pass', evidence: 'indicator pivots extracted visually first' },
      { id: 'ohlcv_pivots_verified', status: 'pass', evidence: 'pivots verified against OHLCV' },
      { id: 'pivot_conflicts_resolved', status: 'pass', evidence: 'no unresolved pivot conflict' },
      { id: 'chart_modes_recorded', status: 'pass', evidence: 'extraction, verification, strategy-proof, and presentation modes recorded' },
      { id: 'preceding_impulse_context_shown', status: 'pass', evidence: 'preceding impulse drawn with native Elliott impulse tool before ABC context' },
      { id: 'primary_secondary_subwaves_drawn', status: 'pass', evidence: 'primary and secondary subwaves drawn with native Elliott tools' },
      { id: 'forward_impulse_projection_drawn', status: 'pass', evidence: 'conditional forward impulse projection drawn with Elliott impulse tool' },
      { id: 'projection_topology_validated', status: 'pass', evidence: 'conditional projection passed Wave 2 origin, Wave 4 overlap, Wave 3 shortest, and motive direction checks' },
      { id: 'visual_thesis_consistency_checked', status: 'pass', evidence: 'final macro and trade-posture screenshots support the same accepted thesis' },
      { id: 'c_of_3_strength_checked', status: 'pass', evidence: 'C of 3 is not shorter than A of 3 in the active impulse measurement.' },
      { id: 'corrective_structure_classified', status: 'pass', evidence: 'Active correction pattern, location, and Wave-B behavior are classified.' },
      { id: 'risk_architecture_separated', status: 'pass', evidence: 'Structural map and executable risk are explicitly separated.' },
      { id: 'copsey_internal_abc_motive_engines_checked', status: 'pass', evidence: 'macro Waves 1, 3, and 5 have internal A-B-C motive engines or visible equivalents' },
      { id: 'copsey_ac_lower_degree_fives_checked', status: 'pass', evidence: 'A and C lower-degree five-wave action checked where visible' },
      { id: 'copsey_forbidden_rescue_devices_rejected', status: 'pass', evidence: 'extended waves, failed fifths, leading/ending diagonals, and diagonal triangles rejected' },
      { id: 'castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway is labeled as a Konsili overlay, not a Copsey source' },
      { id: 'wave3_1764_rule_checked', status: 'pass', evidence: 'Wave 3 176.4% floor checked and no exception used' },
      { id: 'macro_count_subwaves_ratio_aligned', status: 'pass', evidence: 'macro and subwaves drawn with native Elliott tools' },
      { id: 'projection_forward_margin_next_count', status: 'pass', evidence: 'projection path drawn with Elliott tool' },
      { id: 'wave_b_ladder_chart_proof', status: 'pass', evidence: 'ladder screenshot present' },
      { id: 'zone_scores_complete', status: 'pass', evidence: 'zones scored' },
      { id: 'action_rationale_complete', status: 'pass', evidence: 'rationale complete' },
      { id: 'critic_review_complete', status: 'pass', evidence: 'critic complete' }
    ],
    raw_artifacts: rawArtifacts(),
    chart_prep: {
      layout: 'HEW layout',
      drawings_cleared: true,
      visible_ranges_verified: true,
      chart_mode_checklist: [
        { mode: 'extraction', status: 'pass', evidence: 'Konsili Pivot Exporter was visible for visual extraction and screenshot capture.', konsili_pivot_exporter_visible: true },
        { mode: 'verification', status: 'pass', evidence: 'Extracted pivots were checked against OHLCV before HEW selection.' },
        { mode: 'strategy_proof', status: 'pass', evidence: 'Konsili Pivot Exporter hidden; only HEW count/projection/decision proof was drawn after verification.', konsili_pivot_exporter_visible: false },
        { mode: 'presentation', status: 'pass', evidence: 'Konsili Pivot Exporter and pivot scaffold hidden; final readable decision chart verified.', konsili_pivot_exporter_visible: false, pivot_scaffold_visible: false, final_chart_state: 'macro count, projection, invalidation, and zones visible' }
      ],
      drawing_manifest: [
        {
          id: 'preceding_impulse',
          role: 'preceding_impulse_context',
          tool: 'elliott_impulse_wave',
          timeframe_owner: 'macro',
          screenshot: 'screenshots/macro.png',
          points: [
            { label: '0', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '1', pivot_id: 'd_high', date: '2024-01-10 00:00', time: 1704844800000, price: 125, source_row_id: '1D_1704844800000_H', ohlcv_check_id: 'd_high' },
            { label: '2', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '3', pivot_id: 'm_high', date: '2024-01-01 00:00', time: 1704067200000, price: 150, source_row_id: '1M_1704067200000_H', ohlcv_check_id: 'm_high' }
          ]
        },
        {
          id: 'macro',
          role: 'macro_count',
          tool: 'elliott_correction',
          timeframe_owner: 'macro',
          screenshot: 'screenshots/macro.png',
          points: [
            { label: 'A', pivot_id: 'm_high', date: '2024-01-01 00:00', time: 1704067200000, price: 150, source_row_id: '1M_1704067200000_H', ohlcv_check_id: 'm_high' },
            { label: 'B', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: 'C', point_status: 'projected', price: 145, projection_formula_id: 'macro_c_projection', source_pivots: ['m_high', 'w_low'] }
          ]
        },
        {
          id: 'primary_subwaves',
          role: 'primary_degree_subwaves',
          tool: 'elliott_impulse_wave',
          timeframe_owner: 'macro',
          screenshot: 'screenshots/macro.png',
          points: [
            { label: '0', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '1', pivot_id: 'd_high', date: '2024-01-10 00:00', time: 1704844800000, price: 125, source_row_id: '1D_1704844800000_H', ohlcv_check_id: 'd_high' },
            { label: '2', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '3', pivot_id: 'm_high', date: '2024-01-01 00:00', time: 1704067200000, price: 150, source_row_id: '1M_1704067200000_H', ohlcv_check_id: 'm_high' }
          ]
        },
        {
          id: 'secondary_subwaves',
          role: 'secondary_degree_subwaves',
          tool: 'elliott_impulse_wave',
          timeframe_owner: 'daily',
          screenshot: 'screenshots/trade.png',
          points: [
            { label: '0', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '1', pivot_id: 'd_high', date: '2024-01-10 00:00', time: 1704844800000, price: 125, source_row_id: '1D_1704844800000_H', ohlcv_check_id: 'd_high' },
            { label: '2', point_status: 'projected', price: 110, projection_formula_id: 'secondary_wave2_projection', source_pivots: ['w_low', 'd_high'] },
            { label: '3', point_status: 'projected', price: 170, projection_formula_id: 'secondary_wave3_projection', source_pivots: ['w_low', 'd_high'] }
          ]
        },
        {
          id: 'projection',
          role: 'projection_count',
          tool: 'elliott_impulse_wave',
          timeframe_owner: 'daily',
          screenshot: 'screenshots/trade.png',
          points: [
            { label: '0', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
            { label: '1', pivot_id: 'd_high', date: '2024-01-10 00:00', time: 1704844800000, price: 125, source_row_id: '1D_1704844800000_H', ohlcv_check_id: 'd_high' },
            { label: '2', point_status: 'projected', price: 140, projection_formula_id: 'conditional_projection_wave2', source_pivots: ['w_low', 'd_high'] },
            { label: '3', point_status: 'projected', price: 180, projection_formula_id: 'conditional_projection_wave3', source_pivots: ['w_low', 'd_high'] }
          ]
        },
        {
          id: 'wave_b_ladder_1',
          role: 'wave_b_ladder',
          tool: 'horizontal_line',
          timeframe_owner: 'macro',
          screenshot: 'screenshots/trade.png',
          levels: [100, 130, 140],
          label: 'Wave-B invalidation ladder'
        }
      ]
    },
    screenshots: [
      { role: 'visual_pivots', path: 'screenshots/pivots.png', purpose: 'Visible indicator pivot extraction proof.' },
      { role: 'macro_structure', path: 'screenshots/macro.png', purpose: 'Macro count proof.' },
      { role: 'trade_posture', path: 'screenshots/trade.png', purpose: 'Action map.' }
    ],
    visual_pivot_evidence: {
      indicator_name: 'Konsili Pivot Exporter',
      study_filter: 'Konsili Pivot Exporter',
      extraction_method: 'Konsili Pivot Exporter table/label rows extracted before OHLCV verification',
      iteration_decision: 'accepted',
      exporter: {
        name: 'Konsili Pivot Exporter',
        version: 2,
        study_filter: 'Konsili Pivot Exporter',
        pine_script: 'tradingview/konsili_pivot_exporter.pine',
        row_prefix: 'KPE',
        source_tools: ['data_get_pine_tables'],
        instrument_class: 'single_stock',
        left_bars: 5,
        right_bars: 5,
        max_rows: 24
      },
      timeframes: [
        {
          timeframe: 'monthly',
          screenshot: 'screenshots/pivots.png',
          exporter_rows: [kpeRow('1M', '1M_1704067200000_H', 'high', 1704067200000, 150, '2024-01-01 00:00')],
          pivots: [{ id: 'm_high', type: 'high', date: '2024-01-01 00:00', time: 1704067200000, price: 150, exporter_row_id: '1M_1704067200000_H', source_text: 'KPE monthly pivot high 150' }],
          ohlcv_verification: [{ pivot_id: 'm_high', status: 'pass', evidence: 'Monthly OHLCV high verified 150.' }]
        },
        {
          timeframe: 'weekly',
          screenshot: 'screenshots/pivots.png',
          exporter_rows: [kpeRow('1W', '1W_1704672000000_L', 'low', 1704672000000, 100, '2024-01-08 00:00')],
          pivots: [{ id: 'w_low', type: 'low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, exporter_row_id: '1W_1704672000000_L', source_text: 'KPE weekly pivot low 100' }],
          ohlcv_verification: [{ pivot_id: 'w_low', status: 'pass', evidence: 'Weekly OHLCV low verified 100.' }]
        },
        {
          timeframe: 'daily',
          screenshot: 'screenshots/pivots.png',
          exporter_rows: [kpeRow('1D', '1D_1704844800000_H', 'high', 1704844800000, 125, '2024-01-10 00:00')],
          pivots: [{ id: 'd_high', type: 'high', date: '2024-01-10 00:00', time: 1704844800000, price: 125, exporter_row_id: '1D_1704844800000_H', source_text: 'KPE daily pivot high 125' }],
          ohlcv_verification: [{ pivot_id: 'd_high', status: 'pass', evidence: 'Daily OHLCV summary verified nearest high.' }]
        }
      ],
      conflicts: []
    },
    ian_copsey_wave_map: {
      count_selection_authority: 'ian_copsey_fractal_forecasting',
      mechanical_tool_boundary: 'ratio_validation_only',
      scanner_used_for_count_selection: false,
      book_alignment_source: 'Fractal Forecasting - Ian Copsey',
      selection_method: 'Ian Copsey / Fractal Forecasting structure selected the structural anchors from visible swing sequence first; validator tools checked ratios only after the wave map was chosen.',
      counts: [
        {
          id: 'macro_primary',
          role: 'macro_primary',
          drawing_id: 'preceding_impulse',
          pivots: [100, 125, 110, 170, 140, 190],
          ratio_validation_id: 'wave3_1764_rule',
          copsey_rationale: 'Primary macro anchors follow the visible low-high-low expansion sequence before the correction.'
        },
        {
          id: 'macro_correction',
          role: 'macro_correction',
          drawing_id: 'macro',
          pivots: [190, 150, 210, 130],
          ratio_validation_id: 'running_flat_c_leg',
          copsey_rationale: 'The correction is read as A-B-C after the preceding impulse, not as an orphan ABC.'
        },
        {
          id: 'internal_subwave',
          role: 'internal_subwave',
          drawing_id: 'secondary_subwaves',
          pivots: [110, 120, 115, 150, 130, 160],
          ratio_validation_id: 'internal_subwave_wave3',
          copsey_rationale: 'Visible internal subwaves support the primary structure.'
        },
        {
          id: 'active_decision',
          role: 'active_decision',
          drawing_id: 'projection',
          pivots: [130, 150, 140, 180, 160, 200],
          ratio_validation_id: 'active_decision_wave3',
          copsey_rationale: 'The active decision layer is selected from the current swing sequence.'
        }
      ],
      ratio_calculations: [
        {
          id: 'wave3_1764_rule',
          formula: '(170 - 110) / (125 - 100)',
          actual_ratio: 2.4,
          interpretation: 'Wave 3 is above the 1.764 HEW floor.'
        }
      ],
      fractal_forecasting_alignment: [
        { id: 'fractal_degree_consistency', status: 'pass', evidence: 'Macro, internal, and daily degrees are checked top down.' },
        { id: 'three_wave_impulsive_components', status: 'pass', evidence: 'Motive legs are tested as A-B-C engines with lower-degree five-wave action where visible.' },
        { id: 'wave3_1764_floor', status: 'pass', evidence: 'Wave 3 validates above the 176.4% floor.' },
        { id: 'forbidden_rescue_rejection', status: 'pass', evidence: 'Extensions, failed fifths, and diagonals are rejected as rescue devices.' },
        { id: 'corrective_context_before_forecast', status: 'pass', evidence: 'The correction is tied to the preceding impulse before any forward projection.' },
        { id: 'scanner_not_count_authority', status: 'pass', evidence: 'Scanners are limited to scaffolding; count authority stays with Copsey structure.' }
      ]
    },
    hypotheses: [
      baseHypothesis(),
      baseHypothesis({
        id: 'hypothesis_alternate',
        selection_role: 'alternate',
        structure_type: 'alternate_impulse',
        pivots: [
          { id: 'p0', price: 100 },
          { id: 'p1', price: 125 },
          { id: 'p2', price: 110 },
          { id: 'p3', price: 170 },
          { id: 'p4', price: 140 },
          { id: 'p5', price: 182 },
          { id: 'a0', price: 190 },
          { id: 'a1', price: 150 },
          { id: 'b1', price: 210 },
          { id: 'c1', price: 145 },
          { id: 'b_of_3', price: 130 }
        ]
      }),
      baseHypothesis({ id: 'hypothesis_watch', selection_role: 'watch', structure_type: 'watch_context' })
    ],
    count_state: {
      state_id: 'TEST_2026-05-16_hew_state',
      anchor_hash: 'abc123def456',
      continuity_status: 'new',
      previous_state_ref: 'none',
      update_reason: 'new validated package',
      persisted_at: '2026-05-16T08:00:00+02:00'
    },
    hew_structure_context: {
      preceding_impulse_context: {
        status: 'pass',
        drawing_id: 'preceding_impulse',
        evidence: 'The impulse leading into the macro correction is shown before the ABC context.'
      },
      primary_degree_subwaves: {
        status: 'pass',
        drawing_id: 'primary_subwaves',
        evidence: 'Primary-degree subwaves are drawn with native Elliott tooling.'
      },
      secondary_degree_subwaves: {
        status: 'pass',
        drawing_id: 'secondary_subwaves',
        evidence: 'Secondary/internal subwaves are drawn with native Elliott tooling.'
      },
      forward_impulse_projection: {
        status: 'pass',
        drawing_id: 'projection',
        conditionality: 'conditional projection, not fact',
        evidence: 'A conditional forward impulse projection is shown after the completed impulse/correction structure.'
      }
    },
    copsey_hew_purity: {
      internal_abc_motive_engines: {
        status: 'pass',
        evidence: 'Copsey HEW motive legs use internal A-B-C engines rather than non-Copsey impulse-extension rescue rules.',
        macro_waves: [
          { wave: '1', coverage_status: 'visible', abc_engine: 'A-B-C motive engine inside macro Wave 1', drawing_id: 'primary_subwaves', evidence: 'Wave 1 internal A/B/C engine is visible.' },
          { wave: '3', coverage_status: 'visible', abc_engine: 'A-B-C motive engine inside macro Wave 3', drawing_id: 'primary_subwaves', evidence: 'Wave 3 internal A/B/C engine is visible.' },
          { wave: '5', coverage_status: 'visible_equivalent', visible_equivalent: 'Visible lower-degree equivalent for the Wave 5 A-B-C motive engine', drawing_id: 'primary_subwaves', evidence: 'Wave 5 has a visible equivalent motive engine.' }
        ]
      },
      ac_lower_degree_fives: {
        status: 'pass',
        evidence: 'A and C legs were checked for lower-degree five-wave action where visible.',
        legs: [
          { leg: 'A', visibility_status: 'visible', five_wave_action: 'Lower-degree five-wave action is visible inside A.', drawing_id: 'secondary_subwaves', evidence: 'A leg subdivides into five lower-degree actions.' },
          { leg: 'C', visibility_status: 'visible', five_wave_action: 'Lower-degree five-wave action is visible inside C.', drawing_id: 'secondary_subwaves', evidence: 'C leg subdivides into five lower-degree actions.' }
        ]
      },
      forbidden_rescue_devices: {
        status: 'pass',
        evidence: 'Forbidden rescue devices were not used to save the count.',
        rejected_devices: ['extended_waves', 'failed_fifths', 'leading_diagonals', 'ending_diagonals', 'diagonal_triangles'],
        used_devices: [],
        no_use_confirmed: true
      },
      castaway_overlay: {
        status: 'pass',
        source_label: 'Konsili Castaway overlay',
        is_copsey_source: false,
        evidence: 'Castaway is an overlay used after Copsey HEW structure, not a Copsey source.'
      },
      wave3_1764_rule: {
        status: 'pass',
        required_ratio: 1.764,
        actual_ratio: 1.9,
        evidence: 'Wave 3 is at least 176.4% of Wave 1.'
      }
    },
    primary_count: { status: 'candidate', summary: 'Macro count attempted.' },
    alternate_counts: [{ id: 'alt1', activation: 'level', invalidation: 'level', implication: 'stand aside' }],
    ratio_validation: [
      { id: 'wave3_1764_rule', status: 'pass', required_ratio: 1.764, actual_ratio: 1.9, evidence: '176.4 checked' },
      { id: 'running_flat_c_leg', status: 'pass', required_ratio: 1.764, actual_ratio: 1.9, evidence: 'C leg checked' },
      { id: 'internal_subwave_wave3', status: 'pass', required_ratio: 1.764, actual_ratio: 2.2, evidence: 'Internal Wave 3 checked' },
      { id: 'active_decision_wave3', status: 'pass', required_ratio: 1.764, actual_ratio: 2.1, evidence: 'Active decision Wave 3 checked' }
    ],
    rule_validation: [{ id: 'wave2_origin', status: 'pass', evidence: 'origin holds' }],
    wave_b_invalidation_ladder: {
      direction: 'bullish',
      validation_standard: 'daily_close',
      rungs: [
        {
          id: 'wave2_holds_wave1_origin',
          must_hold: 'above',
          level_role: 'wave1_origin',
          tested_by: 'wave2_low',
          status: 'pass',
          price: 100,
          evidence: 'Wave 2 held above the Wave 1 origin.'
        },
        {
          id: 'b_of_3_holds_wave2',
          must_hold: 'above',
          level_role: 'wave2_low',
          tested_by: 'b_of_3_low',
          status: 'pass',
          price: 130,
          evidence: 'B of 3 held above Wave 2.'
        },
        {
          id: 'wave4_holds_b_of_3',
          must_hold: 'above',
          level_role: 'b_of_3_low',
          tested_by: 'wave4_low',
          status: 'pass',
          price: 140,
          evidence: 'Wave 4 held above B of 3.'
        },
        {
          id: 'b_of_5_holds_wave4',
          must_hold: 'above',
          level_role: 'wave4_low',
          tested_by: 'b_of_5_low',
          status: 'pending',
          price: null,
          evidence: 'B of 5 has not formed yet.'
        }
      ],
      drawing_refs: ['wave_b_ladder_1'],
      hard_failure_ids: [
        'wave2_breaks_wave1_origin',
        'b_of_3_breaks_wave2',
        'wave4_breaks_b_of_wave3',
        'b_of_5_breaks_wave4'
      ]
    },
    corrective_structure: {
      location: 'post_impulse_correction',
      pattern: 'running_flat',
      mode: 'mixed',
      wave_b_behavior: 'exceeds_prior_extreme',
      preceding_impulse_ref: 'preceding_impulse',
      evidence: 'The correction is classified after the preceding impulse context, with Wave B treated as the deceptive wild-card leg.'
    },
    zone_scores: [
      {
        id: 'accumulation_w4',
        zone_type: 'accumulation',
        price_range: { low: 100, high: 110 },
        boundary_refs: {
          low: { pivot_id: 'w_low' },
          high: { projection_formula_id: 'wave4_accumulation_upper' }
        },
        zone_score: {
          model_version: 'zone_score_v1',
          calibrated_probability: false,
          score: 58,
          band: 'moderate',
          drivers: ['verified_weekly_low', 'wave4_accumulation_support']
        },
        evidence: 'Wave 4 accumulation support',
        invalidation: 'below 99',
        upgrade_condition: 'absorption improves above 120',
        downgrade_condition: 'lose 99'
      },
      {
        id: 'distribution_w5',
        zone_type: 'distribution',
        price_range: { low: 150, high: 160 },
        boundary_refs: {
          low: { pivot_id: 'm_high' },
          high: { projection_formula_id: 'wave5_distribution_upper' }
        },
        zone_score: {
          model_version: 'zone_score_v1',
          calibrated_probability: false,
          score: 52,
          band: 'moderate',
          drivers: ['verified_monthly_high', 'wave5_distribution_target']
        },
        evidence: 'Wave 5 distribution target',
        invalidation: 'accept above 165',
        upgrade_condition: 'supply appears in zone',
        downgrade_condition: 'accept above'
      }
    ],
    risk_architecture: {
      setup_type: 'structural_map_only',
      structural_setup: {
        summary: 'The area matters structurally, but the package does not authorize live execution.',
        evidence: 'Macro count and zone scores define a review zone only.'
      },
      execution_setup: {
        status: 'not_ready',
        entry_condition: 'not_applicable',
        stop_level: 'not_applicable',
        target_zone: 'conditional projection zone only',
        risk_reward: 'not_applicable'
      },
      risk_reward: 'not_applicable',
      invalidation: 'below hard invalidation zone',
      position_sizing_basis: 'not_applicable without live trade permission',
      alternate_response: 'alternate count keeps trade permission blocked',
      time_or_structural_stop: 'reassess at zone boundary or invalidation',
      evidence: 'Structural thesis is separated from execution risk; no live trade is presented.'
    },
    action_rationale: {
      selected_action: 'stand_aside',
      strategy_basis: 'Ian Copsey Fractal Forecasting ratio model and Konsili Castaway overlay',
      why_action_follows_strategy: 'The active count is candidate and the zone posture is not constructive.',
      chart_evidence_supporting_action: 'Macro count, ladder, and zones are visible.',
      what_proves_it_wrong: 'Acceptance above the flip level with valid subwaves.',
      human_takeaway: 'No trade until the zone posture improves.'
    },
    trade_posture: { posture: 'STAND ASIDE', zone_focus: 'accumulation/distribution zones only', invalidation: 'defined', target_path: 'conditional' },
    castaway_trade_model: {
      model: 'Model 6',
      permission: 'blocked',
      source_label: 'Konsili Castaway overlay',
      is_copsey_source: false,
      reason: 'stand aside',
      decision_table: [
        { id: 'model', value: 'Model 6', evidence: 'Castaway model classified after Copsey structure.' },
        { id: 'permission', value: 'blocked', evidence: 'No clean zone posture and fallback-free proof still points to stand aside.' },
        { id: 'zone_focus', value: 'monitor accumulation and distribution zones', evidence: 'Zone posture tied to decision drawing.' },
        { id: 'invalidation', value: 'break hard invalidation', evidence: 'Invalidation level is charted.' },
        { id: 'target_path', value: 'conditional projection only', evidence: 'Target path follows conditional Elliott projection.' },
        { id: 'stand_aside_condition', value: 'until zone posture improves', evidence: 'No trade while zone and timeframe alignment are incomplete.' }
      ]
    },
    no_trade_gate: [
      { id: 'location', status: 'fail', evidence: 'mid wave' },
      { id: 'zone_focus', status: 'fail', evidence: 'zone posture is not constructive' },
      { id: 'invalidation', status: 'pass', evidence: 'defined' },
      { id: 'reward', status: 'partial', evidence: 'conditional' },
      { id: 'timeframe_alignment', status: 'partial', evidence: 'mixed' }
    ],
    red_team: { countercase: 'Alternate count changes posture.', proof_needed: 'break level', impact: 'stand aside' },
    critic_review: {
      final_verdict: 'pass',
      package_validity_verdict: 'pass',
      evidence_grade_verdict: 'qualified',
      trade_permission_verdict: 'blocked',
      visual_readability_verdict: 'pass_with_notes',
      blocking_issues: [],
      material_non_blocking_issues: [
        {
          id: 'fixture_qualified_evidence',
          severity: 'material',
          evidence: 'Fixture is valid but deliberately qualified to test institutional caveat handling.',
          effect: 'Confidence remains low and trade permission remains blocked.'
        }
      ],
      strongest_bear_case_against_package: 'Qualified evidence and blocked trade permission mean no clean investment action yet.',
      strongest_bull_case_against_package: 'Verified pivots and pivot-locked drawings keep the structure reviewable if conditions improve.',
      required_followups: [],
      max_detail_timeframe: 'daily',
      checklist: [
        { id: 'deliverables_complete', status: 'pass', evidence: 'files present' },
        { id: 'evidence_accuracy_checked', status: 'pass', evidence: 'levels checked' },
        { id: 'macro_timeframe_focus', status: 'pass', evidence: 'macro first' },
        { id: 'human_actionability', status: 'pass', evidence: 'action clear' },
        { id: 'invalidation_and_risk_clear', status: 'pass', evidence: 'risk clear' },
        { id: 'visual_first_sequence_checked', status: 'pass', evidence: 'visual pivots were verified before HEW analysis' },
        { id: 'no_day_trading_leak', status: 'pass', evidence: 'no intraday' },
        { id: 'chart_evidence_aligned', status: 'pass', evidence: 'screenshots match' },
        { id: 'final_chart_readability_checked', status: 'pass', evidence: 'presentation chart hides extraction scaffold and keeps decision proof visible' },
        { id: 'hew_no_orphan_abc_checked', status: 'pass', evidence: 'ABC context was checked against the preceding impulse drawing.' },
        { id: 'hew_preceding_impulse_context_checked', status: 'pass', evidence: 'The preceding impulse context drawing is present and referenced by structure context.' },
        { id: 'hew_primary_secondary_subwaves_checked', status: 'pass', evidence: 'Both primary and secondary subwave drawing roles are present and referenced.' },
        { id: 'hew_forward_impulse_projection_checked', status: 'pass', evidence: 'The forward projection is an Elliott impulse drawing and marked conditional.' },
        { id: 'hew_projection_topology_checked', status: 'pass', evidence: 'Forward projections were checked for Wave 2 origin, Wave 4 overlap, Wave 3 shortest, and motive direction failures.' },
        { id: 'hew_visual_thesis_consistency_checked', status: 'pass', evidence: 'Final screenshots do not visually promote rejected or diagnostic counts as the accepted thesis.' },
        { id: 'hew_c_of_3_strength_checked', status: 'pass', evidence: 'C of 3 is not shorter than A of 3 for the active impulse proof.' },
        { id: 'hew_corrective_structure_classified', status: 'pass', evidence: 'The correction is classified and tied to the preceding impulse.' },
        { id: 'hew_risk_architecture_separated', status: 'pass', evidence: 'Structural setup and execution risk are separated before posture language.' },
        { id: 'hew_copsey_internal_abc_motive_engines_checked', status: 'pass', evidence: 'Macro Waves 1, 3, and 5 document internal A-B-C motive engines or visible equivalents.' },
        { id: 'hew_copsey_ac_lower_degree_fives_checked', status: 'pass', evidence: 'A and C lower-degree five-wave action was checked where visible.' },
        { id: 'hew_forbidden_rescue_devices_rejected', status: 'pass', evidence: 'Forbidden rescue devices were rejected and unused.' },
        { id: 'hew_castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway is labeled as a Konsili overlay and not a Copsey source.' },
        { id: 'hew_wave3_1764_rule_checked', status: 'pass', evidence: 'Wave 3 176.4% rule passed without exception.' },
        { id: 'pivot_path_clean', status: 'pass', evidence: 'KPE pivot path is clean with no fallback in the accepted package.' },
        { id: 'fallback_confidence_cap_checked', status: 'pass', evidence: 'No fallback was used, so confidence was not capped by fallback policy.' },
        { id: 'unresolved_items_disclosed', status: 'pass', evidence: 'limitations disclosed' }
      ],
      findings: [],
      independent_reviewer: {
        reviewer_type: 'subagent',
        independent_from_author: true,
        prompt_file: 'agents/hew-independent-critic.md',
        scope: 'final HEW evidence contract and actionability review',
        verdict: 'pass',
        evidence: 'Independent critic pass checked structure, pivots, drawings, and no-trade posture.'
      }
    },
    review_conditions: [{ condition: 'zone posture changes', expected: 'upgrade', downgrade_if: 'fail' }],
    missing_evidence: [],
    confidence: { rating: 'low', rationale: 'candidate but gated' },
    execution_quality: {
      visual_qa: {
        status: 'pass',
        final_chart_stands_alone: true,
        sidebars_hidden: true,
        exporter_hidden_in_presentation: true,
        zone_labels_visible: true,
        zone_price_ranges_visible: true,
        zone_scores_visible: true,
        elliott_labels_readable: true,
        audit_screenshots_marked_audit_only: true,
        issues: []
      },
      vision_qa: { status: 'pass', screenshot_reviewed: true, evidence: 'Final screenshot was visually reviewed for readability and alignment.' },
      rerun_schedule: { status: 'scheduled', condition: 'price reaches zone boundary or invalidation', cadence: 'manual_on_zone_shift_or_weekly_refresh', evidence: 'Rerun conditions are explicit for future sessions.' },
      drawing_spec: { status: 'pass', source: 'strategies/hew/manifest.json', manifest_roles_checked: true, evidence: 'Drawing roles and allowed tools were checked against manifest.' }
    },
    ...overrides
  };
}

function writeEvidence(evidence) {
  const dir = packageDir();
  const file = join(dir, 'evidence.json');
  writeFileSync(file, JSON.stringify(evidence, null, 2));
  return file;
}

test('non-live HEW package assembler writes the required package shell', () => {
  const dir = mkdtempSync(join(tmpdir(), 'konsili-hew-assembler-'));
  const skeleton = createHewEvidenceSkeleton({
    symbol: 'BITSTAMP:BTCUSD',
    savedAt: '2026-05-17T00:00:00Z'
  });

  const result = assembleHewPackageFromCollectedData({
    packageDir: dir,
    collectedData: {
      symbol: 'BITSTAMP:BTCUSD',
      saved_at: '2026-05-17T00:00:00Z',
      evidence: skeleton
    },
    validate: false
  });

  assert.ok(existsSync(join(dir, 'journal.md')));
  assert.ok(existsSync(join(dir, 'evidence.json')));
  assert.ok(existsSync(join(dir, 'committee_brief.md')));
  assert.ok(existsSync(join(dir, 'raw', 'kpe_monthly.jsonl')));
  assert.ok(existsSync(join(dir, 'raw', 'hashes.json')));
  assert.ok(existsSync(join(dir, 'screenshots')));

  const evidence = JSON.parse(readFileSync(join(dir, 'evidence.json'), 'utf8'));
  assert.equal(result.evidence.workflow_version, 'hew_institutional_v1');
  assert.equal(evidence.symbol, 'BITSTAMP:BTCUSD');
  assert.equal(evidence.castaway_trade_model.decision_table.length, 0);
  assert.equal(evidence.wave_b_invalidation_ladder.direction, 'neutral');
  assert.equal(evidence.corrective_structure.pattern, 'not_applicable');
  assert.equal(evidence.risk_architecture.execution_setup.status, 'not_ready');
  assert.ok(evidence.raw_artifacts.files.some((file) => file.role === 'kpe_monthly'));
});

test('valid HEW package passes the stage-gated workflow contract', () => {
  const file = writeEvidence(baseEvidence());
  const result = validateEvidenceFile(file);
  assert.deepEqual(result.errors, []);
});

test('stage validation dispatch does not require later-stage fields early', () => {
  const cases = [
    ['extraction', ['hypotheses', 'chart_prep', 'critic_review', 'action_rationale']],
    ['verification', ['hypotheses', 'chart_prep', 'critic_review', 'action_rationale']],
    ['anchors', ['chart_prep', 'critic_review', 'action_rationale']],
    ['ratios', ['critic_review']],
    ['drawings', ['critic_review', 'action_rationale']],
    ['writing', ['critic_review']],
    ['critic', ['visual_pivot_evidence', 'chart_prep']]
  ];

  for (const [stage, fieldsToRemove] of cases) {
    const evidence = baseEvidence();
    for (const field of fieldsToRemove) delete evidence[field];
    evidence.stage_gates = evidence.stage_gates.filter((gate) =>
      ['route_and_layout', 'visual_pivot_extraction', 'ohlcv_pivot_verification', 'top_down_chart_read', 'drawing_protocol', 'evidence_contract', 'critic_review'].includes(gate.id)
    );
    const result = validateEvidenceFile(writeEvidence(evidence), { stage });
    assert.deepEqual(result.errors, [], `${stage} errors:\n${result.errors.join('\n')}`);
  }
});

test('final stage still runs the complete validator suite', () => {
  const evidence = baseEvidence();
  delete evidence.critic_review;
  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'final' });
  assert.match(result.errors.join('\n'), /missing top-level field: critic_review/i);
});

test('drawings stage fails if Elliott drawings lack pivot-locked points', () => {
  const evidence = baseEvidence();
  delete evidence.chart_prep.drawing_manifest[0].points;
  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'drawings' });
  assert.match(result.errors.join('\n'), /drawing_manifest\.preceding_impulse\.points must be a non-empty pivot-locked geometry array/i);
});

test('historical drilldown KPE pivots cannot be downgraded to projected drawing points', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.historical_drilldowns = [
    {
      id: 'focused_weekly_drilldown',
      timeframe: 'weekly',
      date_range: '2024-01-01 to 2024-02-01',
      screenshot: 'screenshots/pivots.png',
      accepted_scope: 'Fixture drilldown',
      exporter_rows: [kpeRow('1W', '1W_1705276800000_H', 'high', 1705276800000, 110, '2024-01-15 00:00')],
      ohlcv_verification: [{ pivot_id: 'w_2024_01_high_110', status: 'pass', evidence: 'Historical weekly KPE row verified.' }]
    }
  ];

  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'drawings' });

  assert.match(result.errors.join('\n'), /is marked projected but matches verified KPE pivot w_2024_01_high_110/i);
});

test('historical drilldown KPE pivots can lock drawing geometry as verified points', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.historical_drilldowns = [
    {
      id: 'focused_weekly_drilldown',
      timeframe: 'weekly',
      date_range: '2024-01-01 to 2024-02-01',
      screenshot: 'screenshots/pivots.png',
      accepted_scope: 'Fixture drilldown',
      exporter_rows: [kpeRow('1W', '1W_1705276800000_H', 'high', 1705276800000, 110, '2024-01-15 00:00')],
      ohlcv_verification: [{ pivot_id: 'w_2024_01_high_110', status: 'pass', evidence: 'Historical weekly KPE row verified.' }]
    }
  ];
  const drawing = evidence.chart_prep.drawing_manifest.find((item) => item.id === 'secondary_subwaves');
  drawing.points[2] = {
    label: '2',
    pivot_id: 'w_2024_01_high_110',
    date: '2024-01-15 00:00',
    time: 1705276800000,
    price: 110,
    source_row_id: '1W_1705276800000_H',
    ohlcv_check_id: 'w_2024_01_high_110'
  };

  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'drawings' });

  assert.deepEqual(result.errors, []);
});

test('HEW manifest requires visual-first pivot gates', () => {
  const manifest = JSON.parse(readFileSync(join('strategies', 'hew', 'manifest.json'), 'utf8'));
  for (const gate of requiredVisualFirstGates) {
    assert.ok(manifest.stage_gates.includes(gate), `hew missing ${gate}`);
  }
  assert.ok(manifest.required_top_level.includes('visual_pivot_evidence'), 'hew missing visual_pivot_evidence');
  assert.ok(manifest.required_top_level.includes('hypotheses'), 'hew missing hypotheses');
  assert.deepEqual(manifest.visual_pivot_protocol.required_timeframes, ['monthly', 'weekly', 'daily']);
  assert.equal(manifest.visual_pivot_protocol.preferred_indicator, 'Konsili Pivot Exporter');
  assert.equal(manifest.visual_pivot_protocol.required_exporter.version, 2);
  assert.equal(manifest.reference_style.fixture_path, 'fixtures/hew/good/team_no_clean_trade/input');
  assert.equal(manifest.reference_style.distilled_doc, 'docs/hew-atlassian-reference-style.md');
  assert.ok(manifest.reference_style.required_traits.includes('zone_first_accumulation_distribution_scores'));
  assert.ok(manifest.reference_style.required_traits.includes('native_tradingview_wave_markers_only'));
  assert.equal(manifest.visual_pivot_protocol.required_exporter.pine_script, 'tradingview/konsili_pivot_exporter.pine');
  assert.deepEqual(manifest.visual_pivot_protocol.required_exporter.required_pivot_fields, ['date', 'time', 'price']);
  assert.deepEqual(manifest.visual_pivot_protocol.required_exporter.allowed_source_tools, ['data_get_pine_tables', 'data_get_pine_labels']);
  assert.equal(manifest.visual_pivot_protocol.required_exporter.visual_label_contract.default_table_visible, false);
  assert.ok(manifest.required_screenshot_roles.includes('visual_pivots'), 'hew missing visual_pivots screenshot role');
  assert.deepEqual(manifest.chart_mode_protocol.required_modes, ['extraction', 'verification', 'strategy_proof', 'presentation']);
  assert.equal(manifest.copsey_ratio_universe.wave3_projection.minimum, 1.764);
  assert.deepEqual(manifest.copsey_ratio_universe.alternation_sum.trending, { min: 0.8, max: 1.0 });
  assert.deepEqual(manifest.hypothesis_protocol.allowed_directions, ['bullish', 'bearish']);
  assert.ok(manifest.hypothesis_protocol.allowed_structure_types.includes('completed_macro_impulse'));
  assert.deepEqual(manifest.hypothesis_protocol.required_measurement_types, [
    'wave3_projection',
    'wave5_projection',
    'retracement',
    'alternation_sum',
    'c_of_3_strength_rule',
    'wave4_b3_rule',
    'wave3_not_shortest_rule',
    'wave1_wave4_non_overlap_rule'
  ]);
  assert.deepEqual(manifest.hypothesis_protocol.wave_iii_complete_required_measurement_types, ['triple_confluence', 'c_of_3_strength_rule']);
  assert.deepEqual(manifest.ratio_models.model_3_super_extended.wave5_of_wave1, [3.764]);
  assert.equal(manifest.corrective_structure_protocol.wave2_forbidden_patterns[0], 'triangle');
  assert.equal(manifest.risk_architecture_protocol.allowed_setup_types[0], 'structural_map_only');
  assert.deepEqual(manifest.hypothesis_protocol.required_engine_result_fields, ['status', 'score', 'hard_rule_pass', 'lifecycle_status', 'classification']);
  assert.ok(manifest.hypothesis_protocol.hard_rule_violation_ids.includes('failed_fifth_forbidden'));
  assert.ok(manifest.hypothesis_protocol.hard_rule_violation_ids.includes('projected_point_marked_complete'));
  assert.ok(manifest.hypothesis_protocol.hard_rule_violation_ids.includes('c_of_3_shorter_than_a_of_3'));
  assert.ok(manifest.drawing_protocol.forbidden_final_drawing_terms.includes('rejected'));
  assert.ok(manifest.drawing_protocol.deprecated_final_roles.includes('decision_level'));
  assert.ok(manifest.drawing_protocol.required_roles.includes('wave_b_ladder'));
  assert.deepEqual(manifest.wave_b_invalidation_ladder_protocol.required_rungs, [
    'wave2_holds_wave1_origin',
    'b_of_3_holds_wave2',
    'wave4_holds_b_of_3',
    'b_of_5_holds_wave4'
  ]);
  assert.equal(manifest.hypothesis_protocol.structural_distinctness.required, true);
  assert.equal(manifest.visual_pivot_protocol.instrument_parameter_profiles.single_stock.left, 5);
  assert.equal(manifest.critic_review.independent_reviewer.prompt_file, 'agents/hew-independent-critic.md');
});

function fixtureDirs(kind) {
  const root = join('fixtures', 'hew', kind);
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name));
}

test('institutional regression fixtures validate expected pass and fail behavior', () => {
  for (const dir of [...fixtureDirs('good'), ...fixtureDirs('bad')]) {
    assert.ok(existsSync(join(dir, 'README.md')), `missing fixture README: ${dir}`);
    const input = join(dir, 'input', 'evidence.json');
    const expectedFile = join(dir, 'expected', 'validator.json');
    assert.ok(existsSync(input), `missing fixture input: ${input}`);
    assert.ok(existsSync(expectedFile), `missing fixture expected output: ${expectedFile}`);

    const expected = JSON.parse(readFileSync(expectedFile, 'utf8'));
    const result = validateEvidenceFile(input, { stage: expected.stage || 'final' });
    const passed = result.errors.length === 0;
    assert.equal(passed, expected.should_pass, `${dir} expected should_pass=${expected.should_pass} errors:\n${result.errors.join('\n')}`);
    for (const pattern of expected.expected_error_patterns || []) {
      assert.match(result.errors.join('\n'), new RegExp(pattern, 'i'), `${dir} missing expected error pattern ${pattern}`);
    }
  }
});

test('HEW hypotheses are recomputed by the deterministic Copsey ratio engine', () => {
  const evidence = baseEvidence();
  evidence.hypotheses[0].engine_result.score = 12;
  evidence.hypotheses[0].engine_result.status = 'fail';
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /hypotheses\.hypothesis_primary\.engine_result\.status must match recomputed ratio engine status pass/i);
  assert.match(errors, /hypotheses\.hypothesis_primary\.engine_result\.score must match recomputed ratio engine score/i);
});

test('HEW hypotheses fail when math rejects a saved candidate', () => {
  const evidence = baseEvidence({
    hypotheses: [
      baseHypothesis({
        id: 'bad_c_wave',
        pivots: [
          ...baseHypothesis().pivots.filter((point) => point.id !== 'c1'),
          { id: 'c1', price: 159.12 }
        ]
      })
    ]
  });
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /wave_c_ratio_not_in_copsey_universe/i);
});

test('HEW hypotheses reject NVO-style free-text structure and direction values', () => {
  const evidence = baseEvidence({
    hypotheses: [
      baseHypothesis({
        direction: 'mixed',
        structure_type: 'completed_macro_impulse_with_unresolved_correction_and_daily_bearish_subwave'
      })
    ]
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /hypotheses should contain 3-5 hypotheses: 1/i);
  assert.match(errors, /direction must be one of bullish, bearish: mixed/i);
  assert.match(errors, /structure_type must be one of .*completed_macro_impulse_with_unresolved_correction/i);
});

test('HEW completed primary impulse hypotheses require full Copsey measurement coverage', () => {
  const weakPrimary = baseHypothesis({
    structure_type: 'completed_macro_impulse',
    measurements: [
      {
        id: 'macro_wave3',
        type: 'wave3_projection',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3' }
      }
    ]
  });
  const evidence = baseEvidence({
    hypotheses: [
      weakPrimary,
      baseHypothesis({
        id: 'hypothesis_alternate',
        selection_role: 'alternate',
        structure_type: 'alternate_impulse',
        pivots: [
          { id: 'p0', price: 100 },
          { id: 'p1', price: 125 },
          { id: 'p2', price: 110 },
          { id: 'p3', price: 170 },
          { id: 'p4', price: 140 },
          { id: 'p5', price: 182 },
          { id: 'a0', price: 190 },
          { id: 'a1', price: 150 },
          { id: 'b1', price: 210 },
          { id: 'c1', price: 145 },
          { id: 'b_of_3', price: 130 }
        ]
      }),
      baseHypothesis({ id: 'hypothesis_watch', selection_role: 'watch', structure_type: 'watch_context' })
    ]
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /measurements missing required type: wave5_projection/i);
  assert.match(errors, /measurements missing required type: retracement/i);
  assert.match(errors, /measurements missing required type: alternation_sum/i);
  assert.match(errors, /measurements missing required type: wave4_b3_rule/i);
  assert.match(errors, /measurements missing required type: wave3_not_shortest_rule/i);
  assert.match(errors, /measurements missing required type: wave1_wave4_non_overlap_rule/i);
  assert.match(errors, /missing required Wave III complete type: triple_confluence/i);
  assert.match(errors, /missing required completed-impulse measurement: retracement:wave2_retracement/i);
  assert.match(errors, /missing required completed-impulse measurement: retracement:wave4_retracement/i);
});

test('HEW completed impulses hard-reject extended fifth rescue counts', () => {
  const evidence = baseEvidence();
  evidence.hypotheses[0] = baseHypothesis({
    pivots: [
      ...baseHypothesis().pivots.filter((point) => point.id !== 'p5'),
      { id: 'p5', price: 250 }
    ]
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /extended_wave5_rejected_by_copsey/i);
  assert.match(errors, /primary hypothesis must pass deterministic Copsey ratio engine/i);
});

test('HEW completed impulses hard-reject failed fifth rescue counts', () => {
  const evidence = baseEvidence();
  evidence.hypotheses[0] = baseHypothesis({
    pivots: [
      ...baseHypothesis().pivots.filter((point) => point.id !== 'p5'),
      { id: 'p5', price: 160 }
    ]
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /failed_fifth_forbidden/i);
  assert.match(errors, /primary hypothesis must pass deterministic Copsey ratio engine/i);
});

test('HEW projected Wave 3 cannot be marked complete', () => {
  const evidence = baseEvidence();
  evidence.hypotheses[0] = baseHypothesis({
    structure_type: 'conditional_forward_impulse',
    wave3_complete: true,
    pivots: baseHypothesis().pivots.map((point) => (
      point.id === 'p3'
        ? { ...point, point_status: 'projected' }
        : point
    ))
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /projected_point_marked_complete/i);
  assert.match(errors, /primary hypothesis must pass deterministic Copsey ratio engine/i);
});

test('HEW alternates must be structurally distinct from the primary pivot path', () => {
  const evidence = baseEvidence();
  evidence.hypotheses[1] = baseHypothesis({ id: 'hypothesis_alternate', selection_role: 'alternate', structure_type: 'alternate_impulse' });

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /hypotheses\.hypothesis_alternate must be structurally distinct from primary hypothesis_primary/i);
});

test('non-HEW evidence is not routed to a removed strategy manifest', () => {
  const file = writeEvidence(baseEvidence({
    journal_id: 'TEST_2026-05-16_external',
    method: 'External macro',
    workflow_version: 'external_contract'
  }));
  const result = validateEvidenceFile(file);
  assert.equal(result.strategy, null);
  assert.match(result.errors.join('\n'), /cannot infer supported strategy/i);
  assert.doesNotMatch(result.errors.join('\n'), /strategies[\\/]+external[\\/]+manifest\.json/i);
});

test('explicit non-HEW strategy validation is not supported', () => {
  const result = validateEvidenceFile(writeEvidence(baseEvidence()), { strategy: 'external' });
  assert.equal(result.strategy, 'external');
  assert.match(result.errors.join('\n'), /unsupported strategy: external/i);
});

test('default CLI validation discovers HEW packages only', () => {
  const help = execFileSync(process.execPath, ['scripts/validate_evidence.mjs', '--help'], {
    cwd: resolve('.'),
    encoding: 'utf8'
  });
  assert.match(help, /analysis_journal\/\*_hew\/evidence\.json/i);
  assert.doesNotMatch(help, /analysis_journal\/\*_<strategy>\/evidence\.json/i);
});

test('CLI rejects non-HEW strategy before discovery', () => {
  try {
    execFileSync(process.execPath, ['scripts/validate_evidence.mjs', '--strategy', 'external'], {
      cwd: resolve('.'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    assert.fail('expected --strategy external to fail');
  } catch (error) {
    assert.match(String(error.stderr), /Unsupported strategy: external/i);
  }
});

test('mandatory stage gates fail closed when a gate is failed or partial', () => {
  const evidence = baseEvidence();
  evidence.stage_gates = evidence.stage_gates.map((gate) => (
    gate.id === 'top_down_chart_read'
      ? { ...gate, status: 'fail', evidence: 'Monthly/weekly/daily read was skipped.' }
      : gate
  ));
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /stage_gates\.top_down_chart_read status must be one of .*fail/i);
});

test('workflow_version must match the strategy manifest contract version', () => {
  const result = validateEvidenceFile(writeEvidence(baseEvidence({ workflow_version: 'wrong_contract' })));
  assert.match(result.errors.join('\n'), /workflow_version must equal manifest contract_version hew_institutional_v1/i);
});

test('presentation mode fails closed when extraction scaffolding remains visible', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.chart_mode_checklist = evidence.chart_prep.chart_mode_checklist.map((mode) => (
    mode.mode === 'presentation'
      ? { ...mode, pivot_scaffold_visible: true, final_chart_state: 'pivot scanner still visible over decision levels' }
      : mode
  ));
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /presentation pivot_scaffold_visible must not be true/i);
});

test('Konsili Pivot Exporter must be shown only for extraction unless audit mode is explicit', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.chart_mode_checklist = evidence.chart_prep.chart_mode_checklist.map((mode) => {
    if (mode.mode === 'extraction') return { ...mode, konsili_pivot_exporter_visible: false };
    if (mode.mode === 'strategy_proof') return { ...mode, konsili_pivot_exporter_visible: true };
    if (mode.mode === 'presentation') return { ...mode, konsili_pivot_exporter_visible: true };
    return mode;
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /chart_prep\.chart_mode_checklist\.extraction\.konsili_pivot_exporter_visible must be true/i);
  assert.match(errors, /chart_prep\.chart_mode_checklist\.strategy_proof\.konsili_pivot_exporter_visible must be false/i);
  assert.match(errors, /chart_prep\.chart_mode_checklist\.presentation\.konsili_pivot_exporter_visible must be false/i);
});

test('Konsili Pivot Exporter may remain visible only in explicit audit presentation mode', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.chart_mode_checklist = evidence.chart_prep.chart_mode_checklist.map((mode) => (
    mode.mode === 'presentation'
      ? { ...mode, audit_mode: true, konsili_pivot_exporter_visible: true, pivot_scaffold_visible: false }
      : mode
  ));

  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.deepEqual(result.errors, []);
});

test('rejected diagnostic wave drawings cannot survive into final presentation screenshots', () => {
  const rejected = baseHypothesis({
    id: 'rejected_daily_impulse',
    selection_role: 'rejected',
    structure_type: 'rejected_impulse',
    pivots: [
      ...baseHypothesis().pivots.filter((point) => point.id !== 'p5'),
      { id: 'p5', price: 160 }
    ]
  });
  const evidence = baseEvidence();
  evidence.hypotheses[2] = rejected;
  evidence.chart_prep.drawing_manifest.push({
    id: 'daily_rejected_impulse_candidate',
    role: 'secondary_degree_subwaves',
    tool: 'elliott_impulse_wave',
    timeframe_owner: 'daily',
    screenshot: 'screenshots/trade.png',
    source_hypothesis_id: 'rejected_daily_impulse',
    engine_status: 'fail'
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /appears to be rejected\/diagnostic and must be audit_only/i);
  assert.match(errors, /references failed\/rejected hypothesis rejected_daily_impulse and must be audit_only/i);
  assert.match(errors, /references failed\/rejected hypothesis rejected_daily_impulse in final presentation screenshot/i);
});

test('Elliott impulse drawings hard-fail failed fifth topology from manifest levels', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest[0] = {
    ...evidence.chart_prep.drawing_manifest[0],
    id: 'macro_failed_fifth_context',
    tool: 'elliott_impulse_wave',
    direction: 'bullish',
    levels: [30.78, 99, 46.1, 780, 163.8, 743.5]
  };

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /drawing_manifest\.macro_failed_fifth_context failed_fifth_forbidden/i);
});

test('visual pivot evidence is mandatory before strategy analysis', () => {
  const evidence = baseEvidence();
  delete evidence.visual_pivot_evidence;
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /missing top-level field: visual_pivot_evidence/i);
});

test('visual label rows are the clean pivot data path; table rows are fallback', () => {
  const evidence = baseEvidence();
  delete evidence.visual_pivot_evidence.exporter;
  delete evidence.visual_pivot_evidence.timeframes[0].exporter_rows;
  delete evidence.visual_pivot_evidence.timeframes[1].pivots[0].exporter_row_id;
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /visual_pivot_evidence\.exporter is required/i);
  assert.match(errors, /visual_pivot_evidence\.monthly\.visual_label_rows must be a non-empty array/i);
  assert.match(errors, /visual_pivot_evidence\.weekly\.pivots\.w_low missing exporter_row_id for KPE table fallback/i);
});

test('visual price-extreme labels validate without KPE table rows', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.extraction_method = 'Visual price-extreme labels inspected across M/W/D before OHLCV verification.';
  evidence.visual_pivot_evidence.exporter.source_tools = ['data_get_pine_labels'];
  evidence.visual_pivot_evidence.exporter.default_table_visible = false;
  evidence.visual_pivot_evidence.exporter.table_fallback_only = true;

  for (const item of evidence.visual_pivot_evidence.timeframes) {
    const pivot = item.pivots[0];
    item.source_mode = 'visual_price_extreme_labels';
    item.visual_label_rows = [{ text: `${pivot.price}\n${pivot.date}\n${pivot.type === 'high' ? 'PH' : 'PL'}`, price: pivot.price }];
    delete item.exporter_rows;
    delete pivot.exporter_row_id;
    pivot.source_kind = 'visual_price_extreme_label';
    pivot.source_text = item.visual_label_rows[0].text;
  }
  for (const drawing of evidence.chart_prep.drawing_manifest) {
    for (const point of drawing.points || []) {
      delete point.source_row_id;
      if (point.pivot_id) point.source_label_id = point.pivot_id;
    }
  }

  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.deepEqual(result.errors, []);
});

test('Konsili Pivot Exporter pivot references must match parsed rows', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.timeframes[2].pivots[0].exporter_row_id = 'missing_row';
  evidence.visual_pivot_evidence.timeframes[2].exporter_rows = [
    'KPE|v=2|tf=1D|id=broken|type=high|date=2024-01-10 00:00|time=bad|price=125|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  ];
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /visual_pivot_evidence\.daily\.exporter_rows row 0: invalid time/i);
  assert.match(errors, /exporter_row_id not found in exporter_rows: missing_row/i);
});

test('Konsili Pivot Exporter confirms date, time, type, and price for every accepted pivot', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.timeframes[0].pivots[0].date = '2024-01-02 00:00';
  evidence.visual_pivot_evidence.timeframes[1].pivots[0].time = 1704758400000;
  evidence.visual_pivot_evidence.timeframes[2].pivots[0].price = 126;
  evidence.visual_pivot_evidence.timeframes[2].pivots[0].type = 'low';

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /visual_pivot_evidence\.monthly\.pivots\.m_high\.date must match exporter row 1M_1704067200000_H/i);
  assert.match(errors, /visual_pivot_evidence\.weekly\.pivots\.w_low\.time must match exporter row 1W_1704672000000_L/i);
  assert.match(errors, /visual_pivot_evidence\.daily\.pivots\.d_high\.price must match exporter row 1D_1704844800000_H/i);
  assert.match(errors, /visual_pivot_evidence\.daily\.pivots\.d_high\.type must match exporter row 1D_1704844800000_H/i);
});

test('Konsili Pivot Exporter parameters are pinned per instrument class', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.exporter.left_bars = 7;
  evidence.visual_pivot_evidence.timeframes[0].exporter_rows = [
    kpeRow('1M', '1M_1704067200000_H', 'high', 1704067200000, 150, '2024-01-01 00:00').replace('left=5', 'left=7')
  ];

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /visual_pivot_evidence\.exporter\.left_bars must match single_stock profile 5: 7/i);
  assert.match(errors, /visual_pivot_evidence\.monthly\.exporter_rows\.1M_1704067200000_H left must match single_stock profile 5: 7/i);
});

test('fallback pivot path caps confidence and blocks actionable output', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.timeframes[2].ohlcv_verification[0].status = 'pass_with_fallback';
  evidence.confidence.rating = 'medium';
  evidence.action_rationale.selected_action = 'actionable';

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /confidence\.rating must be capped to low or very_low when fallback is used/i);
  assert.match(errors, /confidence\.cap_reason must disclose fallback usage/i);
  assert.match(errors, /action_rationale\.selected_action must be non-actionable when fallback is used/i);
});

test('fallback evidence cannot claim clean grade or allowed trade permission', () => {
  const evidence = baseEvidence();
  evidence.visual_pivot_evidence.timeframes[2].ohlcv_verification[0].status = 'pass_with_fallback';
  evidence.verdict.evidence_grade = 'clean';
  evidence.verdict.trade_permission = 'allowed';
  evidence.verdict.confidence = 'medium';
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /verdict\.evidence_grade must be qualified when fallback is used/i);
  assert.match(errors, /verdict\.trade_permission must be blocked when fallback is used/i);
  assert.match(errors, /verdict\.confidence must be low or very_low when fallback is used/i);
});

test('live actual Wave 3 failure blocks actionable trade permission', () => {
  const evidence = baseEvidence();
  evidence.ratio_validation.push({
    id: 'live_actual_wave3_rebound',
    status: 'fail',
    required_ratio: 1.764,
    actual_ratio: 1.2,
    evidence: 'Live rebound Wave 3 failed the 176.4 floor.'
  });
  evidence.verdict.evidence_grade = 'clean';
  evidence.verdict.trade_permission = 'allowed';
  evidence.verdict.confidence = 'medium';
  evidence.verdict.posture = 'ACTIONABLE';
  evidence.status = 'ACTIONABLE';
  evidence.confidence.rating = 'medium';
  evidence.action_rationale.selected_action = 'actionable';

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /verdict\.trade_permission must be blocked when live actual Wave 3 validation fails/i);
});

test('Ian Copsey wave map is mandatory and keeps scanners out of count selection', () => {
  const evidence = baseEvidence();
  delete evidence.ian_copsey_wave_map;
  const missing = validateEvidenceFile(writeEvidence(evidence));
  assert.match(missing.errors.join('\n'), /missing top-level field: ian_copsey_wave_map/i);

  const scannerAuth = baseEvidence();
  scannerAuth.ian_copsey_wave_map.selection_method = 'Use hew_scan_chart primary_mechanical_candidate as the count authority.';
  scannerAuth.ian_copsey_wave_map.scanner_used_for_count_selection = true;
  const result = validateEvidenceFile(writeEvidence(scannerAuth));
  const errors = result.errors.join('\n');
  assert.match(errors, /scanner_used_for_count_selection must be false/i);
  assert.match(errors, /must not use scanner\/mechanical language as count-selection authority/i);
});

test('Ian Copsey wave map requires Fractal Forecasting alignment principles', () => {
  const evidence = baseEvidence();
  evidence.ian_copsey_wave_map.book_alignment_source = 'generic wave theory';
  evidence.ian_copsey_wave_map.fractal_forecasting_alignment =
    evidence.ian_copsey_wave_map.fractal_forecasting_alignment.filter((item) => item.id !== 'wave3_1764_floor');
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /book_alignment_source must reference Fractal Forecasting and Ian Copsey/i);
  assert.match(errors, /fractal_forecasting_alignment missing required principle: wave3_1764_floor/i);
});

test('HEW method language rejects classical and legacy front-facing method labels', () => {
  const classical = baseEvidence({ method: 'Classical Elliott Wave macro' });
  let result = validateEvidenceFile(writeEvidence(classical), { strategy: 'hew' });
  let errors = result.errors.join('\n');
  assert.match(errors, /method must identify Ian Copsey \/ Fractal Forecasting/i);
  assert.match(errors, /forbidden legacy method term "classical elliott wave" in method/i);

  const legacy = baseEvidence({ method: 'Harmonic Elliott Wave macro' });
  result = validateEvidenceFile(writeEvidence(legacy), { strategy: 'hew' });
  errors = result.errors.join('\n');
  assert.match(errors, /forbidden legacy method term "harmonic elliott wave" in method/i);
});

test('HEW source and authority fields reject traditional Elliott as count authority language', () => {
  const evidence = baseEvidence();
  evidence.ian_copsey_wave_map.selection_method = 'Traditional Elliott Wave selected the count authority before ratio validation.';

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /method_language forbidden source\/authority term "traditional elliott wave" in ian_copsey_wave_map\.selection_method/i);
});

test('HEW method language allows native Elliott tool names and explicit rescue-device rejection evidence', () => {
  const evidence = baseEvidence();
  evidence.ian_copsey_wave_map.selection_method =
    'Ian Copsey / Fractal Forecasting selects the anchors; elliott_impulse_wave is only the native drawing tool.';
  evidence.ian_copsey_wave_map.fractal_forecasting_alignment =
    evidence.ian_copsey_wave_map.fractal_forecasting_alignment.map((item) => (
      item.id === 'forbidden_rescue_rejection'
        ? { ...item, evidence: 'Forbidden rescue devices are explicitly rejected.' }
        : item
    ));

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.deepEqual(result.errors, []);
});

test('legacy HEW evidence paths fail closed in current packages', () => {
  const evidence = baseEvidence({ workflow_version: 'hew_stage_gated_v8_math_core' });
  evidence.human_wave_map = {};
  evidence.pivot_map = {};
  evidence.hew_stage_gated = {};

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /legacy evidence field is forbidden in new HEW packages: human_wave_map/i);
  assert.match(errors, /legacy evidence field is forbidden in new HEW packages: pivot_map/i);
  assert.match(errors, /legacy evidence field is forbidden in new HEW packages: hew_stage_gated/i);
  assert.match(errors, /legacy workflow_version prefix is forbidden in new HEW packages: hew_stage_gated_v8_math_core/i);
});

test('HEW manifest hard-codes structural proof, Copsey purity fields, and critic checks', () => {
  const manifest = JSON.parse(readFileSync(join('strategies', 'hew', 'manifest.json'), 'utf8'));
  assert.ok(manifest.required_top_level.includes('hew_structure_context'));
  assert.ok(manifest.required_top_level.includes('copsey_hew_purity'));
  assert.ok(manifest.method_language_protocol.required_method_terms.includes('ian copsey'));
  assert.ok(manifest.method_language_protocol.forbidden_method_terms.includes('classical elliott wave'));
  assert.ok(manifest.method_language_protocol.forbidden_legacy_fields.includes('human_wave_map'));
  for (const role of ['preceding_impulse_context', 'primary_degree_subwaves', 'secondary_degree_subwaves', 'projection_count']) {
    assert.ok(manifest.drawing_protocol.required_roles.includes(role), `missing HEW drawing role ${role}`);
  }
  assert.deepEqual(manifest.drawing_protocol.allowed_tools_by_role.preceding_impulse_context, ['elliott_impulse_wave', 'elliott_correction']);
  assert.deepEqual(manifest.drawing_protocol.allowed_tools_by_role.projection_count, ['elliott_impulse_wave']);
  for (const id of [
    'copsey_internal_abc_motive_engines_checked',
    'copsey_ac_lower_degree_fives_checked',
    'copsey_forbidden_rescue_devices_rejected',
    'castaway_overlay_not_copsey_source',
    'wave3_1764_rule_checked',
    'projection_topology_validated',
    'visual_thesis_consistency_checked'
  ]) {
    assert.ok(manifest.id_collections[0].required_ids.includes(id), `missing analysis checklist id ${id}`);
  }
  for (const id of ['hew_no_orphan_abc_checked', 'hew_preceding_impulse_context_checked', 'hew_primary_secondary_subwaves_checked', 'hew_forward_impulse_projection_checked', 'hew_projection_topology_checked', 'hew_visual_thesis_consistency_checked']) {
    assert.ok(manifest.critic_review.required_checklist_ids.includes(id), `missing critic check ${id}`);
    assert.ok(manifest.critic_review.blocking_checklist_ids.includes(id), `critic check must block ${id}`);
  }
  for (const id of [
    'hew_copsey_internal_abc_motive_engines_checked',
    'hew_copsey_ac_lower_degree_fives_checked',
    'hew_forbidden_rescue_devices_rejected',
    'hew_castaway_overlay_not_copsey_source',
    'hew_wave3_1764_rule_checked'
  ]) {
    assert.ok(manifest.critic_review.required_checklist_ids.includes(id), `missing Copsey critic check ${id}`);
  }
  assert.equal(manifest.copsey_purity_protocol.wave3_1764_rule.minimum_ratio, 1.764);
  assert.ok(manifest.copsey_purity_protocol.forbidden_rescue_devices.expected_rejected_devices.includes('extended_waves'));
});

test('HEW Copsey purity evidence and checklist IDs are mandatory', () => {
  const evidence = baseEvidence();
  delete evidence.copsey_hew_purity;
  evidence.analysis_checklist = evidence.analysis_checklist.filter((item) => item.id !== 'copsey_internal_abc_motive_engines_checked');
  evidence.critic_review.checklist = evidence.critic_review.checklist.filter((item) => item.id !== 'hew_wave3_1764_rule_checked');
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /missing top-level field: copsey_hew_purity/i);
  assert.match(errors, /analysis_checklist missing required id: copsey_internal_abc_motive_engines_checked/i);
  assert.match(errors, /critic_review\.checklist missing required id: hew_wave3_1764_rule_checked/i);
});

test('HEW structure context fails closed without preceding impulse evidence', () => {
  const evidence = baseEvidence();
  delete evidence.hew_structure_context.preceding_impulse_context;
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /hew_structure_context\.preceding_impulse_context is required/i);
});

test('HEW Copsey internal motive engines fail closed when macro Waves 1/3/5 are absent', () => {
  const evidence = baseEvidence();
  evidence.copsey_hew_purity.internal_abc_motive_engines.macro_waves =
    evidence.copsey_hew_purity.internal_abc_motive_engines.macro_waves.filter((wave) => wave.wave !== '3');
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /copsey_hew_purity\.internal_abc_motive_engines\.wave_3 is required/i);
});

test('HEW Copsey A and C legs require lower-degree five-wave action where visible', () => {
  const evidence = baseEvidence();
  delete evidence.copsey_hew_purity.ac_lower_degree_fives.legs[1].five_wave_action;
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /copsey_hew_purity\.ac_lower_degree_fives\.leg_C missing five_wave_action/i);
});

test('HEW Copsey purity rejects forbidden rescue devices', () => {
  const evidence = baseEvidence();
  evidence.copsey_hew_purity.forbidden_rescue_devices.rejected_devices =
    evidence.copsey_hew_purity.forbidden_rescue_devices.rejected_devices.filter((device) => device !== 'failed_fifths');
  evidence.copsey_hew_purity.forbidden_rescue_devices.used_devices = ['extended_waves'];
  evidence.copsey_hew_purity.forbidden_rescue_devices.no_use_confirmed = false;
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /missing rejected device: failed_fifths/i);
  assert.match(errors, /used_devices must be empty/i);
  assert.match(errors, /no_use_confirmed must be true/i);
});

test('HEW Castaway must be labeled as a Konsili overlay, not a Copsey source', () => {
  const evidence = baseEvidence();
  evidence.copsey_hew_purity.castaway_overlay.source_label = 'Copsey source Castaway model';
  evidence.copsey_hew_purity.castaway_overlay.is_copsey_source = true;
  evidence.castaway_trade_model.source_label = 'Copsey source Castaway model';
  evidence.castaway_trade_model.is_copsey_source = true;
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /castaway_overlay label must include konsili/i);
  assert.match(errors, /castaway_overlay label must include overlay/i);
  assert.match(errors, /castaway_overlay label must not treat Castaway as Copsey source/i);
  assert.match(errors, /castaway_trade_model\.is_copsey_source must be false/i);
});

test('HEW Wave 3 176.4 percent rule fails without rare exception downgrade semantics', () => {
  const evidence = baseEvidence();
  evidence.copsey_hew_purity.wave3_1764_rule.actual_ratio = 1.5;
  evidence.ratio_validation[0].actual_ratio = 1.5;
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /copsey_hew_purity\.wave3_1764_rule\.status must be rare_exception_downgraded/i);
  assert.match(errors, /ratio_validation\.wave3_1764_rule\.status must be rare_exception_downgraded/i);
});

test('HEW Wave 3 rare exception is allowed only when documented and downgraded', () => {
  const evidence = baseEvidence();
  const exception = {
    rarity: 'rare exception only',
    documentation: 'Documented as a lower-confidence HEW exception, not the base case.',
    downgrade: 'Downgrade the count to candidate.',
    resulting_posture: 'STAND ASIDE until the count repairs.'
  };
  evidence.copsey_hew_purity.wave3_1764_rule = {
    status: 'rare_exception_downgraded',
    required_ratio: 1.764,
    actual_ratio: 1.5,
    evidence: 'Wave 3 is below the 176.4% floor, so this is not a clean Copsey HEW pass.',
    exception
  };
  evidence.ratio_validation[0] = {
    id: 'wave3_1764_rule',
    status: 'rare_exception_downgraded',
    required_ratio: 1.764,
    actual_ratio: 1.5,
    evidence: 'Rare exception documented and downgraded.',
    exception
  };
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.deepEqual(result.errors, []);
});

test('HEW forward projection must be an Elliott impulse drawing and marked conditional', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest.find((drawing) => drawing.id === 'projection').tool = 'elliott_correction';
  evidence.hew_structure_context.forward_impulse_projection.conditionality = 'future path';
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /drawing_manifest\.projection must use one of elliott_impulse_wave/i);
  assert.match(result.errors.join('\n'), /forward_impulse_projection must label the forward path as conditional/i);
});

test('HEW projected impulses fail when Wave 2 breaches the Wave 1 origin', () => {
  const evidence = baseEvidence();
  const badProjection = {
    ...baseHypothesis({
      id: 'invalid_forward_projection',
      structure_type: 'conditional_forward_impulse',
      lifecycle: 'projection',
      pivots: [
        { id: 'p0', price: 100 },
        { id: 'p1', price: 125, point_status: 'projected' },
        { id: 'p2', price: 95, point_status: 'projected' },
        { id: 'p3', price: 160, point_status: 'projected' },
        { id: 'p4', price: 130, point_status: 'projected' },
        { id: 'p5', price: 178, point_status: 'projected' }
      ],
      measurements: [
        {
          id: 'projected_wave3',
          type: 'wave3_projection',
          points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3' }
        },
        {
          id: 'projected_wave5',
          type: 'wave5_projection',
          points: { wave1_start: 'p0', wave3_end: 'p3', wave4_end: 'p4', wave5_end: 'p5' }
        }
      ]
    })
  };
  badProjection.engine_result = scoreHewHypothesis(badProjection);
  evidence.hypotheses[0] = badProjection;
  const projectionDrawing = evidence.chart_prep.drawing_manifest.find((drawing) => drawing.id === 'projection');
  projectionDrawing.points = [
    { label: '0', pivot_id: 'w_low', date: '2024-01-08 00:00', time: 1704672000000, price: 100, source_row_id: '1W_1704672000000_L', ohlcv_check_id: 'w_low' },
    { label: '1', point_status: 'projected', price: 125, projection_formula_id: 'p1', source_pivots: ['w_low'] },
    { label: '2', point_status: 'projected', price: 95, projection_formula_id: 'p2', source_pivots: ['w_low'] },
    { label: '3', point_status: 'projected', price: 160, projection_formula_id: 'p3', source_pivots: ['w_low'] },
    { label: '4', point_status: 'projected', price: 130, projection_formula_id: 'p4', source_pivots: ['w_low'] },
    { label: '5', point_status: 'projected', price: 178, projection_formula_id: 'p5', source_pivots: ['w_low'] }
  ];

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /wave2_breaches_wave1_origin/i);
  assert.match(errors, /primary hypothesis must pass deterministic Copsey ratio engine/i);
  assert.match(errors, /drawing_manifest\.projection wave2_breaches_wave1_origin/i);
});

test('HEW critic phase blocks if structural proof checks are not pass', () => {
  const evidence = baseEvidence();
  evidence.critic_review.checklist.find((item) => item.id === 'hew_forward_impulse_projection_checked').status = 'pass_with_fixes';
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /hew_forward_impulse_projection_checked is blocking and must be pass/i);
});

test('HEW critic phase requires an independent reviewer record', () => {
  const evidence = baseEvidence();
  delete evidence.critic_review.independent_reviewer;

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /critic_review\.independent_reviewer is required/i);
});

test('persistent count state is required for session continuity', () => {
  const evidence = baseEvidence();
  evidence.count_state.anchor_hash = 'short';
  evidence.count_state.continuity_status = 'unknown';

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /count_state\.continuity_status must be one of new, continued, revised, invalidated/i);
  assert.match(errors, /count_state\.anchor_hash must be at least 12 characters/i);
});

test('Castaway output must include a structured decision table', () => {
  const evidence = baseEvidence();
  evidence.castaway_trade_model.decision_table = evidence.castaway_trade_model.decision_table.filter((row) => row.id !== 'zone_focus');

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /castaway_trade_model\.decision_table missing required row: zone_focus/i);
});

test('Wave-B invalidation ladder must be structured and chart-referenced', () => {
  const evidence = baseEvidence();
  evidence.wave_b_invalidation_ladder = {
    direction: 'bullish',
    validation_standard: 'daily_close',
    rungs: [
      {
        id: 'wave2_holds_wave1_origin',
        must_hold: 'above',
        level_role: 'wave1_origin',
        tested_by: 'wave2_low',
        status: 'pass',
        price: 100,
        evidence: 'Wave 2 held the Wave 1 origin.'
      }
    ],
    drawing_refs: ['projection'],
    hard_failure_ids: ['wave2_breaks_wave1_origin']
  };

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /wave_b_invalidation_ladder\.rungs missing required rung: b_of_3_holds_wave2/i);
  assert.match(errors, /wave_b_invalidation_ladder\.hard_failure_ids missing required id: wave4_breaks_b_of_wave3/i);
  assert.match(errors, /wave_b_invalidation_ladder\.drawing_refs\.projection must reference drawing role wave_b_ladder/i);
});

test('legacy array Wave-B ladders fail closed', () => {
  const evidence = baseEvidence();
  evidence.wave_b_invalidation_ladder = [{ id: 'w2_holds_w1_origin', level: 100, status: 'holds' }];

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /wave_b_invalidation_ladder must be an object/i);
});

test('corrective structure must classify pattern, location, and Wave-B behavior', () => {
  const evidence = baseEvidence();
  evidence.corrective_structure = {
    location: 'wave2',
    pattern: 'triangle',
    mode: 'time_correction',
    wave_b_behavior: 'countertrend',
    preceding_impulse_ref: 'preceding_impulse',
    evidence: 'Bad fixture: Wave 2 triangle should fail.'
  };

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /corrective_structure\.pattern cannot be triangle when location is wave2/i);
});

test('risk architecture cannot mark execution ready unless a live trade is declared', () => {
  const evidence = baseEvidence();
  evidence.risk_architecture.setup_type = 'structural_map_only';
  evidence.risk_architecture.execution_setup.status = 'ready';

  const result = validateEvidenceFile(writeEvidence(evidence));

  assert.match(result.errors.join('\n'), /risk_architecture\.execution_setup\.status cannot be ready unless setup_type is live_trade/i);
});

test('live trade risk architecture requires execution fields', () => {
  const evidence = baseEvidence();
  evidence.risk_architecture.setup_type = 'live_trade';
  evidence.risk_architecture.execution_setup = {
    status: 'ready',
    entry_condition: '',
    stop_level: '',
    target_zone: '',
    risk_reward: ''
  };

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');

  assert.match(errors, /risk_architecture\.execution_setup\.entry_condition is required for live_trade/i);
  assert.match(errors, /risk_architecture\.execution_setup\.stop_level is required for live_trade/i);
  assert.match(errors, /risk_architecture\.execution_setup\.target_zone is required for live_trade/i);
  assert.match(errors, /risk_architecture\.execution_setup\.risk_reward is required for live_trade/i);
});

test('execution quality records vision QA, rerun schedule, and drawing spec compliance', () => {
  const evidence = baseEvidence();
  evidence.execution_quality.vision_qa.screenshot_reviewed = false;
  delete evidence.execution_quality.rerun_schedule.condition;
  evidence.execution_quality.drawing_spec.manifest_roles_checked = false;

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /execution_quality\.vision_qa\.screenshot_reviewed must be true/i);
  assert.match(errors, /execution_quality\.rerun_schedule\.condition is required/i);
  assert.match(errors, /execution_quality\.drawing_spec\.manifest_roles_checked must be true/i);
});

test('HEW count/projection drawings cannot use trend_line substitutes', () => {
  const evidence = baseEvidence({
    chart_prep: {
      layout: 'HEW layout',
      drawings_cleared: true,
      visible_ranges_verified: true,
      drawing_manifest: [
        { id: 'bad_macro', role: 'macro_count', tool: 'trend_line', timeframe_owner: 'macro', screenshot: 'screenshots/macro.png' }
      ]
    }
  });
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /forbidden drawing tool.*trend_line/i);
});

test('zone-first final packages reject legacy decision_level drawings', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest.push({
    id: 'old_decision_line',
    role: 'decision_level',
    tool: 'horizontal_line',
    timeframe_owner: 'daily',
    screenshot: 'screenshots/trade.png'
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /deprecated final role decision_level/i);
});

test('final zone drawings require visible label metadata', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest.push({
    id: 'accumulation_w4',
    role: 'zone',
    tool: 'rectangle',
    timeframe_owner: 'daily',
    screenshot: 'screenshots/trade.png',
    zone_function: 'accumulation',
    price_range: { low: 100, high: 110 },
    boundary_refs: {
      low: { pivot_id: 'w_low' },
      high: { projection_formula_id: 'wave4_accumulation_upper' }
    }
  });

  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'drawings' });

  assert.match(result.errors.join('\n'), /drawing_manifest\.accumulation_w4\.visible_label is required for final zone drawings/i);
});

test('final zone visible labels must include range, score, and band', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest.push({
    id: 'accumulation_w4',
    role: 'zone',
    tool: 'rectangle',
    timeframe_owner: 'daily',
    screenshot: 'screenshots/trade.png',
    zone_function: 'accumulation',
    price_range: { low: 100, high: 110 },
    visible_label: {
      text: 'ACC box',
      includes_zone_type: true,
      includes_range: true,
      includes_score: true,
      visible_on_final_chart: true
    },
    boundary_refs: {
      low: { pivot_id: 'w_low' },
      high: { projection_formula_id: 'wave4_accumulation_upper' }
    }
  });

  const result = validateEvidenceFile(writeEvidence(evidence), { stage: 'drawings' });
  const errors = result.errors.join('\n');
  assert.match(errors, /visible_label\.text must include price range 100-110/i);
  assert.match(errors, /visible_label\.text must include zone score 58/i);
  assert.match(errors, /visible_label\.text must include zone score band moderate/i);
});

test('drawing manifest screenshots must be listed in screenshots evidence', () => {
  const evidence = baseEvidence();
  evidence.chart_prep.drawing_manifest[0].screenshot = 'screenshots/not-listed.png';
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /drawing_manifest\.preceding_impulse screenshot not listed in screenshots/i);
});

test('duplicate checklist IDs fail closed', () => {
  const evidence = baseEvidence({
    analysis_checklist: [
      { id: 'macro_count_subwaves_ratio_aligned', status: 'pass', evidence: 'first' },
      { id: 'macro_count_subwaves_ratio_aligned', status: 'pass', evidence: 'duplicate' }
    ]
  });
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /duplicate id.*analysis_checklist.*macro_count_subwaves_ratio_aligned/i);
});

test('screenshot paths may not escape the package screenshots directory', () => {
  const evidence = baseEvidence({
    screenshots: [{ role: 'macro_structure', path: 'screenshots/../../package.json', purpose: 'escape' }]
  });
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /screenshot path escapes package/i);
});

test('action output is mandatory and must explain why the action follows the strategy', () => {
  const evidence = baseEvidence({ action_rationale: { selected_action: 'stand_aside' } });
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /action_rationale\.why_action_follows_strategy/i);
});

test('legacy zone probabilities fail closed in new HEW packages', () => {
  const evidence = baseEvidence();
  evidence.zone_probabilities = [
    { id: 'legacy_accumulation', zone_type: 'accumulation', price_range: { low: 100, high: 110 }, probability: { value: 58, band: 'moderate' } }
  ];
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /legacy evidence field is forbidden in new HEW packages: zone_probabilities/i);
});

test('legacy migration policy fails closed in new HEW packages', () => {
  const evidence = baseEvidence();
  evidence.migration_policy = {
    is_migrated_package: true,
    source_contract_version: 'hew_stage_gated_v8_math_core'
  };
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /legacy evidence field is forbidden in new HEW packages: migration_policy/i);
});

test('zone-first packages reject trigger breakout confirmation language', () => {
  const evidence = baseEvidence();
  evidence.action_rationale.human_takeaway = 'Wait for breakout trigger confirmation before acting.';

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /zone_first_language forbidden term "trigger"/i);
  assert.match(errors, /zone_first_language forbidden term "breakout"/i);
  assert.match(errors, /zone_first_language forbidden term "confirmation"/i);
});
