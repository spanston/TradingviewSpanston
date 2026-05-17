I have enough. Below is the full review. (Ignoring the TaskCreate reminder — this is a single-deliverable consult, not multi-step execution.)

---

# 1. Brutal verdict

**The Codex plan is directionally correct but skips the actual diagnosis and overshoots for a 1–2 day window.**

The SOL failure was almost certainly **one missing layer of indirection in `tv-bot/src/core/data.js`**. Compare the two extraction modules side-by-side:

| Step | `data.js` (the broken read path) | `stream.js` (the working read path) |
|---|---|---|
| Study enumeration | `model.model().dataSources()` | `chart.getAllStudies()` → `chart.getStudyById(id)` |
| Wrapper unwrap | none — uses `s` directly | `var src = study._study \|\| study` |
| Graphics object | `s._graphics` (single shot) | `src._graphics \|\| (src._source && src._source._graphics)` |
| Table collection | `pc.dwgtablecells.get('tableCells').get(false)._primitivesDataById` | `pc.ownFirstValue()` then iterate |

`stream.js` is robust to the cases where (a) the study is wrapped by another data source, (b) graphics live on `_source._graphics`, and (c) the table collection is exposed via `ownFirstValue()` instead of `dwgtablecells.tableCells`. **`data.js` is robust to none of those.** KPE on SOLUSDT entity `TR8cKk` was listed by `chart_get_state` but invisible to `data_get_pine_tables/labels` — exactly the signature of an indirection mismatch, not a missing-script or hidden-graphics problem.

The Codex report names this in Option 1 ("port stronger primitive access patterns from `stream.js` into `data.js`") but then **bundles it into a three-phase plan with multi-surface receipts and a local dual-attested mirror engine** — three layers of dependent design before anyone has even tested whether the one-line indirection fix solves it. That's the overcomplication.

The visual-first invariant is correct. The manifest is correct. The Pine script (`konsili_pivot_exporter.pine`) is correct — it emits well-formed `KPE|v=2|...|confirmed=true` into both a label and a table. The validator (`scripts/validate_evidence.mjs:475`, `:502`, `:1469`) is correct — it parses cleanly via `parsePivotExporterRows` and forces `pass_with_fallback` to cap confidence and block trade language. **The only weak layer in the stack is the MCP graphics-extraction transport in `data.js`.**

The SOL package itself is exemplary: it failed honestly, recorded the data-path failure, did not fabricate, did not promote OHLCV-only Wave 3 (which fails at 1.112× anyway), and produced `STAND ASIDE`. The system worked as designed. The fix lives upstream, not in the workflow.

---

# 2. Ranked options

Evidence quality / drift resilience / operator burden / validator impact / risk:

| # | Option | Verdict |
|---|---|---|
| 1 | **Port `stream.js` graphics indirection into `data.js`** (study unwrap + graphics fallback + table `ownFirstValue` fallback) | **Build first.** One file, ~20 lines, no manifest change, no validator change, immediately testable. Solves the SOL failure mode. Highest signal-to-effort. |
| 2 | **Add `data_diagnose_pine_graphics(study_filter)` probe** that reports per-study: visible, graphics object present, primitivesCollection keys, item counts, indirection path used | **Required pairing with #1.** When this fails again (it will, on a different drift), classify the failure mode in one MCP call instead of three remove/re-add cycles. Read-only, no contract impact. |
| 3 | **KPE line geometry as a redundant receipt surface** (Pine emits one `line.new` per pivot with the `KPE|...` text encoded; `data_get_pine_lines` becomes a second readable surface) | **Spike second.** Defense-in-depth so any one TradingView API change does not blank all three reads. Requires Pine edit + validator widening of `allowed_source_tools`. |
| 4 | **KPE box geometry as a third surface** (one `box.new` per confirmed pivot encoding high/low and date) | Defer. Useful once #3 proves geometry reads round-trip, but boxes lose timestamp text. Marginal lift if #3 lands. |
| 5 | **Local deterministic KPE mirror + visual attestation** (`scripts/pivot_engine.mjs` already has `detectSwingPivots` — extend with the KPE row schema; require a KPE screenshot + a successful live read to cross-attest a Tier-B clean pass) | Long-term safety net. Big surface area: new source tier, new attestation semantics, new validator paths. Don't build until #1–#3 stability is measured over weeks. |
| 6 | **Screenshot OCR of KPE labels as audit fallback** (read the rendered label text and re-parse `KPE\|...` from pixels) | Audit fallback only. OCR mistakes cascade into bad anchors. Manifest already permits screenshots as fallback with confidence cap; ranking it higher destroys receipt-grade evidence. |
| 7 | **Strategy Tester trade-list export of a throwaway KPE-as-strategy variant** | Reject as primary. Semantically wrong (pivots are not trades), historical export truncation, brittle. Useful only as a parallel sanity check, not a clean source. |
| 8 | **Abandon KPE; promote local `pivot_engine.mjs` to canonical** | **Reject outright.** Breaks the visual-first invariant in `AGENTS.md` and `WORKFLOW.md` and erases the discipline that makes Copsey defensible. The SOL OHLCV-only Wave 3 = 1.112× would already have been "promoted" under this regime. |

