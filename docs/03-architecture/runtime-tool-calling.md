# Runtime V2 provider-native tool calling

How the admitted Runtime V2 tool catalog reaches a model, and how the model's
tool calls get back. Owned by `apps/claw-chat-service`.

## The defect this closes

`claw-chat-service` used to advertise the Runtime V2 tool catalog by
`JSON.stringify`-ing it into the **system prompt string** and asking, in
English, for a JSON object back. Any reply not starting with `{` was classified
as a finished answer.

A capability refusal — "I can't clone your repos, execute Playwright, or hand
you a real .zip; I'm a text-based assistant with no runtime environment" — is
prose. Prose doesn't start with `{`. So the refusal was recorded as a
successful assistant message and the run terminalized `completed`.

The model was never wrong. It was never given a tool. Every capability it
denied having is implemented, policy-gated, budgeted, and wired to an executor
in the extension — 17 tools over ~145 operations.

**This is an encoding defect at the backend↔model boundary.** Not a prompt
problem, not a model problem, not a capability problem.

## Two contracts, one of them broken

|       | Contract                                                                                                                    | Broken?                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **A** | extension ↔ backend — `runtimeStartSchema`, `toolInvocationSchema`, `toolResultSchema`, ordered SSE with `sequence`/`after` | **No.** Not implicated at all.  |
| **B** | backend ↔ model — an English sentence asking for JSON                                                                       | **Yes. This is the whole bug.** |

Contract A stays. It carries fields native tool calling has no slot for and
that are load-bearing: `epochs` (the 4-axis account/workspace/target/policy
invalidation cursor that fences stale approvals), `riskClasses` + `targetIds`
(approval gating and multi-target routing), `receipt`
(`argumentHash`/`resultHash`/`durationMs`/`outputBytes`/`truncated`/`redactionApplied`),
`continuation.action`, and a 7-dimension `budget`. OpenAI's tool object is
`{name, description, parameters}` — there is nowhere to put any of it.

More importantly, Runtime V2 tools execute **client-side, across an SSE hop**,
with VS Code approval modals, workspace-path containment and trust rechecks. An
OpenAI-compatible framing models an _in-process_ loop, which cannot express
"ask the human first, on their machine."

Only contract B's encoding changes.

## Translation shape

**One native function per tool**, with `operation` and `targetId` lifted into
the function's parameter schema:

```jsonc
{
  "type": "function",
  "function": {
    "name": "workspace_files",
    "description": "Bounded workspace discovery, reads, and transactional file mutation.\n\nOperations: stat, list, glob, search, read, …",
    "parameters": {
      "type": "object",
      "properties": {
        "operation": { "type": "string", "enum": ["stat", "list", "…"] },
        "targetId": { "type": "string", "enum": ["target:workspace"] },
        "arguments": {/* definition.inputSchema, verbatim */},
      },
      "required": ["operation", "targetId", "arguments"],
      "additionalProperties": false,
    },
  },
}
```

Two facts force this shape:

1. A Runtime V2 `inputSchema` is already a **flat superset** covering all of a
   tool's operations (`strict({...})` → `required: []`,
   `additionalProperties: false`), while `operation` and `targetId` live
   _outside_ `arguments` in `ToolInvocation`. Lifting them in is lossless.
2. There are ~145 operations across 17 tools. One function per operation blows
   every provider's practical catalog size and dominates the token budget.

The reverse mapping is exact and total: `tool_calls[i].function.name` → per-run
lookup → `{toolName, toolVersion, operation, targetId, arguments}` — every
field `toolInvocationSchema` requires. `tool_calls[i].id` is retained
separately to correlate the result message.

## Four traps, and what guards each

