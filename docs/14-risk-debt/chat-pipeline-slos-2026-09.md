# Chat pipeline — service level objectives, 2026-09-11

> Every number here was measured live against the running stack during the
> remediation programme in
> [`chat-pipeline-audit-2026-09.md`](chat-pipeline-audit-2026-09.md) and
> [`chat-pipeline-baseline-2026-09.md`](chat-pipeline-baseline-2026-09.md).
> None is aspirational. Where a target is stricter than what was measured, the
> gap is stated — this document does not round up.

## Why this exists

An SLO with no measurement behind it is a wish. The chat pipeline programme
spent eleven days producing exact numbers for exactly these questions — idle
cost, send latency, page cost, security posture, accessibility — so writing
them down as commitments, instead of leaving them as one-off measurements in
an audit log, is what turns "we fixed it" into "we will notice if it breaks
again." Every SLO below names the mechanism that would catch a regression, not
just the target.

## How to read this

| Column        | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| **Objective** | The commitment, in plain terms.                             |
| **Measured**  | What was actually observed, with the date and method.       |
| **Guard**     | The test, log line, or check that fails if this regresses.  |
| **Status**    | 🟢 met and guarded · 🟡 met, not yet guarded · 🔴 known gap |

---

## 1. Idle network cost

| Objective                                                 | Measured                                                                                              | Guard                                                                                                                                                    | Status |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| An open, untouched chat thread issues ≤ 3 requests/minute | **2 requests/minute** (2026-09-10), down from 83/min. The survivor is the deliberate 30s health poll. | `app/__tests__/query-policy.test.ts` — every LIVE-tier hook must declare an explicit `refetchInterval`; no query may inherit a global one (none exists). |   🟢   |
| `/files` costs zero server-side serialisation while idle  | **0/minute**, down from 6/minute × 4.2 MB each                                                        | `hooks/files/__tests__/use-files.test.tsx` — the interval is conditional on an ingesting file existing.                                                  |   🟢   |

## 2. Send latency

| Objective                                                          | Measured                                                                                                               | Guard                                                                                                                                      | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | :----: |
| The user's own message renders with zero extra network round trips | **0 extra requests** (2026-09-11) — only the `POST` itself, the SSE connection, and the unrelated thread-list refresh. | `hooks/chat/__tests__/use-send-message.test.tsx` asserts `messagesInfinite` is written via cache, never invalidated, on a successful send. |   🟢   |
| The sent message is visible within 500 ms of clicking Send         | **~350 ms** (2026-09-11) — the `POST /chat-messages` round trip itself, nothing added on top.                          | No automated timing guard yet — this is a live measurement, not a CI assertion.                                                            |   🟡   |

## 3. Conversation load cost

| Objective                                                              | Measured                                                                                                                                                                                                        | Guard                                                                                                                                      | Status |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | :----: |
| Opening any thread, regardless of length, costs one bounded page fetch | **32 KB in 68 ms** for a 480-message thread (2026-09-11) — `MESSAGES_PAGE_SIZE = 50`, no thread-length-dependent growth.                                                                                        | Backend: `limit.max(100)` in `list-messages-query.dto.ts` caps a request regardless of caller. No test pins the byte size — see gap below. |   🟡   |
| A completed answer costs at most one page-1 refetch                    | **Measured at 1, occasionally 2** — a residual duplicate between the DONE handler's invalidation and the in-flight poll interval, recorded but not fixed (cheap: same 32 KB/68 ms fetch, not a new cost class). | None — named as an open, low-priority finding in the audit rather than guarded.                                                            |   🔴   |

## 4. Streaming resilience

| Objective                                                                          | Measured                                                                                                                 | Guard                                                                                                                                                                                         | Status |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| A stream that stays open but stops delivering is detected within 45 s              | **45 s** exactly (`SSE_STALL_TIMEOUT_MS`, three missed 15 s heartbeats), then reconnected                                | `utilities/__tests__/sse-reconnect.utility.test.ts` — "gives up on a connection that stays open but goes silent."                                                                             |   🟢   |
| Connection health is visible to the user, not just the log                         | Verified: `StreamHealthNotice` renders reconnecting/lost states, nothing when healthy                                    | `components/chat/__tests__/stream-health-notice.test.tsx`                                                                                                                                     |   🟢   |
| A reconnect resumes from where the client left off rather than replaying from zero | Verified live: wire `id:` matches the application's own `eventId`; a reconnect with a known id returns only newer frames | 19 backend unit tests (bus filtering, controller wiring) + 3 frontend (header sent/tracked). No live forced-drop test — deterministic network kill is outside what browser automation can do. |   🟡   |
| Exactly one stream connection is held per generation, start to finish              | Verified live: 1 connection, `replay=false` on a fresh send, held open for the full generation                           | `hooks/chat/__tests__/use-chat-stream.test.tsx` + live verification in this session                                                                                                           |   🟢   |

