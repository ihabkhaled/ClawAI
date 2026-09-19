# ADR-103: File requests need a file word, file writers are admin-managed, and file jobs are owner-only

**Status**: Accepted
**Date**: 2026-09-19

## Context

Production, 2026-09-19:

- **A false positive.** "can you re-write normally text for google docs, not
  in markdown" went to FILE_GENERATION. The keyword rule matched the substring
  "write" plus "markdown", ignoring the negation.
- **"The selected model is not available".** Three hard-coded writer models
  (`claude-sonnet-4`, `gpt-4o-mini`, `gemini-2.5-flash`) were refused by the
  exposure gate because the admin had not exposed them.
- **The router was never named.** The UI showed only the answering model, so a
  reply that `gpt-oss:120b` (Ollama Cloud) routed to `gpt-5.1` read as if
  OpenAI had routed it. The cloud router did not record which chain model
  decided.
- **An audit found three holes in the file service:**
  - `POST /file-generations/:id/retry` had no owner check;
  - `GET /file-generations/:id/events` was `@Public()`;
  - every `/internal/file-generations/*` route was `@Public()` with no guard.

## Decision

1. **Intent** (`detectFileIntent`, routing-service) is table-tested, 41 cases.
   - It uses whole words only, and a format word inside "not / no / without
     …" does not count.
   - A how/what/why question is never a file request unless it asks for
     something "for me".
   - A file request needs one of:
     - a phrase ("save as", "export to", "as a file");
     - a literal extension;
     - a STRONG word (pdf, docx, xlsx, slides, file…) with a create or
       delivery verb;
     - a SOFT word (markdown, docs, report…) with a delivery verb (download,
       export, save, attach).
   - Everything else is answered in chat, and any answer can be exported
     (F2).
2. **File writers** are an assistant-model role, `FILE_WRITER`, on the Smart
   Router "Assistant models" tab.
   - Seeded with the Ollama Cloud models `gpt-oss:120b`, `glm-5.3` and
     `gemma4:31b`, with an 8k output budget. Up to 32k is accepted.
   - chat-service reads the list over the service-token internal route, and
     tries it before any local model. There are no hard-coded providers.
   - Seeding is per role, so a new role seeds even when an older role is
     configured.
3. **Router disclosure.** The cloud router records the chain model whose
   decision was used (`routerModel = PROVIDER/model`). Every AUTO answer shows
   "Routed by X (provider) → answered by Y", in 13 locales.
4. **Owner-only file jobs:**
   - retry checks the owner (`retryGenerationForUser`);
   - the events stream is behind `FileGenerationOwnerGuard`, which refuses
     another user before a stream opens;
   - the frontend moved from `EventSource`, which cannot send a session, to
     the authenticated `connectSse`;
   - the internal routes need the service token, and chat sends it.

## Verified live (2026-09-19)

| Case                                          | Result                                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| "re-write … for google docs, not in markdown" | chat answer, not a file                                      |
| "generate a pdf with …"                       | PDF COMPLETED, written by `gpt-oss:120b`                     |
| AUTO answer UI                                | "Routed by glm-5.2 (Ollama Cloud) → answered by gpt-4o-mini" |
| events without auth / owner / other user      | 401 / 200 / 400                                              |
| retry and GET by another user                 | 400 / 400                                                    |
| internal route without the service token      | 401                                                          |
