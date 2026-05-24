# Stream 03 — R.2 Multimodal Intent Detection

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/03_R2_multimodal_intent_detection.md`

## Mission

Stop pretending the router only sees text. Detect attachments / URLs / file types / streaming/tool-calling needs in the message context and tag the RoutingDecision with one or more `ModalityKind` values + a hinted `WorkflowKind`.

## Detection coverage

| Modality                  | Detector                                                                                                  | WorkflowKind hint        |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| `YOUTUBE_INPUT`           | URL regex: `(youtube\.com/watch|youtu\.be/|youtube\.com/shorts/|youtube\.com/playlist)`                  | `YOUTUBE_TRANSCRIPT`     |
| `PDF_INPUT`               | Attachment MIME `application/pdf` + verb (`summarize|explain|extract|q&a`)                               | `PDF_EXTRACTION`         |
| `VIDEO_INPUT`             | Attachment MIME `video/*` OR extension `.mp4|.mov|.webm|.avi|.mkv`                                       | `VIDEO_ANALYSIS`         |
| `AUDIO_INPUT`             | Attachment MIME `audio/*` OR extension `.wav|.mp3|.m4a|.ogg|.flac`                                       | `AUDIO_TRANSCRIBE`       |
| `SPREADSHEET_INPUT`       | Attachment MIME `application/vnd.ms-excel|application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` OR ext `.xlsx|.xls|.csv|.ods` | `EXTRACT_FIRST` |
| `WEB_INPUT`               | Non-YouTube URL + verb (`summarize|read|fetch|what does X say`)                                          | `SEARCH_FIRST`           |
| `IMAGE_INPUT`             | Attachment MIME `image/*` OR extension `.png|.jpg|.jpeg|.gif|.webp|.bmp`                                 | `IMAGE_ANALYSIS`         |
| `TOOL_CALLING`            | Verb intent: `book|schedule|send email|call function|invoke tool|run command`                            | n/a — filter on capability flag |
| `STREAMING` (client need) | Request header `Accept: text/event-stream` OR query `?stream=true`                                       | n/a — filter on capability flag |
| `EMBEDDING`               | Verb: `embed|vectorize|create embedding|store in vector db|retrieve similar`                             | n/a — separate router branch |

## Files to add (scaffold included)

```
apps/claw-routing-service/src/modules/modality-detection/    (NEW MODULE)
├── modality-detection.module.ts
├── controllers/
│   └── modality-detection.controller.ts                     (POST /routing/detect-modality)
├── services/
│   └── modality-detection.service.ts
├── managers/
│   ├── url-intent.manager.ts                                (YouTube + Web URL)
│   ├── attachment-intent.manager.ts                         (PDF/video/audio/spreadsheet/image)
│   ├── tool-calling-intent.manager.ts
│   ├── streaming-intent.manager.ts
│   └── embedding-intent.manager.ts
├── dto/
│   └── detect-modality.dto.ts
├── types/
│   └── modality-detection.types.ts
├── constants/
│   ├── youtube-url.constants.ts
│   ├── web-url.constants.ts
│   ├── pdf-mime.constants.ts
│   ├── video-mime.constants.ts
│   ├── audio-mime.constants.ts
│   ├── spreadsheet-mime.constants.ts
│   ├── image-mime.constants.ts
│   ├── tool-calling-keywords.constants.ts
│   └── embedding-keywords.constants.ts
└── utilities/
    └── extension-detector.utility.ts
```

## Detection contract

```typescript
export type ModalityDetectionInput = {
  message: string;
  attachments: AttachmentMeta[];
  clientStreamingExpected?: boolean;
};

export type AttachmentMeta = {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ModalityDetectionResult = {
  detectedModalities: ModalityKind[];
  workflowHint?: WorkflowKind;
  workflowConfidence: number;   // 0..1
  reasonTags: string[];
  fileMetadata: AttachmentMeta[];
  urlMetadata: { url: string; kind: 'youtube' | 'web' }[];
  fallback?: { reason: string; tag: string };
};
```

## Acceptance criteria

| # | Test                                                                                                          | Expected                                                       |
|---|----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| 1 | Message contains `https://youtube.com/watch?v=abc123` + "summarize"                                          | `detectedModalities=[TEXT, YOUTUBE_INPUT]`, `workflowHint=YOUTUBE_TRANSCRIPT` |
| 2 | Attachment with mime `application/pdf` + "extract the key points"                                            | `detectedModalities=[TEXT, PDF_INPUT]`, `workflowHint=PDF_EXTRACTION` |
| 3 | Attachment mime `audio/mpeg`                                                                                 | `[TEXT, AUDIO_INPUT]`, `workflowHint=AUDIO_TRANSCRIBE`         |
| 4 | Attachment mime `video/mp4`                                                                                  | `[TEXT, VIDEO_INPUT]`, `workflowHint=VIDEO_ANALYSIS`           |
| 5 | Attachment mime `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`                          | `[TEXT, SPREADSHEET_INPUT]`, `workflowHint=EXTRACT_FIRST`      |
| 6 | URL `https://example.com/blog` + "summarize this article"                                                    | `[TEXT, WEB_INPUT]`, `workflowHint=SEARCH_FIRST`               |
| 7 | Message "book me a meeting tomorrow at 3pm"                                                                  | `[TEXT, TOOL_CALLING]`, no workflowHint                        |
| 8 | Request with `Accept: text/event-stream`                                                                     | `[TEXT, STREAMING]`, no workflowHint                           |
| 9 | Message "embed this paragraph and store in vector db"                                                        | `[TEXT, EMBEDDING]`, no workflowHint                           |
| 10 | Multiple attachments: 1 PDF + 1 audio + 1 image                                                             | `[TEXT, PDF_INPUT, AUDIO_INPUT, IMAGE_INPUT]`; workflowHint=highest-priority (PDF_EXTRACTION) |
| 11 | Malicious URL: `javascript:alert(1)` or non-http scheme                                                     | Stripped from detection; reasonTag `unsafe_url_ignored`        |
| 12 | YouTube URL but `ROUTING_R2_YOUTUBE_DETECTION_ENABLED=false`                                                | Falls through; not flagged                                     |
| 13 | All flags off (`ROUTING_R2_MODALITY_DETECTION_ENABLED=false`)                                              | Endpoint returns empty modalities; hot path uses v1 behavior   |
| 14 | Non-English prompt with file ("الرجاء تلخيص ملف PDF" + PDF attachment)                                     | Detects `PDF_INPUT` regardless of message language             |

## Endpoint contract

```http
POST /api/v1/routing/detect-modality

{
  "message": "Please summarize https://youtu.be/abc123",
  "attachments": [],
  "clientStreamingExpected": false
}

Response 200:
{
  "detectedModalities": ["TEXT", "YOUTUBE_INPUT"],
  "workflowHint": "YOUTUBE_TRANSCRIPT",
  "workflowConfidence": 0.95,
  "reasonTags": ["youtube_url_with_summarize_verb"],
  "fileMetadata": [],
  "urlMetadata": [{"url": "https://youtu.be/abc123", "kind": "youtube"}]
}
```

## Tests

```
apps/claw-routing-service/src/modules/modality-detection/managers/__tests__/url-intent.manager.spec.ts
  - youtube.com/watch detected
  - youtu.be detected
  - youtube.com/shorts detected
  - playlist detected
  - non-youtube URL with summarize verb → web_input
  - javascript: URL stripped
  - data: URL stripped

apps/claw-routing-service/src/modules/modality-detection/managers/__tests__/attachment-intent.manager.spec.ts
  - PDF + summarize verb → PDF_EXTRACTION
  - PDF without verb → PDF_INPUT only (no workflow hint)
  - audio/mp3 → AUDIO_TRANSCRIBE
  - video/mp4 → VIDEO_ANALYSIS
  - .xlsx mime → SPREADSHEET_INPUT
  - .png mime → IMAGE_INPUT
  - multiple attachments → multiple modalities

qa/test-routing-r2-modality-detection.sh
  - Hit POST /routing/detect-modality with each MIME type
  - Assert response shape
```

## Wiring with Stream 04 (workflow orchestrator)

After this stream is wired, `RoutingManager.handleAuto()` calls:

```typescript
const modalityResult = await this.modalityDetectionService.detect({
  message: context.message,
  attachments: context.attachments,
});

if (modalityResult.workflowHint && workflowsEnabled(modalityResult.workflowHint)) {
  return this.workflowOrchestratorManager.orchestrate({
    workflow: modalityResult.workflowHint,
    context,
    modalityResult,
  });
}
// otherwise fall through to existing AUTO pipeline
```

## Rollback

`ROUTING_R2_MODALITY_DETECTION_ENABLED=false` → endpoint returns empty; hot path unaffected. Per-modality flags allow partial activation (e.g. enable YouTube detection but not video).

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | False-positive URL detection (e.g. `youtube.com.malicious.io`) | Strict regex anchored at host start; only valid scheme `https?:` |
| 2 | Attachment metadata not passed by chat-service in `RoutingContext` | **Blocker B1** in master plan — chat-service change required first |
| 3 | Detection adds latency to hot path | Detector is pure (no I/O); regex + array scans; <1ms total |
| 4 | Workflow hint suggested but workflow disabled | Hot path falls through to v1 routing; reasonTag `workflow_disabled_fallthrough` |
