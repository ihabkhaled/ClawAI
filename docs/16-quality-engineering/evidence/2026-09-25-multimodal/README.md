# Multimodal browser lane — 2026-09-25

Playwright 1.63 (headless Chromium 153) against `https://claw.local`, main
checkout at `9448bd178`. Script: `scripts/qa-lab/multimodal-ui-matrix.mjs`
(accounts: `scripts/qa-lab/multimodal-ui-accounts.mjs` — a throwaway paid `pro`
user with a $2 top-up and a throwaway free user; random passwords, never
printed). Fixtures (160×120 `testsrc` PNG, 4 s `testsrc` + tone MP4) were made
with `ffmpeg` inside `claw-file-service`.

- `report.json` — full run (run 2, all scenarios).
- `report-5-6-8-9.json` — rerun (run 3) after a script selector fix for the
  generated image and switching RTL through the header language menu.

## New code proof

The model picker renders `data-testid="model-capability-badges"` from catalog
flags (`02-*.png`), the composer recorder buttons carry the multimodal copy,
and the free-plan notice / dimmed read-aloud use the new localized strings.

## Results

| #   | Scenario                                                                                                                                                                                         | Result                           | Evidence                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------- |
| 1   | Voice + video enabled on Claude Haiku 4.5 (non-audio), aria-label + title                                                                                                                        | PASS                             | `01-composer-voice-video-claude-haiku-1440.png` |
| 2   | Badges: Gemini 2.5 Flash = Vision+Audio+Video; GPT 4.1 Mini = Vision only                                                                                                                        | PASS                             | `02-model-picker-*.png`                         |
| 3   | PNG on OLLAMA gpt-oss:20b → helper describes it (`DERIVED_IMAGE_TEXT`, helper gemini-2.5-flash)                                                                                                  | FAIL (UI)                        | `03-helper-vision-delivery-chip-1440.png`       |
| 4   | Video attachment states                                                                                                                                                                          | FAIL (racy)                      | `04-video-attachment-state-*.png`               |
| 5   | Read aloud: blob `src`, metadata loads, stop = no request, reopen = `cached:true` same file                                                                                                      | PASS run 1 + 3; FAIL run 2 (504) | `05-read-aloud-player-1440.png`                 |
| 6   | "Generate an image of a lighthouse at dusk" → completes, survives refresh                                                                                                                        | PASS                             | `06-image-generation-*.png`                     |
| 7   | Free: "Unlock Image generation" + visible `/plan` link; read aloud dimmed, `aria-disabled`, label "Read aloud is not included in your plan."; backend `OMITTED_NO_VISION` / `helper_vision_plan` | FAIL (UI note missing, like 3)   | `07-*.png`                                      |
| 8   | Device matrix, 15 viewports                                                                                                                                                                      | 14 PASS, 740×360 FAIL            | `08-matrix-*.png`                               |
| 9   | RTL (Arabic), `dir="rtl"`, 390×844 / 820×1180 / 1440×900                                                                                                                                         | PASS                             | `09-rtl-ar-*.png`                               |
| 10  | axe-core 4.13.0 (injected), chat page with image, player, attachment                                                                                                                             | PASS — 0 violations              | `report.json#axe`                               |
| 11  | Console / network                                                                                                                                                                                | see below                        | `report*.json`                                  |

## Defects

1. **No delivery-mode note in single chat (3, 7).** `metadata.fileDelivery`
   is correct (`DERIVED_IMAGE_TEXT`; free `OMITTED_NO_VISION` +
   `file_delivery.reason.helper_vision_plan`), but the message bubble shows only
   `aria-label="Files: 1"`. `AttachmentDeliveryChip` is mounted only in
   `compare-result-card`, `parallel-response-card` and `parallel-lane-card`, not
   in `message-bubble.tsx`, so `mediaUi.deliveryReason.*` is never shown on a normal turn.
2. **Video shows Ready before processing ends (4).** In run 2 the tile went
   Uploading → Ready (no status line) while `GET /files/:id` still had
   `ingestionStatus=COMPLETED`, `extractedText="[Video file: qa-clip.mp4]"`,
   no `extractionMetadata.media`. The media landed later. Run 1 did show
   "Processing — You can send now…". The composer maps only
   `ingestionStatus` PENDING/PROCESSING to Processing, and the video row is
   COMPLETED while its job is still running.
