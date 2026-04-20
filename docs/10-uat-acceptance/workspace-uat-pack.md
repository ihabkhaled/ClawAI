# Workspace Integrations — UAT & Manual Test Pack

**Scope:** All 12 workspace providers (GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, Google Drive, Gmail, SharePoint, OneDrive, Figma, ClickUp) plus the shared platform surfaces (provider registry, app configs, sync, search, operations center, approved write actions, diagnostics).

**Audience:** A QA engineer or product reviewer who has access to the running system but has **not** read the implementation source. Every section is phrased as action + expected result.

---

## 1. Platform Foundation

| #   | Step                                                              | Expected                                                                                                                                                               |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Open `/workspace/providers` as admin                              | Grid renders with 12 provider cards. Every card has a display name, an `Available` badge, capability chips, and (if present) a docs link. No card shows `Coming soon`. |
| 1.2 | Open the same page unauthenticated                                | Redirect to `/login`.                                                                                                                                                  |
| 1.3 | Check `GET /api/v1/workspace/providers` without a bearer          | 401.                                                                                                                                                                   |
| 1.4 | Read `WorkspaceProviderDefinition.configSchema` for each provider | Every provider returns a `version` number and at least one field entry. No `clientSecret` value is embedded in the schema — only field metadata.                       |

---

## 2. Provider App Config

Per provider (repeat §2.x 12 times):

| #   | Step                                                                                            | Expected                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Open `/workspace/app-configs` → **New Configuration**                                           | Dialog opens with provider picker populated by the catalog.                                                                                                                           |
| 2.2 | Choose the provider and fill a dummy client ID + client secret (or PAT where supported)         | Schema-driven fields render. Secret fields use masked inputs.                                                                                                                         |
| 2.3 | Submit with **missing name**                                                                    | Inline error "A name is required." and no POST fires.                                                                                                                                 |
| 2.4 | Submit with a valid name and invalid URL base (e.g. `http://169.254.169.254/`) where applicable | 422 `URL_PRIVATE_OR_LOOPBACK`; row is not created.                                                                                                                                    |
| 2.5 | Submit with valid values                                                                        | Row appears in the table with status `READY`, `hasSecret: true`. Response body does **not** echo the raw secret.                                                                      |
| 2.6 | `SELECT encrypted_secret FROM workspace_provider_app_configs WHERE id=…`                        | Column is populated and not the plaintext secret.                                                                                                                                     |
| 2.7 | Click **Test** on the new row                                                                   | Response includes `status` + `latencyMs`. OAuth configs legitimately return `UNKNOWN` with a guidance message; PAT configs return `CONNECTED`/`DISCONNECTED` based on token validity. |
| 2.8 | Click **Delete**                                                                                | Row disappears from the table; DB row count for that id returns 0.                                                                                                                    |

Provider-specific callouts:

- **GitHub, GitLab** — both OAuth and PAT flows; test both per provider.
- **Bitbucket** — OAuth only; basic-auth token exchange.
- **Slack** — OAuth only; bot token required.
- **Jira, Confluence** — Atlassian OAuth with `offline_access` scope for refresh.
- **Google Drive, Gmail** — Google OAuth with refresh token.
- **SharePoint, OneDrive** — Microsoft Graph OAuth.
- **Figma** — OAuth; sync requires `teamId` in connector metadata.
- **ClickUp** — OAuth; tokens do not expire, refresh endpoint must return 501/error.

---

## 3. OAuth Connect / Reconnect

| #   | Step                                                                         | Expected                                                                                          |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 3.1 | `POST /api/v1/workspace/oauth/init` with `{ provider, providerAppConfigId }` | 201 with `authorizationUrl` + `state`.                                                            |
| 3.2 | Check Redis `oauth:state:<state>`                                            | Key exists and TTL ≤ 600s.                                                                        |
| 3.3 | Complete the authorization at the provider's URL                             | Provider redirects to `/api/v1/workspace/oauth/callback?code=…&state=…`.                          |
| 3.4 | Verify `WorkspaceConnector` row                                              | `status=CONNECTED`, `encryptedTokens` is populated, `lastAuthAt` set.                             |
| 3.5 | Tamper `state` on callback                                                   | 400 `INVALID_STATE`.                                                                              |
| 3.6 | Replay the same callback                                                     | 400 — state key is deleted after first use.                                                       |
| 3.7 | Force an expired token                                                       | Next sync attempts `refreshTokens`; on success, tokens rotate (new `secretVersion`).              |
| 3.8 | Rotate the provider's client secret behind the scenes                        | Refresh fails gracefully; connector moves to `DISCONNECTED` with a human-readable `errorMessage`. |

