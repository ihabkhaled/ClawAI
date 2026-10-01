# Skill — Verify video generation live

**Use when**: you changed video generation (image-service `video-generation`, the chat `VIDEO_*` providers, the video bubble) and must prove it on the running stack. Video costs real money per clip.

**Governing**: [ADR-137](../docs/13-adr/adr-137-video-generation.md) · [rules/37](../rules/37-payg-credit-integrity.md) item 17 (video finalizes on measured `videoSeconds`, never zero tokens) · mechanics in [verify-a-batch-live.md](verify-a-batch-live.md) · failure triage in [runbook-video-generation-failure.md](../docs/11-runbooks/runbook-video-generation-failure.md)

---

## 1. Make the stack run your code

1. Pull `main` in `D:\Freelance\Claw`. Dev containers compile the MAIN checkout's `src`, so a worktree edit never deploys.
2. `./scripts/claw.sh service:rebuild` each of: image, file, auth, routing, chat. Rebuild, not reload or restart: shared packages and Prisma are baked into the image.
3. nginx: **restart** `claw-nginx` (a reload serves the stale bind-mounted config; see [runbook-nginx-stale-config.md](../docs/11-runbooks/runbook-nginx-stale-config.md)). `/api/v1/videos` must be proxied.
4. Do not edit service `src` during the run: a dev nodemon restart mid-job times the job out (holds are released).

## 2. Cost: shortest clip, 720p

| Model                  | Per 4 s clip |
| ---------------------- | ------------ |
| Veo 3.1 Lite           | $0.20        |
| Veo 3.1 Fast           | $0.40        |
| Veo 3.1 Standard       | $1.60        |
| Grok Imagine Video     | $0.20        |
| Grok Imagine Video 1.5 | $0.32        |

Run **one 4 s clip per model first**. Only when each completes, run more (retry, cancel, AUTO detection, second user).

## 3. Prove it

- Admin is **unmetered** (`held=0`), so it proves generation, not billing. For metering use a real PAYG user with credit: expect a hold of `videoSeconds` x rate, then a finalize on measured seconds, ledger surface "Video".
- Browser: pick the model, send a short prompt, watch progress, `<video>` plays, download works. Screenshot per breakpoint.
- API: `GET /api/v1/videos/:id` until `COMPLETED`; then the row:

```bash
docker exec claw-pg-images psql -U claw -d claw_images -c \
  "select id, model, status, error_code, started_at, updated_at from video_generations order by created_at desc limit 5"
```

- Cancel: `POST /videos/:id/cancel` mid-job, hold released. Retry: `POST /videos/:id/retry` on a `FAILED`/`TIMED_OUT` row.

## 3b. Image-to-video

Upload a small PNG (`POST /files/upload`, JSON with base64 `content`), then send a chat message
with `fileIds: [id]` and a motion prompt, pinned to a video model (`routingMode MANUAL_MODEL`)
or in AUTO with "animate this image". Expect the row's `sourceFileId` to equal the upload,
status `COMPLETED`, and a different mp4 hash per source image. A GIF, a PDF or an oversized
image must fail with `VIDEO_SOURCE_IMAGE_INVALID` before any hold. Pattern: `qa_i2v.py` style,
one clip per image, 4 s.

## 4. What a failure looks like

- **xAI 403** = account out of credits, not a bad key. Top up before blaming the connector.
- **Veo** wants `durationSeconds` as a **number**; a string is rejected 400.
- OpenAI Sora is shut down (2026-09-24): do not test or add it.
- Job `TIMED_OUT` after a restart mid-run: expected, see section 1.4.
- Provider text never reaches the user (fixed sentences); the real body is in `docker logs claw-image-service`.
