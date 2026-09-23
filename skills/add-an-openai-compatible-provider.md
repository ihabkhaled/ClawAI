---
name: add-an-openai-compatible-provider
summary: Add a new OpenAI-compatible AI provider as one registry entry, no new adapter class.
task_keywords:
  [
    connector preset,
    openai-compatible provider,
    new model provider,
    openrouter groq cerebras sambanova deepinfra fireworks together mistral moonshot zai qwen cloudflare vercel perplexity cohere,
    CONNECTOR_PRESETS,
    OpenAICompatibleAdapter,
  ]
applies_to:
  [
    packages/shared-utilities/src/connector-presets,
    packages/shared-types/src/enums/connector-provider.enum.ts,
    apps/claw-connector-service/prisma/schema.prisma,
    apps/claw-frontend/src/enums/connector-provider.enum.ts,
  ]
required_rules: [12-types-enums-constants-and-declaration-ownership, 08-security-rules]
required_context: [package-boundaries]
affected_workspaces:
  [
    packages/shared-utilities,
    packages/shared-types,
    apps/claw-connector-service,
    apps/claw-frontend,
  ]
required_tests: [connector-presets.spec.ts case, adapter spec case if the response shape is new]
required_docs: [docs/13-adr/adr-117-connector-presets-one-registry-generic-adapter.md]
validation_lane: cd packages/shared-utilities && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add an OpenAI-compatible provider

Since ADR-117, an OpenAI-compatible provider (one whose API answers
`GET {baseUrl}/models` and takes `Authorization: Bearer <key>`, or close to
it) is **one entry in `CONNECTOR_PRESETS`**, not a new adapter class. This
covers the 15 presets: OpenRouter, Groq, Cerebras, SambaNova, DeepInfra,
Fireworks, Together, Mistral, Moonshot, Z.ai, Qwen, Cloudflare Workers AI,
Vercel AI Gateway, Perplexity, Cohere.

## When to use

- The provider's chat completions endpoint is OpenAI-shaped
  (`/chat/completions`, `messages`, `model`, streaming via SSE deltas).

## When NOT to use

- The provider needs its own request shape (Anthropic Messages API, Gemini
  `generateContent`) → write a real adapter under
  `apps/claw-connector-service/src/modules/connectors/managers/adapters/`
  and register it directly in `adapter-factory.ts`.
- It is a non-LLM category (image, search, embedding, rerank, data) →
  `ConnectorPresetCategory` reserves the enum members but no adapter reads
  them yet; that is future work, not this skill.

## Repository discovery steps

1. Read `packages/shared-utilities/src/connector-presets/connector-presets.constants.ts`
   end to end — every existing preset is a worked example of the fields below.
2. Read `packages/shared-utilities/src/connector-presets/connector-presets.utility.ts`
   for how a base URL and endpoint are resolved (`resolvePresetBaseUrl`,
   `resolvePresetEndpoint`).
3. Read `apps/claw-connector-service/src/modules/connectors/managers/adapters/
openai-compatible.adapter.ts` for how the preset drives `healthCheck` /
   `syncModels` / `getCapabilities`.
4. Read the provider's own docs page for its model list — **never invent a
   model id**. Cite the page in `staticModelsSource` if there is no usable
   list endpoint, or leave `staticModels` empty if `GET /models` works.
5. Probe the list endpoint unauthenticated (`curl`) to learn its JSON shape
   and add a `ConnectorModelsResponseFormat` member only if none of the four
   existing ones (`OPENAI_LIST`, `BARE_ARRAY`, `COHERE_MODELS`,
   `CLOUDFLARE_SEARCH`) fit.

## Implementation steps

1. **Enum value**, in three places, kept in sync by
   `tools/__tests__/connector-preset-single-source.test.mjs` and
   `connector-presets.spec.ts`'s exhaustiveness test:
   - `packages/shared-types/src/enums/connector-provider.enum.ts`
   - `apps/claw-connector-service/prisma/schema.prisma` (`ConnectorProvider`)
     - a migration: `ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS '<KEY>';`
   - `apps/claw-frontend/src/enums/connector-provider.enum.ts`
2. **One entry in `CONNECTOR_PRESETS`** (`packages/shared-utilities/src/
connector-presets/connector-presets.constants.ts`): key, displayName,
   category (`LLM`), group (which section of the admin picker), default base
   URL (no trailing slash), alternate regional base URLs, models endpoint
   (path or absolute URL, or `null` with a `staticModels` catalogue),
   response format, health-check endpoint (or `null` to fall back to a
   one-token completion), extra fields (only `ACCOUNT_ID` exists — add a new
   `ConnectorPresetExtraField` member and a nullable `Connector` column for
   anything else), `defaultIsPayAsYouGo` (true unless the provider is
   genuinely free), `hasFreeTier`, `supportsNativeTools`, `visionModelPattern`
   (a narrow regex, or `null`), and the four links.
3. **Add the provider to `PAYG_DEFAULT_PROVIDERS`** in
   `packages/shared-constants/src/payg-credit.constants.ts` if
   `defaultIsPayAsYouGo` is `true` — `connector-presets.spec.ts` fails the
   build if it is missing.
4. **If the model list needs a new field the four `ConnectorModelsResponse
Format` values cannot express**, extend `provider-model-list.utility.ts`'s
   parser for that format rather than adding a bespoke adapter.
5. Rebuild the shared packages
   (`shared-constants`, `shared-types`, `shared-utilities`, in that order)
   before typechecking connector-service — it reads their `dist/`.

## Tests-first plan

- A case in `connector-presets.spec.ts`'s parametrized suites proves the new
  preset is well-formed (falls out of the existing `it.each` over
  `CONNECTOR_PRESETS` — no new test needed unless the preset needs a new
  response format or extra field, which gets its own case).
- If the response shape needed a new `ConnectorModelsResponseFormat`, add a
  parsing case to `preset-model-list.utility.spec.ts` and a sync case to
  `openai-compatible.adapter.spec.ts`.

## Security considerations

- Never hard-code a model id you have not read from the provider's own docs
  or a live probe.
- An extra field that reaches a URL path (like Cloudflare's account id) gets
  a Zod pattern in `create-connector.dto.ts` validated BEFORE storage, not
  only at call time — see `connectorAccountIdSchema`.
- The key is sent only when the connector has one (`authHeaders` in the
  adapter); never assume a public list endpoint proves a key.

## Failure modes

- Typing the provider's base URL or display name anywhere outside
  `CONNECTOR_PRESETS` → `connector-preset-single-source.test.mjs` fails.
- A preset with `defaultIsPayAsYouGo: true` missing from
  `PAYG_DEFAULT_PROVIDERS` → `connector-presets.spec.ts` fails.
- Claiming `supportsNativeTools` or a `visionModelPattern` without provider
  evidence → routes an agent run to a model that silently ignores `tools`,
  or ships an image to a text-only model.

## Validation commands

```bash
cd packages/shared-utilities && npm run typecheck && npm run lint && npm test && npm run build
cd ../shared-types && npm run typecheck && npm run lint && npm test && npm run build
cd ../shared-constants && npm run typecheck && npm run lint && npm test && npm run build
cd ../../apps/claw-connector-service && npx prisma generate && npm run typecheck && npm run lint && npm test && npm run build
```

## Definition of done

- One `CONNECTOR_PRESETS` entry, three enum values, one migration.
- `connector-preset-single-source.test.mjs` and `connector-presets.spec.ts`
  both green.
- `PAYG_DEFAULT_PROVIDERS` updated if the preset is metered.
- Model ids cited from a real docs page or a live probe, never invented.
