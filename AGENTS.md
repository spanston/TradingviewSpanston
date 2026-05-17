# KonsiliTradingview Agent Instructions

This is the canonical project entrypoint after system/developer instructions. Read this file first, then load only the files needed for the current task.

The repo has one analysis lane: Ian Copsey / Fractal Forecasting. The internal strategy id is `hew`. The job is to produce accurate, human-actionable TradingView analysis packages, not impressive-looking charts with weak evidence.

## Source Of Truth

Use this small authority stack:

1. `AGENTS.md` - routing, context budget, and non-negotiables.
2. `WORKFLOW.md` - the human-readable run sequence from blank chart to final package.
3. `strategies/hew/manifest.json` - executable evidence, drawing, language, and action contract.
4. `scripts/validate_evidence.mjs` - validator.
5. `agents/harmonic-elliott-wave-analyst.md` - HEW specialist role.
6. `agents/hew-independent-critic.md` - independent final critic role.
7. `docs/hew-atlassian-reference-style.md` - style reference only.

Do not duplicate or invent strategy rules in ad-hoc prose. If a required field, drawing role, checklist item, screenshot role, critic rule, or forbidden language rule changes, update `strategies/hew/manifest.json` first and then adjust the validator/tests.

## Loading Discipline

Keep context lean.

- For repo or workflow edits: load `WORKFLOW.md`, `strategies/hew/manifest.json`, the touched prompt/doc, and relevant tests.
- For HEW package creation/review: load `WORKFLOW.md`, `strategies/hew/manifest.json`, `docs/hew-atlassian-reference-style.md`, and the relevant package only.
- For critic work: additionally load `agents/hew-independent-critic.md`.
- Do not preload `analysis_journal`, screenshots, reports, generated artifacts, or old packages unless Johan explicitly asks to audit them.

The durable reference fixture is `fixtures/hew/good/team_no_clean_trade/input`; use it with the reference doc when a concrete style example is needed.

## Routing

Default every chart-analysis request to Ian Copsey / Fractal Forecasting (`hew`) unless Johan explicitly says the task is not chart analysis.

Do not offer unsupported method alternatives from this repo. If Johan asks for another method, state that this repo is currently HEW-only and either stay within HEW confluence or ask for permission to work outside the repo contract.

Do not use web search, news, external quote pages, or fundamentals unless Johan explicitly asks for outside context. Chart analysis comes from TradingView MCP and local repo files.

## Analysis Contract

For serious chart analysis, follow `WORKFLOW.md` exactly:

- Start from `HEW layout`; stop if it is missing unless Johan overrides.
- Work top-down: Monthly -> Weekly -> Daily. Add 4H/1H only for explicit execution work.
- Run pivot extraction as one MTF visual-first batch: Pine labels must mark actual price-wave extremes with price first and date/time second, so the screenshot can be used to choose Elliott drawing anchors. Keep the structured KPE table hidden unless visual inspection is unavailable or ambiguous. Switch Monthly, Weekly, and Daily, inspect the visible pivots, normalize label evidence through `scripts/pivot_engine.mjs` (`buildMtfPivotEvidence`), stop on any OHLCV mismatch, then select the Copsey wave map.
- Mechanical scanners may validate ratios/rules after the Copsey map is selected; they do not choose the count.
- Use native TradingView Elliott tools for count/subwave/projection proof; no `trend_line` or horizontal-line count substitutes.
- Keep final charts clean: extraction scaffolding hidden unless audit mode is explicit.
- Fill the package contract and run the stage/final validators before calling work complete.

If a gate fails, downgrade or stop. Do not keep confident trade language after missing evidence.

## Package Contract

Serious HEW packages live at:

```text
analysis_journal/<SYMBOL>_<YYYY-MM-DD>_hew/
  journal.md
  evidence.json
  committee_brief.md
  raw/
  screenshots/
```

Raw audit files stay under `raw/`; screenshots stay under `screenshots/`; `journal.md` embeds package-relative screenshot links. The journal, evidence, screenshots, raw hashes, live chart proof, and final answer must describe the same levels, zones, posture, and count state.

## Validation

Before calling a package done:

```bash
npm test
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage extraction
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage verification
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage anchors
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage ratios
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage drawings
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage writing
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json --stage critic
npm run validate:hew -- analysis_journal/<PACKAGE>/evidence.json
```

Use `--stage final` or omit `--stage` for the complete suite.

## Final Answer

Lead with one of:

- `ACTIONABLE`
- `WATCHLIST ONLY`
- `NO CLEAN TRADE`
- `STAND ASIDE`

Then give the setup, active count and alternate, Copsey/HEW reason, accumulation/distribution zones with uncalibrated zone scores, invalidation/flip level, target path, and what to ignore or do nothing on. Every action must follow from the HEW count, ratio model, zone-score model, Wave-B ladder, and Castaway overlay; if that explanation is weak, the correct answer is no trade.
