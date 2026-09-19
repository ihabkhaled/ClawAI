# ADR-107: Answers render through one Markdown parser, and PDFs are typeset by Typst

**Status**: Accepted
**Date**: 2026-09-19

## Context

F2 ([ADR-105](adr-105-answer-export-through-the-file-pipeline.md)) let any
answer be downloaded as PDF, Word, HTML, CSV or JSON. Checked against real
output, the converters were not good enough to ship:

- **PDF was pdfkit, one line at a time, in Helvetica.** Helvetica has no
  Arabic, Persian, Hindi, Thai, Chinese or Japanese glyphs, so every one of
  those locales got empty boxes. `**bold**`, `| tables |` and code fences were
  printed as raw Markdown.
- **DOCX was one plain paragraph per line.** It had the same raw Markdown, no
  real lists, no tables, and no right-to-left layout.
- **HTML** was correct Markdown, but its title was always "Generated Document"
  and it was always left to right.
- **CSV** passed a Markdown table through with its pipes, and **JSON** wrapped
  it as one string.

## Decision

1. **One parser for every format.** `parseMarkdownDocument` turns markdown-it
   tokens into typed blocks (heading, paragraph, list, code, quote, table,
   rule) with inline marks (bold, italic, code, strike, link, break).
   - Raw HTML is never interpreted.
   - Links keep their target only for `http`, `https` and `mailto`.
   - A code language must look like one (`CODE_LANGUAGE_PATTERN`).
   - Direction is the first letter that has one (`isRightToLeft`), decided per
     block.
2. **PDF is typeset by Typst** (`@myriaddreamin/typst-ts-node-compiler`, an
   in-process native module).
   - It shapes every script, lays out right-to-left text, tables and
     highlighted code, and writes the title into the PDF metadata.
   - It runs in a sandbox with no network and no shell. Its workspace is an
     empty temporary directory, so there is nothing for it to read.
   - **Every piece of answer text enters the Typst source as an escaped string
     literal** (`#"…"`, `typstString`), never as markup. An answer containing
     `#read(...)`, `#import`, `]#set …[` or `$math$` is printed, not run. A spec
     compiles exactly that. This is the whole injection defence; there is no
     second path for text into the source.
3. **DOCX uses real Word structures** built from the same blocks: runs with
   bold, italic, strike and code, hyperlinks, bullet lists, numbered lists that
   restart per list, bordered tables with a shaded header row, shaded code
   blocks, quotes, rules, and `bidi` paragraphs with right-to-left runs. docx
   9.7's bundled declarations are used directly; the hand-written type contract
   for docx is gone.
4. **HTML** takes its `<title>` (escaped) from the first heading or the
   filename, and its `dir` from the text.
5. **CSV/JSON** export the first Markdown table in the answer, including one
   inside a list or quote: CSV with a header row and correct quoting, JSON as
   an array of objects.
6. **Title**: the generation's filename, unless it is a made-up
   `generated-<ms>` name; then the first heading; then "Document".
7. **Fonts**: the service images install `fonts-noto-core` and
   `fonts-noto-cjk`, which cover all 13 app locales. Monospace comes from the
   compiler's embedded DejaVu Sans Mono. Local tests on Windows use its own
   fonts.

## Alternatives rejected

- **Headless Chromium printing the HTML export.** It gives the best
  typography, but adds about 300 MB of browser and 150–300 MB RAM per render,
  needs frequent security updates, and would fetch every image URL in an
  answer from inside our network (SSRF) unless every request were blocked.
  Typst has no network at all.
- **pdfkit with fontkit and a bidi library.** Right-to-left line wrapping and
  mixed-direction text would be ours to get right, line by line. That is the
  failure we are replacing.
- **The Typst CLI in the image.** That means a second binary to pin, a child
  process per render, and no local tests on Windows. The Node binding has
  prebuilt binaries for linux-x64-gnu and win32-x64.

## Consequences

- The image grows by the Noto packages, about 180 MB.
- Compiling is synchronous native code. A typical answer takes a few
  milliseconds, and the 199k-character maximum export stays well under a
  second. The service's event loop is busy for that time.
- An ordered list that starts at 3 still numbers from 1 in Word (a numbering
  definition is per document, not per list). PDF honours the start.
- `pdfkit` and `@types/pdfkit` were removed. `jszip` is a dev dependency for
  reading DOCX in specs; F3b's zip bundles will make it a runtime one.

## Verified (2026-09-19)

- **Specs: 36 render cases.** Block parsing; mark handling; link and code-language
  sanitising; raw HTML kept as text; direction in 7 scripts; titles; string
  escaping; injection compiled for real; a 2,000-paragraph PDF; the DOCX XML
  (`<w:b/>`, `<w:i/>`, `<w:tbl>`, `w:numPr`, `<w:bidi/>`, Consolas, Arabic
  text, no `**` or backticks); HTML title escaping and no script; CSV quoting;
  JSON records.
- **Visual check, Typst probe:**
  - Arabic is shaped and right to left.
  - Devanagari conjuncts are correct.
  - Chinese and Thai render.
  - The table has borders, and the code is highlighted.
