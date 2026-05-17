# HEW Watchlist on Hermes Kanban — Definitive Design

Every gap I found on the prior pass, addressed. Read top-to-bottom; nothing here is optional.

---

## 0. The model, end-to-end

```
                          ┌────────────────────────────────────────┐
                          │      ~/.hermes/kanban/boards/          │
                          │            hew-watchlist/              │
                          │  kanban.db │ workspaces/ │ logs/       │
                          └────────────────────────────────────────┘
                                              ▲
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
   ┌─────────┐                          ┌─────────────┐                       ┌─────────┐
   │  cron   │ ── tick A (extract) ──► │ dispatcher  │ ── spawns workers ──► │  you    │
   │         │ ── tick B (draw)    ──► │ in gateway  │                       │ /kanban │
   │         │ ── tick C (orch)    ──► │             │                       │ + dash  │
   └─────────┘                          └─────────────┘                       └─────────┘

  Three ticks per day. Each ticks creates ONE sweep task. Profiles spawn from there.

  ┌─────────────────────────────── one sweep cycle ────────────────────────────────┐
  │                                                                                 │
  │  TICK A 06:00 UTC                                                               │
  │  ──────────────                                                                 │
  │  cron → "extract sweep {date}"  →  hew-tv-chart (concurrency=1, owns chart)    │
  │      for sym in watchlist:                                                      │
  │        chart_set_symbol → layout_switch(hew) → MODE=extraction                  │
  │        KPE extract + OHLCV verify + screenshot   → snapshot.json                │
  │        kanban_create count-{sym}-{date} → hew-analyst (parallel, no chart)     │
  │                                                                                 │
  │  TICK B 08:00 UTC                                                               │
  │  ──────────────                                                                 │
  │  cron → "draw sweep {date}"  →  hew-tv-chart (same single worker)              │
  │      for sym where count-{sym}-{date}.status == done:                          │
  │        chart_set_symbol → MODE=strategy-proof → draw_clear → draw_shape(...)   │
  │        capture proof + MODE=presentation + capture presentation                 │
  │        → drawing.json                                                           │
  │        kanban_create writeup-{sym}-{date} → hew-writer → critic                 │
  │                                                                                 │
  │  TICK C 10:00 UTC (and every 30min lightweight)                                 │
  │  ───────────────                                                                │
  │  cron → "orchestrate {date}"  →  hew-orchestrator                               │
  │    - diff each completed critic-{sym}-{date} vs state/<sym>.json               │
  │    - send gateway alerts on change                                              │
  │    - kanban_create remediation for blocked critic tasks (one shot)              │
  │    - rotate state, archive old journals                                         │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Board, profiles, models, memory keys

```bash
hermes kanban boards create hew-watchlist \
    --name "HEW Watchlist" --icon 📈 --switch
