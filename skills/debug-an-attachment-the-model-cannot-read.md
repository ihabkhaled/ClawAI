# Debug an attachment the model says it cannot read

A user attaches a file and the model replies with some version of _"I can't
access the attached PDF"_ or _"the file content isn't extractable in this chat"_.

**Start from the assumption that the model is telling the truth about what it
was given.** It almost always is. The models are not refusing; they are
describing a prompt that contained a placeholder instead of a document. Three
different vendors agreeing that a file is unreadable is a platform finding, not
a vendor finding.

Governing rule: [`rules/42-attachment-understanding.md`](../rules/42-attachment-understanding.md) ·
[ADR-094](../docs/13-adr/adr-094-attachment-text-extraction-pipeline.md)

## The one-minute check

Go straight to the row. Everything else is downstream of it.

```bash
docker exec claw-pg-files psql -U claw -d claw_files -c \
  "select filename, mime_type, ingestion_status, length(extracted_text) as text_len,
          left(coalesce(extraction_error,''), 60) as err
   from files order by created_at desc limit 10;"
```

Read the answer off this table:

| What you see                          | What it means                                                           | Go to  |
| ------------------------------------- | ----------------------------------------------------------------------- | ------ |
| `COMPLETED`, `text_len` > 0           | Extraction worked. The problem is downstream.                           | Step 3 |
| `COMPLETED`, `text_len` empty or null | A row that predates the pipeline, or an extractor that returned nothing | Step 2 |
| `PENDING`, and it is not seconds old  | Extraction never started for this row                                   | Step 1 |
| `PROCESSING`, and it is minutes old   | The worker died mid-run                                                 | Step 1 |
| `FAILED`                              | `err` is the answer. Read it.                                           | Step 2 |

## Step 1 — extraction never ran

This is the original defect and the most likely one to recur, because the
extractor is complete and correct whether or not anything calls it.

```bash
docker logs claw-file-service --since 10m 2>&1 | grep -iE "processFile|extractText|ocr"
```

**No lines at all** means nothing invoked the pipeline. Check that the upload
path you used calls `FilesService.startExtraction`. Three places do:
`uploadFile`, `createInternalFile`, and `healLegacyRowIfNeeded`. A new entry
point that forgets it produces exactly this.

A row stuck at `PROCESSING` for more than `STALE_PROCESSING_TIMEOUT_MS`
(10 minutes) was orphaned by a restart. The retention sweeper closes those out
as `FAILED` on its next tick; it does not retry them.

## Step 2 — extraction ran and produced nothing

Read `extraction_error` first. It carries the real reason, which is the whole
point of storing it: a password-protected PDF and an unsupported format are
different problems with different fixes.

If there is no error and no text, reproduce the parser in isolation against the
stored blob:

```bash
docker exec claw-file-service sh -c \
  "cd /app/apps/claw-file-service && node -e \"
     const {extractTextFromPdf}=require('./dist/common/utilities/pdf-parser.utility.js');
     extractTextFromPdf(require('fs').readFileSync('<storage_path>')).then(r=>
       console.log('chars',r.text.length,'isScanned',r.isScanned));\""
```

A scanned PDF has no text layer. It routes to OCR only when `OCR_ENABLED` is
true — check the running container, not `.env.example`, because they disagree:

```bash
docker exec claw-file-service printenv | grep -E "OCR_|SCANNED_PDF"
```

**A legacy row heals itself.** A file uploaded before the pipeline existed sits
at `COMPLETED` with no text. Attaching it to a message re-extracts that one
file and reports `PROCESSING`. Send the message again a moment later. There is
deliberately no bulk migration — see rule 42 item 10 for why.

## Step 3 — the text exists but the model did not see it

Ask what chat-service was actually handed:

```bash
TOKEN=$(docker exec claw-file-service printenv INTER_SERVICE_AUTH_TOKEN)
docker exec -e TK="$TOKEN" claw-chat-service-1 node -e '
  process.env.NODE_TLS_REJECT_UNAUTHORIZED="0";
  fetch("https://file-service:4006/api/v1/internal/files/<FILE_ID>/content?userId=<USER_ID>",
    {headers:{Authorization:"Service "+process.env.TK}})
    .then(r=>r.json()).then(j=>console.log({
      status:j.ingestionStatus, textLen:j.extractedText?.length ?? 0,
      contentLen:j.content?.length ?? 0, err:j.extractionError}));'
```

`textLen` is what a text model gets. `contentLen` is base64 of the original
bytes and is only for vision models looking at an image. If `textLen` is
healthy and the model still said it could not read the file, the bug is in
`decodeFileContent` or in a caller that reached for `content` instead.

Then check the prompt itself:

```bash
docker logs claw-chat-service-1 --since 5m 2>&1 | grep -iE "fetchFileContents|waitForIngestion"
```

`waitForIngestion: N file(s) still extracting` means the user outran the
extractor. The turn proceeded and the model was told the file was unread, which
is correct behaviour — but if you see it constantly, extraction is too slow for
the deadline rather than broken.

## Step 4 — prove it end to end

Do not trust a single "looks right" answer. Put a value in the file that exists
nowhere else and ask the model to quote it back. A model that can read the
attachment returns the string; one that is bluffing cannot.

```
Q: What reference code does this document list? Quote it verbatim.
   If you cannot read the attached file, say exactly: CANNOT_READ_FILE.
```

That phrasing matters. Without an explicit failure token, a model that received
nothing will often invent a plausible answer rather than admit it, and the test
passes while the pipeline is broken.

## What each format is read with

| Format | Extractor                                                    | Fails when                                               |
| ------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| PDF    | `pdf-parse`, OCR fallback under `SCANNED_PDF_CHAR_THRESHOLD` | encrypted; scanned with `OCR_ENABLED=false`              |
| DOCX   | `mammoth`                                                    | legacy `.doc` is a different format and is not accepted  |
| XLSX   | `ooxml-parser.utility`                                       | legacy `.xls`; values that only exist as formula results |
| PPTX   | `ooxml-parser.utility`                                       | text that lives in an embedded image                     |
| RTF    | `rtf-parser.utility`                                         | embedded objects                                         |
| Images | tesseract, when `OCR_ENABLED`                                | low contrast, unusual fonts, handwriting                 |
| Video  | none by design                                               | always — video has no text; vision models get the bytes  |

## Traps

- **The status column used to lie.** Before ADR-094 it defaulted to `COMPLETED`,
  so every row claimed success. If you are looking at an old database dump,
  `COMPLETED` there means nothing.
- **`content` is not text.** It is base64 of the upload. Reading it as a string
  gives `JVBERi0x...` for a PDF, which is what the models were being shown.
- **`.docx` and `.xlsx` do not route through ZIP expansion.** Only
  `application/zip` does. They are read in memory with their own bounds.
- **Accepting a format is not supporting it.** PPTX was in the upload allowlist
  for months with no extractor. Check `extractText` has a branch, not just that
  the upload succeeded.
