You are Claude Code acting as Johan's repo workflow reviewer/refactorer. Use model Opus/high reasoning.

Workdir: C:/Users/Johan/Desktop/KonsiliTradingview

Task: Dry-run the current workflow contract, then streamline it. Remove or update material that is not aligned with the current purpose: accurate, human-actionable TradingView analysis packages with stage-gated evidence. Keep the repo narrow and stable.

Required reads first:
1. AGENTS.md
2. WORKFLOW.md
3. README.md
4. CLAUDE.md
5. package.json
6. strategies/hew/manifest.json
7. strategies/wyckoff/manifest.json
8. agents/harmonic-elliott-wave-analyst.md
9. agents/wyckoff-macro-analyst.md
10. scripts/validate_evidence.mjs and tests/validate_evidence.test.mjs

Constraints:
- Do NOT touch analysis_journal packages in this pass.
- Do NOT use web search.
- Do NOT invent new broad framework files.
- Prefer deleting stale compatibility cruft or updating stale docs over adding more prose.
- If you remove files, only remove files that are clearly stale wrappers or misaligned with the manifest-driven contract; leave durable source-of-truth files intact.
- Keep AGENTS.md as the boot manual, WORKFLOW.md as stage gates, manifests as executable contracts, agents as compact prompts, validator as enforcement.
- Run npm test after any change.

Expected output:
- What dry-run found.
- What you changed, with file paths.
- Any rejected change and why.
- Test result.
- Remaining blocker/risk before live BTC HEW + Wyckoff analysis.
