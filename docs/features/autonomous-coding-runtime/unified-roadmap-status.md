# Unified master prompt — roadmap status

Required by `CLAWAI_UNIFIED_AUTONOMOUS_CODING_AGENT_MASTER_PROMPT.md` §0: every
item classified `OPEN` / `PARTIAL` / `IMPLEMENTED` / `REGRESSED` / `OBSOLETE` /
`BLOCKED` / `NEEDS_EMPIRICAL_PROBE`, with each status citing current code, a
current test, or a reproducible observation — never an assumption carried over
from a source plan.

Two agents work this feature concurrently; see
[`agent-coordination.md`](agent-coordination.md) for the ownership ledger.
Lane A owns the runtime loop, drift and extension host. Lane B owns provider
transport and the model lanes. This file states Lane B's evidence and marks
Lane A's items as such rather than claiming them.

---

## Release units (§23)

| Unit    | Theme                                            | Status                              | Evidence                                                         |
| ------- | ------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------- |
| **R0**  | Current-state dossier                            | `IMPLEMENTED`                       | `current-state-status.md` (Lane A) + this file                   |
| **R1**  | P0 correctness, observability, CI                | `PARTIAL`                           | see below                                                        |
| **R2**  | Runtime 2.1, effective catalog, auth             | `OPEN`                              | no 2.1 schema exists; `runtimeStartSchema` still `.strict()` 2.0 |
| **R3**  | Native tool gateway, transcript, anti-drift      | `PARTIAL` — transport `IMPLEMENTED` | 7 commits, below                                                 |
| **R4**  | Effort/speed/capability registry, stream lines   | `PARTIAL`                           | §10 + §11 wired; §9 probes OPEN — see below                      |
| **R5**  | All provider/data-plane lanes                    | `PARTIAL`                           | 4 of 4 lanes carry tools; bridge/residency `OPEN`                |
| **R6**  | Governed research, re-search, crawl              | `OPEN`                              | research-service exists, not exposed as Runtime tools            |
| **R7**  | Unified context/modes, receipt-backed completion | `OPEN`                              | Lane A                                                           |
| **R8**  | High-risk host tools, clone, browser, artifacts  | `OPEN`                              | `workspace.git` still has no clone operation                     |
| **R9**  | Recovery, revocation, concurrency, sub-agents    | `OPEN`                              | Lane A                                                           |
| **R10** | UX, localization, conformance, release           | `OPEN`                              | Lane A                                                           |

---

## R1 — P0 correctness, baseline truth, observability, CI

### Parent repository

| Item                                                          | Status        | Evidence                                                      |
| ------------------------------------------------------------- | ------------- | ------------------------------------------------------------- |
| Add/verify Coding Agent CI coverage despite being a submodule | `IMPLEMENTED` | `e22675ad` — `submodule-integrity` job; run 30917133082 green |
| Surface Runtime negotiation/readiness in safe logs            | `OPEN`        | Lane A (extension-side `runtime-protocol-service.ts`)         |
| Descriptor reflects deployed route/readiness, not constants   | `OPEN`        | agent-service descriptor still static                         |
| Current-state documentation and failure fixtures              | `IMPLEMENTED` | `current-state-status.md`, `lane-b-delivery-report.md`        |

**On the CI item specifically.** The source plan asserted this was blocker-class
because the extension "has never been gated". That is now only half true and
the distinction matters: the extension repository runs its own
lint / typecheck / test / bundle / VSIX-integrity gates, and they are green.
What was genuinely unguarded is the _parent's_ gitlink. A pointer committed
here referencing an unpushed extension commit leaves the parent green locally
and breaks every fresh clone with `upload-pack: not our ref`. The new job
fetches the recorded SHA by object id to prove it was pushed, and warns if it
is not an ancestor of the extension's default branch. Re-running the
extension's own suites here was deliberately **not** done — it would duplicate
green gates and require checking out large test fixtures the parent checkout
does not fetch.

### Coding Agent + accounting

Lane A. Their dossier records target-execution separation and repair-context
bounding as landed; exact-once reservation reconciliation remains `OPEN`.

---

## R3 — Native tool gateway, transcript, anti-drift

