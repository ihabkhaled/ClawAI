# Skill: run the Live Intelligence QA on a running stack

Use after any change to `apps/claw-live-service`, the live frontend (`/live`, `/admin/live`), the `LIVE_INTELLIGENCE` PAYG surface or the live policy (ADR-221). It sits inside the 15 QA lanes of [run-the-qa-team](run-the-qa-team.md); read [verify-a-batch-live](verify-a-batch-live.md) first if a result looks impossible.

## Prerequisites

1. `live-service` and `pg-live` are up (`docker ps | grep live`); the container runs your code (`docker restart claw-live-service-1`, then read its log).
2. `.env` has the `LIVE_*` values and `ADMIN_EMAIL` / `ADMIN_PASSWORD` (staff plan slug `admin`; the policy must have an `admin` row).
3. The TLS certificate lists `live-service` in its SAN. On Windows `install-tls.ps1` may fall back to openssl; if so, re-issue the certificate with mkcert.
4. The dev frontend does not see new routes or edits until `docker restart claw-frontend`.

## The scripts (`scripts/qa/`)

Run from the repo root: `NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/<file>`

| Script                        | Proves                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `live-intelligence-smoke.mjs` | API smoke on the real fixture stream: auth refusals, rights attestation, session, HLS proxy, SSE captions, heartbeat accrual, pause, close, history, card versions, admin overview and policy, delete (last run 28/28). `LIVE_QA_WATCH_SECONDS` (default 130), `LIVE_QA_LANGUAGE` (default `ar`).                                                                                                                                                |
| `live-billing-journey.mjs`    | Free seconds, credits required, approve, 60 s grace, exhausted, reconnect cannot reset grace, top-up, paid block at the policy price (9/9). Creates a throw-away user and restores the FREE plan.                                                                                                                                                                                                                                                |
| `live-shared-run-load.mjs`    | `LIVE_QA_VIEWERS=N` viewers join at once and must land on ONE run (100 passed). Raises session limits through a new policy version, then restores.                                                                                                                                                                                                                                                                                               |
| `live-youtube-matrix.mjs`     | 10 real news channels: `/channel/UC...` plays, `@handle` is refused with `LIVE_YOUTUBE_HANDLE_UNSUPPORTED`. A YouTube-side "unavailable" is not a failure of ours.                                                                                                                                                                                                                                                                               |
| `live-server-pull-smoke.mjs`  | Server pull on REAL live streams: `LIVE_QA_URLS=<url,…>` (any platform; default a YouTube and a Kick stream) plus the first live Twitch channel (`LIVE_QA_TWITCH=<login>` pins it). Offline Twitch falls back with `SERVER_PULL_UNAVAILABLE`, offline TikTok stays `LINK_ONLY`, each live one is `SERVER_PULL`, device audio 422, real captions over SSE (20/20 on 2026-11-23). The dev container needs the pinned `yt-dlp` (rebuild the image). |
| `live-language-matrix.mjs`    | `LIVE_QA_CASES="<url>                                                                                                                                                                                                                                                                                                                                                                                                                            | <viewer lang>;…"`: per stream and viewer language, the spoken language of every caption, no translation of same-language speech, translations for the rest, and the cards the viewer reads (printed for a human to judge context). 18/18 on 2026-11-24 (fr→en, ar→ar, ar→en, en→ar). |
| `live-policy-set-plan.mjs`    | `LIVE_PLAN=admin LIVE_FREE_SECONDS=36000` publishes a new policy version for one plan and proves an invalid config is refused.                                                                                                                                                                                                                                                                                                                   |

Each prints `PASS` / `FAIL` per check and exits non-zero on a failure. Passwords are read from `.env` and never printed.

## Browser lane

Drive `https://claw.local/live` with Playwright on desktop and a mobile viewport: paste the fixture link, tick the rights box, start, check captions and cards appear, pause (the feed freezes), resume, close, reopen from history. Do not type a password into the transcript: log in through the API in a script, serve the session payload (tokens) from a small local server on `localhost`, and let the page script fetch it and set the session. The payload never enters the conversation.

## Traps

- Captions arrive 7-12 s behind speech; do not assert 3 s.
- Phones have no tab audio: the capture button becomes "Analyze using microphone". Desktop Chromium in Playwright can
  fake a microphone with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`.
- Server pull needs a channel that is live NOW; an offline Twitch channel correctly resolves to capture, which is not a bug.
- The billing script shrinks the FREE plan with a new policy version; if it dies half way, restore the previous version from `/admin/live`.
- A stale dev frontend shows an old page: restart it before judging a UI result.
- Headless Chromium's user agent makes YouTube live chat answer "update your browser": set a normal Chrome user agent
  in the browser lane. The account's saved appearance overrides `localStorage`, so a light-mode pass must PATCH
  `/users/me/preferences` (and restore it).
- Several YouTube resolves at once can time out yt-dlp and fall back to capture; the live-service log now says why.
- Record the results in `docs/qa-evidence/<date>-<slug>.md` (`npm run qa:evidence:new`).
