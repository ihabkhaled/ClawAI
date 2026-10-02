# ADR-153: Anthropic prompt caching, billed from the cache-write rate only when it exists

- Status: Accepted (owner approved 2026-10-02; built, default OFF, not yet run against the live Anthropic API)
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
   switch ON, no native tool catalog on the call (the native transport has no
   `tool_use` reader, so a tool turn stays on the compatible path), and no hold taken
   by the caller (compare reserves every lane before the call, sized without the
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
- A tool-carrying agent turn is not cached. That is the common agent shape, so the
  saving lands on plain chat first.
- A cold-cache hold is up to 25% larger on the prompt portion. It is released at
  finalize, but a user close to their balance can be clamped sooner.

## What would make this stale

- Anthropic changing the write multiplier or the 5-minute TTL. The rate is a catalog
  row, so the price follows; the TTL and the breakpoint count are constants in
  `anthropic-prompt-cache.constants.ts`.
- A `tool_use` reader on the native transport (a tool catalog could then be cached).
- Compare lanes taking a hold sized for the premium (they could then be cached).
- The 1-hour TTL (2x write). Not requested anywhere; `usage.cache_creation` splits
  by TTL and would need its own slice.
- Gemini or OpenAI exposing a billable write: `cacheCreationPromptTokens` is already
  provider-neutral, so only the extractor and a rate row would be new.

## Seeding

No seeder is needed and none is added: the migration column `DEFAULT false` is the idempotent seed (re-running changes nothing), a catalog sync never writes the flag, and a model a sync marks REMOVED is switched back OFF. Turning it on is the admin call `PUT /connectors/:id/models/prompt-caching` (permission `ADMIN_CONNECTORS_MANAGE`); there is no environment variable.
