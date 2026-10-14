# QA evidence - threads-provider-failures

Batch: threads-provider-failures
Date: 2026-10-14
Commits: (fill in after committing)
Verdict: PARTIAL

Every lane is filled in. PASS needs the command and its real output (or a path, a count, a
screenshot name). NOT_RUN and NOT_APPLICABLE need a reason. Verdict DONE is allowed only when no
lane is NOT_RUN or FAIL. A fabricated or assumed PASS is a prohibited sentence (rules/60, rules/49).

| Lane | What                                                                  | Status         | Evidence or reason                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01  | Unit and integration tests (only the changed files)                   | PASS           | swc-free vitest: chat-service provider-http-failure + picked-model-fallback specs 90/90; threads-service recommended-team 15/15; routing model-cost.service 36/36                                                                            |
| L02  | Typecheck, lint and build (touched workspaces)                        | PASS           | chat-service `tsc --noEmit` exit 0; eslint on the changed files of chat, routing, threads: 0 errors (2 pre-existing warnings in untouched lines); build not run                                                                              |
| L03  | Manual API test (curl) with the log line proving the branch ran       | NOT_RUN        | the fixes are not deployed; root causes were read from prod logs (`generateOnceStream: GROQ returned status=413 body=...`, `ANTHROPIC returned status=400 ... API usage limits`, `HUGGINGFACE returned status=402 ... no remaining credits`) |
| L04  | Manual browser test (Playwright against the real UI) with screenshots | NOT_APPLICABLE | no frontend file changed (another agent owns it)                                                                                                                                                                                             |
| L05  | Automation e2e (a committed or existing spec was run)                 | NOT_RUN        | needs a deploy of chat-service; no e2e for provider error bodies exists                                                                                                                                                                      |
| L06  | RBAC across roles and plan tiers (admin, paid, FREE)                  | NOT_APPLICABLE | no authorization path changed                                                                                                                                                                                                                |
| L07  | Device matrix (3+ widths, both orientations, RTL)                     | NOT_APPLICABLE | backend only                                                                                                                                                                                                                                 |
| L08  | UAT (acceptance criteria walked as the user would)                    | NOT_RUN        | blocked on deploy and on operator actions (Anthropic cap, HF credits, Groq tier)                                                                                                                                                             |
| L09  | Product verification                                                  | PASS           | picker now marks ANTHROPIC, OPENAI, HUGGINGFACE, GROQ UNAVAILABLE with the proven cause; decision to keep them listed until the operator acts is recorded in ADR-174                                                                         |
| L10  | Business verification (money, limits, copy and claims match the code) | PASS           | HF and NVIDIA are now recognised as resellers by their real ids, so they are refused as unpriced instead of getting a stand-in rate; fail-closed behaviour unchanged                                                                         |
| L11  | Regression (neighbouring features still work)                         | NOT_RUN        | existing 90 chat-service specs in the two touched files pass; full chat-service suite not run                                                                                                                                                |
| L12  | Security (authz and IDOR, secrets, injection)                         | PASS           | the new exception message carries two integers only; the spec asserts no URL or org id leaks; prod logs read with no env or secrets printed                                                                                                  |
| L13  | Performance and accessibility                                         | NOT_APPLICABLE | no hot path or UI change                                                                                                                                                                                                                     |
| L14  | i18n (13 locales, RTL)                                                | NOT_RUN        | `PROVIDER_REQUEST_TOO_LARGE` has no messageKey yet; the frontend is owned by another agent                                                                                                                                                   |
| L15  | Docs, knowledge delta and GitHub gates read                           | NOT_RUN        | ADR-174 deny-list text, chat-service CLAUDE.md updated; GitHub gates not read (nothing committed)                                                                                                                                            |

## Findings

Root causes, each proven from the provider's own error body in the chat-service prod log:

1. Anthropic, every Threads author call: HTTP 400 `invalid_request_error` "You have reached your specified API usage limits. You will regain access on 2026-11-01". An account spend cap, not a request shape. It was a 400 so nothing treated it as exhaustion. Fixed: classified as account exhaustion (503 `PROVIDER_CREDIT_EXHAUSTED`, breaker opens).
2. Groq, every author call: HTTP 413 "Request too large ... Limit 8000 (qwen: 7000), Requested 13-18k". The on_demand tier allows 7-8k tokens per request. Fixed: `PROVIDER_REQUEST_TOO_LARGE` with the two numbers, never retried. Operator action: Dev Tier.
3. HuggingFace: 402 "You have no remaining credits". Account empty. Fixed: matched as account exhaustion. `PAYG_PRICING_UNAVAILABLE` came from a deploy window (all roles failing in one second at the 502).
4. Silent substitution: the pick's failure code is now `metadata.pickedModelFallback.reasonCode`.
5. Deny list: reasons rewritten; HUGGINGFACE and GROQ added.
6. Routing: aggregator list held `HUGGING_FACE` and `NVIDIA_NIM`, real ids are `HUGGINGFACE` and `NVIDIANIM`.
7. QUEUED at SNAPSHOT: 6 worker slots in total (`GENERATION_WORKER_SLOT_COUNT`, 3 per replica) and failing jobs hold a slot through multi-minute retry backoff. Not changed (thread-generation-service is owned by another agent).
8. OpenRouter WRONG_SHAPE: `citations[].url` is `z.string().url()` in `generation-pipeline.types.ts`; not changed (other agent).

## Edge-case matrix (coverage = a spec name found in thread-generation-service, chat-service or threads-service)

| Case                                                 | Covered                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Empty source chat                                    | covered by the preflight/snapshot specs ("handles an empty reply"); source-chat-empty refusal not re-verified   |
| 1-message chat                                       | not found, needs a spec                                                                                         |
| Very long single message / huge chat over the window | covered ("refuses an oversized complete prompt", "requires prompt plus output reserve to fit the model window") |
| RTL / Arabic source and draft                        | covered (Arabic-Indic digits, RTL marks, reply cut off "more for Arabic")                                       |
| Emoji source chat                                    | not found, needs a spec                                                                                         |
| Model with a 4k window                               | covered by WINDOW_TOO_SMALL and the context-fit specs                                                           |
| Unknown window                                       | covered ("fails closed when the model context window is unknown", assumed-window specs)                         |
| Null-priced model                                    | covered in auth ("unpriced model refused"), routing (now also by real reseller ids)                             |
| Provider 429                                         | covered (rate limit, plus Groq TPM 429 added here)                                                              |
| Provider 500 / timeout                               | covered (idle timeout 330 s, fallback after idle timeout)                                                       |
| Provider 413 request too large                       | added here                                                                                                      |
| Provider spend cap / empty balance                   | added here                                                                                                      |
| Invalid JSON / truncated output                      | covered ("returns undefined for a truncated object", "asks again with more output room")                        |
| Refusal text instead of JSON                         | partly covered by WRONG_SHAPE specs; a refusal-specific spec was not found                                      |

## Open gaps

- L03/L05/L08: deploy chat-service and routing-service, then rerun one Threads generation per provider.
- Operator: raise the Anthropic cap, buy HuggingFace credits, move Groq to Dev Tier, then drop the entries from `THREAD_MODEL_DENY_LIST`.
- Other agent: read the error frame `message`, citation schema leniency, worker slot starvation.
