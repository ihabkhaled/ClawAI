# ADR-053: File Retention Sweeper + ZIP Archive Expansion Guardrails

**Status**: Accepted
**Date**: 2026-05-31
**Deciders**: ClawAI core team
**Slice**: C foundation 3 (claw-file-service hardening)

> **Amended by [ADR-095](adr-095-attachment-text-extraction-pipeline.md) (2026-09-12).** This ADR describes the expand-to-disk archive path. There is
> now a second: `.xlsx` and `.pptx` are ZIP containers read **in memory** by
> `ooxml-parser.utility.ts`, which does not route through the thresholds below.
> It carries its own equivalent caps in `ooxml.constants.ts` — entry count,
> per-entry inflated size checked against the declared size before inflating,
> and a total text budget. Auditing every way this service opens an archive
> means reading both.

> **Amended 2026-09-23 (archive batch A1).** Parts of this ADR described a design
> that was never built: the ZIP checks do not run in `FileSecurityManager` before
> storage, nothing is rejected with HTTP 422, nesting depth was not enforced, the
> total size was not checked from the central directory, and the staging tmpfs
> was never cleaned. The sections below now describe the code as it stands; the
> **Amendment 2026-09-23** section at the end says what changed and why.
> Operational detail: `docs/04-backend/service-guide-file.md` → "ZIP archive
> expansion".

## Context

`claw-file-service` currently stores every uploaded file forever and accepts
ZIP-format archives (`.zip`, plus the ZIP-derived office formats `.docx`,
`.xlsx`, `.pptx`, `.odt`) with no expansion guardrails beyond the existing
ClamAV + magic-byte + filename-validator checks. Two failure modes are
already observable on long-lived installs:

1. **Storage growth is unbounded.** `pg-files` and the `file-storage-data`
   docker volume both grow monotonically because nothing ever deletes
   rows or blobs. On a 90-day soak install the file table reached
   ~84 GB of which ~70 GB was orphan chunks for files that the user had
   long stopped referencing from any thread. Backup jobs and bulk migrations
   slow proportionally.

2. **ZIP bombs and resource exhaustion are not blocked.** The existing
   `FileSecurityManager` mentions "ZIP bomb detection" as a single check
   for "suspicious null byte patterns" — that catches the textbook
   42.zip case but not modern adversarial archives (high-ratio
   single-entry bombs, nested archives, entry-count exhaustion). A
   crafted 4 MB `.docx` upload from an internal red-team exercise
   expanded to 12 GB during the chunking pass and OOM-killed the
   file-service container, taking out the whole upload pipeline for
   ~6 minutes until the orchestrator restarted it.

The original plan put the ZIP guards in `FileSecurityManager`, because it
runs before any storage write. That is not where they ended up: archives are
expanded during text extraction, after the upload is stored (see Decision §2).
The retention sweep is a new concern and lives next to the file lifecycle —
file-service is the only service that owns the `File`/`FileChunk` blob
and DB row, so it owns deletion.

## Decision

### 1. File retention sweeper

- Add a NestJS `@Cron` task to `claw-file-service` driven by
  `FILE_RETENTION_SWEEP_CRON` (default `'0 2 * * *'` — 02:00 daily,
  server local time).
- Every upload is stamped `retentionExpiresAt = now + FILE_RETENTION_DAYS`
  (default 30) at creation (published share copies are kept, `null`); files extracted from an archive inherit the
  archive's value. Each tick queries up to `FILE_RETENTION_SWEEP_BATCH_LIMIT`
  (default 100) `File` rows with `retentionExpiresAt < now()`. (The original
  text said `createdAt` and a status filter; the code has always keyed on
  `retentionExpiresAt` and does not filter by status.)
- For each row: delete blob at `storagePath` (warn-and-continue if
  missing), cascade-delete `FileChunk` rows via Prisma, then delete the
  `File` row.
- `FILE_RETENTION_DAYS=0` is the kill-switch (files live forever).
- The sweep is bounded by `FILE_RETENTION_SWEEP_BATCH_LIMIT` per tick
  so DB locks stay short and the sweep can be observed via logs
  before scaling out.

### 2. ZIP archive expansion guardrails

Archives are expanded by `ZipExpansionManager` during text extraction, which
starts after the upload has been stored and its row created. The upload request
runs only the ordinary upload checks on the ZIP bytes and returns 201; a
violation found during expansion marks the archive row `FAILED` with
`extractionError = "<CODE>: <reason>"` and publishes `FILE_FAILED`. There is no
HTTP 422, and the i18n key `files.zip.bombRejected` exists in every locale but
is not rendered by any component today.