| Trap                                                                                                                                                                                                                                                                                          | Guard                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name sanitization is not injective.** `TOOL_NAME_PATTERN` allows both `.` and `_`, so `workspace.files` and `workspace_files` both sanitize to `workspace_files` for OpenAI's `^[a-zA-Z0-9_-]{1,64}$`. A string-replace round trip could dispatch a _different, possibly destructive_ tool. | A per-run `Map<nativeName, entry>`; `translateToolCatalog` throws `RUNTIME_TOOL_CATALOG_INVALID` on collision at build time. The reverse trip never string-replaces. |
| **OpenAI `strict: true` would reject the entire catalog.** Strict mode requires every property in `required` at every nesting level; Runtime V2 emits `required: []`.                                                                                                                         | Never enabled. Asserted by a test that reads the real `workspace.files` schema.                                                                                      |
| **`arguments` is a JSON _string_ on OpenAI and an _object_ on Ollama/Anthropic.** Getting it wrong produces malformed invocations, not errors — a silent bug.                                                                                                                                 | `parseArgumentPayload` accepts both and converges; both shapes have explicit per-dialect tests.                                                                      |
| **`targetId` as an `enum` is only correct while targets are static.** All 17 tools declare 1 target each today; `toolDefinitionSchema` allows up to 32.                                                                                                                                       | The enum is rebuilt per run from `definition.targetIds`, so dynamic targets already work.                                                                            |

## Provider dialect matrix

|                      | OpenAI-compatible                        | Anthropic                                                       | Ollama native                          |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| **Reaches**          | OPENAI, GEMINI, DEEPSEEK, GROK, LLAMACPP | ANTHROPIC, AWS_BEDROCK                                          | OLLAMA, local-ollama                   |
| **Request field**    | `tools[].function.parameters`            | `tools[].input_schema`                                          | `tools[].function.parameters`          |
| **Response**         | `choices[0].message.tool_calls[]`        | `content[]` item `{type:'tool_use', id, name, input}`           | `message.tool_calls[]`                 |
| **`arguments` type** | **JSON string**                          | object (`input`)                                                | object                                 |
| **Call id**          | provider-supplied                        | provider-supplied                                               | **often absent — synthesized**         |
| **Result message**   | `{role:'tool', tool_call_id, content}`   | `{role:'user', content:[{type:'tool_result', tool_use_id, …}]}` | `{role:'tool', tool_call_id, content}` |
| **Force a call**     | `tool_choice: 'required'`                | `tool_choice: {type:'any'}`                                     | **not supported**                      |

Three consequences worth stating plainly:

- **Anthropic's tool result is a `user` turn, not a `tool` turn.** This is why
  tool turns are rendered per-dialect at request-build time rather than being
  converted from one canonical OpenAI shape: no role-preserving transform can
  produce a `user` turn from a `tool` turn.
- **Ollama cannot be forced.** `ToolChoiceMode.REQUIRED` has no expression on
  native `/api/chat`. `resolveToolChoicePayload` reports `degraded: true`
  rather than silently pretending the correction applied.
- **Gemini's native path is deliberately skipped.** `functionDeclarations` uses
  an OpenAPI subset that rejects `additionalProperties` and `maxLength`, which
  every Runtime V2 `inputSchema` carries. When a tool catalog is present,
  `buildCloudProviderRequestBody` does not take the Gemini-native branch and
  falls through to the OpenAI-compatible builder, which accepts the schemas
  verbatim.

## Where it plugs in

`ExecutionOptions` is the entire insertion point:

```ts
toolCatalog?: readonly ToolDefinitionDto[];
toolChoice?: ToolChoiceMode;
```

It is already threaded `callProvider → dispatchProvider → callCloudProvider →
buildCloudProviderRequestBody`, so **no signature in that chain changed**. This
also keeps every model call inside the universal token-deduction chokepoint:
a tool turn is an ordinary `callProvider` call, so `recordUsage` fires exactly
once per turn — asserted by a test.

`AssembledContext.toolTurns` carries the completed tool rounds. It is optional
with a `[]` default, so every existing construction site compiles untouched.