```

### Profile definitions (all five)

| Profile | Model | System prompt | Toolsets | Memory key | Concurrency |
|---|---|---|---|---|---|
| `hew-tv-chart` | Sonnet (cheap, mechanical) | `agents/tv-chart-protocol.md` | `kanban`, `memory`, `tradingview-mcp`, `filesystem` | `tv-chart` (no symbol prefix) | **1** (enforced — see §3) |
| `hew-analyst` | Opus / GPT-5 (judgment matters most here) | `agents/hew-analyst-narrow.md` | `kanban`, `memory`, `filesystem` | `analyst:{sym}` (per-symbol prefix) | unlimited |
| `hew-writer` | Sonnet (template fill) | `agents/hew-writer.md` | `kanban`, `memory`, `filesystem` | `writer:{sym}` (style only) | unlimited |
| `hew-critic` | Opus (catches what others miss) | `agents/hew-independent-critic.md` (verbatim) | `kanban`, `filesystem` | **none — memory toolset omitted by design** | unlimited |
| `hew-orchestrator` | Haiku (cheap routing) | `agents/hew-orchestrator.md` | `kanban`, `memory`, `filesystem`, `gateway` | `orchestrator` | 1 |

**Why the critic has the memory toolset removed, not just an empty key:** if you give critic access to memory, future critic processes can read prior critic findings on the same symbol and lose independence. Toolset-level removal makes this architecturally impossible.

**Why analyst memory is keyed by symbol:** `analyst:BATS:MSTR` and `analyst:BATS:TEAM` are separate memory namespaces. The analyst's recall ("last sweep this was W3 of (i)") cannot leak across symbols.

### Prompt split (the work that fixes discipline)

`agents/harmonic-elliott-wave-analyst.md` (160 lines, mixed concerns) → three single-purpose files:

| New file | Inherits from analyst prompt | Adds | Strips |
|---|---|---|---|
| `agents/tv-chart-protocol.md` | TV MCP sections, 4 chart modes, KPE extraction, layout switching | Mode-checklist as a tool-call pattern (must capture screenshot per mode) | Count rules, ratio universe, journal templates |
| `agents/hew-analyst-narrow.md` | Copsey top-down read, ratio universe, hypothesis structure | Hard rule: never call TV tools; never write journal text | Drawing rules, extraction discipline, journal templates |
| `agents/hew-writer.md` | Evidence contract from manifest, journal/committee_brief templates, verdict protocol | Hard rule: never decide a count; never draw | TV MCP, count selection, drawing rules |

This split is the single biggest move in the redesign. Each agent literally **does not know** how to break the other agents' rules because the rules aren't in its prompt.

---

## 2. Workspace & file contracts

All tasks for one `(symbol, date)` share **one workspace dir**:

```
~/hew-watchlist/journals/{SYM}_{DATE}_hew/
  ├── snapshot.json          # written by hew-tv-chart (extract)
  ├── snapshot/
  │   ├── kpe_raw.txt        # raw KPE rows
  │   ├── ohlcv_verify.json  # OHLCV verification
  │   └── extraction_*.png   # mode=extraction + verification screenshots
  ├── count.json             # written by hew-analyst
  ├── drawing.json           # written by hew-tv-chart (draw)
  ├── drawing/
  │   ├── draw_list.json     # IDs of drawn Elliott shapes
  │   ├── strategy_proof.png # mode=strategy-proof screenshot
  │   └── presentation.png   # mode=presentation final clean screenshot
  ├── evidence.json          # written by hew-writer (matches manifest schema)
  ├── journal.md             # written by hew-writer
  ├── committee_brief.md     # written by hew-writer
  ├── raw/                   # audit artifacts (file hashes, etc.)
  └── codex_run.json         # full kanban audit: task ids, runs, attempts