---

# 3. Best next move — concrete, 1–2 days

## Day 1, ~1 hour: Patch `buildGraphicsJS` in `data.js`

**File:** `C:/Users/Johan/Desktop/HEWAI BOT/tv-bot/src/core/data.js`
**Function:** `buildGraphicsJS(collectionName, mapKey, filter)` (lines 11–60)

**Change** — inside the `for (var si = 0; si < sources.length; si++)` loop, replace:

```js
var s = sources[si];
if (!s.metaInfo) continue;
try {
  var meta = s.metaInfo();
  var name = meta.description || meta.shortDescription || '';
  if (!name) continue;
  if (filter && name.indexOf(filter) === -1) continue;
  var g = s._graphics;
  if (!g || !g._primitivesCollection) continue;
```

with the indirection pattern lifted from `stream.js:166–171`:

```js
var s = sources[si];
if (!s.metaInfo) continue;
try {
  var meta = s.metaInfo();
  var name = meta.description || meta.shortDescription || '';
  if (!name) continue;
  if (filter && name.indexOf(filter) === -1) continue;
  var src = s._study || s;
  var g = src._graphics || (src._source && src._source._graphics);
  if (!g || !g._primitivesCollection) continue;
```

**For tables only** (`getPineTables`, line 404 path), add an `ownFirstValue()` fallback after the existing `dwgtablecells/tableCells` lookup, mirroring `stream.js:262–278`:

```js
if (items.length === 0 && '${collectionName}' === 'dwgtablecells') {
  try {
    var of = (typeof pc.ownFirstValue === 'function') ? pc.ownFirstValue() : null;
    if (of && typeof of.forEach === 'function') {
      of.forEach(function(table){
        if (table && table.data) {
          for (var r = 0; r < table.data.length; r++) {
            for (var c = 0; c < table.data[r].length; c++) {
              items.push({id: r+':'+c, raw: {tid: 0, row: r, col: c, t: (table.data[r][c]?.text || '')}});
            }
          }
        }
      });
    }
  } catch(e) {}
}
```

This stacks on top of the existing `if (items.length === 0 && ...)` block at lines 43–53 of `data.js`.

## Day 1, ~30 minutes: Add `data_diagnose_pine_graphics`

**File:** `C:/Users/Johan/Desktop/HEWAI BOT/tv-bot/src/core/data.js`
**Add:** an exported `getPineGraphicsDiagnostics({ study_filter })` that walks `model.model().dataSources()`, unwraps each via the same `_study/_source` chain, and reports per-study:

```json
{
  "name": "Konsili Pivot Exporter",
  "visible": true,
  "indirection_path": "src._source._graphics",
  "primitives_keys": ["dwglabels","dwglines","dwgtablecells","ownFirstValue"],
  "counts": { "labels": 24, "lines": 0, "boxes": 0, "tables": 1 }
}
```

Register as MCP tool `data_diagnose_pine_graphics`. Read-only, no contract change.

## Day 2: Re-run SOLUSDT against the patched MCP

**Spike acceptance criteria:**

1. `chart_get_state` lists `Konsili Pivot Exporter` (entity `TR8cKk` was already present).
2. `data_get_pine_tables({ study_filter: "Konsili Pivot Exporter" })` returns `study_count ≥ 1` on Monthly, Weekly, Daily.
3. At least one row matches `/^KPE\|v=2\|tf=(1M|1W|1D)\|.+\|confirmed=true$/` per timeframe.
4. `parsePivotExporterRows` from `scripts/pivot_engine.mjs` returns zero parse errors over the harvested rows.
5. `data_get_pine_labels` returns the same rows (label-encoded redundancy already in `konsili_pivot_exporter.pine:35-44`).
6. `npm run validate:hew -- analysis_journal/SOLUSDT_2026-05-17_hew_rerun/evidence.json --stage extraction` passes without `pass_with_fallback` on `visual_pivot_extraction`.

