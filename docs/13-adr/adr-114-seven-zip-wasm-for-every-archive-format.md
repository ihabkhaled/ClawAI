# ADR-114: Every archive format opens through 7-Zip compiled to WASM; ZIP keeps node-stream-zip

**Status**: Accepted
**Date**: 2026-09-23
**Amends**: ADR-053 (archive expansion bounds), ADR-095 (attachment text pipeline)

## Context

Batch A1 made an attached `.zip` reach the model: its children are persisted,
its manifest is written into the archive's `extractedText`, and every bound
(entry count, traversal, per-entry ratio, declared and real size, a budget
shared across nesting levels, encrypted entries reported not crashed on) is
checked from the central directory before a byte is inflated.

Everything else a user attaches as an archive — `.7z`, `.rar`, `.tar`,
`.tar.gz`/`.tgz`, `.tar.bz2`/`.tbz2`, `.tar.xz`/`.txz`, and single-file
`.gz`/`.bz2`/`.xz` — was either refused as a MIME type or, worse, arrived as
`application/octet-stream` (Windows has no registered type for most of them)
and was decoded as UTF-8 noise and handed to the model.

Constraints on the engine:

- **No native addon.** Windows Smart App Control blocks unsigned `.node`
  binaries on the dev box (it already blocks argon2), and the images are
  `node:26-bookworm-slim`.
- **List before extracting.** The A1 guarantees depend on judging entry names,
  types, sizes and encryption from the entry table first.
- **Bounded memory** for a 50 MB upload that may declare a multi-gigabyte
  dictionary.
- A password parameter for batch A3.

## Options considered

| Option                                                                  | Formats                                     | Native?         | Lists before extracting | Notes                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------- | --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`7z-wasm` 1.2.0** (7-Zip 24.09, Emscripten)                           | 7z, RAR4, RAR5, tar, gzip, bzip2, xz (+zip) | No              | Yes, `l -slt`           | One engine, one adapter, one policy. `-p` passwords, `-smemx` memory cap. 1.65 MB `.wasm`. Last published 2025-06; tracks upstream 7-Zip. LGPL + **unRAR restriction** (below).              |
| `tar-stream` + `zlib` + `seek-bzip` + `xz-decompress` + `node-unrar-js` | same, via five libraries                    | No              | Per library             | Five dependencies, five APIs, five places for the bomb policy to be re-implemented and drift. No 7z reader at all in pure JS worth trusting. `node-unrar-js` carries the same unRAR licence. |
| `node-7z` / system `7z` binary                                          | all                                         | Spawns a binary | Yes                     | Needs `p7zip` in the image and on every dev box; shelling out with user file names.                                                                                                          |
| Native bindings (`libarchive`, `unrar` addons)                          | all                                         | **Yes**         | Yes                     | Ruled out: Smart App Control.                                                                                                                                                                |

## Decision

1. **7-Zip (WASM) opens every non-ZIP format.** The only file that imports
   `7z-wasm` is `common/utilities/seven-zip.utility.ts` (rules/13). Each run is a
   fresh engine instance; archives are read and written through NODEFS mounts
   of real host directories, so the archive is never copied into the WASM heap.
   `-smemx256m` caps a decoder's dictionary.
2. **ZIP stays on node-stream-zip.** It is the path A1 hardened and tested, it is
   asynchronous, and 7-Zip is not strictly better for it. The dispatcher
   (`archive-extraction.utility.ts`) chooses the engine from the file's bytes,
   never from its extension or declared MIME.
3. **One policy for both engines.** The A1 rules moved unchanged into
   `archive-policy.utility.ts`: entry count, traversal, per-entry ratio, a
   whole-archive ratio (a solid 7z/RAR block hides per-entry ratios), declared
   size against the shared budget, links and device nodes skipped, a file that
   shares a path with a link (or sits beneath one) rejects the archive, nested
   archives at the depth limit skipped. The 7-Zip path is: list (bounded),
   validate, plan, extract only the planned names, then measure what landed.
   The listing output itself is capped, so an entry-count bomb cannot exhaust
   memory before it is counted.
4. **Stream codecs are bounded while writing.** gzip/bzip2/xz carry no size a
   reader can trust, so the stream is decompressed through stdout into a file
   sink that refuses the byte past `min(size cap, compressed × ratio limit)`.
   A payload that sniffs as a tar is then opened as one; anything else is a
   single child named after the archive minus its suffix
   (`report.csv.gz` → `report.csv`, `site.tgz` → `site.tar`).
5. **Magic bytes decide what an upload is.** A declared archive MIME must sniff
   as one of the formats it may be (`ARCHIVE_MIME_ACCEPTED_FORMATS`), or the
   upload is rejected. An upload labelled `application/octet-stream` — or any
   other `text/*`/`application/*` label with no signature check of its own — is
   re-labelled with its real archive MIME when `file-type` recognises a PLAIN
   archive (it looks inside ZIP containers, so a DOCX/XLSX/JAR is not expanded).
   `application/x-zip-compressed` is now signature-checked too.
6. **Encryption is reported, not crashed on.** An encrypted entry is skipped
   (`ARCHIVE_ENCRYPTED`); a 7z/RAR whose entry table is itself encrypted fails
   with `ARCHIVE_ENCRYPTED` — 7-Zip's password prompt reads a stdin that throws,
   so it cannot hang. `ArchiveExtractionOptions.password` reaches the engine as
   an argument only (never logged, stored, or put in an error) for batch A3.

## Licence

`7zz.wasm` and its JS glue are **GNU LGPL + the unRAR restriction**
(`node_modules/7z-wasm/License.txt`, `unRarLicense.txt`). The unRAR restriction
permits using the code to **decompress** RAR archives and forbids using it to
re-create the RAR compression algorithm. ClawAI only reads RAR, so it complies.
The unRAR licence also forbids charging a fee for distributing unRAR itself;
ClawAI does not distribute it as a product, it runs it server-side. The package
is used unmodified as an npm dependency, which satisfies the LGPL.
Do not vendor or patch `7zz.wasm`; if that is ever needed, re-read both licences
first.

## Measured

On the dev box (Node 26, Windows 11), outside the service:

- gzip of 64 MB streamed through the stdout sink: **260 ms**, process RSS 122 MB.
- A 25 MB `.7z` (LZMA2 -mx5) holding 100 MB of text: extracted in **732 ms**,
  RSS delta **33 MB**.

## Consequences

- One dependency (`7z-wasm`, plus its CLI-only `readline-sync`) covers seven
  formats. `Dockerfile` and `Dockerfile.dev` fail the build if
  `node_modules/7z-wasm/7zz.wasm` did not ship.
- chat-service delivers every archive MIME as extracted text (the manifest);
  `EXTRACTABLE_DOCUMENT_MIME_EXACT` mirrors `ARCHIVE_MIME_ACCEPTED_FORMATS` and
  both must change together.
- **Known limitation — the engine runs on the event loop.** `callMain` is
  synchronous: extracting blocks file-service's event loop for the duration
  (≈ 0.7 s per 100 MB above; the 500 MB cap bounds the worst case to a few
  seconds). Moving the engine into a `worker_threads` worker is the follow-up if
  archive traffic makes that visible.
- 7-Zip matches the list file by name, so an archive with two entries of the
  same path extracts both. The link-shadowing rule (decision 3) is what makes
  that safe; do not remove it.
