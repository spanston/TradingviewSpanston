# Institutional v1 Stabilization Plan

## Purpose

Stabilize the current `hew_institutional_v1` work before calling it institutional-grade v1. The latest `x3` commit moved the repo in the right direction: raw artifacts, `committee_brief.md`, verdict separation, zone scores, visual QA, critic structure, and pivot-locked drawing schema are now present. The remaining work is to make those concepts enforceable instead of mostly declared.

This plan is intentionally narrow. Do not add subagents in this phase. Do not add a dashboard. Do not add a broad market/fundamental overlay. The goal is to harden the current single-analyst workflow until validation is reproducible, stage-aware, and hard to fool.

## Current baseline

- Current institutional contract: `hew_institutional_v1`.
- Current latest commit under review: `cc16ac7833d0503bf3f8830c5f014dd5aea4135f` (`x3`).
- Current core validator: `scripts/validate_evidence.mjs`.
- Current canonical contract: `strategies/hew/manifest.json`.
- Current reference/migrated package: `analysis_journal/TEAM_2026-05-16_hew`.

## Definition of done

Institutional v1 is ready only when all of the following are true:

1. `--stage` validation runs only the checks relevant to the requested stage and can be used during package construction.
2. Historical drilldown pivots are first-class verified pivots, not downgraded to projected points.
3. `zone_scores` are canonical; legacy `zone_probabilities` cannot silently diverge.
4. Any core `pass_with_fallback` forces qualified evidence, blocked trade permission, and capped confidence.
5. Regression fixtures are real pass/fail fixtures, not README placeholders.
6. Visual QA is validated from drawing/screenshot metadata where possible, not only self-attested booleans.
7. The TEAM package either passes under the new rules honestly or is clearly marked as a migrated legacy package with explicit exemptions.

---

# Priority 1 - Implement real stage validation dispatch

## Problem

`--stage` currently validates that the requested stage name is supported, but then continues to run the full final validation suite. That means `--stage extraction` still depends on later artifacts such as drawings, critic review, action rationale, zone scores, and journal alignment. This blocks true fail-fast workflow construction.

## Desired behavior

Stage validation should validate only the inputs that should exist by that stage.

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

## Implementation sketch

Refactor `validateEvidenceFile()` into reusable validation groups.

```js
const baseValidators = [
  validateTopLevel,
  validateContractVersion,
  validateStageGates
];

const stageValidators = {
  extraction: [
    validatePackageArtifacts,
    validateScreenshots,
    validateVisualPivotEvidence
  ],
  verification: [
    validatePackageArtifacts,
    validateScreenshots,
    validateVisualPivotEvidence
  ],
  anchors: [
    validatePackageArtifacts,
    validateVisualPivotEvidence,
    validateIanCopseyWaveMap,
    validateHypotheses
  ],
  ratios: [
    validateHypotheses,
    validateHewCopseyPurity,
    validateFallbackPolicy,
    validateVerdict
  ],
  drawings: [
    validateScreenshots,
    validateDrawingManifest,
    validateHewStructureContext,
    validateExecutionQuality
  ],
  writing: [
    validateJournalAlignment,
    validateZoneScores,
    validateZoneProbabilityCompatibility,
    validateActionRationale,
    validateZoneFirstLanguage
  ],
  critic: [
    validateCriticReview,
    validateCommitteeBrief,
    validateFallbackPolicy,
    validateVerdict
  ],
  final: [
    // existing full validator suite
  ]
};
```

Run `baseValidators` first, then the selected stage group. The final stage should run the complete suite.

## Stage contracts

| Stage | Should require | Should not require |
| --- | --- | --- |
| `extraction` | raw KPE files, visual pivot evidence, screenshots for extraction | hypotheses, drawings, critic, journal action output |
| `verification` | KPE rows, accepted pivots, OHLCV verification, raw OHLCV files | final drawings, critic, committee brief |
| `anchors` | verified pivots, Ian Copsey wave map, hypotheses, structural distinctness | final presentation chart, critic |
| `ratios` | hypotheses, deterministic ratio engine results, Copsey purity, fallback/verdict consistency | final screenshots and journal alignment |
| `drawings` | drawing manifest, pivot-locked points, required native tools, chart modes | critic review |
| `writing` | journal, evidence, zone scores, action rationale, no forbidden zone-first language | committee brief, fresh critic verdict |
| `critic` | hostile critic structure and verdict consistency | earlier raw extraction details beyond referenced package facts |
| `final` | everything | nothing |

## Acceptance criteria

- `--stage extraction` can pass with no `critic_review`, no `action_rationale`, no final drawing manifest.
- `--stage drawings` fails if Elliott drawings lack pivot-locked points.
- `--stage final` still runs the complete validator suite.
- Tests exist for every stage proving that later-stage fields are not required early.

