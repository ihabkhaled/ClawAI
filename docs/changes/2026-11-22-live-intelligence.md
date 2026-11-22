# Live Intelligence: shared live-stream analysis (ADR-221)

**What.** A new `claw-live-service` (port 4022, database `claw_live`, route `/api/v1/live`): source resolve, same-origin HLS proxy, a fixture stream, one shared processing run per source and mode (lease and fencing), captions, translation, summary cards, highlights, vision, SSE, viewer sessions and presence, billing, history, enhance, export, deletion and an admin policy. Frontend: `/live`, `/admin/live` and the marketing page `/features/live-intelligence`. auth-service gained a fixed-price PAYG surface (`fixedCostMicroUsd`, `FIXED_PRICE_SURFACES`); file-generation gained the stateless `POST /api/v1/internal/file-generations/render-pdf`.

**Why.** The owner asked for live captions, translation, summaries and highlights on live streams, shared across viewers and billed per watched second.

**Owner decisions (2026-11-22).**

- YouTube plays in the modal with no AI (its terms forbid capturing audio or captions). `/channel/UC...` links play through the `live_stream` embed; `@handle` links get a clear message.
- AI runs on HLS links the viewer has the rights to analyze, and on a fixture stream.
- Chunked STT on existing providers; captions about 7-12 s behind speech.
- Free seconds per plan: free 1800, starter 7200, plus 18000, pro and above 36000, `admin` 36000; then $0.02 a minute. Plus, team, scale, unlimited and admin are owner-unconfirmed assumptions.
- Daily provider budget $20; paid minutes only after explicit approval; one 60 s grace per exhaustion episode.

**Verified (dev stack, 2026-11-22).**

- API smoke 28/28 (`scripts/qa/live-intelligence-smoke.mjs`).
- Billing journey 9/9 (`live-billing-journey.mjs`).
- 100 concurrent viewers land on 1 processing run (`live-shared-run-load.mjs`).
- 10 YouTube channels through the resolver: 6 played, 4 showed YouTube's own "unavailable" with the fallback link (`live-youtube-matrix.mjs`).
- Browser, desktop and mobile: pause, resume and captions.

**Not done.**

- No production deploy.
- The 3 s caption SLO is not met, by design (about 7-12 s). Latency is recorded as speech end to commit.
- No native-speaker review of the 13-language strings.
- Marketing media (screenshots, video) pending.
- Plus, team, scale, unlimited and admin free seconds need the owner's confirmation.

**Rollback.** Set the policy `killSwitch` in `/admin/live`, or stop the live-service container. The database is additive (new `claw_live`), so nothing to undo elsewhere. The auth fixed-price field and the file-generation endpoint are unused by any other caller.

**Deploy notes.** Add the `PG_LIVE_*` and `LIVE_*` values to the production `.env`, start `pg-live`, re-run `install-tls` so the certificate lists `live-service`. See `docs/04-backend/service-guide-live.md`.

## Code paths traced

apps/claw-live-service/src/modules/sources/services/sources.service.ts
apps/claw-live-service/src/modules/processing/services/run-coordinator.service.ts
apps/claw-live-service/src/modules/billing/managers/live-paid-block.manager.ts
apps/claw-live-service/src/modules/deletion/services/orphan-run-sweeper.service.ts
apps/claw-live-service/src/modules/history/constants/history.constants.ts
apps/claw-auth-service/src/modules/credit/constants/credit.constants.ts
apps/claw-file-generation-service/src/modules/file-generation/controllers/internal-file-generation.controller.ts
apps/claw-frontend/src/utilities/hls.utility.ts