### Chat service (Lane B) — all `IMPLEMENTED`

| Item                                                          | Evidence                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Provider tool types / dialects / translation                  | `provider-tool.types.ts`, `provider-tool-dialect.utility.ts`, `provider-tool-translation.utility.ts`; 43 tests |
| Thread catalog + tool choice through the existing chokepoint  | `ExecutionOptions.toolCatalog` / `.toolChoice`; zero signature churn                                           |
| Native normalization for OpenAI-compatible, Anthropic, Ollama | per-dialect request build + response parse; both `arguments` shapes tested                                     |
| Synthesize missing call IDs safely                            | Ollama omits ids; `call_<index>` synthesized and asserted                                                      |
| Preserve usage accounting once per call                       | test asserts `recordUsage` fires exactly once per tool turn                                                    |
| Retain prompt JSON as explicit fallback                       | `CHAT_NATIVE_TOOL_CALLING_ENABLED=false` → `NONE` dialect                                                      |
| Name collisions fail at catalog build                         | `RUNTIME_TOOL_CATALOG_INVALID`; asserted                                                                       |
| Transcript survives async extension execution                 | `AssembledContext.toolTurns` rendered per dialect                                                              |

### Runtime loop (Lane A) — `OPEN` / in progress

Native calls becoming Runtime invocations, continuation appending real provider
turns, the bounded drift correction, releasing forced tool choice after one
turn, and server-side model-turn/runtime budget enforcement are all Lane A.
Their `80824b74` landed drift rejection.

### R3 acceptance criteria

| Criterion                                          | Status                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| Anthropic/OpenAI/Ollama argument shapes round-trip | `IMPLEMENTED`                                                    |
| Name collisions fail at catalog build              | `IMPLEMENTED`                                                    |
| Prompt JSON lane remains functional                | `IMPLEMENTED`                                                    |
| Native tool call executes and continues            | `NEEDS_EMPIRICAL_PROBE` — needs a live run through Lane A's loop |
| Exact historical refusal triggers correction       | `NEEDS_EMPIRICAL_PROBE` — Lane A owns the trigger                |
| Transcript survives async extension execution      | `PARTIAL` — rendering done; Redis persistence is Lane A's store  |

---

## R5 — Provider and local data planes

| Lane                                            | Status        | Evidence                                                                                           |
| ----------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Ollama local                                    | `IMPLEMENTED` | `/api/chat` added; `callOllama` switches to it when a catalog is present                           |
| Ollama Cloud                                    | `IMPLEMENTED` | `buildOllamaChatRequestBody` now assigns `tools` (D7 closed)                                       |
| llama.cpp                                       | `IMPLEMENTED` | DTO round-trips `tools`/`tool_calls`/`role:'tool'`; `--jinja` per catalog entry                    |
| OpenAI-compatible (OpenAI/Gemini/DeepSeek/Grok) | `IMPLEMENTED` | OpenAI dialect; Gemini-native bypassed when tools present                                          |
| Anthropic                                       | `PARTIAL`     | dialect implemented + tested; native transport suppressed — see deviation 3 in the delivery report |
| Streaming on all lanes                          | `IMPLEMENTED` | delta accumulator; 13 reader tests                                                                 |
| Local bridge / data-residency classes           | `OPEN`        | no bridge exists                                                                                   |

---

## Three instances of one bug class — closed

Worth recording as a pattern rather than three tickets. **"Empty content" is not
a valid emptiness test on any lane that can carry tools**, because a tool-call
turn carries the call rather than prose:

| Site                       | Symptom                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `parseOllamaChatResponse`  | `CLOUD_PROVIDER_EMPTY_RESPONSE` — the exact terminal error in Lane A's dossier |
| Ollama `/api/chat` adapter | would have rejected every tool-call turn                                       |
| `runExecutor` (streaming)  | `STREAM_EMPTY_RESPONSE` on every streamed tool call                            |

All three now test for content **or** tool calls. Any other place encoding that
assumption should be treated as suspect.

---

## Supply chain and gates

