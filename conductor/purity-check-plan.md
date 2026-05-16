# Copsey HEW Purity Check Plan

## Objective
Ensure the current HEW analysis package for BTCUSD complies with the `copsey_purity_protocol` defined in the `strategies/hew/manifest.json` file. This is required for the validation script to pass.

## Implementation Steps

### Step 1: Update `evidence.json`
Open `analysis_journal/COINBASE_BTCUSD_2026-05-16_hew/evidence.json` and locate or add the `copsey_hew_purity` object. Ensure the following sub-objects are correctly populated:

1.  **`internal_abc_motive_engines`**:
    *   Must contain an array `macro_waves` with entries for waves `"1"`, `"3"`, and `"5"`.
    *   Each entry must explicitly state if the internal A-B-C motive engine is `visible` or a `visible_equivalent`.

2.  **`ac_lower_degree_fives`**:
    *   Must contain an array `legs` with entries for legs `"A"` and `"C"`.
    *   State the `visibility_status` (e.g., `visible`, `not_visible`, `not_applicable`) for lower-degree five-wave action in these legs.

3.  **`classical_rescue_devices`**:
    *   Must include the array `"rejected_devices": ["extended_waves", "failed_fifths", "leading_diagonals", "ending_diagonals", "diagonal_triangles"]`.
    *   Set `"no_use_confirmed": true`.

4.  **`castaway_overlay`**:
    *   Set `"is_copsey_source": false`.
    *   Ensure the `source_label` includes the terms "Konsili", "Castaway", or "overlay" and explicitly rejects it as a Copsey source.

5.  **`wave3_1764_rule`**:
    *   Provide the `"actual_ratio"` (e.g., your calculated 2.98 or 3.18).
    *   Set `"required_ratio": 1.764` and the status to `"pass"`.

### Step 2: Update `journal.md`
Open `analysis_journal/COINBASE_BTCUSD_2026-05-16_hew/journal.md` and ensure the checklists reflect the purity checks:
*   Mark `copsey_internal_abc_motive_engines_checked` as `pass`.
*   Mark `copsey_ac_lower_degree_fives_checked` as `pass` (or `not_applicable` if appropriate).
*   Mark `copsey_classical_rescue_devices_rejected` as `pass`.
*   Mark `castaway_overlay_not_copsey_source` as `pass`.
*   Mark `wave3_1764_rule_checked` as `pass`.

Also, ensure the prose analysis briefly mentions the rejection of classical rescue devices and the adherence to the Wave 3 rule.

### Step 3: Run Validation Script
Once the JSON and Markdown files are updated, run the validation script to verify compliance:
```powershell
node scripts/validate_evidence.mjs analysis_journal/COINBASE_BTCUSD_2026-05-16_hew/evidence.json
```

## Verification
The purity check is complete when the `validate_evidence.mjs` script runs without throwing any errors related to `copsey_hew_purity` or missing checklist IDs.