If 2–5 still fail after the patch, the new diagnostic immediately tells you which surface to harden next — and *that* is when the multi-surface plan becomes urgent.

**No manifest change. No validator change. No agent prompt change for this phase.**

---

# 4. Better architecture (longer plan, only if Phase 0 holds)

Codex calls it "multi-channel KPE evidence contract." That framing is fine. The cleaner model is a **Pivot Receipt Bus with source-tier attestation** — same idea, slightly different shape that maps better onto what `pivot_engine.mjs` and the validator already do.

Every accepted pivot, regardless of read path, is normalized into one receipt:

```json
{
  "id": "M_1638316800000_H",
  "tf": "monthly", "type": "high",
  "date": "2021-11-08 00:00", "time": 1638316800000,
  "price": 259.90, "left": 7, "right": 7, "confirmed": true,
  "source_tier": "A",
  "source_tool": "data_get_pine_labels",
  "attestation_refs": ["screenshots/visual_pivots_monthly.png"]
}
```

with three tiers:

- **Tier A — clean structured visual.** Live MCP read of a KPE primitive: table, label, line, box. Each surface independently produces the same receipt. Clean pass requires ≥1 Tier-A surface returning the row plus a `visual_pivots` screenshot.
- **Tier B — cross-attested local.** `scripts/pivot_engine.mjs` runs `detectSwingPivots` on the same OHLCV with the same left/right from the instrument profile, then requires a KPE screenshot (vision QA reviewed) to attest the same pivot is rendered on the live chart. Confidence capped to `low`/`very_low`, trade permission blocked. This is the "diagnostic-clean" fallback.
- **Tier C — audit only.** OCR of KPE screenshot, manual entry, scanner output. Never clean. Documented for audit trail.

### Phased rollout

| Phase | Goal | Files touched | Manifest impact | Validator impact |
|---|---|---|---|---|
| **0** *(this week)* | Fix data.js indirection + diagnostic probe | `tv-bot/src/core/data.js` | None | None |
| **1** *(this sprint)* | KPE label↔table read parity confirmed; new MCP tool `data_diagnose_pine_graphics` documented in `AGENTS.md` extraction-mode steps | docs only | None | None |
| **2** *(next sprint, only if drift observed)* | KPE line geometry as Tier-A surface #3: add `line.new` per pivot with `KPE\|...` as tooltip; allow `data_get_pine_lines` in `allowed_source_tools` | `tradingview/konsili_pivot_exporter.pine`, `tv-bot/src/core/data.js`, manifest, `scripts/pivot_engine.mjs` (new `parsePivotLineReceipt`) | Widen `allowed_source_tools` to include `data_get_pine_lines` (and `data_get_pine_boxes` if needed) | Add line-receipt parser; normalize all surfaces to the same receipt before downstream checks |
| **3** *(strategic safety net)* | Tier-B dual-attested local mirror: `scripts/pivot_engine.mjs` exports a `kpeMirrorReceipts({bars, profile})`; new validator path checks `attestation_refs` against `screenshots[*]` and KPE vision QA | `scripts/pivot_engine.mjs`, manifest, validator | Add `tier_policy`: `clean=[A]`, `qualified_blocked=[B]`, `blocked=[C]`; require `source_tier` on every pivot | New `validatePivotReceiptTiers`; tighten `fallback_policy` to require `tier=B` for `pass_with_fallback` clean shape |

The point of staging it this way: each phase is independently testable and shippable. **Phase 0 alone may solve the problem permanently.** If it does, Phases 2–3 are insurance, not urgency.

---

# 5. Dead ends to avoid