| Item                          | Status        | Evidence                                                                                         |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| Dependency currency           | `IMPLEMENTED` | 8 dependabot PRs resolved in `ffe73750`; branches deleted                                        |
| Vulnerabilities               | `IMPLEMENTED` | `npm audit` → 0 (was 2 high: brace-expansion, fast-uri)                                          |
| Lockfile / `npm ci` integrity | `IMPLEMENTED` | `87b0831d` — root `overrides` desync fixed; `npm ci --ignore-scripts` exits 0                    |
| VSIX release gate             | `IMPLEMENTED` | `e557000` repackage; Release run green                                                           |
| typescript 7                  | `BLOCKED`     | TS7 is the native compiler and removes the JS API ts-jest needs; PR #146 closed with rationale   |
| isomorphic-dompurify 3        | `BLOCKED`     | v3 → jsdom 30 → pure-ESM `@exodus/bytes` breaks Jest; no advisory against 2.26.0; PR #147 closed |

---

## What still requires a live stack

Stated as unknowns rather than assumed, per §0. None of these can be closed by
source inspection or unit tests:

- Whether a real provider emits a tool call ClawAI executes end to end
  (§26 missions 1–10, §27 giant acceptance mission).
- Whether the deployed descriptor reports `toolExecution: true`.
- Which Ollama Cloud models actually emit `tool_calls` — the curated capability
  list in `ollama-tool-heuristics.constants.ts` is an informed classification,
  not a probe result.
- Whether the llama.cpp catalog GGUFs carry tool-aware chat templates, and
  whether `--jinja` starts cleanly on each.
- Whether `stream: true` + `tools` behaves on every provider in this stack. The
  reader handles both dialects and is unit-tested against captured frame
  shapes; no request has been made against a live provider.

Running containers currently serve the **pre-bump** dependency set: their
`node_modules` is baked into the image (only `src`, `package.json` and `prisma`
are bind-mounted), so the bumps land on the next image rebuild. All 8 restarted
containers report healthy.

---

## R4 — Effort, speed, model evidence, stream lines

### §9 capability evidence — contract `IMPLEMENTED`, probes `OPEN`

| Item                                                   | Status        | Evidence                                                                               |
| ------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------- |
| `ModelCapabilityEvidence` record shape                 | `IMPLEMENTED` | `shared-types/src/types/model-capability-evidence.type.ts`                             |
| Source + confidence vocabulary                         | `IMPLEMENTED` | `CapabilityEvidenceSource`, `CapabilityConfidence`                                     |
| Cache key = connection + version + model + digest      | `IMPLEMENTED` | `ModelCapabilityCacheKey`                                                              |
| Connector emits provenance, not a bare boolean         | `IMPLEMENTED` | `ollama.adapter.ts` → `toolEvidence`                                                   |
| §9.2 behavioural tool probe                            | `IMPLEMENTED` | `a12a5249` + `69ccd21f` — `POST /connectors/:id/models/:modelKey/probe-tools`; 7 tests |
| §9.2 discovery sequence (`/api/show`, warm, `/api/ps`) | `OPEN`        | context allocation not yet read from `/api/ps`                                         |
| Probe result persisted onto the model record           | `OPEN`        | probe returns evidence; storing it needs a schema column                               |
| §9.3 routing filters/ranks on evidence                 | `OPEN`        | needs a connector→routing transport for evidence                                       |

