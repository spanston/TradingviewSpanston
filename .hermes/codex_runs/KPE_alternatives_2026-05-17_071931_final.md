**Executive Recommendation**

Do not abandon KPE. Replace the single fragile extraction path with a **multi-channel KPE evidence contract**:

1. **Near term:** fix MCP Pine graphics extraction and add a diagnostic fallback that proves whether KPE is attached, visible, producing graphics, or simply unreadable through the current `data.js` path.
2. **Medium term:** extend KPE to emit the same `KPE|...` receipt through **multiple Pine graphics surfaces**: table, label, line/box geometry, and optionally plot/Data Window values.
3. **Long term:** make a **local deterministic pivot receipt engine** mirror KPE exactly, but allow it to pass clean only when cross-attested by live TradingView visual evidence. Raw OHLCV alone must stay blocked.

The best architecture is not “tables vs labels.” It is **pivot receipts with source tiers**.

Relevant current anchors: [manifest](/C:/Users/Johan/Desktop/KonsiliTradingview/strategies/hew/manifest.json), [KPE Pine](/C:/Users/Johan/Desktop/KonsiliTradingview/tradingview/konsili_pivot_exporter.pine), [validator](/C:/Users/Johan/Desktop/KonsiliTradingview/scripts/validate_evidence.mjs), [pivot engine](/C:/Users/Johan/Desktop/KonsiliTradingview/scripts/pivot_engine.mjs), [MCP data.js](/C:/Users/Johan/Desktop/HEWAI%20BOT/tv-bot/src/core/data.js), [MCP stream.js](/C:/Users/Johan/Desktop/HEWAI%20BOT/tv-bot/src/core/stream.js).

**Option Matrix**

| Option | Evidence Quality | Complexity | Live Chart Dependency | Validator Impact | Failure Modes | Verdict |
|---|---:|---:|---:|---|---|---|
| Fix MCP table/label extraction with stream.js patterns | High | Low-medium | High | Minimal | TradingView internal API drift | Do first |
| Add extraction diagnostics: study visible, graphics collections, raw primitive paths | High for failure classification | Low | High | Add diagnostic artifact optional/required on failure | Still no data if TV internals hide graphics | Required near term |
| Pine plots/Data Window values | Medium | Medium | High | Add allowed source tool and row schema variant | Usually exposes current/cursor values, not full pivot history; cursor automation brittle | Spike only |
| KPE line/box geometry receipts | Medium-high | Medium | High | Add `data_get_pine_lines/boxes` source and geometry parser | Geometry may lose text/date unless encoded carefully; line APIs may drift | Strong supplement |
| Strategy Tester trade list as export | Medium | Medium-high | High | New source type, raw files, strategy variant | Abuses strategy semantics; historical export may be truncated/unstable | Not primary |
| TradingView alerts/webhook/local listener | High for future events, poor for history | High | High + external listener | New source type and alert receipt storage | Historical pivots unavailable unless replay/backfill; webhook setup burden | Long-term realtime add-on only |
| Screenshot OCR/vision | Low-medium | Medium-high | High | Fallback-only with confidence cap | OCR mistakes, occlusion, scaling, no exact timestamp guarantee | Audit fallback only |
| DOM/canvas scraping/CDP snapshot | Medium | High | Very high | New source tool | Canvas text may not be DOM; TV internals unstable | Spike after diagnostics |
| Local deterministic KPE mirror from OHLCV | High mathematically, weak visually | Low-medium | Medium | New `local_kpe_mirror` plus attestation fields | Violates visual-first if used alone | Supplement, not clean alone |
| Manual pivot entry UX with checksum | Medium-high if disciplined | Medium | Medium | New `manual_attested_kpe` source with blocked/qualified semantics | Operator burden and transcription risk | Emergency fallback only |
| TradingView layout/save/export state | Unknown | High | High | Unknown | Capability may not expose study internals | Research spike only |
| Abandon KPE, local pivots canonical | Operationally convenient, evidence weaker | Medium | Low | Major contract rewrite | Breaks Johan’s visual-first invariant | Reject for now |

**Top 3 Paths**