1. **Don't rewrite KPE Pine first.** The current script is correct and minimal. The bug is in the transport.
2. **Don't widen the manifest `allowed_source_tools` before fixing `data.js`.** A wider tool list with the same broken transport just shifts where the silent failure happens.
3. **Don't promote `hew_scan_chart`, Pivot Scanner, or any mechanical scanner pivots to clean.** `manifest.json:294` explicitly forbids this; doing it is the convenience exit ramp that destroys the discipline.
4. **Don't OCR-as-primary.** Useful only as audit triage for screenshots, and only with the confidence cap. Receipt-grade evidence requires deterministic decoding.
5. **Don't DOM/canvas-scrape.** TradingView's chart is canvas — there is no DOM text for labels/lines/boxes. CDP snapshots help with table-cell DOM in some surfaces but not the chart graphics that KPE writes into.
6. **Don't use alerts/webhooks for historical pivots.** Alerts fire forward; they cannot reconstruct macro history.
7. **Don't promote a pure OHLCV pivot engine to canonical.** The SOL OHLCV-only Wave 3 measured 1.112× and would have become the count under this regime. The visual-first gate is what stopped that.
8. **Don't add a parallel local engine without attestation semantics.** Tier-B without attestation collapses to OHLCV-only. The whole point of the tier is the cross-check.
9. **Don't `git reset` or rewrite the SOL package as a "successful re-run" — the failure record is evidence.** The `pass_with_fallback`/`fail` artifact is exactly what the manifest wants preserved (`raw/kpe_*.jsonl` data_path_failure records). Keep it; do the next run as a *new* dated package.

---

# 6. Validator/manifest implications (no code)

**Phase 0 (data.js fix only):** zero validator changes, zero manifest changes. The patch is below the contract surface.

**Phase 2 (line geometry surface):** widen `visual_pivot_protocol.required_exporter.allowed_source_tools` in `strategies/hew/manifest.json:222` to include `data_get_pine_lines`. Mirror it in `scripts/pivot_engine.mjs:12` (`KONSILI_PIVOT_EXPORTER.sourceTools`). Validator at `validate_evidence.mjs:474–480` already iterates `allowed_source_tools`, so the check passes once a line-source is named. The new work is a `parsePivotLineReceipt` adapter that decodes `KPE|...` from line text/tooltip into the same receipt object the existing `parsePivotExporterRow` returns; then no downstream validator code needs to change.

**Phase 3 (tier-B local mirror):** add `source_tier`, `source_tool`, and `attestation_refs` as optional fields on each pivot. Add `tier_policy` to the manifest naming which tiers count toward clean. Tighten `fallback_policy` so `pass_with_fallback` on a Tier-B receipt requires a vision-QA-reviewed screenshot in `attestation_refs`. `validate_evidence.mjs:1788–1815` (`validateFallbackPolicy`) is the natural insertion point — it already enforces `cap_reason` mentions fallback; extend it to require `attestation_refs` for tier-B clean.

**No change to:** required top-level fields, `hew_structure_context_protocol`, `copsey_purity_protocol`, drawing protocol, Wave 3 1.764 floor, hypothesis count rules, critic checklist. The receipt-bus model strengthens the pivot evidence path without altering the HEW structural contract. Wave 3 1.764, no orphan ABC, native Elliott drawings, primary/secondary subwaves, preceding impulse, forward projection — all unchanged and still blocking.

---

# 7. Final recommendation for Johan

**Build first (today/tomorrow):** patch `buildGraphicsJS` in `tv-bot/src/core/data.js` with `stream.js`'s indirection (`_study || study`, `_graphics || _source._graphics`, plus `ownFirstValue()` table fallback) and ship a `data_diagnose_pine_graphics` MCP tool. Then re-run SOLUSDT as a new dated package. If KPE reads come back, the contract is whole and the system is unblocked. Estimate: half a day. Same outcome as Codex's "Option 1" without paying for Phases 2–3 on speculation.

**Spike second (this week, after Phase 0 holds):** prototype `line.new` geometry receipts in a throwaway Pine variant of KPE. Goal is to prove a third independent surface decodes cleanly via `data_get_pine_lines`. Only widen the manifest after the round-trip is proven.

**Reject (or postpone past v1):**
- abandoning KPE for an OHLCV-canonical engine,
- OCR or DOM scraping as primary sources,
- alerts/webhooks for historical pivots,
- Strategy Tester abuse,
- widening `allowed_source_tools` before the data.js fix,
- the local dual-attested mirror as a near-term build (keep it on the architecture roadmap, not the sprint board).

The Codex report's architectural instinct is right. Its sequencing is wrong: it skips the cheap, decisive diagnosis in favor of designing the strategic safety net first. Diagnose first; the safety net earns its place only if the diagnosis fails.