**The honest state.** `6b372c00` gave the Ollama connector a curated family
list, which §9 explicitly names as the anti-pattern ("never route Agent work
from a hard-coded model-name guess"). The curated list is still the only
source — what changed is that it now _says so_: every record carries
`PROVIDER_ADVERTISED` / `ADVERTISED` and a rationale ending "not yet
behaviourally probed", asserted by a test that the rationale never claims
otherwise. That converts a silent guess into a labelled one. It does not
convert it into evidence, and this file will not claim otherwise until a probe
actually runs.

`CapabilityConfidence.FAILED` is deliberately distinct from `UNKNOWN` so a
model that failed a probe can never be re-ranked upward by a later
curated-list match.

### §10 effort contract — `IMPLEMENTED` (no callers yet)

| Item                                            | Status        | Evidence                                 |
| ----------------------------------------------- | ------------- | ---------------------------------------- |
| `ClawEffortProfile` ladder incl. `ULTRA` preset | `IMPLEMENTED` | `claw-effort-profile.enum.ts`            |
| `ResolvedEffort` with resolution kind + warning | `IMPLEMENTED` | `effort-resolution.type.ts`              |
| Orchestration table (§10.3)                     | `IMPLEMENTED` | `EFFORT_ORCHESTRATION`                   |
| Budget envelopes (§10.5)                        | `IMPLEMENTED` | `EFFORT_BUDGET`, monotonicity asserted   |
| Never silently map an unsupported profile       | `IMPLEMENTED` | every downgrade sets `warning`; 19 tests |
| Never send `ultra` to a provider                | `IMPLEMENTED` | asserted directly                        |
| Resolve downward, never upward                  | `IMPLEMENTED` | asserted                                 |
| Provider adapters call the resolver             | `OPEN`        | contract only; no lane consumes it yet   |

The resolver has **no production callers**. That is stated plainly rather than
buried: by this repository's own "present is not wired" test it is currently a
contract, not a behaviour. It was built ahead of its consumers deliberately —
§10 is the thing R4's provider work has to agree on, and agreeing on it after
four lanes have each invented their own mapping is how the mappings diverge.
The next unit wires it into the provider adapters.

### §11 speed contract — `IMPLEMENTED` and wired

| Item                                            | Status        | Evidence                                                                         |
| ----------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `ClawSpeedProfile` + `SpeedProviderMode`        | `IMPLEMENTED` | `claw-speed-profile.enum.ts`                                                     |
| `ResolvedSpeed` with multiplier + concurrency   | `IMPLEMENTED` | `speed-resolution.type.ts`                                                       |
| Never claim 2× while running standard           | `IMPLEMENTED` | multiplier stays 1 when ungranted; asserted                                      |
| `UNSUPPORTED` distinct from `STANDARD`          | `IMPLEMENTED` | asserted — otherwise the degradation is invisible                                |
| Concurrency drops back when the tier is refused | `IMPLEMENTED` | asserted                                                                         |
| Mutating ops never parallelised for speed       | `IMPLEMENTED` | only read-only ceilings scale                                                    |
| OpenAI `service_tier` on the wire               | `IMPLEMENTED` | `132c6010`                                                                       |
| Anthropic `speed` lane                          | `IMPLEMENTED` | `a2d226c9`                                                                       |
| Observed TTFT / tokens-per-second recorded      | `IMPLEMENTED` | measured at finalize, on `LlmResponse.speed.observed`; omitted when not measured |
| llama.cpp local acceleration profiles           | `OPEN`        | needs benchmarked per-model server profiles                                      |

The multiplier is deliberately the _granted_ envelope rather than the requested
one. It is both what the user is shown and what a cost reservation is sized
from, so reporting 2× on a run that received standard throughput would
overcharge for speed nobody got.

---

## R6 — why it is not started

R6 exposes search / fetch / crawl as **server-owned** Runtime tools (§15.1):
tools the backend dispatches directly, with no extension roundtrip.
`claw-research-service` already has the endpoints (`search`, `fetch`, `scrape`,
`research`), so the capability exists.

What is missing is the dispatch half. A server-owned tool has to be admitted
into the catalog and then executed from the Runtime V2 loop —
`runtime-v2-loop.manager.ts`, which is **Lane A's file** in the ownership
ledger. Writing the tool definitions without the dispatch would produce exactly
the "present is not wired" scaffolding this repository's intake protocol
rejects, and which this lane has already had to correct once.

This is a genuine cross-lane dependency, not a scheduling choice. It unblocks
as soon as Lane A's loop can dispatch a server-owned target.

---

## Tooling fixes made along the way

| Item                                                              | Evidence                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-commit hook OOM on multi-workspace commits                    | `80ecf396` — ESLint heap 4 GB → 8 GB, matching what CI already sets. A gate that dies with "Ineffective mark-compacts near heap limit" reads like a broken commit and teaches people to reach for `--no-verify`.                |
| `unicorn/no-useless-undefined` autofix broke a required parameter | Surfaced by the hook's own typecheck step. `resolveEffort`'s third parameter is now genuinely optional, which is also the more accurate signature — "this lane has no effort parameter" is a real case, not a missing argument. |