---

# Priority 2 - Promote historical drilldown pivots to first-class verified pivots

## Problem

The TEAM package contains historical weekly KPE drilldown rows for macro Wave 3 internals, but the drawing manifest marks several of those real historical points as `point_status: "projected"`. That weakens pivot-locked geometry and makes real data look synthetic.

## Required change

`collectVerifiedPivotMaps()` must index both:

- `visual_pivot_evidence.timeframes[*].pivots`
- `visual_pivot_evidence.historical_drilldowns[*].pivots` or parsed `historical_drilldowns[*].exporter_rows`

## Implementation sketch

Add a normalizer for historical drilldowns.

```js
function collectHistoricalDrilldownPivots(evidence) {
  const results = [];
  for (const drilldown of asArray(evidence.visual_pivot_evidence?.historical_drilldowns)) {
    const parsed = parsePivotExporterRows(drilldown.exporter_rows || [], {
      rowPrefix: 'KPE',
      version: 2
    });
    for (const pivot of parsed.pivots) {
      results.push({
        id: pivot.id_normalized || normalizeKpePivotId(pivot),
        type: pivot.type,
        date: pivot.date,
        time: pivot.time,
        price: pivot.price,
        exporter_row_id: pivot.id,
        drilldown_id: drilldown.id,
        screenshot: drilldown.screenshot
      });
    }
  }
  return results;
}
```

Then make `collectVerifiedPivotMaps()` include those pivots and their `ohlcv_verification` rows.

## TEAM package correction

Change macro Wave 3 internal subwave points from this pattern:

```json
{
  "label": "1",
  "point_status": "projected",
  "price": 53.45,
  "projection_formula_id": "focused_weekly_kpe_drilldown_wave1"
}
```

to verified pivot-locked points:

```json
{
  "label": "1",
  "pivot_id": "w_2017_11_high_53_45",
  "date": "2017-11-13 09:30",
  "time": 1510583400000,
  "price": 53.45,
  "source_row_id": "W_1510583400000_H",
  "ohlcv_check_id": "w_2017_11_high_53_45"
}
```

Apply the same correction for `43.11`, `98.21`, and `65.17`.

## Acceptance criteria

- Real historical drilldown points cannot be marked as projected when a matching KPE row exists.
- TEAM macro Wave 3 internals are fully pivot-locked to weekly drilldown KPE rows.
- Validator fails if a drawing marks a price as projected while the same price/timeframe exists as a verified KPE drilldown pivot.

---

# Priority 3 - Make `zone_scores` canonical and control legacy `zone_probabilities`

## Problem

The manifest currently requires both `zone_probabilities` and `zone_scores`. This creates two truth surfaces. A package can accidentally update one and leave the other stale.

## Policy

`zone_scores` are canonical. `zone_probabilities` are temporary legacy compatibility only.

## Implementation options

### Option A - One-commit compatibility bridge

Keep `zone_probabilities` optional. If present, it must match `zone_scores`.

Validator rule:

```text
For each zone_score:
  matching legacy zone_probability id must either be absent or match:
    zone_type
    price_range.low
    price_range.high
    score == probability.value
    band == probability.band
```

### Option B - Immediate institutional cleanup

Remove `zone_probabilities` from `manifest.required_top_level` and stop validating it for `hew_institutional_v1` packages.

## Recommendation

Use Option A for one commit so migrated packages remain readable, then remove `zone_probabilities` in the next contract version.

## Implementation sketch

Add `validateZoneProbabilityCompatibility(evidence, manifest, errors)`.

```js
function validateZoneProbabilityCompatibility(evidence, manifest, errors) {
  const legacy = new Map(asArray(evidence.zone_probabilities).map((zone) => [zone.id, zone]));
  for (const scoreZone of asArray(evidence.zone_scores)) {
    const legacyZone = legacy.get(scoreZone.id);
    if (!legacyZone) continue;
    if (legacyZone.zone_type !== scoreZone.zone_type) errors.push(...);
    if (legacyZone.price_range.low !== scoreZone.price_range.low) errors.push(...);
    if (legacyZone.price_range.high !== scoreZone.price_range.high) errors.push(...);
    if (legacyZone.probability.value !== scoreZone.zone_score.score) errors.push(...);
    if (legacyZone.probability.band !== scoreZone.zone_score.band) errors.push(...);
  }
}
```

## Acceptance criteria

- `zone_scores` are required.
- `zone_probabilities` are optional or explicitly legacy.
- If both exist, they cannot disagree.
- New prose and docs use `zone score`, not `probability`, except when referring to legacy fields.

---

# Priority 4 - Enforce fallback, verdict, and trade-permission consistency

## Problem

