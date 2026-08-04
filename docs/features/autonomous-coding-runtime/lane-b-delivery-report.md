# Lane B delivery report — native tool transport and the four model lanes

Covers Stage 1, Stage 4 and Stage 5 of `CODING_AGENT_NATIVE_TOOL_CALLING_CLAUDE_PLAN.md`
and W4/W5 of `ClawAI_Future_Autonomous_Coding_Runtime_Ollama_Master_GPT_PLAN.md`.

Companion documents:
[`agent-coordination.md`](agent-coordination.md) (ownership ledger) ·
[`current-state-status.md`](current-state-status.md) (Lane A baseline dossier) ·
[`../../03-architecture/runtime-tool-calling.md`](../../03-architecture/runtime-tool-calling.md) (the contract)

---

## 1. Business analysis

### The claim the product could not keep

ClawAI sells a coding agent. Asked to do coding-agent work, it answered:

> "I can't clone your repos, execute Playwright, or hand you a real .zip file of
> screenshots — I'm a text-based assistant with no runtime environment, no
> filesystem, and no browser farm."

Every capability in that sentence is **implemented, policy-gated, budgeted, and
wired to an executor** in the VS Code extension: 17 registered tools spanning
~145 operations, including transactional filesystem writes, PTY processes, Git
with 25 operations, Docker/Podman with 23, Playwright with 30, database
profiles, quality gates, and verified artifact export.

The product was not missing features. It was unable to _offer_ them to a model.

### Why this is the highest-value defect in the backlog

Cost of the defect is not one bad answer. It compounds three ways:

1. **Direct refusal.** The headline user-visible failure.
2. **Silent green runs.** The refusal was persisted as a successful assistant
   message and the run terminalized `completed`. Nothing logged it. A user
   could not tell a real answer from a capability denial, and neither could
   telemetry — so the defect was invisible to the team that could fix it.
3. **Wasted spend.** A repair loop re-embedded the previous refusal verbatim
   into the next prompt, doubling context each round (~34k → ~68k tokens
   observed) until the provider returned nothing at all. Users paid, per round,
   for a conversation that could not succeed.

Every downstream truthfulness guarantee in the master plan — receipt-backed
final answers, capability-drift detection, effective-catalog enforcement — is
unreachable until a model can actually receive a tool. Lane A's own dependency
list names this as its **#1 blocker**.

### What is now true that was not

| Before                                                                             | After                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| No provider request type could carry `tools` except a web-search-only Ollama shape | All four lanes carry a real, validated tool catalog  |
| A local Ollama model could never join an agent run                                 | `/api/chat` exists and the local lane routes to it   |
| Every Ollama model reported `supportsTools: false`                                 | Truthful per-model capability from an auditable list |
| llama.cpp silently stripped `tools` and rejected tool results                      | DTO round-trips both; `--jinja` parses emitted calls |
| Capability routing could never select on tool support                              | Explicit flag, reachable branch, populated registry  |

**Not yet true:** the loop that _consumes_ tool calls is Lane A's work. This
lane delivers the transport; it does not by itself make an agent run succeed
end to end. Stated plainly because the distinction matters for release claims.

---

## 2. Product analysis

### Mode contract impact

The master plan's §4 mode contract requires Agent mode to run on Runtime 2.x
with **no silent legacy fallback**. Transport is the precondition: without
native tools there is no honest Agent mode to fall back _from_, only a text
lane wearing an Agent badge.

### Degradation is now explicit, everywhere

Three deliberate degradation points, each visible rather than silent:

- **Provider has no native tool surface** → WARN naming the provider, catalog
  omitted, run continues on the prompt-JSON lane.
- **`ToolChoiceMode.REQUIRED` on native Ollama** → `resolveToolChoicePayload`
  returns `degraded: true`. Native `/api/chat` has no forced-tool-choice field,
  so Lane A's anti-drift correction is prompt-only there and must say so rather
  than claim a strict correction.
- **No tool-capable provider healthy** → capability routing returns `null` and
  ordinary routing proceeds. Rank, do not filter.

That last one is a product decision worth stating: a hard capability filter
converts a data gap into a **total agent-run outage**. Running on a less
suitable model and reporting a degraded lane is strictly better than running
nothing.

### User-visible surface

No new user-facing strings, so no i18n work in this lane. The badge, the
degraded-lane indicator and the fallback-reason copy are Stage 0/Stage 6
extension work, owned by Lane A.

---

## 3. Technical analysis

### Root cause, precisely

Two contracts exist; only one was broken.

|       | Contract                                                                                            | Broken?                        |
| ----- | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| **A** | extension ↔ backend — `runtimeStartSchema`, `toolInvocationSchema`, `toolResultSchema`, ordered SSE | **No.** Not implicated at all. |
| **B** | backend ↔ model — an English sentence asking for JSON                                               | **Yes. Entirely.**             |

