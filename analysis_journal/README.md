# Analysis Journal

Trading analysis packages saved from TradingView MCP sessions.

## Package contract

Each symbol/method gets exactly one package:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_<method>/
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
- `evidence.json.stage_gates` records route/layout, top-down read, drawing protocol, evidence contract, action output, and critic review.
- `chart_prep.drawing_manifest` records every meaningful drawing tool and timeframe owner.

Validate before calling a package done:

```bash
npm run validate:<hew|wyckoff> -- analysis_journal/<PACKAGE>/evidence.json
```

Use the validator that matches the package method.

| Date | Symbol | Method | Entry |
|---|---|---|---|
| 2026-05-15 | COINBASE:BTCUSD | Strict Wyckoff macro update | [BTCUSD_2026-05-15_wyckoff/journal.md](BTCUSD_2026-05-15_wyckoff/journal.md) |
