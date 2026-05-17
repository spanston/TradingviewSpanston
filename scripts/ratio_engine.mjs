const DEFAULT_TOLERANCES = {
  exact_ratio: 0.015,
  wave5_ratio: 0.04,
  triple_confluence_pct: 0.02,
  wave4_b3_proximity_pct: 0.03
};

export const DEFAULT_COPSEY_RATIO_UNIVERSE = {
  ratio_unit: 'decimal',
  tolerances: DEFAULT_TOLERANCES,
  wave3_projection: {
    minimum: 1.764,
    rare_exception_range: { min: 1.72, max: 1.764 },
    clusters: [
      { id: 'model_1_1764_2146', min: 1.764, max: 2.146 },
      { id: 'model_2_2236_2414', min: 2.236, max: 2.414 },
      { id: 'model_3_3144_3236', min: 3.144, max: 3.236 }
    ]
  },
  wave_c_projection: {
    ratios: [0.618, 0.667, 0.764, 0.854, 0.91, 0.944, 0.987, 1.0, 1.021, 1.056, 1.09, 1.092, 1.144, 1.146, 1.236, 1.382, 1.414, 1.444, 1.5, 1.586, 1.618, 1.764, 1.854, 2.0, 2.236]
  },
  wave5_projection: {
    ratios: [0.3, 0.333, 0.382, 0.414, 0.5, 0.586, 0.618, 0.667, 0.764, 0.854]
  },
  retracement: {
    ratios: [0.236, 0.333, 0.382, 0.414, 0.5, 0.586, 0.618, 0.667, 0.764, 0.854, 0.91, 0.944, 0.987]
  },
  alternation_sum: {
    trending: { min: 0.8, max: 1.0 },
    corrective: { min: 1.0, max: 1.2 }
  }
};

export const RATIO_MODELS = {
  model_1_standard: {
    id: 'model_1_standard',
    name: 'Standard Five Waves',
    wave3: { min: 1.764, max: 2.146 },
    waveAOf3OfWave1: [1.092, 1.144, 1.236],
    waveBOf3OfWave1: [0.667, 0.618, 0.5],
    waveBOf3OfWaveAOf3: [0.618, 0.667, 0.764],
    waveCOf3OfWave1: [1.764, 2.0, 2.146],
    waveCOf3OfWaveAOf3: [1.236, 1.382, 1.764],
    wave4OfWave1: [1.236, 1.382],
    wave4OfWave3: [0.236, 0.333],
    wave5OfWave1: [2.144, 2.236],
    wave5OfWaves1And3: [0.5, 0.618, 0.667]
  },
  model_2_extended: {
    id: 'model_2_extended',
    name: 'Extended Five Waves',
    wave3: { min: 2.236, max: 2.414 },
    waveAOf3OfWave1: [1.236],
    waveBOf3OfWave1: [1.0],
    waveBOf3OfWaveAOf3: [0.236],
    waveCOf3OfWave1: [2.236, 2.414],
    waveCOf3OfWaveAOf3: [1.144],
    wave4OfWave1: [1.444],
    wave4OfWave3: [0.382, 0.414],
    wave5OfWave1: [2.854],
    wave5OfWaves1And3: [0.5]
  },
  model_3_super_extended: {
    id: 'model_3_super_extended',
    name: 'Super Extended Five Waves',
    wave3: { min: 3.144, max: 3.236 },
    waveAOf3OfWave1: [1.764],
    waveBOf3OfWave1: [0.764, 0.618],
    waveBOf3OfWaveAOf3: [0.618, 0.667, 0.764],
    waveCOf3OfWave1: [3.144, 3.236],
    waveCOf3OfWaveAOf3: [1.236, 1.382, 1.764],
    wave4OfWave1: [1.764, 2.0, 2.236],
    wave4OfWave3: [0.236, 0.414, 0.441],
    wave5OfWave1: [3.764],
    wave5OfWaves1And3: [0.44, 0.5, 0.618]
  }
};

export function length(a, b) {
  return Math.abs(Number(b?.price) - Number(a?.price));
}

export function bullishProjection(start, measuredLength, ratio) {
  return Number(start?.price) + Number(measuredLength) * Number(ratio);
}

export function bearishProjection(start, measuredLength, ratio) {
  return Number(start?.price) - Number(measuredLength) * Number(ratio);
}

export function projectionRatio(projectedMove, baseMove) {
  if (!baseMove) return null;
  return Math.abs(projectedMove) / Math.abs(baseMove);
}

export function retracementRatio(correctionMove, priorMove) {
  if (!priorMove) return null;
  return Math.abs(correctionMove) / Math.abs(priorMove);
}

