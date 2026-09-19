# Run the file-model matrix

Use this skill when you need to know which models can write which file formats:

- before changing the admin's FILE_WRITER list;
- after changing `fileWriterSystemPrompt` or any renderer in
  file-generation-service;
- when a user reports "the file came out broken".

Background: [ADR-107](../docs/13-adr/adr-107-one-markdown-parser-typst-pdf.md) and
[ADR-108](../docs/13-adr/adr-108-spreadsheets-decks-and-bundles.md) cover the formats.
[ADR-109](../docs/13-adr/adr-109-ai-names-its-files.md) covers names.
The last full run is
[docs/09-testing/file-model-matrix.md](../docs/09-testing/file-model-matrix.md).

## What it measures

One run is one real file, end to end:

1. A chat send asking for the format in the words a user would use.
2. Chat detects the format.
3. The file writer writes the content.
4. file-generation renders it.
5. The owner-only download returns the bytes.
6. The bytes are checked as that format:
   - PDF: header and trailer.
   - DOCX: paragraphs.
   - XLSX: rows, and no formulas.
   - PPTX: at least 2 slides.
   - ZIP: entries, and no `..` paths.
   - JSON: parses.
   - CSV: rectangular.
   - HTML: a whole document, and no script.
   - MD: has a heading.
   - TXT: has length.
7. The file must carry a real title, not `generated-…` (ADR-109).

A run passes only if the **model under test** wrote the file. When the writer
falls back to another candidate, that run counts as a failure of the model
under test, not a success.

## Run it

Prerequisites:

- The stack is up. `https://claw.local` answers.
- You have an **admin** account, because the runner edits FILE_WRITER.

List the exposed Ollama Cloud models:

```bash
docker exec claw-pg-connector sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select model_key from connector_models where provider='"'"'OLLAMA'"'"' and exposure='"'"'EXPOSED'"'"' and lifecycle='"'"'ACTIVE'"'"' order by 1"'
```

Run the matrix:

```bash
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
node scripts/qa-lab/file-model-matrix.mjs --models=gpt-oss:120b,kimi-k3 \
  --runs=10 --concurrency=5 --out=scripts/qa-lab/results/FILEMATRIX-<date>
```

- **Cost.** `models × formats × runs` writer calls. There are no router calls:
  the send names provider `FILE_GENERATION` in manual mode. The full run is
  15 × 10 × 10 = 1,500 calls, about 2–3 hours.
- **What gets written.** `results.jsonl` (one line per run), `summary.json`,
  `report.md`, and `failures/` (every file that failed a check).
- **Resume.** Re-run with the same `--out`. Finished runs are skipped.

## Things that will bite you

- **The writer is global.** The runner replaces the FILE_WRITER list with one
  model at a time and restores the original in `finally`, including after
  Ctrl+C. A crash could still leave it changed. The original is saved as
  `file-writer-original.json`; put it back with
  `PUT /routing/assistant-models/FILE_WRITER`.
- **Wait out the cache.** Chat caches that list for 60 s, so the runner waits
  65 s after each switch. In prod there are 4 chat replicas, each with its own
  cache. Run the matrix locally, not against prod.
- **Delete threads.** Every run's thread is deleted afterwards. Otherwise
  1,500 threads bury the admin's sidebar.
- **Use an admin account.** Admins are never refused by the daily file
  allowance (ADR-110). On a Free account the matrix stops after 15 files.
- **Do not disable TLS.** Trust the mkcert CA with `NODE_EXTRA_CA_CERTS`.
  Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`.

The pure checks and scoring live in `scripts/qa-lab/file-matrix-checks.mjs`,
tested by `tools/__tests__/file-matrix-checks.test.mjs`. Add a rule there,
with a test, before trusting a new failure category.

## The security pass (F5)

`scripts/qa-lab/file-pentest.mjs` attacks the file surfaces on a live stack.
It spends no model calls (exports are free), so it can run beside the matrix.
It creates its own second user for the cross-user cases.

```bash
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…     # an admin
node scripts/qa-lab/file-pentest.mjs         # exits 1 on any miss
```

It covers:

- **No token:** every route, including the download, answers 401.
- **Another user's file:** refused, and it must look exactly like a missing
  one, so ids cannot be enumerated. That includes swapping in an asset id the
  attacker owns.
- **Bad bodies:** malformed JSON is 400 and a body over 8 MB is 413, never a
  500 (TD-032).
- **Names:** a title cannot add a header or carry a path, and an Arabic title
  still downloads.
- **Content cannot execute:**
  - CSV formula cells are neutralised.
  - XLSX never writes `<f>`.
  - HTML has no script, event handler or `javascript:` link.
  - Typst source stays text.
  - ZIP entries cannot escape the archive.
