# Three workstreams: audit verdicts and batch plan (2026-10-30)

Source: the prompt pack `ClawAI_3_Workstreams` (security floor, pricing and fair usage, execution
harness). Rule 26 intake: pack read whole, repo audited against code, verdicts below. Audit commit:
`c1e8392d9` on `main`. Production access: **none**; every production fact is unverified.

## Deviations from the pack (stated, not silent)

- The pack is planning-only. The owner asked for implementation, so the audit is the plan and the
  smallest safe batches are implemented. No pack section is treated as done because it was listed.
- No live provider call is made for pricing or protocol research that costs money.
- Numbers for per-plan caps are proposals in the pack. They are money and need the owner's value;
  the schema lands first with null (no behaviour change) and the numbers are an open decision.
- No multi-segment `ChatMessage` schema migration yet. Protocol fixes come first.

## Workstream 1: Node security floor

| Deliverable                                   | Verdict                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Advisory verified from a primary source       | Done (ADR-196): CVE-2026-111497, fixed 22.23.4 / 24.22.1 / 26.12.1            |
| Inventory                                     | Done: 44 Dockerfiles, 65 node stages; 3 non-guardable third-party Node images |
| Build cannot ship a vulnerable base           | Done in batch 1 (guard in every node stage)                                   |
| Deploy pulls fresh base                       | Done in batch 1 (`build --pull`)                                              |
| `engines` excludes vulnerable ranges          | Done in batch 1                                                               |
| Runtime attestation inside `deploy-prod.sh`   | Missing: `--running` check exists, the deploy hook does not                   |
| Digest pinning, SBOM, scheduled refresh, scan | Missing: needs an owner decision on cadence                                   |
| Third-party images (Firecrawl)                | Open: upstream tag needed                                                     |

## Workstream 2: pricing, caching, fair usage

| Deliverable                                                            | Verdict                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Chat, Compare, Judge, TTS, vision, plugins, Threads reserve and settle | Done (per-call holds)                                                               |
| Unknown price blocks a paid model                                      | Partial: dearest-rate fallback is on by default                                     |
| Cache read and write accounting, no double count                       | Done for text (OpenAI-style, Gemini, Anthropic)                                     |
| Cache requests                                                         | Partial: Anthropic only                                                             |
| Per-plan call caps (input, output, dollars)                            | Done for platform-paid calls (ADR-197); credit-wallet calls and parent budgets open |
| Parent budget over Compare, Judge, fallback                            | Missing (Threads only)                                                              |
| Price ledger, drift check, coverage dashboard                          | Missing                                                                             |
| Reconciliation with provider invoices                                  | Missing                                                                             |
| Duplicate UI price table                                               | Open: `ai-model-pricing.constants.ts` can disagree with the quote                   |
| Coding-agent and research LLM metering path                            | Unverified                                                                          |

## Workstream 3: execution harness

| Deliverable                                    | Verdict                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Raw provider stop reason kept                  | Partial: `pause_turn` passes through; `end_turn` and `stop_sequence` stay `stop` on purpose (both are finished answers) |
| Typed model-turn outcome                       | Missing                                                                                                                 |
| `length` truncation                            | Partial: banner and fast-path escalation only                                                                           |
| Thinking-only / empty                          | Partial: Runtime V2 retries, the stream path throws                                                                     |
| Stale `DONE` replayed into the next run        | Done: a replay is cut at the latest `request_accepted`. No `runId` on events yet                                        |
| Durable replay and gap detection               | Missing: 100 events, 1 hour, no gap marker                                                                              |
| Reconnect observes, does not re-call the model | Done (`Last-Event-ID`)                                                                                                  |
| Multi-segment messages and bubbles             | Missing (no run or segment field on `ChatMessage`)                                                                      |
| Run-level state machine                        | Partial (Runtime V2 only)                                                                                               |

## Batch sequence (one gated commit each)

1. **WS1** Node floor: guard, `--pull`, engines, test, ADR-196, runbook. (this commit)
2. **WS3** `pause_turn` passes through as its own finish reason, with tests (done). A separate `providerStopReason` field was dropped: nothing needs the other two raw values. No Anthropic server tool is sent today, so continuing a paused turn is latent work.
3. **WS3** pure `classifyModelTurn` and use it in the plugin loop and Runtime V2.
4. **WS3** a replay is cut at the latest `request_accepted`, so a stale `DONE` cannot be replayed (done, server side only). A `runId` on every event and the frontend check were dropped: the cut closes the race without a protocol change.
5. **WS3** `replay.truncated` gap marker.
6. **WS2** official text-model prices as seed v13 (done, [ledger](model-price-ledger-2026-10-30.md)). Per-plan call caps: derived from the plan economics, approved by the owner and enforced in the unmetered branch of `CreditReservationManager.reserve` (ADR-197, done).
7. **WS2** parent budget for Compare, Judge and the fallback chain.
8. **WS2** coverage numbers and cache hit telemetry; remove or align the duplicate price table.

Cap enforcement and the parent budget change who is refused, so they wait for the owner's approval of the ledger's table.

## Unknowns that need the owner or production

- Running Node versions and image digests in production (commands in the runbook).
- The live enabled model inventory and its price coverage.
- Per-plan cap values, whether `Unlimited` gets a finite per-call cap, digest-refresh cadence.