```

Workspace is created **once** by the tv-chart worker on first extract and referenced by every downstream task via `--workspace dir:...`. No path-passing in task bodies — workspace dir is the contract.

### File schemas (typed contracts between agents)

`snapshot.json`:
```json
{
  "symbol": "BATS:MSTR",
  "timeframe": "1D",
  "extracted_at": "2026-05-17T06:00:00Z",
  "chart_state_hash": "sha256:...",
  "pivots": [{"id": "...", "type": "high|low", "date": "...", "price": ..., "left": 5, "right": 5, "confirmed": true}],
  "ohlcv_verification": {"all_pivots_verified": true, "discrepancies": []},
  "screenshots": {"extraction": "snapshot/extraction_full.png", "verification": "snapshot/extraction_verify.png"},
  "kpe_raw_path": "snapshot/kpe_raw.txt"
}
```

`count.json`:
```json
{
  "symbol": "BATS:MSTR", "produced_at": "...",
  "hypothesis_primary": {"id":"...", "direction":"bullish", "structure_type":"...", "pivots":[...], "measurements":[...], "ratio_score": 0.87},
  "hypothesis_alternate": {...},
  "copsey_source": {"text":"Wave 3 ext beyond 1.764 of Wave 1", "manifest_ref":"copsey_ratio_universe.wave3_min"},
  "invalidation": {"level": 342.10, "rule": "close below Wave 2 low"}
}
```

`drawing.json`:
```json
{
  "draw_list": [{"id":"D-1","tool":"elliott_impulse_wave","anchors":[...]}, ...],
  "forbidden_tools_used": [],                    // must be empty
  "mode_checklist": {"extraction": true, "verification": true, "strategy_proof": true, "presentation": true},
  "screenshots": {"strategy_proof": "...", "presentation": "..."}
}
```

`evidence.json`: matches `strategies/hew/manifest.json` schema exactly (33 required top-level fields). Validator gate.

These four files are the **only** inter-agent communication. No prompts pass context between agents.

---

## 3. Chart concurrency — solved properly

TV MCP is single-tenant on one CDP-attached chart. The previous design hand-waved this. Three layered guarantees:

### 3.1 Profile-level: only one `hew-tv-chart` task may be claimed at a time

Hermes does not (yet) expose per-profile concurrency limits in config, so enforce in the worker:

```python
# inside tv-chart-protocol.md, mandatory first action:
# 1. kanban_show()  → get task_id
# 2. acquire lock by trying to create file:
#    ~/.hermes/hew-watchlist/locks/tv-chart.lock  (open with O_CREAT|O_EXCL)
#    contents: {task_id, pid, started_at, ttl=task.max_runtime}
# 3. if lock exists AND lock.pid is alive AND not expired:
#       kanban_block(reason=f"chart busy with {existing.task_id}")
#       exit
# 4. tv_health_check → if not connected, kanban_block(reason="TV CDP disconnected")
# 5. do work
# 6. on completion: rm lock; kanban_complete
```

This is encoded in the `tv-chart-protocol.md` system prompt as a strict first-actions sequence. The lock is a file on disk; PID liveness handles crashed workers; TTL handles dispatcher reclaims.

### 3.2 Task topology: drawing tasks chain into a draw sweep, not per-symbol

The extract sweep does **not** create draw tasks per symbol. The Tick B cron creates **one** draw sweep task. The single sweep worker iterates all completed counts. This means: at most one tv-chart task exists at any time naturally.

```bash
# tick B cron:
hermes kanban --board hew-watchlist create \
    "draw sweep ${DATE}" \
    --assignee hew-tv-chart \
    --idempotency-key "draw-${DATE}" \
    --workspace "dir:${HOME}/hew-watchlist/sweeps/${DATE}/" \
    --max-runtime 4h
```

The draw sweep worker:

```
kanban_show → read sweep task
candidates = kanban_list(assignee="hew-analyst", status="done", 
                        title_filter=f"count-*-{date}")
for sym in candidates (alphabetical for determinism):
    workspace = journals/{sym}_{date}_hew/
    if drawing.json exists and validated: skip (idempotency)
    chart_set_symbol(sym); layout_switch(hew); MODE=strategy-proof
    draw_clear(scope="all_elliott")           # CRITICAL: clean slate
    read count.json
    for each measurement in count.json: draw_shape(...)
    capture strategy_proof screenshot
    MODE=presentation; hide KPE; capture presentation
    write drawing.json
    kanban_create writeup-{sym}-{date} → hew-writer with parent=this_sweep
