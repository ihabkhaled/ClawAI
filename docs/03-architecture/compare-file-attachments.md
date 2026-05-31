# Compare / Judge / Critic File Attachments

Slice A of the multi-model-comparison file-attachments work. This document
describes the canonical, end-to-end chain that lets a user attach files to
a parallel-compare run (and the downstream judge / critic passes) so every
selected model receives the attachment in whichever delivery mode it
supports natively. It also lists what is intentionally NOT in Slice A so
later slices can pick up cleanly.

## What Slice A delivers

1. The frontend compare panel exposes a file picker beside the prompt
   composer. The user selects 0..N files already uploaded to
   `claw-file-service`.
2. On submit, the FE sends `fileIds: string[]` alongside the model list and
   prompt to `POST /api/v1/chat-messages/parallel`.
3. `claw-chat-service` runs the parallel orchestration ONCE for the user
   message but resolves attachments PER MODEL so each lane delivers the
   files in whichever mode that model actually supports.
4. Each lane writes a `FileDeliveryEntry[]` into the ASSISTANT message's
   `metadata.fileDelivery` JSON column. The same shape is surfaced on the
   `ParallelModelResponse.attachmentDelivery` field returned to the FE.
5. The judge + critic prompts receive an explicit "Attached files" manifest
   block listing every `fileId`, `filename`, `mimeType` in the run, plus a
   per-model delivery summary line so they can fairly weigh file-grounding
   in their scoring.

## Canonical chain

```
upload          chat                                       chat (per model)
 │                │                                           │
 ▼                ▼                                           ▼
File ─► /chat-messages/parallel ─► ContextAssemblyManager ─► AttachmentResolver ─► Adapter
 │      {fileIds, models, prompt}   - fetch File rows         - mime-classify     - cloud:
 │                                  - fetch chunks            - check model caps    image_url part
 │                                                            - decide mode       - ollama:
 │                                                                                  images:[base64]
 │                                                            - emit              - text-only:
 │                                                              FileDeliveryEntry   inject extracted
 ▼                                                                                  text in system
ChatMessage.metadata.fileDelivery: FileDeliveryEntry[]                              block
ParallelModelResponse.attachmentDelivery: FileDeliveryEntry[]
                                                              ▼
                                                       Judge / Critic
                                                       prompt receives
                                                       "Attached files"
                                                       manifest + per-
                                                       model delivery
                                                       summary
```

## Shared contract (FileDeliveryEntry)

```ts
export enum FileDeliveryMode {
  EXTRACTED_TEXT = 'EXTRACTED_TEXT',
  NATIVE_IMAGE = 'NATIVE_IMAGE',
  OMITTED_NO_VISION = 'OMITTED_NO_VISION',
  OMITTED_UNSUPPORTED = 'OMITTED_UNSUPPORTED',
  TRUNCATED_TEXT = 'TRUNCATED_TEXT',
}

export type FileDeliveryEntry = {
  fileId: string;
  filename: string;
  mimeType: string;
  provider: string;
  model: string;
  mode: FileDeliveryMode;
  reason?: string; // human / i18n key for why OMITTED/TRUNCATED
};
```

The shape is consumed by:

- chat-service (writes to `ChatMessage.metadata.fileDelivery`)
- chat-service (passes per-model summary into judge + critic prompts)
- claw-frontend `ParallelModelResponse.attachmentDelivery` (renders chips)

## Delivery mode decision matrix

| Attachment mime                                          | Model has vision (cloud) | Model is Ollama with vision | Otherwise             |
| -------------------------------------------------------- | ------------------------ | --------------------------- | --------------------- |
| `image/*`                                                | `NATIVE_IMAGE`           | `NATIVE_IMAGE`              | `OMITTED_NO_VISION`   |
| `text/*`                                                 | `EXTRACTED_TEXT`         | `EXTRACTED_TEXT`            | `EXTRACTED_TEXT`      |
| `application/json` / `application/csv` / `text/markdown` | `EXTRACTED_TEXT`         | `EXTRACTED_TEXT`            | `EXTRACTED_TEXT`      |
| `application/pdf`, `application/zip`, binary, oversize   | `OMITTED_UNSUPPORTED`    | `OMITTED_UNSUPPORTED`       | `OMITTED_UNSUPPORTED` |

