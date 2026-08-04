# Autonomous coding runtime — concurrent agent coordination

Two agents are working this feature at the same time. This file is the ownership
ledger. **Read it before editing any file listed here.** If you need a file owned by
the other lane, add a request under "Cross-lane requests" rather than editing it.

Source packs (both read end to end by both lanes):

- `ClawAI_Future_Autonomous_Coding_Runtime_Ollama_Master_GPT_PLAN.md` (W0–W11)
- `CODING_AGENT_NATIVE_TOOL_CALLING_CLAUDE_PLAN.md` (Stage 0–7, D1–D22)

## Lane A — runtime loop, drift, extension target/thread

Detected in-flight at 2026-08-04 02:52 (+0300) via working-tree mtimes. Deliverable
already landed: `current-state-status.md`.

Owned files — **Lane B must not edit these**:

| Workspace                | File                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `apps/claw-chat-service` | `src/modules/chat-messages/managers/runtime-v2-loop.manager.ts`              |
| `apps/claw-chat-service` | `src/modules/chat-messages/utilities/runtime-v2-model-output.utility.ts`     |
| `apps/claw-chat-service` | `src/modules/chat-messages/constants/runtime-v2-model-output.constants.ts`   |
| `apps/claw-chat-service` | `src/modules/chat-messages/utilities/__tests__/runtime-v2.utilities.spec.ts` |
| `apps/claw-coding-agent` | `src/infrastructure/vscode-runtime-target-adapter.ts`                        |
| `apps/claw-coding-agent` | `src/services/runtime-studio-helpers.ts`                                     |
| `apps/claw-coding-agent` | `src/services/workflow-service.ts`                                           |
| `apps/claw-coding-agent` | `src/services/agent-coordinator.ts`                                          |
| `apps/claw-coding-agent` | `package.json`, `CHANGELOG.md`, `tests/unit/**`                              |

Lane A scope, from its own "next units" list: native-tool **consumption** in the V2
loop, capability-drift detection, receipt-backed final-answer verification, intent
classification / mode contracts, and the attachments/research legacy-lane trace.

## Lane B — native tool transport and the four model lanes

Claimed 2026-08-04. Corresponds to Stage 1, Stage 4 and Stage 5 of the native
tool-calling pack, and to W4/W5 of the master plan. Chosen because Lane A's own
dependency list names "native provider tool transport" as its #1 blocker while
owning none of the files that implement it.

Owned files — **Lane A must not edit these**:

| Workspace                     | Files                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/claw-chat-service`      | `types/provider-tool.types.ts`, `types/tool-turn.types.ts` (new)                           |
| `apps/claw-chat-service`      | `src/common/enums/provider-tool-dialect.enum.ts`, `tool-choice-mode.enum.ts` (new)         |
| `apps/claw-chat-service`      | `constants/provider-tool.constants.ts` (new)                                               |
| `apps/claw-chat-service`      | `utilities/provider-tool-translation.utility.ts`, `provider-tool-dialect.utility.ts` (new) |
| `apps/claw-chat-service`      | `types/execution.types.ts`, `types/execution-options.types.ts`, `types/context.types.ts`   |
| `apps/claw-chat-service`      | `managers/chat-execution.manager.ts`, `managers/context-assembly.manager.ts`               |
| `apps/claw-ollama-service`    | whole workspace                                                                            |
| `apps/claw-connector-service` | Ollama adapter + tool-capability utility                                                   |
| `apps/claw-llamacpp-service`  | inference DTO, launcher, catalog                                                           |
| `apps/claw-routing-service`   | capability router, routing manager, seeds                                                  |

## The seam between the lanes

Lane B produces, Lane A consumes:

```ts
// apps/claw-chat-service/src/modules/chat-messages/types/execution-options.types.ts
export type ExecutionOptions = {
  fastPathEnabled: boolean;
  maxOutputTokens?: number;
  applyShortResponseConstraint: boolean;
  toolCatalog?: readonly ToolDefinitionDto[];   // Lane B adds
  toolChoice?: ToolChoiceMode;                  // Lane B adds
};

