import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMtfPivotEvidence,
  CANONICAL_MTF_TIMEFRAMES,
  KONSILI_PIVOT_EXPORTER,
  detectSwingPivots,
  parseKpeRow,
  parsePivotExporterRows,
  parseVisualPivotLabelRows,
  rankHewImpulseCandidates,
  validatePivotProfile,
  verifyPivotAgainstOhlcv
} from '../scripts/pivot_engine.mjs';

function priceBars(prices) {
  return prices.map((price, index) => ({
    time: index,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 1000 + index
  }));
}

test('detectSwingPivots filters shallow noise and keeps the stronger nearby extreme', () => {
  const bars = priceBars([100, 110, 109.7, 111, 104, 125, 114, 130, 119, 135, 128]);

  const pivots = detectSwingPivots(bars, { left: 1, right: 1, minMovePct: 1 });

  assert.equal(pivots[0].type, 'high');
  assert.equal(pivots[0].index, 3);
  assert.equal(pivots[0].price, 111);
  assert.deepEqual(pivots.map((pivot) => pivot.type), ['high', 'low', 'high', 'low', 'high', 'low', 'high']);
});

test('rankHewImpulseCandidates rejects sub-176.4% wave 3 counts and ranks the valid six-pivot impulse', () => {
  const pivots = [
    { id: 'i0', index: 0, time: 0, type: 'low', price: 100 },
    { id: 'i1', index: 1, time: 1, type: 'high', price: 110 },
    { id: 'i2', index: 2, time: 2, type: 'low', price: 104 },
    { id: 'i3', index: 3, time: 3, type: 'high', price: 119 },
    { id: 'i4', index: 4, time: 4, type: 'low', price: 114 },
    { id: 'i5', index: 5, time: 5, type: 'high', price: 125 },
    { id: 'v0', index: 6, time: 6, type: 'low', price: 118 },
    { id: 'v1', index: 7, time: 7, type: 'high', price: 130 },
    { id: 'v2', index: 8, time: 8, type: 'low', price: 122 },
    { id: 'v3', index: 9, time: 9, type: 'high', price: 146 },
    { id: 'v4', index: 10, time: 10, type: 'low', price: 136 },
    { id: 'v5', index: 11, time: 11, type: 'high', price: 153 }
  ];

  const candidates = rankHewImpulseCandidates(pivots, { wave3Floor: 1.764 });
  const invalidFirstWindow = candidates.find((candidate) => candidate.pivots[0].id === 'i0');
  const validCandidates = candidates.filter((candidate) => candidate.valid);

  assert.ok(invalidFirstWindow, 'expected the tempting first six-pivot window to be audited');
  assert.equal(invalidFirstWindow.ratios.wave3_vs_wave1, 1.5);
  assert.ok(invalidFirstWindow.invalid_reasons.includes('wave3_below_hew_floor'));
  assert.equal(validCandidates[0].pivots[0].id, 'v0');
  assert.equal(validCandidates[0].ratios.wave3_vs_wave1, 2);
  assert.equal(validCandidates[0].rules.wave3_floor.status, 'pass');
});

