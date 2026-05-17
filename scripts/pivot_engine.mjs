function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const KONSILI_PIVOT_EXPORTER = Object.freeze({
  name: 'Konsili Pivot Exporter',
  studyFilter: 'Konsili Pivot Exporter',
  pineScript: 'tradingview/konsili_pivot_exporter.pine',
  rowPrefix: 'KPE',
  version: 2,
  sourceTools: ['data_get_pine_labels', 'data_get_pine_tables']
});

export const CANONICAL_MTF_TIMEFRAMES = Object.freeze(['monthly', 'weekly', 'daily']);

export const DEFAULT_PIVOT_INSTRUMENT_PROFILES = Object.freeze({
  single_stock: Object.freeze({ left: 5, right: 5, max_rows: 24 }),
  levered_equity: Object.freeze({ left: 5, right: 5, max_rows: 24 }),
  crypto: Object.freeze({ left: 7, right: 7, max_rows: 32 }),
  index_or_etf: Object.freeze({ left: 6, right: 6, max_rows: 24 })
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
  if (!String(fields.date || '').trim()) errors.push('missing date');
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
      version,
      id: fields.id,
      exporter_row_id: fields.id,
      timeframe: normalizePivotExporterTimeframe(fields.tf),
      raw_timeframe: fields.tf,
      type,
      date: fields.date,
      price,
      time,
      timezone: fields.timezone || null,
      left,
      right,
      confirmed,
      raw: exportText,
      source_text: exportText
    }
  };
}

export function parseKpeRow(row, options = {}) {
  const result = parsePivotExporterRow(row, options);
  return result.ok ? result.pivot : null;
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

function parseVisualLabelTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw} 00:00` : raw;
  const parsed = Date.parse(`${withTime.replace(' ', 'T')}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseVisualPivotLabelRow(row, options = {}) {
  const rawText = rowToText(row).trim();
  if (!rawText) return { ok: false, error: 'empty visual pivot label', raw: rawText };

  const kpeResult = parsePivotExporterRow(rawText, options);
  if (kpeResult.ok) {
    return {
      ok: true,
      pivot: {
        ...kpeResult.pivot,
        source_kind: 'kpe_label_fallback',
        source_text: rawText
      }
    };
  }

  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const marker = lines.find((line) => ['PH', 'PL'].includes(line.toUpperCase()));
  const date = lines.find((line) => /^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?$/.test(line));
  const labelPrice = number(row?.price);
  const textPrice = number(lines.find((line) => number(line.replace(/,/g, '')) != null)?.replace(/,/g, ''));
  const price = labelPrice ?? textPrice;
  const time = parseVisualLabelTime(date);
  const type = marker?.toUpperCase() === 'PH' ? 'high' : marker?.toUpperCase() === 'PL' ? 'low' : null;
  const timeframe = normalizePivotExporterTimeframe(options.timeframe ?? options.tf ?? row?.timeframe);
  const errors = [];

  if (!type) errors.push('missing PH/PL marker');
  if (!String(date || '').trim()) errors.push('missing visual pivot date');
  if (time == null) errors.push(`invalid visual pivot date: ${date ?? '<missing>'}`);
  if (price == null) errors.push('missing visual pivot price');
  if (!timeframe) errors.push('missing visual pivot timeframe');

  if (errors.length) return { ok: false, error: errors.join('; '), raw: rawText };

  const pivot = {
    version: options.version ?? KONSILI_PIVOT_EXPORTER.version,
    id: `${timeframe}_${time}_${type === 'high' ? 'PH' : 'PL'}`,
    exporter_row_id: null,
    timeframe,
    raw_timeframe: options.timeframe ?? options.tf ?? timeframe,
    type,
    date,
    price,
    time,
    timezone: options.timezone || null,
    left: number(options.left),
    right: number(options.right),
    confirmed: true,
    raw: rawText,
    source_text: rawText,
    source_kind: 'visual_price_extreme_label'
  };

  return { ok: true, pivot };
}

export function parseVisualPivotLabelRows(rows, options = {}) {
  const pivots = [];
  const errors = [];
  for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) {
    const result = parseVisualPivotLabelRow(row, options);
    if (result.ok) {
      pivots.push(result.pivot);
    } else {
      errors.push(`row ${index}: ${result.error}`);
    }
  }
  return { pivots, errors };
}

export function validatePivotProfile(pivot, profile = {}, options = {}) {
  if (!pivot || typeof pivot !== 'object') return false;

  const expectedVersion = number(options.version ?? profile.version ?? KONSILI_PIVOT_EXPORTER.version);
  const expectedLeft = number(profile.left ?? profile.left_bars);
  const expectedRight = number(profile.right ?? profile.right_bars);

  if (expectedVersion != null && number(pivot.version) !== expectedVersion) return false;
  if (pivot.confirmed !== true) return false;
  if (expectedLeft != null && number(pivot.left) !== expectedLeft) return false;
  if (expectedRight != null && number(pivot.right) !== expectedRight) return false;

  return true;
}