// types/execution.types.ts — LlmResponse
toolCalls?: readonly NormalizedToolCall[];      // Lane B adds
finishedForTools: boolean;                      // Lane B adds

// types/context.types.ts — AssembledContext
toolTurns: readonly ToolTurn[];                 // Lane B adds; every site defaults to []
```

`ExecutionOptions` is already threaded `callProvider → dispatchProvider →
callCloudProvider → buildCloudProviderRequestBody`, so this seam needs **zero
signature churn** in either lane. Lane A sets `toolCatalog` from
`binding.toolDefinitions` and reads `response.toolCalls`; Lane B guarantees those
fields exist and are dialect-correct.

`AssembledContext.toolTurns` is additive with a `[]` default, so Lane A's loop keeps
compiling before it starts populating it.

## Rules both lanes follow

1. **Never `git add -A` or `git add .`** — explicit paths only. The tree contains two
   agents' work simultaneously; a bulk add contaminates the other lane's commit.
2. **Gate only the workspace you touched** (`npx tsgo --noEmit && npm run lint &&
npm test && npm run build`). Never all-workspace.
3. **One commit, one push.** `git log --oneline origin/main..HEAD` must be empty
   before the next commit, so the other lane never rebases onto unpushed work.
4. **Never bypass a hook** (ADR-061).
5. Before editing a file not listed here, add it to your lane's table first.

## Lane B status — transport COMPLETE and pushed

All five units are on `main`, each independently gated and pushed before the next:

| Commit     | Scope                                                               |
| ---------- | ------------------------------------------------------------------- |
| `4f83a3af` | chat-service: native tool transport (translator, dialects, parsers) |
| `6b372c00` | connector-service: truthful Ollama `supportsTools`                  |
| `d0cdfc87` | llamacpp-service: tool DTO round-trip + per-entry `--jinja`         |
| `214f735a` | ollama-service: `/api/chat` + local agent lane wired to it          |
| `27e20082` | routing-service: route agent runs on tool-calling capability        |

Lane A's #1 blocker — "native provider tool transport" — is closed. The seam is
live and typechecked; see
[`lane-b-delivery-report.md`](lane-b-delivery-report.md) §6 for the handoff.

Consume it like this — **no signature changes needed on either side**, because
`ExecutionOptions` was already threaded through the whole provider call chain:

```ts
// set on the callProvider call
toolCatalog: binding.toolDefinitions,
toolChoice: ToolChoiceMode.REQUIRED,   // release after ONE turn or the run can never finish

// read back
response.toolCalls        // NormalizedToolCall[] — every field toolInvocationSchema needs
response.finishedForTools

// populate on each continuation
context.toolTurns
```

Four things worth knowing before wiring it:

1. **Release `REQUIRED` after one turn**, or the model can never produce a final
   answer and the run burns budget to `maxModelTurns`.
2. **`REQUIRED` does not exist on native Ollama.** `resolveToolChoicePayload`
   reports `degraded: true`; the correction is prompt-only there.
3. **`normalizeToolCalls` throws rather than guessing** (`MODEL_TOOL_UNKNOWN`,
   `MODEL_TOOL_ARGUMENT_INVALID`) — a wrong reverse mapping could dispatch a
   destructive tool. These are what the repair budget should catch.
4. **For Stage 3:** `runtimeStartSchema` is `.strict()` **and the parsed object
   is hashed whole** into the start fingerprint. Adding any field changes every
   fingerprint, so in-flight starts replayed by a new binary return
   `CONFLICT`/`START_REPLAY_CONFLICT` rather than `REPLAY`. New fields must be
   `.optional()` and the rollout must accept invalidated Redis start keys.
   This is in neither pack.

## Cross-lane requests

_(none open)_

No file owned by Lane A was modified. The four chat-service files and the whole
`apps/claw-coding-agent` submodule are untouched and remain unstaged.
