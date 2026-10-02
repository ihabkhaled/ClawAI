# ADR-129 — Runtime V2 turns offer the admitted tools natively

## Status

Accepted — 2026-09-30. Completes the native tool transport added in
`4f83a3af6` (provider-native tool calling behind the `callProvider`
chokepoint), which no caller ever used.

## Context

chat-service can send tools to OpenAI, Anthropic, Gemini and Ollama in each
provider's own format and map their tool calls back to Runtime tool identity
(`provider-tool-translation.utility.ts`). The coding agent's Runtime V2 loop
never passed its tool list, though: `RUNTIME_V2_TURN_EXECUTION_OPTIONS` had no
`toolCatalog` and nothing set one. Every agent turn asked the model to write
its tool call as JSON inside the answer.

Reasoning models paid for that. gpt-oss spends the turn reasoning, ignores
`think: false`, and stops with no answer and no call. Live rounds measured
gpt-oss:20b at 0/8 and gpt-oss:120b at 1/8. The connector's own tool probe
passed both 3/3, so the model could call tools; our request never gave it any.

## Decision

1. **Every Runtime V2 turn declares its admitted tools**
   (`runtimeV2TurnExecutionOptions`, used by the first turn and by repair
   turns). The provider layer decides whether they go out natively. It drops
   them when `CHAT_NATIVE_TOOL_CALLING_ENABLED` is off, the provider has no
   native tool surface, or the translated catalog is over
   `CHAT_TOOL_CATALOG_MAX_BYTES`. The last case used to throw and end the run.
   It now falls back to the text lane with a warning.
2. **A native call wins over text.** `runtimeV2OutputFromNativeCalls` takes the
   first call, builds the Runtime V2 tool request, and holds it to the same
   `runtimeV2ToolRequestSchema` and `assertAdmittedTool` checks as a request
   written as text. The loop runs one tool per turn, so any further calls in the
   same turn are left for the model to repeat. With no native call, the text is
   parsed as before.
3. **A native call the provider layer cannot map is repaired, not fatal.**
   `MODEL_TOOL_UNKNOWN` and `MODEL_TOOL_ARGUMENT_INVALID` are caught around the
   turn (`settleNativeTurn`) and sent through the existing repair turn. Every
   other provider failure still ends the run.
4. **The normalizer accepts the shapes models actually send.** The system
   prompt names tools by their Runtime name (`workspace.files`) and the native
   spec by the sanitized one (`workspace_files`), and models use either. Both
   resolve to the same admitted entry, and nothing else does. It also reads
   flattened input fields, an `operation` placed inside `arguments`, and the
   target of a tool that has only one. Its errors now list the valid tools,
   operations or targets, so the repair turn can act on them.

The tool catalog hash, the admitted catalog and the extension's protocol do not
change. The extension needs no release for this.

## Consequences

- Live rounds after the change: gpt-oss:20b 7/8 (was 0/8), gpt-oss:120b 7/8
  (was 1/8), nemotron-3-super 8/8.
- Providers whose native lane was never exercised in production (Anthropic,
  OpenAI, Gemini) now receive tools on agent turns. Their request and response
  mapping is unit-tested (`chat-execution-native-tools.manager.spec.ts`) but
  had no live agent traffic before this change.
- History is still replayed to the model as text (the request as JSON, the
  result as a message), not as native tool turns. Models accept the mix. Moving
  history to native tool turns is a separate change.

## Alternatives rejected

- **Mark gpt-oss as not tool-capable.** The probe proved it is. That would have
  hidden our own bug and removed a working model.
- **Send gpt-oss a reasoning level instead of `think: false`.** Untested, model
  specific, and it would leave every other reasoning model on the fragile text
  lane.

## Addendum 2026-10: start-request admission and attachment delivery

A live audit found four Runtime V2 defects, all fixed in chat-service: (1) `markPublished` replaced the message
metadata and wiped `fileIds`, so run-start images never reached any model; the mark is now merged. (2) The server
trimmed a tool `description` before re-hashing the catalog, so trailing whitespace gave an opaque 500; the schema
no longer trims (blank is still refused) and a genuine hash mismatch is a 422 `RUNTIME_TOOL_CATALOG_HASH_MISMATCH`.
(3) Tool names colliding after native-name normalisation (`a.b`, `a_b`) are rejected at admission with
`RUNTIME_TOOL_NAME_COLLISION` instead of failing the run later. (4) An unknown risk class (for example `vision`)
returns `RUNTIME_TOOL_RISK_CLASS_UNKNOWN` listing the 13 accepted values. Admission 400s now carry a stable `code`.