export function pivotProfileForInstrumentClass(instrumentClass, profiles = DEFAULT_PIVOT_INSTRUMENT_PROFILES) {
  return profiles[String(instrumentClass || '').trim()] || null;
}

export function verifyPivotAgainstOhlcv(pivot, ohlcvRow, tolerance = 0.000001) {
  if (!pivot || !ohlcvRow || typeof pivot !== 'object' || typeof ohlcvRow !== 'object') return false;

  const pivotPrice = number(pivot.price);
  const expected = pivot.type === 'high' ? number(ohlcvRow.high)
    : pivot.type === 'low' ? number(ohlcvRow.low)
      : null;
  const allowedDrift = Math.max(0, Number(tolerance));

  if (pivotPrice == null || expected == null || !Number.isFinite(allowedDrift)) return false;
  return Math.abs(pivotPrice - expected) <= allowedDrift;
}

function normalizeRowsByTimeframe(rowsByTimeframe = {}) {
  const normalized = {};
  for (const [timeframe, rows] of Object.entries(rowsByTimeframe || {})) {
    normalized[normalizePivotExporterTimeframe(timeframe)] = Array.isArray(rows) ? rows : [];
  }
  return normalized;
}

function normalizeLabelsByTimeframe(labelsByTimeframe = {}) {
  const normalized = {};
  for (const [timeframe, labels] of Object.entries(labelsByTimeframe || {})) {
    normalized[normalizePivotExporterTimeframe(timeframe)] = Array.isArray(labels) ? labels : [];
  }
  return normalized;
}

function normalizeOhlcvByTimeframe(ohlcvByTimeframe = {}) {
  const normalized = {};
  for (const [timeframe, rows] of Object.entries(ohlcvByTimeframe || {})) {
    normalized[normalizePivotExporterTimeframe(timeframe)] = Array.isArray(rows) ? rows : [];
  }
  return normalized;
}

function pivotEvidenceId(pivot) {
  const prefix = pivot.timeframe === 'monthly' ? 'm'
    : pivot.timeframe === 'weekly' ? 'w'
      : pivot.timeframe === 'daily' ? 'd'
        : String(pivot.timeframe || '').replace(/[^a-z0-9]+/gi, '_');
  const date = String(pivot.date || '').slice(0, 7).replace('-', '_');
  const type = String(pivot.type || '').toLowerCase();
  const price = String(pivot.price ?? '').replace('.', '_').replace(/[^0-9_]+/g, '');
  return [prefix, date, type, price].filter(Boolean).join('_');
}

function ohlcvTimeMs(row) {
  const value = number(row?.time ?? row?.timestamp ?? row?.date);
  if (value == null) return null;
  return value < 100000000000 ? value * 1000 : value;
}

function findOhlcvRowForPivot(pivot, rows = []) {
  return rows.find((row) => ohlcvTimeMs(row) === pivot.time) || null;
}

function pivotForEvidence(pivot) {
  const evidence = {
    id: pivotEvidenceId(pivot),
    type: pivot.type,
    date: pivot.date,
    time: pivot.time,
    price: pivot.price,
    source_kind: pivot.source_kind || 'kpe_table_row',
    source_text: pivot.source_text
  };

  if (pivot.exporter_row_id) evidence.exporter_row_id = pivot.exporter_row_id;
  return evidence;
}