3. **740×360 landscape: composer controls hidden (8).** Send `[599,329,44,44]`
   and record `[215,329,44,44]` end at y=373 > 360, under the bottom nav. The
   textarea is cut off (`08-matrix-mobile-740x360-landscape.png`). Seen in
   runs 2 and 3.
4. **TTS 504 (run 2).** Gemini `gemini-2.5-flash-preview-tts` hung. chat-service
   aborted at its 60 000 ms timeout at 11:50:03, and nginx returned 504 to the
   browser at the same second. The UI showed "Could not read this reply aloud.
   Try again." The upstream timeout equals the proxy timeout, so the client gets
   a gateway 504 instead of the service's own error.
5. **Role labels not localized (pre-existing).** `MESSAGE_ROLE_LABELS` in
   `constants/chat.constants.ts` is hard-coded English, so "You" / "Assistant"
   appear in Arabic (`09-rtl-ar-mobile-390x844.png`).
6. Minor: on phones the floating feedback rail (− / +) and "Jump to latest"
   cover assistant text (`08-matrix-mobile-390x844-portrait.png`, `09-*`).

## Console / network

Only these, on every portal page: `GET /api/v1/llamacpp/catalog 502` and
`GET /api/v1/ollama/models 502`. This is the environment:
`claw-llamacpp-service` exited 2 weeks ago and `claw-ollama-service` is only
Created. Also the single TTS `504` from defect 4. There were no page errors.

## Limits

- On mobile the generated image was not in the DOM at the measured scroll
  position (virtualized list), so image fit was measured on tablet and desktop only.
- The saved language preference (`PATCH /users/me/preferences` → 200) did not
  switch an already-open tab, and `/ar/…` URLs stayed `lang=en`. RTL was
  switched through the header language menu instead.

## Re-run after fix commit `e2194bc7b` (file-service, chat-service, frontend rebuilt)

Same script with `QA_MMUI_SHOTS=screenshots-rerun QA_MMUI_REPORT=report-rerun.json`.
Evidence: `screenshots-rerun/`, `report-rerun.json` (scenarios 1–6 and 8–10),
`report-rerun-7.json` (scenario 7). In the full run, creating the reused free
account's thread returned **429**, because earlier runs had used up its
thread-creation allowance. Scenario 7 was then run once on fresh accounts
(`QA_FRESH_ACCOUNTS=1`).

| #   | Before                                        | After               | Note                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | PASS                                          | PASS                |                                                                                                                                                                                                                                                                                                   |
| 2   | PASS                                          | PASS                |                                                                                                                                                                                                                                                                                                   |
| 3   | FAIL — no delivery note                       | **PASS**            | chip "🔎 Described by helper 1", title names the file and GEMINI/gemini-2.5-flash                                                                                                                                                                                                                 |
| 4   | FAIL — Ready while `[Video file:` placeholder | **PASS**            | Uploading → "Processing — You can send now…" → Ready. At Ready, the backend had the media document                                                                                                                                                                                                |
| 5   | PASS ×2 / FAIL ×1 (nginx 504 at 60 s)         | **FAIL** (provider) | Gemini TTS `TIMED_OUT` at 40 025 ms (`ttsAttempt` log). chat-service answered **504 itself at ~43 s**, under nginx's 60 s, so the deadline fix works. The UI shows "Could not read this reply aloud. Try again." It passed in run 3 before the fix, so this is Gemini TTS being flaky, not the UI |
| 6   | PASS                                          | PASS                |                                                                                                                                                                                                                                                                                                   |
| 7   | FAIL — no no-vision note                      | **PASS**            | "Skipped (no vision)" + "Your plan does not include image descriptions…"; plan notice + `/plan` link; read aloud dimmed                                                                                                                                                                           |
| 8   | 740×360 FAIL                                  | **PASS 15/15**      | 740×360: bottom nav gone, composer, send and record on screen                                                                                                                                                                                                                                     |
| 9   | PASS                                          | PASS                | role labels now Arabic ("أنت" / "المساعد")                                                                                                                                                                                                                                                        |
| 10  | 0 violations                                  | 0 violations        | axe-core 4.13.0                                                                                                                                                                                                                                                                                   |
| 11  | 502 llamacpp/ollama; 1 TTS 504                | same                | environment (services down) + the provider timeout above                                                                                                                                                                                                                                          |

