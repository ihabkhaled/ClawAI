# File-model matrix (F4) — 2026-09-19

Which Ollama Cloud model writes which file format, measured with real files.
Runbook: [`skills/run-the-file-model-matrix.md`](../../skills/run-the-file-model-matrix.md).
Decisions it forced: [ADR-111](../13-adr/adr-111-file-writer-hardening-from-the-model-matrix.md).

## Method

- **Scope:** 15 exposed Ollama Cloud models × 10 formats × 10 runs. That is
  1,500 writer calls, plus a 300-call CSV/JSON re-run after the fixes.
- **Path:** each run is one real file. A chat send in the user's words goes
  to the file writer, then file-generation's renderer, then the owner-only
  download.
- **Checks:** the bytes are checked as the format:
  - PDF has a header and trailer.
  - DOCX has paragraphs.
  - XLSX has rows and no formulas.
  - PPTX has 2 or more slides.
  - ZIP entries are safe.
  - JSON parses and is not wrapped text.
  - CSV is rectangular.
  - HTML is a whole document with no script.
  - MD has a heading.
  - TXT has length.
  - The file has a real title.
- **Isolation:** the FILE_WRITER list was set to one model at a time, so a run
  passes only if that model wrote the file.
- **Account:** the local admin account. It carries a QA fixture memory,
  "Always end every reply with the exact marker BUTTERFLY-4408". It stayed in
  place on purpose: it is the case a real user's saved sign-off produces.
- **Latency:** from send to COMPLETED, polled every 2.5–3 s, so it is
  accurate to about 3 s.

## Results

**Overall: 1,420/1,500 (94.7%) before the fixes, 1,490/1,500 (99.3%) after.**
The prose formats were not re-run; the CSV and JSON columns were.

### Before the fixes (full run)

| Model                |   PDF |  DOCX |  HTML |    MD |   TXT |   CSV |  JSON |  XLSX |  PPTX |   ZIP |
| -------------------- | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: | ----: |
| gemma4:31b           | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| glm-5.1              | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| qwen3.5:397b         | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| kimi-k3              | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  9/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| minimax-m3           | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  9/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| glm-5.2              | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  8/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| mistral-large-3:675b | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  8/10 | 10/10 | 10/10 | 10/10 |
| nemotron-3-nano:30b  | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  8/10 | 10/10 | 10/10 | 10/10 |
| minimax-m2.7         | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  9/10 |  8/10 | 10/10 | 10/10 |  9/10 |
| gpt-oss:120b         | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  4/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| gpt-oss:20b          | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  4/10 |  8/10 | 10/10 | 10/10 | 10/10 |
| kimi-k2.6            | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  3/10 |  8/10 | 10/10 | 10/10 | 10/10 |
| kimi-k2.7-code       | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |  5/10 |  1/10 | 10/10 | 10/10 | 10/10 |
| nemotron-3-ultra     | 10/10 | 10/10 | 10/10 |  9/10 | 10/10 |  6/10 |  1/10 | 10/10 | 10/10 | 10/10 |
| nemotron-3-super     | 10/10 |  8/10 | 10/10 |  9/10 | 10/10 |  6/10 |  0/10 | 10/10 | 10/10 | 10/10 |

- **CSV:** 113/150. 33 of the 37 broken files ended with the memory's marker
  line. The other 4 had commas left unquoted inside a cell.
- **JSON:** 112/150. Every failure was valid JSON followed by the marker, or a
  code fence followed by the marker, which file-generation then wrapped as
  text.
- **The rest:** 1,195/1,200. The misses were:
  - nemotron-3-super: 2 DOCX with under 3 paragraphs, and 1 MD with no heading.
  - nemotron-3-ultra: 1 MD with no reply within 240 s.
  - minimax-m2.7: 1 ZIP with no reply within 240 s.

### CSV and JSON after the fixes (re-run)

The fixes were:

- No INSTRUCTION memories in CSV and JSON writers.
- CSV written as a Markdown table.

