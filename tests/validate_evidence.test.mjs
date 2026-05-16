import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import { scoreHewHypothesis } from '../scripts/ratio_engine.mjs';
import { validateEvidenceFile } from '../scripts/validate_evidence.mjs';

const requiredVisualFirstGates = ['visual_pivot_extraction', 'ohlcv_pivot_verification'];

function kpeRow(tf, id, type, time, price, date) {
  return `KPE|v=2|tf=${tf}|id=${id}|type=${type}|date=${date}|time=${time}|price=${price}|timezone=Etc/UTC|left=5|right=5|confirmed=true`;
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
        targets: [200, 202, 201]
      },
      {
        id: 'wave4_b3',
        type: 'wave4_b3_rule',
        direction: 'bullish',
        points: { wave4_extreme: 'p4', b_of_3_extreme: 'b_of_3' }
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
  writeFileSync(join(dir, 'screenshots', 'pivots.png'), 'fake');
  writeFileSync(join(dir, 'screenshots', 'macro.png'), 'fake');
  writeFileSync(join(dir, 'screenshots', 'trade.png'), 'fake');
  writeFileSync(join(dir, 'journal.md'), '# Journal\n\n![Pivots](screenshots/pivots.png)\n![Macro](screenshots/macro.png)\n![Trade](screenshots/trade.png)\n');
  return dir;
}

