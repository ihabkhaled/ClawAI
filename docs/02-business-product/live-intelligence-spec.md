# Live Intelligence — product spec

Status: **built, dev-stack verified 2026-11-22; not deployed**. Architecture: [live-intelligence-architecture.md](../03-architecture/live-intelligence-architecture.md).
Decision: [ADR-221](../13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md).

## What it is

A user pastes a live-stream link and watches it in a ClawAI modal, with live captions in the
language they choose, short summary cards that keep up with the stream, and detected highlights on
a timeline. When they close the modal, the analysis they actually watched stays in their history. They
can enhance any card with a model they choose and export the history as PDF, Markdown or TXT. Asking
questions about the stream is out of scope for the first release.

## Owner decisions (2026-11-22)

1. **Sources:** YouTube links play in the modal but get **no AI**. YouTube's terms forbid capturing
   their audio or captions, and the modal says so plainly. AI runs on HLS links that the user confirms
   they have the rights to analyze, and on a controlled fixture stream used for QA. YouTube video links and
   channel links (`/channel/UC...`, the channel's current live stream) play; `@handle` links get a clear message asking
   for the video or channel link. Owner OAuth captions
   and tab-audio capture are not built.
2. **Home:** a new `claw-live-service`.
3. **Speech-to-text:** chunked transcription through the providers we already have (Gemini → OpenAI →
   local faster-whisper). No new vendor. Captions arrive about 7–12 s behind the speech, not 3 s, and the
   UI and docs say so.
4. **Pricing defaults** (seeded, admin-editable, versioned):

| Plan                        | Free minutes / month | Paid after free |
| --------------------------- | -------------------- | --------------- |
| free                        | 30                   | $0.02 / min     |
| starter                     | 120                  | $0.02 / min     |
| plus                        | 300 ¹                | $0.02 / min     |
| pro, team, scale, unlimited | 600 ¹                | $0.02 / min     |
| admin (staff accounts)      | 600 ¹ (36000 s)      | $0.02 / min     |

Vision is billed at actual model cost. The global daily provider budget is $20. Paid minutes always
need explicit confirmation, with an optional spending cap.

¹ The owner named free, starter and pro. The `admin` row exists because staff accounts sit on that plan slug; it is an assumption too. Plus (300) sits between starter and pro. team, scale and
unlimited get pro's 600, the highest value the owner named, so nothing is over-granted. These are
assumptions: the owner should confirm or change them in the admin page.

## Acceptance (user journey)

Open a supported stream, pick a language and mode, start, get captions, cards and highlights, pause
(the feed freezes and billing stops), resume (DVR or Live Edge with a visible gap), seek, close,
reopen at the Live Edge, browse paginated history, enhance a card, export, use up the free minutes,
approve credits, use up credits, get the 60 s grace, delete the history and see it cleaned up.

## States the user can see

Connecting, Analyzing, Paused, Delayed, Recovering, Free minutes used up, Credits required, Grace,
Unsupported source, Capacity reached, Stream ended, Completed. No fake success state is ever shown.
