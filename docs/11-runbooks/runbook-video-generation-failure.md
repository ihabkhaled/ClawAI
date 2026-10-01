# Runbook: Video Job Stuck or Failed

Governing: [ADR-137](../13-adr/adr-137-video-generation.md) · [rules/37](../../rules/37-payg-credit-integrity.md) item 17 · live proof: [skills/verify-video-generation-live.md](../../skills/verify-video-generation-live.md)

## Symptoms

- Video bubble shows progress forever, or a fixed failure sentence
- `GET /api/v1/videos/:id` returns a non-terminal status for many minutes

## Facts

- Statuses: `QUEUED`, `STARTING`, `GENERATING`, `FINALIZING`, `COMPLETED`, `FAILED`, `TIMED_OUT`, `CANCELLED`.
- image-service polls the provider every **8 s**; it gives up at a **12 min** ceiling (`TIMED_OUT`).
- A sweep (every 60 s) times out any row stale for **17 min** (12 + 5) and releases its hold. A restart mid-job leaves such a row.
- The user sees a fixed sentence per `error_code` (provider text is never stored or shown). The provider's real body is in the log.

## Walk

```bash
docker exec claw-pg-images psql -U claw -d claw_images -c \
  "select id, model, status, error_code, left(error_message,120), updated_at
   from video_generations order by created_at desc limit 10"
docker logs --since 30m claw-image-service | grep -i video
```

| Sign                                          | Meaning                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `error_code` PROVIDER_AUTH_FAILED / xAI 403   | xAI out of credits, not a bad key; top up                                                                         |
| 400 from Veo                                  | `durationSeconds` must be a number                                                                                |
| GENERATION_TIMED_OUT / GENERATION_INTERRUPTED | 12 min ceiling, 17 min sweep, or a service restart; you were not charged                                          |
| STORAGE_FAILED                                | generated but file-service could not save it; hold released                                                       |
| No row at all                                 | chat-service never routed it; check chat logs and the nginx `/api/v1/videos` route (restart nginx, do not reload) |

## Recover

- Retry: `POST /api/v1/videos/:id/retry` (UI retry button). Cancel: `POST /api/v1/videos/:id/cancel`; the hold is released.
- A stuck non-terminal row older than 17 min is cleaned by the sweep within a minute; if it is not, image-service is down.
