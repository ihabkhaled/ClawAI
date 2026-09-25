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