Fallback currently caps confidence and blocks actionable output, but it does not force `verdict.evidence_grade = qualified`. The system should not allow a package to contain core `pass_with_fallback` while claiming clean evidence.

## Rules to enforce

```text
Any pass_with_fallback in core evidence:
  verdict.evidence_grade must be qualified
  verdict.trade_permission must be blocked
  verdict.confidence must be low or very_low
  confidence.rating must be low or very_low
  confidence.cap_reason must mention fallback
  action_rationale.selected_action must be non-actionable
```

Additional consistency rules:

```text
verdict.trade_permission = blocked -> status/posture cannot be ACTIONABLE
verdict.evidence_grade = failed -> package_validity must be fail
missing raw artifacts -> package_validity must be fail
live actual Wave 3 failure -> trade_permission must be blocked
```

## Implementation sketch

Extend `validateFallbackPolicy()` and `validateVerdict()`.

```js
if (fallbackPaths.length) {
  if (evidence.verdict?.evidence_grade !== 'qualified') {
    errors.push('verdict.evidence_grade must be qualified when fallback is used');
  }
  if (evidence.verdict?.trade_permission !== 'blocked') {
    errors.push('verdict.trade_permission must be blocked when fallback is used');
  }
}
```

Add a helper for live Wave 3 failures.

```js
function hasLiveWave3Failure(evidence) {
  return asArray(evidence.ratio_validation).some((item) =>
    /actual|live|rebound/i.test(item.id || '') && item.status === 'fail'
  );
}
```

Then enforce blocked trade permission when live Wave 3 fails.

## Acceptance criteria

- A bad fixture with fallback + `evidence_grade: clean` fails.
- A bad fixture with fallback + `trade_permission: allowed` fails.
- A package with actual live Wave 3 failure cannot be `ACTIONABLE`.
- TEAM remains `qualified`, `blocked`, `low`.

---

# Priority 5 - Replace placeholder fixture checks with real regression fixtures

## Problem

The fixture directories currently exist, but tests only check that each has a `README.md`. That protects directory names, not validator behavior.

## Required fixture shape

```text
fixtures/hew/<good|bad>/<fixture_name>/
  input/
    evidence.json
    journal.md
    committee_brief.md
    raw/
    screenshots/
  expected/
    validator.json
  README.md
```

## Initial fixtures

```text
fixtures/hew/good/team_no_clean_trade/
fixtures/hew/bad/unreadable_kpe/
fixtures/hew/bad/drawing_without_pivot_ids/
fixtures/hew/bad/actionable_with_fallback/
fixtures/hew/bad/conditional_wave3_marked_live_pass/
```

## Expected validator format

```json
{
  "should_pass": false,
  "expected_error_patterns": [
    "drawing_manifest.*points must be a non-empty pivot-locked geometry array"
  ]
}
```

## Test runner behavior

- For each good fixture, run final validation and require zero errors.
- For each bad fixture, run final validation and require failure matching expected patterns.
- Also run selected stage validations for fixtures that target stage behavior.

## Acceptance criteria

- Fixture tests fail if a bad fixture accidentally passes.
- Fixture tests fail if a good fixture starts failing.
- Each known institutional failure mode has at least one fixture.

---

# Priority 6 - Make visual QA metadata-driven

## Problem

`execution_quality.visual_qa` currently relies on booleans such as `zone_labels_visible` and `final_chart_stands_alone`. Those can be asserted incorrectly.

## Practical v1 approach

Do not add image recognition yet. Validate visual QA from drawing metadata and raw draw lists.

## Required drawing metadata

Zone drawings in final presentation must include visible label metadata.

```json
{
  "id": "near_distribution_box",
  "role": "zone",
  "tool": "rectangle",
  "screenshot": "screenshots/trade_posture.png",
  "price_range": { "low": 96.32, "high": 119.73 },
  "visible_label": {
    "text": "DIST 96.32-119.73 | score 61 | high",
    "includes_zone_type": true,
    "includes_range": true,
    "includes_score": true,
    "visible_on_final_chart": true
  }
}
```

## Validator checks

- Every final `zone` drawing must have `visible_label`.
- `visible_label.text` must include:
  - accumulation/distribution abbreviation or full word,
  - price range,
  - score,
  - band if available.
- `draw_list_after.json` must contain matching zone drawing IDs or labels when available.
- `execution_quality.visual_qa.zone_labels_visible` cannot be true if final zone drawings lack visible labels.
- Migration exemptions must be explicit and cannot apply to new packages.

## Acceptance criteria

- A bad fixture with unlabeled final zones fails visual QA.
- TEAM can either be updated with visible labels or explicitly marked as a migrated package with visual QA limitations.
- New packages cannot pass visual QA by boolean self-attestation alone.

---

# Priority 7 - Add a migration policy for accepted legacy packages

