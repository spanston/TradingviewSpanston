import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateEvidenceFile } from '../scripts/validate_evidence.mjs';

function packageDir(method = 'hew') {
  const dir = mkdtempSync(join(tmpdir(), `konsili-${method}-`));
  mkdirSync(join(dir, 'screenshots'));
  writeFileSync(join(dir, 'screenshots', 'macro.png'), 'fake');
  writeFileSync(join(dir, 'screenshots', 'trade.png'), 'fake');
  writeFileSync(join(dir, 'journal.md'), '# Journal\n\n![Macro](screenshots/macro.png)\n![Trade](screenshots/trade.png)\n');
  return dir;
}

function baseEvidence(overrides = {}) {
  return {
    journal_id: 'TEST_2026-05-16_hew',
    saved_at: '2026-05-16T08:00:00+02:00',
    symbol: 'TEST:SYMBOL',
    method: 'HEW macro',
    workflow_version: 'hew_stage_gated_v2',
    status: 'watchlist_only',
    stage_gates: [
      { id: 'route_and_layout', status: 'pass', evidence: 'HEW layout loaded.' },
      { id: 'top_down_chart_read', status: 'pass', evidence: 'M/W/D read.' },
      { id: 'drawing_protocol', status: 'pass', evidence: 'Native Elliott drawings used.' },
      { id: 'evidence_contract', status: 'pass', evidence: 'Required fields filled.' },
      { id: 'action_output', status: 'pass', evidence: 'Decision-first action block complete.' },
      { id: 'critic_review', status: 'pass', evidence: 'Final critic passed.' }
    ],
    analysis_checklist: [
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
      drawing_manifest: [
        { id: 'macro', role: 'macro_count', tool: 'elliott_impulse_wave', timeframe_owner: 'macro', screenshot: 'screenshots/macro.png' },
        { id: 'projection', role: 'projection_count', tool: 'elliott_correction', timeframe_owner: 'daily', screenshot: 'screenshots/trade.png' }
      ]
    },
    screenshots: [
      { role: 'macro_structure', path: 'screenshots/macro.png', purpose: 'Macro count proof.' },
      { role: 'trade_posture', path: 'screenshots/trade.png', purpose: 'Action map.' }
    ],
    primary_count: { status: 'candidate', summary: 'Macro count attempted.' },
    alternate_counts: [{ id: 'alt1', activation: 'level', invalidation: 'level', implication: 'stand aside' }],
    ratio_validation: [{ id: 'wave3_floor', status: 'pass', evidence: '176.4 checked' }],
    rule_validation: [{ id: 'wave2_origin', status: 'pass', evidence: 'origin holds' }],
    wave_b_invalidation_ladder: [{ id: 'w2_holds_w1_origin', level: 100, status: 'holds', violation_standard: 'daily_close' }],
    zone_probabilities: [
      { id: 'accum_w4', zone_type: 'accumulation', price_range: { low: 100, high: 110 }, probability: { value: 58, band: 'moderate' }, evidence: 'W4 support', invalidation: 'below 99', upgrade_trigger: 'accept above 120', downgrade_trigger: 'lose 99' },
      { id: 'dist_w5', zone_type: 'distribution', price_range: { low: 150, high: 160 }, probability: { value: 52, band: 'moderate' }, evidence: 'W5 target', invalidation: 'accept above 165', upgrade_trigger: 'reject zone', downgrade_trigger: 'accept above' }
    ],
    action_rationale: {
      selected_action: 'stand_aside',
      strategy_basis: 'HEW ratio model and Castaway model',
      why_action_follows_strategy: 'The active count is candidate and confirmation is incomplete.',
      chart_evidence_supporting_action: 'Macro count, ladder, and zones are visible.',
      what_proves_it_wrong: 'Acceptance above the flip level with valid subwaves.',
      human_takeaway: 'No trade until trigger confirms.'
    },
    trade_posture: { posture: 'STAND ASIDE', trigger: 'none', invalidation: 'defined', target_path: 'conditional' },
    castaway_trade_model: { model: 'Model 6', permission: 'blocked', reason: 'stand aside' },
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
        { id: 'no_day_trading_leak', status: 'pass', evidence: 'no intraday' },
        { id: 'chart_evidence_aligned', status: 'pass', evidence: 'screenshots match' },
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
  const result = validateEvidenceFile(writeEvidence(baseEvidence({ workflow_version: 'old_or_wrong_contract' })));
  assert.match(result.errors.join('\n'), /workflow_version must equal manifest contract_version hew_stage_gated_v2/i);
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
  assert.match(result.errors.join('\n'), /drawing_manifest\.macro screenshot not listed in screenshots/i);
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
