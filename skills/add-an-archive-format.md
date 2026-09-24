# Add an archive format (or an archive MIME alias)

file-service expands an attached archive into child files plus a manifest the
model reads. ZIP goes through node-stream-zip; every other format through 7-Zip
compiled to WASM. Adding a format — or just a MIME label a browser sends for an
existing one — touches the same short list every time.

Governing: [ADR-114](../docs/13-adr/adr-114-seven-zip-wasm-for-every-archive-format.md) ·
[`apps/claw-file-service/CLAUDE.md`](../apps/claw-file-service/CLAUDE.md) ·
[`service-guide-file.md`](../docs/04-backend/service-guide-file.md) → "Every other archive format"

## 1. Can 7-Zip read it?

7-Zip reads far more than the service exposes (cab, iso, lzh, arj, wim, …).
Check with the engine the service ships, not a desktop 7-Zip:

```bash
cd apps/claw-file-service
node --input-type=module -e "import S from '7z-wasm'; const e=await S(); e.callMain(['i'])" | grep -i <format>
```

Formats 7-Zip can only READ (RAR) cannot be created for tests with it; build
the fixture by hand (see `buildRar4`/`buildRar5` in
`src/common/utilities/__tests__/__fixtures__/archive-fixtures.ts`).

## 2. The edits (all in the same commit)

| File                                                                                    | What                                                                                                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/common/enums/archive-format.enum.ts`                                               | New value = the 7-Zip `-t` type name.                                                                |
| `constants/archive-formats.constants.ts` → `ARCHIVE_SIGNATURES`                         | Magic bytes + offset. Longer, more specific signatures first.                                        |
| `ARCHIVE_MIME_ACCEPTED_FORMATS`                                                         | Every MIME label → the formats its bytes may be.                                                     |
| `CANONICAL_ARCHIVE_MIME_BY_FORMAT`, `DETECTED_MIME_TO_ARCHIVE_FORMAT`                   | What an octet-stream upload is re-labelled to, and what `file-type` calls it.                        |
| `ARCHIVE_FILE_EXTENSIONS`, `zip-expansion.constants.ts` `EXTENSION_TO_MIME`             | So a nested one at the depth limit is skipped by name, and a child gets the right MIME.              |
| `STREAM_CODEC_FORMATS` + `STREAM_SUFFIX_RULES`                                          | Only if it is a single compressed stream (no entry table), like gz/bz2/xz.                           |
| `modules/files/types/files.types.ts` → `ALLOWED_MIME_TYPES`                             | The upload DTO allowlist. `archive-format.utility.spec.ts` fails if it disagrees with the map above. |
| chat-service `constants/file-delivery.constants.ts` → `EXTRACTABLE_DOCUMENT_MIME_EXACT` | Otherwise chat-service records the archive as OMITTED_UNSUPPORTED and never delivers its manifest.   |

If 7-Zip's `l -slt` prints a key the listing parser does not know and it
matters (a new link or device marker), add it to `LISTING_KEY` and
`archive-listing.utility.ts`, with a spec that feeds the raw listing text.

## 3. Tests that must exist

In `archive-extraction.utility.spec.ts`, through the real engine:

- the format extracts, with folder paths kept as `archivePath`;
- a traversal name rejects the archive (`ZIP_PATH_TRAVERSAL`);
- an oversized declared total rejects before writing;
- encrypted entries (if the format has them) are skipped as `skipped-encrypted`;
- `sniffArchiveFormat` recognises it, and an octet-stream upload of it is
  re-labelled (`archive-format.utility.spec.ts`,
  `files.service-archive-upload.spec.ts`);
- a declared MIME with other bytes is rejected
  (`file-validator.utility.spec.ts`).

## 4. Gates

```bash
cd apps/claw-file-service && npm run typecheck && npx eslint <changed files> && npx vitest run && npm run build
cd apps/claw-chat-service && npx vitest run src/common/utilities/__tests__/file-delivery.utility.spec.ts
```

Then update the format table in `service-guide-file.md`.

## The password retry flow (batch A3)

`ArchiveExtractionOptions.password` is wired end to end:
`FileArchiveController.submitPassword` → `ArchiveEntriesService.submitPassword`
→ `ZipExpansionManager.expandArchive(file, undefined, password, attempts)` →
`extractWithSevenZip`. If you touch any layer of that chain for a new format,
keep these invariants:

- **`archive-policy.utility.ts`'s `skipReason`/`planExtraction` take a
  `passwordProvided` flag.** An `encrypted` entry is skipped only when no
  password was supplied for THIS attempt; with one, it goes to 7-Zip to
  actually decrypt. Don't special-case a new format around this — it is
  format-agnostic by design.
- **A failed extract run with a password supplied reports `ARCHIVE_ENCRYPTED`,
  not the format's normal failure code** (`rejectFailedRun`'s
  `passwordAttempted` flag in `seven-zip-extraction.utility.ts`). This is what
  lets the retry cap distinguish "wrong password" from "broken archive".
- **The attempt count (`extractionMetadata.passwordAttempts`,
  `ARCHIVE_PASSWORD_MAX_ATTEMPTS = 3`) is written on BOTH the success path
  (`finalize`) and the early-failure path
  (`ZipExpansionManager.recordFailedPasswordAttempt`).** Miss the second one
  and a wrong password retries forever.
- **ZIP stays out of this.** node-stream-zip's own encrypted-entry handling is
  unchanged; only the 7-Zip path (every other format) decrypts with a
  password.

## Traps

- **Never extract before listing.** Every guarantee is decided from the listing.
- **Never pass a user-chosen name to 7-Zip as a wildcard.** Names go through the
  list file with `-spd`.
- **A password is an argument, never a log line.** `runSevenZip` logs the
  arguments before the `-p` switch is added; keep it that way.
- **Don't add a native addon to "make it faster".** Smart App Control blocks
  unsigned `.node` binaries on the dev box.