export function classifyRatioModel({ wave3Ratio } = {}) {
  const ratio = number(wave3Ratio);
  if (ratio == null) return null;
  const epsilon = 1e-12;
  if (ratio >= 3.144 - epsilon) return RATIO_MODELS.model_3_super_extended;
  if (ratio >= 2.236 - epsilon) return RATIO_MODELS.model_2_extended;
  if (ratio >= 1.764 - epsilon) return RATIO_MODELS.model_1_standard;
  return null;
}

export function validateBullishRules(points = {}) {
  const errors = [];
  const wave1Origin = number(points.w1_origin?.price);
  const wave1 = number(points.w1?.price);
  const wave2 = number(points.w2?.price);
  const wave3 = number(points.w3?.price);
  const bOf3 = number(points.b_of_3?.price);
  const wave4 = number(points.w4?.price);
  const bOf5 = number(points.b_of_5?.price);

  if (wave2 != null && wave1Origin != null && wave2 <= wave1Origin) {
    errors.push('wave2_breaks_wave1_origin');
  }

  if (wave3 != null && wave1 != null && wave3 <= wave1) {
    errors.push('wave3_does_not_exceed_wave1');
  }

  if (bOf3 != null && wave2 != null && bOf3 <= wave2) {
    errors.push('b_of_3_breaks_wave2');
  }

  if (wave4 != null && bOf3 != null && wave4 <= bOf3) {
    errors.push('wave4_breaks_b_of_wave3');
  }

  if (bOf5 != null && wave4 != null && bOf5 <= wave4) {
    errors.push('b_of_5_breaks_wave4');
  }

  return errors;
}

export function validateBearishRules(points = {}) {
  const errors = [];
  const wave1Origin = number(points.w1_origin?.price);
  const wave1 = number(points.w1?.price);
  const wave2 = number(points.w2?.price);
  const wave3 = number(points.w3?.price);
  const bOf3 = number(points.b_of_3?.price);
  const wave4 = number(points.w4?.price);
  const bOf5 = number(points.b_of_5?.price);

  if (wave2 != null && wave1Origin != null && wave2 >= wave1Origin) {
    errors.push('wave2_breaks_wave1_origin');
  }

  if (wave3 != null && wave1 != null && wave3 >= wave1) {
    errors.push('wave3_does_not_exceed_wave1');
  }

  if (bOf3 != null && wave2 != null && bOf3 >= wave2) {
    errors.push('b_of_3_breaks_wave2');
  }

  if (wave4 != null && bOf3 != null && wave4 >= bOf3) {
    errors.push('wave4_breaks_b_of_wave3');
  }

  if (bOf5 != null && wave4 != null && bOf5 >= wave4) {
    errors.push('b_of_5_breaks_wave4');
  }

  return errors;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function round(value, places = 4) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function mergeRatioUniverse(config = {}) {
  return {
    ...DEFAULT_COPSEY_RATIO_UNIVERSE,
    ...config,
    tolerances: {
      ...DEFAULT_TOLERANCES,
      ...(config.tolerances || {})
    },
    wave3_projection: {
      ...DEFAULT_COPSEY_RATIO_UNIVERSE.wave3_projection,
      ...(config.wave3_projection || {})
    },
    wave_c_projection: {
      ...DEFAULT_COPSEY_RATIO_UNIVERSE.wave_c_projection,
      ...(config.wave_c_projection || {})
    },
    wave5_projection: {
      ...DEFAULT_COPSEY_RATIO_UNIVERSE.wave5_projection,
      ...(config.wave5_projection || {})
    },
    retracement: {
      ...DEFAULT_COPSEY_RATIO_UNIVERSE.retracement,
      ...(config.retracement || {})
    },
    alternation_sum: {
      ...DEFAULT_COPSEY_RATIO_UNIVERSE.alternation_sum,
      ...(config.alternation_sum || {})
    }
  };
}

function pointMap(hypothesis) {
  const map = new Map();
  for (const point of Array.isArray(hypothesis?.pivots) ? hypothesis.pivots : []) {
    if (point?.id) map.set(point.id, point);
  }
  return map;
}

function pointFromRef(ref, points) {
  if (!ref || typeof ref === 'number' || typeof ref === 'object') return null;
  return points.get(ref) || null;
}

function pointIsProjected(point) {
  if (!point || typeof point !== 'object') return false;
  const fields = [
    point.point_status,
    point.status,
    point.lifecycle,
    point.role,
    point.date
  ].map(normalizedToken);
  return fields.some((field) => (
    field === 'projected'
    || field === 'projection'
    || field === 'conditional'
    || field === 'scenario'
    || field.includes('projection')
  ));
}

function inferLifecycle(hypothesis) {
  const explicit = normalizedToken(hypothesis?.lifecycle || hypothesis?.count_lifecycle || hypothesis?.wave_lifecycle);
  if (['active', 'completed', 'projection', 'rejected', 'diagnostic', 'watch'].includes(explicit)) return explicit;

  const selectionRole = normalizedToken(hypothesis?.selection_role);
  const structureType = normalizedToken(hypothesis?.structure_type);
  if (selectionRole === 'rejected' || structureType.includes('rejected')) return 'rejected';
  if (selectionRole === 'watch' || structureType.includes('watch')) return 'watch';
  if (structureType.includes('conditional') || structureType.includes('projection')) return 'projection';
  if (structureType.includes('completed')) return 'completed';
  if (structureType.includes('active')) return 'active';
  return 'diagnostic';
}

function classifyHypothesis(status, lifecycle) {
  if (status === 'fail' || lifecycle === 'rejected' || lifecycle === 'diagnostic') return 'invalid_diagnostic';
  if (lifecycle === 'projection') return 'valid_projection';
  if (lifecycle === 'watch') return 'watch_context';
  return 'valid_active';
}

function priceFromRef(ref, points) {
  if (typeof ref === 'number') return ref;
  if (ref && typeof ref === 'object' && typeof ref.price === 'number') return ref.price;
  const point = points.get(ref);
  return number(point?.price);
}

function pricesFromKeys(keys, measurement, points) {
  const values = {};
  const refs = measurement.points || {};
  for (const key of keys) {
    const price = priceFromRef(refs[key] ?? measurement[key], points);
    if (price == null) return null;
    values[key] = price;
  }
  return values;
}

function absoluteRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return Math.abs(numerator) / Math.abs(denominator);
}