The dialect is a property of the request **shape**, not the provider: an
Anthropic model routed through the OpenAI-compatible body speaks the OpenAI
tool dialect. Builders therefore pass the dialect of the branch they took.
A second, independent check confirms the _provider_ has a known native tool
surface at all — an unrecognized gateway gets no tools even on an
OpenAI-compatible body.

## Two silent failure modes that are now regression-tested

**The `tools` field that was promised but never assigned.**
`buildOllamaChatRequestBody` carried a six-line comment ending _"We pass them
unconditionally so deepseek-v4-pro / kimi-k2 / GLM-5.1 can do real web access
end-to-end"_ directly above a bare `return requestBody`. Commit `459e5cb0`
added the assignment; `9c4106e2` deleted it and left the comment. No model on
that lane had ever been offered a tool.

**The empty-content throw.** `parseOllamaChatResponse` threw
`CLOUD_PROVIDER_EMPTY_RESPONSE` whenever `message.content` was blank. **A native
tool-call turn has empty content by design** — the model is asking for a tool,
not answering. Without this fix every successful Ollama tool call would have
terminated the run with "Cloud provider OLLAMA returned no message content",
which is exactly the terminal error observed in production. The emptiness check
now also considers `tool_calls`.

## Streaming

Native tools are **stripped from every streaming request**, on both the
OpenAI-SSE and Ollama-NDJSON paths, with a WARN.
`provider-stream-reader.utility.ts` accumulates content and usage deltas only —
it has no `tool_call` delta handling — so a streamed tool call would be
silently swallowed. Runtime V2 always uses the buffered path, so this is a
defensive guard; a future streaming caller fails loudly in the log instead of
losing tool calls.

## Known gaps

- **Anthropic native transport.** The `ENABLE_ANTHROPIC_NATIVE_PDF` branch
  posts a Messages-shaped body to `/chat/completions` and parses the reply with
  the OpenAI-shaped parser. Attaching Anthropic-shaped tools there would
  produce `tool_use` blocks nothing can read, so tools are suppressed on that
  branch with a WARN. The ANTHROPIC dialect is fully implemented and tested in
  the translator, ready for a real Messages-API transport. **With the flag off
  (the default), Anthropic falls through to the OpenAI branch and does get
  native tools.**
- **Streaming + tools** is unimplemented, not merely untested — see above.
- **Catalog token cost is real and recurring.** The catalog is re-sent on every
  turn. `CHAT_TOOL_CATALOG_MAX_BYTES` bounds it; per-turn pruning is a
  follow-up to evaluate against measurements, not speculatively.

## Files

| Path (under `apps/claw-chat-service/src`)                              | Role                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `common/enums/provider-tool-dialect.enum.ts`                           | `OPENAI \| ANTHROPIC \| OLLAMA \| NONE`                                   |
| `common/enums/tool-choice-mode.enum.ts`                                | `AUTO \| REQUIRED \| NONE`                                                |
| `modules/chat-messages/types/provider-tool.types.ts`                   | Wire shapes + normalized form                                             |
| `modules/chat-messages/types/tool-turn.types.ts`                       | Provider-neutral completed tool round                                     |
| `modules/chat-messages/constants/provider-tool.constants.ts`           | Dialect table, name charset, caps                                         |
| `modules/chat-messages/utilities/provider-tool-translation.utility.ts` | Catalog translation, call normalization, per-dialect transcript rendering |
| `modules/chat-messages/utilities/provider-tool-dialect.utility.ts`     | Dialect + tool-choice resolution                                          |
| `modules/chat-messages/managers/chat-execution.manager.ts`             | Attaches tools to requests, parses tool calls off responses               |

Configuration: `CHAT_NATIVE_TOOL_CALLING_ENABLED`, `CHAT_TOOL_CATALOG_MAX_BYTES`
— see [`docs/06-data/environment-variables.md`](../06-data/environment-variables.md).
