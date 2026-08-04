# Autonomous coding runtime — current-state status dossier

Baseline dossier required by the unified master prompt §1.2, produced before any behavioral
implementation. Every status below cites a current file and line range, a current test, or a
reproducible observation. Findings that could not be proven in this pass are recorded as
`NEEDS_EMPIRICAL_PROBE` rather than assumed in either direction.

## Baseline identity

| Fact                       | Value                                                           | Source                                  |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| Parent repository HEAD     | `879b9d30`                                                      | `git rev-parse HEAD`                    |
| Parent branch              | `main`, clean worktree                                          | `git status --porcelain` (empty)        |
| Submodule pointer          | `72ee174b` (`apps/claw-coding-agent`)                           | `git submodule status`                  |
| Submodule remote           | `https://github.com/ihabkhaled/ClawAI-Coding-Agent.git`         | `.gitmodules`                           |
| Extension version at audit | `0.41.0` → bumped to `0.41.1`                                   | `apps/claw-coding-agent/package.json:5` |
| Extension HEAD             | `72ee174` "fix(chat): persist runtime threads and model labels" | `git -C apps/claw-coding-agent log`     |
| Knowledge context          | `pack=backend-feature · workspaces=2 · rules=8 · skills=8`      | `npm run knowledge:context`             |

The submodule pointer and the parent's latest commit ("chore(extension): update coding agent to
0.41.0") agree, and the submodule is checked out clean at the recorded pointer.

## Spot-check re-audit (master prompt §1.1)

The master prompt lists five claims observed on 2026-08-03. Re-audited against current code:

| #   | Claim                                                                              | Status                    | Evidence                                                                                                                              |
| --- | ---------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Coding Agent reports `0.41.0`                                                      | `IMPLEMENTED` (confirmed) | `apps/claw-coding-agent/package.json:5`                                                                                               |
| 2   | Parent has a newer submodule update                                                | `OBSOLETE`                | Pointer `72ee174b` matches the parent's 0.41.0 update commit; no drift                                                                |
| 3   | Backend uses a prompt-authored catalog and treats non-JSON prose as a final answer | `OPEN` (confirmed)        | `runtime-v2-model-output.utility.ts:12-26` and `:39-42`                                                                               |
| 4   | Extension target adapter emits `online: false`                                     | `REGRESSED` → now fixed   | `vscode-runtime-target-adapter.ts:189` (was)                                                                                          |
| 5   | Agent coordinator routes attachment/research runs through the legacy lane          | `NEEDS_EMPIRICAL_PROBE`   | `agent-coordinator.ts:403-404` gates on attachments/research, but the lane consequence was not traced to a dispatch site in this pass |

## P0 — target dispatch was universally broken

This is the highest-severity finding and it was proven by test before it was fixed.

The failure chain:

1. `describeRuntimeTarget()` hard-coded `online: false` on the workspace target with no probe of
   either execution readiness or network state
   (`apps/claw-coding-agent/src/infrastructure/vscode-runtime-target-adapter.ts:189`).
2. Every specialized target (`target:container`, `target:database`, `target:browser`) is built by
   spreading that same object, so all inherited `online: false` (same file, `:260-265`).
3. `ExecutionTargetRegistry.register()` derives `state: target.online ? 'online' : 'offline'`, so
   every registered target was `offline`
   (`apps/claw-coding-agent/src/services/execution-target-registry.ts:43`).
4. `ExecutionTargetRegistry.select()` throws `Execution target is ${state}` before its epoch and
   capability checks, so **no tool invocation could ever be dispatched** (same file, `:53`).

Observed failure before the fix, from `tests/unit/execution-target-registry.test.ts`:

```
AssertionError: expected [Function] to throw error matching /epoch is stale/u
+ Received: "Execution target is offline"
```

Even the stale-epoch and unknown-capability tests failed with `Execution target is offline`,
because the offline check short-circuits every other guard. That is the signature of a total
dispatch outage, not a narrow bug.

This directly contradicted master prompt §31 items 2 and 3, and §25.6 "local target online while
internet is off".

### Fix applied

`online` now means **execution readiness** and nothing else — a target with at least one workspace
root is dispatchable regardless of internet state. Least privilege is unchanged: an untrusted
workspace still advertises only `legacy.chat`, so `select()` continues to reject filesystem and
process tools on the capability check.

`runtime-studio-helpers.ts:125` previously derived `networkReachability: target.online ? 'internet'
: 'offline'` from the same flag — one boolean fabricating two unrelated facts. It now reports
`workspace-only`, the truthful value when no network probe has run. `networkReachability` has no
behavioral consumer today (verified by grep), so this change is purely a truthfulness correction.

The wire field is still named `online` because renaming it is a Protocol 2.0 contract change, which
§3.3 forbids outside a negotiated compatibility window. Rename it in the 2.1 additive work.

## P0 — repair rounds compounded context until the provider returned nothing

