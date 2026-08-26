# Batch 04 — Sync no longer hard-deletes inventory

`ConnectorModelsRepository.replaceMany` now soft-marks absent models instead of
deleting rows. Models missing from a provider listing are set to
`lifecycle: REMOVED` and `exposure: UNEXPOSED`; the row and its id survive so plan
entitlements and audit history keep a stable target.

A model that disappears can no longer keep serving users, since exposure is
forced back to `UNEXPOSED`. When the same `modelKey` reappears in a later sync,
the upsert `update` branch sets `lifecycle` from the incoming payload (typically
`ACTIVE`) and refreshes `lastSeenAt`, so it returns automatically — but an
administrator's prior exposure decision is preserved because the update branch
does not touch `exposure`. Newly discovered models are created `UNEXPOSED` with
`kind: CHAT` via schema defaults.

The return shape `{ upserted, deleted }` is unchanged; `deleted` now counts
models marked `REMOVED` rather than rows destroyed, so `ModelSyncRun.modelsRemoved`
and existing callers keep compiling.
