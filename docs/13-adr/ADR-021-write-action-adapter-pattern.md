# ADR-021 — Write-Action Adapter Pattern (GitLab + Bitbucket + OneDrive + SharePoint + ClickUp)

**Status:** Accepted (2026-05-01)
**Streams:** 20, 21

## Context

Each workspace provider has its own write-action surface (comment a PR, create an issue, upload a file). Streams 10–13 produce approved actions; we need a uniform way to dispatch them.

## Decision

Every adapter implements two optional methods on `WorkspaceAdapter`:

```ts
supportsWrite?(): boolean;
executeWriteAction?(
  accessToken: string,
  actionType: string,
  payload: Record<string, unknown>,
): Promise<WriteActionResult>;
```

The dispatcher (`ActionExecutionManager`, existing) pulls the connector's adapter via `WorkspaceAdapterFactory`, checks `supportsWrite()`, and calls `executeWriteAction`. `WriteActionResult` is `{ success, externalId?, url?, errorMessage? }` — never throws.

**Stream 20** added 8 enum values across GitLab and Bitbucket:
- GitLab: `CREATE_MR_COMMENT`, `APPROVE_MR`, `CREATE_GITLAB_ISSUE`, `COMMENT_GITLAB_ISSUE`, `UPDATE_MR_DESCRIPTION`
- Bitbucket: `CREATE_PR_COMMENT_BB`, `APPROVE_PR_BB`, `CREATE_BITBUCKET_ISSUE`

**Stream 21** added 8 more for Microsoft Graph + ClickUp:
- OneDrive: `UPLOAD_ONEDRIVE`, `MOVE_ONEDRIVE`
- SharePoint: `UPLOAD_SHAREPOINT`, `CREATE_SHAREPOINT_LIST_ITEM`, `UPDATE_SHAREPOINT_LIST_ITEM`
- ClickUp: `CREATE_CLICKUP_TASK`, `UPDATE_CLICKUP_TASK`, `COMMENT_CLICKUP_TASK`

Microsoft Graph "simple upload" caps at 4 MiB. Larger files require an upload-session (deferred to v1.x). Adapter returns `FILE_TOO_LARGE_FOR_SIMPLE_UPLOAD` if exceeded — execution-manager surfaces that as a user-visible failure on the queue row.

A shared utility `microsoft-graph-path.utility.ts` encodes path segments while preserving slash separators (Graph paths use `/v1.0/drives/{id}/root:{path}:` syntax). Centralised so we don't re-implement it per adapter.

## Consequences

- Adding a write action to an existing provider = enum value + switch case + Zod DTO. No execution-pipeline changes.
- Errors never escape `executeWriteAction` — every path returns `{ success: false, errorMessage }`. The execution manager already records that on the queue row.
- 4 MiB cap is acceptable for v1; tracked in `docs/14-risk-debt/technical-debt.md`.

## Verification

- `qa/test-stream-20-gitlab-bitbucket-writes.sh` and `qa/test-stream-21-onedrive-sharepoint-clickup.sh` verify enum presence + run-endpoint acceptance + Docker log clean.
- Unit tests: `microsoft-graph-path.utility.spec.ts` (7 tests).
