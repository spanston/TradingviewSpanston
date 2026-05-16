function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pctMove(from, to) {
  if (!Number.isFinite(from) || from === 0 || !Number.isFinite(to)) return Infinity;
  return Math.abs((to - from) / from) * 100;
}

function round(value, places = 4) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function isMoreExtreme(candidate, existing) {
  if (candidate.type === 'high') return candidate.price > existing.price;
  return candidate.price < existing.price;
}

function normalizePivotType(type) {
  return type === 'swing_high' ? 'high' : type === 'swing_low' ? 'low' : type;
}

export function detectSwingPivots(bars, options = {}) {
  const left = Math.max(1, Number(options.left ?? 2));
  const right = Math.max(1, Number(options.right ?? 2));
  const minMovePct = Number(options.minMovePct ?? 0);
  const candidates = [];

  for (let index = left; index < bars.length - right; index += 1) {
    const bar = bars[index];
    const high = number(bar?.high);
    const low = number(bar?.low);
    if (high == null || low == null) continue;

    const before = bars.slice(index - left, index);
    const after = bars.slice(index + 1, index + right + 1);
    const isHigh = before.every((item) => high >= number(item?.high)) && after.every((item) => high >= number(item?.high));
    const isLow = before.every((item) => low <= number(item?.low)) && after.every((item) => low <= number(item?.low));

    if (isHigh) {
      candidates.push({ id: `p${index}`, index, time: bar.time, type: 'high', price: high });
    }
    if (isLow) {
      candidates.push({ id: `p${index}`, index, time: bar.time, type: 'low', price: low });
    }
  }

  candidates.sort((a, b) => a.index - b.index || (a.type === 'high' ? -1 : 1));

  const pivots = [];
  for (const candidate of candidates) {
    const last = pivots[pivots.length - 1];
    if (!last) {
      pivots.push(candidate);
      continue;
    }

    if (candidate.type === last.type) {
      if (isMoreExtreme(candidate, last)) pivots[pivots.length - 1] = candidate;
      continue;
    }

    if (pctMove(last.price, candidate.price) < minMovePct) continue;
    pivots.push(candidate);
  }

  return pivots.map((pivot, index) => ({ ...pivot, id: pivot.id || `p${index}` }));
}

function alternating(pivots) {
  for (let index = 1; index < pivots.length; index += 1) {
    if (normalizePivotType(pivots[index].type) === normalizePivotType(pivots[index - 1].type)) return false;
  }
  return true;
}

function impulseCandidate(pivots, options) {
  const [p0, p1, p2, p3, p4, p5] = pivots;
  const direction = p1.price > p0.price ? 'bullish' : 'bearish';
  const wave1 = Math.abs(p1.price - p0.price);
  const wave3 = Math.abs(p3.price - p2.price);
  const wave5 = Math.abs(p5.price - p4.price);
  const wave3Ratio = round(wave3 / wave1);
  const invalidReasons = [];

  if (wave3Ratio < options.wave3Floor) invalidReasons.push('wave3_below_hew_floor');
  if (direction === 'bullish' && p2.price <= p0.price) invalidReasons.push('wave2_breaks_origin');
  if (direction === 'bearish' && p2.price >= p0.price) invalidReasons.push('wave2_breaks_origin');
  if (direction === 'bullish' && p4.price <= p2.price) invalidReasons.push('wave4_breaks_wave2');
  if (direction === 'bearish' && p4.price >= p2.price) invalidReasons.push('wave4_breaks_wave2');

  const valid = invalidReasons.length === 0;
  return {
    id: `${p0.id || p0.index}_${p5.id || p5.index}`,
    direction,
    pivots,
    valid,
    invalid_reasons: invalidReasons,
    lengths: {
      wave1: round(wave1),
      wave3: round(wave3),
      wave5: round(wave5)
    },
    ratios: {
      wave3_vs_wave1: wave3Ratio,
      wave5_vs_wave1: round(wave5 / wave1)
    },
    rules: {
      wave3_floor: {
        status: wave3Ratio >= options.wave3Floor ? 'pass' : 'fail',
        required: options.wave3Floor,
        actual: wave3Ratio
      }
    },
    score: (valid ? 100 : 0) + wave3Ratio
  };
}

export function rankHewImpulseCandidates(pivots, options = {}) {
  const settings = { wave3Floor: Number(options.wave3Floor ?? 1.764) };
  const candidates = [];
  for (let index = 0; index <= pivots.length - 6; index += 1) {
    const window = pivots.slice(index, index + 6).map((pivot) => ({
      ...pivot,
      type: normalizePivotType(pivot.type)
    }));
    if (!alternating(window)) continue;
    candidates.push(impulseCandidate(window, settings));
  }

  return candidates.sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score || a.pivots[0].index - b.pivots[0].index);
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

function touches(values, level, tolerancePct) {
  return values.filter((value) => pctMove(level, value) <= tolerancePct).length;
}

function containmentRatio(bars, support, resistance, tolerancePct) {
  const lower = support * (1 - tolerancePct / 100);
  const upper = resistance * (1 + tolerancePct / 100);
  const contained = bars.filter((bar) => {
    const close = number(bar?.close);
    return close != null && close >= lower && close <= upper;
  }).length;
  return bars.length ? contained / bars.length : 0;
}

function springCandidates(bars, support, tolerancePct) {
  const breakLevel = support * (1 - tolerancePct / 100);
  const events = [];
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const low = number(bar?.low);
    const close = number(bar?.close);
    if (low == null || close == null || low >= breakLevel || close < support) continue;
    const reactionBars = bars.slice(index + 1, index + 4);
    const confirmed = reactionBars.some((item) => number(item?.close) >= support || number(item?.high) >= support * (1 + tolerancePct / 100));
    events.push({
      type: 'spring',
      index,
      time: bar.time,
      low,
      close,
      reaction: confirmed ? 'confirmed' : 'unconfirmed'
    });
  }
  return events;
}

export function detectWyckoffRanges(bars, options = {}) {
  const pivots = options.pivots || detectSwingPivots(bars, options);
  const minTouchesPerSide = Number(options.minTouchesPerSide ?? 2);
  const maxRangeHeightPct = Number(options.maxRangeHeightPct ?? 20);
  const boundaryTolerancePct = Number(options.boundaryTolerancePct ?? 2);

  const lows = pivots.filter((pivot) => normalizePivotType(pivot.type) === 'low').map((pivot) => pivot.price);
  const highs = pivots.filter((pivot) => normalizePivotType(pivot.type) === 'high').map((pivot) => pivot.price);
  if (lows.length < minTouchesPerSide || highs.length < minTouchesPerSide) return [];

  const support = median(lows);
  const resistance = median(highs);
  if (support == null || resistance == null || support >= resistance) return [];

  const rangeHeightPct = ((resistance - support) / support) * 100;
  if (rangeHeightPct > maxRangeHeightPct) return [];

  const supportTouches = touches(lows, support, boundaryTolerancePct);
  const resistanceTouches = touches(highs, resistance, boundaryTolerancePct);
  if (supportTouches < minTouchesPerSide || resistanceTouches < minTouchesPerSide) return [];

  if (containmentRatio(bars, support, resistance, boundaryTolerancePct) < 0.7) return [];

  return [{
    id: 'range_0',
    source: 'strict_multi_swing_range',
    support: round(support),
    resistance: round(resistance),
    range_height_pct: round(rangeHeightPct),
    touches: {
      support: supportTouches,
      resistance: resistanceTouches
    },
    event_candidates: springCandidates(bars, support, boundaryTolerancePct)
  }];
}