test('parsePivotExporterRows normalizes Konsili Pivot Exporter table rows', () => {
  const rows = [
    'KPE|v=2|tf=1M|id=1M_1704067200000_H|type=high|date=2024-01-01 00:00|time=1704067200000|price=150.25|timezone=Etc/UTC|left=5|right=5|confirmed=true',
    'KPE|v=2|tf=1W|id=1W_1704672000000_L|type=low|date=2024-01-08 00:00|time=1704672000000|price=100|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  ];

  const result = parsePivotExporterRows(rows);

  assert.deepEqual(result.errors, []);
  assert.equal(KONSILI_PIVOT_EXPORTER.studyFilter, 'Konsili Pivot Exporter');
  assert.deepEqual(result.pivots.map((pivot) => pivot.timeframe), ['monthly', 'weekly']);
  assert.equal(result.pivots[0].id, '1M_1704067200000_H');
  assert.equal(result.pivots[0].type, 'high');
  assert.equal(result.pivots[0].date, '2024-01-01 00:00');
  assert.equal(result.pivots[0].time, 1704067200000);
  assert.equal(result.pivots[0].price, 150.25);
  assert.equal(result.pivots[0].version, KONSILI_PIVOT_EXPORTER.version);
  assert.equal(result.pivots[0].exporter_row_id, '1M_1704067200000_H');
  assert.equal(result.pivots[0].source_text, rows[0]);
  assert.equal(parseKpeRow(rows[0]).id, '1M_1704067200000_H');
});

test('parsePivotExporterRows accepts visual label text that embeds a KPE row', () => {
  const row = 'KPE|v=2|tf=1D|id=1D_1704844800000_H|type=high|date=2024-01-10 00:00|time=1704844800000|price=120|timezone=Etc/UTC|left=5|right=5|confirmed=true';
  const labelText = `120.00\n2024-01-10 00:00\nPH\n${row}`;

  const result = parsePivotExporterRows([labelText]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.pivots[0].id, '1D_1704844800000_H');
  assert.equal(result.pivots[0].source_text, row);
});

test('parseVisualPivotLabelRows extracts price-wave extreme labels without a KPE row', () => {
  const result = parseVisualPivotLabelRows([
    { text: '82833\n2026-05-06 00:00\nPH', price: 82833 },
    { text: '74912\n2026-04-29 00:00\nPL', price: 74912 }
  ], { timeframe: 'D' });

  assert.deepEqual(result.errors, []);
  assert.equal(result.pivots[0].type, 'high');
  assert.equal(result.pivots[0].price, 82833);
  assert.equal(result.pivots[0].date, '2026-05-06 00:00');
  assert.equal(result.pivots[0].time, 1778025600000);
  assert.equal(result.pivots[0].source_kind, 'visual_price_extreme_label');
  assert.equal(result.pivots[1].type, 'low');
});

test('parsePivotExporterRows fails closed on malformed exporter rows', () => {
  const result = parsePivotExporterRows([
    'Pivot Points High Low label with no structured data',
    'KPE|v=2|tf=1D|id=bad|type=high|date=2024-01-10 00:00|time=bad|price=120|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  ]);

  assert.equal(result.pivots.length, 0);
  assert.match(result.errors.join('\n'), /missing KPE row prefix/i);
  assert.match(result.errors.join('\n'), /invalid time/i);
});

test('parsePivotExporterRows requires the indicator date field', () => {
  const result = parsePivotExporterRows([
    'KPE|v=2|tf=1D|id=bad|type=high|time=1704844800000|price=120|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  ]);

  assert.equal(result.pivots.length, 0);
  assert.match(result.errors.join('\n'), /missing date/i);
});

test('validatePivotProfile rejects wrong left/right exporter profile settings', () => {
  const [row] = parsePivotExporterRows([
    'KPE|v=2|tf=1D|id=1D_1704844800000_H|type=high|date=2024-01-10 00:00|time=1704844800000|price=120|timezone=Etc/UTC|left=7|right=7|confirmed=true'
  ]).pivots;

  assert.equal(validatePivotProfile(row, { left: 7, right: 7 }), true);
  assert.equal(validatePivotProfile(row, { left: 5, right: 7 }), false);
  assert.equal(validatePivotProfile(row, { left: 7, right: 5 }), false);
});

test('parsePivotExporterRows fails closed when KPE price is missing', () => {
  const invalidRow = 'KPE|v=2|tf=1D|id=bad_missing_price|type=high|date=2024-01-10 00:00|time=1704844800000|timezone=Etc/UTC|left=5|right=5|confirmed=true';
  const result = parsePivotExporterRows([invalidRow]);

  assert.equal(result.pivots.length, 0);
  assert.match(result.errors.join('\n'), /invalid price/i);
  assert.equal(parseKpeRow(invalidRow), null);
});

test('parsePivotExporterRows fails closed when KPE row is unconfirmed', () => {
  const result = parsePivotExporterRows([
    'KPE|v=2|tf=1D|id=bad_unconfirmed|type=low|date=2024-01-10 00:00|time=1704844800000|price=100|timezone=Etc/UTC|left=5|right=5|confirmed=false'
  ]);

  assert.equal(result.pivots.length, 0);
  assert.match(result.errors.join('\n'), /confirmed must be true/i);
});

test('verifyPivotAgainstOhlcv validates high pivots against OHLCV highs', () => {
  const pivot = parseKpeRow(
    'KPE|v=2|tf=1D|id=1D_1704844800000_H|type=high|date=2024-01-10 00:00|time=1704844800000|price=120.5|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  );

  assert.equal(verifyPivotAgainstOhlcv(pivot, { high: 120.5, low: 98 }), true);
  assert.equal(verifyPivotAgainstOhlcv(pivot, { high: 120.49, low: 98 }), false);
});

test('verifyPivotAgainstOhlcv validates low pivots against OHLCV lows', () => {
  const pivot = parseKpeRow(
    'KPE|v=2|tf=1D|id=1D_1704844800000_L|type=low|date=2024-01-10 00:00|time=1704844800000|price=98.25|timezone=Etc/UTC|left=5|right=5|confirmed=true'
  );

  assert.equal(verifyPivotAgainstOhlcv(pivot, { high: 120.5, low: 98.25 }), true);
  assert.equal(verifyPivotAgainstOhlcv(pivot, { high: 120.5, low: 98.3 }), false);
});

test('buildMtfPivotEvidence creates one verified visual_pivot_evidence object for monthly weekly daily rows', () => {
  const result = buildMtfPivotEvidence({
    instrumentClass: 'single_stock',
    screenshots: {
      monthly: 'screenshots/visual_pivots_monthly.png',
      weekly: 'screenshots/visual_pivots_weekly.png',
      daily: 'screenshots/visual_pivots_daily.png'
    },
    labelsByTimeframe: {
      monthly: [{ text: '150\n2024-01-01 00:00\nPH', price: 150 }],
      weekly: [{ text: '100\n2024-01-08 00:00\nPL', price: 100 }],
      daily: [{ text: '125\n2024-01-10 00:00\nPH', price: 125 }]
    },
    ohlcvByTimeframe: {
      monthly: [{ time: 1704067200, high: 150, low: 90 }],
      weekly: [{ time: 1704672000, high: 130, low: 100 }],
      daily: [{ time: 1704844800, high: 125, low: 99 }]
    }
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.evidence.timeframes.map((item) => item.timeframe), CANONICAL_MTF_TIMEFRAMES);
  assert.equal(result.evidence.exporter.instrument_class, 'single_stock');
  assert.equal(result.evidence.exporter.left_bars, 5);
  assert.equal(result.evidence.timeframes[0].pivots[0].id, 'm_2024_01_high_150');
  assert.equal(result.evidence.timeframes[0].source_mode, 'visual_price_extreme_labels');
  assert.equal(result.evidence.timeframes[0].pivots[0].source_kind, 'visual_price_extreme_label');
  assert.equal(result.evidence.timeframes[1].ohlcv_verification[0].status, 'pass');
  assert.equal(result.pivotsByTimeframe.daily[0].source_kind, 'visual_price_extreme_label');
  assert.equal(result.evidence.exporter.default_table_visible, false);
  assert.equal(result.evidence.exporter.table_fallback_only, true);
});

test('buildMtfPivotEvidence fails closed on profile drift or OHLCV mismatch', () => {
  const result = buildMtfPivotEvidence({
    instrumentClass: 'single_stock',
    rowsByTimeframe: {
      monthly: ['KPE|v=2|tf=M|id=M_1704067200000_H|type=high|date=2024-01-01 00:00|time=1704067200000|price=150|timezone=Etc/UTC|left=7|right=5|confirmed=true'],
      weekly: ['KPE|v=2|tf=W|id=W_1704672000000_L|type=low|date=2024-01-08 00:00|time=1704672000000|price=100|timezone=Etc/UTC|left=5|right=5|confirmed=true'],
      daily: ['KPE|v=2|tf=D|id=D_1704844800000_H|type=high|date=2024-01-10 00:00|time=1704844800000|price=125|timezone=Etc/UTC|left=5|right=5|confirmed=true']
    },
    ohlcvByTimeframe: {
      monthly: [{ time: 1704067200, high: 150, low: 90 }],
      weekly: [{ time: 1704672000, high: 130, low: 100 }],
      daily: [{ time: 1704844800, high: 124, low: 99 }]
    }
  });

  assert.match(result.errors.join('\n'), /profile/i);
  assert.match(result.errors.join('\n'), /does not match OHLCV/i);
  assert.equal(result.evidence.timeframes[2].ohlcv_verification[0].status, 'fail');
});

test('buildMtfPivotEvidence uses KPE table rows only as fallback when visual labels are missing', () => {
  const result = buildMtfPivotEvidence({
    instrumentClass: 'single_stock',
    sourceTools: ['data_get_pine_tables'],
    rowsByTimeframe: {
      monthly: ['KPE|v=2|tf=M|id=M_1704067200000_H|type=high|date=2024-01-01 00:00|time=1704067200000|price=150|timezone=Etc/UTC|left=5|right=5|confirmed=true'],
      weekly: ['KPE|v=2|tf=W|id=W_1704672000000_L|type=low|date=2024-01-08 00:00|time=1704672000000|price=100|timezone=Etc/UTC|left=5|right=5|confirmed=true'],
      daily: ['KPE|v=2|tf=D|id=D_1704844800000_H|type=high|date=2024-01-10 00:00|time=1704844800000|price=125|timezone=Etc/UTC|left=5|right=5|confirmed=true']
    },
    ohlcvByTimeframe: {
      monthly: [{ time: 1704067200, high: 150, low: 90 }],
      weekly: [{ time: 1704672000, high: 130, low: 100 }],
      daily: [{ time: 1704844800, high: 125, low: 99 }]
    }
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.evidence.timeframes[0].source_mode, 'kpe_table_fallback');
  assert.equal(result.pivotsByTimeframe.daily[0].exporter_row_id, 'D_1704844800000_H');
});