function baseEvidence(overrides = {}) {
  return {
    journal_id: 'TEST_2026-05-16_hew',
    saved_at: '2026-05-16T08:00:00+02:00',
    symbol: 'TEST:SYMBOL',
    method: 'Ian Copsey Fractal Forecasting macro',
    workflow_version: 'hew_stage_gated_v8_math_core',
    status: 'watchlist_only',
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
      { id: 'copsey_internal_abc_motive_engines_checked', status: 'pass', evidence: 'macro Waves 1, 3, and 5 have internal A-B-C motive engines or visible equivalents' },
      { id: 'copsey_ac_lower_degree_fives_checked', status: 'pass', evidence: 'A and C lower-degree five-wave action checked where visible' },
      { id: 'copsey_classical_rescue_devices_rejected', status: 'pass', evidence: 'extended waves, failed fifths, leading/ending diagonals, and diagonal triangles rejected' },
      { id: 'castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway is labeled as a Konsili overlay, not a Copsey source' },
      { id: 'wave3_1764_rule_checked', status: 'pass', evidence: 'Wave 3 176.4% floor checked and no exception used' },
      { id: 'macro_count_subwaves_ratio_aligned', status: 'pass', evidence: 'macro and subwaves drawn with native Elliott tools' },
      { id: 'projection_forward_margin_next_count', status: 'pass', evidence: 'projection path drawn with Elliott tool' },
      { id: 'wave_b_ladder_chart_proof', status: 'pass', evidence: 'ladder screenshot present' },
      { id: 'zone_probabilities_complete', status: 'pass', evidence: 'zones scored' },
      { id: 'action_rationale_complete', status: 'pass', evidence: 'rationale complete' },
      { id: 'critic_review_complete', status: 'pass', evidence: 'critic complete' }
    ],
    chart_prep: {
      layout: 'HEW layout',
      drawings_cleared: true,
      visible_ranges_verified: true,
      chart_mode_checklist: [
        { mode: 'extraction', status: 'pass', evidence: 'Pivot scaffold was visible for visual extraction and screenshot capture.' },
        { mode: 'verification', status: 'pass', evidence: 'Extracted pivots were checked against OHLCV before HEW selection.' },
        { mode: 'strategy_proof', status: 'pass', evidence: 'Only HEW count/projection/decision proof was drawn after verification.' },
        { mode: 'presentation', status: 'pass', evidence: 'Pivot scaffold hidden; final readable decision chart verified.', pivot_scaffold_visible: false, final_chart_state: 'macro count, projection, invalidation, and zones visible' }
      ],
      drawing_manifest: [
        { id: 'preceding_impulse', role: 'preceding_impulse_context', tool: 'elliott_impulse_wave', timeframe_owner: 'macro', screenshot: 'screenshots/macro.png' },
        { id: 'macro', role: 'macro_count', tool: 'elliott_correction', timeframe_owner: 'macro', screenshot: 'screenshots/macro.png' },
        { id: 'primary_subwaves', role: 'primary_degree_subwaves', tool: 'elliott_impulse_wave', timeframe_owner: 'macro', screenshot: 'screenshots/macro.png' },
        { id: 'secondary_subwaves', role: 'secondary_degree_subwaves', tool: 'elliott_impulse_wave', timeframe_owner: 'daily', screenshot: 'screenshots/trade.png' },
        { id: 'projection', role: 'projection_count', tool: 'elliott_impulse_wave', timeframe_owner: 'daily', screenshot: 'screenshots/trade.png' }
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
        source_tools: ['data_get_pine_tables']
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
          ohlcv_verification: [{ pivot_id: 'd_high', status: 'pass_with_fallback', evidence: 'Daily OHLCV summary verified nearest high.' }]
        }
      ],
      conflicts: []
    },
    ian_copsey_wave_map: {
      count_selection_authority: 'ian_copsey_fractal_forecasting',
      mechanical_tool_boundary: 'ratio_validation_only',
      scanner_used_for_count_selection: false,
      book_alignment_source: 'Fractal Forecasting - Ian Copsey',
      selection_method: 'Ian Copsey / Fractal Forecasting structure selected the Elliott anchors from visible swing sequence first; validator tools checked ratios only after the wave map was chosen.',
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
        { id: 'classical_rescue_rejection', status: 'pass', evidence: 'Extensions, failed fifths, and diagonals are rejected as rescue devices.' },
        { id: 'corrective_context_before_forecast', status: 'pass', evidence: 'The correction is tied to the preceding impulse before any forward projection.' },
        { id: 'scanner_not_count_authority', status: 'pass', evidence: 'Scanners are limited to scaffolding; count authority stays with Copsey structure.' }
      ]
    },
    hypotheses: [
      baseHypothesis(),
      baseHypothesis({ id: 'hypothesis_alternate', selection_role: 'alternate', structure_type: 'alternate_impulse' }),
      baseHypothesis({ id: 'hypothesis_watch', selection_role: 'watch', structure_type: 'watch_context' })
    ],
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
        evidence: 'Copsey HEW motive legs use internal A-B-C engines rather than classical impulse extension rescue rules.',
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
      classical_rescue_devices: {
        status: 'pass',
        evidence: 'Classical rescue devices were not used to save the count.',
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
    wave_b_invalidation_ladder: [{ id: 'w2_holds_w1_origin', level: 100, status: 'holds', violation_standard: 'daily_close' }],
    zone_probabilities: [
      { id: 'retracement_w4', zone_type: 'retracement', price_range: { low: 100, high: 110 }, probability: { value: 58, band: 'moderate' }, evidence: 'Wave 4 retracement support', invalidation: 'below 99', upgrade_trigger: 'accept above 120', downgrade_trigger: 'lose 99' },
      { id: 'projection_w5', zone_type: 'projection', price_range: { low: 150, high: 160 }, probability: { value: 52, band: 'moderate' }, evidence: 'Wave 5 projection target', invalidation: 'accept above 165', upgrade_trigger: 'reject zone', downgrade_trigger: 'accept above' }
    ],
    action_rationale: {
      selected_action: 'stand_aside',
      strategy_basis: 'Ian Copsey Fractal Forecasting ratio model and Konsili Castaway overlay',
      why_action_follows_strategy: 'The active count is candidate and confirmation is incomplete.',
      chart_evidence_supporting_action: 'Macro count, ladder, and zones are visible.',
      what_proves_it_wrong: 'Acceptance above the flip level with valid subwaves.',
      human_takeaway: 'No trade until trigger confirms.'
    },
    trade_posture: { posture: 'STAND ASIDE', trigger: 'none', invalidation: 'defined', target_path: 'conditional' },
    castaway_trade_model: { model: 'Model 6', permission: 'blocked', source_label: 'Konsili Castaway overlay', is_copsey_source: false, reason: 'stand aside' },
    no_trade_gate: [
      { id: 'location', status: 'fail', evidence: 'mid wave' },
      { id: 'trigger', status: 'fail', evidence: 'not triggered' },
      { id: 'invalidation', status: 'pass', evidence: 'defined' },
      { id: 'reward', status: 'partial', evidence: 'conditional' },
      { id: 'timeframe_alignment', status: 'partial', evidence: 'mixed' }
    ],
    red_team: { countercase: 'Alternate count changes posture.', proof_needed: 'break level', impact: 'stand aside' },
    critic_review: {
      final_verdict: 'pass',
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
        { id: 'hew_copsey_internal_abc_motive_engines_checked', status: 'pass', evidence: 'Macro Waves 1, 3, and 5 document internal A-B-C motive engines or visible equivalents.' },
        { id: 'hew_copsey_ac_lower_degree_fives_checked', status: 'pass', evidence: 'A and C lower-degree five-wave action was checked where visible.' },
        { id: 'hew_classical_rescue_devices_rejected', status: 'pass', evidence: 'Classical Elliott rescue devices were rejected and unused.' },
        { id: 'hew_castaway_overlay_not_copsey_source', status: 'pass', evidence: 'Castaway is labeled as a Konsili overlay and not a Copsey source.' },
        { id: 'hew_wave3_1764_rule_checked', status: 'pass', evidence: 'Wave 3 176.4% rule passed without exception.' },
        { id: 'unresolved_items_disclosed', status: 'pass', evidence: 'limitations disclosed' }
      ],
      findings: []
    },
    review_triggers: [{ condition: 'trigger', expected: 'upgrade', downgrade_if: 'fail' }],
    missing_evidence: [],
    confidence: { rating: 'medium', rationale: 'candidate but gated' },
    ...overrides
  };
}