---

## 4. Sync

Per provider:

| #   | Step                                               | Expected                                                                                          |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 4.1 | `POST /workspace/connectors/:id/sync`              | Returns `SyncResult` with counts; objects appear in `/workspace/objects?connectorId=…`.           |
| 4.2 | Re-sync within the same minute                     | Still succeeds; delta-capable providers reuse `deltaToken`.                                       |
| 4.3 | Simulate provider 5xx mid-sync                     | `WorkspaceSyncRun.status=FAILED`, `errorMessage` populated, retry count up to `SYNC_MAX_RETRIES`. |
| 4.4 | Large page (>100 items on GitHub/GitLab)           | No timeout; per-repo failures in issues/PRs are logged but do not abort the whole sync.           |
| 4.5 | `GET /workspace/connectors/:id/sync-runs?limit=20` | Returns recent runs ordered `startedAt desc`.                                                     |
| 4.6 | Another user requests the same URL                 | 403 `FORBIDDEN`.                                                                                  |

---

## 5. Search

| #   | Step                                                  | Expected                                                                  |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| 5.1 | `POST /workspace/search` with a keyword hit in titles | Results ranked title-first, provider + type visible in each result.       |
| 5.2 | Same query with `filters.providers=[GITHUB]`          | Only GitHub objects returned.                                             |
| 5.3 | Empty query                                           | 400 validation error (`min query length`).                                |
| 5.4 | Query with single quote / tsquery-sensitive chars     | No 500; returns empty or escaped-safe results.                            |
| 5.5 | Cross-tenant: user A cannot see user B's objects      | Verified by swapping bearer tokens against fixtures seeded for two users. |

---

## 6. Object Detail & Refresh

| #   | Step                                                                                  | Expected                                                                          |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 6.1 | Open `/workspace/objects/:id` with a synced GitHub repo id                            | Detail card renders with provider/type chips, metadata grid, upstream timestamps. |
| 6.2 | Click **Refresh from provider**                                                       | Spinner appears; card re-renders with fresh metadata (starcount etc).             |
| 6.3 | Delete the repo upstream, then refresh                                                | Endpoint returns 410 `OBJECT_GONE`; UI shows the refresh error banner.            |
| 6.4 | Try refresh on a provider whose adapter lacks `fetchObjectDetails` (future providers) | 501 `ADAPTER_REFRESH_UNSUPPORTED`; UI shows a graceful error.                     |
| 6.5 | Try refresh unauthenticated                                                           | 401.                                                                              |

---

## 7. Write Actions & Approval

Per provider with write capability (GitHub, Slack, Jira):

| #   | Step                                                                            | Expected                                                                                          |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 7.1 | `POST /workspace/actions` with a prepared draft (e.g. `CREATE_ISSUE` on GitHub) | Action stored with `status=PENDING_APPROVAL`, `expiresAt` ~24h.                                   |
| 7.2 | Submit twice with the same idempotency key                                      | Second call returns the same action id; no duplicate DB row.                                      |
| 7.3 | Approve as the owning user                                                      | Status flips through `APPROVED → EXECUTING → EXECUTED`; `resultRef` captures the external URL/ID. |
| 7.4 | Approve as a different user                                                     | 403.                                                                                              |
| 7.5 | Simulate provider API failure                                                   | Status lands on `FAILED` with `errorMessage`; retry counter increments.                           |
| 7.6 | Reject an action                                                                | `status=REJECTED` with optional `rejectionReason`.                                                |
| 7.7 | Let an action age past `ACTION_EXPIRY_HOURS`                                    | Background scan flips to `EXPIRED` and excludes from approvable list.                             |
| 7.8 | Check audit log                                                                 | Every transition emits a `workspace.action.*` event captured by audit-service.                    |

---

## 8. Diagnostics

| #   | Step                                                               | Expected                                       |
| --- | ------------------------------------------------------------------ | ---------------------------------------------- |
| 8.1 | `GET /workspace/connectors/:id/health-events?limit=20`             | Recent health events ordered `checkedAt desc`. |
| 8.2 | `GET /workspace/connectors/:id/sync-runs?limit=20`                 | See §4.5.                                      |
| 8.3 | `GET /workspace/actions?connectorId=…&status=FAILED`               | Failed action list filtered to that connector. |
| 8.4 | Hit any of the above with a connector that belongs to another user | 403.                                           |

