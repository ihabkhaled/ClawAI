# Service Guide: claw-connector-service

## Overview

| Property    | Value                          |
| ----------- | ------------------------------ |
| Port        | 4003                           |
| Database    | PostgreSQL (`claw_connectors`) |
| ORM         | Prisma 5.20                    |
| Env prefix  | `CONNECTOR_`                   |
| Nginx route | `/api/v1/connectors/*`         |

The connector service manages AI provider connections (OpenAI, Anthropic, Gemini, DeepSeek, AWS Bedrock, Ollama, Grok/xAI). It stores encrypted API keys, syncs available models from each provider, and runs periodic health checks.

## Database Schema

### Connector

| Column          | Type              | Notes                              |
| --------------- | ----------------- | ---------------------------------- |
| id              | String            | CUID primary key                   |
| name            | String            | User-friendly name                 |
| provider        | ConnectorProvider | OPENAI, ANTHROPIC, GEMINI, etc.    |
| status          | ConnectorStatus   | HEALTHY, DEGRADED, DOWN, UNKNOWN   |
| authType        | ConnectorAuthType | API_KEY, OAUTH2, NONE              |
| encryptedConfig | String?           | AES-256-GCM encrypted credentials  |
| isEnabled       | Boolean           | Soft enable/disable                |
| defaultModelId  | String?           | Default model for this connector   |
| baseUrl         | String?           | Custom API base URL                |
| region          | String?           | AWS region (Bedrock only)          |
| workspaceId     | String?           | Anthropic workspace header         |
| isPayAsYouGo    | Boolean           | Debits PAYG credit (default false) |

**`isPayAsYouGo` is the runtime authority for PAYG classification**, not
`PAYG_DEFAULT_PROVIDERS` in `@claw/shared-constants`. That constant is only the
default: the `20260829120100_add_connector_payg_flag` migration backfills it for
`OPENAI, ANTHROPIC, GEMINI, DEEPSEEK, GROK, AWS_BEDROCK`, and
`paygDefaultForProvider()` applies it to newly created connectors. After that,
the admin toggle on `PATCH /connectors/:id` decides (ADR-082).

`false` is the safe default: a provider nobody has classified is free until an
operator says otherwise. `OLLAMA` stays `false` even for Ollama-Cloud
connectors, which do cost money upstream — the classification grain is the
provider, an Ollama-Cloud connector is indistinguishable from a self-hosted one
at that grain, and defaulting the pair to metered would charge users for
inference running on their own hardware. The toggle is the lever.

### ConnectorModel

| Column                   | Type              | Notes                      |
| ------------------------ | ----------------- | -------------------------- |
| id                       | String            | CUID primary key           |
| connectorId              | String            | FK to Connector            |
| provider                 | ConnectorProvider | Denormalized for queries   |
| modelKey                 | String            | API model identifier       |
| displayName              | String            | Human-readable name        |
| lifecycle                | ModelLifecycle    | ACTIVE, DEPRECATED, SUNSET |
| supportsStreaming        | Boolean           | Streaming capability       |
| supportsTools            | Boolean           | Function calling support   |
| supportsVision           | Boolean           | Image input support        |
| supportsAudio            | Boolean           | Audio input support        |
| supportsStructuredOutput | Boolean           | JSON mode support          |
| maxContextTokens         | Int?              | Context window size        |

### ConnectorHealthEvent

Records health check results with status, latency, and any error messages. Indexed by `checkedAt` for time-series queries.

### ModelSyncRun

Tracks model sync operations with counts of models found, added, and removed per run.

## API Endpoints

| Method | Path        | Auth   | Description                 |
| ------ | ----------- | ------ | --------------------------- |
| GET    | /           | Bearer | List connectors             |
| POST   | /           | ADMIN  | Create connector            |
| GET    | /:id        | Bearer | Get connector details       |
| PATCH  | /:id        | ADMIN  | Update connector            |
| DELETE | /:id        | ADMIN  | Delete connector            |
| POST   | /:id/test   | ADMIN  | Test connector connectivity |
| POST   | /:id/sync   | ADMIN  | Trigger model sync          |
| GET    | /:id/models | Bearer | List models for a connector |
| GET    | /:id/health | Bearer | Get health history          |

`PATCH /:id` accepts `isPayAsYouGo` (`ADMIN_CONNECTORS_MANAGE`). Omitting the
field leaves the current classification alone rather than resetting it to the
provider default, so an unrelated rename can never silently stop metering. Every
flip is written to the structured audit log as
`connector_payg_enabled` / `connector_payg_disabled` with the previous value.

### Internal endpoints (`/internal/connectors`)

| Method | Path                     | Consumer     | Description                     |
| ------ | ------------------------ | ------------ | ------------------------------- |
| GET    | /config                  | all services | Decrypted provider credentials  |
| GET    | /models-snapshot         | routing      | Upstream model catalog          |
| GET    | /health-snapshot         | routing      | Per-provider connector health   |
| POST   | /models/validate-exposed | auth         | Filter offerable provider/model |
| GET    | /payg-policy             | auth         | Which providers debit credit    |