Reported from live screenshots (Ollama Cloud, `kimi-k2.7-code`) and reproduced by test.

Observed symptoms, in order:

1. A plain `hi` cost 873 tokens.
2. A conversational question ("can you do a research ?") was wrapped in the full code-generation
   JSON contract and answered as a JSON edit plan at 34,214 tokens.
3. The next round reached 68,008 tokens, then 68,405 — each carrying a verbatim copy of the prior
   refusal inside `<previous-response>`.
4. Terminal state: **"Cloud provider OLLAMA returned no message content."**

Root cause: `agent-run-service.ts:274-281` sends the repair on `malformed.threadId` — the malformed
turn is therefore already in the provider transcript — and then
`buildEditPlanRepairPrompt(input.content, malformed.content, …)` re-embedded that same response
**verbatim and unbounded** at `workflow-service.ts:114-116`. The turn was counted twice and grew
every round, which is the observed ~34k → ~68k doubling. The re-injected refusal is also what the
model kept echoing back, which is the "interfering with very old prompts" the report describes.

Confirmed by test before the fix: an 80,000-character refusal produced an 81,146-character repair
prompt — full pass-through.

### Fix applied

The echoed previous response is capped at 4,000 characters with an explicit
`[previous response truncated]` marker. This satisfies master prompt §7.3 ("bounded number of
turns, cumulative byte cap, per-result truncation, oldest-first elision marker"), none of which
existed on this lane.

This bounds the growth. It does **not** fully close the underlying design defect — see below.

## P0 — a capability refusal was recorded as a successful completed run

`RuntimeV2LoopManager.executeClaimedRun` took any `kind: 'final'` output straight to
`messages.create({ role: ASSISTANT })` followed by `terminalize({ status: 'completed' })`
(`apps/claw-chat-service/src/modules/chat-messages/managers/runtime-v2-loop.manager.ts`). Combined
with the prose classifier below, a model replying "I cannot access your filesystem" produced a
**completed, successful run** whose stored assistant message is a false statement about the
runtime's own capabilities. This is the mechanism behind the reported hallucination: the runtime was
recording the model's incorrect self-description as truth.

### Fix applied

Added `isCapabilityDenial()` (`runtime-v2-model-output.utility.ts`), backed by narrow patterns in
`constants/runtime-v2-model-output.constants.ts`. It matches agent-self capability denials only, and
is explicitly tested **not** to match:

- a genuine safety refusal — "I will not help exfiltrate credentials";
- a truthful factual negative — "The file does not exist at that path";
- successful tool-grounded reporting — "I read src/index.ts and found the entry point".

`correctCapabilityDrift()` implements §7.4: when a final answer denies a capability **and** the
admitted catalog is non-empty, it re-asks once with a truthful capability correction. A second
denial throws `MODEL_CAPABILITY_DRIFT` (422), which the existing catch terminalizes as `failed`. The
refusal is never persisted as a successful assistant message.

Patterns match literal single spaces against whitespace-normalized input rather than `\s+`, which
keeps them linear-time — the ReDoS-prone first draft was caught by `security/detect-unsafe-regex`
and rewritten.

## Correction: native tool transport partially exists

An earlier reading of this codebase suggested no native `tools` transport at all. That is too
strong. `utilities/ollama-cloud-tool-runner.utility.ts` and
`constants/ollama-cloud-tools.constants.ts` implement genuine native tool calling for Ollama Cloud —
but **only for hosted research tools** (`web_search`, `web_fetch`), which is exactly the §12.5
distinction ("treat hosted web search/fetch as research adapters"). Anthropic and Ollama message
shape utilities also exist.

The accurate statement: native tool plumbing exists for hosted research on some lanes; the
**Runtime V2 workspace catalog** (filesystem, git, command, browser, container, database) still
reaches the model only as prompt JSON. The R3 work is therefore smaller than a greenfield build —
it extends existing shapes to carry the workspace catalog.

## Confirmed open: the prompt-JSON lane is the only lane

`buildRuntimeV2ModelInstruction()` serializes the admitted tool catalog into the **system prompt**
as JSON text (`JSON.stringify(catalog)`) rather than passing native provider tools
(`apps/claw-chat-service/src/modules/chat-messages/utilities/runtime-v2-model-output.utility.ts:12-26`).

`parseRuntimeV2ModelOutput()` then classifies any response not starting with `{` or ` ``` ` as a
final answer:

````ts
if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) {
  return { kind: 'final', content };
}
````

(same file, `:39-42`)

Consequence: a model that replies "I cannot access your filesystem" is recorded as a **successful
final answer**. There is no drift detector (§7.4) and no receipt-backed final-answer verifier
(§3.8). This is master prompt §3.4's `PROMPT_JSON` compatibility lane operating as the only lane,
without the degraded badge §3.4 requires.

This is the single largest remaining correctness gap and it is what makes the runtime _look_ like
it is hallucinating: the model is never given real tools, so it correctly reports it has none, and
the backend then treats that refusal as success.

## Confirmed open: intent is not classified before the edit-plan contract is applied

`buildWorkflowPrompt()` wraps **every** request in the code-generation JSON contract
(`workflow-service.ts:45-78`), which is why `hi` and "can you do a research ?" were both answered as
edit plans. Master prompt §4 requires distinct `CHAT` / `AGENT` / `PLAN` / `RESEARCH` contracts with
operational intent _promoting_ to Agent, not every message being coerced into one lane. Unassigned;
this is R7 work.

## Baseline exit gate (master prompt §1.3)

| Question                                                                    | Answer                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Is Runtime V2 selected for a clean Agent request?                           | `NEEDS_EMPIRICAL_PROBE` — requires a live run                                                       |
| Does the deployed descriptor report tool execution ready?                   | `NEEDS_EMPIRICAL_PROBE` — requires a deployed descriptor                                            |
| Is the local target execution-ready independently of internet reachability? | **Yes, now.** Was categorically no; fixed and regression-tested                                     |
| Does the selected model receive native tools, prompt JSON, or no tools?     | **Prompt JSON for the workspace catalog**; native tools exist for Ollama Cloud hosted research only |
| Are attachments and research still forcing legacy execution?                | `NEEDS_EMPIRICAL_PROBE` — gate found, consequence untraced                                          |
| Is first-thread startup idempotent and race-safe?                           | `NEEDS_EMPIRICAL_PROBE` — 0.41.0 claims a fix; not independently reproduced                         |
| Is Runtime usage reserved and finalized exactly once?                       | `NEEDS_EMPIRICAL_PROBE`                                                                             |
| Which models have proven tool/effort/streaming/context capabilities?        | **None** — no capability evidence registry exists (§9 unimplemented)                                |
| Which source-plan defects are already fixed by 0.41.0?                      | Claim 2 only                                                                                        |

**The gate is not fully open.** Five questions still require live-stack probes. The two fixes landed
here are those the dossier proved by failing test first, which §1.2 step 12 and §32 permit.

## Verification performed

Scoped to the touched workspaces per repository policy — never all-workspace.

`apps/claw-coding-agent`:

| Gate                        | Result                                                       |
| --------------------------- | ------------------------------------------------------------ |
| `vitest run tests/unit`     | **747 passed / 114 files**                                   |
| `tsc --noEmit`              | exit 0                                                       |
| `eslint . --max-warnings=0` | exit 0                                                       |
| `node esbuild.mjs`          | exit 0                                                       |
| `npm run package`           | `clawai-coding-agent-0.41.1.vsix` (127 files, 16.47 MB)      |
| `npm run package:audit`     | OK — 23 commands, 13 locales, strict CSP, no secret settings |

`apps/claw-chat-service`:

| Gate                             | Result                     |
| -------------------------------- | -------------------------- |
| `jest src/modules/chat-messages` | **457 passed / 44 suites** |
| `tsgo --noEmit`                  | exit 0                     |
| `eslint src/`                    | 0 errors                   |
| `npm run build`                  | exit 0                     |

Installed-artifact verification (§30 steps 16–18):

- `code --install-extension … --force` → "successfully installed"
- `code --list-extensions --show-versions` → `clawai.clawai-coding-agent@0.41.1`
- Installed `dist/extension.js` contains `executionReady`, `workspace-only`, and
  `[previous response truncated]` — the shipped bundle matches source.

`package-lock.json` was bumped with `npm install --package-lock-only`; the diff is exactly the two
version fields, with no dependency churn.

Not run, and therefore **not claimed**: Redis E2E, extension-host suite, Playwright, the live
provider conformance missions (§26), the giant acceptance mission (§27), and the Ollama Cloud
model/feature sweep. Those need a running stack and provider credentials.

Two pre-existing `max-lines-per-function` warnings remain in `runtime-v2-loop.manager.ts`. The file
already exceeded the 80-line rule before this work; the drift correction was extracted into its own
method to limit rather than worsen the overage.

## Next units, in dependency order

1. **Native provider tool transport for the workspace catalog** (§7, R3) — the gating defect. Until
   the model receives real tools, every downstream truthfulness guarantee is unreachable. Extend the
   existing Ollama/Anthropic message-shape utilities rather than building a new plane.
2. **Receipt-backed final-answer verifier** (§3.8) — drift detection now rejects false capability
   denials, but a positive claim ("I updated the file") is still unverified against receipts.
3. **Intent classification and mode contracts** (§4, R7) — stop coercing conversation into the
   edit-plan lane. `buildWorkflowPrompt` is the single chokepoint to change.
4. **Model capability evidence registry** (§9) — required before any effort/speed routing claim.
5. Trace and close spot-check claim 5 (attachments/research lane).
6. Live conformance missions (§26) and the giant acceptance mission (§27), which need a running
   stack and provider credentials.