If extracted text overruns the model's token budget it is cut to fit and
flagged as `TRUNCATED_TEXT` so the user / judge can see the lane received
only a partial file.

## Three critical bugs fixed in Slice A

1. **FileProcessingManager wire-up.** Before Slice A, the compare path
   short-circuited file resolution because the parallel manager never
   instantiated `FileProcessingManager`; only single-message flows did.
   Result: every selected model in compare runs received zero file
   context even when files were attached. Fix: parallel-orchestration now
   resolves attachments per lane via the same manager the single-message
   path uses.
2. **ServiceTokenGuard.** Internal `/internal/files/:id/content` calls
   from chat-service into file-service were 401'ing on signed
   service-token verification because the parallel lane was issuing the
   token with the user's `userId` claim but a stale `iat`. Fix:
   ServiceTokenGuard now accepts the token if and only if `iat` is within
   the configured skew AND the issuing service is allow-listed,
   independent of any user claim.
3. **Cloud-vs-Ollama images.** Cloud adapters expect an `image_url` part
   shape `{ type: 'image_url', image_url: { url: 'data:image/png;base64,..' } }`,
   Ollama expects `{ images: ['<base64>'] }` at the top of the message
   array. The previous adapter layer assumed the cloud shape was
   universal and sent malformed payloads to Ollama, which silently
   ignored the image. Fix: adapters now branch on runtime and emit the
   correct native shape; failures fall through to
   `OMITTED_UNSUPPORTED` instead of breaking the whole lane.

## What is NOT in Slice A

The following are intentionally out-of-scope and tracked for later slices:

- **Native PDF input.** All PDFs are routed to `OMITTED_UNSUPPORTED` in
  Slice A. Slice B will add a PDF text-extraction path + a native-PDF
  adapter for Anthropic / Gemini where the SDKs accept PDFs directly.
- **OCR for image attachments.** Even when an image is delivered as
  `NATIVE_IMAGE`, no OCR is performed for non-vision lanes. Slice B will
  introduce an OCR fall-back so a non-vision model can still receive
  text extracted from an image.
- **ZIP / archive expansion.** Tracked for Slice C.
- **Dedicated `ChatMessageFileDelivery` table.** Slice A keeps the
  records inline on `ChatMessage.metadata` so we can iterate the shape
  without migrations. Slice D extracts to a dedicated table once the
  shape stabilizes and adds proper indexes for "show me all messages
  that received file X".
- **Dedicated RBAC permission `compare.attach_files`.** Slice A piggy-
  backs on the existing `chat.send_message` permission. Slice D adds a
  fine-grained permission so admins can disable compare attachments
  without disabling plain chat attachments.
- **Plan gate on attached-file count / total bytes.** Slice A inherits
  the per-thread file-attachment limits. Slice D wires plan-level caps
  ("Starter: max 1 file/compare run, max 5 MB total").
- **Retention TTL on compare-attached files.** Compare attachments live
  for the same duration as the underlying File row. Slice D introduces
  an explicit retention policy.
- **Prompt-injection wrapper as a standalone module.** Slice A includes
  a small inline guard in the judge prompt that escapes extracted text
  inside a fenced block. Slice D extracts this into a reusable
  prompt-shielding module shared with the agent service.

## i18n keys added (all 9 locales)

- `compare.attachments.{title,addFiles,noneSelected,warning}`
- `compare.delivery.{filesProvided,extractedText,nativeImage,omittedNoVision,omittedUnsupported,truncatedText,tooltip}`
- `models.capabilities` was converted from a flat string to an object:
  `{label,vision,pdf,extractOnly,unsupported}`. The original column-
  header use is now `models.capabilities.label`. Real native
  translations for all 9 locales were added in the same change.

`apps/claw-frontend/src/types/i18n.types.ts` was updated atomically with
the locales per ClawAI's atomic-i18n rule.

---

## Slice D close-out (2026-05-31)

Slice D burns down the four largest items on Slice A's "NOT in scope" list
plus the table-extraction follow-up Slices B/C deferred. It is an
additive, default-OFF rollout: every new path is gated behind a feature
flag so existing installs keep the Slice A behaviour until the operator
opts in.

### 1. `file_delivery_records` table (extracted from JSON)

**Status: DONE (Slice D foundation 1).**

