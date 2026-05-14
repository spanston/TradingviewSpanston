/**
 * HEW evidence validator tests.
 *
 * Run: node --test tests/hew_validator.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = join(__dirname, '..', 'scripts', 'validate_hew_evidence.js');

function runValidator(file) {
  try {
    const stdout = execFileSync('node', [VALIDATOR, file], {
      encoding: 'utf8',
      timeout: 15000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status,
    };
  }
}

function baseEvidence(overrides = {}) {
  return {
    journal_id: 'TEST_2026-05-14_hew',
    saved_at: '2026-05-14T12:00:00Z',
    symbol: 'TEST',
    method: 'Harmonic Elliott Wave',
    workflow_version: 'hew_v1',
    status: 'complete',
    evidence_contract: {
      contract_version: 'hew_evidence_stack_v1',
      completion_status: 'complete',
      asset_class: 'equity',
      trade_permission: 'structural_only',
      trade_permission_reason: 'Validator fixture.',
      validator: 'npm run validate:hew',
    },
    asset_context: {
      asset_class: 'equity',
      venue: 'NYSE',
      session_model: 'regular_hours',
      volume_reliability: 'native_exchange_volume',
    },
    analysis_checklist: [
      'source_tradingview_mcp',
      'top_down_timeframes_checked',
      'macro_count_prioritized',
      'chart_fitted_before_reads',
      'primary_count_defined',
      'macro_subwaves_mapped',
      'alternate_count_defined',
      'wave3_projection_checked',
      'c_of_3_checked',
      'support_invalidation_checked',
      'alternation_checked',
      'corrective_structure_checked',
      'projection_targets_clustered',
      'hard_invalidation_defined',
      'flip_level_defined',
      'trade_posture_scored',
      'validation_log_complete',
      'red_team_complete',
      'screenshots_aligned',
    ].map((id) => ({ id, status: 'pass', evidence: `${id} checked.` })),
    chart_prep: {
      source: 'TradingView MCP',
      drawings_cleared: true,
      visible_ranges_verified: true,
    },
    screenshots: [
      {
        role: 'macro_structure',
        path: 'screenshots/test_hew_macro_structure.png',
        purpose: 'Fixture screenshot path.',
      },
    ],
    timeframe_summaries: [
      {
        timeframe: 'W',
        count_state: 'candidate impulse',
        active_wave: 'Wave 3',
      },
    ],
    primary_count: {
      direction: 'bullish',
      degree: 'medium',
      active_wave: 'Wave C of 3',
      status: 'candidate',
      macro_priority: 'highest_degree_attempted',
      subwaves: {
        wave1: 'A/B/C fixture internals.',
        wave2: 'Zigzag fixture correction.',
        wave3: 'A/B/C of 3 fixture internals.',
        wave4: 'Not applicable fixture.',
        wave5: 'Not applicable fixture.',
      },
      summary: 'Fixture primary count.',
    },
    alternate_counts: [
      {
        name: 'Alt corrective B',
        activation_level: 'Below 100',
        invalidation_level: 'Above 120',
        implication: 'Stand aside.',
      },
    ],
    pivot_map: {
      wave1_origin: 90,
      wave1_extreme: 100,
      wave2: 94,
    },
    ratio_validation: [
      {
        id: 'wave3_1764_floor',
        measurement: 'Wave 1 = 10, projected from 94.',
        required_or_target: '111.64',
        actual: '112',
        status: 'pass',
      },
      {
        id: 'c_of_3_vs_a_of_3',
        measurement: 'C of 3 versus A of 3.',
        required_or_target: 'C of 3 not shorter than A of 3.',
        actual: 'pass',
        status: 'pass',
      },
    ],
    rule_validation: [
      'wave2_origin',
      'wave3_exceeds_wave1',
      'wave3_1764_floor',
      'wave4_respects_b_of_3',
      'wave5_exceeds_wave3',
      'b_of_5_respects_wave4',
    ].map((id) => ({
      id,
      requirement: `${id} requirement.`,
      observed: `${id} observed.`,
      status: id.includes('wave5') || id.includes('b_of_5') ? 'not_applicable' : 'pass',
      trade_impact: 'Fixture trade impact.',
    })),
    corrective_structure: {
      active_pattern: 'zigzag',
      evidence: 'Fixture correction.',
      status: 'candidate',
    },
    alternation: {
      wave2: 'deep simple',
      wave4: 'not complete',
      status: 'partial',
    },
    projection_targets: [
      {
        id: 'wave3_targets',
        scenario_type: 'impulsive_continuation',
        method: 'Wave 1 projected from Wave 2.',
        levels: [111.64, 114, 116.36],
        cluster_status: 'clustered',
        notes: 'Fixture targets.',
      },
    ],
    invalidation_and_flip_levels: {
      hard_invalidation: 90,
      flip_level: 100,
      alternate_trigger: 94,
    },
    trade_posture: {
      posture: 'STAND ASIDE',
      structural_setup: 'Candidate Wave 3.',
      execution_setup: 'No trigger in fixture.',
      hard_invalidation: 90,
      flip_level: 100,
    },
    validation_log: [
      {
        test: 'Wave 3 floor',
        result: 'pass',
        notes: 'Fixture result.',
      },
    ],
    no_trade_gate: [
      'location',
      'trigger',
      'invalidation',
      'reward',
      'timeframe_alignment',
    ].map((id) => ({ id, status: id === 'trigger' ? 'fail' : 'pass', evidence: `${id} evidence.` })),
    red_team: {
      countercase: 'The move is a corrective B wave.',
      proof_needed: 'Break below 94.',
    },
    review_triggers: [
      {
        condition: 'Review above 112.',
        expected: 'Hold breakout.',
        downgrade_if: 'Rejects below 100.',
      },
    ],
    missing_evidence: [],
    confidence: {
      rating: 'medium',
      rationale: 'Fixture confidence.',
    },
    ...overrides,
  };
}

function writeEvidence(evidence) {
  const dir = mkdtempSync(join(tmpdir(), 'hew-validator-'));
  const file = join(dir, 'evidence.json');
  writeFileSync(file, JSON.stringify(evidence, null, 2));
  return { dir, file };
}

describe('HEW evidence validator', () => {
  it('accepts a complete HEW evidence contract', () => {
    const { dir, file } = writeEvidence(baseEvidence());
    try {
      const result = runValidator(file);
      assert.equal(result.exitCode, 0, result.stderr);
      assert.ok(result.stdout.includes('PASS'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects evidence missing mandatory HEW validation sections', () => {
    const evidence = baseEvidence({
      ratio_validation: [],
      rule_validation: [],
      alternate_counts: [],
    });
    const { dir, file } = writeEvidence(evidence);
    try {
      const result = runValidator(file);
      assert.equal(result.exitCode, 1);
      assert.ok(result.stderr.includes('missing ratio_validation id: wave3_1764_floor'));
      assert.ok(result.stderr.includes('alternate_counts must be a non-empty array'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