## Problem

TEAM is now a migrated v8 package. Some artifacts, such as original `draw_list_before`, were not captured at the time of creation. The package should be preserved as a reference, but it should not weaken standards for new packages.

## Policy

Add `migration_policy` to the manifest or evidence:

```json
{
  "migration_policy": {
    "is_migrated_package": true,
    "source_contract_version": "hew_stage_gated_v8_math_core",
    "target_contract_version": "hew_institutional_v1",
    "allowed_exemptions": [
      "draw_list_before_original_not_available"
    ],
    "exemption_effect": "evidence_grade_qualified_trade_permission_blocked"
  }
}
```

## Rules

- New packages cannot use migration exemptions.
- Migrated packages with exemptions must be `evidence_grade: qualified` and `trade_permission: blocked`.
- Migration exemptions must be listed in critic material non-blocking issues.

## Acceptance criteria

- TEAM migration passes only because exemptions are explicit.
- A new package cannot use the same exemption.
- Migration exemptions never allow `ACTIONABLE`.

---

# Patch order

## Patch 1 - Stage dispatch

Files:

- `scripts/validate_evidence.mjs`
- `tests/validate_evidence.test.mjs`
- `AGENTS.md` (add `--stage` flag usage examples)
- `WORKFLOW.md` (document stage-aware validation invocation)

Tasks:

- Add validation group dispatcher.
- Add stage-specific tests.
- Ensure `--stage extraction` does not require final-stage fields.
- Update AGENTS.md final answer standard and WORKFLOW.md validation section to reference `--stage`.

## Patch 2 - Historical drilldown pivot locking

Files:

- `scripts/validate_evidence.mjs`
- `strategies/hew/manifest.json` (add `historical_drilldowns` sub-schema to `visual_pivot_evidence`)
- `analysis_journal/TEAM_2026-05-16_hew/evidence.json`
- `tests/validate_evidence.test.mjs`

Tasks:

- Add `historical_drilldowns` field definition to manifest `visual_pivot_protocol`.
- Index `historical_drilldowns` KPE rows and OHLCV checks.
- Fix TEAM macro Wave 3 internal drawing points.
- Add test that verified drilldown pivots cannot be marked projected.

## Patch 3 - Zone score canonicalization

Files:

- `strategies/hew/manifest.json`
- `scripts/validate_evidence.mjs`
- `analysis_journal/TEAM_2026-05-16_hew/evidence.json`
- `WORKFLOW.md` (replace zone_probability references with zone_scores)
- `docs/hew-atlassian-reference-style.md` (update probability language to score language)

Tasks:

- Make `zone_scores` canonical.
- Add compatibility validator for legacy `zone_probabilities`.
- Remove or downgrade legacy required field.

## Patch 4 - Fallback/verdict consistency

Files:

- `scripts/validate_evidence.mjs`
- `tests/validate_evidence.test.mjs`

Tasks:

- Enforce fallback -> qualified/blocked/low.
- Enforce live Wave 3 fail -> blocked.
- Add bad fixture coverage.

## Patch 5 - Real fixtures

Files:

- `fixtures/hew/**`
- `tests/validate_evidence.test.mjs`

Tasks:

- Replace README-only fixture checks with actual evidence fixtures.
- Add expected error pattern runner.

## Patch 6 - Metadata-driven visual QA

Files:

- `strategies/hew/manifest.json`
- `scripts/validate_evidence.mjs`
- `analysis_journal/TEAM_2026-05-16_hew/evidence.json`
- `tests/validate_evidence.test.mjs`

Tasks:

- Add `visible_label` schema for final zone drawings.
- Validate label text/range/score.
- Add unlabeled-zone bad fixture.

## Patch 7 - Migration policy

Files:

- `strategies/hew/manifest.json`
- `analysis_journal/TEAM_2026-05-16_hew/evidence.json`
- `scripts/validate_evidence.mjs`
- `WORKFLOW.md` (document migration policy and exemption rules)

Tasks:

- Add explicit migrated-package policy.
- Prevent new packages from using migration exemptions.
- Tie migration exemptions to qualified/blocked verdict.

---

# Things not to do in this stabilization phase

- Do not implement subagents.
- Do not add a dashboard.
- Do not add image/OCR-based visual QA.
- Do not add market/fundamental context overlay.
- Do not start probability calibration.
- Do not add deterministic drawing emitter until validator semantics are stable.

---

# Final stabilization checklist

Before calling the repo institutional-grade v1, run:

```bash
npm test
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage extraction
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage verification
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage anchors
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage ratios
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage drawings
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage writing
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage critic
npm run validate:hew -- analysis_journal/TEAM_2026-05-16_hew/evidence.json --stage final
```

All must pass for accepted packages. Bad fixtures must fail for the expected reason.