Slice A wrote per-model delivery into `ChatMessage.metadata.fileDelivery`
(JSON column). Slice D extracts that data into a dedicated
`file_delivery_records` Postgres table on chat-service, with proper
indexes for the dominant query "show me every message that received
file X" and "show me every model that ever received file Y".

- **Dual-write window**: chat-service continues writing the JSON column
  AND the new table for the entire Slice D rollout, so existing
  consumers (FE rendering, admin debug tools) see no behavioural
  change. The legacy JSON column is the source of truth for now; the
  table is the secondary copy. After 30 days of zero divergence in the
  drift checker, a follow-up slice flips the read path to the table
  and drops the JSON column. See ADR-054 for the migration plan.
- **Indexes**: `(messageId)`, `(fileId)`, `(threadId)`, plus a partial
  index on `(fileId)` where `deliveryMode = 'NATIVE_IMAGE'` to keep
  the common "vision-capable lanes only" query cheap.
- **Schema**: see `apps/claw-chat-service/prisma/schema.prisma`
  (model `FileDeliveryRecord`). Backfill migration is idempotent and
  re-runnable; failures log to `server-logs` with
  `requestId=slice-d-backfill-<runId>`.

### 2. Native PDF input for Anthropic

**Status: DONE.** Was on Slice A's "NOT in scope" list.

When `ENABLE_ANTHROPIC_NATIVE_PDF=true`, the Anthropic adapter
(`apps/claw-connector-service/src/modules/connectors/managers/adapters/anthropic.adapter.ts`)
forwards PDFs as the native `document` content part instead of routing
them through extracted-text. Per-model `attachmentDelivery` records
the mode as `NATIVE_PDF` so the FE renders the new
`compare.delivery.anthropicNativePdf` badge.

Requires bumping the `anthropic-version` header to `2024-06-01`. The
bump is centralised in
`apps/claw-connector-service/src/modules/connectors/constants/anthropic.constants.ts`
so every Anthropic call (chat + compare + judge + critic) uses the
new version. Backward compatibility for non-PDF requests is
unchanged — only the new content type requires the bumped header.

Default OFF. When OFF, PDFs fall through to the Slice A behaviour
(extracted-text injection in the system block, mode
`EXTRACTED_TEXT`).

### 3. Gemini Files API for large attachments

**Status: DONE.**

When `ENABLE_GEMINI_FILES_API=true` and an attachment is at least
`GEMINI_FILES_API_SIZE_THRESHOLD_BYTES` (default 20 MB), the Gemini
adapter uploads the file to Google's Files API, gets a `file://` URI
back, and references that URI in the request payload. Below the
threshold, inline base64 continues (the Slice A behaviour).

Trade-offs the implementation makes:

- **TTL alignment**. Gemini stores Files API entries for 48 h. We
  cache the URI for 24 h (`GEMINI_FILES_API_TTL_MINUTES=1440`) so a
  cache hit can never serve an expired URI. On the second pass for
  the same file we re-upload rather than risk a 404 at inference.
- **Concurrent uploads**. `GEMINI_CONCURRENT_UPLOADS_LIMIT` (default 3) bounds simultaneous uploads per chat-service container to
  protect against thundering-herd uploads when a compare run spans
  many models.
- **Failure mode**. An upload failure within
  `GEMINI_FILES_API_TIMEOUT_MS` (default 60 s) falls back to inline
  base64 transparently with a `warn`-level log; the user still gets
  a response. The per-model `attachmentDelivery` records the mode
  as `NATIVE_IMAGE` (or whatever the underlying delivery is); the
  Files-API vs inline distinction is logged but not surfaced to the
  user beyond the transient `compare.delivery.geminiUploading`
  status pill.

Default OFF.

### 4. OCR pipeline for images and scanned PDFs

**Status: DONE.** Was on Slice A's "NOT in scope" list.

`claw-file-service` gains a tesseract-backed OCR worker pool. The
pipeline activates when `OCR_ENABLED=true` and one of two conditions
applies:

1. **Scanned PDFs**. After PDF text extraction, if the extracted text
   has fewer than `SCANNED_PDF_CHAR_THRESHOLD` characters (default 100) the PDF is treated as scanned and routed through OCR. Each
   page is rendered to an image, then tesseract extracts text.
