# Dynamic Ollama Model Discovery Pipeline

## Overview

The Dynamic Model Discovery system replaces the previous 1,933-line static `catalog-entries.constants.ts` with a live, admin-managed pipeline that automatically discovers, classifies, deduplicates, and enrolls Ollama models into ClawAI's catalog. Admins manage sources, review candidates, and import approved models — with scheduled background refresh keeping the catalog current.

## Problem

Before this system, adding a new Ollama model required a developer to:

1. Edit a 1,933-line TypeScript constant file
2. Commit and push the change
3. Rebuild the ollama-service container
4. Wait for deployment

New models released on the Ollama library were invisible to ClawAI until this manual cycle completed. The catalog lagged the ecosystem by days or weeks.

## Solution

A dynamic pipeline with 4 new database tables and 15 new endpoints that:

- Periodically scrapes the Ollama library for new model families
- Classifies them into 17 technical categories and 15 business categories
- Computes a confidence score (0–1) for each classification
- Identifies hardware fit (CPU, 8GB / 12GB / 16GB / 24GB / 48GB+ VRAM)
- Enriches each candidate with registry manifest data (size, download availability)
- Deduplicates against existing catalog entries and installed models
- Queues discovered models as `PENDING` candidates for admin review
- Admins approve → catalog entry created with discovery provenance

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Scheduled Cron (daily)                      │
│       DISCOVERY_AUTO_REFRESH_ENABLED=true  @ 3:00 AM           │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                    DiscoveryJobService                         │
│  triggerRefresh(sourceId?, isDryRun)                           │
│  → creates ModelDiscoveryRun (status=RUNNING)                  │
│  → fires executeAsync() in background                          │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                      DiscoveryManager                          │
│  For each enabled DiscoverySource:                             │
│    1. OllamaLibraryDiscoveryManager.discover() → raw models    │
│    2. rankDiscoveredModels() → order by family + size + caps   │
│    3. ModelEnrichmentManager.enrichAll() → size + availability │
│    4. classifyModel() → category + business cats + confidence  │
│    5. assignHardwareProfiles() → 8GB/12GB/16GB/24GB/48GB+      │
│    6. isDuplicateOfCatalog + isDuplicateOfInstalled            │
│    7. bulkCreate ModelDiscoveryCandidate rows (PENDING)        │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                       Admin UI (/models/discovery)             │
│  - Trigger refresh / dry-run                                   │
│  - Browse runs timeline                                        │
│  - Review candidates → approve / reject / bulk-approve         │
│  - Install hardware pack (8GB/12GB/16GB/24GB/48GB+/CPU)        │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────┐
│                  CandidateImportManager                        │
│  - creates ModelCatalogEntry with discovery provenance         │
│  - marks candidate as IMPORTED                                 │
│  - DUPLICATE detected → links to existing entry                │
└────────────────────────────────────────────────────────────────┘
```

## Data Model

### DiscoverySource

Admin-managed configuration for where to crawl models from.

| Field      | Type            | Purpose                                 |
| ---------- | --------------- | --------------------------------------- |
| id         | String          | CUID                                    |
| name       | String (unique) | Human label                             |
| type       | enum            | OLLAMA_LIBRARY, OLLAMA_REGISTRY, MANUAL |
| baseUrl    | String          | HTTP(S) endpoint                        |
| isEnabled  | Boolean         | Whether scheduled job uses it           |
| categories | String[]        | Optional whitelist filter               |
| maxResults | Int (1–500)     | Cap per run                             |
| lastRunAt  | DateTime        | Last successful run                     |

### ModelDiscoveryRun

One execution of discovery across one or more sources.

| Field           | Type    | Purpose                                        |
| --------------- | ------- | ---------------------------------------------- |
| status          | enum    | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED |
| isDryRun        | Boolean | If true, no rows written                       |
| discoveredCount | Int     | Raw models found                               |
| importedCount   | Int     | Candidates inserted                            |
| skippedCount    | Int     | Duplicates                                     |
| triggeredBy     | String  | "admin" or "scheduler"                         |

### ModelDiscoveryCandidate

A discovered model awaiting admin decision.

| Field              | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| suggestedCategory  | ModelCategory (auto-classified)                         |
| businessCategories | String[] (business-facing tags)                         |
| hardwareProfiles   | String[] (fit list)                                     |
| confidence         | Float 0–1 (classification certainty)                    |
| downloadStatus     | AVAILABLE, UNAVAILABLE, CLOUD_ONLY, UNKNOWN             |
| status             | PENDING, APPROVED, REJECTED, IMPORTED, DUPLICATE, STALE |

### ModelCatalogEntry (updated)

New fields added via additive migration:

- `businessCategories: String[]`
- `hardwareProfiles: String[]`
- `isDiscovered: Boolean` (true if imported from candidate)
- `discoverySourceId: String?` (FK to DiscoverySource)
- `downloadStatus: DownloadStatus`
- `lastVerifiedAt: DateTime?`

## Classification System

### 3-Layer Taxonomy

1. **Family** (technical) — `qwen-coder`, `llama`, `gemma`, `phi`, `deepseek`, `mistral`, etc. 28 families in `FAMILY_TAXONOMY`.
2. **ModelCategory** (Prisma enum, 17 values) — CODING, REASONING, MEDICAL, MARKETING, BUSINESS, LITERATURE, AGENT, etc.
3. **BusinessCategory** (15 values) — GPT_ASSISTANT, CODING_ASSISTANT, MEDICAL, MARKETING, BUSINESS_STRATEGIST, LITERATURE_WRITER, ANALYST_RESEARCH, LEGAL_DRAFTING, PRODUCTIVITY, AGENT_TOOL_USE, ROUTER_JUDGE, SUMMARIZER, TRANSLATOR, VISION_MULTIMODAL, STRUCTURED_OUTPUT.

### Scoring

The classifier combines 3 signals:

- **Family match** (0.7 base confidence if `extractFamily()` resolves)
- **Keyword matches** in name/description/capabilities (+0.1 per hit)
- **Capability array** matches (+0.05 per capability)

Final confidence is capped at 1.0. Keywords like "coder", "medical", "marketing" override family defaults when present in the model name.

## Hardware Profile Logic

Each discovered model's `sizeBytes` maps to hardware tiers via `HARDWARE_PROFILE_RANGES`:

| Profile        | Max Size |
| -------------- | -------- |
| CPU_ONLY       | ≤ 3 GiB  |
| VRAM_8GB       | ≤ 6 GiB  |
| VRAM_12GB      | ≤ 9 GiB  |
| VRAM_16GB      | ≤ 13 GiB |
| VRAM_24GB      | ≤ 20 GiB |
| VRAM_48GB_PLUS | ≤ 80 GiB |

A 5 GiB model (e.g. Qwen 2.5 Coder 7B at Q4) fits all tiers from VRAM_8GB upward. Larger-VRAM users see more options; smaller-VRAM users see a filtered subset.

## Deduplication

Three independent dedup checks in `DiscoveryManager.runPipeline()`:

1. **Canonical key** — `name:tag` normalized (lowercase, trimmed)
2. **Catalog match** — `isDuplicateOfCatalog(name, tag, catalogRefs)` with alias check via `ollamaName`
3. **Installed match** — `isDuplicateOfInstalled(name, tag, installedRefs)`

Duplicates are counted as `skippedCount` in the run summary; they never become candidates.

## API Surface (15 endpoints)

All under `/api/v1/ollama/*`, JWT-gated, role-based:

| Method | Path                               | Roles           | Purpose                       |
| ------ | ---------------------------------- | --------------- | ----------------------------- |
| GET    | /discovery/sources                 | ADMIN, OPERATOR | List sources                  |
| POST   | /discovery/sources                 | ADMIN           | Create source                 |
| PUT    | /discovery/sources/:id             | ADMIN           | Update source                 |
| DELETE | /discovery/sources/:id             | ADMIN           | Remove source                 |
| POST   | /discovery/refresh                 | ADMIN           | Trigger run (202 Accepted)    |
| GET    | /discovery/runs                    | ADMIN, OPERATOR | List runs                     |
| GET    | /discovery/runs/:id                | ADMIN, OPERATOR | Run detail                    |
| GET    | /discovery/candidates              | ADMIN, OPERATOR | List candidates               |
| POST   | /discovery/candidates/:id/approve  | ADMIN           | Import → catalog              |
| POST   | /discovery/candidates/:id/reject   | ADMIN           | Mark rejected                 |
| POST   | /discovery/candidates/bulk-approve | ADMIN           | Approve many                  |
| POST   | /catalog/admin                     | ADMIN           | Create catalog entry directly |
| PUT    | /catalog/admin/:id                 | ADMIN           | Update catalog entry          |
| DELETE | /catalog/admin/:id                 | ADMIN           | Delete catalog entry          |
| GET    | /packs                             | (authed)        | List hardware packs           |
| POST   | /packs/:profile/install            | ADMIN           | Bulk pull pack                |

## Scheduled Auto-Refresh

`CatalogSyncService.scheduledRefresh()` runs at 3:00 AM daily when `DISCOVERY_AUTO_REFRESH_ENABLED=true`. It triggers a non-dry-run across all enabled sources. Failures are logged; the next cron fires anyway.

## Environment Variables

| Variable                          | Default | Purpose                          |
| --------------------------------- | ------- | -------------------------------- |
| DISCOVERY_AUTO_REFRESH_ENABLED    | true    | Toggle the cron                  |
| DISCOVERY_MAX_RESULTS_PER_SOURCE  | 50      | Per-source cap                   |
| DISCOVERY_AUTO_APPROVE_CONFIDENCE | 0.85    | Reserved for future auto-approve |

## Design Decisions

### Why additive schema, not rewrite

Existing catalog rows are marked `isDiscovered=false` and keep working. Old flows (pull, install, roles, routing) are unaffected. Zero regression risk.

### Why PENDING by default

Admin review is a trust gate. Auto-approving scraped content could pollute the catalog with mis-classified or broken models. The admin's 2-second click is cheaper than a support ticket from a user who pulled garbage.

### Why hardware packs

First-run UX: a user on a 12GB laptop doesn't want to scroll 40 models. "Install the 12GB pack" gives them 5–8 curated models matched to their hardware in one click.

### Why dedupe at 3 layers

Ollama library and registry overlap. Installed models may use aliased names (`qwen3:1.7b` installs as `qwen3:latest`). Triple-checking prevents duplicate rows at minimal cost (all dedup is in-memory after batched DB reads).

## Frontend

- Page: `/models/discovery` — single-page UI with toolbar, runs timeline, candidates grid, packs grid
- Hooks: `useDiscoveryPage()`, `useDiscoverySources()`, `useDiscoveryRuns()`, `useDiscoveryCandidates()`, `useHardwarePacks()` + mutation hooks
- Components: `DiscoveryToolbar`, `CandidateCard`, `RunsTimeline`, `HardwarePacksGrid`, `RunStatusIcon`
- i18n: all 9 locales (EN, AR, DE, ES, FR, HI, IT, PT, RU)

## Testing

- **66 unit tests** on utilities (normalizer, classifier, deduplicator, hardware-profile, ranker) — TDD-written before implementation
- **93 total unit tests** pass in claw-ollama-service
- **54-assertion QA script** (`qa/test-ollama-discovery.sh`) covering 18 areas: auth, CRUD, triggers, filters, bulk ops, DB schema, Docker log health

## How to Add a New Source

Via API:

```bash
POST /api/v1/ollama/discovery/sources
{
  "name": "My Custom Registry",
  "type": "OLLAMA_REGISTRY",
  "baseUrl": "https://my-registry.internal",
  "isEnabled": true,
  "maxResults": 100,
  "categories": ["CODING", "REASONING"]
}
```

Via UI: `/models/discovery` → Sources panel → New source.

## How to Add a New Business Category

1. Add to `BusinessCategory` enum in `apps/claw-ollama-service/src/common/enums/business-category.enum.ts`
2. Add mapping in `FAMILY_TAXONOMY` and/or `KEYWORD_TO_BUSINESS`
3. Add i18n label in 9 locales
4. Run tests
