# ADR-119: A file or image request is one in every routing mode, and a picked model writes its own file

**Status**: Accepted
**Date**: 2026-09-25

## Context

Users reported "the AI doesn't generate files". A live chat matrix
([report](../09-testing/file-chat-matrix.md)) sent plain requests the way users
type them, across 31 models and 10 formats:

1. **A picked model never made a file: 0/52.** Only `handleAuto` ran file and
   image detection. MANUAL_MODEL — what the composer sends whenever a user
   picks a model — went straight to that model, which pasted a table, wrote a
   Python script, printed raw `%PDF-1.4`, invented a download link, or said it
   "can't create files". LOW_LATENCY, HIGH_REASONING, COST_SAVER, LOCAL_ONLY
   and PRIVACY_FIRST had the same hole. An image request with a text model
   picked failed 16/16.
2. **Intent missed non-English and terse requests.** The tokenizer was
   `[a-z0-9]` only, so an Arabic verb was invisible; chat-service's format
   words used `\b`, which never fires next to Arabic letters, so a routed
   request still became TXT. Arabic "عرض تقديمي" (presentation) → TXT on 8/8
   models; "json file with 3 users…" stayed chat on 8/8.
3. **The file carried the model's reasoning.** Gemini-hosted gemma models
   open with a `<thought>` block. The streaming chat path strips it; the file
   path did not — 12 files shipped it, 2 CSVs were one column of it.
4. **A pipe table without its `|---|` row** was a paragraph to markdown-it, so
   the CSV had one column.

## Decision

1. **routing-service checks for a file or image request before every non-AUTO
   mode handler** (`detectExplicitModeFileRequest`, image first, as in AUTO).
   The decision keeps the user's mode.
   - MANUAL_MODEL adds `fileWriter` (the picked provider/model) to the
     decision and to `message.routed`.
   - LOCAL_ONLY / PRIVACY_FIRST: an image goes to `IMAGE_LOCAL` only.
   - Skipped for Runtime V2 (`RoutingContext.runtimeV2`: an agent's "create a
     README.md file" is a tool call), for a manual image/file provider, and for
     MANUAL_MODEL with no model (AUTO detects on its own).
2. **chat-service orders writers** (`toFileContentCandidates`): the picked
   model, then the admin `FILE_WRITER` list, then local file models.
   LOCAL_ONLY / PRIVACY_FIRST allow local writers only, because the
   `FILE_WRITER` list is hosted. "another / one more" after a file re-routes
   in MANUAL_MODEL too, keeping the pick as writer.
3. **Intent is Unicode-aware and conservative.**
   - `Intl.Segmenter` tokenizer; create/delivery verbs, negations and the word
     "file" in all 13 UI locales; Arabic `مستند`, `تقديمي`, `شرائح`.
   - Words that are also ordinary words or formatting/coding asks stay SOFT
     (`word`, `markdown`, `html`, `docs`, `json`). A bare first word counts
     only for pdf/docx/xlsx/xls/pptx/csv, or as "<format> file with/of/for…".
     One token is never both format and verb ("zip codes").
   - Arabic image phrases are exact (`ارسم لي`, `اعمل لي صورة`…), since the
     image detector matches substrings and "…للصورة" (of the image) is not a
     request.
4. **The writer's `<think>/<thought>` blocks are stripped** before rendering
   (`stripWriterReasoning`, reusing `ThinkingFragmentScanner`).
5. **file-generation repairs a separator-less pipe table** before parsing
   (`repairPipeTables`).

## Consequences

- A picked model's file costs what that model costs; free Ollama Cloud picks
  stay free. If it fails, the admin writers write the file.
- The reply badge still reads `FILE_GENERATION / auto`; the writer is on the
  generation record, not in the badge.
- Without a local runtime, LOCAL_ONLY file requests end with "No file content
  provider could generate the requested file". That is the privacy guarantee
  holding, and it was the only lane not exercised to success.
- New intent words need a "stays in chat" case first (rule 51 §9–12).

## Verified live (2026-09-25, dev)

- Picked-model matrix: 0/52 before → 208/248 after the routing fix. Every
  remaining failing combo passed on retest after fixes 3–5 plus the Arabic
  image phrases.
- AUTO regression 20/20. Free tier 3/3. Other modes 3/3.
- Ambiguous prompts stayed chat 5/5.
- Browser: an Arabic presentation with GPT oss:20b picked gave a valid PPTX
  written by `gpt-oss:20b`.
