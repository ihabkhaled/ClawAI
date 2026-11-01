# ADR-153: Anthropic prompt caching, billed from the cache-write rate only when it exists

- Status: Accepted (owner approved 2026-10-02; built, default OFF; amended 2026-11-01 so agent turns carrying tools are cached; run against the live Anthropic API 2026-11-01)
- Date: 2026-10-01

## Context

A long chat thread resends its whole history every turn. Anthropic can serve the
unchanged prefix from a prompt cache: a READ costs 0.1x the input rate, a WRITE costs
1.25x (5-minute TTL), and `input_tokens` in the response EXCLUDES both. Before this
decision the repo had the request half (`applyAnthropicPromptCache`, F093 groundwork)
but nothing ever asked for a cache on the default path: Anthropic is reached through
its OpenAI-compatible `/chat/completions`, which carries no breakpoints, and the only
body that did carry them (`ENABLE_ANTHROPIC_NATIVE_PDF`) was posted to that same URL
and its reply parsed as OpenAI. Billing was therefore blind to cache writes: the
extractor folded them into the prompt at the plain input rate, 25% under what
Anthropic charges for those tokens.

Owner decision, 2026-10-01: take option (a) of
`docs/14-risk-debt/coding-agent-backend-decisions-2026-10.md` § F093, the recommended
default.

## Decision

1. **A native transport, behind a per-model switch that defaults OFF.**
   `connector_models.prompt_caching` (connector-service, DB-level, migration
   `20261002150000_add_connector_model_prompt_caching`) is set per model by an
   administrator (`PUT /connectors/:id/models/prompt-caching`,
   `ADMIN_CONNECTORS_MANAGE`, audit-logged, ANTHROPIC rows only, bounded to 200 keys).
   It travels to chat-service on the models snapshot. No environment variable, and a
   sync never turns it on; a model that is marked REMOVED has it reset to OFF, like
   exposure. When ON, and only then, chat-service calls Anthropic's own
   `POST {baseUrl}/messages` (`x-api-key`, `anthropic-version: 2023-06-01`) with a
   system breakpoint and the automatic top-level breakpoint, and reads the native
   buffered reply or the native SSE stream (`AiStreamProtocol.ANTHROPIC_SSE`).
2. **A cache-write usage field, end to end.** `TokenUsage.cacheCreationPromptTokens`
   and `RawTokenBreakdown.cacheWriteInputTokens` (shared-types, optional, omitted
   when zero), `PaygFinalizeUsage.cacheCreationPromptTokens`, the finalize DTO field
   `usage.cacheCreationPromptTokens` (auth-service, additive, default 0) and
   `weighted_usage_records.raw_cache_write_tokens` (migration
   `20261002150000_add_weighted_usage_cache_write_tokens`).
3. **Billed from `cacheWritePerMillionMicroUsd` ONLY when that rate row is present.**
   `calculateCostMicroUsd` prices the write slice at the published write rate when it
   is positive. When the rate is null, zero or non-finite, the slice is billed as
   ordinary input, exactly what it was billed as before: the field changes nothing,
   the write is never free, and no premium is invented. The three prompt slices (fresh
   input, cache read, cache write) are disjoint and always sum to the prompt total.
4. **The hold covers the premium.** `credit-reservation.manager` finalizes through
   `applySettlement`, which charges `min(actual, held)`. A hold sized at the plain
   input rate would silently absorb the write premium: a margin loss no ledger row
   shows. A request that asks for caching therefore sends
   `cacheWritePromptTokens` on reserve (the estimated prompt, the worst case), and the
   affordability clamp holds those tokens at the dearer of the write and input rates.
   With no published write rate the figure is what it was before.
5. **Where it is allowed.** `isPromptCacheEligible`: provider ANTHROPIC, the catalog
   switch ON, a tool catalog (if the call carries one) that the native body can express
   (see the amendment below), and no hold taken by the caller (compare reserves every lane before the call, sized without the
   premium). Anything uncertain (no policy wired, an unreadable catalog, a thrown
   lookup) is "no caching", never an error.
6. **The legacy flag-gated body no longer carries breakpoints.**
   `ENABLE_ANTHROPIC_NATIVE_PDF` still builds its body, but `buildAnthropicMessagesRequestBody`
   applies `applyAnthropicPromptCache` only for the cached native transport. That body
   has no reader for cache usage, so a breakpoint there would be an unbilled write.

## Consequences

- Nothing changes for any user until an owner flips a model on. With the switch off
  the request, the hold, the settlement and the response shape are byte-for-byte what
  they were (asserted in `payg-credit-anthropic-cache.spec.ts`).
- The first request after a switch-on pays the write premium; later turns read the
  prefix at 0.1x. A prefix under the model's minimum (512 to 4096 tokens) is not
  cached and reports no write, so short chats cost what they did.
- A model switched on with NO published write rate is cached but its writes are
  billed at the input rate (25% under what Anthropic charges the platform, and the
  user gets no read discount either, because the read rate also falls back to input
  when absent). Publish the write and read rates (`ModelCostVersion`) BEFORE
  switching a model on. The seed already carries them for the Claude 4 family.
- A tool-carrying agent turn is cached too (amendment below). That is the common agent shape and
  the one that resends the most prefix, so it is where the saving is largest.
- A cold-cache hold is up to 25% larger on the prompt portion. It is released at
  finalize, but a user close to their balance can be clamped sooner.

## What would make this stale

