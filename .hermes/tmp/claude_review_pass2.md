You are Claude Code reviewing Johan's KonsiliTradingview workflow cleanup and fresh BTC packages. Use Opus/high reasoning.

Workdir: C:/Users/Johan/Desktop/KonsiliTradingview

Review these deliverables for accuracy, stability, and efficient human-actionable analysis:
- README.md and repo cleanup diff
- AGENTS.md / WORKFLOW.md / manifests alignment
- analysis_journal/BTCUSD_2026-05-16_hew/journal.md
- analysis_journal/BTCUSD_2026-05-16_hew/evidence.json
- analysis_journal/BTCUSD_2026-05-16_wyckoff/journal.md
- analysis_journal/BTCUSD_2026-05-16_wyckoff/evidence.json

Context:
- Market facts came from TradingView MCP on BITSTAMP:BTCUSD.
- TradingView MCP symbol/timeframe commands showed drift during the run, so the packages disclose it and use final verified pane_set_symbol/chart_get_state reads.
- Validators currently pass.

Tasks:
1. Critic-review the packages against AGENTS.md and each strategy manifest.
2. Push accuracy/stability/efficiency: flag any overclaim, weak level logic, actionability mismatch, journal/evidence inconsistency, validator blind spot, or repo workflow issue.
3. Apply one final iteration of minimal fixes if needed. Keep changes narrow.
4. Run npm test plus both package validators.
5. Return: verdict, fixes made, commands/results, remaining caveats.

Constraints:
- Do not use web search.
- Do not fabricate live data or change core market levels unless the local package evidence itself contradicts them.
- Do not broaden the workflow with new frameworks.
- Do not touch unrelated analysis_journal packages.
