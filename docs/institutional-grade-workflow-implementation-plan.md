# Institutional-Grade HEW Workflow Implementation Plan

## Purpose

Build an institutional-grade TradingView / Ian Copsey Fractal Forecasting workflow without overengineering the system. The first objective is not to add more agents. The first objective is to make every analysis package reproducible, auditable, fail-closed, and clear enough for an investment-committee style review.

Subagents are explicitly deferred to Phase 2. Phase 1 hardens the current single-analyst workflow with stronger evidence artifacts, validation, schemas, visual QA, and critic discipline.

## Guiding principles

1. **Manifest-owned rules** - `strategies/hew/manifest.json` is the executable source of truth. Other docs and prompts should summarize or reference it, not duplicate substantive rules.
2. **Raw evidence before prose** - every package must preserve the raw KPE rows, OHLCV data, chart state, and drawing state needed to reproduce the conclusion.
3. **Fail between stages** - validation should run after each major workflow gate, not only after the final report is written.
4. **Pivot-locked geometry** - Elliott drawings and zone boundaries must link to verified pivots or declared projection formulas, not free-floating prices.
5. **Package validity is not trade permission** - a valid package can still block action.
6. **Scores before probabilities** - use `zone_score` until the model is calibrated against historical outcomes.
7. **Charts must stand alone** - final screenshots should be readable without decoding the journal.
8. **Critic must be hostile** - critic review should actively search for the strongest case that the package is wrong.
9. **Fixtures before orchestration** - regression fixtures come before Phase 2 subagents.

## Non-goals for Phase 1

- No full subagent pipeline.
- No dashboard or separate UI.
- No plugin/export packaging.
- No calibrated probability claims.
- No broad market/fundamental overlay as count authority.
- No large orchestration framework.

Phase 1 should be a disciplined refactor of the existing repo contract and validator, not a new platform.

---

# Phase 1: Single-Analyst Hardening

## 1. Make the manifest the single source of truth

### Problem

The same rules are currently repeated across `AGENTS.md`, `WORKFLOW.md`, `strategies/hew/manifest.json`, specialist prompts, critic prompts, and the Atlassian reference style. Repetition creates drift: one file can change while another keeps the old rule.

### Implementation

- Keep substantive rules in `strategies/hew/manifest.json` only:
  - stage gates,
  - required package fields,
  - visual pivot protocol,
  - Copsey/HEW ratio universe,
  - no-orphan-ABC requirement,
  - drawing grammar,
  - confidence caps,
  - critic checklist,
  - zone-first language constraints,
  - fallback policy.
- Convert `AGENTS.md` into a short routing and repository-shape document.
- Convert `WORKFLOW.md` into a short readable index of the manifest gates, or generate it from manifest sections.
- Keep `agents/harmonic-elliott-wave-analyst.md` thin:
  - read the manifest,
  - follow stages,
  - stop on failed gate,
  - do not override the manifest.
- Keep `docs/hew-atlassian-reference-style.md` as style guidance only, not rule authority.

### Acceptance criteria

- No hard HEW rule exists only outside the manifest.
- Repeated wording in docs is either removed or clearly marked as a summary.
- Validator and prompts refer back to manifest rule IDs.

---

## 2. Add raw evidence artifacts to every package

### Problem

Current packages embed important raw rows and verification notes inside `evidence.json`, but the audit trail is still too prose-dependent. Institutional review needs raw data artifacts that can be diffed, hashed, and revalidated.

### New package shape

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
  journal.md
  evidence.json
  committee_brief.md
  raw/
    kpe_monthly.jsonl
    kpe_weekly.jsonl
    kpe_daily.jsonl
    ohlcv_monthly.csv
    ohlcv_weekly.csv
    ohlcv_daily.csv
    draw_list_before.json
    draw_list_after.json
    chart_state_final.json
    hashes.json
  screenshots/
