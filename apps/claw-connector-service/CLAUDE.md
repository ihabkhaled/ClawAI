# Claw Connector Service - Development Rules

## Service Overview

Connector microservice for the Claw platform. Manages AI provider connectors, models, health events, and sync runs. Runs on port 4003 with its own PostgreSQL database (claw_connectors).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_connectors database, port 5443)
- **Cache**: Redis (ioredis)
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: JWT (jsonwebtoken) for token verification
- **Logging**: nestjs-pino / pino structured logging
- **Encryption**: AES-256-GCM for connector secrets (ENCRYPTION_KEY required)

## Absolute Rules

1. **NEVER use `any`** -- use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules** -- no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
3. **NEVER use `console.log`** -- use the NestJS `Logger` service.
4. **NEVER use `!` non-null assertion** -- handle nullability explicitly.
5. **NEVER use `process.env` directly** -- use `AppConfig` from `src/app/config/app.config.ts`.
6. **NEVER put business logic in controllers** -- controllers call exactly ONE service method.
7. **NEVER put Prisma calls outside repositories** -- repositories are the sole data-access layer.
8. **NEVER expose connector secrets in API responses or logs** -- redact sensitive fields.
9. **EVERY function must have an explicit return type**.
10. **Service methods max 30 lines**.
11. **Controllers are 3-line methods**: extract params, call ONE service, return result.
12. **All errors use BusinessException with a code**.
13. **No default exports** -- use named exports exclusively.

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Architecture

```
Controller -> Service -> Repository
```

## Owned Tables

- Connector
- ConnectorModel
- ConnectorHealthEvent
- ModelSyncRun

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run validate     # typecheck + lint:strict + format:check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
npm run prisma:generate  # Regenerate Prisma client
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop connector-service
./scripts/claw.sh rm -f connector-service
docker rmi claw-connector-service
./scripts/claw.sh up -d --build connector-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output

## LLAMACPP provider

`LLAMACPP` is registered as a `ConnectorProvider` enum value (shared-types + Prisma migration `20260501000000_add_llamacpp_provider`). `LlamacppAdapter` (`src/modules/connectors/managers/adapters/llamacpp.adapter.ts`) calls `claw-llamacpp-service` directly:

- `healthCheck` → `GET ${baseUrl}/health` — HEALTHY when `binary.installed=true`, DEGRADED when binary missing, DOWN on non-200/network error.
- `syncModels` → `GET ${baseUrl}/catalog?downloadStatus=READY&limit=100` — maps each row to `NormalizedModel` with per-model `supportsTools`/`supportsVision` derived from `entry.capabilities`.
- Default `baseUrl` is `http://llamacpp-service:4017/api/v1` — users can override per connector. Adapter doesn't require an API key.

## Gemini `supportsAudio` is a name-pattern heuristic, not a synced fact

`GeminiAdapter#syncModels` (`managers/adapters/gemini.adapter.ts`) reads two
Gemini endpoints — the OpenAI-compatible `/models` list (`id`/`object`/
`created`/`owned_by` only) and, for context windows, the native
`/v1beta/models` list. **Neither reports per-model audio-input support.**
There is no live signal to sync `supportsAudio` from, so it is never really
"synced" — writing `true` unconditionally (the bug this fixes) is a blanket
default dressed up as one, and it bit `models/antigravity-preview-05-2026`,
which Gemini itself refuses for audio with 400 "Audio input modality is not
enabled for …".

`isGeminiAudioCapableModel`
(`constants/gemini-audio-heuristics.constants.ts`) is the fix: a fail-closed
name-pattern check. Only the canonical numbered
`gemini-<major>[.<minor>]-{flash,pro}[-lite][-<digits>]` family reads as
audio-capable; `preview`/`exp`/`experimental`/`thinking`/`live` markers, and
any non-`gemini` product line, read `false` regardless of how the rest of the
name looks. Widening this is a manual, confirmed edit — never restore a
blanket `true`, and never sync `supportsAudio` from a Gemini list endpoint
without first confirming that endpoint actually carries modality data (as of
this writing, neither does).