kanban_complete
```

### 3.3 CDP reconnect handling

`tv_health_check` first. If CDP dead, `kanban_block(reason="TV session needs restart")`. Gateway notifies you. You restart TradingView + run `/kanban unblock <sweep_id>`. Sweep resumes from where it left off (idempotent by `drawing.json` presence per symbol).

---

## 4. Three ticks, day rhythm

```cron
# UTC
0 6  * * * /usr/local/bin/hew-tick-extract.sh
0 8  * * * /usr/local/bin/hew-tick-draw.sh
0 10 * * * /usr/local/bin/hew-tick-orchestrate.sh
*/30 * * * * /usr/local/bin/hew-tick-orchestrate.sh --light    # lightweight orchestrator pass
0 4 * * 0   /usr/local/bin/hew-tick-gc.sh                       # weekly GC
```

Three ticks because TV chart is serial and we want analyst reasoning to fan out in the gap between extract (06:00) and draw (08:00). Orchestrator at 10:00 does diff-and-alert. The 30-min light pass handles human-unblock comments and stuck-task warnings without redoing analysis.

`hew-tick-extract.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date -u +%Y-%m-%d)
hermes kanban --board hew-watchlist create \
    "extract sweep ${DATE}" \
    --assignee hew-tv-chart \
    --idempotency-key "extract-${DATE}" \
    --workspace "dir:${HOME}/hew-watchlist/sweeps/${DATE}/" \
    --max-runtime 4h \
    --body "$(cat <<EOF
Run extraction sweep. Read \$HOME/hew-watchlist/watchlist.yaml.
For each symbol: acquire chart lock, switch symbol+layout, MODE=extraction,
KPE extract, OHLCV verify, capture screenshots, write snapshot.json to
journals/{sym}_${DATE}_hew/, then kanban_create count-{sym}-${DATE} for hew-analyst.
On TV CDP failure: kanban_block with reason. On per-symbol failure: log to
codex_run.json, continue to next symbol.
EOF
)"
```

Symmetric scripts for draw + orchestrate.

### Idempotency contract

| Task | Idempotency key | Behavior on dup |
|---|---|---|
| Extract sweep | `extract-{date}` | second call returns existing task id |
| Per-symbol analyst | `count-{sym}-{date}` | created from extractor; dup-safe |
| Draw sweep | `draw-{date}` | second call returns existing task id |
| Per-symbol writer | `writeup-{sym}-{date}` | created from drawer; dup-safe |
| Per-symbol critic | `critic-{sym}-{date}` | created from writer |
| Orchestrator | `orchestrate-{date}` | second call returns existing |

Re-running any cron is safe.

---

## 5. Per-symbol state & change detection

`~/hew-watchlist/state/{sym}.json`:

```json
{
  "symbol": "BATS:MSTR",
  "last_sweep_date": "2026-05-17",
  "current": {
    "posture": "WATCHLIST_ONLY",
    "structure_type": "completed_primary_impulse",
    "primary_count_summary": "W3 of (i) extended to 2.34x of W1",
    "invalidation": 342.10,
    "evidence_grade": "clean",
    "trade_permission": "blocked"
  },
  "previous": { /* prior sweep's current */ },
  "history": [
    {"date": "2026-05-16", "posture": "...", "change_summary": "..."},
    ...
  ]
}
```

Written exclusively by `hew-orchestrator`. Read by orchestrator on next tick to detect changes.

### What counts as a meaningful change → alert

| Change | Alert? |
|---|---|
| `posture` flip (any → ACTIONABLE) | **yes — high priority** |
| `posture` flip (any → STAND_ASIDE) | yes |
| `trade_permission` flip (blocked → allowed) | **yes — high priority** |
| `invalidation` level changed > 2% | yes |
| `evidence_grade` degradation (clean → qualified/failed) | yes |
| `primary_count_summary` text changed but posture/permission/grade stable | low-priority digest, batched |
| Identical to prior sweep | silent — no alert |

This is the noise control. Without it you'd get 50 alerts/day saying "still in W3."

### Orchestrator decision logic (pseudo)

```python
# hew-orchestrator's mandatory pattern, encoded in its system prompt:
kanban_show()
for sym in watchlist:
    critic_task = kanban_list(title=f"critic-{sym}-{today}", status="done")
    if not critic_task: continue
    new_state = load_critic_metadata(critic_task)
    old_state = load_state_file(sym)
    diff = compute_diff(new_state, old_state)
    if diff.is_meaningful():
        alert(sym, diff)
    write_state_file(sym, new_state, history_keep=30)

