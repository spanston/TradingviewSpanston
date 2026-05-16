# Analysis Journal

Trading analysis packages saved from TradingView MCP sessions.

## Package contract

Each HEW symbol/date gets exactly one package:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
  journal.md
  evidence.json
  screenshots/
```

Rules:

- One top-level `journal.md`.
- One top-level `evidence.json`.
- Screenshots only under `screenshots/`.
- `journal.md` embeds screenshots with package-relative paths.
- `evidence.json.screenshots[*].path` points to those same files.
- `evidence.json.stage_gates` records route/layout, visual pivot extraction, OHLCV pivot verification, top-down read, drawing protocol, evidence contract, action output, and critic review.
- `evidence.json.visual_pivot_evidence` records `Konsili Pivot Exporter` metadata, raw `KPE|...` exporter rows, pivot `exporter_row_id` links, indicator-confirmed pivot date/time/price, Monthly/Weekly/Daily visual proof screenshots, and OHLCV verification.
- `chart_prep.chart_mode_checklist` records extraction, verification, strategy-proof, and presentation modes; presentation mode must hide pivot scaffolding unless the package is explicitly audit-only.
- `chart_prep.drawing_manifest` records every meaningful drawing tool and timeframe owner.

Validate before calling a package done:

```bash
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

Use the HEW validator for current packages.

Rebuild analysis packages under the current HEW/Copsey contract with fresh evidence.
