# ADR-053: File Retention Sweeper + ZIP Archive Expansion Guardrails

**Status**: Accepted
**Date**: 2026-05-31
**Deciders**: ClawAI core team
**Slice**: C foundation 3 (claw-file-service hardening)

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

The existing `FileSecurityManager` is the natural enforcement point for
ZIP guards because it already runs BEFORE any storage write. The
retention sweep is a new concern and lives next to the file lifecycle —
file-service is the only service that owns the `File`/`FileChunk` blob
and DB row, so it owns deletion.

## Decision

### 1. File retention sweeper

- Add a NestJS `@Cron` task to `claw-file-service` driven by
  `FILE_RETENTION_SWEEP_CRON` (default `'0 2 * * *'` — 02:00 daily,
  server local time).
- Each tick: query up to `FILE_RETENTION_SWEEP_BATCH_LIMIT` (default 100)
  `File` rows where `createdAt < now() - FILE_RETENTION_DAYS days` (default 30) and `ingestionStatus IN (COMPLETED, FAILED)`.
- For each row: delete blob at `storagePath` (warn-and-continue if
  missing), cascade-delete `FileChunk` rows via Prisma, then delete the
  `File` row.
- `FILE_RETENTION_DAYS=0` is the kill-switch (files live forever).
- The sweep is bounded by `FILE_RETENTION_SWEEP_BATCH_LIMIT` per tick
  so DB locks stay short and the sweep can be observed via logs
  before scaling out.

### 2. ZIP archive expansion guardrails

Add four hard caps enforced by `FileSecurityManager` BEFORE any
extraction to disk:

| Env var                           | Default | Purpose                                                              |
| --------------------------------- | ------: | -------------------------------------------------------------------- |
| `ZIP_MAX_NESTING_DEPTH`           |       5 | Max archive-inside-archive recursion depth.                          |
| `ZIP_MAX_ENTRY_COUNT`             |   10000 | Max entries (files + directories) per archive.                       |
| `ZIP_COMPRESSION_RATIO_THRESHOLD` |    1000 | Per-entry `uncompressedSize / compressedSize` cap. Above = ZIP bomb. |
| `ZIP_MAX_EXTRACTED_SIZE_MB`       |     500 | Sum-of-uncompressed-bytes cap across the whole archive.              |

Validation order is fixed: nesting → entry count → ratio → total size →
path traversal. The first violation aborts the upload with HTTP 422
and surfaces the i18n key `files.zip.bombRejected` to the user. All
checks use the central directory header (i.e. metadata only), so a
malicious archive never streams to disk before it is rejected.

Extraction happens inside `ZIP_TEMP_EXTRACTION_PATH` (default
`/tmp/claw-zip-extraction`), which is mounted as a 1 GB `tmpfs` in
both `docker-compose.dev.services.yml` and
`docker-compose.prod.services.yml`. This means even if all four
metadata checks somehow miss a novel bomb pattern, the kernel-enforced
tmpfs size cap is a backstop that protects the host disk.

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
- i18n key `files.zip.bombRejected` — surfaced by the FE when an
  upload is rejected at any of the four ZIP-guard stages.
- i18n key `files.retention.expired` — surfaced when a thread later
  references a file that has been removed by the sweeper.
- i18n key `files.permissions.denied` — surfaced when a viewer hits
  the file list/detail endpoints without `FILES.VIEW` permission.
