import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreHewHypothesis,
  scoreHewHypotheses
} from '../scripts/ratio_engine.mjs';

function primaryHypothesis(overrides = {}) {
  return {
    id: 'macro_primary',
    selection_role: 'primary',
    direction: 'bullish',
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
        points: { prior_start: 'p0', prior_end: 'p1', retracement_end: 'p2' }
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
}

test('scoreHewHypothesis passes a Copsey-aligned hypothesis with convergent measurements', () => {
  const result = scoreHewHypothesis(primaryHypothesis());

  assert.equal(result.status, 'pass');
  assert.equal(result.hard_rule_pass, true);
  assert.equal(result.violations.length, 0);
  assert.ok(result.score > 95);
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').matched_cluster, '2236_2618');
});

test('scoreHewHypothesis rejects classical 127.2 percent C-wave rescue ratios', () => {
  const bad = primaryHypothesis({
    pivots: [
      ...primaryHypothesis().pivots.filter((point) => point.id !== 'c1'),
      { id: 'c1', price: 159.12 }
    ]
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.equal(result.hard_rule_pass, false);
  assert.ok(result.violations.some((item) => item.id === 'wave_c_ratio_not_in_copsey_universe'));
});

test('scoreHewHypothesis hard-fails the Wave IV break of B-of-III rule', () => {
  const bad = primaryHypothesis({
    pivots: [
      ...primaryHypothesis().pivots.filter((point) => point.id !== 'p4'),
      { id: 'p4', price: 126 }
    ]
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.ok(result.violations.some((item) => item.id === 'wave4_breaks_b_of_wave3'));
});

test('scoreHewHypothesis exposes the NVO macro impulse failure when full measurements are present', () => {
  const result = scoreHewHypothesis({
    id: 'nvo_macro_impulse_full_measurement_audit',
    selection_role: 'primary',
    direction: 'bullish',
    pivots: [
      { id: 'p0', price: 45.755 },
      { id: 'p1', price: 61.08 },
      { id: 'p2', price: 47.51 },
      { id: 'p3', price: 86.485 },
      { id: 'p4', price: 75.56 },
      { id: 'p5', price: 138.28 }
    ],
    measurements: [
      {
        id: 'macro_wave3',
        type: 'wave3_projection',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3' }
      },
      {
        id: 'macro_wave5',
        type: 'wave5_projection',
        points: { wave1_start: 'p0', wave3_end: 'p3', wave4_end: 'p4', wave5_end: 'p5' }
      },
      {
        id: 'wave2_retracement',
        type: 'retracement',
        points: { prior_start: 'p0', prior_end: 'p1', retracement_end: 'p2' }
      },
      {
        id: 'wave4_retracement',
        type: 'retracement',
        points: { prior_start: 'p2', prior_end: 'p3', retracement_end: 'p4' }
      },
      {
        id: 'macro_alternation',
        type: 'alternation_sum',
        trend_context: 'corrective',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3', wave4_end: 'p4' }
      }
    ]
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.score, 45);
  assert.equal(result.hard_rule_pass, false);
  assert.deepEqual(result.violations.map((item) => item.id).sort(), [
    'retracement_ratio_not_in_copsey_universe',
    'retracement_ratio_not_in_copsey_universe',
    'wave5_ratio_not_in_copsey_universe'
  ]);
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave5').actual_ratio, 1.5399);
  assert.equal(result.measurements.find((item) => item.id === 'wave2_retracement').actual_ratio, 0.8855);
  assert.equal(result.measurements.find((item) => item.id === 'wave4_retracement').actual_ratio, 0.2803);
});

test('scoreHewHypotheses keeps scoring deterministic across multiple candidates', () => {
  const results = scoreHewHypotheses([
    primaryHypothesis({ id: 'candidate_a' }),
    primaryHypothesis({
      id: 'candidate_b',
      measurements: [
        {
          id: 'bad_wave3',
          type: 'wave3_projection',
          points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p4' }
        }
      ]
    })
  ]);

  assert.deepEqual(results.map((result) => result.hypothesis_id), ['candidate_a', 'candidate_b']);
  assert.equal(results[0].status, 'pass');
  assert.equal(results[1].status, 'fail');
});
