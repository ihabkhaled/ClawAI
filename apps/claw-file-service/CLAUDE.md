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

Runbook: [`skills/add-a-voice-note-or-transcription-path.md`](../../skills/add-a-voice-note-or-transcription-path.md).