export function buildMtfPivotEvidence({
  labelsByTimeframe = {},
  rowsByTimeframe = {},
  ohlcvByTimeframe = {},
  screenshots = {},
  requiredTimeframes = CANONICAL_MTF_TIMEFRAMES,
  instrumentClass,
  instrumentProfiles = DEFAULT_PIVOT_INSTRUMENT_PROFILES,
  sourceTools = ['data_get_pine_labels'],
  extractionMethod = 'MTF visual extraction from price-wave extreme labels; KPE table rows are fallback only.',
  iterationDecision = 'accepted_after_visual_label_ohlcv_verification',
  rowPrefix = KONSILI_PIVOT_EXPORTER.rowPrefix,
  version = KONSILI_PIVOT_EXPORTER.version,
  tolerance = 0.000001
} = {}) {
  const errors = [];
  const normalizedLabels = normalizeLabelsByTimeframe(labelsByTimeframe);
  const normalizedRows = normalizeRowsByTimeframe(rowsByTimeframe);
  const normalizedOhlcv = normalizeOhlcvByTimeframe(ohlcvByTimeframe);
  const profile = pivotProfileForInstrumentClass(instrumentClass, instrumentProfiles);

  if (!profile) {
    errors.push(`unsupported instrument_class for MTF pivot extraction: ${instrumentClass || '<missing>'}`);
  }

  const timeframes = [];
  const pivotsByTimeframe = {};

  for (const timeframe of requiredTimeframes.map(normalizePivotExporterTimeframe)) {
    const visualLabelRows = normalizedLabels[timeframe] || [];
    const exporterRows = normalizedRows[timeframe] || [];
    const parsedLabels = parseVisualPivotLabelRows(visualLabelRows, {
      timeframe,
      rowPrefix,
      version,
      left: profile?.left,
      right: profile?.right
    });
    const parsedRows = parsePivotExporterRows(exporterRows, { rowPrefix, version });
    const matchingVisualPivots = parsedLabels.pivots.filter((pivot) => pivot.timeframe === timeframe);
    const matchingTablePivots = parsedRows.pivots.filter((pivot) => pivot.timeframe === timeframe);
    const usingVisualLabels = matchingVisualPivots.length > 0;
    const matchingPivots = usingVisualLabels ? matchingVisualPivots : matchingTablePivots;
    const pivots = [];
    const ohlcvVerification = [];

    if (visualLabelRows.length) {
      for (const error of parsedLabels.errors) errors.push(`${timeframe}: visual label ${error}`);
    }
    if (exporterRows.length) {
      for (const error of parsedRows.errors) errors.push(`${timeframe}: KPE ${error}`);
    }
    if (!visualLabelRows.length && !exporterRows.length) errors.push(`${timeframe}: missing visual pivot labels`);
    if (!matchingPivots.length) errors.push(`${timeframe}: no visual price-extreme labels or fallback KPE rows matched timeframe`);

    for (const parsedPivot of matchingPivots) {
      const evidencePivot = pivotForEvidence(parsedPivot);
      pivots.push(evidencePivot);

      if (!usingVisualLabels && profile && !validatePivotProfile(parsedPivot, profile, { version })) {
        errors.push(`${timeframe}.${parsedPivot.id}: KPE row does not match ${instrumentClass} profile`);
      }

      const ohlcvRow = findOhlcvRowForPivot(parsedPivot, normalizedOhlcv[timeframe] || []);
      const verified = verifyPivotAgainstOhlcv(parsedPivot, ohlcvRow, tolerance);
      if (!ohlcvRow) errors.push(`${timeframe}.${parsedPivot.id}: missing OHLCV row for ${parsedPivot.date}`);
      if (ohlcvRow && !verified) errors.push(`${timeframe}.${parsedPivot.id}: ${parsedPivot.source_kind || 'pivot'} ${parsedPivot.type} ${parsedPivot.price} does not match OHLCV`);

      ohlcvVerification.push({
        id: evidencePivot.id,
        pivot_id: evidencePivot.id,
        status: verified ? 'pass' : 'fail',
        evidence: verified
          ? `${timeframe} OHLCV matched ${parsedPivot.type} ${parsedPivot.price} on ${parsedPivot.date}.`
          : `${timeframe} OHLCV did not verify ${parsedPivot.type} ${parsedPivot.price} on ${parsedPivot.date}.`
      });
    }

    pivotsByTimeframe[timeframe] = pivots;
    timeframes.push({
      timeframe,
      screenshot: screenshots[timeframe] || screenshots.visual_pivots || 'screenshots/visual_pivots.png',
      source_mode: usingVisualLabels ? 'visual_price_extreme_labels' : 'kpe_table_fallback',
      visual_label_rows: visualLabelRows,
      ...(exporterRows.length ? { exporter_rows: exporterRows } : {}),
      pivots,
      ohlcv_verification: ohlcvVerification
    });
  }

  return {
    evidence: {
      indicator_name: KONSILI_PIVOT_EXPORTER.name,
      study_filter: KONSILI_PIVOT_EXPORTER.studyFilter,
      extraction_method: extractionMethod,
      iteration_decision: iterationDecision,
      exporter: {
        name: KONSILI_PIVOT_EXPORTER.name,
        version,
        study_filter: KONSILI_PIVOT_EXPORTER.studyFilter,
        pine_script: KONSILI_PIVOT_EXPORTER.pineScript,
        row_prefix: rowPrefix,
        source_tools: sourceTools,
        default_table_visible: false,
        table_fallback_only: true,
        instrument_class: instrumentClass,
        left_bars: profile?.left ?? null,
        right_bars: profile?.right ?? null,
        max_rows: profile?.max_rows ?? null
      },
      timeframes
    },
    errors,
    pivotsByTimeframe
  };
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
