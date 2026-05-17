import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bearishProjection,
  bullishProjection,
  classifyRatioModel,
  length,
  projectionRatio,
  RATIO_MODELS,
  retracementRatio,
  scoreHewHypothesis,
  scoreHewHypotheses,
  validateBearishRules,
  validateBullishRules
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
        points: { prior_start: 'p0', prior_end: 'p1', retracement_end: 'p2' }
      },
      {
        id: 'wave4_retracement',
        type: 'retracement',
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
        targets: [
          { id: 't1', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.4, direction: 'bullish' },
          { id: 't2', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.48, direction: 'bullish' },
          { id: 't3', points: { start: 'p0', end: 'p1', anchor: 'p4' }, ratio: 2.44, direction: 'bullish' }
        ]
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
}

function wave3RatioHypothesis(ratio) {
  return {
    id: `wave3_ratio_${String(ratio).replace('.', '_')}`,
    selection_role: 'primary',
    direction: 'bullish',
    pivots: [
      { id: 'p0', price: 100 },
      { id: 'p1', price: 125 },
      { id: 'p2', price: 110 },
      { id: 'p3', price: 110 + 25 * ratio }
    ],
    measurements: [
      {
        id: 'macro_wave3',
        type: 'wave3_projection',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3' }
      }
    ]
  };
}

test('measurement primitives expose deterministic HEW math helpers', () => {
  assert.equal(length({ price: 100 }, { price: 125 }), 25);
  assert.ok(Math.abs(bullishProjection({ price: 110 }, 25, 1.764) - 154.1) < 1e-12);
  assert.ok(Math.abs(bearishProjection({ price: 110 }, 25, 1.764) - 65.9) < 1e-12);
  assert.ok(Math.abs(projectionRatio(44.1, 25) - 1.764) < 1e-12);
  assert.equal(retracementRatio(-15, 25), 0.6);
});

test('bullish and bearish HEW hard-rule helpers return fail-closed rule ids', () => {
  assert.deepEqual(
    validateBullishRules({
      w1_origin: { price: 100 },
      w1: { price: 125 },
      w2: { price: 95 },
      w3: { price: 120 },
      b_of_3: { price: 90 },
      w4: { price: 89 },
      b_of_5: { price: 88 }
    }),
    [
      'wave2_breaks_wave1_origin',
      'wave3_does_not_exceed_wave1',
      'b_of_3_breaks_wave2',
      'wave4_breaks_b_of_wave3',
      'b_of_5_breaks_wave4'
    ]
  );

  assert.deepEqual(
    validateBearishRules({
      w1_origin: { price: 100 },
      w1: { price: 75 },
      w2: { price: 105 },
      w3: { price: 80 },
      b_of_3: { price: 110 },
      w4: { price: 111 },
      b_of_5: { price: 112 }
    }),
    [
      'wave2_breaks_wave1_origin',
      'wave3_does_not_exceed_wave1',
      'b_of_3_breaks_wave2',
      'wave4_breaks_b_of_wave3',
      'b_of_5_breaks_wave4'
    ]
  );
});

test('classifyRatioModel maps Wave 3 ratio thresholds to Copsey HEW models', () => {
  assert.equal(classifyRatioModel({ wave3Ratio: 1.763 }), null);
  assert.equal(classifyRatioModel({ wave3Ratio: 1.764 }), RATIO_MODELS.model_1_standard);
  assert.equal(classifyRatioModel({ wave3Ratio: 2.236 }), RATIO_MODELS.model_2_extended);
  assert.equal(RATIO_MODELS.model_2_extended.waveCOf3OfWave1[1], 2.414);
  assert.equal(classifyRatioModel({ wave3Ratio: 3.236 }), RATIO_MODELS.model_3_super_extended);
  assert.equal(RATIO_MODELS.model_3_super_extended.wave5OfWave1[0], 3.764);
});

test('scoreHewHypothesis hard-fails Wave 3 ratio 1.763 without rare-exception evidence', () => {
  const result = scoreHewHypothesis(wave3RatioHypothesis(1.763));

  assert.equal(result.status, 'fail');
  assert.equal(result.hard_rule_pass, false);
  assert.equal(result.ratio_model, null);
  assert.ok(result.violations.some((item) => item.id === 'wave3_below_1764_floor'));
});

test('scoreHewHypothesis classifies Wave 3 ratio 1.764 as model 1', () => {
  const result = scoreHewHypothesis(wave3RatioHypothesis(1.764));

  assert.equal(result.status, 'pass');
  assert.equal(result.ratio_model, 'model_1_standard');
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').ratio_model, 'model_1_standard');
});

test('scoreHewHypothesis classifies Wave 3 ratio 2.236 as model 2', () => {
  const result = scoreHewHypothesis(wave3RatioHypothesis(2.236));

  assert.equal(result.status, 'pass');
  assert.equal(result.ratio_model, 'model_2_extended');
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').ratio_model, 'model_2_extended');
});

test('scoreHewHypothesis classifies Wave 3 ratio 3.236 as model 3', () => {
  const result = scoreHewHypothesis(wave3RatioHypothesis(3.236));

  assert.equal(result.status, 'pass');
  assert.equal(result.ratio_model, 'model_3_super_extended');
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').ratio_model, 'model_3_super_extended');
});

test('scoreHewHypothesis passes a Copsey-aligned hypothesis with convergent measurements', () => {
  const result = scoreHewHypothesis(primaryHypothesis());

  assert.equal(result.status, 'pass');
  assert.equal(result.hard_rule_pass, true);
  assert.equal(result.ratio_model, 'model_2_extended');
  assert.equal(result.violations.length, 0);
  assert.ok(result.score > 95);
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').matched_cluster, 'model_2_2236_2414');
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave3').nearest_anchor, 2.414);
  assert.equal(result.measurements.find((item) => item.id === 'triple_target').derived_targets.length, 3);
});

