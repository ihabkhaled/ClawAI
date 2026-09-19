# ADR-108: Answers export as spreadsheets, slide decks and zip bundles

**Status**: Accepted
**Date**: 2026-09-19

## Context

The user asked for every common file format: core documents, data, slides, and
code and archives. After [ADR-107](adr-107-one-markdown-parser-typst-pdf.md)
the parsed document already knows an answer's tables, headings and code
blocks. Three formats were still missing, and building them surfaced four bugs
in the model-generated file path:

- **"Make me a spreadsheet" produced a `.txt`.** chat-service matched formats
  by substring, in a fixed order, with no spreadsheet, slide or zip words at
  all. It also turned "password" into a Word file ("word").
- **Every file containing a code block lost everything but that block.**
  `stripCodeBlockWrapper` used a multiline regex that matched the first fence
  anywhere, not only an answer that was entirely one fence.
- **HTML files showed their tags as text.** The writer was told to "output
  HTML", but file-generation renders Markdown with raw HTML escaped.
- **Word and PowerPoint files got the code icon.** Every Office MIME type
  contains "xml" (`openxmlformats`), and the icon check tested for "xml"
  first.

## Decision

1. **XLSX, written directly as SpreadsheetML with `jszip`.**
   - One sheet per table, named after the heading above it (Excel-safe, unique,
     at most 31 characters).
   - The header row is bold and frozen, with an autofilter.
   - Plain numbers are written as numbers. `007` stays text, because a leading
     zero means an id.
   - A right-to-left table becomes a right-to-left sheet.
   - With no tables, the text goes on one sheet.
   - Every text cell is an inline string. The writer cannot emit a formula, so
     a model's `=HYPERLINK(...)` is text.
   - exceljs was rejected: 34 MB of dependencies, several years old, and the
     npm audit service was down that day.
2. **PPTX via `pptxgenjs`.**
   - A title slide, then one slide per heading.
   - More than 9 lines continue on a "(cont.)" slide.
   - Tables and code get their own slides.
   - Right-to-left text is laid out right to left.
3. **ZIP bundle.**
   - `README.md` holds the whole answer.
   - Every code block becomes a file. It is named by the path on the line above
     it, when that path's extension matches the block's language; otherwise
     `snippet-N.<ext>` from the language.
   - Every table becomes `table-N.csv`.
   - Paths from the model are cleaned: no `..`, no absolute paths, no
     backslashes, no leading dot, deduplicated, at most 50 files. Extracting
     the zip cannot write outside its folder (zip-slip).
4. **CSV/formula injection guard.**
   - Every CSV cell (Markdown tables, CSV the model wrote itself, and CSVs
     inside zips) that starts with `= + - @` or a tab or carriage return is
     prefixed with `'`, so spreadsheets show it as text.
   - Plain numbers such as `-12` are left alone.
   - Model-written CSV is parsed with `csv-parse` and written out again,
     instead of passing through.
5. **Chat side.**
   - `detectRequestedFileFormat` matches whole words, including the new
     formats.
   - When several formats are named, the one after "as", "to", "into" or "in"
     wins ("turn this CSV into a spreadsheet" gives XLSX).
   - The file writer gets a per-format instruction
     (`FILE_WRITER_FORMAT_INSTRUCTIONS`). The rich formats are Markdown. XLSX
     asks for tables under sheet headings, PPTX for a `##` heading per slide,
     and ZIP for a path line above each block.
   - `unwrapWholeCodeFence` unwraps only an answer that is one fenced block,
     and never a zip.
6. **Frontend.**
   - "Download as" offers Excel, PowerPoint and Zip, labelled in 13 locales.
   - Office files get their own icons.
   - The public features page lists XLSX, PPTX and ZIP.

## Consequences

- `FileFormat` gains `XLSX`, `PPTX` and `ZIP` (migration
  `20260919180000_add_xlsx_pptx_zip_formats`).
- Dependencies added: `pptxgenjs`, `csv-parse`; `jszip` is now a runtime
  dependency of file-generation-service.
- A code file's name depends on the model writing the path above the block.
  The writer is told to, and the fallback name is still correct by language.

## Verified

- **Unit specs:**
  - file-generation: 40 new cases, 156 total. They cover the formula guard (9
    cells), Excel numbers, text, no `<f>`, frozen header, autofilter, RTL,
    escaping and sheet names; slide splitting and RTL; zip naming, zip-slip
    (7 paths) and deduplication.
  - chat-service: 33 cases, covering formats (18 prompts, including
    "password" and "deckhand"), writer prompts, and fence unwrapping.
  - Frontend: icons.
- **Live:** see the batch's commit and the service guide.