Still open (minor):

- On phones the floating feedback rail and "Jump to latest" cover the start of
  assistant text (`screenshots-rerun/09-rtl-ar-mobile-390x844.png`).
- On 740×360 the rail's "−" sits on the side toolbar.
- The Next.js dev badge covers the model button. It is dev only.

The first two are fixed in code on 2026-09-25 (CSS gutter keyed on the
launcher's expanded state, rule 36 §12; "Jump to latest" icon-only below `sm`).
Contract-test gated only — this matrix has not been re-run against it.

## Re-run 2: after `d6961639d` (cancellation) + `b520f71ca` (chips everywhere, phone overlap, abortable uploads)

Fresh throwaway accounts. Evidence: `screenshots-rerun2/`.

- `report-rerun2.json`: B, 8, 10, and C's first pass.
- `report-rerun2-A.json`: A. The first pass could not find Compare's file
  input, because the composer only appears after 2+ models are selected. The
  script now selects Claude Haiku 4.5 and Gemini 2.5 Flash first.
- `report-rerun2-C.json`: C re-measured in English. At 740×360 the first pass
  was still in Arabic, so the "Compare Models" toolbar selector missed.

| Scenario                                                                                                                                                                                                                                      | Result             | Evidence                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------- |
| A Compare: PNG + video get their own chips, Uploading → Processing ("Stop processing" shown) → Ready, no "Uploading (N)" count                                                                                                                | PASS               | `A-compare-chips-*.png`             |
| A Consensus lab: same flow                                                                                                                                                                                                                    | PASS               | `A-consensus-chips-*.png`           |
| B1 Read aloud, Stop pressed 0.45 s after the POST (202). The UI sent `POST …/speech/cancel` (200). `GET /speech` = CANCELLED, 0 of 10 segments at 8 s and at 23 s. Ledger: 6 TTS RESERVATION, each with a RESERVATION_RELEASE, no CONSUMPTION | PASS               | `B1-read-aloud-stop-pending.png`    |
| B2 Image generation, Cancel on the card → "Generation cancelled / Retry"; exactly 1 new generation, CANCELLED, no successor after 20 s; ledger IMAGE RESERVATION −245 760 + RELEASE, no CONSUMPTION                                           | PASS               | `B2-image-generation-cancelled.png` |
| B3 60 s video, "Stop processing" → chip "Cancelled — Processing was stopped…"; file FAILED, `extractionError` "Processing was cancelled."; no ledger rows (no hold existed)                                                                   | PASS               | `B3-video-processing-cancelled.png` |
| C Phones 360×740, 390×844, 390×844 RTL, launcher expanded: 0 intersections between launcher / Jump-to-latest boxes and transcript text lines (`main p, main li`), at the bottom and scrolled up                                               | PASS               | `C-overlap-*.png`                   |
| C 740×360: "−" at [676,178,44,44], side toolbar at [606,144,54,245], no overlap                                                                                                                                                               | PASS               | `C-740x360-minus-vs-toolbar.png`    |
| D Device matrix, 15 viewports: 0 overflow, send + record in viewport                                                                                                                                                                          | PASS 15/15         | `08-matrix-*.png`                   |
| D axe-core 4.13.0 on the chat page with media                                                                                                                                                                                                 | PASS, 0 violations | `report-rerun2.json#axe`            |

Console / network: only the environment 502s (`/llamacpp/catalog`,
`/ollama/models`; those services are not running). No TTS 504 this time.

Note: C checks paragraph and list text only. In the first C pass (Arabic,
740×360; that screenshot was later overwritten by the English re-measure), the
Jump-to-latest pill sat over the "N steps" count of the "How I worked on this"
header. Seen by eye, not measured. Cosmetic.