**CSV 145/150** (was 113) · **JSON 150/150** (was 112). The account and its
marker memory were unchanged.

| Model                                                                                                                                                          |        CSV |       JSON |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------: | ---------: |
| gemma4:31b, glm-5.1, glm-5.2, gpt-oss:120b, gpt-oss:20b, kimi-k2.6, kimi-k3, minimax-m3, nemotron-3-nano:30b, nemotron-3-super, nemotron-3-ultra, qwen3.5:397b | 10/10 each | 10/10 each |
| minimax-m2.7                                                                                                                                                   |       9/10 |      10/10 |
| mistral-large-3:675b                                                                                                                                           |       9/10 |      10/10 |
| kimi-k2.7-code                                                                                                                                                 |       8/10 |      10/10 |

The remaining 5 are the model's own mistakes:

- 2 are a single-column "table".
- 2 have a row with the wrong number of cells.
- 1 has 5 ragged rows.

### Speed (full run, all formats)

| Model                |    Pass | Median |    p90 |
| -------------------- | ------: | -----: | -----: |
| gemma4:31b           | 100/100 |  3.1 s |  6.1 s |
| nemotron-3-nano:30b  |  98/100 |  3.1 s |  6.1 s |
| gpt-oss:120b         |  94/100 |  6.1 s |  9.1 s |
| qwen3.5:397b         | 100/100 |  6.1 s | 15.2 s |
| glm-5.2              |  98/100 |  6.1 s | 18.2 s |
| minimax-m3           |  99/100 |  6.2 s | 18.2 s |
| kimi-k2.7-code       |  86/100 |  6.1 s | 12.1 s |
| nemotron-3-super     |  83/100 |  6.1 s | 12.2 s |
| kimi-k3              |  99/100 |  8.6 s | 15.2 s |
| glm-5.1              | 100/100 |  9.1 s | 12.2 s |
| mistral-large-3:675b |  98/100 | 12.1 s | 21.2 s |
| gpt-oss:20b          |  92/100 | 18.3 s | 36.4 s |
| kimi-k2.6            |  91/100 | 21.3 s | 51.6 s |
| minimax-m2.7         |  96/100 | 21.3 s | 57.6 s |
| nemotron-3-ultra     |  86/100 | 30.4 s | 66.7 s |

## What it means for the FILE_WRITER list

**Changed on 2026-09-20 to `gemma4:31b` → `qwen3.5:397b` → `glm-5.1`**, in
the seed and on the local stack. Why:

- Each of the three wrote 100/100 files, and gemma4:31b was the fastest
  (3.1 s median).
- It replaced `gpt-oss:120b` (94/100) as the first choice. gpt-oss:120b is
  100% on CSV and JSON after the fixes, but it was never the strongest.
- It replaced `glm-5.3`, which **is not exposed**: as a fallback it would be
  refused at the exposure gate, so the list effectively had one fallback.
- Verified live: a PDF request was written by `OLLAMA/gemma4:31b` and
  downloaded (200).
- **Production still has the old rows.** The seed only fills an empty role.
  Change it on the Smart Router page.
- **Avoid for data files:** kimi-k2.7-code, nemotron-3-super and
  nemotron-3-ultra. They were the weakest before the fixes, and the slowest
  tail belongs to nemotron-3-ultra.

## Bugs it found (all fixed, ADR-111)

1. **Downloads of non-Latin names returned 500.** An Arabic, Chinese or
   "Wi‑Fi" title made file-service throw ERR_INVALID_CHAR.
2. **A saved reply instruction was written into CSV and JSON files.**
3. **CSV cells with unquoted commas.**
4. **Titles file-service refuses failed the whole file.** A quote, a line
   break, `..` or `.exe` in the title did it. The F5 pentest found this.
5. **A foreign file id answered 400, not 404.** The F5 pentest found this.

The harness also caught its own infrastructure. Editing service source during
the run crashed every dev container, and 134 runs failed with 502. Those runs
are now marked `infra`, are not scored, and are re-run on resume. See the
memory note on shared-package edits.