2. **Image attachments for text-only models**. The Slice A
   AttachmentResolver marked these as `OMITTED_NO_VISION`. With OCR
   enabled the resolver instead routes them through OCR and emits
   them as `EXTRACTED_TEXT` so the non-vision lane still receives
   the content.

Outputs:

- OCR text is stored on the `File.content` column (same field
  PDF/DOCX text already uses) so context-assembly's existing chunk
  loader picks it up with no changes.
- Tesseract reports a confidence score; results below
  `OCR_CONFIDENCE_MIN` (default 0.5) are tagged on the FileDelivery
  metadata so the judge/critic prompt sees "low-confidence OCR"
  and can weigh it accordingly.
- OCR worker pool: `OCR_WORKER_THREADS` (default 2) parallel
  workers per file-service container. Each worker has its own
  `OCR_TIMEOUT_MS` (default 30 s) per file.
- `OCR_LANGUAGE` selects the tesseract language pack; default
  `eng`. Multi-language uploads use `eng+ara`-style combinations.

The FE shows the transient `compare.delivery.ocrProcessing` pill
while OCR runs and `compare.delivery.ocrFailed` (with retry on the
next attachment use) if the worker times out or returns
zero-confidence output.

Default OFF.

### Status of items previously listed as NOT in scope

| Slice A "NOT" item                               | Status   | Where it landed                             |
| ------------------------------------------------ | -------- | ------------------------------------------- |
| Native PDF input (Anthropic / Gemini)            | DONE     | Slice D, sections 2 + 3 above               |
| OCR for image attachments                        | DONE     | Slice D, section 4 above                    |
| Dedicated `file_delivery_records` table          | DONE     | Slice D, section 1 above (dual-write)       |
| Dedicated RBAC permission `compare.attach_files` | DONE     | Slice C foundation 2                        |
| Plan gate on attached-file count / total bytes   | DONE     | Slice C foundation 2                        |
| Retention TTL on compare-attached files          | DONE     | Slice C foundation 3 (ADR-053)              |
| Prompt-injection wrapper as a standalone module  | DEFERRED | Tracked for the agent-prompt shielding work |
| ZIP / archive expansion                          | DONE     | Slice C foundation 3 (ADR-053)              |

### Env vars added (all default-safe; features OFF by default)

| Env var                                 | Default      | Owner        |
| --------------------------------------- | ------------ | ------------ |
| `ENABLE_ANTHROPIC_NATIVE_PDF`           | `false`      | chat-service |
| `ENABLE_GEMINI_FILES_API`               | `false`      | chat-service |
| `GEMINI_FILES_API_SIZE_THRESHOLD_BYTES` | `20000000`   | chat-service |
| `GEMINI_FILES_API_TIMEOUT_MS`           | `60000`      | chat-service |
| `GEMINI_FILES_API_CACHE_ENABLED`        | `true`       | chat-service |
| `GEMINI_FILES_API_TTL_MINUTES`          | `1440` (24h) | chat-service |
| `GEMINI_CONCURRENT_UPLOADS_LIMIT`       | `3`          | chat-service |
| `OCR_ENABLED`                           | `false`      | file-service |
| `OCR_TIMEOUT_MS`                        | `30000`      | file-service |
| `OCR_CONFIDENCE_MIN`                    | `0.5`        | file-service |
| `OCR_LANGUAGE`                          | `eng`        | file-service |
| `OCR_WORKER_THREADS`                    | `2`          | file-service |
| `SCANNED_PDF_CHAR_THRESHOLD`            | `100`        | file-service |

Plus the centralised `ANTHROPIC_VERSION` constant bumped to
`2024-06-01` in connector-service.

### i18n keys added (all 9 locales, real native translations)

- `compare.delivery.ocrProcessing` — "Extracting text from image…"
- `compare.delivery.ocrFailed` — "Text extraction failed"
- `compare.delivery.geminiUploading` — "Uploading large file to Gemini…"
- `compare.delivery.anthropicNativePdf` — "PDF sent natively to Anthropic"
- `files.lifecycle.uploadStarted` — "Upload starting…"

### Related ADRs

- ADR-054: `file_delivery_records` extraction from JSON (dual-write
  migration plan and read-flip criteria).
- ADR-053: File retention sweeper + ZIP archive guardrails.
- ADR-050: Critic as sibling plan feature of Judge.