---

## 9. Regression Checklist

Run this for every workspace-touching PR before merging.

- [ ] `qa/test-workspace-oauth-flow.sh` passes 0 failures.
- [ ] `qa/test-workspace-security.sh` passes 0 failures.
- [ ] `qa/test-workspace-frontend-console.sh` passes 0 failures.
- [ ] `qa/test-workspace-ops-center.sh` passes 0 failures.
- [ ] `npm run test` in `apps/claw-workspace-service` passes ≥242/242.
- [ ] `apps/claw-frontend` typecheck + lint clean.
- [ ] Docker logs for `claw-workspace-service` contain 0 `UnhandledPromiseRejection` or `FATAL`.
- [ ] `SELECT COUNT(*) FROM workspace_provider_app_configs` unchanged (unless the PR intentionally seeds fixtures).
- [ ] No secret values ever leak in API responses (grep responses for the raw client secret used during manual testing).

---

## 10. UAT Scripts (Product / Business)

### Scenario A — "Connect my first GitHub and import issues"

1. Admin signs in, opens `/workspace/providers`.
2. Clicks GitHub card → redirected to `/workspace/app-configs`.
3. Enters GitHub OAuth app credentials (provided to tester separately), saves.
4. Clicks **Connect** on the app config → browser redirects to GitHub, tester authorizes.
5. Back on ClawAI, a new connector card appears under `/workspace` with status **CONNECTED**.
6. Clicks **Sync**. Within 10 seconds, the object list populates with repositories + recent issues + recent PRs.
7. Clicks an issue → `/workspace/objects/:id`. Detail page shows title, state, author, upstream timestamps, and a working **Refresh from provider** button.

**Pass criteria:** Tester can complete the entire flow without reading documentation and without seeing any 500 error.

### Scenario B — "Draft a Slack message through the approval workflow"

1. Admin has a Slack connector in `CONNECTED` state.
2. Opens `/workspace/actions` → **New action**.
3. Picks `SEND_SLACK_MESSAGE`, fills channel + text, submits.
4. Action appears with `PENDING_APPROVAL` badge.
5. Another admin (or the same one per tenant policy) reviews and approves.
6. Within 2 seconds the action flips to `EXECUTED` with a link to the posted message.
7. Opening Slack confirms the message was actually sent.

**Pass criteria:** Neither a rejected message nor an expired action ever results in the post being delivered. Approval and execution are visible and auditable.

### Scenario C — "Spot a broken connector"

1. An OAuth credential has been invalidated at the provider.
2. Health check on that connector runs (manual or via schedule) → moves to `DISCONNECTED`.
3. Admin opens the connector detail tab.
4. Recent health events list shows the failed check with the provider's error message.
5. Recent sync runs show the last successful sync time.
6. Admin can delete the connector and reconnect.

**Pass criteria:** The admin can diagnose and recover without engineer involvement.

---

## 11. Smoke Tests for CI/CD

Minimal set to run on every build:

1. `npm run test` in `apps/claw-workspace-service` (242 unit tests).
2. Provider catalog endpoint returns 12 rows, each with `configSchema`.
3. Factory spec passes for all 12 providers.
4. Object refresh + sync-runs + health-events endpoints respond with expected status codes against an empty DB (404 when id unknown, 401 unauthenticated).

These are covered by the checked-in unit suite and by the QA shell scripts.

---

## 12. Test Data & Seeding Guidance

- **Admin user** is seeded by the auth-service migration — default credentials live in `.env.example`.
- **Provider catalog** is seeded from `src/modules/workspace/constants/provider-registry.constants.ts` at startup by `ProviderRegistryService.ensureCatalog()`.
- **App configs** are never seeded — they must be created through the admin UI or API to avoid leaking test credentials into prod images.
- **Connectors & objects** should be created manually during a UAT run. For isolated automated tests use the factories under `apps/claw-workspace-service/src/__tests__/factories/`.
- **Negative data:**
  - Oversized secrets (>4 KB) to verify the encryption path and storage column.
  - URLs pointing at private IP ranges (`10.0.0.0/8`, `169.254.169.254`) to verify anti-SSRF rejection.
  - OAuth state tamper values to verify PKCE rejection.
  - Webhook signatures with stale timestamps (>5 min) to verify Slack replay protection.
