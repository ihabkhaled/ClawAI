# Fix Catalog Download Bugs — Task for Sonnet

Read `.claude/catalog-qa-plan.md` for the full bug analysis. Execute these steps in order:

## Step 1: Fix enrichment matching (CRITICAL)

File: `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts`

The `enrichCatalogEntries` method matches installed models by `name:tag:runtime` but this fails when catalog `name` differs from Ollama `name` (e.g., catalog name=`glm-4.7-thinking` vs Ollama name=`glm4`).

Fix: Build `installedMap` keyed by `${model.name}:${model.tag}` (without runtime), then match using `entry.ollamaName ?? ${entry.name}:${entry.tag}` against the map. This is partially done already — verify it works for ALL catalog entries.

## Step 2: Fix phantom installed models (CRITICAL)

File: `apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts`

In `syncFromRuntime()`, after upserting models from Ollama runtime, mark any LocalModel records NOT present in the runtime as `isInstalled: false`. This prevents phantom "installed" models when Ollama data is reset.

Add method to `LocalModelsRepository`:

```typescript
async markMissingAsUninstalled(presentKeys: string[]): Promise<void>
```

Call it after the sync loop with the keys of models that ARE in the runtime.

## Step 3: Clean stale pull jobs (MAJOR)

File: `apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts`

After `completePullJob()`, delete older COMPLETED/FAILED pull jobs for the same model name, keeping only the latest one.

Add to `PullJobsRepository`:

```typescript
async deleteOlderByModelName(modelName: string, keepJobId: string): Promise<number>
```

## Step 4: Verify and test

After fixes, restart ollama-service and run the verification commands from the plan file. All 5 state domains must align:

- Catalog `isInstalled` matches reality
- Installed DB matches runtime
- No phantom models
- No duplicate pull jobs
- Generate works for all "installed" models

## Step 5: Commit and push

Commit with message: `fix: catalog state machine — enrichment matching, phantom cleanup, pull job dedup`

Run pre-commit hooks (they take ~5 minutes). Push to main.