Contract A stays. It carries `epochs` (the 4-axis invalidation cursor fencing
stale approvals), `riskClasses`/`targetIds` (approval gating), `receipt` (the
audit substrate), `continuation.action` and a 7-dimension `budget`. OpenAI's
tool object is `{name, description, parameters}` — there is nowhere to put any
of it. More decisively, Runtime V2 tools execute **client-side across an SSE
hop** with approval modals on the user's machine; an OpenAI-compatible framing
models an in-process loop, which cannot express "ask the human first."

Only contract B's encoding changed.

### Translation shape and why

One native function per tool, `operation` and `targetId` lifted into the
parameter schema. Forced by two measured facts: a Runtime V2 `inputSchema` is
already a flat superset across all of a tool's operations, and there are ~145
operations across 17 tools (one function per operation blows every provider's
catalog size and dominates the per-turn token budget).

### The four traps, and the guard on each

| Trap                                                                                                                                                                                           | Guard                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Name sanitization is **not injective** — `workspace.files` and `workspace_files` both become `workspace_files`, so a string round trip could dispatch a _different, possibly destructive_ tool | Per-run lookup map; collision throws at catalog-build time; the reverse trip never string-replaces |
| OpenAI `strict: true` would reject the whole catalog (`required: []`)                                                                                                                          | Never enabled; asserted off by a test reading the real production schema                           |
| `arguments` is a JSON **string** on OpenAI, an **object** on Ollama/Anthropic — wrong handling is silent, not an error                                                                         | Both shapes converge in one parser; each has an explicit per-dialect test                          |
| Anthropic's tool result is a **`user` turn**, not a `tool` turn                                                                                                                                | Per-dialect transcript rendering rather than one canonical shape converted downstream              |

### Two defects found during implementation, not in either pack

**`parseOllamaChatResponse` threw on empty content.** A native tool-call turn
has empty content _by design_ — the model is asking for a tool, not answering.
The emptiness guard fired before anything could read `message.tool_calls`, so
**every successful Ollama tool call would have terminated the run** with "Cloud
provider OLLAMA returned no message content" — the exact terminal error in
Lane A's dossier. This would have made the whole feature appear not to work
while every other piece was correct. Regression-tested.

**The builders also feed the streaming path.** `buildOllamaChatRequestBody` and
`buildChatRequestBody` are shared by buffered and streaming callers, and
`provider-stream-reader.utility.ts` has no `tool_call` delta handling. Attaching
tools would have let a streamed tool call be silently swallowed. Tools are now
explicitly stripped on both streaming protocols with a WARN.

### Scaffolding avoided

The intake protocol's "present is not wired" test was applied to this lane's own
output. `/api/chat` on ollama-service would have been scaffolding with no
production caller, so `ChatExecutionManager.callOllama` was switched to it in
the same change — and both routes are asserted. `OLLAMA_API_KEY` had been
documented in `.env.example` with **zero `.ts` consumers**; it now has its first.

---

## 4. What shipped

| Commit     | Scope                                                                           |
| ---------- | ------------------------------------------------------------------------------- |
| `4f83a3af` | chat-service: native tool transport (translator, dialects, tool turns, parsers) |
| `6b372c00` | connector-service: truthful Ollama `supportsTools`                              |
| `d0cdfc87` | llamacpp-service: tool DTO round-trip + per-entry `--jinja`                     |
| `214f735a` | ollama-service: `/api/chat` + local agent lane wired to it                      |
| `27e20082` | routing-service: route agent runs on tool-calling capability                    |

Each was independently gated (`tsgo --noEmit` → `lint` → `test` → `build` in the
touched workspace only), committed with hooks enabled, and pushed before the
next began.

### Gate evidence

| Workspace                | Typecheck | Lint     | Tests                | Build |
| ------------------------ | --------- | -------- | -------------------- | ----- |
| `claw-chat-service`      | 0 errors  | 0 errors | 994 pass / 78 suites | OK    |
| `claw-ollama-service`    | 0 errors  | 0 errors | 143 pass / 18 suites | OK    |
| `claw-connector-service` | 0 errors  | 0 errors | 159 pass / 17 suites | OK    |
| `claw-llamacpp-service`  | 0 errors  | 0 errors | 100 pass / 17 suites | OK    |
| `claw-routing-service`   | 0 errors  | 0 errors | 761 pass / 50 suites | OK    |

Lint warnings are non-zero in every workspace and were non-zero before this
work; `npm run lint` (the CI command) does not use `--max-warnings 0`.

---

## 5. Deviations from the packs, and why

Stated explicitly rather than applied silently, per the intake protocol.

1. **Tool turns render per-dialect at request-build time**, not appended once in
   `context-assembly.manager.ts` as the pack specifies. Anthropic's tool result
   is a `user` turn carrying content blocks; no role-preserving transform can
   produce that from an OpenAI `tool` turn. `AssembledContext.toolTurns` remains
   the single source of truth — only the rendering is per-dialect.

