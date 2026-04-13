# Catalog Download QA — Execution Plan for Sonnet

## Pre-identified Bugs (found by Opus audit)

### BUG-1: CRITICAL — Catalog enrichment name mismatch

- **Symptom**: GLM-4.7 Thinking shows `isInstalled: false` but model IS in runtime AND installed DB
- **Root cause**: Catalog entry has `ollamaName: "glm4:latest"` but installed model DB has `name: "glm4", tag: "latest"`. The enrichment builds key as `name:tag:runtime` = `glm-4.7-thinking:latest:OLLAMA` but installed model key is `glm4:latest:OLLAMA`. Mismatch.
- **Fix location**: `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts` — `enrichCatalogEntries()` method
- **Fix**: Match using `ollamaName` against installed models' `name:tag`, not catalog entry's `name:tag`
- **Files to read**: ollama.service.ts lines 233-258

### BUG-2: CRITICAL — Models in DB but not in Ollama runtime (phantom installs)

- **Symptom**: `llama4-maverick`, `mimo-v2-flash` appear in installed models DB but Ollama runtime doesn't have them
- **Root cause**: `syncModelsFromRuntime()` on startup syncs FROM runtime TO DB, but models that were in DB from a previous session but got removed from runtime (e.g., Ollama data volume reset) stay as phantom records
- **Fix location**: `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts` — `syncModelsFromRuntime()` method
- **Fix**: After syncing from runtime, mark models NOT in runtime as `isInstalled: false`
- **Files to read**: ollama.service.ts lines 47-60, ollama.manager.ts `syncFromRuntime()`

### BUG-3: MAJOR — Duplicate completed pull jobs not cleaned

- **Symptom**: `llama4-maverick` has 3 COMPLETED jobs, `glm4:latest` has 4
- **Root cause**: `findActiveByModelName()` only prevents duplicates for PENDING/IN_PROGRESS. Multiple COMPLETED jobs accumulate.
- **Fix location**: `apps/claw-ollama-service/src/modules/ollama/repositories/pull-jobs.repository.ts`
- **Fix**: After completion, clean up old COMPLETED jobs for the same model (keep only latest)

### BUG-4: MAJOR — Frontend `isInstalled` check uses wrong logic

- **Symptom**: User reported "clicking Download immediately shows as installed"
- **Root cause**: `CatalogModelAction` checks `entry.isInstalled` which comes from backend enrichment. If enrichment has a stale cache or name mismatch, it can show wrong state.
- **Fix location**: `apps/claw-frontend/src/components/models/catalog-model-action.tsx`
- **Fix**: Ensure the component ONLY shows "Installed" when `entry.isInstalled === true`, never based on `pullJobStatus`

### BUG-5: MAJOR — No runtime verification on "installed" status

- **Symptom**: Models marked installed but can't actually generate
- **Root cause**: `isInstalled` in DB is set to `true` when pull job completes, but there's no check that Ollama runtime actually has the model loaded
- **Fix approach**: Add a runtime verification step after marking as installed, or validate on `syncModelsFromRuntime`

## Execution Steps for Sonnet

### Step 1: Fix enrichment name matching (BUG-1)

Read `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts` lines 233-258.
The `enrichCatalogEntries` method builds `installedMap` using `name:tag` from LocalModel.
But catalog entries have different names (e.g., catalog name=`glm-4.7-thinking`, ollamaName=`glm4:latest`).
Fix: Build the map keyed by `name:tag` AND also check `ollamaName` against the installed model's `name:tag`.

Change the matching logic to:

```
const ollamaKey = entry.ollamaName ?? `${entry.name}:${entry.tag}`;
const installedModelId = installedMap.get(ollamaKey) ?? null;
```

Where `installedMap` is keyed by `${model.name}:${model.tag}` (the Ollama-style name).

### Step 2: Fix phantom installed models (BUG-2)

Read `apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts` — `syncFromRuntime()`.
After upserting models from runtime, add logic to mark models NOT returned by runtime as `isInstalled: false`.

Add to LocalModelsRepository:

```typescript
async markNotInRuntimeAsUninstalled(runtimeModelKeys: Set<string>): Promise<number> {
  // Find all installed models whose name:tag is NOT in the runtime set
  // Update isInstalled = false for those
}
```

### Step 3: Clean duplicate pull jobs (BUG-3)