Four caps, all configurable:

| Env var                           | Default | Purpose                                                                                    |
| --------------------------------- | ------: | ------------------------------------------------------------------------------------------ |
| `ZIP_MAX_NESTING_DEPTH`           |       5 | Deepest archive level that is opened (the upload is depth 1). Deeper archives are skipped. |
| `ZIP_MAX_ENTRY_COUNT`             |   10000 | Max entries (files + directories) per archive.                                             |
| `ZIP_COMPRESSION_RATIO_THRESHOLD` |    1000 | Per-entry `uncompressedSize / compressedSize` cap. Above = ZIP bomb.                       |
| `ZIP_MAX_EXTRACTED_SIZE_MB`       |     500 | Uncompressed-bytes cap per archive AND the budget shared by the whole nested archive tree. |

Whole-archive rejections, in this order, all from central-directory metadata
before any byte is written: entry count (`ZIP_TOO_MANY_ENTRIES`) → per-entry
path safety (`ZIP_PATH_TRAVERSAL`) → per-entry ratio (`ZIP_BOMB_RATIO`) →
declared total size of the entries to extract against
`min(ZIP_MAX_EXTRACTED_SIZE_MB, remaining shared budget)` (`ZIP_BOMB_RATIO`, or
`ZIP_CUMULATIVE_SIZE_EXCEEDED` when the shared budget is the binding limit).
Declared sizes can lie, so the bytes actually inflated are counted against the
same cap during extraction.

Per-entry skips, which do not fail the archive: password-protected entries
(`ARCHIVE_ENCRYPTED`, detected up front from the entry flags), a nested archive
already at the depth limit, and an entry larger than a single upload may be
(50 MB). Entries that fail the ordinary upload security checks (ClamAV, magic
bytes, extension blocklist) are skipped too.

Extraction stages bytes in `ZIP_TEMP_EXTRACTION_PATH` (default
`/tmp/claw-zip-extraction`), a 1 GB `tmpfs` in `docker-compose.dev.services.yml`
and `docker-compose.prod.services.yml`, so a novel bomb pattern that slips past
the metadata checks is still stopped by a kernel-enforced size cap. Each
archive's staging directory is removed in a `finally` after its expansion,
success or failure. Extracted files are then stored under `FILE_STORAGE_PATH`
like any upload — the staging area is never their home.

## Why these specific thresholds

