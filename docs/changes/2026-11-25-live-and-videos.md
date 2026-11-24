# Change - Live & Videos: recorded videos, 18 verified platforms, one-click summary

## Files

- `context/load-bearing-facts.md`
- `apps/claw-frontend/`
- `apps/claw-frontend/public/marketing/live-and-videos/`
- `apps/claw-frontend/public/marketing/videos/`
- `apps/claw-frontend/src/app/(marketing)/features/live-intelligence/`
- `apps/claw-frontend/src/app/(marketing)/features/live-intelligence/platforms/`
- `apps/claw-frontend/src/app/(portal)/live/`
- `apps/claw-frontend/src/components/live/`
- `apps/claw-frontend/src/components/live/__tests__/`
- `apps/claw-frontend/src/components/marketing/live-intelligence/`
- `apps/claw-frontend/src/components/marketing/live-intelligence/__tests__/`
- `apps/claw-frontend/src/constants/`
- `apps/claw-frontend/src/constants/live-intelligence-marketing-content/`
- `apps/claw-frontend/src/enums/`
- `apps/claw-frontend/src/hooks/live/`
- `apps/claw-frontend/src/hooks/live/__tests__/`
- `apps/claw-frontend/src/lib/i18n/__tests__/`
- `apps/claw-frontend/src/lib/i18n/locales/`
- `apps/claw-frontend/src/lib/security/__tests__/`
- `apps/claw-frontend/src/repositories/live/`
- `apps/claw-frontend/src/types/`
- `apps/claw-frontend/src/utilities/`
- `apps/claw-frontend/src/utilities/__tests__/`
- `apps/claw-live-service/prisma/`
- `apps/claw-live-service/prisma/migrations/20261124120000_live_recorded_and_platforms/`
- `apps/claw-live-service/prisma/migrations/20261124130000_live_video_summary/`
- `apps/claw-live-service/prisma/seeders/`
- `apps/claw-live-service/prisma/seeders/__tests__/`
- `apps/claw-live-service/src/common/enums/`
- `apps/claw-live-service/src/modules/policy/schemas/`
- `apps/claw-live-service/src/modules/policy/services/__tests__/`
- `apps/claw-live-service/src/modules/processing/constants/`
- `apps/claw-live-service/src/modules/processing/repositories/`
- `apps/claw-live-service/src/modules/processing/services/`
- `apps/claw-live-service/src/modules/processing/services/__tests__/`
- `apps/claw-live-service/src/modules/processing/types/`
- `apps/claw-live-service/src/modules/processing/workers/`
- `apps/claw-live-service/src/modules/processing/workers/__tests__/`
- `apps/claw-live-service/src/modules/sessions/dto/`
- `apps/claw-live-service/src/modules/sessions/managers/`
- `apps/claw-live-service/src/modules/sessions/managers/__tests__/`
- `apps/claw-live-service/src/modules/sessions/repositories/`
- `apps/claw-live-service/src/modules/sessions/services/`
- `apps/claw-live-service/src/modules/sessions/services/__tests__/`
- `apps/claw-live-service/src/modules/sessions/types/`
- `apps/claw-live-service/src/modules/sessions/utilities/`
- `apps/claw-live-service/src/modules/sessions/utilities/__tests__/`
- `apps/claw-live-service/src/modules/sources/`
- `apps/claw-live-service/src/modules/sources/constants/`
- `apps/claw-live-service/src/modules/sources/services/`
- `apps/claw-live-service/src/modules/sources/services/__tests__/`
- `apps/claw-live-service/src/modules/sources/types/`
- `apps/claw-live-service/src/modules/sources/utilities/`
- `apps/claw-live-service/src/modules/sources/utilities/__tests__/`
- `scripts/qa/`

## Before

Only live-stream links were recognised. The owner's Facebook share links, an Instagram reel and a TikTok short link
all failed with `LIVE_SOURCE_UNSUPPORTED`. The feature was called "Live", the page "Live Intelligence", and there was no
way to summarize a video at once.

## Change

- live-service: a `RECORDED` capability (resolve: live first, then a recorded-video probe; 3 h policy cap), a
  `RecordedChunkSource` (download once, play along in 6 s chunks; a summary reads 30 s pieces at full speed), the
  one-click summary (`summarize: true`, scope `SUMMARY:<userId>`, billed by processed video seconds), 24 host-matched
  platforms, Facebook share-link redirect, Facebook/Instagram/TikTok/Twitch/Kick recorded link shapes, a 4 MB playlist
  cap, a once-only policy upgrade in the seeder. Migrations `20261124120000_live_recorded_and_platforms`,
  `20261124130000_live_video_summary` (additive).
- frontend: rename to "Live & Videos" / "Live & Video Intelligence" in 13 locales, "Watch with live analysis" and
  "Summarize video" buttons, the estimate dialog, a summary view with video offsets and its own status wording, new
  embed origins.
- Public pages: `/features/live-intelligence` rewritten with the owner's two recordings (re-encoded to H.264) and three
  real screenshots; new `/features/live-intelligence/platforms` listing only platforms that passed the real sweep.
- QA scripts: `scripts/qa/live-platform-sweep.mjs`, `scripts/qa/live-summary-run.mjs`.

## Now

A pasted live stream or recorded video from 34 tested platforms works on any device: play along with live analysis,
or summarize the whole video in one click (5 min video in 47 s) and pay only for the video processed.

## Why

Owner request 2026-11-24 with screenshots of the failing links, and the owner's answers: play along, 3 h cap, all
recommended platforms, the new name, a one-click summary billed as Live minutes, and public pages in 13 languages.

## Verification

`docs/qa-evidence/2026-11-25-live-and-videos.md`.

## What would make this stale

A yt-dlp upgrade that changes extractor behaviour (re-run the sweep), a new platform, or a change to summary billing.