function within(value, range, tolerance = 0) {
  const epsilon = 1e-12;
  return value >= range.min - tolerance - epsilon && value <= range.max + tolerance + epsilon;
}

function wave3RareExceptionDocumented(measurement) {
  if (measurement?.allow_rare_exception === true || measurement?.rare_exception === true) return true;
  const status = normalizedToken(measurement?.exception?.status || measurement?.rare_exception_status);
  return status === 'accepted' || status === 'documented' || status === 'rare_exception_downgraded';
}

function nearestAllowedRatio(value, ratios, tolerance) {
  let nearest = null;
  for (const ratio of ratios || []) {
    const distance = Math.abs(value - ratio);
    if (!nearest || distance < nearest.distance) nearest = { ratio, distance };
  }
  if (!nearest || nearest.distance > tolerance) return null;
  return nearest;
}

function nearestClusterAnchor(value, cluster) {
  const anchors = [
    { label: 'min', value: cluster.min },
    { label: 'mid', value: (cluster.min + cluster.max) / 2 },
    { label: 'max', value: cluster.max }
  ].filter((anchor) => Number.isFinite(anchor.value));
  let nearest = null;
  for (const anchor of anchors) {
    const distance = Math.abs(value - anchor.value);
    if (!nearest || distance < nearest.distance) nearest = { ...anchor, distance };
  }
  return nearest;
}

function violation(id, severity, measurement, message, extra = {}) {
  return {
    id,
    severity,
    measurement_id: measurement.id,
    message,
    ...extra
  };
}

function structuralFailure(id, message, extra = {}) {
  const measurement = { id, type: 'structure_rule' };
  const item = violation(id, 'hard', measurement, message, extra);
  return { result: failResult(measurement, null, item), violations: [item] };
}

function passResult(measurement, actual, extra = {}) {
  return {
    id: measurement.id,
    type: measurement.type,
    status: 'pass',
    score: 100,
    actual_ratio: round(actual),
    ...extra
  };
}

function failResult(measurement, actual, item) {
  return {
    id: measurement.id,
    type: measurement.type,
    status: item.severity === 'hard' ? 'fail' : 'warning',
    score: item.severity === 'hard' ? 0 : 40,
    actual_ratio: round(actual),
    violation_id: item.id
  };
}

