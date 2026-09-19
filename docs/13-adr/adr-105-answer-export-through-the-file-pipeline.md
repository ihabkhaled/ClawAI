# ADR-105: Any AI answer exports as a file through the file pipeline, with no model call

**Status**: Accepted
**Date**: 2026-09-19

## Context

- **An answer could only be copied.** A user who asked for Markdown had to copy
  it into an editor to keep it. They asked to download any answer as `.md`,
  `.txt`, `.docx`, `.pdf` and more, and to read a long answer in a bigger view,
  rendered or as raw Markdown.
- **The file pipeline already existed.** file-generation-service turns text
  into TXT, MD, PDF, DOCX, CSV, JSON and HTML. It stores the result behind the
  owner-only, one-hour link from [ADR-104](adr-104-expiring-owner-only-file-downloads.md).
  Until now, only a model's output reached it.
- **The transport was smaller than the contract.** The service used Express's
  default JSON limit of 100 kB, but its DTOs allowed 10M characters of content.
  Every file or export over about 100k characters failed in body-parser before
  validation ran. The error filter then reported that 413 as a **500**.
- **The prompt bound was smaller than the caller's.** A file request's prompt is
  the user's whole chat message, which chat-service accepts up to 100,000
  characters. file-generation refused prompts over **4,000**, so every longer
  file request failed. That failure came _after_ the model had already written
  the file.

## Decision

1. **The browser builds text formats.** `.md` saves the answer as it is.
   `.txt` saves it as readable text: headings, emphasis and table pipes are
   removed, list bullets stay, and a link keeps its URL in brackets. The answer
   is already on the page, so no request is made.
2. **The file service converts document formats.** HTML, DOCX and PDF go
   through `POST /api/v1/file-generations/export` with `{content, format, title?}`:
   - `format` is `z.nativeEnum(FileFormat)`, never a free string;
   - `content` is limited to 200,000 characters, and `title` to 120.
3. **An export never calls a model.** An export is recorded as a generation
   with `provider: 'EXPORT'` and `model: 'none'`, so it costs no tokens and
   deducts nothing. It is then downloaded through ADR-104's owner-only link,
   polled for at most 30 s. An expired export can be rebuilt for free, like any
   generated file.
4. **The filename comes from the answer.** It is the first heading, or else the
   first line, up to 60 characters. Invalid filename characters and control
   characters are removed, and so are trailing `.,;!-` and spaces: Windows
   refuses a name that ends in a dot or space, and a first line often ends
   mid-sentence. AI-written names are F3.
5. **An expand view on every answer.** A dialog shows the answer rendered or
   as raw Markdown, and each view has a copy button.
6. **The transport must carry the contract**
   ([rules/11 §8](../../rules/11-dtos-and-validation.md)). The service's JSON
   limit is `JSON_BODY_LIMIT_BYTES` (8 MB), and a spec checks that it holds the
   largest request any DTO allows at six bytes per character (the size of a
   `\uXXXX` escape). The DTO limits are:
   - prompt: 100,000 characters, the same as chat-service's message limit;
   - model-written content: 1,000,000 characters;
   - export content: 200,000 characters.

   Body-parser's own 4xx errors now reach the caller as 400, 413 or 415.
   Anything else is still a 500 and hides its message.

## Alternatives rejected

- **Build DOCX and PDF in the browser.** That would ship a document library in
  the chat bundle to every visitor
  ([rules/47](../../rules/47-client-bundle-weight-and-barrel-boundaries.md)),
  and would duplicate conversions the service already owns and tests.
- **A separate export endpoint with its own storage.** A second place would
  hold user files with its own expiry and its own access check. Reusing the
  generation row gives exports ADR-104's expiry, owner-only access and rebuild
  for free.
- **Raise only the body limit.** A limit that is bigger now but not tied to the
  DTOs would drift again. The spec ties the two together.

## Consequences

- An export is a `file_generations` row, so it appears wherever generations are
  listed. Plan limits on files come in F3; until then, exports count against
  nothing.
- A menu item clicked while the menu is still closing (about 150 ms) does
  nothing. An e2e test must wait for the menu to close before reopening it.
- The other 16 services' error filters still turn body-parser 4xx errors into
  500s — [TD-032](../14-risk-debt/technical-debt.md).

## Verified live (2026-09-19)

| Case                                         | Result                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| browser: md, txt, html, docx, pdf            | all saved; `%PDF-1.3`, `PK` zip with `word/document.xml`, doctype   |
| expand dialog                                | rendered and raw tabs read back the answer                          |
| export of 110k / 150k / 199k characters      | 201 (500 before), completed in about 150 ms                         |
| 199k-character PDF                           | 39 pages, all 39,800 words extracted — nothing truncated            |
| 250k characters / 3 MB body / malformed JSON | 400 / 413 / 400 (all 500 before)                                    |
| internal generate: 5,000 / 100k-char prompt  | 201 / 201 (400 before)                                              |
| internal generate: 900k-char content         | 201, completed                                                      |
| internal generate: format `MARKDOWN`         | 400 (500 from Prisma before)                                        |
| download headers                             | attachment, `private, no-store`, `nosniff`; no `storageKey` in JSON |
