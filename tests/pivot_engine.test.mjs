import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KONSILI_PIVOT_EXPORTER,
  detectSwingPivots,
  parsePivotExporterRows,
  rankHewImpulseCandidates
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
    'KPE|v=1|tf=1M|id=1M_1704067200000_H|type=high|time=1704067200000|price=150.25|left=5|right=5|confirmed=true',
    'KPE|v=1|tf=1W|id=1W_1704672000000_L|type=low|time=1704672000000|price=100|left=5|right=5|confirmed=true'
  ];

  const result = parsePivotExporterRows(rows);

  assert.deepEqual(result.errors, []);
  assert.equal(KONSILI_PIVOT_EXPORTER.studyFilter, 'Konsili Pivot Exporter');
  assert.deepEqual(result.pivots.map((pivot) => pivot.timeframe), ['monthly', 'weekly']);
  assert.equal(result.pivots[0].id, '1M_1704067200000_H');
  assert.equal(result.pivots[0].type, 'high');
  assert.equal(result.pivots[0].price, 150.25);
});

test('parsePivotExporterRows fails closed on malformed exporter rows', () => {
  const result = parsePivotExporterRows([
    'Pivot Points High Low label with no structured data',
    'KPE|v=1|tf=1D|id=bad|type=high|time=bad|price=120|left=5|right=5|confirmed=true'
  ]);

  assert.equal(result.pivots.length, 0);
  assert.match(result.errors.join('\n'), /missing KPE row prefix/i);
  assert.match(result.errors.join('\n'), /invalid time/i);
});
