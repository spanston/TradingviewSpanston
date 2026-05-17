// Build OHLCV CSVs for the package. Run from package raw/ directory.
// Monthly bars derived from documented MCP pull; weekly stored from MCP pull; daily stored from MCP pull.
// For the package contract, we keep only the canonical bars relevant to pivots; full series can be regenerated.
// To keep raw artifacts small, we capture monthly (56), weekly (238), and daily (last 250).
import { writeFileSync } from 'node:fs';

function toCsv(rows) {
  const lines = ['time,open,high,low,close,volume'];
  for (const b of rows) lines.push([b.time, b.open, b.high, b.low, b.close, b.volume].join(','));
  return lines.join('\n') + '\n';
}

// stubs: keys filled below from earlier MCP responses
export function writeAll(monthly, weekly, daily) {
  writeFileSync('ohlcv_monthly.csv', toCsv(monthly));
  writeFileSync('ohlcv_weekly.csv', toCsv(weekly));
  writeFileSync('ohlcv_daily.csv', toCsv(daily));
}