**The snapshot re-applies it on read** (`snapshotSupportsAudio` /
`snapshotSupportsVideoInput`, `utilities/snapshot-media-capability.utility.ts`).
There is no scheduled sync — a row keeps what the last admin-triggered sync
wrote — so rows synced before the heuristic shipped kept the blanket `true`
in prod until 2026-09-25 (all 63 GEMINI rows, including imagen/veo/lyria).
The read-time guard only narrows, and it makes the deployed rule the truth
for routing and transcription whatever a row's age. An admin re-sync makes
the stored column match.

`apps/claw-file-service`'s `TranscriptionCapabilityClient` softens the blast
radius of this heuristic being wrong: `findCapableModels()` returns a ranked
list (up to two stable models per provider, previews last), and
`TranscriptionManager` moves to the next model on a "modality not enabled"
refusal or a 429 (rule 42 item 20).
That is a safety net, not a substitute for keeping this heuristic accurate —
see `skills/add-a-voice-note-or-transcription-path.md`.

## Media input capability flags — connector-service is the source of truth

Per-model media INPUT capability lives on `ConnectorModel` and flows to every
consumer from here (routing via `/internal/connectors/models-snapshot`,
file-service transcription, the chat picker via `/connectors/available-models`).
No provider list endpoint reports input modalities, so each flag is a
**name-pattern heuristic in the adapter's own constants file, and it FAILS
CLOSED**: an id outside the confirmed family is `false`.