| Threshold                         | Default | Reasoning                                                                                                                                                                       |
| --------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FILE_RETENTION_DAYS`             |      30 | Aligned with `MEMORY_SUGGESTION_TTL_DAYS=30` and existing log TTL (30 d) — single mental model for "ephemeral by default" data classes.                                         |
| Sweep batch limit                 |     100 | 100 deletes × ~25 ms ≈ 2.5 s wall clock per tick under load — bounded enough to not starve the upload path, large enough to drain a 1 M-row backlog in ~30 days at hourly cron. |
| `ZIP_MAX_NESTING_DEPTH`           |       5 | Empirically: legitimate office files nest at most 2 deep. 5 is generous headroom; anything deeper is hostile.                                                                   |
| `ZIP_MAX_ENTRY_COUNT`             |   10000 | The largest legitimate `.xlsx` we observed in production has ~1100 entries. 10× headroom.                                                                                       |
| `ZIP_COMPRESSION_RATIO_THRESHOLD` |    1000 | Real-world text compresses ~10×. PDF/PNG/JPEG inside ZIP compresses ~1×. A 1000:1 ratio is structurally impossible without intentional bomb construction.                       |
| `ZIP_MAX_EXTRACTED_SIZE_MB`       |     500 | The current max upload size cap is 50 MB. A legitimate 50 MB ZIP would expand to ~500 MB at the 10× normal ratio. Anything larger is the user trying to bypass the upload cap.  |

## Alternatives considered

1. **Delete files on thread-delete instead of time-based sweep.** Rejected:
   files are intentionally re-usable across threads (the same uploaded
   spreadsheet can be referenced from multiple chats). A
   thread-scoped delete would have surprised users with broken links.
2. **No ratio check, rely only on total-size cap.** Rejected: a
   single-entry archive with `ZIP_MAX_EXTRACTED_SIZE_MB - 1` bytes
   passes the size cap but is still a ratio bomb that takes 500 MB of
   RAM to inflate. Catching it at the metadata stage is cheaper than
   discovering it during stream extraction.
3. **In-process extraction without tmpfs.** Rejected: `node-stream-zip`
   and `unzipper` both buffer at least some of the central directory
   in process memory. tmpfs gives us a kernel-enforced backstop that
   no JS-land bug can bypass.
4. **Per-tenant or per-plan retention windows.** Deferred to Slice D;
   a single global default is enough to unblock Slice C and the
   plumbing is purely additive.

## Operational notes

- **Observability**: the sweeper emits a structured log per deleted
  row with `requestId=retention-sweep-<runId>` so a single run is
  filterable in `claw-server-logs`. A summary log per tick reports
  `deletedCount`, `failedCount`, `wallMs`.
- **Recovery**: deletion is one-way. Users who need long retention
  raise `FILE_RETENTION_DAYS` on their install. There is no
  per-file pin (would be Slice D + a UI affordance).
- **Migration**: existing rows older than the new default 30 days will
  be eligible for deletion on the first sweep after deployment. Sites
  upgrading should set `FILE_RETENTION_DAYS=365` (or the appropriate
  value) BEFORE the first 02:00 tick if they want to keep historical
  data; this is called out in the release notes.

## Consequences

**Pros**

- Bounded storage growth — `pg-files` and the file-storage docker
  volume both reach a steady state ~`uploadRate × FILE_RETENTION_DAYS`.
- ZIP-bomb-resistant upload pipeline. Containers can no longer be
  OOM-killed by a crafted archive.
- The kernel-enforced tmpfs backstop means even a JS-land bug in the
  guardrails cannot fill the host disk.

**Cons**

- One more cron job to monitor. Surfaced via the existing server-logs
  pipeline; no separate dashboard needed yet.
- Users who relied on the implicit "files live forever" contract must
  set `FILE_RETENTION_DAYS=0` (or a high number) on upgrade. Mitigated
  by the release-notes call-out.
- Adds 5 environment variables (4 ZIP + 1 retention sweep cron). All
  default-safe — a fresh install behaves correctly with zero
  configuration.

## References

- `docs/04-backend/service-guide-file.md` — File retention + ZIP
  archive expansion sections (added in this slice).
- Root `CLAUDE.md` — Known Gotchas section ("File retention + ZIP
  archive guardrails (Slice C foundation 3)").
- `apps/claw-file-service/src/app/config/app.config.ts` — Zod schema
  fields with defaults.
- i18n key `files.zip.bombRejected` — defined in all 13 locales but not
  rendered by any component; a rejected archive currently shows as a FAILED
  file.
- i18n key `files.retention.expired` — surfaced when a thread later
  references a file that has been removed by the sweeper.
- i18n key `files.permissions.denied` — surfaced when a viewer hits
  the file list/detail endpoints without `FILES.VIEW` permission.

## Amendment 2026-09-23 — archive batch A1

What the audit found, and what changed:

| Claimed                                            | Was                                                                                                    | Now                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Checks run in `FileSecurityManager` before storage | Checks run during extraction, after storage                                                            | Unchanged; documented as such.                                                                                            |
| Violations return HTTP 422                         | The archive row ends FAILED; no HTTP error                                                             | Unchanged; `extractionError` now carries `<CODE>: <reason>` so a model can tell the user why.                             |
| Total size checked from the central directory      | Only the running total during extraction                                                               | Declared total checked before writing, running total still checked during.                                                |
| Nesting depth enforced                             | Depth reset at every level; `ZIP_MAX_NESTING_DEPTH` only mattered when set to 1                        | Depth passed through the recursion; archives at the limit are skipped; one byte budget shared across all levels.          |
| Sandbox cleaned after every upload                 | Never cleaned; children's `storagePath` pointed into the tmpfs, so their bytes died with the container | Children stored under `FILE_STORAGE_PATH` with the archive's `retentionExpiresAt`; staging removed in a `finally`.        |
| (unstated) an attached archive reaches the model   | The archive row had no `extractedText`; the model was told the ZIP "produced no readable text"         | The archive's `extractedText` is a manifest: file tree, per-entry status, and the children's text within 100k characters. |
| (unstated) encrypted archives                      | `Entry encrypted` failed the whole archive as `ZIP_EXPANSION_FAILED`                                   | Encrypted entries skipped as `ARCHIVE_ENCRYPTED`; the rest delivered. Password support is a later batch.                  |

The manifest is written through `FilesRepository.saveExtractionResult`, which
stays the only writer of `extractedText` (ADR-095), and carries the same
untrusted-content guard chat-service already puts in front of attachments.
A new nullable column, `files.archive_path` (migration
`20260923120000_add_file_archive_path`), keeps each child's path inside its
archive; `filename` alone lost the folder structure.

Known limits left for later batches: password-protected archives, formats other
than ZIP, and archives expanded before this amendment, which have no manifest
and are not re-expanded on use (re-expanding would duplicate their children).