`GET /internal/connectors/payg-policy` returns
`{ providers: { OPENAI: true, OLLAMA: false, … } }` — one entry per DISTINCT
provider holding a connector row, `true` when **any enabled** connector for it
is PAYG. A disabled connector never makes its provider metered but still
contributes the key, so the caller gets an explicit `false` instead of an absent
key it would have to guess about.

**No `connector.payg_policy_changed` event accompanies a toggle, deliberately.**
auth-service caches this response for `PAYG_POLICY_CACHE_TTL_SECONDS` (60 s),
which already bounds the staleness of an action an administrator takes a handful
of times a year. Adding an exchange binding, a consumer and a boot-ordering
dependency to save at most 59 seconds is not worth the failure modes.

## Encryption

API keys and credentials are encrypted at rest using AES-256-GCM:

1. A 256-bit key is derived from the `ENCRYPTION_KEY` environment variable (64 hex characters)
2. Each connector config gets a unique IV (initialization vector)
3. The encrypted blob + IV + auth tag are stored together in `encryptedConfig`
4. Decryption happens only when the config is needed for an API call

## Model Sync Process

When a sync is triggered:

1. Service calls the provider's model listing API (e.g., OpenAI `/v1/models`)
2. Compares returned models with stored `ConnectorModel` records
3. Adds new models, marks removed models as SUNSET
4. Updates capability flags based on known model metadata
5. Records the sync run with counts
6. Publishes `connector.synced` event

## Health Checks

Periodic health checks verify each connector is reachable:

1. Sends a minimal API request to the provider
2. Records response time and status
3. Updates the connector's `status` field
4. Publishes `connector.health_checked` event

## Events

| Event                    | Direction | Consumers      |
| ------------------------ | --------- | -------------- |
| connector.created        | Publish   | audit          |
| connector.updated        | Publish   | audit          |
| connector.deleted        | Publish   | audit          |
| connector.synced         | Publish   | audit, routing |
| connector.health_checked | Publish   | audit, routing |

## Provider Adapters

Each cloud provider has specific API patterns:

| Provider    | Auth         | Model List API                     | Chat API                  |
| ----------- | ------------ | ---------------------------------- | ------------------------- |
| OpenAI      | Bearer token | GET /v1/models                     | POST /v1/chat/completions |
| Anthropic   | x-api-key    | GET /v1/models                     | POST /v1/messages         |
| Gemini      | API key      | GET /v1/models                     | POST /v1/generateContent  |
| DeepSeek    | Bearer token | GET /v1/models (OpenAI-compatible) | POST /v1/chat/completions |
| AWS Bedrock | IAM/SigV4    | ListFoundationModels               | InvokeModel               |
| Ollama      | None         | GET /api/tags                      | POST /api/generate        |
| Grok (xAI)  | Bearer token | GET /v1/models (filters grok-\*)   | POST /v1/chat/completions |

### Anthropic Adapter Notes

- **Base URL**: `https://api.anthropic.com/v1` — the adapter appends `/models`,
  so the stored value is the API root _including_ `/v1`. Leaving the field blank
  uses this default; `https://api.anthropic.com` requests `/models` at the host
  root and 404s.
- **`anthropic-version: 2023-06-01`** — a dated API version, not a feature flag.
  It does not follow the calendar: there is no `2024-06-01`, and sending one
  fails every call with HTTP 400 before the request is routed. Opt-in features
  (including the native `document` content part for PDFs) travel on the separate
  `anthropic-beta` header. The value is pinned in `anthropic.constants.ts` and a
  test fails if it moves — do not "bump" it to enable a feature.
- **Workspace ID**: an _identity-linked_ key (tied to a user, not scoped to a
  workspace) is rejected on every call until the request names its workspace.
  The connector stores it in `Connector.workspaceId` and the adapter sends
  `anthropic-workspace-id`. A workspace-scoped key needs none — and because a
  blank header is itself a 400, the adapter omits it when the value is unset or
  whitespace rather than sending an empty string.
- **Model list**: synced live from `GET /v1/models`; `display_name` is used when
  the provider sends one, otherwise the id is title-cased.
- **Capabilities**: every Claude model is registered as streaming + tools +
  vision + structured output, audio off.

### Grok/xAI Adapter Notes

- **Base URL**: `https://api.x.ai/v1` (OpenAI-compatible format)
- **Model filtering**: Only models with `grok-` prefix are synced (excludes image/embedding models)
- **Vision support**: Auto-detected from model name (`vision` substring)
- **Chat execution**: Uses the same `callCloudProvider()` path as OpenAI/DeepSeek (OpenAI-compatible endpoint)
- **Routing integration**: GROK is included in the fallback chain and capability priority map
- **Cost tier**: $3.00/$15.00 per 1M tokens (input/output) — same tier as Anthropic