| Flag                 | Means                                                           | Snapshot `modalitiesIn` | How it is set                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supportsVision`     | model accepts image input                                       | `IMAGE_INPUT`           | OpenAI: `isOpenAiVisionCapableModel` (`constants/openai-media-heuristics.constants.ts` — gpt-4o, gpt-4.1, gpt-4.5, gpt-4-turbo, gpt-5*, o1/o1-pro, o3/o3-pro, o4-mini; denies `-mini` reasoning models, `-audio`/`-realtime`/`-search`/`-transcribe`/`-tts`, gpt-3.5). Gemini/Anthropic: `true`. Ollama: `ollama-vision-heuristics`. Grok: `vision` in id. |
| `supportsAudio`      | connector can serve speech-to-text / audio input for this model | `AUDIO`                 | Gemini: `isGeminiAudioCapableModel`. OpenAI: `resolveOpenAiAudioFlags` — per model (`-audio-*`, `-transcribe`), with a provider-level fallback (every row `true`, logged) only when the listing has no audio model, so file-service keeps an OpenAI candidate for `whisper-1`. Others `false`.                                                             |
| `supportsVideoInput` | model accepts native video input                                | `VIDEO_INPUT`           | Gemini only: `isGeminiVideoCapableModel` (`constants/gemini-video-heuristics.constants.ts` — `gemini-<major≥2>-{flash,pro}[-lite][-preview][-<digits>]`, `models/` prefix stripped; image/tts/live/native-audio/exp/embedding refused). Every other adapter writes `false`.                                                                                |

- The snapshot string for video is `VIDEO_INPUT`, not `VIDEO`: routing-service
  writes `modalitiesIn` straight into its Prisma `ModalityKind` enum column,
  and a non-member makes that row's upsert throw.
- `AUDIO` stays `AUDIO` because file-service's transcription client reads it.
  Routing's sync maps it to `AUDIO_INPUT` at the fetch boundary
  (`normalizeSnapshotModalities`, routing `sync/utilities/snapshot-modality.utility.ts`)
  and drops any unknown string. Until 2026-09-25 it did not, and every
  audio-flagged row failed its routing upsert.
- Both repository upsert paths (`upsertMany`, `replaceMany`) write every flag
  on create AND update, so a narrowed heuristic reaches existing rows on the
  next resync.
- Widening a heuristic is a confirmed, tested edit to its constants file.
  Never restore a blanket `true`.

## PAYG credit classification (`Connector.isPayAsYouGo`)

`Connector.isPayAsYouGo` decides whether inference through a connector debits a
user's PAYG credit wallet in auth-service. **This column is the runtime
authority** — `PAYG_DEFAULT_PROVIDERS` in `@claw/shared-constants` is only the
default the migration backfills with and `paygDefaultForProvider()` applies on
create. A predicate compiled into six `node_modules` copies would make the admin
toggle unenforceable without a six-container rebuild (ADR-082).

- **Default is `false`** — an unclassified provider is free until an operator
  says otherwise. The opposite default starts charging users the moment someone
  adds a connector nobody classified.
- **`OLLAMA` stays `false`** even for Ollama-Cloud connectors, which do cost
  money upstream. Provider is the classification grain and the two are
  indistinguishable at that grain; the per-connector toggle is the lever.
- **The toggle**: `PATCH /connectors/:id { isPayAsYouGo }`, guarded by
  `ADMIN_CONNECTORS_MANAGE`. Omit the field and the current value is untouched,
  so a rename cannot silently stop metering. Every flip is audit-logged
  (`connector_payg_enabled` / `connector_payg_disabled`) with the previous value.
- **The read path**: `GET /internal/connectors/payg-policy` →
  `{ providers: { OPENAI: true, OLLAMA: false, … } }`. Provider grain, `true`
  when any **enabled** connector for that provider is PAYG. Rollup logic lives in
  `utilities/payg-policy.utility.ts`, never in the repository.
- **No cache-bust event.** auth-service caches the policy for 60 s
  (`PAYG_POLICY_CACHE_TTL_SECONDS`); do NOT invent
  `connector.payg_policy_changed`.

**The backfill lives in the migration, not a seeder.** This service has no seed
infrastructure at all — no `prisma/seed.js`, no `SeedExecution` model, no
`prisma.seed` package.json entry — and `tools/release/seed-versioned.mjs` skips
it. A seeder here is a file nothing runs.

## OpenAI-compatible connector presets (ADR-117)

15 providers (OpenRouter, Groq, Cerebras, SambaNova, DeepInfra, Fireworks,
Together, Mistral, Moonshot, Z.ai, Qwen, Cloudflare Workers AI, Vercel AI
Gateway, Perplexity, Cohere) are served by one class,
`OpenAICompatibleAdapter`, driven entirely by `CONNECTOR_PRESETS` in
`@claw/shared-utilities` — **never** hard-code a preset's base URL or display
name here; edit the registry instead. `tools/__tests__/
connector-preset-single-source.test.mjs` fails the build on a re-typed copy.

Adding provider #16: [`skills/add-an-openai-compatible-provider.md`](../../skills/add-an-openai-compatible-provider.md).

`Connector.accountId` (nullable) holds Cloudflare's account id, substituted
into the preset's `{ACCOUNT_ID}` URL placeholder by `ConnectorsManager.
getExecutionConfig` — the method chat-service's `getConnectorConfig` call
resolves through, so no caller ever sees a template URL. Validated as a
32-character lowercase hex string in `create-connector.dto.ts`.

## Exposure lookups normalize the model id (2026-09-25)

`POST /internal/connectors/models/validate-exposed` widens each requested id to
every catalog spelling (`modelKeyVariants`: as asked, bare, `models/<bare>`),
then answers with the pairs **as the caller spelled them**
(`requestedPairsMatching`, shared `modelMatchKey`). Before this, an exact match
refused `GEMINI/gemini-2.5-flash` — the VISION_HELPER role's model — because
the Gemini catalog stores `models/gemini-2.5-flash`. Found by the live
multimodal QA lane; rule 42 item 13 is the same bug class.

## Key-credit headroom (ADR-124, 2026-09-25)

`GET /internal/connectors/credit-headroom?provider=` → `{ known, remainingMicroUsd }`
(integer micro-USD; `known:true, remainingMicroUsd:null` = unlimited key). It
is the OPERATOR's balance at the provider, so unlike its `@Public()` siblings
it sits behind `ServiceTokenGuard`.

- Which providers: those whose preset declares `creditHeadroom` (OpenRouter:
  `/key` `limit_remaining` and `/credits` `total_credits − total_usage`, smaller
  wins). Read by `OpenAICompatibleAdapter.getCreditHeadroom()` — optional on
  `ProviderAdapter`; a new provider adds a `ConnectorCreditHeadroomFormat`
  member and a `parseCreditHeadroom` case.
- `CreditHeadroomManager` caches the read promise per connector for 60 s;
  endpoints time out at 2.5 s. Every failure is `known:false` (fail open —
  chat-service then sends no pre-flight cap). Floats → micro-USD by
  `usdAmountToMicroUsdFloor` (fixed-decimal truncation, never `parseFloat`).
- Only statuses are logged for credit endpoints — their bodies carry account data.
