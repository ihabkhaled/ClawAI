# ADR-010: Data-Driven Model Catalog

## Status

Accepted (2025-Q4)

## Context

ClawAI initially hardcoded a list of 5 default Ollama models. As the platform matured, users needed to discover and install additional models for specialized tasks (coding, reasoning, image generation). The hardcoded approach had several problems:

- Adding a new model required code changes across multiple files (constants, types, seed scripts)
- No way for users to browse available models without reading documentation
- No metadata about model capabilities, size, or recommended use cases
- No category organization (coding vs reasoning vs image generation)

The team needed a scalable approach to model discovery that could grow to 30+ models without proportional code changes.

## Decision

Implement a data-driven model catalog stored in PostgreSQL (claw_ollama database) with a seed script that populates catalog entries. The frontend provides a browsable catalog UI at `/models/catalog`.

### Schema

```prisma
model CatalogEntry {
  id             String   @id @default(uuid())
  name           String
  tag            String
  displayName    String
  category       CatalogCategory
  description    String
  sizeBytes      BigInt
  parameterCount String
  runtime        ModelRuntime
  ollamaName     String?
  comfyuiName    String?
  isRecommended  Boolean  @default(false)
  capabilities   String[]
  createdAt      DateTime @default(now())
}
```

### Categories

| Category         | Count | Runtime |
| ---------------- | ----- | ------- |
| CODING           | 5     | Ollama  |
| FILE_GENERATION  | 5     | Ollama  |
| IMAGE_GENERATION | 5     | ComfyUI |
| ROUTING          | 5     | Ollama  |
| REASONING        | 5     | Ollama  |
| THINKING         | 5     | Ollama  |

### API Design

- `GET /api/v1/ollama/catalog` — Browse with category/runtime/search filters
- `GET /api/v1/ollama/catalog/:id` — Single entry details
- `POST /api/v1/ollama/catalog/:id/pull` — Trigger download
- Catalog entries link to PullJob records for download tracking

## Consequences

### Positive

- **Scalable**: Adding a new model is a single row in the seed script. No code changes to types, constants, or components.
- **Browsable**: Users discover models through the UI with category filters, size information, and descriptions.
- **Metadata-rich**: Each entry includes parameter count, size, capabilities, and recommended status.
- **Category-aware**: The routing system uses catalog categories to match models to task types.
- **Runtime-aware**: The catalog distinguishes between Ollama models and ComfyUI models, enabling correct download and execution paths.

### Negative

- **Seed maintenance**: The seed script must be kept in sync with available Ollama and ComfyUI models. If Ollama removes a model, the catalog entry becomes stale.
- **No auto-discovery**: The catalog is manually curated. It does not automatically discover new models from the Ollama library. This is intentional (curation over completeness) but requires periodic updates.
- **Database dependency**: The catalog requires the database to be running and seeded. First-time setup must run the seed script.

## Alternatives Considered

### Hardcoded Constants Array

Define models as a TypeScript constant array. Simple, no database required. Rejected because it does not scale, requires code changes for every new model, and cannot be queried or filtered efficiently.

### Ollama Library API

Fetch available models directly from Ollama's model library API. Would provide automatic discovery but Ollama's library API is not stable, has rate limits, and includes thousands of models (most irrelevant to ClawAI). Rejected because curation is more valuable than completeness.

### Configuration File (YAML/JSON)

Store the catalog in a YAML or JSON configuration file. Simpler than a database but lacks querying, filtering, and the ability to link to PullJob records. Rejected for insufficient querying capability.