# also handle blocked critics — one-pass remediation:
blocked = kanban_list(assignee="hew-critic", status="blocked")
for t in blocked:
    if "remediation_attempted" in t.metadata: continue   # one shot
    kanban_create(f"remediate-{t.symbol}-{date}", assignee="hew-writer",
                  parents=[t.id], body=f"Critic blocked: {t.summary}. Fix.",
                  metadata={"remediation_for": t.id})
    kanban_comment(t.id, "remediation dispatched")
    kanban_unblock(t.id)                # critic re-runs after writer completes
kanban_complete(summary=f"alerted={len(alerts)} remediated={len(remediations)}")
```

---

## 6. Validator + critic — Kanban-native retry, not in-worker loops

### Validator (schema gate, hard)

Writer worker:
```
1. produce evidence.json + journal.md + committee_brief.md
2. subprocess: node scripts/validate_evidence.mjs evidence.json
3. if exit 0:
       kanban_create critic-{sym}-{date} → hew-critic, parent=self
       kanban_complete(summary="evidence valid", metadata={...})
4. else:
       kanban_block(reason=f"validator exit {code}: {stderr[:2000]}")
       # do NOT retry in-process; let Kanban respawn fresh
```

Orchestrator (lightweight pass every 30 min) unblocks writer **once** with the validator stderr added as a comment:

```python
blocked = kanban_list(assignee="hew-writer", status="blocked")
for t in blocked:
    if "writer_retry_attempted" in t.metadata: continue
    kanban_comment(t.id, f"validator stderr was:\n{t.block_reason}\nFix the schema fields. This is your only retry.")
    kanban_unblock(t.id)
    update_metadata(t.id, writer_retry_attempted=True)
```

**Fresh writer process** picks up the unblocked task, reads the comment thread (which now contains the prior stderr), tries once more. If validator fails again → blocked again → no second unblock → gateway notifies you.

This is structurally cleaner than in-worker retry loops because each attempt is a **clean process with clean context**. The prior attempt's bad reasoning cannot contaminate the retry.

### Critic (judgment gate, fresh-process invariant)

Same pattern. Critic blocks with structured `metadata.blocking_issues[]`. Orchestrator dispatches writer remediation (§5). After writer completes remediation, critic auto-re-runs because the dispatcher promotes the unblocked critic task. The new critic worker is a **fresh process** — no prior critic memory because critic has no memory toolset (§1).

### Why exactly one remediation pass

- Anthropic's iterative-refinement data: 85% of gains land by iter 2; iter 3 is wasted compute.
- Critic prompt says "no count rescue" — if the issue is structural (wrong count, no Copsey source), polish-pass cannot fix it. Halting forces human review.
- Multiple passes risk laundering bad analysis into a "polished" version that hides the structural issue.

---

## 7. Failure modes & responses

| Failure | Detection | Response | Recovery |
|---|---|---|---|
| TV CDP disconnects mid-sweep | `tv_health_check` at sweep start; tool errors mid-sweep | sweep worker calls `kanban_block(reason="TV CDP disconnected")` | user restarts TV + `/kanban unblock`; sweep idempotent-resumes |
| KPE indicator not on chart | `data_get_pine_tables(study_filter="Konsili Pivot Exporter")` returns empty | sweep worker calls `chart_manage_indicator` to add it; if still fails, skip symbol + log to codex_run.json, continue |
| Symbol does not exist on TV | `chart_set_symbol` errors | skip symbol, kanban_comment on sweep task: "BATS:FOO not resolvable" | user fixes watchlist.yaml |
| Worker crashes (OOM, segfault) | dispatcher detects PID gone but TTL not expired | emits `crashed` event, task returns to ready, dispatcher respawns | automatic; `task_runs` history retains crash row |
| Worker hangs | TTL expires via `max-runtime` | dispatcher reclaims with `reclaimed` outcome | task returns to ready; auto-retry up to `failure_limit` |
| Repeated spawn failures (e.g., profile missing) | dispatcher counts `spawn_failed` events | after `failure_limit` (default 2), task auto-blocked with `gave_up` | user fixes profile + unblock |
| Analyst can't find valid count | analyst writes `count.json` with `hypothesis_primary.structure_type="no_clean_count"` | writer sees this and produces STAND_ASIDE journal directly; validator passes; critic sees structural decision, passes | normal flow, just verdict=STAND_ASIDE |
| Drawing uses forbidden tool | `drawing.json.forbidden_tools_used != []` | writer detects, `kanban_block(reason="drawing.json shows forbidden tool")` | writer remediation pass; if not fixable, critic will catch and block |
| Validator subprocess hangs | 120s timeout in subprocess.run | writer raises, dispatcher reclaims | normal retry via Kanban |
| Disk fills (journals grow) | weekly GC tick checks free space | hew-tick-gc.sh archives journals > 30 days to `.tar.zst`, prunes `kanban gc` | automated |
| Two cron ticks fire (DST, manual rerun) | idempotency keys per tick | second create returns existing task id | invisible to user |
| Cron daemon dies | no extract sweep created | `hew-orchestrator` daily noon check: "is today's extract sweep created?" — if no, alert | gateway alert; user investigates |
| Analyst memory pollution across symbols | impossible by construction (`analyst:{sym}` keying) | n/a | n/a |
| Critic biased by prior critic findings | impossible by construction (no memory toolset) | n/a | n/a |
| Gateway down (no alerts) | orchestrator can't send | alerts queue locally to `~/hew-watchlist/pending_alerts/`, retried each tick | flushes when gateway up |

---

## 8. GC & rotation

`hew-tick-gc.sh` (weekly):

```bash
#!/usr/bin/env bash
set -euo pipefail
# 1. Archive journal packages older than 30 days
find ~/hew-watchlist/journals -maxdepth 1 -type d -mtime +30 \
    -exec tar --use-compress-program=zstd -cf {}.tar.zst {} \; \
    -exec rm -rf {} \;
