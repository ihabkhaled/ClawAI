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
