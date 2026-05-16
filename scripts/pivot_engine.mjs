function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const KONSILI_PIVOT_EXPORTER = Object.freeze({
  name: 'Konsili Pivot Exporter',
  studyFilter: 'Konsili Pivot Exporter',
  pineScript: 'tradingview/konsili_pivot_exporter.pine',
  rowPrefix: 'KPE',
  version: 1,
  sourceTools: ['data_get_pine_tables', 'data_get_pine_labels']
});

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

function rowToText(row) {
  if (Array.isArray(row)) return row.map((value) => String(value ?? '')).join('|');
  if (row && typeof row === 'object') {
    return String(row.text ?? row.value ?? row.source_text ?? row.row ?? '');
  }
  return String(row ?? '');
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

export function normalizePivotExporterTimeframe(value) {
  const raw = String(value ?? '').trim();
  const normalized = raw.toLowerCase();
  if (raw === 'M' || raw === '1M' || normalized === 'monthly' || normalized === 'month') return 'monthly';
  if (raw === 'W' || raw === '1W' || normalized === 'weekly' || normalized === 'week') return 'weekly';
  if (raw === 'D' || raw === '1D' || normalized === 'daily' || normalized === 'day') return 'daily';
  if (raw === '240' || normalized === '4h' || normalized === '4hour' || normalized === '4hours') return '4h';
  if (raw === '60' || normalized === '1h' || normalized === '1hour' || normalized === '1hours') return '1h';
  return normalized;
}

export function parsePivotExporterRow(row, options = {}) {
  const prefix = options.rowPrefix || KONSILI_PIVOT_EXPORTER.rowPrefix;
  const rawText = rowToText(row).trim();
  const start = rawText.indexOf(`${prefix}|`);
  if (start < 0) {
    return { ok: false, error: `missing ${prefix} row prefix`, raw: rawText };
  }

  const exportText = rawText.slice(start);
  const tokens = exportText.split('|');
  if (tokens[0] !== prefix) return { ok: false, error: `invalid row prefix: ${tokens[0]}`, raw: exportText };

  const fields = {};
  for (const token of tokens.slice(1)) {
    const equalsAt = token.indexOf('=');
    if (equalsAt <= 0) continue;
    fields[token.slice(0, equalsAt)] = token.slice(equalsAt + 1);
  }

  const version = number(fields.v);
  const price = number(fields.price);
  const time = number(fields.time);
  const left = number(fields.left);
  const right = number(fields.right);
  const confirmed = parseBoolean(fields.confirmed);
  const type = normalizePivotType(fields.type);
  const errors = [];

  if (version !== Number(options.version ?? KONSILI_PIVOT_EXPORTER.version)) errors.push(`unsupported exporter version: ${fields.v}`);
  if (!String(fields.tf || '').trim()) errors.push('missing tf');
  if (!String(fields.id || '').trim()) errors.push('missing id');
  if (!['high', 'low'].includes(type)) errors.push(`invalid type: ${fields.type}`);
  if (price == null) errors.push(`invalid price: ${fields.price}`);
  if (time == null) errors.push(`invalid time: ${fields.time}`);
  if (left == null) errors.push(`invalid left: ${fields.left}`);
  if (right == null) errors.push(`invalid right: ${fields.right}`);
  if (confirmed !== true) errors.push(`confirmed must be true: ${fields.confirmed}`);

  if (errors.length) return { ok: false, error: errors.join('; '), raw: exportText };

  return {
    ok: true,
    pivot: {
      id: fields.id,
      timeframe: normalizePivotExporterTimeframe(fields.tf),
      raw_timeframe: fields.tf,
      type,
      price,
      time,
      left,
      right,
      confirmed,
      raw: exportText
    }
  };
}

export function parsePivotExporterRows(rows, options = {}) {
  const pivots = [];
  const errors = [];
  for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) {
    const result = parsePivotExporterRow(row, options);
    if (result.ok) {
      pivots.push(result.pivot);
    } else {
      errors.push(`row ${index}: ${result.error}`);
    }
  }
  return { pivots, errors };
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
