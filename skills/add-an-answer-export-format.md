# Add an answer export format

Use when a new format goes into the "Download as" menu on chat answers
(for example `.xlsx`, `.pptx`, `.csv` or `.zip`). Background:
[ADR-105](../docs/13-adr/adr-105-answer-export-through-the-file-pipeline.md).

## Decide where it is built

- **In the browser** if it is only the answer's text rearranged, like `.md` or
  `.txt`. It needs no request, no row and no expiry. Keep any library out of
  the chat bundle ([rules/47](../rules/47-client-bundle-weight-and-barrel-boundaries.md)).
  A browser format that needs a library is a server format.
- **On the server** for anything binary or structured (docx, pdf, xlsx, pptx,
  zip). The download then gets ADR-104's owner-only link, one-hour expiry and
  free rebuild automatically.

## Server format (file-generation-service)

1. Add the value to `enum FileFormat` in `prisma/schema.prisma`, and add a
   migration: `npx prisma migrate dev --name add_<fmt>_format`. **Every schema
   change ships a migration**
   ([rules/52](../rules/52-every-schema-ships-a-migration.md)); production
   once had no tables at all because this was skipped.
2. Add it to `FORMAT_TO_MIME_TYPE` and `FORMAT_TO_EXTENSION` in
   `src/common/constants/file-generation.constants.ts`.
3. Teach `FileExecutionManager.convert` to produce it, with a spec that checks
   the output's **magic bytes** (`%PDF-`, `PK\x03\x04`, …), not only that it
   ran.
4. `exportFileSchema` takes `z.nativeEnum(FileFormat)`, so the DTO needs no
   change. If the new format's input can be bigger, raise the bound and keep
   `http.constants.spec.ts` green
   ([rules/11 §8](../rules/11-dtos-and-validation.md)).

## Menu entry (claw-frontend)

1. Add the value to `enums/answer-export-format.enum.ts`, using the same string
   as the Prisma enum.
2. Add an option to `ANSWER_EXPORT_OPTIONS` in
   `constants/answer-export.constants.ts`, with `extension`,
   `labelKey: 'chat.exportFormats.<ext>'` and `inBrowser`.
3. Add `chat.exportFormats.<ext>` to `types/i18n.types.ts` and to **all 13
   locales**, as real translations. A label identical to English fails the
   completeness test unless it is a proper name, like "PDF (.pdf)".
4. A browser format also needs a branch in `use-answer-export.ts` and a
   utility test.

## Prove it

- The unit tests: `answer-export.test.tsx` (the menu lists the option) and the
  service's converter spec.
- **Live**: log in, open a thread with a long answer, and download the new
  format with Playwright.
  - Close the menu and wait about 400 ms between downloads. The menu ignores a
    click while it is closing.
  - Check the saved file's magic bytes, and extract its text to confirm
    nothing was cut. For PDFs, `pypdf` gives a word count.
- **Size**: export an answer of about 199k characters. It must return 201 and
  complete. A 3 MB body must return 413, not 500.
