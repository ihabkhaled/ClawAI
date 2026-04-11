# Service Guide: claw-connector-service

## Overview

| Property       | Value                                |
| -------------- | ------------------------------------ |
| Port           | 4003                                 |
| Database       | PostgreSQL (`claw_connectors`)       |
| ORM            | Prisma 5.20                          |
| Env prefix     | `CONNECTOR_`                         |
| Nginx route    | `/api/v1/connectors/*`               |

The connector service manages AI provider connections (OpenAI, Anthropic, Gemini, DeepSeek, AWS Bedrock, Ollama). It stores encrypted API keys, syncs available models from each provider, and runs periodic health checks.

## Database Schema

### Connector

| Column          | Type              | Notes                              |
| --------------- | ----------------- | ---------------------------------- |
| id              | String            | CUID primary key                   |
| name            | String            | User-friendly name                 |
| provider        | ConnectorProvider  | OPENAI, ANTHROPIC, GEMINI, etc.    |
| status          | ConnectorStatus    | HEALTHY, DEGRADED, DOWN, UNKNOWN   |
| authType        | ConnectorAuthType  | API_KEY, OAUTH2, NONE              |
| encryptedConfig | String?            | AES-256-GCM encrypted credentials  |
| isEnabled       | Boolean            | Soft enable/disable                |
| defaultModelId  | String?            | Default model for this connector   |
| baseUrl         | String?            | Custom API base URL                |
| region          | String?            | AWS region (Bedrock only)          |

### ConnectorModel

| Column                   | Type           | Notes                         |
| ------------------------ | -------------- | ----------------------------- |
| id                       | String         | CUID primary key              |
| connectorId              | String         | FK to Connector               |
| provider                 | ConnectorProvider | Denormalized for queries    |
| modelKey                 | String         | API model identifier          |
| displayName              | String         | Human-readable name           |
| lifecycle                | ModelLifecycle | ACTIVE, DEPRECATED, SUNSET    |
| supportsStreaming         | Boolean        | Streaming capability          |
| supportsTools            | Boolean        | Function calling support      |
| supportsVision           | Boolean        | Image input support           |
| supportsAudio            | Boolean        | Audio input support           |
| supportsStructuredOutput | Boolean        | JSON mode support             |
| maxContextTokens         | Int?           | Context window size           |

### ConnectorHealthEvent

Records health check results with status, latency, and any error messages. Indexed by `checkedAt` for time-series queries.

### ModelSyncRun

Tracks model sync operations with counts of models found, added, and removed per run.

## API Endpoints

| Method | Path                    | Auth          | Description                       |
| ------ | ----------------------- | ------------- | --------------------------------- |
| GET    | /                       | Bearer        | List connectors                   |
| POST   | /                       | ADMIN         | Create connector                  |
| GET    | /:id                    | Bearer        | Get connector details             |
| PATCH  | /:id                    | ADMIN         | Update connector                  |
| DELETE | /:id                    | ADMIN         | Delete connector                  |
| POST   | /:id/test               | ADMIN         | Test connector connectivity       |
| POST   | /:id/sync               | ADMIN         | Trigger model sync                |
| GET    | /:id/models             | Bearer        | List models for a connector       |
| GET    | /:id/health             | Bearer        | Get health history                |

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

| Event                     | Direction | Consumers        |
| ------------------------- | --------- | ---------------- |
| connector.created         | Publish   | audit            |
| connector.updated         | Publish   | audit            |
| connector.deleted         | Publish   | audit            |
| connector.synced          | Publish   | audit, routing   |
| connector.health_checked  | Publish   | audit, routing   |

## Provider Adapters

Each cloud provider has specific API patterns:

| Provider    | Auth         | Model List API                    | Chat API                    |
| ----------- | ------------ | --------------------------------- | --------------------------- |
| OpenAI      | Bearer token | GET /v1/models                    | POST /v1/chat/completions   |
| Anthropic   | x-api-key    | Hardcoded model list              | POST /v1/messages           |
| Gemini      | API key      | GET /v1/models                    | POST /v1/generateContent    |
| DeepSeek    | Bearer token | GET /v1/models (OpenAI-compatible)| POST /v1/chat/completions   |
| AWS Bedrock | IAM/SigV4    | ListFoundationModels              | InvokeModel                 |
| Ollama      | None         | GET /api/tags                     | POST /api/generate          |
