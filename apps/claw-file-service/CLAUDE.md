# Claw File Service - Development Rules

## Service Overview

This is the File microservice for the Claw platform. It owns file upload, storage, and chunking.

## Ownership

- **Files**: Upload, list, get, delete operations for user files
- **File Chunks**: Chunked file content for processing and retrieval

## Tech Details

- **Port**: 4006
- **Database**: PostgreSQL (`claw_files`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Tables Owned

- `files`
- `file_chunks`

## The one thing that surprises everyone here

**`files.content` is base64 of the original bytes. `files.extractedText` is the
text a model reads. They are not the same field and never were.**

Handing `content` to a text model is how this service spent months making every
provider reply _"I can't read the attached file"_ — the model was paraphrasing
the placeholder chat-service emitted, not refusing. Before you touch anything in
the attachment path, read
[ADR-095](../../docs/13-adr/adr-095-attachment-text-extraction-pipeline.md).

Four rules follow from it:

- **Extraction is started by `FilesService.startExtraction`, unawaited.** If you
  add a third upload entry point, it must call it too. A row created without it
  sits at PENDING forever and keeps the file-list poller alive.
- **`ingestionStatus` is load-bearing.** `PENDING`/`PROCESSING` means "not yet",
  never "empty". A reader that treats an unfinished row as a blank file
  reintroduces the original bug in a new place.
- **Write the text and the terminal status in one call** — `saveExtractionResult`.
  A COMPLETED row with no text is a state no reader can interpret.
- **Never bulk-migrate rows to PENDING.** Nothing reprocesses history, so they
  would stay PENDING forever, and the file list polls a 4.2 MB endpoint while any
  row is unfinished. Legacy rows heal one at a time, on use.

Every archive this service opens is bounded. `archive-policy.utility.ts` holds
the expand-to-disk rules, applied by BOTH engines — `zip-extraction.utility.ts`
(node-stream-zip, ZIP) and `seven-zip-extraction.utility.ts` (7-Zip WASM, every
other format); `ooxml-parser.utility.ts` guards the in-memory XLSX and PPTX
path. An `.xlsx` is a ZIP and is user input. Do not add another way to open an
archive without bounds of its own.

## ClamAV: retried to a deadline, then fail closed (2026-09-25)

Every scan goes through ONE `ClamavClient` (`src/infrastructure/clamav/`,
`@Global` `ClamavModule`). `common/utilities/clamav-scanner.utility.ts` is the
wire protocol only (INSTREAM, PING); never open a clamd socket anywhere else.

- **Transient socket errors are retried**, bounded exponential backoff, until
  `CLAMAV_SCAN_DEADLINE_MS` (90 s — a restarted clamd needs ~60 s to load its
  database). Then the scan is `ClamScanOutcome.UNAVAILABLE` and the upload
  **fails closed**: 503 `ANTIVIRUS_UNAVAILABLE`, host-free message. An
  unscanned file is never stored.
- `ANTIVIRUS_UNAVAILABLE` is thrown only when the scanner is the SOLE failing
  check (`FileSecurityCheckResult.antivirusUnavailable`). A file that also fails
  magic bytes / blocklist is still `FILE_SECURITY_CHECK_FAILED`.
- **Never log or return the socket `message`** — Node puts the container IP in
  it. Log `clamErrorCode(error)`.
- After a scan exhausts the deadline, scans for the next 30 s try once
  (`CLAMAV_FAIL_FAST_WINDOW_MS`), so archive expansion cannot stack deadlines.
- `/api/v1/health` PINGs clamd (2 s) and reports `services.clamav`
  (`up`/`down`/`disabled`). clamd down is `degraded` with HTTP 200 — never let it
  fail the container healthcheck; restarting file-service does not fix clamd.
  health-service reads that key for the "Antivirus scanner" status component.
- nginx `/api/v1/files` `proxy_read_timeout 150s` must stay above the deadline.

Runbook: [`runbook-clamav-unreachable.md`](../../docs/11-runbooks/runbook-clamav-unreachable.md) ·
rule: [`rules/18`](../../rules/18-error-handling-and-reliability.md) item 9.

## An archive's text is its manifest (2026-09-23)

An attached archive (`.zip`, and since A2 every format below) reaches the model through its own `extractedText`, which
`ZipExpansionManager` fills with the **archive manifest**
(`utilities/archive-manifest.utility.ts`): an untrusted-content guard, the file
tree with a status per entry, and the children's text packed into
`ARCHIVE_MANIFEST_MAX_CHARS` (= chat-service `MAX_FILE_CONTENT_LENGTH`; change
both together). chat-service has no zip special case and needs none.

- **Children live in `FILE_STORAGE_PATH`**, never in `ZIP_TEMP_EXTRACTION_PATH`
  (tmpfs staging, removed in a `finally`). A path outside the storage root is
  refused by `readFile`, and tmpfs does not survive a restart.
- **Children have `content = null`.** Read `extractedText`; `archivePath` holds
  the path inside the archive, `filename` only the basename.
- **Recurse through `ZipExpansionManager`, not `processFile`.** `processFile`
  starts a fresh depth-1 context with a fresh byte budget, which is how nesting
  limits used to be unenforced.
- **Encrypted entries are skipped, not fatal** (`ARCHIVE_ENCRYPTED`). All
  encrypted → FAILED, but the manifest still says why. A 7z/RAR that encrypts
  its own file list fails with `ARCHIVE_ENCRYPTED` at listing time.

## The in-chat password prompt (batch A3, 2026-09-24)

An `ARCHIVE_ENCRYPTED` archive is not a dead end: `FileArchiveController.
submitPassword` (`POST /files/:id/archive-password`, DTO in
`dto/archive-password.dto.ts`) re-runs extraction with a password the user
typed in chat. The chain is `ArchiveEntriesService.submitPassword` →
`ZipExpansionManager.expandArchive(file, undefined, password, attempts)` →
`extractWithSevenZip`, ending at the SAME `ArchiveExtractionOptions.password`
argument decision 6 of ADR-114 already named. A right password now actually
decrypts the entries (`archive-policy.utility.ts`'s `skipReason` only skips an
`encrypted` entry when NO password was supplied for this attempt) — before
this batch an encrypted entry stayed `SKIPPED_ENCRYPTED` even with a correct
password, because nothing routed one down that far.

- **Bounded: `ARCHIVE_PASSWORD_MAX_ATTEMPTS = 3`**
  (`zip-expansion.constants.ts`). The count lives in the archive's own
  `extractionMetadata.passwordAttempts` (the existing JSON column — no
  migration). `ArchiveEntriesService.submitPassword` checks the cap BEFORE
  calling the manager, so a 4th attempt never reaches 7-Zip.
- **A wrong password reports `ARCHIVE_ENCRYPTED` again, not
  `ZIP_EXPANSION_FAILED`.** `seven-zip-extraction.utility.ts`'s
  `rejectFailedRun` takes a `passwordAttempted` flag and reclassifies a failed
  extract run so the retry gate above can tell "wrong password" from "broken
  archive" by the error code alone.
- **The attempt count is written on every retry, right or wrong** — including
  from the early-failure path (`ZipExpansionManager.
recordFailedPasswordAttempt`), which runs BEFORE the normal `finalize` write
  would have. Skipping it there is how a wrong password would retry forever.
- **The password is never logged, stored beyond the attempt count, or put in
  an event.** `req.body.password` is redacted by the pino logger config in
  `app.module.ts`; every `BusinessException` message this flow throws is a
  static string; `FileArchiveExpandedPayload`/`FileFailedPayload` never had a
  password field. Tests in `zip-expansion.manager.spec.ts` and
  `archive-entries.service.spec.ts` serialize the actual mock call arguments
  and assert the string is absent — not a code-review claim.
- **The frontend dialog shipped the same day, as a follow-up batch.** The
  distinct "encrypted" status (`ArchiveRejectionReason.Encrypted`) came from
  A2; the password prompt itself
  (`apps/claw-frontend/src/components/files/archive/archive-password-dialog.tsx`,
  following `MediaRecordingConsentDialog`'s pattern) now calls this endpoint.
  Detail: `apps/claw-frontend/CLAUDE.md` → "The in-chat archive password
  prompt (batch A3)".

Addendum: [ADR-114](../../docs/13-adr/adr-114-seven-zip-wasm-for-every-archive-format.md)
§"batch A3" · Runbook: [`skills/add-an-archive-format.md`](../../skills/add-an-archive-format.md).

Details: `docs/04-backend/service-guide-file.md` → "ZIP archive expansion",
ADR-053 amendment.

## Every archive format, and what an upload IS (batch A2, ADR-114)

7z, RAR4/5, tar, and gzip/bzip2/xz (plus `.tgz`/`.tbz2`/`.txz`) get the zip
treatment through **7-Zip compiled to WASM** (`7z-wasm`). ZIP stays on
node-stream-zip. `archive-extraction.utility.ts` picks the engine from the
bytes.

- **`seven-zip.utility.ts` is the only importer of `7z-wasm`, and
  `file-type-detection.utility.ts` the only importer of `file-type`** (rules/13).
  No native addon: Smart App Control blocks unsigned `.node` files on the dev box.
- **Magic bytes, not labels.** `resolveUploadMimeType` runs before the security
  checks on both upload paths. An archive sent as `application/octet-stream` is
  stored under its real archive MIME and expanded; a declared archive MIME the
  bytes contradict is rejected. Adding an archive MIME means updating
  `ARCHIVE_MIME_ACCEPTED_FORMATS`, `ALLOWED_MIME_TYPES` (a spec checks they
  agree), and chat-service `EXTRACTABLE_DOCUMENT_MIME_EXACT`.
- **Order is the guarantee on the 7-Zip path:** list (bounded) → validate → plan
  → extract only the planned names → measure what landed. Never extract first.
- **Links never extract, and a file may not share a path with one.** 7-Zip
  extracts by name, so a tar with a symlink `x` and a file `x` would write the
  file through the link. `rejectLinkShadowing` refuses that archive; keep it.
- **Streams (gz/bz2/xz) are bounded while writing**, by the size cap and the
  ratio limit together. Their headers carry no size worth trusting.
- **`password` in `ArchiveExtractionOptions` is for batch A3.** It reaches the
  engine as an argument only — never log it, store it, or echo it in an error.
- **The engine is synchronous** (blocks the event loop ≈ 0.7 s per 100 MB).
  Moving it to a worker thread is the known follow-up.

Runbook for adding a format: [`skills/add-an-archive-format.md`](../../skills/add-an-archive-format.md).

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements. Key points:

- NEVER use `any` — use `unknown`, generics, or proper types
- NEVER disable ESLint rules
- NEVER use `console.log` — use NestJS Logger
- NEVER use `process.env` directly — use AppConfig (Zod-validated)
- Controllers are 3-line methods: extract params, call ONE service, return
- Service methods max 30 lines
- Repositories are pure data access only
- All Zod schemas must have `.max()` on every string and array field
- All errors use `BusinessException` with a `messageKey`
- Every function must have an explicit return type

## No Inline Declarations Rule

**NEVER** define `type`, `interface`, `enum`, or module-level `const` inline in service, controller, repository, manager, adapter, utility, guard, filter, interceptor, pipe, or module files. Extract to dedicated files:

- Types/interfaces → `src/modules/<domain>/types/<name>.types.ts`
- Enums → `src/common/enums/<name>.enum.ts`
- Constants → `src/modules/<domain>/constants/<name>.constants.ts`
  Only exception: `private readonly logger = new Logger(...)` inside NestJS classes.

## Library Wrapping Rule

Every third-party library MUST be wrapped in a utility file under `src/common/utilities/`. Services and controllers NEVER import third-party packages directly — they import the wrapper. Example: `src/common/utilities/jwt.utility.ts` wraps `jsonwebtoken`, and services import `{ signToken, verifyToken }` from the wrapper.

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run prisma:generate  # Regenerate Prisma client
```

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop file-service
./scripts/claw.sh rm -f file-service
docker rmi claw-file-service
./scripts/claw.sh up -d --build file-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output

## Audio is transcribed here, not elsewhere

An audio upload is stored with `extractedText = "[Audio file: x.mp3]"`, then a
`FILE_TRANSCRIBE_REQUESTED` job is published with `publishConfirmed` and
consumed by this service's own `TranscriptionManager`.

It stays in-service because `extractedText` has exactly one writer —
`FilesRepository.saveExtractionResult` — and no endpoint writes it from
outside. Two writers for one column is the thing being avoided.

Three behaviours worth knowing before changing it:

- **No capable connector is a refusal.** `FILE_TRANSCRIBE_FAILED` is published
  and `extractionError` says why. A transcript is never invented.
- **A failed transcription keeps the row `COMPLETED`.** The file was already
  usable; losing the attachment because an optional enrichment failed is worse
  than having no transcript.
- **The publish happens after `saveExtractionResult`, not inside
  `extractText`.** Publishing from inside races the write that follows it — a
  fast transcript would be overwritten by the placeholder that asked for it.
- **Every paid attempt is PAYG-metered** (`PaygSurface.TRANSCRIPTION`,
  `TranscriptionMeterManager`, multimodal batch 4). Reserve → call → finalize on
  MEASURED units (whisper-1: `verbose_json` `duration` seconds; Gemini:
  `usageMetadata` tokens) → or release on throw / timeout / empty transcript.
  Charged to the uploader. `requestId` = `transcription:${fileId}:${provider}`.
  A credit refusal is a RESULT that stops the candidate loop — never fall
  through to a second paid provider — and is recorded as `INSUFFICIENT_CREDIT`
  (402 or clamped hold) or `CREDIT_CHECK_UNAVAILABLE` (meter down / model
  unpriced; fails closed, no provider call). `PaygMeter` comes from the global
  `EntitlementsModule` in `AppModule`. Never log a balance (rule 37 item 4).
  A second call to the same provider in one job (another model, or the 429
  retry) is `…:${provider}:2` — its own hold, never a reuse.
- **Which models, in what order, and when to move on** (rule 42 item 20).
  `selectTranscriptionCandidates` ranks: provider priority, ≤2 models per
  provider (OpenAI once), stable `flash-lite` → `flash` first, preview /
  image / tts / live / non-transcription lines only if nothing stable exists.
  `TranscriptionManager#runCandidates` classifies each failure
  (`classifyTranscriptionFailure`): model refusal → next model; transient 429
  → one backoff retry per job, then skip the provider; OpenAI
  `insufficient_quota` → skip, no retry; a 200 with no text (`EMPTY_RESPONSE`:
  whitespace, or only `thought: true` parts) → ONE same-model retry per job
  under the next request id (`…:GEMINI:2`), then the next model; a
  `MAX_TOKENS` cut-off (`INCOMPLETE_RESPONSE`) → next model, no same-model
  retry; a content-policy block (`SAFETY`, `RECITATION`, `PROHIBITED_CONTENT`,
  `BLOCKLIST`, `SPII`, `promptFeedback.blockReason`) → stop with
  `TRANSCRIPTION_CONTENT_BLOCKED_MESSAGE`; anything else → stop. Hard ceiling
  `TRANSCRIPTION_MAX_PROVIDER_CALLS` = 4. `extractionError` is always one of
  the fixed `TRANSCRIPTION_*_MESSAGE` sentences — never a raw axios string,
  because chat-service hands it to the model and the model repeats it.
- **Gemini is asked for a transcript, not an essay** (2026-09-25). One
  `generationConfig` (`buildGeminiGenerationConfig`): `temperature: 0` always,
  the granted `maxOutputTokens`, and `thinkingConfig: { thinkingBudget: 0 }`
  ONLY for `GEMINI_THINKING_OFF_MODEL_PREFIXES` (`gemini-2.5-flash*`, which
  covers flash-lite). 2.5 Pro 400s on 0, 2.0 has no thinking, 3.x uses
  `thinkingLevel` — anything unlisted gets no thinking field. The adapter
  joins only non-`thought` parts, logs `finishReason` + token counts (never
  the text), and throws `TranscriptionResponseError` (typed `issue`) for a
  block, a `MAX_TOKENS` cut-off or a reasoning-only answer; a plain empty
  answer returns '' and the manager's empty check throws the `EMPTY` issue.
- **A silent video track is `NO_SPEECH`, not `TRANSCRIPTION_FAILED`
  (2026-09-25).** After `extractAudio`, `VideoMediaManager.measurePeakVolume`
  runs ffmpeg `volumedetect` on the DERIVED MP3 through the same bounded
  `runMediaProcess` wrapper (`detectAudioVolume`, format whitelist `mp3` only,
  60 s budget, 64 KB stderr head). A peak below `VIDEO_SILENCE_MAX_VOLUME_DB`
  (-50 dBFS) → `VideoAudioStatus.NO_SPEECH`, document line "No speech detected
  in the audio track.", **no transcription call and no hold**. A failed or
  unparseable measurement fails OPEN (logged, transcribed as before).
  Quiet-but-not-silent audio (≥ -50 dB) is still transcribed, and an empty
  answer there keeps the `TRANSCRIPTION_FAILED` path. Tests:
  `video-processing.manager.spec.ts` "silence gate",
  `volume-detect.utility.spec.ts`.

Runbook: [`skills/add-a-voice-note-or-transcription-path.md`](../../skills/add-a-voice-note-or-transcription-path.md) ·
[`docs/11-runbooks/runbook-voice-note-transcription-failed.md`](../../docs/11-runbooks/runbook-voice-note-transcription-failed.md).

## Video is processed here: probe, plan limit, audio track, frames (multimodal batch 7)

A video upload lands `COMPLETED` with `extractedText = "[Video file: x.mp4]"`
(`VIDEO_PLACEHOLDER_PREFIX`), then `FileProcessingManager.requestVideoProcessing`
publishes `FILE_VIDEO_PROCESS_REQUESTED` (`publishConfirmed`) AFTER that write.
`VideoProcessingManager` (subscribed in `onModuleInit`) runs, in order:

1. **ffprobe** (`MediaToolAdapter.probeMediaFile`) → Zod-parsed
   (`ffprobe-output.dto.ts`) → `VideoProbeSummary`. Refused (row `FAILED`,
   readable `extractionError`, `VideoProcessingFailureReason`) on: no video
   stream, duration missing/≤0, width×height > 3840×2160, > 30 min, probe
   timeout, corrupt container, ffprobe missing.
2. **Thumbnail**: one JPEG ~10% in, ≤480 px wide, ≤96 KB, persisted in
   `extractionMetadata.media.thumbnailBase64`. Never fatal.
3. **Plan limit** (`VideoPlanLimitManager`, `Plan.maxVideoSeconds` via
   `resolvePlanLimit`): over it → `FAILED` `VIDEO_TOO_LONG_FOR_PLAN` naming the
   limit; `0` → `VIDEO_DISABLED_FOR_PLAN`; `null`/ADMIN → unlimited. No hold is
   taken. auth-service unreachable → the paid step is skipped
   (`VideoAudioStatus.ENTITLEMENTS_UNAVAILABLE`), the free steps still land.
4. **Audio track** → 16 kHz mono 32 kbps MP3 → `TranscriptionManager.transcribeDerivedAudio`
   (same candidate loop and PAYG meter as audio uploads; requestId
   `transcription:${fileId}:video-audio:${provider}`; held on the MEASURED
   seconds). OpenAI `verbose_json` segments; Gemini is told to emit `[mm:ss]`
   lines, parsed leniently. It never writes the row.
5. **ONE write** — `FilesRepository.saveVideoExtractionResult`: the timestamped
   document (header line + `[00:12–00:20] text` lines, or "No audio track." /
   "No speech detected in the audio track." / "Audio could not be
   transcribed: …"), status and `extractionMetadata.media`
   together.

Until that write `getIngestionState`, `GET /files` and `GET /files/:id` report
`PROCESSING` (placeholder) or `FAILED` (placeholder + `extractionError`). All
three use one mapping, `resolveEffectiveIngestionStatus` in
`utilities/effective-ingestion.utility.ts`. Never write a second copy (rule 42
item 12). The owner-facing pair stops saying `PROCESSING` after
`OWNER_PLACEHOLDER_PROCESSING_CEILING_MS`, so a lost job cannot keep the file
list polling forever. A placeholder older than
`VIDEO_PROCESSING_STALE_MS` is re-queued on poll (legacy rows, lost jobs) —
never in bulk.

The list's `?ingestionStatus=` filter matches the SAME effective status the
list shows (2026-09-25): `effectiveIngestionStatusWhere`
(`utilities/effective-ingestion-filter.utility.ts`) turns the mapping into a
query condition on the placeholder prefixes, `extractionError` and the owner
ceiling — PROCESSING includes fresh placeholder rows stored `COMPLETED`,
COMPLETED excludes them, FAILED includes placeholder rows with an error. No
migration, no bulk update (rule 42 item 10). `getFiles` uses ONE `now` for the
filter and the mapping. `effective-ingestion-filter.utility.spec.ts` proves the
two agree on every column combination with NULL-aware (SQL three-valued)
evaluation — `NOT (text LIKE …)` is NULL for a row with no text, so COMPLETED
lists `extractedText: null` explicitly.

**Idempotent by fileId**: a job whose row no longer carries the placeholder is
a no-op, and a Redis `SET NX` lock (`file:video-process-lock:<id>`, 15 min)
turns a concurrent duplicate into a no-op — a video is never transcribed twice.

**ffmpeg is spawned in exactly one file**, `common/utilities/media-process.utility.ts`:
`spawn(cmd, argsArray, { shell: false })`, stdin ignored, SIGKILL at a
wall-clock budget, stdout byte cap. Every input is preceded by
`-protocol_whitelist file,pipe` AND `-format_whitelist <video demuxers>` (blocks
the HLS/concat polyglot — verified on bookworm ffmpeg 5.1). The only input path
is `<mkdtemp dir>/input`; the user's filename never reaches an argument. The
temp dir is removed in `finally`. Every limit lives in
`constants/video-processing.constants.ts`; nothing is an env var.

**Frames** — `POST /internal/files/:id/video-frames` `{ userId, timestampsMs[1..8] }`
(service token; owner-checked, 404 otherwise; 409 until processed; 400 past
`durationMs`). JPEG ≤768 px, input-seeked. **Never persisted**: temp dir per
request + Redis cache (`file:video-frame:<id>:<ms>`, 10 min). Response capped
at 3 MB.

**Media facts on `/content` (batch 8)** — `GET /internal/files/:id/content`
adds `media: { durationMs, width, height, hasAudio, failureReason }` for a
video whose job wrote `extractionMetadata.media` (`readVideoMediaSummary`,
re-validated with `videoContentMediaSchema`; never the thumbnail or segments;
key absent for every other file). `?includeContent=false` returns `content:
null` — chat-service's research digest reads the transcript without pulling
the video bytes.

ffmpeg is installed in BOTH images (`Dockerfile.dev`, `Dockerfile` runner) with
a build-time `ffmpeg -version` check. Runbook:
[`skills/debug-a-video-the-model-cannot-read.md`](../../skills/debug-a-video-the-model-cannot-read.md).

## Generated audio is stored, never transcribed (multimodal batch 9, 2026-09-25)

`POST /internal/files/store-generated-audio` (service token, Zod
`storeGeneratedAudioSchema`: `userId`, `filename`, `mimeType` ∈ {`audio/mpeg`,
`audio/wav`}, base64 ≤ the 50 MB file cap, optional `transcript` ≤ 20,000) stores
the audio chat-service synthesised for a reply's owner ("Read aloud").

- Same security pipeline as an upload (magic bytes, ClamAV, sanitized name).
- Stored **COMPLETED** with the spoken text as `extractedText`, and **no**
  extraction job, transcription event or upload event: transcribing our own
  speech would charge the user (PaygSurface.TRANSCRIPTION) for text they already
  have. Do not route generated audio through `upload-internal`, which does.
- Ordinary file ownership: the owner downloads it through `/files/download/:id`;
  retention applies; chat-service re-synthesises (new generation) when it is gone.
