# ADR-104: Generated files download through an owner-only proxy and expire after an hour

**Status**: Accepted
**Date**: 2026-09-19

## Context

- **Links exposed the storage layer.** Generated files were linked as
  `/api/v1/files/download/<file-service id>`. The link named the storage id,
  and the file-generation JSON returned that id as `storageKey`.
- **Nothing ever expired.** Files had no lifetime and nothing cleaned them up.
- **The UI broke on missing files.** The chat fetched every file eagerly, so a
  missing file left "Preparing download..." on screen forever.
- **file-generation-service never shipped a migration.** Production's
  `claw_file_generations` database held only `_prisma_migrations`, so the
  `file_generations` table did not exist. Every AI file request in production
  failed at its first insert. Dev had tables only because they had been
  created by `db push`.

## Decision

1. **Owner-only proxy download:**
   `GET /api/v1/file-generations/:id/assets/:assetId/download`.
   - `FileGenerationOwnerGuard` checks the owner, and the asset must belong to
     that generation.
   - The bytes stream from file-service `download-internal` over the service
     token.
   - Response headers:
     - `Content-Disposition: attachment`, with a sanitised name (quotes,
       newlines and paths are stripped, and the extension is the format's
       own);
     - `Cache-Control: private, no-store`;
     - `X-Content-Type-Options: nosniff`.
   - User responses carry no `storageKey` (`toGenerationView`).
2. **One-hour life:**
   - every asset gets `expiresAt = now + 1h`;
   - after that, a download answers **410 `FILE_EXPIRED`**;
   - a sweep every 5 minutes deletes the bytes through file-service's new
     owner-checked `DELETE /internal/files/:id?userId=`, and sets
     `expiredAt`;
   - the row and its text stay.
3. **Rebuild:** `POST /file-generations/:id/rebuild` (owner only) rebuilds
   the file from its saved text. It is free, and the new asset gets a new hour.
   "Regenerate with AI" is the message's own regenerate, which calls the AI
   again.
4. **In the chat** (persisted through the message's `generationId`):
   - a live file shows "Available for N min" and downloads on click, with the
     session;
   - an expired file shows "Rebuild file (free)" and "Regenerate with AI";
   - all in 13 locales.
5. **Migration:** file-generation-service gets a full `init` migration
   (enums, 3 tables, the expiry columns). Production applies it on its next
   boot. A dev database created by `db push` has to be reset once, as data is
   disposable there; a dev database with no tables applies it cleanly.

## Verified live (2026-09-19)

| Case                                    | Result                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| owner download                          | 200, `%PDF-`, attachment + no-store + nosniff                                  |
| no auth / other user / foreign asset id | 401 / 400 / 400                                                                |
| file-service id in the JSON             | absent                                                                         |
| after the hour                          | 410 FILE_EXPIRED                                                               |
| rebuild: owner / other user             | 201 / 400, then a new asset downloads                                          |
| real sweep                              | "expired 4 file(s)", file-service rows gone                                    |
| browser                                 | download saved; expired card; rebuild restores; 3 widths without overflow; RTL |