test('scoreHewHypothesis hard-fails when C of 3 is shorter than A of 3', () => {
  const bad = primaryHypothesis({
    pivots: [
      ...primaryHypothesis().pivots.filter((point) => point.id !== 'c1'),
      { id: 'c1', price: 180 }
    ]
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.equal(result.hard_rule_pass, false);
  assert.ok(result.violations.some((item) => item.id === 'c_of_3_shorter_than_a_of_3'));
});

test('scoreHewHypothesis rejects non-Copsey 127.2 percent C-wave rescue ratios', () => {
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
  assert.equal(result.score, 20);
  assert.equal(result.hard_rule_pass, false);
  assert.deepEqual(result.violations.map((item) => item.id).sort(), [
    'extended_wave5_rejected_by_copsey',
    'retracement_ratio_not_in_copsey_universe',
    'retracement_ratio_not_in_copsey_universe',
    'wave3_outside_copsey_clusters'
  ]);
  assert.equal(result.measurements.find((item) => item.id === 'macro_wave5').actual_ratio, 1.5399);
  assert.equal(result.measurements.find((item) => item.id === 'wave2_retracement').actual_ratio, 0.8855);
  assert.equal(result.measurements.find((item) => item.id === 'wave4_retracement').actual_ratio, 0.2803);
});

test('scoreHewHypothesis rejects raw triple-confluence targets', () => {
  const bad = primaryHypothesis({
    measurements: primaryHypothesis().measurements.map((measurement) => (
      measurement.id === 'triple_target'
        ? { ...measurement, targets: [200, 202, 201] }
        : measurement
    ))
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.ok(result.violations.some((item) => item.id === 'triple_confluence_target_not_pivot_derived'));
});

test('scoreHewHypothesis hard-fails when Wave 3 is shortest among motive waves', () => {
  const result = scoreHewHypothesis({
    id: 'wave3_shortest_case',
    direction: 'bullish',
    pivots: [
      { id: 'p0', price: 100 },
      { id: 'p1', price: 150 },
      { id: 'p2', price: 125 },
      { id: 'p3', price: 145 },
      { id: 'p4', price: 135 },
      { id: 'p5', price: 180 }
    ],
    measurements: [
      {
        id: 'wave3_not_shortest',
        type: 'wave3_not_shortest_rule',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave2_end: 'p2', wave3_end: 'p3', wave4_end: 'p4', wave5_end: 'p5' }
      }
    ]
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.hard_rule_pass, false);
  assert.ok(result.violations.some((item) => item.id === 'wave3_is_shortest'));
});

test('scoreHewHypothesis hard-fails when Wave 4 overlaps Wave 1 territory', () => {
  const result = scoreHewHypothesis({
    id: 'wave1_wave4_overlap_case',
    direction: 'bullish',
    pivots: [
      { id: 'p0', price: 100 },
      { id: 'p1', price: 125 },
      { id: 'p4', price: 124 }
    ],
    measurements: [
      {
        id: 'wave1_wave4_non_overlap',
        type: 'wave1_wave4_non_overlap_rule',
        direction: 'bullish',
        points: { wave1_start: 'p0', wave1_end: 'p1', wave4_extreme: 'p4' }
      }
    ]
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.hard_rule_pass, false);
  assert.ok(result.violations.some((item) => item.id === 'wave1_wave4_overlap'));
});

test('scoreHewHypothesis hard-fails R.N. hard-rule Wave 3 shortest and Wave 1-4 overlap rules', () => {
  const bad = primaryHypothesis({
    pivots: [
      ...primaryHypothesis().pivots.filter((point) => !['p3', 'p5', 'p4'].includes(point.id)),
      { id: 'p3', price: 130 },
      { id: 'p4', price: 124 },
      { id: 'p5', price: 190 }
    ]
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.ok(result.violations.some((item) => item.id === 'wave3_is_shortest'));
  assert.ok(result.violations.some((item) => item.id === 'wave1_wave4_overlap'));
});

test('scoreHewHypothesis hard-fails failed fifth rescue counts', () => {
  const bad = primaryHypothesis({
    pivots: [
      ...primaryHypothesis().pivots.filter((point) => point.id !== 'p5'),
      { id: 'p5', price: 160 }
    ]
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.equal(result.classification, 'invalid_diagnostic');
  assert.ok(result.violations.some((item) => item.id === 'failed_fifth_forbidden'));
});

test('scoreHewHypothesis rejects projected Wave 3 marked complete', () => {
  const bad = primaryHypothesis({
    structure_type: 'conditional_forward_impulse',
    wave3_complete: true,
    pivots: primaryHypothesis().pivots.map((point) => (
      point.id === 'p3'
        ? { ...point, point_status: 'projected' }
        : point
    ))
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.equal(result.lifecycle_status, 'projection');
  assert.equal(result.classification, 'invalid_diagnostic');
  assert.ok(result.violations.some((item) => item.id === 'projected_point_marked_complete'));
});

test('scoreHewHypothesis hard-fails projected impulses that breach the Wave 1 origin', () => {
  const bad = primaryHypothesis({
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
  });

  const result = scoreHewHypothesis(bad);

  assert.equal(result.status, 'fail');
  assert.equal(result.lifecycle_status, 'projection');
  assert.equal(result.classification, 'invalid_diagnostic');
  assert.ok(result.violations.some((item) => item.id === 'wave2_breaches_wave1_origin'));
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