2. **`LlmResponse.finishedForTools` is optional**, not required. Required would
   force edits at ~20 unrelated construction sites for no behavioral gain.
   Same reasoning for `AssembledContext.toolTurns`.

3. **Anthropic-native transport is deliberately not wired.** The
   `ENABLE_ANTHROPIC_NATIVE_PDF` branch posts a Messages-shaped body to
   `/chat/completions` and parses it with the OpenAI parser — a pre-existing
   inconsistency. Attaching Anthropic-shaped tools there would produce
   `tool_use` blocks nothing can read. Tools are suppressed on that branch with
   a WARN; the ANTHROPIC dialect is fully implemented and tested in the
   translator, ready for a real Messages-API transport. **With the flag off
   (the default) Anthropic takes the OpenAI branch and does get native tools.**

4. **No `ROUTING_REQUIRE_TOOL_CAPABILITY` flag.** The pack specifies it to gate
   a future hard filter. No hard filter exists today —
   `selectProviderForCapability` already returns `null` and degrades — so the
   env var would gate nothing. Adding it would itself be scaffolding by the
   intake protocol's own test. The degradation is documented and tested instead.

5. **Streaming + tools is unimplemented, not merely untested.** Tools are
   stripped from streaming requests with a WARN. Implementing tool-call delta
   accumulation in the stream reader is real work and is not on the critical
   path — Runtime V2 uses the buffered lane.

6. **Curated capability lists, not live probes**, for Ollama tool support. A
   probe means an inference call per model across a ~250-model catalog on every
   sync. A cached one-shot probe on first _actual_ tool use is the right
   follow-up; blocking sync on it is not.

---

## 6. Handoff to Lane A

The seam is live and typechecked. Lane A's loop consumes:

```ts
// ExecutionOptions — set these on the callProvider call
toolCatalog: binding.toolDefinitions,   // triggers native translation
toolChoice: ToolChoiceMode.REQUIRED,    // the anti-drift lever; release after ONE turn

// LlmResponse — read these back
response.toolCalls        // NormalizedToolCall[] — every field toolInvocationSchema needs
response.finishedForTools // provider stopped because it wanted a tool

// AssembledContext — populate on each continuation
context.toolTurns         // completed rounds, oldest first
```

`ExecutionOptions` was already threaded through the whole provider call chain,
so **no signature changes** are needed on either side.

### Four things Lane A must know

1. **Release `REQUIRED` after one turn.** Otherwise the model can never produce
   a final answer and the run burns budget to `maxModelTurns`. This is the most
   likely way to break the loop.

2. **`REQUIRED` is unavailable on native Ollama.** `resolveToolChoicePayload`
   returns `degraded: true`. The drift correction is prompt-only on that lane
   and the UI badge should say so.

3. **`normalizeToolCalls` throws rather than guessing** —
   `MODEL_TOOL_UNKNOWN` / `MODEL_TOOL_ARGUMENT_INVALID`. A wrong reverse mapping
   would dispatch a possibly destructive tool, so an explicit repairable failure
   is strictly safer. These are the errors the repair budget should catch.

4. **From the audit, for Stage 3:** `runtimeStartSchema` is `.strict()` **and
   the parsed object is hashed whole** into the start fingerprint
   (`runtime-v2.store.ts` → the Redis START Lua script). Adding _any_ field
   changes every fingerprint, so in-flight starts replayed by a new binary
   return `CONFLICT`/`START_REPLAY_CONFLICT` rather than `REPLAY`. New fields
   must be `.optional()` **and** the rollout must accept that pre-existing Redis
   start keys are invalidated. This is not in either pack.

### Cross-lane requests

None open. No file owned by Lane A was modified by this lane; the four
chat-service files and the entire `apps/claw-coding-agent` submodule are
untouched and remain unstaged in the working tree.

---

## 7. Open items this lane did not close

- Streaming tool-call delta accumulation (deviation 5).
- A true Anthropic Messages-API transport (deviation 3).
- Cached behavioral tool probe on first actual use (deviation 6).
- Per-turn catalog pruning — the catalog is re-sent every turn and is the
  dominant recurring payload. `CHAT_TOOL_CATALOG_MAX_BYTES` bounds it; measure
  before optimizing.
- `apps/claw-coding-agent` is **absent from CI entirely** (0 matches in
  `.github/workflows/ci.yml` across 76 matrix entries and 4 jobs). This is the
  structural reason the extension-side defects went uncaught. It is Stage 0
  work in Lane A's workspace, so this lane did not touch it — but it is
  blocker-class and should not be lost.
- Live provider conformance (the six rounds in master plan §22) requires a
  running stack and real model access; not run, and therefore not claimed.
