# ADR-117: OpenAI-compatible connector presets are one registry and one adapter

**Status**: Accepted
**Date**: 2026-09-23

## Context

Adding a new AI provider meant a new `ConnectorProvider` enum value, a new
adapter class copy-pasted from DeepSeek's or Grok's (both already
OpenAI-compatible: `GET {baseUrl}/models`, Bearer auth), and the same base
URL and display name re-typed in `apps/claw-frontend/src/constants/
connector.constants.ts`, `apps/claw-connector-service/src/modules/connectors/
constants/*.constants.ts`, and `apps/claw-chat-service/src/common/constants/
execution.constants.ts`. Fourteen more OpenAI-compatible providers
(OpenRouter, Groq, Cerebras, SambaNova, DeepInfra, Fireworks, Together,
Mistral, Moonshot, Z.ai, Qwen, Cloudflare Workers AI, Vercel AI Gateway,
Perplexity, Cohere) would have meant fourteen more adapter files and up to
five re-typed copies of each base URL — the DeepSeek/Grok pattern generalised
badly by hand.

## Decision

1. **One registry, `CONNECTOR_PRESETS`** in `@claw/shared-utilities`
   (`connector-presets` subpath), typed as `ConnectorPreset[]` in
   `@claw/shared-types`. Each entry carries everything provider-specific:
   display name, category (`LLM` today; `IMAGE`/`SEARCH`/`EMBEDDING`/
   `RERANK`/`DATA` reserved for later), picker group, default base URL,
   alternate regional base URLs, model-list endpoint and response shape,
   a static model catalogue for providers with no usable list endpoint,
   health-check endpoint, extra fields (Cloudflare's account id), tool/vision
   support, PAYG default, free-tier flag, and the four quick links (register,
   API keys, pricing, docs).
2. **One adapter, `OpenAICompatibleAdapter`**, constructed with a preset.
   `healthCheck`, `syncModels` and `getCapabilities` all read the preset;
   nothing provider-specific is hard-coded in the class. No
   `probeToolCapability` — a behavioural probe spends the administrator's key,
   which stays an explicit choice, not a default.
3. **Explicit enum values, not a generic `OPENAI_COMPATIBLE` + presetKey
   column.** Routing, cost seeds and judge parsing already key on the
   provider _name_ (`RouterProvider`, `KNOWN_JUDGE_PROVIDERS`,
   `PROVIDER_COST_PER_1M_TOKENS`); collapsing fifteen providers into one enum
   value would break every one of those without a second migration to widen
   them to a `(provider, presetKey)` pair. The cost of fifteen enum values
   plus one migration each is lower than that widening, and enum values are
   the existing pattern DeepSeek and Grok already set.
4. **The base URL is resolved once**, in `ConnectorsManager.
getExecutionConfig`, not by every caller. A preset's `{ACCOUNT_ID}`
   placeholder is filled there; a caller that resolved it independently could
   diverge from the connector row the moment an administrator edits the base
   URL or account id.
5. **A repo-level test is the enforcement**, not code review:
   `tools/__tests__/connector-preset-single-source.test.mjs` fails if any
   preset's base-URL host or display name appears in source outside the
   registry and its own spec.

## Rejected alternatives

- **A copy-pasted adapter per provider** (the DeepSeek/Grok pattern):
  fourteen files, each one bug fixed thirteen times.
- **A generic `OPENAI_COMPATIBLE` enum value with a `presetKey` column**:
  breaks every existing provider-keyed table (`RouterProvider`,
  `PROVIDER_COST_PER_1M_TOKENS`, `KNOWN_JUDGE_PROVIDERS`) without also
  widening each to a compound key — deferred, not chosen, because the pack
  asked for a stated trade-off rather than a silent one.
- **Reading `CONNECTOR_PRESETS` from `@claw/shared-types`**: the registry is
  DATA (URLs, model lists), not a type — `@claw/shared-constants` would fit,
  but it cannot depend on `@claw/shared-types` for the `ConnectorPreset`
  shape without inverting the package DAG (`shared-types` is a leaf).
  `@claw/shared-utilities` already depends on both and already hosts
  `knownContextWindow`, the platform's other single-source provider table.

## Consequences

- A new OpenAI-compatible provider is one registry entry plus one enum value
  in three places (Prisma schema, `@claw/shared-types`,
  `apps/claw-frontend/src/enums/connector-provider.enum.ts`) and one
  migration — not a new adapter class.
- `Connector.accountId` is a new nullable column, used only by Cloudflare
  today; any future preset needing a similar per-connector field gets a new
  `ConnectorPresetExtraField` member and a nullable column, following the
  same pattern as `workspaceId` (Anthropic).
- `PAYG_DEFAULT_PROVIDERS` in `@claw/shared-constants` grew by fourteen
  entries because every preset here bills per token; the registry test
  (`connector-presets.spec.ts`) cross-checks that every preset with
  `defaultIsPayAsYouGo: true` is listed there.
- Batch 1 (this ADR) ships the registry, types, migration, generic adapter
  and connector-service wiring. chat-service's `KNOWN_JUDGE_PROVIDERS` /
  `PROVIDER_BASE_URLS`, routing-service's provider tables, and the frontend
  searchable combobox are follow-up batches against the same registry.

## Related

- [`skills/add-an-openai-compatible-provider.md`](../../skills/add-an-openai-compatible-provider.md)
- [`apps/claw-connector-service/CLAUDE.md`](../../apps/claw-connector-service/CLAUDE.md)
- [`docs/04-backend/service-guide-connector.md`](../04-backend/service-guide-connector.md)