- Anthropic changing the write multiplier or the 5-minute TTL. The rate is a catalog
  row, so the price follows; the TTL and the breakpoint count are constants in
  `anthropic-prompt-cache.constants.ts`.
- Anthropic changing how `tools` sit in the cached prefix (tools, system, messages), or the
  `input_json_delta` stream framing the reader assembles.
- Compare lanes taking a hold sized for the premium (they could then be cached).
- The 1-hour TTL (2x write). Not requested anywhere; `usage.cache_creation` splits
  by TTL and would need its own slice.
- Gemini or OpenAI exposing a billable write: `cacheCreationPromptTokens` is already
  provider-neutral, so only the extractor and a rate row would be new.

## Seeding

No seeder is needed and none is added: the migration column `DEFAULT false` is the idempotent seed (re-running changes nothing), a catalog sync never writes the flag, and a model a sync marks REMOVED is switched back OFF. Turning it on is the admin call `PUT /connectors/:id/models/prompt-caching` (permission `ADMIN_CONNECTORS_MANAGE`); there is no environment variable.

## Amendment 2026-11-01: agent turns carrying tools are cached

Owner decision, 2026-11-01 ("Yes" to enabling caching for tool-carrying agent turns). Until now a
call carrying a Runtime tool catalog stayed on the OpenAI-compatible path, which ignores
`cache_control`, so the agent (the heaviest resender of prefix) never saved a token.

1. **The native body carries the tools.** `attachAnthropicTools` puts the catalog (Anthropic
   shape, `toAnthropicToolSpecs`) and `tool_choice` on the cached body. The prefix order is tools,
   system, messages, so the existing system breakpoint covers the tools: every turn of a run reads
   them from cache.
2. **The native transport reads `tool_use`.** The buffered reply is reverse-mapped by
   `normalizeToolCalls` under the ANTHROPIC dialect. The stream reader assembles `tool_use` blocks
   from `content_block_start` plus `input_json_delta` frames and releases one `tool-calls` fragment
   before usage and `done`. A stream that ends without `message_stop` drops its half-built calls
   instead of running truncated JSON.
3. **The hold covers the catalog.** The text estimate cannot see the tool catalog, yet it is
   prompt and the first thing written to the cache, so `reservePaygHold` adds its estimated tokens
   (`byteSize / 4`) to both `promptTokens` and `cacheWritePromptTokens`. Without this the premium on
   those tokens would be absorbed (settlement is capped at the hold).
4. **Eligibility changed from "carries tools" to "tools unavailable".** `toolsUnavailable` is true
   when the call carries a catalog the native body cannot express (over `CHAT_TOOL_CATALOG_MAX_BYTES`,
   unknown dialect). A tool-less native request would silently turn the run into a no-op, so that
   call stays uncached on the compatible path. Compare lanes (caller-supplied hold) are unchanged.
5. **Proof.** Live, 2026-11-01, against the real Anthropic API with a tool body of this shape and a
   ~19k-token prefix: HTTP 200, the tool schema accepted, a `tool_use` block returned, and the second
   buffered call and the streamed call each read 19,428 tokens from cache (`cache_read_input_tokens`),
   with 14 `input_json_delta` frames on the stream. Unit and spec coverage:
   `anthropic-cache-tools.spec.ts`, `anthropic-stream-protocol.spec.ts`.

Still gated by the per-model admin switch (default OFF). Nothing changes for a model until an owner
flips it on, and publish the write and read rates first (see Consequences).

## Amendment 2026-11-01 (hold sizing)

An independent review of item 3 found the hold too small for a cached tool call. Fixed:

1. The tool catalog and the tool-result history (`context.toolTurns`) are sized at 2.5 bytes per
   token (`CACHED_JSON_BYTES_PER_TOKEN`), not 4: JSON tokenizes denser than prose.
2. 400 tokens (`CACHED_TOOL_PROMPT_MARGIN_TOKENS`) are added for Anthropic's hidden tool-use system
   prompt, which the request body does not contain.
3. A reply cut off by `stop_reason` `max_tokens` drops `tool_use` blocks whose arguments are not
   complete JSON (complete ones are still released).

Tests: +1 hold test, +1 stream test (chat-messages: 285 files, 4050 tests pass). Caching is still
OFF for every model by default. Open, not fixed: a stream with `stop_reason` `tool_use` but no
`message_stop` emits `done` as `tool_calls` with zero calls (unconfirmed stall risk).

## Amendment 2026-11-01 (a stable prefix inside one run)

Live proof on the dev stack showed turn 2 of one agent run rewriting the whole prefix (cache write
21,905, read 0) while a NEW run read it fine. Cause, found by hashing the real requests: the Runtime V2
loop appended the per-turn tool result to `systemPrompt`, and that is the block the cache breakpoint
sits on, so any change inside it invalidates everything before and after it.

1. `AssembledContext.systemPromptTail` holds text that changes every turn (the tool result and the
   result-files note). `runtime-v2-loop.manager.ts` sets it instead of extending `systemPrompt`.
2. On the cached Anthropic body the tail is the LAST text block of the last user turn
   (`utilities/anthropic-turn-tail.utility.ts`, `splitSystemTail` in the execution manager). A first
   attempt made it a second system block after the breakpoint; the live re-run still wrote 9,117 tokens
   and read 0 on turn 2, because a system block sits before the messages, so turn 2's messages could
   never match turn 1's. On every other body the tail is the last part of the one system message.
3. The hold counts the tail (`buildPromptString`), so the money rule is unchanged.

Rule: nothing that differs between two turns of one run may sit before the part you want read from the
cache. Put it at the end.