After a pull job completes, delete older COMPLETED/FAILED jobs for the same modelName.
Add to `completePullJob()` in ollama.manager.ts or the service.

### Step 4: Test all 5 state domains align

Run these API queries and verify consistency:

1. `GET /ollama/catalog` — check `isInstalled` and `pullJobStatus`
2. `GET /internal/ollama/installed-models` — check actual installed list
3. `GET /ollama/pull-jobs` — check no stale COMPLETED jobs for uninstalled models
4. `GET http://localhost:11434/api/tags` — check Ollama runtime truth
5. `POST /ollama/generate` with each "installed" model — verify runnability

### Step 5: Run 50+ API tests

Test each endpoint with valid/invalid/edge cases. See test cases below.

## Concrete Test Cases

### TC-01: Catalog shows correct installed state

- Pre: gemma3:4b is in runtime
- Step: GET /ollama/catalog?search=gemma+3+4
- Expected: `isInstalled: true, installedModelId: <non-null>`
- Severity: CRITICAL

### TC-02: Catalog does NOT false-install

- Pre: deepseek-r1:32b is NOT in runtime
- Step: GET /ollama/catalog?search=deepseek+r1+32
- Expected: `isInstalled: false, installedModelId: null`
- Severity: CRITICAL

### TC-03: Pull creates job, not instant install

- Pre: Pick a small model not yet installed
- Step: POST /ollama/catalog/:id/pull
- Expected: Returns `{ pullJobId }`, catalog still shows `isInstalled: false`
- Severity: CRITICAL

### TC-04: Duplicate pull returns same job

- Pre: Model already downloading
- Step: POST /ollama/catalog/:id/pull (same model)
- Expected: Same pullJobId returned
- Severity: MAJOR

### TC-05: Cancel removes downloading state

- Pre: Model is downloading
- Step: DELETE /ollama/pull-jobs/:id
- Expected: Job status = FAILED, catalog shows download button again
- Severity: MAJOR

### TC-06: Runtime health check

- Step: GET /ollama/health
- Expected: `{ runtime: "OLLAMA", healthy: true }`
- Severity: HIGH

### TC-07: Installed model can generate

- Pre: gemma3:4b is installed
- Step: POST /ollama/generate `{ model: "gemma3:4b", prompt: "hi" }`
- Expected: Valid response with content
- Severity: CRITICAL

### TC-08: Non-installed model cannot generate

- Pre: deepseek-r1:32b is NOT installed
- Step: POST /ollama/generate `{ model: "deepseek-r1:32b", prompt: "hi" }`
- Expected: Error (model not found or timeout)
- Severity: MAJOR

### TC-09: Auth required on all protected endpoints

- Step: GET /ollama/catalog without token
- Expected: 401
- Severity: HIGH

### TC-10: Invalid catalog ID returns 404

- Step: GET /ollama/catalog/nonexistent
- Expected: 404 with ENTITY_NOT_FOUND
- Severity: MEDIUM

### TC-11 to TC-50: See patterns above for pagination, filtering, edge cases, etc.

## Files to Modify

1. `apps/claw-ollama-service/src/modules/ollama/ollama.service.ts` — enrichment fix
2. `apps/claw-ollama-service/src/modules/ollama/managers/ollama.manager.ts` — sync fix, cleanup
3. `apps/claw-ollama-service/src/modules/ollama/repositories/local-models.repository.ts` — new methods
4. `apps/claw-ollama-service/src/modules/ollama/repositories/pull-jobs.repository.ts` — cleanup method

## Verification Commands

```bash
# Check all 5 domains
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 1. Catalog
curl -s "http://localhost:4000/api/v1/ollama/catalog?limit=100" -H "Authorization: Bearer $TOKEN" | grep -o '"ollamaName":"[^"]*".*"isInstalled":[^,]*'

# 2. Installed DB
curl -s "http://localhost:4008/api/v1/internal/ollama/installed-models" | grep -o '"name":"[^"]*","tag":"[^"]*"'

# 3. Pull jobs
curl -s "http://localhost:4000/api/v1/ollama/pull-jobs" -H "Authorization: Bearer $TOKEN" | grep -o '"modelName":"[^"]*","runtime":"[^"]*","status":"[^"]*"'

# 4. Ollama runtime
curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"'

# 5. Generate test
curl -s -X POST http://localhost:4008/api/v1/ollama/generate -H "Content-Type: application/json" -d '{"model":"gemma3:4b","prompt":"say hi"}'
```
