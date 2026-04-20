# Service Guide: Workspace Operations Center

## What This Adds

Prompt 06 rounds out the workspace service into an **operations center** that lets users inspect synced objects, pull fresh details on demand, and see how the connector has been syncing. The approval workflow, adapter contract, and search pipeline were already in place — this pass fills the remaining gaps:

- **Live object refresh** — `POST /workspace/objects/:id/refresh` re-fetches the object from the upstream provider and upserts the stored copy.
- **Sync run history** — `GET /workspace/connectors/:id/sync-runs?limit=<N>` returns the recent `WorkspaceSyncRun` records for a connector (owned-by-user enforced).
- **Adapter contract** grows a new optional method `fetchObjectDetails(accessToken, externalId, objectType)` returning provider-native metadata, or `null` when the object is gone upstream.
- **GitHub adapter** implements `fetchObjectDetails` for `REPOSITORY` today. Other providers are opt-in.

## Why Live Refresh Matters

The cache from sync can be hours old. An operations flow ("show me what changed before I approve this PR write-action") needs truth from the provider. The refresh endpoint:

1. Looks up the stored object and asserts ownership.
2. Loads the owning connector and decrypts OAuth tokens.
3. Delegates to `adapter.fetchObjectDetails()`.
4. Upserts the result so subsequent reads are fresh.
5. Returns `410 Gone` if the upstream object no longer exists (so the UI can react).

Adapters that do not implement `fetchObjectDetails` cause the endpoint to return `501 ADAPTER_REFRESH_UNSUPPORTED`.

## API Reference

| Method | Path                                           | Purpose                       | Response             |
| ------ | ---------------------------------------------- | ----------------------------- | -------------------- |
| POST   | `/workspace/objects/:id/refresh`               | Refresh stored object         | `WorkspaceObject`    |
| GET    | `/workspace/connectors/:id/sync-runs?limit=20` | Recent sync runs (owner only) | `WorkspaceSyncRun[]` |

Errors:

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| 400  | Connector has no stored tokens (`NO_TOKENS`)                       |
| 403  | Connector belongs to another user (`FORBIDDEN`)                    |
| 404  | Object or connector not found                                      |
| 410  | Upstream object no longer exists (`OBJECT_GONE`)                   |
| 501  | Adapter does not implement refresh (`ADAPTER_REFRESH_UNSUPPORTED`) |

## Adapter Contract

```ts
fetchObjectDetails?(
  accessToken: string,
  externalId: string,
  objectType: string,
): Promise<LiveObjectDetails | null>;
```

`LiveObjectDetails` fields: `externalId`, `title`, `content`, `url`, `authorId`, `externalCreatedAt`, `externalUpdatedAt`, `metadata`.

Return `null` if the provider returns 404 (object was deleted or renamed).

## Frontend

New page `/workspace/objects/[objectId]`:

- Renders `WorkspaceObjectDetail` with title, badges (provider + type), content, metadata grid, and upstream timestamps.
- "Refresh from provider" button calls `POST /objects/:id/refresh`, invalidates the cached query.
- "Open in provider" link opens `object.url` in a new tab when present.
- Translations live under `workspaceObjectDetail.*` in every locale.

## Testing

- 5 new Jest tests in `workspace-object.service.spec.ts` cover: missing object, missing tokens, unsupported adapter, upstream-gone, happy path, and sync-run ownership.
- Full suite: **189 tests pass** (was 184 before).
- `qa/test-workspace-ops-center.sh` asserts the new endpoints return the right status codes (401/404/200), that sync-runs returns a JSON array, and that Docker logs stay clean.

## Gaps Intentionally Deferred

- `fetchObjectDetails` is only implemented for `GITHUB / REPOSITORY` today. Slack / Jira / Google Drive raise `ADAPTER_REFRESH_UNSUPPORTED` until each provider pass lands.
- The sync endpoint still hardcodes `objectType = REPOSITORY`. Per-type sync filters remain on the provider roadmap (one provider pass at a time will unlock more types).
- No UI yet for sync-run history; the hook and endpoint exist, a drawer in the workspace page is planned for the next UI pass.