1. **Near-term: repair MCP extraction, not the workflow**
   - Port the stronger primitive access patterns from `stream.js` into `data.js`.
   - Add a `data_diagnose_pine_graphics(study_filter)` style path that returns: study found, visible, entity id, graphics object present, primitive collection keys, table/label/line/box counts.
   - Keep manifest `allowed_source_tools` as `data_get_pine_tables` and `data_get_pine_labels`.
   - On failure, package should record diagnostic failure and block action, not silently downgrade.

2. **Medium-term: KPE multi-surface receipt**
   - Keep the same `KPE|v=...|tf=...|id=...|date=...|time=...|price=...|left=...|right=...` row as canonical.
   - Emit it through table and labels as today.
   - Add machine-readable geometry: lines/boxes anchored at pivot time/price, with redundant encoded metadata where TradingView exposes it.
   - Manifest changes: expand `allowed_source_tools` to include `data_get_pine_lines`, `data_get_pine_boxes`, and possibly `data_get_study_values` only after a successful spike.
   - Validator changes: normalize every source into the same internal pivot receipt object, then apply the current row/date/time/price/profile/OHLCV checks.

3. **Long-term: dual-attested pivot receipt engine**
   - Local deterministic engine mirrors KPE’s `ta.pivothigh/ta.pivotlow` parameters exactly.
   - It generates `KPEM|...` or normalized `KPE|...` receipts from TradingView OHLCV.
   - Clean pass requires at least one live-chart visual attestation: KPE screenshot plus successful graphics extraction, or KPE screenshot plus vision/OCR audit, or KPE geometry receipt.
   - If only local OHLCV exists: valid diagnostic package, but `trade_permission=blocked`, `evidence_grade=qualified`, confidence capped low/very low.

**Validator/Manifest Changes Needed**

Change the manifest from `allowed_source_tools` as a flat table/label list into source tiers:

- `clean_structured_visual`: `data_get_pine_tables`, `data_get_pine_labels`, future `data_get_pine_geometry_receipts`.
- `clean_dual_attested`: `local_kpe_mirror` plus `visual_attestation`.
- `fallback_audit_only`: OCR, manual entry, screenshots.
- `forbidden_clean`: raw OHLCV-only, `hew_scan_chart`, generic scanner pivots.

Validator changes:

- Replace `validateTimeframePivotExporterRows` with `validatePivotReceipts`.
- Keep required fields: `date`, `time`, `price`, `type`, `timeframe`, `left`, `right`, `confirmed`, `source_text` or equivalent receipt text.
- Add `source_tool`, `source_tier`, `attestation_refs`, `diagnostic_trace`.
- Require OHLCV verification after receipt normalization.
- Preserve current drawing point-locking against verified pivot IDs.

**Experiments To Run Next**

1. Compare `data_get_pine_tables/labels` vs `streamTables/streamLabels` on the same attached KPE study.
2. Add a read-only diagnostic probe for KPE graphics collections: no package changes yet.
3. Prototype KPE line/box receipt extraction on one symbol/timeframe.
4. Test whether `data_get_study_values` can expose more than last-bar/cursor values reliably enough for historical pivots.
5. Test Strategy Tester trade-list export with a throwaway KPE strategy variant.
6. Test OCR only as an audit fallback against known KPE screenshots.
7. Investigate layout/save state only if the above fail.

**Rejected Ideas**

Raw OHLCV-only clean pass should be rejected. It destroys the whole visual-first discipline.

Manual pivot entry as routine workflow should be rejected. It adds operator burden and makes the evidence path depend on transcription discipline.

Alerts/webhooks as historical pivot extraction should be rejected. Alerts are good for future pivots, not for reconstructing macro history.

Strategy Tester as primary export should be rejected unless a spike proves stable structured access. It is semantically wrong for pivots.

Screenshot OCR as clean evidence should be rejected. It is useful for audit and failure triage, not exact pivot receipts.

**Final Call**

Johan should do this next: **fix MCP extraction with diagnostics first, then harden KPE into a multi-surface receipt emitter.** Do not lower the validator to accept raw OHLCV pivots. The invariant is correct; the extraction transport is the weak layer.

