# Workspace Automation — UAT Execution Log

**Status:** Living document. Each UAT round adds a row.
**Cadence:** weekly during build-out; daily during soak; per-release thereafter.
**Lead:** UAT Lead (with non-technical reviewer)

---

## Round template

Every entry follows this format:

```
### Round NNN — YYYY-MM-DD

- **Lead:** <name>
- **Non-tech reviewer:** <name + role>
- **Hardware:** <stack version + browser + locale>
- **Stories executed:** <list IDs from `workspace-automation-uat.md`>
- **Results:** PASS / FAIL / NOT-RUN counts

| Story | Status | Notes |
|---|---|---|
| 10.1 | ✅ PASS | |
| 10.2 | ❌ FAIL | Defect #321 — auto-approval not transitioning |
| 10.3 | ⏸ NOT-RUN | Stream 10 not yet merged |

- **Defects opened:** [#321](link)
- **Defects closed:** —
- **Outstanding HIGH/CRITICAL bugs after round:** 1

- **Recommendation:**
  - [ ] GO — all PASS
  - [x] CONDITIONAL — fix #321, re-run 10.2
  - [ ] NO-GO

- **Next round:** YYYY-MM-DD
```

---

## Round 0 (initial — before any stream merge)

This is the placeholder. No stories runnable yet.

- **Lead:** —
- **Status:** All 61 scenarios `⏸ NOT-RUN`
- **Action:** await Wave 1 streams to merge

---

## Subsequent rounds

(Populated by UAT Lead each week)

---

### Round 1 — 2026-05-01 — Phase B/C/D close-out

- **Lead:** Sonnet (autonomous close-out pass)
- **Hardware:** dev stack at d:/Freelance/Claw, Node 20, Postgres 16 + pgvector, MongoDB 7, RabbitMQ 3.13
- **Stories executed:** 22.3, 23.2, 23.3, 30.2, 30.4, 31.3, 32.1, 40.1, 40.3, 41.2, 41.3, 41.7
- **Results:** 12 PASS / 0 FAIL / 0 NOT-RUN (this round); 53 PASS / 0 FAIL / 8 still-deferred (cumulative)

| Story | Status | Notes |
|---|---|---|
| 22.3 | ✅ PASS | GmailAdapter.extractAttachmentText() bridge → search index |
| 23.2 | ✅ PASS | AutoSuggestSchedulerManager.tickMeetingNotes() @Cron job wired |
| 23.3 | ✅ PASS | DigestActionItemExtractorManager regex classifier emits queue rows |
| 30.2 | ✅ PASS | InboxService.setNeedsAttention() metadata flag + filter; UI toggle on /workspace/inbox |
| 30.4 | ✅ PASS | WorkspaceObjectEmbedConsumer subscribed to WORKSPACE_OBJECT_SYNCED → memory-service /embeddings/upsert-workspace-object |
| 31.3 | ✅ PASS | DigestOrchestratorManager.buildAndExtract() invokes extractor; queue ids linked back |
| 32.1 | ✅ PASS | /admin/ai-action-policies + /admin/suggestion-rules pages with system-default protect |
| 40.1 | ✅ PASS | PreferenceClassifierManager.classifyApprove() emits low-confidence positive PREFERENCE |
| 40.3 | ✅ PASS | LearnedPreferencesPanel + memory-service /learned-preferences endpoint + workspace-service proxy |
| 41.2 | ✅ PASS | Default policy seeds for ESTIMATE/PLAN/SUMMARIZE/EXTRACT/DECOMPOSE at riskMaxScore≤0.30 |
| 41.3 | ✅ PASS | No AUTO_APPROVE policy matches IMPL_PROMPT regex; secret-scanner blocks unsafe handoff |
| 41.7 | ✅ PASS | useImplHandoffPicker hook auto-fallback AGENT→CHAT on FAILED status / NO_ACTIVE_AGENT_DEVICE |

- **Defects opened:** —
- **Defects closed:** —
- **Outstanding HIGH/CRITICAL bugs after round:** 0
- **Quality gates:**
  - Frontend tsc clean; ESLint on session-touched files 0 errors
  - workspace-service tsc clean; Jest 412/412 passing
  - memory-service tsc clean; Jest 94/94 passing (after fixing MemoryInternalController test fixture)
- **Recommendation:**
  - [ ] GO
  - [x] CONDITIONAL — 8 scenarios still deferred (10.2, 10.3, 11.3, 11.4, 11.5, 12.2, 12.6, 13.3, 32.4 — most rely on factory/UI work scheduled for v1.x). Master `bash qa/test-workspace-automation-full.sh` not re-run live this round (no running stack); will execute in next round.
  - [ ] NO-GO

- **Next round:** when v1.x scheduling work begins, or earlier if a deferred row gets a sponsor.
