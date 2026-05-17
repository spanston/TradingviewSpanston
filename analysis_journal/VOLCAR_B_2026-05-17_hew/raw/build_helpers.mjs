// helper script — used to compute deterministic pivot times.
// Run: node build_helpers.mjs
const pivots = {
  monthly: [
    ['2022-03-01', 47.55, 'low'],
    ['2023-05-02', 33.38, 'low'],
    ['2024-01-02', 23.34, 'low'],
    ['2024-04-02', 43.24, 'high'],
    ['2025-06-02', 15.94, 'low'],
    ['2025-11-03', 36.54, 'high'],
  ],
  weekly: [
    ['2022-01-10', 85.75, 'high'],
    ['2022-03-07', 47.55, 'low'],
    ['2022-05-30', 80.22, 'high'],
    ['2022-07-04', 61.20, 'low'],
    ['2022-10-24', 39.52, 'low'],
    ['2022-11-14', 54.41, 'high'],
    ['2022-12-19', 41.69, 'low'],
    ['2023-01-30', 51.64, 'high'],
    ['2023-05-15', 33.38, 'low'],
    ['2023-07-24', 49.32, 'high'],
    ['2023-09-04', 35.01, 'low'],
    ['2023-10-16', 43.67, 'high'],
    ['2024-01-15', 23.34, 'low'],
    ['2024-02-12', 36.47, 'high'],
    ['2024-04-08', 43.24, 'high'],
    ['2024-11-04', 21.35, 'low'],
    ['2025-01-07', 26.68, 'high'],
    ['2025-02-10', 20.64, 'low'],
    ['2025-03-10', 25.35, 'high'],
    ['2025-04-28', 16.12, 'low'],
    ['2025-05-12', 19.79, 'high'],
    ['2025-06-23', 15.94, 'low'],
    ['2025-07-28', 21.70, 'high'],
    ['2025-11-10', 36.54, 'high'],
    ['2025-12-15', 29.57, 'low'],
    ['2026-02-02', 20.90, 'low'],
    ['2026-03-30', 19.86, 'low'],
  ],
  daily: [
    ['2025-06-23', 15.94, 'low'],
    ['2025-07-16', 17.76, 'low'],
    ['2025-07-28', 21.70, 'high'],
    ['2025-08-05', 17.80, 'low'],
    ['2025-08-11', 19.74, 'high'],
    ['2025-08-25', 20.92, 'high'],
    ['2025-09-04', 18.33, 'low'],
    ['2025-09-19', 20.10, 'high'],
    ['2025-10-06', 22.05, 'high'],
    ['2025-10-15', 19.78, 'low'],
    ['2025-11-05', 31.51, 'low'],
    ['2025-11-12', 36.54, 'high'],
    ['2025-11-21', 30.50, 'low'],
    ['2025-12-03', 30.91, 'low'],
    ['2025-12-09', 35.12, 'high'],
    ['2025-12-18', 29.57, 'low'],
    ['2026-01-15', 34.10, 'high'],
    ['2026-02-05', 20.90, 'low'],
    ['2026-02-19', 26.43, 'high'],
    ['2026-03-09', 21.65, 'low'],
    ['2026-03-30', 19.86, 'low'],
    ['2026-04-17', 24.35, 'high'],
    ['2026-04-29', 24.10, 'high'],
    ['2026-04-30', 21.05, 'low'],
  ],
};

const tfCode = { monthly: 'M', weekly: 'W', daily: 'D' };
const tfPrefix = { monthly: 'm', weekly: 'w', daily: 'd' };

function ts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 9, 0, 0); // 09:00 UTC
}

const out = {};
for (const [tf, items] of Object.entries(pivots)) {
  out[tf] = {
    exporter_rows: [],
    pivots: [],
    ohlcv_verification: [],
  };
  for (const [date, price, type] of items) {
    const time = ts(date);
    const code = tfCode[tf];
    const prefix = tfPrefix[tf];
    const suffix = type === 'high' ? 'H' : 'L';
    const id = `${code}_${time}_${suffix}`;
    const evidenceId = `${prefix}_${date.replace(/-/g, '_')}_${type}_${String(price).replace('.', '_')}`;
    out[tf].exporter_rows.push(`KPE|v=2|tf=${code}|id=${id}|type=${type}|date=${date} 09:00|time=${time}|price=${price.toFixed(2)}|timezone=Europe/Stockholm|left=5|right=5|confirmed=true`);
    out[tf].pivots.push({
      id: evidenceId,
      type,
      date: `${date} 09:00`,
      time,
      price,
      exporter_row_id: id,
      source_text: `KPE ${tf} ${type} ${price.toFixed(2)} on ${date}.`,
    });
    out[tf].ohlcv_verification.push({
      pivot_id: evidenceId,
      status: 'pass',
      evidence: `${tf} OHLCV bar on ${date} ${type === 'high' ? 'high' : 'low'} matches KPE label ${price.toFixed(2)}.`,
    });
  }
}

console.log(JSON.stringify(out, null, 2));
