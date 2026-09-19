# ADR-111: What the model matrix changed about writing files

**Status**: Accepted
**Date**: 2026-09-19

## Context

F4 ran every exposed Ollama Cloud model × every format × 10 files through the
real path: chat → file writer → file-generation → owner download. That was
1,500 writer calls, each file checked as its format
([report](../09-testing/file-model-matrix.md)). F5 then attacked the same
surfaces (`scripts/qa-lab/file-pentest.mjs`). Prose formats were solid. Every
systematic failure was in the plumbing around the model, not the model:

1. **Downloads of non-Latin names returned 500.** file-service wrote the stored
   name raw into `filename="…"`. Node refuses header bytes above U+00FF, so
   every Arabic, Chinese, Japanese or "Wi‑Fi" (U+2011) title failed.
2. **Saved reply instructions broke data files.** A memory "Always end every
   reply with the marker X" put X after the table or the JSON value. It
   caused 33 of the 37 broken CSVs and every broken JSON. A prompt sentence
   ("a sign-off … does not apply to a file") cut it only from 10/10 to 6/10
   on gpt-oss:120b.
3. **Raw CSV from a model has unquoted commas.** "Review logistics
   (time,location,attire)" split one cell into three.
4. **A title file-service refuses failed the whole file.**
   - A quote or a line break in an export title was stored as the filename.
   - `..` ("Loading...") reads as path traversal.
   - `.exe` ("How to run setup.exe") reads as a double extension.
5. **Someone else's file answered 400, not 404.** Nothing leaked, but the
   status was wrong. It is still the same answer as for a missing id, which
   is correct.

## Decision

1. **One header builder.** A filename reaches `Content-Disposition` only
   through `contentDispositionHeader` in `@claw/shared-utilities`: RFC 5987
   `filename*` plus a printable-ASCII fallback
   ([rules/07 §8](../../rules/07-backend-controllers-and-transport.md)).
   `tools/__tests__/content-disposition-helper.test.mjs` fails on a new raw
   site.
2. **Data files get no INSTRUCTION memories.**
   - `fileWriterMemories` drops them for CSV and JSON (`DATA_FILE_FORMATS`).
   - Facts and preferences stay, so "my team is Ana and Bo" still fills an
     owner column.
   - Documents keep every memory, because a sign-off in a PDF is the user's
     own choice.
3. **CSV is written as a Markdown table.** file-generation already turns a
   table into CSV and quotes every cell itself. The model no longer quotes
   anything.
4. **Names are cleaned before they are stored.**
   - `cleanTitle` strips control characters and a trailing extension from an
     export title.
   - `filenameBase` removes what file-service refuses (a run of dots, a dot
     before an executable extension) as well as path and reserved characters.
   - A title can no longer fail a file.
5. **Not found is 404** (`FILE_GENERATION_NOT_FOUND`), for a missing id and
   for someone else's id alike.

## Consequences

- **The FILE_WRITER list is now the measured one** (owner's decision,
  2026-09-20): `gemma4:31b` → `qwen3.5:397b` → `glm-5.1`. Each wrote 100/100
  files, and gemma4:31b was the fastest (3.1 s median).
  - It replaced `gpt-oss:120b` (94/100) as first, and `glm-5.3`, which is not
    exposed and so could never run as a fallback.
  - The seed (`assistant-model-seed.constants.ts`) carries the same order for
    a fresh install, pinned by a test. Changing the list means re-running the
    matrix.
  - The seed only fills an empty role, so an existing deployment keeps its
    rows: production must be changed on the Smart Router page (or by
    `PUT /routing/assistant-models/FILE_WRITER`), which is not done here.
- A user who wants a marker in a CSV cannot get it from a saved instruction.
  They can still ask for it in the message.
- `.com` and `.sys` lose their dot in a filename ("example com guide.pdf"),
  because file-service refuses them there. The title keeps the dot.

## Verified

- The pentest passes 31/31: no token, cross-user, enumeration, bad bodies,
  header and path injection, formula, script and Typst injection, and zip-slip.
- Downloads of an Arabic, a Chinese and a "Wi‑Fi" title returned 200 live;
  before the fix they returned 500.
- The re-run of CSV and JSON across the same 15 models, with the same
  account and marker memory, went from CSV 113/150 to 145/150 and from
  JSON 112/150 to 150/150. Overall that is 1,420/1,500 → 1,490/1,500.
  Details are in the
  [matrix report](../09-testing/file-model-matrix.md).
