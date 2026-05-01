# ADR-028 — IMPL_PROMPT Handoff: Workspace ↔ Chat / Agent Bridge

**Status:** Accepted (2026-05-01)
**Stream:** 41

## Context

Stream 41 introduces 4 new AI action kinds — PLAN, DECOMPOSE, ESTIMATE, IMPL_PROMPT — that turn a Jira/GitHub/Linear ticket into an actionable coding brief. The handoff problem: once IMPL_PROMPT is approved, where does the brief *go*?

Three options the user picks at handoff time:
1. **CHAT** — open a fresh thread in claw-chat-service pre-loaded with the brief; the user (or their cloud LLM) iterates from there.
2. **AGENT** — drop the brief into the user's connected agent device's PENDING_APPROVAL terminal-command queue; the user approves there to execute.
3. **CLIPBOARD** — render in the UI for manual paste into an external tool (Cursor, etc.).

## Decision

### Schema

```prisma
enum ImplPromptHandoffMode { CHAT, AGENT, CLIPBOARD }
enum ImplPromptHandoffStatus { PENDING, DELIVERED, FAILED }

model ImplPromptHandoff {
  id                      String                  @id
  sourceQueueId           String                  // → AiActionApprovalQueue.id
  userId                  String
  mode                    ImplPromptHandoffMode
  targetThreadId          String?                 // populated for CHAT mode
  targetTerminalCommandId String?                 // populated for AGENT mode
  status                  ImplPromptHandoffStatus
  errorMessage            String?
  briefSnippet            String                  @db.VarChar(1024)
  createdAt               DateTime
  deliveredAt             DateTime?
}
```

### Endpoints

workspace-service:
- `POST /workspace/impl-handoffs/queue/:queueId` — body `{ mode }`. Validates: queue exists, user owns it, kind is IMPL_PROMPT, status is APPROVED|AUTO_APPROVED, brief is non-empty, no secret patterns detected.
- `GET /workspace/impl-handoffs?status=DELIVERED&limit=25` — paginated list.
- `GET /workspace/impl-handoffs/:id` — single with ownership check.

Cross-service internal endpoints (service-token guarded):
- chat-service: `POST /api/v1/internal/chat/threads/seeded` — creates a `ChatThread` + posts the initial user message, returns `{ threadId }`.
- agent-service: `POST /api/v1/internal/agent/terminal/seed-command` — finds the user's CONNECTED `AgentSession`; if none, returns 409 `NO_ACTIVE_AGENT_DEVICE`. Otherwise creates a `TerminalCommand` with `status=PENDING_APPROVAL`, returns `{ terminalCommandId }`.

### Defence-in-depth: secret scanner

`secret-scanner.utility.ts` runs over the brief before `dispatch()` fires. Patterns flagged:
- AWS access key id (`AKIA...`)
- AWS secret access key (`aws_secret_access_key = ...`)
- PEM PRIVATE KEY blocks
- OpenAI/Anthropic-style `sk-...`
- GitHub PAT `ghp_...` / `ghs_...`
- Slack bot/user tokens (`xoxb-`, `xoxp-`)
- VBScript schemes

If any match → throws `BusinessException` with `IMPL_PROMPT_SECRET_DETECTED` (HTTP 422). The handoff row is never created. Stream 10's `AiActionRiskScorer` already catches most secrets at queue-time; this is the second-line check at handoff.

### Failure mode: graceful

The dispatch path is wrapped — if chat-service is down, agent-service has no active device, etc., the row is marked `status=FAILED` with `errorMessage` and returned to the caller. The frontend can surface "handoff failed, fall back to clipboard" UX without losing the audit trail.

## Consequences

- **Double-gate for AGENT**: `AiActionApprovalQueue` approval (workspace-service) AND `TerminalCommand.PENDING_APPROVAL` (agent-service) — a user can't accidentally execute an attacker-influenced brief on their own machine without two explicit approvals.
- **Clean separation of routing knowledge**: workspace-service doesn't know about chat threads or terminal commands; it just calls the two seed endpoints with `userId + brief`. The receiving services own their domain logic.
- **No prompt rewriting at handoff**: the brief in the queue entry is exactly what's posted. Any rewriting/redaction must happen at IMPL_PROMPT generation time (Stream 10's risk service).
- **CLIPBOARD is always safe**: no remote dispatch; the UI just displays the brief and copies to clipboard. The row is created and immediately marked DELIVERED.

## Verification

- `qa/test-stream-41-impl-handoff.sh` confirms all 4 new `AiActionKind` values, `ImplPromptHandoff*` enums + table, list-endpoint auth, 404 path for unknown queue, and `run-endpoint` accepts the 4 new kinds.
- 8 unit tests in `secret-scanner.utility.spec.ts` cover every flagged pattern + benign-text negative.

## Future work (v1.x)

- Default policy seeds: `auto-approve PLAN+DECOMPOSE for INTERNAL`, `always pending IMPL_PROMPT`.
- Frontend handoff dialog with mode picker + "fall back to CHAT on agent-down" UX.
- DECOMPOSE → CREATE_TICKET fan-out (n subtasks → n queue entries with parent linkage).
- IMPL_PROMPT redaction at generation time using a heavier secret-detection catalog.