function writeEvidence(evidence) {
  const dir = packageDir();
  const file = join(dir, 'evidence.json');
  writeFileSync(file, JSON.stringify(evidence, null, 2));
  return file;
}

test('valid HEW package passes the stage-gated workflow contract', () => {
  const file = writeEvidence(baseEvidence());
  const result = validateEvidenceFile(file);
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
  assert.equal(manifest.visual_pivot_protocol.required_exporter.pine_script, 'tradingview/konsili_pivot_exporter.pine');
  assert.deepEqual(manifest.visual_pivot_protocol.required_exporter.required_pivot_fields, ['date', 'time', 'price', 'exporter_row_id']);
  assert.deepEqual(manifest.visual_pivot_protocol.required_exporter.allowed_source_tools, ['data_get_pine_tables', 'data_get_pine_labels']);
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
    'wave4_b3_rule'
  ]);
  assert.deepEqual(manifest.hypothesis_protocol.wave_iii_complete_required_measurement_types, ['triple_confluence']);
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
      baseHypothesis({ id: 'hypothesis_alternate', selection_role: 'alternate', structure_type: 'alternate_impulse' }),
      baseHypothesis({ id: 'hypothesis_watch', selection_role: 'watch', structure_type: 'watch_context' })
    ]
  });

  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /measurements missing required type: wave5_projection/i);
  assert.match(errors, /measurements missing required type: retracement/i);
  assert.match(errors, /measurements missing required type: alternation_sum/i);
  assert.match(errors, /measurements missing required type: wave4_b3_rule/i);
  assert.match(errors, /missing required Wave III complete type: triple_confluence/i);
  assert.match(errors, /missing required completed-impulse measurement: retracement:wave2_retracement/i);
  assert.match(errors, /missing required completed-impulse measurement: retracement:wave4_retracement/i);
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
  assert.match(result.errors.join('\n'), /workflow_version must equal manifest contract_version hew_stage_gated_v8_math_core/i);
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

test('visual pivot evidence is mandatory before strategy analysis', () => {
  const evidence = baseEvidence();
  delete evidence.visual_pivot_evidence;
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /missing top-level field: visual_pivot_evidence/i);
});