```

### Required trace

Every accepted pivot must be traceable through this chain:

```text
KPE row -> OHLCV verification -> pivot_id -> drawing point -> ratio calculation -> zone score
```

### Implementation details

- Add `raw_artifacts` to `evidence.json`.
- Store raw KPE rows exactly as exported.
- Store OHLCV summaries or full OHLCV ranges used for verification.
- Store chart state and draw lists before and after strategy-proof mode.
- Hash all raw files and record the hashes in `raw/hashes.json` and `evidence.json.raw_artifacts`.

### Acceptance criteria

- Package fails if required raw files are missing.
- Package fails if a referenced raw file hash does not match.
- Package fails if accepted pivots cannot be traced to raw KPE rows.

---

## 3. Pivot-lock drawing geometry

### Problem

Price arrays like `[23.80, 53.45, 43.11, 98.21, 65.17, 149.80]` are useful but insufficient. A reviewer needs to know exactly which verified pivot each Elliott point represents.

### New drawing point schema

```json
{
  "label": "1",
  "role": "wave_1_high",
  "pivot_id": "w_2017_11_high_53_45",
  "date": "2017-11-13 09:30",
  "time": 1510583400000,
  "price": 53.45,
  "source_row_id": "W_1510583400000_H",
  "ohlcv_check_id": "w_2017_11_high_53_45"
}
```

### Projection point schema

Projected points must not pretend to be verified pivots.

```json
{
  "label": "3",
  "role": "projected_wave_3",
  "point_status": "projected",
  "price": 149.31,
  "projection_formula_id": "conditional_projection_wave3",
  "source_pivots": [
    "d_2026_04_low_56_01",
    "d_2026_05_high_96_32",
    "projected_wave_2_78_20"
  ]
}
```

### Implementation

- Add `points[]` to every drawing manifest item that represents count geometry.
- Keep `levels[]` only as a derived/backward-compatible convenience field during migration.
- Validator recomputes `levels[]` from `points[]` where possible.
- Reject count drawings with prices but no pivot/projection provenance.

### Acceptance criteria

- Elliott count drawings fail if any real point lacks `pivot_id`, `source_row_id`, or OHLCV verification.
- Projection drawings fail if projected points lack `projection_formula_id`.
- Zone rectangles fail if boundaries lack either pivot references or projection references.

---

## 4. Validate between stages

### Problem

End-only validation catches problems after the package has already been written. That wastes effort and allows narrative prose to form around invalid evidence.

### Stage validation model

Add support for stage-specific validation, ideally through the existing validator:

```bash
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage extraction
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage verification
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage anchors
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage ratios
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage drawings
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage writing
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage critic
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage final
```

### Stage gates

| Stage | Required checks |
| --- | --- |
| `extraction` | KPE rows exist; profile matches manifest; monthly/weekly/daily present; raw files saved. |
| `verification` | Accepted pivots match OHLCV within tolerance; conflicts resolved or downgraded. |
| `anchors` | Hypotheses exist; primary and alternates are structurally distinct; scanner is not count authority. |
| `ratios` | HEW hard rules pass or downgrade blocks action; Wave 3 status separates live count from conditional projection. |
| `drawings` | Native Elliott tools only; drawing points are pivot-locked; zones have boundary provenance. |
| `writing` | Journal, evidence, screenshots, raw artifacts, and brief align. |
| `critic` | Critic has blocking/material findings, evidence grade, visual verdict, and trade-permission verdict. |
| `final` | Package validity, evidence grade, trade permission, confidence, and status are consistent. |

### Acceptance criteria

- Failed stage blocks subsequent stage.
- `pass_with_fallback` in core structure prevents actionable output.
- Stage errors are machine-readable and specific.

---

## 5. Split package validity from trade permission

### Problem

A package can be complete and still not actionable. Current `status` alone is too overloaded.

### New status block

```json
"verdict": {
  "package_validity": "pass",
  "evidence_grade": "qualified",
  "trade_permission": "blocked",
  "posture": "NO CLEAN TRADE",
  "confidence": "low",
  "confidence_cap_reason": "Live recovery failed Wave 3 floor; macro Waves 1/5 remain visible-equivalent context."
}
```

### Allowed values

```text
package_validity: pass | fail
vidence_grade: clean | qualified | failed
trade_permission: allowed | blocked
confidence: high | medium | low | very_low
```

### Rules

- Missing raw evidence -> `package_validity = fail`.
- Core `pass_with_fallback` -> `evidence_grade = qualified`.
- Live Wave 3 failure -> `trade_permission = blocked`.
- Uncalibrated zone model -> confidence cannot be `high`.
- Any core drawing without pivot-locked geometry -> `package_validity = fail`.
- Any package with `trade_permission = blocked` cannot use `ACTIONABLE`.

### Acceptance criteria

- Validator enforces consistency between `status`, `verdict`, `confidence`, `no_trade_gate`, and `trade_posture`.
- Journal starts with posture, but evidence carries the full verdict object.

---

## 6. Rename probabilities to zone scores until calibrated

### Problem

The workflow currently uses numeric accumulation/distribution percentages. They are useful, but they are not yet calibrated probabilities.

### New schema

```json
{
  "id": "near_distribution_box",
  "zone_type": "distribution",
  "price_range": { "low": 96.32, "high": 119.73 },
  "zone_score": {
    "model_version": "zone_score_v1",
    "calibrated_probability": false,
    "score": 61,
    "band": "high",
    "drivers": [
      "actual_recovery_wave3_failed_1764_floor",
      "weekly_monthly_ao_negative",
      "overhead_supply_box",
      "last_daily_kpe_high"
    ]
  }
}
```

### Implementation

- Keep the 0-100 values, but rename `probability.value` to `zone_score.score`.
- Keep `band` as a decision aid.
- Add `model_version`.
- Add `calibrated_probability: false`.
- Add qualitative drivers.
- Optional later: add numeric weights after fixtures and historical calibration.

### Acceptance criteria

- No package calls a zone score a calibrated probability unless `calibrated_probability = true` and a calibration set is provided.
- Final prose uses `score` or `read`, not statistical probability language.

---

## 7. Add visual QA gates

### Problem

Some screenshots are audit-useful but not committee-readable. Extraction screenshots may be noisy, but final screenshots must stand alone.

### Screenshot classes

```text
audit screenshots:
  exporter visible, KPE rows visible, extraction scaffolding allowed

