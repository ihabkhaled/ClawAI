# Change - Live & Videos round 2: server-only reads, one language, songs, agents, the ~10 s report, 58 platforms

## Files

- `apps/claw-file-service/`
- `apps/claw-file-service/src/modules/files/constants/`
- `apps/claw-file-service/src/modules/files/utilities/__tests__/`
- `apps/claw-frontend/`
- `apps/claw-frontend/src/app/(portal)/live/`
- `apps/claw-frontend/src/components/admin/live/`
- `apps/claw-frontend/src/components/admin/live/__tests__/`
- `apps/claw-frontend/src/components/live/`
- `apps/claw-frontend/src/components/live/__tests__/`
- `apps/claw-frontend/src/components/marketing/live-intelligence/__tests__/`
- `apps/claw-frontend/src/constants/`
- `apps/claw-frontend/src/constants/live-intelligence-marketing-content/`
- `apps/claw-frontend/src/enums/`
- `apps/claw-frontend/src/hooks/admin/live/`
- `apps/claw-frontend/src/hooks/admin/live/__tests__/`
- `apps/claw-frontend/src/hooks/live/`
- `apps/claw-frontend/src/lib/i18n/__tests__/`
- `apps/claw-frontend/src/lib/i18n/locales/`
- `apps/claw-frontend/src/types/`
- `apps/claw-frontend/src/utilities/`
- `apps/claw-frontend/src/utilities/__tests__/`
- `apps/claw-live-service/`
- `apps/claw-live-service/prisma/`
- `apps/claw-live-service/prisma/migrations/20261126120000_live_video_report/`
- `apps/claw-live-service/prisma/migrations/20261126130000_live_platforms_round2/`
- `apps/claw-live-service/prisma/seeders/`
- `apps/claw-live-service/prisma/seeders/__tests__/`
- `apps/claw-live-service/src/common/utilities/`
- `apps/claw-live-service/src/modules/policy/constants/`
- `apps/claw-live-service/src/modules/policy/schemas/`
- `apps/claw-live-service/src/modules/policy/schemas/__tests__/`
- `apps/claw-live-service/src/modules/policy/services/__tests__/`
- `apps/claw-live-service/src/modules/policy/types/`
- `apps/claw-live-service/src/modules/processing/`
- `apps/claw-live-service/src/modules/processing/constants/`
- `apps/claw-live-service/src/modules/processing/managers/`
- `apps/claw-live-service/src/modules/processing/managers/__tests__/`
- `apps/claw-live-service/src/modules/processing/schemas/`
- `apps/claw-live-service/src/modules/processing/services/`
- `apps/claw-live-service/src/modules/processing/services/__tests__/`
- `apps/claw-live-service/src/modules/processing/types/`
- `apps/claw-live-service/src/modules/processing/utilities/`
- `apps/claw-live-service/src/modules/processing/utilities/__tests__/`
- `apps/claw-live-service/src/modules/processing/workers/`
- `apps/claw-live-service/src/modules/processing/workers/__tests__/`
- `apps/claw-live-service/src/modules/sources/`
- `apps/claw-live-service/src/modules/sources/constants/`
- `apps/claw-live-service/src/modules/sources/services/`
- `apps/claw-live-service/src/modules/sources/services/__tests__/`
- `apps/claw-live-service/src/modules/sources/types/`
- `apps/claw-live-service/src/modules/sources/utilities/`
- `apps/claw-live-service/src/modules/sources/utilities/__tests__/`
- `docs/02-business-product/`
- `docs/03-architecture/`
- `docs/04-backend/`
- `docs/13-adr/`
- `docs/qa-evidence/`
- `scripts/qa/`
- `scripts/qa/live-language-matrix.mjs`
- `scripts/qa/live-summary-run.mjs`

## Before

A YouTube video on a phone fell back to the microphone (YouTube bot-checks the server's address). An English viewer
sometimes got an Arabic highlight, summary or caption. A sung Arabic line ("انا بموت", Tamer Hosny) was reported as
someone wanting to die. TikTok and many platforms failed; the public pages claimed "more than 15". The admin could not
choose the analysis models. The one-click summary was a short report without times.

## Change

- live-service: `YtdlpRunnerService` (slot wait, YouTube `android_vr` retry on a bot-check), server-only resolve
  (one retry, then `LINK_ONLY` + `SERVER_PULL_UNAVAILABLE`), translations checked for the target script and asked
  again (≤ 3), sung lines (♪) searched as lyrics, `LiveCouncilService` draft-then-merge over policy
  `councilModelChain` (1..3), `ReportManager` writing a `REPORT` event (a moment about every 10 s, chapters, quotes,
  in the viewer's language), 36 new platforms with link rewrites, yt-dlp request headers forwarded (allow-listed),
  encrypted playlists refused. Migrations `20261126120000_live_video_report`, `20261126130000_live_platforms_round2`
  (additive enum values); the seeder's once-only upgrade adds the council and widens a non-empty platform list.
- file-service: the speech-to-text instruction marks sung lines with ♪; a chunk of only note signs is not speech.
- frontend: "Translating…" / "shown in its original language" card states, the unreadable-link notice, the report
  card (`LiveReportBody`), the in-app "Supported platforms" list, the admin model-chain form with the chat model
  picker, 53 verified platforms on the public pages ("more than 50"), 13 locales.
- QA scripts: the summary run checks the report and its moment density; the language matrix checks the viewer's
  script for every card and caption and runs at most `LIVE_QA_PARALLEL` cases at once.

## Now

Any device reads a link on the server or says it cannot; every card and caption is in the viewer's language; songs are
named, not misread; 1-3 agents draft and the main model merges; "Summarize video" ends with a timestamped report;
53 platforms verified (22 live with real captions, 39 recorded) and listed in the app and on the public pages.

## Why

Owner report and answers 2026-11-26 (ADR-221 round-2 addendum).

## Verification

`docs/qa-evidence/2026-11-26-live-and-videos-round2.md`.

## What would make this stale

A yt-dlp upgrade or a platform changing its player (re-run the sweep and the live matrix), a change to the council or
report prompts, or a new viewer language.