function evaluateWave3(measurement, points, config) {
  const prices = pricesFromKeys(['wave1_start', 'wave1_end', 'wave2_end', 'wave3_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave 3 projection requires wave1_start, wave1_end, wave2_end, and wave3_end.')] };

  const actual = absoluteRatio(prices.wave3_end - prices.wave2_end, prices.wave1_end - prices.wave1_start);
  const rule = config.wave3_projection;
  const matchedCluster = (rule.clusters || []).find((cluster) => within(actual, cluster));
  if (matchedCluster) {
    const anchor = nearestClusterAnchor(actual, matchedCluster);
    const model = classifyRatioModel({ wave3Ratio: actual });
    return {
      result: passResult(measurement, actual, {
        matched_cluster: matchedCluster.id,
        nearest_anchor: anchor ? round(anchor.value) : null,
        anchor_position: anchor ? anchor.label : null,
        anchor_distance: anchor ? round(anchor.distance) : null,
        ratio_model: model?.id ?? null
      }),
      violations: []
    };
  }

  if (within(actual, rule.rare_exception_range || {}, 0)) {
    const documented = wave3RareExceptionDocumented(measurement);
    const item = documented
      ? violation('wave3_rare_exception_range', 'soft', measurement, 'Wave 3 is in Copsey rare exception range below 176.4%.', { actual_ratio: round(actual) })
      : violation('wave3_below_1764_floor', 'hard', measurement, 'Wave 3 is below the Copsey 176.4% floor without a documented rare exception.', { actual_ratio: round(actual) });
    return {
      result: documented
        ? {
            id: measurement.id,
            type: measurement.type,
            status: 'warning',
            score: 75,
            actual_ratio: round(actual),
            violation_id: item.id,
            ratio_model: null
          }
        : failResult(measurement, actual, item),
      violations: [item]
    };
  }

  const item = violation('wave3_outside_copsey_clusters', 'hard', measurement, 'Wave 3 projection is outside Copsey allowed clusters.', { actual_ratio: round(actual) });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function evaluateWaveC(measurement, points, config) {
  const prices = pricesFromKeys(['wave_a_start', 'wave_a_end', 'wave_b_end', 'wave_c_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave C projection requires wave_a_start, wave_a_end, wave_b_end, and wave_c_end.')] };

  const actual = absoluteRatio(prices.wave_c_end - prices.wave_b_end, prices.wave_a_end - prices.wave_a_start);
  const nearest = nearestAllowedRatio(actual, config.wave_c_projection.ratios, config.tolerances.exact_ratio);
  if (nearest) return { result: passResult(measurement, actual, { matched_ratio: nearest.ratio }), violations: [] };

  const item = violation('wave_c_ratio_not_in_copsey_universe', 'hard', measurement, 'Wave C projection is not in Copsey allowed ratio universe.', { actual_ratio: round(actual) });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function evaluateCOf3Strength(measurement, points) {
  const prices = pricesFromKeys(['wave_a_start', 'wave_a_end', 'wave_b_end', 'wave_c_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'C of 3 strength check requires wave_a_start, wave_a_end, wave_b_end, and wave_c_end.')] };

  const waveA = Math.abs(prices.wave_a_end - prices.wave_a_start);
  const waveC = Math.abs(prices.wave_c_end - prices.wave_b_end);
  const actual = projectionRatio(waveC, waveA);
  if (actual >= 1) {
    return {
      result: passResult(measurement, actual, {
        wave_a_length: round(waveA),
        wave_c_length: round(waveC)
      }),
      violations: []
    };
  }

  const item = violation('c_of_3_shorter_than_a_of_3', 'hard', measurement, 'Wave C of 3 is shorter than Wave A of 3; the alleged heart of the trend is structurally weak.', {
    actual_ratio: round(actual),
    wave_a_length: round(waveA),
    wave_c_length: round(waveC)
  });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function evaluateWave5(measurement, points, config) {
  const prices = pricesFromKeys(['wave1_start', 'wave3_end', 'wave4_end', 'wave5_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave 5 projection requires wave1_start, wave3_end, wave4_end, and wave5_end.')] };

  const actual = absoluteRatio(prices.wave5_end - prices.wave4_end, prices.wave3_end - prices.wave1_start);
  const nearest = nearestAllowedRatio(actual, config.wave5_projection.ratios, config.tolerances.wave5_ratio);
  if (nearest) return { result: passResult(measurement, actual, { matched_ratio: nearest.ratio }), violations: [] };

  const maxRatio = Math.max(...(config.wave5_projection.ratios || []).filter(Number.isFinite));
  if (Number.isFinite(maxRatio) && actual > maxRatio + config.tolerances.wave5_ratio) {
    const item = violation('extended_wave5_rejected_by_copsey', 'hard', measurement, 'Wave 5 exceeds the Copsey Wave 5 universe and is treated as a forbidden extended-fifth rescue.', { actual_ratio: round(actual), max_allowed_ratio: maxRatio });
    return { result: failResult(measurement, actual, item), violations: [item] };
  }

  const item = violation('wave5_ratio_not_in_copsey_universe', 'soft', measurement, 'Wave 5 projection missed Copsey ratio universe.', { actual_ratio: round(actual) });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function evaluateProjectionCompleteness(hypothesis, points) {
  const measurements = Array.isArray(hypothesis?.measurements) ? hypothesis.measurements : [];
  const lifecycle = inferLifecycle(hypothesis);
  const claimsWave3Complete = hypothesis?.wave_iii_complete === true || hypothesis?.wave3_complete === true;
  const claimsCompletedImpulse = lifecycle === 'completed' || normalizedToken(hypothesis?.structure_type).includes('completed');

  if (claimsWave3Complete) {
    for (const measurement of measurements) {
      if ((measurement?.type || measurement?.kind) !== 'wave3_projection') continue;
      const wave3Point = pointFromRef(measurement.points?.wave3_end ?? measurement.wave3_end, points);
      if (lifecycle === 'projection' || pointIsProjected(wave3Point)) {
        return structuralFailure(
          'projected_point_marked_complete',
          'A conditional/projected Wave 3 cannot be marked complete.',
          { lifecycle, wave3_point: wave3Point?.id || null }
        );
      }
    }
  }

  if (claimsCompletedImpulse) {
    for (const measurement of measurements) {
      const refs = Object.values(measurement?.points || {});
      const projectedRef = refs.find((ref) => pointIsProjected(pointFromRef(ref, points)));
      if (projectedRef) {
        return structuralFailure(
          'projected_point_marked_complete',
          'A completed impulse cannot contain conditional/projected pivot points.',
          { lifecycle, pivot_ref: projectedRef }
        );
      }
    }
  }

  return null;
}

function evaluateImpulseTopology(hypothesis, points) {
  const measurements = Array.isArray(hypothesis?.measurements) ? hypothesis.measurements : [];
  const wave3 = measurements.find((measurement) => (measurement?.type || measurement?.kind) === 'wave3_projection');
  const wave5 = measurements.find((measurement) => (measurement?.type || measurement?.kind) === 'wave5_projection');
  if (!wave3 || !wave5) return null;

  const wave3Prices = pricesFromKeys(['wave1_start', 'wave1_end', 'wave2_end', 'wave3_end'], wave3, points);
  const wave5Prices = pricesFromKeys(['wave4_end', 'wave5_end'], wave5, points);
  if (!wave3Prices || !wave5Prices) return null;

  const direction = normalizedToken(hypothesis?.direction) || (wave3Prices.wave1_end >= wave3Prices.wave1_start ? 'bullish' : 'bearish');
  const bullish = direction !== 'bearish';
  const wave1MovesCorrectly = bullish
    ? wave3Prices.wave1_end > wave3Prices.wave1_start
    : wave3Prices.wave1_end < wave3Prices.wave1_start;
  const wave3MovesCorrectly = bullish
    ? wave3Prices.wave3_end > wave3Prices.wave2_end
    : wave3Prices.wave3_end < wave3Prices.wave2_end;
  const wave5MovesCorrectly = bullish
    ? wave5Prices.wave5_end > wave5Prices.wave4_end
    : wave5Prices.wave5_end < wave5Prices.wave4_end;
  if (!wave1MovesCorrectly || !wave3MovesCorrectly || !wave5MovesCorrectly) {
    return structuralFailure(
      'motive_direction_mismatch',
      'Motive wave endpoints move against the declared hypothesis direction.',
      {
        direction,
        wave1_start: round(wave3Prices.wave1_start),
        wave1_end: round(wave3Prices.wave1_end),
        wave3_end: round(wave3Prices.wave3_end),
        wave4_end: round(wave5Prices.wave4_end),
        wave5_end: round(wave5Prices.wave5_end)
      }
    );
  }

  const wave2BreachesOrigin = bullish
    ? wave3Prices.wave2_end <= wave3Prices.wave1_start
    : wave3Prices.wave2_end >= wave3Prices.wave1_start;
  if (wave2BreachesOrigin) {
    return structuralFailure(
      'wave2_breaches_wave1_origin',
      'R.N. Elliott rule 1 failed: Wave 2 must not breach or retest the Wave 1 origin.',
      {
        direction,
        wave1_origin: round(wave3Prices.wave1_start),
        wave2_end: round(wave3Prices.wave2_end)
      }
    );
  }

  const wave4OverlapsWave1 = bullish
    ? wave5Prices.wave4_end <= wave3Prices.wave1_end
    : wave5Prices.wave4_end >= wave3Prices.wave1_end;
  if (wave4OverlapsWave1) {
    return structuralFailure(
      'wave1_wave4_overlap',
      'R.N. Elliott rule 3 failed: Wave 4 overlaps Wave 1 price territory.',
      {
        direction,
        wave1_boundary: round(wave3Prices.wave1_end),
        wave4_end: round(wave5Prices.wave4_end)
      }
    );
  }

  const wave1Length = Math.abs(wave3Prices.wave1_end - wave3Prices.wave1_start);
  const wave3Length = Math.abs(wave3Prices.wave3_end - wave3Prices.wave2_end);
  const wave5Length = Math.abs(wave5Prices.wave5_end - wave5Prices.wave4_end);
  if (wave3Length < wave1Length && wave3Length < wave5Length) {
    return structuralFailure(
      'wave3_is_shortest',
      'R.N. Elliott rule 2 failed: Wave 3 is the shortest motive wave.',
      {
        direction,
        wave1: round(wave1Length),
        wave3: round(wave3Length),
        wave5: round(wave5Length)
      }
    );
  }

  const failedFifth = bullish
    ? wave5Prices.wave5_end <= wave3Prices.wave3_end
    : wave5Prices.wave5_end >= wave3Prices.wave3_end;
  if (failedFifth) {
    return structuralFailure(
      'failed_fifth_forbidden',
      'Wave 5 fails to exceed Wave 3; HEW/Copsey rules forbid failed-fifth rescue counts.',
      {
        direction,
        wave3_end: round(wave3Prices.wave3_end),
        wave5_end: round(wave5Prices.wave5_end)
      }
    );
  }

  return null;
}

function evaluateRetracement(measurement, points, config) {
  const prices = pricesFromKeys(['prior_start', 'prior_end', 'retracement_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Retracement requires prior_start, prior_end, and retracement_end.')] };

  const actual = absoluteRatio(prices.retracement_end - prices.prior_end, prices.prior_end - prices.prior_start);
  const nearest = nearestAllowedRatio(actual, config.retracement.ratios, config.tolerances.exact_ratio);
  if (nearest) return { result: passResult(measurement, actual, { matched_ratio: nearest.ratio }), violations: [] };

  const item = violation('retracement_ratio_not_in_copsey_universe', 'hard', measurement, 'Retracement is outside Copsey retracement universe.', { actual_ratio: round(actual) });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function evaluateAlternation(measurement, points, config) {
  const prices = pricesFromKeys(['wave1_start', 'wave1_end', 'wave2_end', 'wave3_end', 'wave4_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Alternation requires wave1_start, wave1_end, wave2_end, wave3_end, and wave4_end.')] };

  const wave2 = absoluteRatio(prices.wave2_end - prices.wave1_end, prices.wave1_end - prices.wave1_start);
  const wave4 = absoluteRatio(prices.wave4_end - prices.wave3_end, prices.wave3_end - prices.wave2_end);
  const actual = wave2 + wave4;
  const context = measurement.trend_context || measurement.context || 'trending';
  const band = config.alternation_sum[context] || config.alternation_sum.trending;
  if (within(actual, band)) {
    return { result: passResult(measurement, actual, { wave2_retracement: round(wave2), wave4_retracement: round(wave4), context }), violations: [] };
  }

  const item = violation('alternation_sum_outside_context_band', 'soft', measurement, 'Wave 2 + Wave 4 alternation sum is outside the Copsey context band.', { actual_ratio: round(actual), context });
  return { result: failResult(measurement, actual, item), violations: [item] };
}

function projectionTargetFromPivots(target, points) {
  if (typeof target === 'number' || typeof target === 'string') return { error: 'triple confluence targets must be pivot-derived projection objects, not raw prices or pivot refs' };
  if (!target || typeof target !== 'object') return { error: 'triple confluence target must be an object' };

  const refs = target.points || {};
  const start = priceFromRef(refs.start ?? refs.base_start ?? target.start ?? target.base_start, points);
  const end = priceFromRef(refs.end ?? refs.base_end ?? target.end ?? target.base_end, points);
  const anchor = priceFromRef(refs.anchor ?? refs.projection_start ?? target.anchor ?? target.projection_start, points);
  const ratio = number(target.ratio);
  if (start == null || end == null || anchor == null || ratio == null) {
    return { error: 'triple confluence target requires start, end, anchor, and ratio pivot inputs' };
  }

  const direction = String(target.direction || '').toLowerCase();
  const signedMove = end - start;
  const sign = direction === 'bearish' ? -1 : direction === 'bullish' ? 1 : Math.sign(signedMove) || 1;
  return {
    price: anchor + Math.abs(signedMove) * ratio * sign,
    source: {
      id: target.id || null,
      start: refs.start ?? refs.base_start ?? target.start ?? target.base_start,
      end: refs.end ?? refs.base_end ?? target.end ?? target.base_end,
      anchor: refs.anchor ?? refs.projection_start ?? target.anchor ?? target.projection_start,
      ratio
    }
  };
}

function evaluateTripleConfluence(measurement, points, config) {
  const targetResults = (measurement.targets || []).map((target) => projectionTargetFromPivots(target, points));
  const targetErrors = targetResults.filter((target) => target.error);
  if (targetErrors.length) {
    const item = violation('triple_confluence_target_not_pivot_derived', 'hard', measurement, targetErrors[0].error);
    return { result: failResult(measurement, null, item), violations: [item] };
  }

  const targets = targetResults.map((target) => target.price).filter((target) => target != null);
  if (targets.length < 3) {
    return { result: failResult(measurement, null, { id: 'missing_targets', severity: 'hard' }), violations: [violation('missing_targets', 'hard', measurement, 'Triple confluence requires at least three projection targets.')] };
  }

  const mean = targets.reduce((sum, target) => sum + target, 0) / targets.length;
  const spread = Math.max(...targets) - Math.min(...targets);
  const spreadPct = Math.abs(mean) === 0 ? Infinity : spread / Math.abs(mean);
  const tolerance = number(measurement.tolerance_pct) ?? config.tolerances.triple_confluence_pct;
  if (spreadPct <= tolerance) {
    return {
      result: passResult(measurement, spreadPct, {
        spread_pct: round(spreadPct),
        tolerance_pct: tolerance,
        derived_targets: targetResults.map((target) => ({ ...target.source, price: round(target.price) }))
      }),
      violations: []
    };
  }

  const item = violation('triple_confluence_targets_diverge', 'soft', measurement, 'Copsey triple-confluence targets do not converge within tolerance.', { spread_pct: round(spreadPct), tolerance_pct: tolerance });
  return { result: failResult(measurement, spreadPct, item), violations: [item] };
}

function evaluateWave3NotShortest(measurement, points) {
  const prices = pricesFromKeys(['wave1_start', 'wave1_end', 'wave2_end', 'wave3_end', 'wave4_end', 'wave5_end'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave 3-not-shortest rule requires wave1_start, wave1_end, wave2_end, wave3_end, wave4_end, and wave5_end.')] };

  const wave1 = Math.abs(prices.wave1_end - prices.wave1_start);
  const wave3 = Math.abs(prices.wave3_end - prices.wave2_end);
  const wave5 = Math.abs(prices.wave5_end - prices.wave4_end);
  if (wave3 < wave1 && wave3 < wave5) {
    const item = violation('wave3_is_shortest', 'hard', measurement, 'R.N. Elliott rule 2 failed: Wave 3 is the shortest motive wave.', { wave1: round(wave1), wave3: round(wave3), wave5: round(wave5) });
    return { result: failResult(measurement, wave3, item), violations: [item] };
  }

  return { result: passResult(measurement, wave3, { wave1: round(wave1), wave3: round(wave3), wave5: round(wave5) }), violations: [] };
}

function evaluateWave1Wave4NonOverlap(measurement, points) {
  const prices = pricesFromKeys(['wave1_start', 'wave1_end', 'wave4_extreme'], measurement, points);
  if (!prices) return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave 1/Wave 4 non-overlap rule requires wave1_start, wave1_end, and wave4_extreme.')] };

  const direction = String(measurement.direction || '').toLowerCase() || (prices.wave1_end > prices.wave1_start ? 'bullish' : 'bearish');
  const wave1Boundary = direction === 'bearish'
    ? Math.min(prices.wave1_start, prices.wave1_end)
    : Math.max(prices.wave1_start, prices.wave1_end);
  const overlaps = direction === 'bearish'
    ? prices.wave4_extreme >= wave1Boundary
    : prices.wave4_extreme <= wave1Boundary;
  const distance = Math.abs(prices.wave4_extreme - wave1Boundary);
  if (overlaps) {
    const item = violation('wave1_wave4_overlap', 'hard', measurement, 'R.N. Elliott rule 3 failed: Wave 4 overlaps Wave 1 price territory.', { wave1_boundary: round(wave1Boundary), wave4_extreme: round(prices.wave4_extreme) });
    return { result: failResult(measurement, distance, item), violations: [item] };
  }

  return { result: passResult(measurement, distance, { wave1_boundary: round(wave1Boundary), wave4_extreme: round(prices.wave4_extreme) }), violations: [] };
}

function evaluateWave4B3Rule(measurement, points, config) {
  const wave4 = priceFromRef(measurement.points?.wave4_extreme ?? measurement.wave4_extreme, points);
  const bOf3 = priceFromRef(measurement.points?.b_of_3_extreme ?? measurement.b_of_3_extreme, points);
  if (wave4 == null || bOf3 == null) {
    return { result: failResult(measurement, null, { id: 'missing_points', severity: 'hard' }), violations: [violation('missing_points', 'hard', measurement, 'Wave IV / B-of-III rule requires wave4_extreme and b_of_3_extreme.')] };
  }

  const direction = String(measurement.direction || '').toLowerCase() || 'bullish';
  const breached = direction === 'bearish' ? wave4 >= bOf3 : wave4 <= bOf3;
  const distancePct = Math.abs(wave4 - bOf3) / Math.max(Math.abs(bOf3), 1);
  if (breached) {
    const item = violation('wave4_breaks_b_of_wave3', 'hard', measurement, 'Wave IV breaks the B of Wave III boundary.', { distance_pct: round(distancePct) });
    return { result: failResult(measurement, distancePct, item), violations: [item] };
  }

  const proximity = number(measurement.proximity_pct) ?? config.tolerances.wave4_b3_proximity_pct;
  if (distancePct < proximity) {
    const item = violation('wave4_too_close_to_b_of_wave3', 'soft', measurement, 'Wave IV is too close to the B of Wave III boundary.', { distance_pct: round(distancePct), proximity_pct: proximity });
    return {
      result: {
        id: measurement.id,
        type: measurement.type,
        status: 'warning',
        score: 70,
        actual_ratio: round(distancePct),
        violation_id: item.id
      },
      violations: [item]
    };
  }

  return { result: passResult(measurement, distancePct, { distance_pct: round(distancePct) }), violations: [] };
}

function evaluateMeasurement(measurement, points, config) {
  const type = measurement?.type || measurement?.kind;
  switch (type) {
    case 'wave3_projection':
      return evaluateWave3({ ...measurement, type }, points, config);
    case 'wave_c_projection':
      return evaluateWaveC({ ...measurement, type }, points, config);
    case 'c_of_3_strength_rule':
      return evaluateCOf3Strength({ ...measurement, type }, points);
    case 'wave5_projection':
      return evaluateWave5({ ...measurement, type }, points, config);
    case 'retracement':
      return evaluateRetracement({ ...measurement, type }, points, config);
    case 'alternation_sum':
      return evaluateAlternation({ ...measurement, type }, points, config);
    case 'triple_confluence':
      return evaluateTripleConfluence({ ...measurement, type }, points, config);
    case 'wave4_b3_rule':
      return evaluateWave4B3Rule({ ...measurement, type }, points, config);
    case 'wave3_not_shortest_rule':
      return evaluateWave3NotShortest({ ...measurement, type }, points);
    case 'wave1_wave4_non_overlap_rule':
      return evaluateWave1Wave4NonOverlap({ ...measurement, type }, points);
    default: {
      const fallback = { ...measurement, type: type || '<unknown>' };
      return {
        result: failResult(fallback, null, { id: 'unsupported_measurement_type', severity: 'hard' }),
        violations: [violation('unsupported_measurement_type', 'hard', fallback, `Unsupported ratio measurement type: ${type || '<missing>'}.`)]
      };
    }
  }
}

export function scoreHewHypothesis(hypothesis, ratioUniverse = {}) {
  const config = mergeRatioUniverse(ratioUniverse);
  const points = pointMap(hypothesis);
  const measurements = Array.isArray(hypothesis?.measurements) ? hypothesis.measurements : [];
  const results = [];
  const violations = [];
  const lifecycleStatus = inferLifecycle(hypothesis);

  if (!measurements.length) {
    violations.push({
      id: 'missing_measurements',
      severity: 'hard',
      message: 'Hypothesis has no ratio measurements.'
    });
  }

  for (const measurement of measurements) {
    if (!measurement || typeof measurement !== 'object') continue;
    const evaluated = evaluateMeasurement(measurement, points, config);
    results.push(evaluated.result);
    violations.push(...evaluated.violations);
  }

  for (const structuralCheck of [
    evaluateProjectionCompleteness(hypothesis, points),
    evaluateImpulseTopology(hypothesis, points)
  ]) {
    if (!structuralCheck) continue;
    results.push(structuralCheck.result);
    violations.push(...structuralCheck.violations);
  }

  const hardViolations = violations.filter((item) => item.severity === 'hard');
  const softViolations = violations.filter((item) => item.severity !== 'hard');
  const rawScore = results.length
    ? results.reduce((sum, item) => sum + item.score, 0) / results.length
    : 0;
  const score = round(Math.max(0, rawScore - softViolations.length * 3), 2);
  const status = hardViolations.length ? 'fail' : (softViolations.length ? 'pass_with_warnings' : 'pass');
  const wave3Ratio = results.find((item) => item.type === 'wave3_projection' && number(item.actual_ratio) != null)?.actual_ratio;
  const ratioModel = classifyRatioModel({ wave3Ratio });

  return {
    hypothesis_id: hypothesis?.id || '<unknown>',
    status,
    score,
    hard_rule_pass: hardViolations.length === 0,
    lifecycle_status: lifecycleStatus,
    classification: classifyHypothesis(status, lifecycleStatus),
    ratio_model: ratioModel?.id ?? null,
    measurements: results,
    violations
  };
}

export function scoreHewHypotheses(hypotheses, ratioUniverse = {}) {
  return (Array.isArray(hypotheses) ? hypotheses : []).map((hypothesis) => scoreHewHypothesis(hypothesis, ratioUniverse));
}
