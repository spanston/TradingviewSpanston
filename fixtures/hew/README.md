# HEW Regression Fixtures

Fixture directories mirror the institutional v1 acceptance cases. The executable coverage lives in `tests/validate_evidence.test.mjs`, which builds complete evidence packages for these cases and runs the same validator used on real journals.

- `good/team_no_clean_trade` - valid package, qualified evidence, blocked trade permission.
- `bad/unreadable_kpe` - KPE rows missing or unreadable.
- `bad/drawing_without_pivot_ids` - Elliott drawing geometry lacks pivot/projection provenance.
- `bad/actionable_with_fallback` - fallback evidence attempts actionable output.
- `bad/conditional_wave3_marked_live_pass` - projected Wave 3 is marked complete/live.
