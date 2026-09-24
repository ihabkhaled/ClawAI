# File chat matrix (F6) — 2026-09-25

"The AI doesn't generate files", measured the way users ask: a plain chat
send, in the words a user types, with a model picked in the composer or in
AUTO. Runbook: [`skills/run-the-file-model-matrix.md`](../../skills/run-the-file-model-matrix.md)
(chat lane). Decisions: [ADR-119](../13-adr/adr-119-file-and-image-requests-in-every-routing-mode.md).

## Method

- **Harness:** `scripts/qa-lab/file-chat-matrix.mjs` against `https://claw.local`
  (dev stack). One run = one thread, one send, the reply polled, the file
  downloaded through the owner-only route and checked as its format
  (`file-matrix-checks.mjs`); IMAGE passes when an image generation comes back.
- **Phrasings (4 per format):** English, Arabic (`اعمل لي ملف PDF…`,
  `اعمل لي عرض تقديمي…`, `ارسم لي صورة…`), terse (`xlsx budget tracker`,
  `json file with 3 users…`), French/Spanish.
- **Models (31):** 14 Ollama Cloud (no credit), 16 Gemini text models and
  OpenRouter `qwen/qwen3.8-27b:free`. The composer marks the Gemini models
  "Uses credit"; the admin account paid for them. `kimi-k3` was left out (priced).
- **Account:** admin (PAYG credit available), plus a fresh free-tier user.

## Before

| Lane                               | Result   | What happened                                                                                                                     |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Model picked (19 models, PDF+XLSX) | **0/38** | Every model answered in text: pasted tables, "I can't create files", a Python script, raw `%PDF-1.4` in a code block, a fake link |
| Model picked (14 more, PDF Arabic) | **0/14** | Same; the local model was refused (not exposed)                                                                                   |
| AUTO (10 formats × 4 phrasings)    | 32/40    | Misses: Arabic presentation, Arabic TXT, Arabic MD, English and Spanish Word, three JSON phrasings — all answered as chat text    |

## After the first fix (routing in every mode) — 248 runs

**208/248.** PDF 32/32 · XLSX 32/32 · DOCX 30/30 · ZIP 16/16 · MD 15/16 ·
TXT 15/16 · CSV 27/30 · JSON 21/30 · PPTX 20/30 · IMAGE 0/16.

The 40 failures grouped into:

| Cause                                               | Runs | Fix                                                       |
| --------------------------------------------------- | ---: | --------------------------------------------------------- |
| Image request while a text model is picked          |   16 | image detection in every mode; Arabic image phrases       |
| Arabic "عرض تقديمي" not a PPTX word in chat-service |    8 | added to `FILE_FORMAT_KEYWORDS` (and `مستند` → DOCX)      |
| "json file with 3 users…" (no verb) stayed chat     |    8 | `<format> file with/of/for…` opening a message is a file  |
| Gemini-hosted gemma put `<thought>` in the file     |    2 | `stripWriterReasoning` (12 files had it, 2 failed checks) |
| Pipe table with no separator row → one-column CSV   |    1 | `repairPipeTables` in file-generation                     |
| Credit check outage / exposure 403 (transient)      |    3 | none — passed on retest                                   |
| JSON wrapped in text; TXT poem under 80 chars       |    2 | none — passed on retest                                   |

## Retest after all fixes

| Lane                                                                                        | Result                                                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Every failing combo above (41 runs)                                                         | **33/41**; all 8 misses were the Arabic image prompt → Arabic phrases added → **8/8** |
| AUTO regression, 10 formats × Arabic + terse (20 runs)                                      | **20/20**                                                                             |
| Free-tier user: manual PDF (Arabic), manual XLSX, AUTO CSV                                  | **3/3**, each written by the picked model                                             |
| LOW_LATENCY / HIGH_REASONING / COST_SAVER file request                                      | 3/3 files                                                                             |
| Manual "stays chat": rhyme, markdown formatting, html snippet, "what is a pdf", "zip codes" | 5/5 chat                                                                              |
| Browser (Playwright, 1440 + 390 wide): GPT oss:20b picked, Arabic presentation              | PPTX card, download 118,753 B, `PK` magic, written by `gpt-oss:20b`                   |

## Not run

- **Local Ollama models:** `ollama-service` is not running in this dev stack
  (container created, never started). LOCAL_ONLY routes a file request to
  file generation and refuses hosted writers, then ends with "No file content
  provider could generate the requested file" — correct for privacy, but the
  local-writer success path was not exercised.
- **Compare / consensus / escalation labs:** not in scope; they are multi-model
  text lanes.
- **Production:** not deployed or touched.
