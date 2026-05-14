# Analysis Journal

Trading analysis journal entries saved from live TradingView MCP sessions.

## Package Contract

Each symbol gets one package with exactly one top-level `journal.md` and one top-level `evidence.json`. Screenshots live under `screenshots/` and are embedded from the journal with relative Markdown image links. Multi-symbol runs should create separate packages and separate index rows per symbol.

Wyckoff packages must fill the `wyckoff_evidence_stack_v1` contract in `evidence.json`, including `evidence_contract`, `asset_context`, `indicator_evidence_stack`, and `analysis_checklist`. Validate a package before calling it done:

```powershell
npm run validate:wyckoff -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_wyckoff/evidence.json
```

HEW packages must fill the `hew_evidence_stack_v1` contract in `evidence.json`, including primary and alternate counts, ratio validation, rule validation, projection targets, invalidation/flip levels, and validation log. Validate a package before calling it done:

```powershell
npm run validate:hew -- analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/evidence.json
```

| Date | Symbol | Method | Entry |
|---|---|---|---|
| 2026-05-14 | NYSE:KLAR | Strict Wyckoff macro | [KLAR_2026-05-14_wyckoff/journal.md](KLAR_2026-05-14_wyckoff/journal.md) |
| 2026-05-14 | NYSE:NVO | Strict Wyckoff macro | [NVO_2026-05-14_wyckoff/journal.md](NVO_2026-05-14_wyckoff/journal.md) |
| 2026-05-14 | COINBASE:BTCUSD | Strict Wyckoff macro | [BTCUSD_2026-05-14_wyckoff/journal.md](BTCUSD_2026-05-14_wyckoff/journal.md) |
| 2026-05-14 | BITSTAMP:BTCUSD | Harmonic Elliott Wave macro | [BTCUSD_2026-05-14_hew/journal.md](BTCUSD_2026-05-14_hew/journal.md) |
| 2026-05-14 | COINBASE:SUIUSD | Strict Wyckoff macro | [SUIUSD_2026-05-14_wyckoff/journal.md](SUIUSD_2026-05-14_wyckoff/journal.md) |
| 2026-05-14 | COINBASE:ETHUSD | Strict Wyckoff macro | [ETHUSD_2026-05-14_wyckoff/journal.md](ETHUSD_2026-05-14_wyckoff/journal.md) |