# 2. Trim state file history to last 30 entries per symbol
python ~/hew-watchlist/bin/trim_state_history.py --keep 30
# 3. Hermes-native GC (workspaces + events + logs)
hermes kanban --board hew-watchlist gc \
    --event-retention-days 90 \
    --log-retention-days 30
# 4. Archive done tasks > 14 days
hermes kanban --board hew-watchlist list --status done --json \
    | jq -r '.[] | select(.completed_at < (now - 14*86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) | .id' \
    | xargs -r hermes kanban --board hew-watchlist archive
```

`hermes kanban gc` is the Kanban-built-in. Stack on top: tarball journals + trim state.

---

## 9. Bootstrap — first-run procedure

Cold board has no per-symbol memory. The first sweep's analyst output will be sub-optimal. **Don't auto-trust it.**

```
Day 0:
  hermes kanban boards create hew-watchlist
  Create profiles (5x hermes profile create)
  Place watchlist.yaml with 3 seed symbols (not 50)
  
Day 1 (attended, manual seed):
  /kanban create "extract sweep manual-seed" --assignee hew-tv-chart
  Watch dashboard. Verify snapshot.json for each symbol looks right.
  /kanban create "draw sweep manual-seed" after analyst done
  Read each journal package. Manually correct count.json + re-run from drawing
    on any symbol where the analyst clearly missed a Copsey rule.
  This populates analyst memory with corrected anchors per symbol.

Day 2 (attended, scheduled):
  Enable cron. Watch the dashboard live for one cycle.
  Verify gateway alerts arrive.

Day 3+ (unattended):
  Expand watchlist.yaml to full set.
  Add new symbols via triage column:
    /kanban create "add SOLUSDT to watchlist" --triage
    hermes kanban specify <id>     # auxiliary LLM expands into todo
    # orchestrator picks it up, appends to watchlist.yaml
