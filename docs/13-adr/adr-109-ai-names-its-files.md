# ADR-109: The AI names its files, from its own title

**Status**: Accepted
**Date**: 2026-09-19

## Context

Every model-written file was called `generated-<ms>.<ext>`, with no title and
no description. The user chose "AI names it". Two options:

- a second model call per file to produce a name, which adds cost and latency
  and is one more thing that can fail;
- asking the file writer, which already runs, to open with a title.

Download names also lost every non-Latin letter. `safeDownloadFilename` keeps
only `[A-Za-z0-9._ -]`, so an Arabic or Chinese title became dashes.

## Decision

1. **The writer names the file.** For Markdown formats (PDF, DOCX, HTML, MD,
   PPTX, XLSX, ZIP), `fileWriterSystemPrompt` asks for one `#` title "in plain
   words … a title, not a filename", then a one-sentence summary.
2. **file-generation derives the identity** in `deriveFileIdentity`:
   - **title**: the first heading, cleaned by `humanTitle`. That drops a
     trailing file extension, and turns underscores into spaces when the
     heading has no spaces.
   - **description**: the first paragraph, clipped at a word boundary to 240
     characters.
   - **title fallback** (no heading, or CSV/JSON/TXT): the request minus its
     opening filler ("make me an Excel spreadsheet listing 5 fruits" →
     "Listing 5 fruits").
   - **filename**: the title with only what file systems refuse removed
     (path separators, `:*?"<>|`, control characters). Letters of every
     script are kept, clipped to 80 characters.

   Title and description are stored on the row (migration
   `20260919190000_add_file_title_description`). Exports keep the title the
   user gave.

3. **Downloads carry the real name.** `Content-Disposition` has an ASCII
   `filename=` fallback and an RFC 5987 `filename*=UTF-8''…` with
   `'()*` encoded, so no character can end the header early.
4. **The chat card** shows the title, the description (two lines, `dir="auto"`)
   and the filename. Model text is rendered as text, never markup.

## Consequences

- There is no extra model call and no extra latency.
- The name is only as good as the model's title. When the model writes none,
  the request supplies it.
- Old rows have a null title and description; the card shows the filename.

## Verified live (2026-09-19)

- The first run exposed a real case: gpt-oss:120b titled a PDF
  `Backend_Engineer_Onboarding_Checklist.pdf`, and the download became
  `….pdf.pdf`. The prompt wording and `humanTitle` fix it. The same request
  then gave `Backend Engineer Onboarding Checklist.pdf`, with that title and
  the model's own one-sentence description.
- The chat card showed the title, the description and
  "…Checklist.pdf · PDF · 87.0 KB · Available for 58 min".
- Tests: file-generation 177 (identity, `humanTitle`, request titles,
  filenames including traversal and header injection, RFC 5987); chat 1973;
  frontend 3609 (the card, including markup-as-text and RTL).
