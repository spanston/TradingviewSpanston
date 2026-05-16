import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectSwingPivots,
  rankHewImpulseCandidates,
  detectWyckoffRanges
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

function ohlcBars(rows) {
  return rows.map((row, index) => ({ time: index, volume: 1000 + index, ...row }));
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

test('detectWyckoffRanges finds strict multi-swing ranges and confirms spring reaction', () => {
  const bars = ohlcBars([
    { open: 100, high: 100, low: 100, close: 100 },
    { open: 101, high: 105, low: 101, close: 105 },
    { open: 104, high: 104, low: 96, close: 96 },
    { open: 97, high: 104, low: 97, close: 104 },
    { open: 103, high: 103, low: 95, close: 95 },
    { open: 96, high: 103, low: 96, close: 103 },
    { open: 102, high: 102, low: 94, close: 94 },
    { open: 95, high: 102, low: 95, close: 102 },
    { open: 94, high: 100, low: 92, close: 100 },
    { open: 100, high: 103, low: 99, close: 103 },
    { open: 103, high: 106, low: 102, close: 106 },
    { open: 106, high: 106, low: 104, close: 104 }
  ]);
  const pivots = detectSwingPivots(bars, { left: 1, right: 1, minMovePct: 1 });

  const ranges = detectWyckoffRanges(bars, {
    pivots,
    minTouchesPerSide: 2,
    maxRangeHeightPct: 15,
    boundaryTolerancePct: 2.5
  });

  assert.ok(ranges.length > 0, 'expected a strict range candidate');
  assert.equal(ranges[0].source, 'strict_multi_swing_range');
  assert.ok(ranges[0].touches.support >= 2);
  assert.ok(ranges[0].touches.resistance >= 2);
  assert.ok(ranges[0].event_candidates.some((event) => event.type === 'spring' && event.reaction === 'confirmed'));
});

test('detectWyckoffRanges rejects broad trend-wide pseudo ranges', () => {
  const bars = priceBars([100, 105, 102, 112, 108, 122, 116, 135, 128, 146, 140, 155, 149]);
  const pivots = detectSwingPivots(bars, { left: 1, right: 1, minMovePct: 1 });

  const ranges = detectWyckoffRanges(bars, {
    pivots,
    minTouchesPerSide: 2,
    maxRangeHeightPct: 15,
    boundaryTolerancePct: 2.5
  });

  assert.deepEqual(ranges, []);
});