decision screenshots:
  clean chart, no sidebars, no exporter, zones labeled, posture obvious
```

### Visual QA checklist

Add `visual_qa` under `execution_quality`:

```json
"visual_qa": {
  "final_chart_stands_alone": true,
  "sidebars_hidden": true,
  "exporter_hidden_in_presentation": true,
  "zone_labels_visible": true,
  "zone_price_ranges_visible": true,
  "zone_scores_visible": true,
  "elliott_labels_readable": true,
  "audit_screenshots_marked_audit_only": true,
  "issues": []
}
```

### Fail or downgrade if

- Final zones are unlabeled.
- KPE extraction screenshot is unreadable and raw rows are missing.
- Exporter remains visible in presentation mode.
- Sidebars or watchlists clutter final screenshot.
- Elliott labels materially overlap.
- Final chart cannot be understood without the journal.

### Acceptance criteria

- Decision screenshot has labeled accumulation/distribution zones with score/band and price range.
- Audit screenshots are allowed to be noisy only if raw artifacts are complete.

---

## 8. Make critic review hostile and structured

### Problem

A critic that simply confirms contract compliance is not enough. It must identify what could be wrong, even when the package is valid.

### New critic output schema

```json
"critic_review": {
  "final_verdict": "pass",
  "package_validity_verdict": "pass",
  "evidence_grade_verdict": "qualified",
  "trade_permission_verdict": "blocked",
  "visual_readability_verdict": "pass_with_notes",
  "blocking_issues": [],
  "material_non_blocking_issues": [
    {
      "id": "visible_equivalent_macro_waves_1_5",
      "severity": "material",
      "evidence": "Macro Waves 1 and 5 remain visible-equivalent rather than fully decomposed.",
      "effect": "Caps evidence grade at qualified and confidence at low."
    }
  ],
  "strongest_bear_case_against_package": "...",
  "strongest_bull_case_against_package": "...",
  "required_followups": []
}
```

### Implementation

- Keep critic in Phase 1 as a prompt/process, not a new subagent pipeline.
- Require critic to list material non-blocking issues when confidence is low or evidence grade is qualified.
- Reject `findings: []` when any core fallback exists.
- Prefer code checks first; LLM critic handles judgment that scripts cannot.

### Acceptance criteria

- Critic verdict cannot be a bland pass when important caveats exist.
- Critic explicitly confirms or rejects trade permission.
- Critic explicitly evaluates visual readability.

---

## 9. Add regression fixtures

### Problem

The repo has a strong reference package but not enough regression coverage. Prompt, manifest, and validator changes need fixture-based safety.

### Initial fixtures

```text
fixtures/hew/good/team_no_clean_trade/
fixtures/hew/bad/unreadable_kpe/
fixtures/hew/bad/drawing_without_pivot_ids/
fixtures/hew/bad/actionable_with_fallback/
fixtures/hew/bad/conditional_wave3_marked_live_pass/
```

### Fixture contents

```text
input/
  raw/
  screenshots/
  minimal_chart_state.json