```

---

## 10. Tests & smoke

Three layers:

1. **Prompt fixtures.** `tests/prompts/` contains golden snapshot.json/count.json/etc. inputs. CI runs each profile via `hermes kanban create --json` against the fixtures and asserts output schema. No real TV MCP, no real LLM round-trip — uses Hermes' `--dry-run` mode (if available) or a mocked model adapter.

2. **End-to-end smoke on one stable symbol.** Nightly Kanban task assigned to a `hew-smoke` profile that runs the full pipeline on a single symbol with cached snapshots. Compares verdict to a checked-in golden. Diff = alert. This catches prompt drift, model drift, schema drift.

3. **Validator + engine tests** (already exist in `tests/`):
   - `npm test` (your existing `pivot_engine.test.mjs`, `ratio_engine.test.mjs`, `validate_evidence.test.mjs`)
   - Added: `npm run validate:all` over the journal archive — catches schema regressions across history.
   - Wire as a pre-commit hook on the agents/ + manifest.json + schema-touching files.

---

## 11. Cost & throughput

Per daily sweep, 50 symbols, rough rate-card math (Sonnet for cheap, Opus for analyst+critic):

| Phase | Tokens/symbol | Calls/symbol | Cost/symbol | Total/sweep |
|---|---|---|---|---|
| Extract (Sonnet, tool-heavy) | ~6k | many TV calls | ~$0.03 | $1.50 |
| Analyst (Opus, reasoning) | ~12k | few | ~$0.30 | $15.00 |
| Draw (Sonnet, tool-heavy) | ~5k | many TV calls | ~$0.03 | $1.50 |
| Writer (Sonnet) | ~8k | few | ~$0.05 | $2.50 |
| Critic (Opus) | ~10k | few | ~$0.25 | $12.50 |
| Orchestrator (Haiku) | ~3k | few | ~$0.005 | $0.25 |
| **Daily total** | | | | **~$33** |
| **Monthly** | | | | **~$1000** |

If too expensive: drop critic to Sonnet (-$8/day), drop analyst to Sonnet (-$10/day) → ~$15/day = ~$450/month. The analyst is the single most cost-effective place to spend on Opus.

Throughput: extract sweep ~30s/symbol × 50 = 25min. Draw sweep ~45s/symbol (set + draw + 2 screenshots) × 50 = 38min. Both well under their 4h max-runtime caps.

---

## 12. What's deleted, kept, added (final inventory)

### Kept (zero changes)
- `scripts/validate_evidence.mjs`, `pivot_engine.mjs`, `ratio_engine.mjs`, `check_integrity.mjs`
- `strategies/hew/manifest.json`
- `tradingview/konsili_pivot_exporter.pine`
- `analysis_journal/` package format (existing reference packages are still valid)
- `tests/*.test.mjs`
- `WORKFLOW.md`, `AGENTS.md` (referenced by orchestrator; remains the human-facing manual)

### Added
- `~/.hermes/kanban/boards/hew-watchlist/` (board + DB)
- 5 Hermes profiles
- `agents/tv-chart-protocol.md`
- `agents/hew-analyst-narrow.md`
- `agents/hew-writer.md`
- `agents/hew-orchestrator.md`
- `~/hew-watchlist/watchlist.yaml`
- `~/hew-watchlist/state/` directory + state files (auto-managed)
- `~/hew-watchlist/journals/` directory (auto-managed; long-term archive)
- `~/hew-watchlist/locks/` directory (chart lock file)
- `~/hew-watchlist/bin/hew-tick-{extract,draw,orchestrate,gc}.sh`
- `~/hew-watchlist/bin/trim_state_history.py`
- Crontab entries (4)
- Gateway subscription on hew-orchestrator
- `tests/prompts/` golden fixtures

### Deleted from prior designs
- Python orchestrator (`runner.py`, `cli.py`, etc.) — replaced by Hermes Kanban primitives
- Codex SDK dependency — not needed
- In-worker retry loops — replaced by Kanban `kanban_block` + orchestrator unblock pattern
- Monolithic `harmonic-elliott-wave-analyst.md` — split into three single-purpose prompts

### Not deleted but deprioritized
- Claude Code interactive analysis — kept available for ad-hoc one-off analyses; not used in watchlist path

---

## 13. Migration order — day-by-day with verification gates

Each day has a **gate**: do not proceed if the gate fails.

### Day 1 — Foundations

1. Install/update Hermes; verify `hermes kanban boards list` works.
2. `hermes kanban boards create hew-watchlist --switch`.
3. Create the 5 profiles (`hermes profile create ...`) with empty system prompts. **Gate: `hermes profile list` shows all 5.**
4. Split `harmonic-elliott-wave-analyst.md` into the three new prompt files. Assign to profiles via `hermes profile edit --system-prompt`. **Gate: each profile prompt file < 80 lines and contains only its single concern.**

### Day 2 — Single-symbol pipeline (attended)

5. Set TV chart to a known-good symbol (e.g., BATS:MSTR 1D) with HEW layout and KPE indicator.
6. Manually create extract sweep task for one symbol. **Gate: `snapshot.json` exists, contains pivots, KPE raw + extraction screenshot.**
7. Wait for analyst task to complete. **Gate: `count.json` exists, has `hypothesis_primary` with non-empty pivots + measurements + `copsey_source`.**
8. Manually create draw task. **Gate: `drawing.json` exists, `forbidden_tools_used == []`, both screenshots present.**
9. Wait for writer + critic chain. **Gate: validator passes, critic returns `pass`.**
10. Read `journal.md` end-to-end. **Gate: counts feel right to you (this is the human-judgment gate; the system is no better than the prompts you supply).**

### Day 3 — Failure-mode validation

11. Kill the analyst worker mid-task. **Gate: dispatcher respawns, task completes on retry.**
12. Add a forbidden_tool to drawing.json manually. **Gate: writer blocks itself.**
13. Disconnect TradingView. **Gate: tv-chart worker blocks with clear reason, dashboard shows blocked state.**
14. Reconnect TV + unblock from `/kanban`. **Gate: sweep resumes from last successful symbol.**
15. Run the same extract sweep twice. **Gate: second invocation returns existing task id, no duplicate work.**

### Day 4 — Scheduled, 3-symbol watchlist

16. Populate `watchlist.yaml` with 3 symbols.
17. Enable cron + gateway subscription.
18. Let it run for one full day cycle. **Gate: all 3 symbols complete the chain, state files written, dashboard shows clean board.**
19. Manually change one symbol's count significantly (via the chart's drawings) and re-run. **Gate: alert arrives on Telegram with the change summary.**

### Day 5+ — Scale

20. Expand watchlist to full set (5-10 at a time).
21. Tune ticks/cadence based on observed run-times.
22. Move daily ops to dashboard view.
23. Iterate on prompts via fixture tests.

---

## 14. The one-screen invariants (memorize these)

1. **Chart is single-tenant.** One file lock + one chart-touching profile + one task at a time. No exceptions.
2. **Each profile sees only its own concern.** Discipline is enforced by what's missing from the prompt and toolset, not by reminding the LLM to behave.
3. **Critic has no memory.** Toolset-level removal; verifiable from `hermes profile show hew-critic`.
4. **Workspace per (symbol, date), files are the inter-agent protocol.** Tasks pass paths, not data.
5. **Validator and critic blocks are Kanban-blocks, not in-worker loops.** Retries are fresh processes.
6. **Idempotency keys on every cron-created task.** Re-running cron is safe.
7. **Change detection in orchestrator, not in critic.** Critic always emits its verdict; the orchestrator decides whether to alert.
8. **Bootstrap is attended.** Auto-trust starts on Day 5, not Day 1.

---

This is the design. Next move: I can write the three split prompt files (`tv-chart-protocol.md`, `hew-analyst-narrow.md`, `hew-writer.md`) which is where the real discipline-failure fix lives. That's the highest-leverage starting point — everything else is plumbing on top of those three documents.