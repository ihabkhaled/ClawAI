# 2026-09-25 — Sent attachments: preview, playback, download

**Report:** a sent video note showed a `<video>` player stuck at 0:00; Download
worked and the downloaded file was fine.

**Root cause:** the page CSP had no `media-src`, so `<audio>`/`<video>` fell back
to `default-src 'self'`, which does not match the `blob:` URL the authenticated
preview hands them. Chrome: `MEDIA_ELEMENT_ERROR 4 "Media load rejected by URL
safety check"` plus a CSP console violation. Production sent the same header
(`curl -sI https://claw-ai.co/en/chat`, no `media-src`). The same family broke
text previews: `fetch(blobUrl)` is a `connect-src` request, also blocked.

**Fix:** `media-src 'self' blob:`; text previews read `blob.text()` (no
`connect-src` widening). Rule: [42 §17](../../../../rules/42-attachment-understanding.md).

## Method

Dev stack `https://claw.local`, Chrome 154 via Playwright MCP, admin account.
Fixtures generated with ffmpeg (h264/aac mp4, vp8/vp9+opus webm, mov, mp3, m4a,
ogg/opus, wav, opus-in-webm, png, jpg, webp, gif) and node (pdf, docx, xlsx,
pptx, txt, md, csv, json); zip from an earlier fixture. Uploaded through the
composer's file input; video and voice notes recorded through the composer's
recorder with the host camera/microphone. Playback measured with `el.play()`,
`readyState`, `duration`, `currentTime` advancing, `el.error`.

## Matrix (before → after)

| Type                               | Preview           | Plays                  | Download (name)                |
| ---------------------------------- | ----------------- | ---------------------- | ------------------------------ |
| mp4 h264/aac                       | ✔                 | ✘ err 4 → ✔ 320×240    | ✔ (sha256 matches)             |
| webm vp8 / vp9                     | ✔                 | ✘ → ✔                  | not clicked (same path as mp4) |
| mov                                | ✔                 | ✘ → ✔                  | not clicked (same path as mp4) |
| recorded video note (webm)         | ✔                 | report ✘ → ✔ 1280×720  | not clicked (same path as mp4) |
| mp3 / m4a / ogg / wav              | ✔                 | ✘ → ✔                  | not clicked (same path as mp4) |
| opus-in-webm file (`video/webm`)   | ✔ (video)         | ✘ → ✔ (audio, 0×0)     | not clicked (same path as mp4) |
| recorded voice note (`audio/webm`) | ✔                 | (after only) ✔ 3.4s    | not clicked (same path as mp4) |
| png / jpg / webp / gif             | ✔                 | n/a                    | n/a                            |
| pdf                                | ✔                 | Open → native viewer ✔ | not run (see below)            |
| txt / md / csv / json              | inline text ✘ → ✔ | Open ✔                 | ✔                              |
| docx / xlsx / pptx                 | ✔                 | n/a                    | ✔ (docx sha256 matches)        |
| zip                                | listing ✔         | n/a                    | no control (by design)         |

After the fix: 0 CSP violations across all threads, also after reload; 390px
width shows no horizontal overflow.

## Not run / open

- PDF Download: the Playwright MCP connection dropped twice around the PDF card
  and was not retried; PDF Open was verified instead.
- Workspace inbox file viewer: no workspace objects in dev. Its text path is
  fixed and unit-tested; its PDF `<iframe src=blob:>` is still blocked by
  `frame-src` (confirmed with a synthetic iframe) — follow-up, not widened.
- Composer lets 13 files be attached; the server caps a message at 10 and the
  UI shows only "Validation failed".
- Real RTL: `/ar` rendered `dir=ltr` because the account's saved language wins.
- Safari/iOS and Firefox were not run.