expected/
  evidence.expected.json
  validator.expected.json
README.md
```

### Acceptance criteria

- Good fixture passes final validation.
- Every bad fixture fails for the expected reason.
- CI runs fixture tests before package validator tests.

---

## 10. Add `committee_brief.md`

### Purpose

Institutional workflows need a one-page decision memo separate from the full journal.

### Template

```markdown
# <SYMBOL> HEW Committee Brief - <DATE>

## Verdict

Posture: NO CLEAN TRADE  
Package validity: pass  
Evidence grade: qualified  
Trade permission: blocked  
Confidence: low  

## Why

- Live recovery failed the HEW Wave 3 floor.
- Current accumulation zone score is lower than nearby distribution zone score.
- Macro correction remains unresolved.

## Current zone

- Accumulation: 78.20-96.32, score 44, moderate.
- Distribution: 96.32-119.73, score 61, high.

## What changes the read

- Accumulation improves if weekly structure holds inside the box while AO/volume stop deteriorating.
- Distribution risk reduces only if weekly absorption clears the overhead box with improving AO/volume.

## Do nothing on

- Do not treat the 56.01 low as confirmed while the live recovery has not proven HEW impulse quality.
```

### Acceptance criteria

- Brief must be generated from `evidence.json`, not manually invented.
- Brief must not introduce levels or claims absent from evidence.

---

# Phase 1 Implementation Order

## PR 1 - Package v2 raw evidence

- Add `raw_artifacts` manifest section.
- Add package shape checks for `raw/`.
- Add hash validation.
- Update TEAM package or create TEAM v2 fixture with raw placeholders.

## PR 2 - Pivot-locked drawing schema

- Add `points[]` schema to drawing manifest.
- Keep `levels[]` temporarily for backward compatibility.
- Add validator checks linking drawing points to verified pivots.
- Add projection point support.

## PR 3 - Stage validation

- Extend `scripts/validate_evidence.mjs` with `--stage`.
- Add extraction, verification, anchors, ratios, drawings, writing, critic, and final stage checks.
- Fail closed on missing prerequisites.

## PR 4 - Verdict and zone score schema

- Add `verdict` object.
- Rename or mirror `zone_probabilities` to `zone_scores`.
- Enforce consistency between fallback, confidence, and trade permission.
- Keep backward compatibility during migration.

## PR 5 - Visual QA and critic structure

- Add `execution_quality.visual_qa`.
- Add final chart readability requirements.
- Expand critic schema with blocking/material issue lists and trade-permission verdict.
- Reject empty findings when material caveats exist.

## PR 6 - Regression fixtures and TEAM v2

- Add initial good and bad fixtures.
- Add fixture test runner.
- Convert TEAM into v2 package or create a v2 reference fixture.
- Confirm old TEAM remains useful as historical reference but new packages follow v2.

---

# Phase 2: Subagent Pipeline, Deferred

Do not start Phase 2 until Phase 1 has:

- raw artifacts,
- pivot-locked drawings,
- stage validators,
- verdict split,
- zone score schema,
- visual QA,
- critic structure,
- regression fixtures.

After that, split the work into smaller tool-limited roles:

```text
Extractor
Verifier
Anchor proposer
Mechanical validator
Drawer
Writer
Critic
```

The goal of Phase 2 is not more sophistication. The goal is tool separation:

- Extractor cannot count.
- Verifier cannot draw.
- Anchor proposer cannot see scanner output before committing anchors.
- Writer cannot revise counts.
- Critic sees package artifacts, not analyst chat history.

---

# Definition of done for institutional grade v1

The workflow reaches institutional-grade v1 when a package can answer yes to all of these:

1. Can another reviewer reproduce the accepted pivots from raw KPE rows and OHLCV files?
2. Can every Elliott point be traced to a verified pivot or declared projection formula?
3. Does validation fail before narrative writing if extraction, verification, or ratio rules fail?
4. Does the package separate validity, evidence quality, trade permission, and confidence?
5. Are zone scores honest about being uncalibrated?
6. Does the final chart stand alone?
7. Does the critic identify material caveats instead of issuing a bland pass?
8. Do regression fixtures protect the workflow from prompt and validator drift?

If all eight are true, the workflow is institutionally reviewable without being overengineered.