## 5. Web research truthfulness

| Objective                                                                           | Measured                                                                                                                    | Guard                                                                                                       | Status |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | :----: |
| A URL the user pastes is opened, not merely searched for                            | Verified live: `web_fetch:user_url` in `toolsUsed`, pasted page ranked first at confidence 1                                | `research.manager.spec.ts` — direct-fetch suite, 10 cases                                                   |   🟢   |
| The model never claims it cannot browse when a web step actually ran                | Verified live, same prompt/model, before/after: refusal → real answer with a citation                                       | `context-assembly.manager.spec.ts` — grounding-reminder suite, 5 cases                                      |   🟢   |
| A source count shown to the user reflects pages read, never links merely discovered | Verified: "Read N pages" derived from each item's own `source` field, not `sources.length`                                  | `research-transcript-panel.test.tsx` — 7 cases including the exact reported contradiction (0 read, N found) |   🟢   |
| The provider a user selects is the provider that answers                            | Verified live against both configured providers: `selectionMode: explicit` for each                                         | `research-enricher.manager.spec.ts` — provider-forwarding suite                                             |   🟢   |
| A long prompt never silently disables research                                      | Verified live: 1,176-character prompt completed with a warning, where it previously 400'd with no transcript and no warning | `search-query.utility.spec.ts` — 6 cases                                                                    |   🟢   |

## 6. Security boundary

| Objective                                                          | Measured                                                                                                        | Guard                                                                                             | Status |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | :----: |
| The fetcher never reaches a private or loopback address by default | Verified live: loopback, the internal service name, and the AWS metadata IP all refused with the correct reason | `url-safety.utility.spec.ts` — 16 cases covering every literal spelling of a private address      |   🟢   |
| Cloud metadata is unreachable regardless of configuration          | Verified: refused even with `allowPrivateHosts: true`                                                           | Same suite, "blocks cloud metadata EVEN when private hosts are permitted"                         |   🟢   |
| **Known, accepted gap**: the guard is syntactic, not DNS-resolved  | A hostname an attacker controls can still resolve to a private address and pass the syntactic check             | Not guarded — this is TD-031, tracked with its fix (a socket-level guard with connection pinning) |   🔴   |

## 7. Accessibility

| Objective                                                                | Measured                                                       | Guard                                                                                                                         | Status |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | :----: |
| The chat page scores 100 on Lighthouse accessibility, desktop and mobile | **100/100 both**, up from 90/50 — 0 failed audits (2026-09-11) | `research-toggle.test.tsx`, `button-type.test.tsx` — pin the three fixed defects (accessible names, contrast, label mismatch) |   🟢   |

---

## What this document deliberately does not cover

- **Provider-side generation latency** (time to first token, tokens/second).
  Already measured and logged per call (`callOllama`/`callLlamacpp`/
  `callCloudProvider` all log `latencyMs`; `StreamMetrics.timeToFirstTokenMs`
  is computed and streamed to the client). Not turned into an SLO here because
  it is provider-dependent and already has its own display surface (the
  runtime-progress panel) rather than a single pipeline-wide number.
- **A normalized message store** (B6's architectural half). Deliberately left
  as a future decision, not a bug — see the audit's own scoping note.
- **The DNS-resolution gap in the SSRF guard** (TD-031). Named above as a known
  🔴, not silently omitted.

## Revisit when

- The 🟡 rows above get a CI-enforced guard (a byte-size assertion on the
  messages page fetch; a load-test harness that can force a live network drop
  mid-stream for the resume path).
- The residual duplicate refetch on DONE (🔴, section 3) is worth fixing on
  its own — it is not urgent because each occurrence is cheap, but it is a
  clean, self-contained follow-up.
- TD-031 is scheduled — the fix is specified in the technical-debt entry.
