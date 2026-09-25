---
name: debug-a-video-the-model-cannot-read
summary: A user attached a video and the model says it cannot see or hear it, the file sits in "processing", or no transcript appears — walk the file-service video job (ffmpeg present, probe line, plan limit, transcription reason, frames endpoint) from the row outwards.
task_keywords:
  [
    video,
    video transcript,
    video processing,
    ffmpeg,
    ffprobe,
    video frames,
    thumbnail,
    maxVideoSeconds,
    VIDEO_TOO_LONG_FOR_PLAN,
    video placeholder,
    file.video_process_requested,
    cannot see the video,
  ]
applies_to: [apps/claw-file-service, packages/shared-types]
required_rules:
  [
    42-attachment-understanding,
    37-payg-credit-integrity,
    13-external-library-wrappers-and-adapters,
    21-security-and-secrets,
  ]
required_context: [event-flow-map, service-catalog]
affected_workspaces: [apps/claw-file-service]
required_tests:
  [
    video-processing.manager.spec,
    media-process.utility.spec,
    media-args.utility.spec,
    video-frames.service.spec,
  ]
required_docs: [docs/04-backend/service-guide-file.md, apps/claw-file-service/CLAUDE.md]
validation_lane: cd apps/claw-file-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Debug a video the model cannot read

A user attaches a video and the model answers as if nothing were attached, the
file stays "processing", or the reply says the audio was not transcribed.

**Start from the row, not the model** — the same discipline as
[`debug-an-attachment-the-model-cannot-read.md`](./debug-an-attachment-the-model-cannot-read.md).
The video pipeline (multimodal batch 7) lives entirely in file-service:
[`apps/claw-file-service/CLAUDE.md`](../apps/claw-file-service/CLAUDE.md) ·
[`docs/04-backend/service-guide-file.md`](../docs/04-backend/service-guide-file.md#video-processing-multimodal-batch-7) ·
rule [42 item 15](../rules/42-attachment-understanding.md).

## 1. What does the row say?

```bash
docker exec claw-pg-files psql -U claw -d claw_files -c \
  "select id, filename, ingestion_status, length(extracted_text) as text_len,
          left(coalesce(extraction_error,''), 80) as err,
          extraction_metadata->'media'->>'failureReason' as failure,
          extraction_metadata->'media'->>'audioStatus'  as audio,
          extraction_metadata->'media'->>'durationMs'   as ms
   from files where mime_type like 'video/%' order by created_at desc limit 10;"
```

| What you see                                                                                                       | Meaning                                                              | Go to           |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------- |
| `COMPLETED`, text starts `[Video file:` , no `failure`, recent                                                     | Job queued or running; `ingestion-state` says `PROCESSING`           | 2               |
| same, but `updated_at` > 10 min ago                                                                                | Job lost (restart) or row predates batch 7 — next poll re-queues it  | 2               |
| `COMPLETED`, `err` = "Video processing could not be queued"                                                        | Broker refused the publish                                           | RabbitMQ health |
| `FAILED`, `failure` = `TOOL_UNAVAILABLE`                                                                           | ffmpeg is not in the image                                           | 3               |
| `FAILED`, `failure` = `VIDEO_TOO_LONG_FOR_PLAN` / `VIDEO_DISABLED_FOR_PLAN`                                        | Plan limit — correct behaviour, the message names it                 | 4               |
| `FAILED`, `CORRUPT_CONTAINER` / `PROBE_TIMEOUT` / `NO_VIDEO_STREAM` / `DIMENSIONS_TOO_LARGE` / `DURATION_TOO_LONG` | Global policy refused the file                                       | 5               |
| `COMPLETED`, text starts `Video "…"`, `audio` ≠ `TRANSCRIBED`                                                      | Video fine, audio not transcribed — the reason is in the document    | 6               |
| `COMPLETED`, `audio` = `TRANSCRIBED`, model still blind                                                            | File-service is done; the problem is chat-service assembly (batch 8) | chat            |

## 2. Did the job run?

```bash
docker logs claw-file-service --since 30m 2>&1 | grep -E "requestVideoProcessing|VideoProcessingManager|videoProcessed|videoFailed|probe:"
```

- `requestVideoProcessing: queued` then nothing → the consumer is not
  subscribed. Look for `onModuleInit: subscribed to file.video_process_requested`
  at boot; a missing line means the service booted without `VideoProcessingManager`.
- `already being processed — skipping duplicate` → another delivery holds the
  Redis lock `file:video-process-lock:<id>` (15 min TTL). Wait, or
  `redis-cli del` it only if the holder is certainly dead.
- `already processed — skipping` → correct idempotency; the row has its document.

## 3. Is ffmpeg in the image?

```bash
docker exec claw-file-service sh -c "ffmpeg -version | head -1; ffprobe -version | head -1"
```

Both images install Debian `ffmpeg` and fail the build if it is missing. A
container that still says `not found` runs an image built before batch 7 — a
rebuild, not a restart
([`06-docker-toolkit.md`](./06-docker-toolkit.md)).

## 4. Plan limit

`Plan.maxVideoSeconds` via `resolvePlanLimit`: `null` unlimited, `0` disabled,
ADMIN unlimited. Free/trial = 60 s, paid = 600 s (migration
`20260925200000_add_media_plan_gates`). The comparison is on the MEASURED
duration (`durationMs > limit × 1000`), so 60.4 s on a 60 s plan is refused and
the message says "61 seconds". No hold is taken for a refused video. If auth
was down, the document says "Audio was not transcribed: the plan could not be
checked" — the paid step fails closed; re-upload once auth is back.

## 5. Global policy / hostile files

`ffprobe` runs with `-protocol_whitelist file,pipe` and
`-format_whitelist <video demuxers>`; an HLS playlist or concat script renamed
to `.mp4` fails as `CORRUPT_CONTAINER` (`[hls] Format not on whitelist` in the
log). Limits: ≤ 3840×2160, ≤ 30 min, probe ≤ 15 s. These are constants in
`video-processing.constants.ts`, not env vars.

## 6. The audio was not transcribed

`extraction_metadata->'media'->>'audioReason'` carries the readable reason; the
same text is in the document line. It came from the SAME path audio uploads
use — follow [`add-a-voice-note-or-transcription-path.md`](./add-a-voice-note-or-transcription-path.md)
(no capable connector, `INSUFFICIENT_CREDIT`, provider error). The PAYG
requestId is `transcription:<fileId>:video-audio:<provider>`.

## 7. Frames

```bash
curl -s -X POST "http://localhost:4006/api/v1/internal/files/<id>/video-frames" \
  -H "Authorization: Service $INTER_SERVICE_AUTH_TOKEN" -H 'Content-Type: application/json' \
  -d '{"userId":"<owner>","timestampsMs":[0,5000]}' | head -c 300
```

404 = wrong owner or id; 409 = not processed / processing failed; 400 = a
timestamp past `durationMs` or 0/9+ timestamps; 401 = no service token. Frames
are never stored — only cached in Redis for 10 minutes.

## Never

- Bulk-migrate video rows to re-run them (rule 42 item 10) — they heal on poll.
- Put a user filename, URL or any request text into an ffmpeg argument.
- Spawn ffmpeg anywhere except `common/utilities/media-process.utility.ts`.