test('Konsili Pivot Exporter rows are mandatory pivot data path', () => {
  const evidence = baseEvidence();
  delete evidence.visual_pivot_evidence.exporter;
  delete evidence.visual_pivot_evidence.timeframes[0].exporter_rows;
  delete evidence.visual_pivot_evidence.timeframes[1].pivots[0].exporter_row_id;
  const result = validateEvidenceFile(writeEvidence(evidence));
  const errors = result.errors.join('\n');
  assert.match(errors, /visual_pivot_evidence\.exporter is required/i);
  assert.match(errors, /visual_pivot_evidence\.monthly\.exporter_rows must be a non-empty array/i);
  assert.match(errors, /visual_pivot_evidence\.weekly\.pivots\.w_low missing exporter_row_id/i);
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

test('HEW manifest hard-codes structural proof, Copsey purity fields, and critic checks', () => {
  const manifest = JSON.parse(readFileSync(join('strategies', 'hew', 'manifest.json'), 'utf8'));
  assert.ok(manifest.required_top_level.includes('hew_structure_context'));
  assert.ok(manifest.required_top_level.includes('copsey_hew_purity'));
  for (const role of ['preceding_impulse_context', 'primary_degree_subwaves', 'secondary_degree_subwaves', 'projection_count']) {
    assert.ok(manifest.drawing_protocol.required_roles.includes(role), `missing HEW drawing role ${role}`);
  }
  assert.deepEqual(manifest.drawing_protocol.allowed_tools_by_role.preceding_impulse_context, ['elliott_impulse_wave']);
  assert.deepEqual(manifest.drawing_protocol.allowed_tools_by_role.projection_count, ['elliott_impulse_wave']);
  for (const id of [
    'copsey_internal_abc_motive_engines_checked',
    'copsey_ac_lower_degree_fives_checked',
    'copsey_classical_rescue_devices_rejected',
    'castaway_overlay_not_copsey_source',
    'wave3_1764_rule_checked'
  ]) {
    assert.ok(manifest.id_collections[0].required_ids.includes(id), `missing analysis checklist id ${id}`);
  }
  for (const id of ['hew_no_orphan_abc_checked', 'hew_preceding_impulse_context_checked', 'hew_primary_secondary_subwaves_checked', 'hew_forward_impulse_projection_checked']) {
    assert.ok(manifest.critic_review.required_checklist_ids.includes(id), `missing critic check ${id}`);
    assert.ok(manifest.critic_review.blocking_checklist_ids.includes(id), `critic check must block ${id}`);
  }
  for (const id of [
    'hew_copsey_internal_abc_motive_engines_checked',
    'hew_copsey_ac_lower_degree_fives_checked',
    'hew_classical_rescue_devices_rejected',
    'hew_castaway_overlay_not_copsey_source',
    'hew_wave3_1764_rule_checked'
  ]) {
    assert.ok(manifest.critic_review.required_checklist_ids.includes(id), `missing Copsey critic check ${id}`);
  }
  assert.equal(manifest.copsey_purity_protocol.wave3_1764_rule.minimum_ratio, 1.764);
  assert.ok(manifest.copsey_purity_protocol.classical_rescue_devices.expected_rejected_devices.includes('extended_waves'));
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

test('HEW Copsey purity rejects classical Elliott rescue devices', () => {
  const evidence = baseEvidence();
  evidence.copsey_hew_purity.classical_rescue_devices.rejected_devices =
    evidence.copsey_hew_purity.classical_rescue_devices.rejected_devices.filter((device) => device !== 'failed_fifths');
  evidence.copsey_hew_purity.classical_rescue_devices.used_devices = ['extended_waves'];
  evidence.copsey_hew_purity.classical_rescue_devices.no_use_confirmed = false;
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

test('HEW critic phase blocks if structural proof checks are not pass', () => {
  const evidence = baseEvidence();
  evidence.critic_review.checklist.find((item) => item.id === 'hew_forward_impulse_projection_checked').status = 'pass_with_fixes';
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /hew_forward_impulse_projection_checked is blocking and must be pass/i);
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

test('zone probabilities require sane numeric ranges', () => {
  const evidence = baseEvidence();
  evidence.zone_probabilities[0].probability.value = 130;
  evidence.zone_probabilities[0].price_range = { low: 110, high: 100 };
  const result = validateEvidenceFile(writeEvidence(evidence));
  assert.match(result.errors.join('\n'), /probability\.value must be between 0 and 100/i);
  assert.match(result.errors.join('\n'), /price_range\.low must be less than high/i);
});
