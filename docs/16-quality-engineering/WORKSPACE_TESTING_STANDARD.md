# Workspace Testing Standard

The workspace service has unique testing needs: 12 providers, each with its own auth flow, rate limits, object shapes, and webhook formats. Without a strict contract + factory system, tests drift, adapter bugs escape review, and cross-provider regressions happen.

This document defines the non-negotiable layers.

## Layered test matrix

| Layer                     | Target                                                              | Tool               | Bar                                       |
| ------------------------- | ------------------------------------------------------------------- | ------------------ | ----------------------------------------- |
| Unit — utilities          | Pure functions (crypto, PKCE, URL safety, webhook sig, classifiers) | Jest               | ≥98% branch on critical paths             |
| Unit — repositories       | Prisma calls with mocked client                                     | Jest               | every method                              |
| Unit — services           | Orchestration + validation with mocked repos/managers               | Jest               | happy + negative per branch               |
| Unit — managers           | Sync/health/token logic                                             | Jest               | retry, backoff, error paths               |
| Contract — adapters       | Every `WorkspaceAdapter` passes `runAdapterContract()`              | Jest               | ALL adapters must pass                    |
| Integration — controllers | Full HTTP roundtrip via Nest test module                            | Jest               | happy + 400 + 401 + 403 + 404 + 409       |
| Provider fake — adapters  | MSW-backed stub provider API                                        | Jest + MSW         | 1 full sync + 1 write action per provider |
| Manual API                | curl against running service                                        | Bash QA scripts    | 0 failures, DB + log verified             |
| Manual UI                 | Browser click-through                                               | Screenshots        | loading/empty/error/success + RTL + dark  |
| E2E                       | Playwright                                                          | full user journey  | golden path per persona                   |
| Regression                | Previous features                                                   | Full matrix re-run | every release                             |

## Factories

`src/__tests__/factories/` provides deterministic, typed builders. Tests MUST use these instead of inline literals.

- `connector.factory.ts` → `makeConnector(overrides?)` → `WorkspaceConnectorWithStats`
- `provider-app-config.factory.ts` → `makeProviderAppConfig(overrides?)` → `ProviderAppConfigPublic`

Add a factory per new entity. Never hand-construct a complex entity in a test.

## Adapter contract

Every adapter has a matching `__tests__/adapter-contract.spec.ts` entry that runs `runAdapterContract(() => new Adapter(), opts)`. The contract guarantees:

1. All interface methods are present
2. `getCapabilities()` returns a valid shape
3. `getAuthorizationBaseUrl()` returns `https://…`
4. `getDefaultScopes()` returns ≥1 non-empty string
5. `exchangeCodeForTokens({})` rejects (no missing-credential escape hatch)
6. `refreshTokens('rt', {})` rejects if adapter is OAuth-capable
7. When `supportsPat: true`, `validatePat` is defined

**You cannot add an adapter to the factory without its contract test passing.**

## Provider fakes (Phase B)

Each provider adapter gets a fake under `src/__tests__/fakes/<provider>.fake.ts`. The fake:

- Uses MSW (`@mswjs/msw/node`) to intercept outbound HTTP
- Replies with realistic payloads (paginated lists, error envelopes, rate-limit headers)
- Exposes helpers to set error scenarios: `fakeProvider.returnError(429, 'rate_limited')`

Integration tests use the fake so they can assert real adapter behavior without hitting the real API.

## CI gating

Release blockers for workspace work:

- `npm run test` in `claw-workspace-service` passes
- Adapter contract test passes for every adapter
- All `qa/test-workspace-*.sh` scripts pass
- Coverage ≥ 98% on: `crypto.utility`, `pkce.utility`, `url-safety.utility`, `webhook-signature.utility`, `provider-registry.service`, `provider-app-config.service`
- Coverage ≥ 85% on adapters + managers + controllers

## Negative cases every adapter must cover

When adding a provider's test file (Phase B), the following scenarios are non-negotiable:

- 401 from provider (expired/bad token) → health status `DISCONNECTED`
- 429 from provider → retry with backoff; eventually `DEGRADED`
- 500 from provider → `DEGRADED` with error message
- Empty response → zero objects synced, no crash
- Pagination cursor present → follows cursor
- Partial sync (3 of 10 objects fail) → `PARTIAL` status, record which failed
- Webhook with bad signature → rejected with 401 `INVALID_WEBHOOK_SIGNATURE`
- Webhook with stale timestamp (>5 min) → rejected
- Cross-tenant access attempt → 403

## QA scripts inventory

| Script                                           | Scope                                 | Assertions |
| ------------------------------------------------ | ------------------------------------- | ---------- |
| `qa/test-workspace-provider-registry.sh`         | Definitions + app configs CRUD        | 41         |
| `qa/test-workspace-oauth-flow.sh`                | OAuth init + PAT validation           | 24         |
| `qa/test-workspace-security.sh`                  | SSRF + redaction + idempotency schema | 14         |
| `qa/test-workspace-<provider>.sh` (Phase B, ×12) | Per-provider end-to-end               | ≥20 each   |
| `qa/test-workspace-tenant-isolation.sh`          | Cross-user data leakage               | ≥10        |

All gitignored under `qa/`. Evidence saved to `.claude/Integrations/<feature>__QA_output.md`.

## Blockers

- 1+ failing test in a workspace service = release blocker
- Missing adapter contract for a new adapter = blocker
- Missing factory for a new entity touched by 2+ tests = blocker
- Coverage regression on critical utility files = blocker
- Any adapter writing to `process.env` or `AppConfig.get()` for credentials = blocker
