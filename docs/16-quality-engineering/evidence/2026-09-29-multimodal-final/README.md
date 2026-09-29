# Multimodal final live verification — 2026-09-29

Stack: dev, main checkout at `4151eee2c` (F3) and later; services rebuilt with `claw.sh service:rebuild`.

| Lane            | Command                                                                                                  | Result                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| API             | `QA_ADMIN_EMAIL=… QA_ADMIN_PASSWORD=… bash qa/test-multimodal.sh`                                        | 41/41 (two earlier runs 39/41: Gemini 503 "high demand" upstream, and one nginx 000 — both transient)                                   |
| Browser         | `QA_MMUI_FIXTURES=<png+mp4+60s mp4> QA_MMUI_OUT=<this dir> node scripts/qa-lab/multimodal-ui-matrix.mjs` | 13/13 scenarios PASS across `report.json` (1,2,4,6,8,9,10,A), `report-3-5-B-C.json` (3,5), `report-B-C.json` (B,C), `report-7.json` (7) |
| Device matrix   | scenario 8                                                                                               | 15 viewports (mobile/tablet/desktop, both orientations), overflow 0                                                                     |
| RTL             | scenario 9                                                                                               | 390/820/1440, overflow 0                                                                                                                |
| a11y            | scenario 10                                                                                              | axe 4.13.0: 0 serious/critical                                                                                                          |
| F3 live         | scratch script                                                                                           | "Edit this image…" → Gemini edit COMPLETED, `originalPrompt` kept; "What is in this image?" → no image job, correct description         |
| Metrics         | Prometheus `/api/v1/targets`                                                                             | claw-chat-media, claw-file-media, claw-image-media up; 150 media series                                                                 |
| Restart mid-job | `docker restart claw-image-service` during GENERATING                                                    | FAILED before fix: row stuck GENERATING > 180 s → fixed by `ImageStaleJobRecoveryManager` (re-verified after deploy, see plan doc)      |

Fixtures were generated with ffmpeg `testsrc` + `sine` inside the file-service container.
Browser-lane rerun causes: first full run hit chat-service crash-looping after another session's commit
needed baked shared-package symbols (`service:rebuild chat-service routing-service` fixed it);
scenario 5's assertion predated the cancel-on-close request and was corrected in the script.
Not run: OpenAI live (owner: no credit); local STT/TTS (no path); llamacpp/Ollama runtimes stopped (502 on their catalog).

## Re-run after batches A/B/C (e18a6d72f), 12:50 UTC

API lane 31/7/1 — every Gemini-backed check failed with Google's **"Your project has
exceeded its monthly spending cap"** (image `IMAGE_PROVIDER_QUOTA_EXCEEDED`, helper
vision, TTS 429 → RATE_LIMITED backoff, transcription "busy"); OpenAI has no credit.
Our handling was correct in each case (right codes, holds released, no charge). Needs
the owner to raise the cap at https://ai.studio/spend, then re-run.
The recurring `frames route via nginx → 000` was nginx 499: unmatched
`/api/v1/internal/*` fell through to the Next.js dev 404 page (326 KB, > 60 s cold).
Fixed: `location /api/v1/internal/ { return 404; }` in `infra/nginx/locations.conf`.

## Final run (main at 5e05450ca, after the Gemini cap was lifted)

- API lane: **41/41** (`bash qa/test-multimodal.sh`).
- Browser lane: **13/13 in one run** — `SUMMARY 1:PASS 2:PASS 3:PASS 4:PASS 5:PASS 6:PASS 7:PASS 8:PASS 9:PASS 10:PASS A:PASS B:PASS C:PASS` (`rerun/report.json`, screenshots in `rerun/screenshots/`).
- The first post-cap run found a real bug (video question routed to `chatgpt-image-latest`, no reply) — fixed in 5e05450ca, rule 51 item 19.

## Deferred-items live run (2026-09-29, `scripts/qa-lab/deferred-live.mjs`)

Connectors toggled via `PATCH /connectors/:id` and restored in `finally`.

- OpenAI STT (Gemini off): `provider=OPENAI model=gpt-4o-mini-transcribe kind=QUOTA_EXHAUSTED` (HTTP 429). Reserve released `reason=PROVIDER_ERROR`; fell through to LOCAL: `metered=false`, `audioSeconds=4`, transcript exact. Metered success path NOT proven live (OpenAI quota).
- LOCAL STT (Gemini + OpenAI off): `provider=LOCAL model=Systran/faster-whisper-small`, unmetered, 3.7 s, transcript exact. PASS.
- OpenAI masked edit: chat refused with "model cannot edit only part of an image" (no mask-capable model reachable, OpenAI 429). No image job created. NOT proven live.
- Video restart recovery: not run live (Gemini spend); unit-gated.
