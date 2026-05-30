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
