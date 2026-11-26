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

## Owner decisions (2026-11-26): server only, one language, songs, agents, the detailed report

- **Superseded 2026-11-26 (owner: "server only, retry", ADR-221 round 2): no link falls back to the viewer's tab audio or microphone any more.** An unreadable link is read once more after 2 s, then it is `LINK_ONLY` with reason `SERVER_PULL_UNAVAILABLE`. The capture text below describes the old path, kept only for sessions created before then.
- **One language:** everything a viewer reads is in the viewer's language; a card still being translated says "Translating…", never shows the other language silently.
- **Songs:** sung words are lyrics; the analysis names the song and artist when it can find them and never reports a lyric as the singer's real state.
- **Agents:** the admin picks the main model, fallbacks and 1 to 3 extra agents; each agent drafts, the main model merges.
- **Detailed report:** "Summarize video" ends with a report in the viewer's language: a summary, chapters, a moment about every 10 seconds ("0:44 — …") and key quotes.

## Owner decisions (2026-11-23): phones and server pull

- **Phones:** no mobile browser can share tab audio, so on a phone the button reads "Analyze using microphone". The phone's
  microphone hears the stream from its own speaker; the viewer keeps the sound on. Same price per minute. A blocked
  microphone says how to allow it.
- **Server pull ("server pull 100%"):** a live **Twitch** channel is analyzed by ClawAI's servers. Nothing to share, works
  on any device, and every viewer of that channel shares one analysis. The owner accepted Twitch's terms risk. Admins can
  turn it off in the policy.
- **Superseded the same day (batch 4, owner decision "for all providers"):** server pull now covers YouTube, Kick,
  Facebook, TikTok LIVE, Rumble, BIGO, Bilibili, CHZZK, SOOP, Nimo, LinkedIn and Telegram too, through yt-dlp; the owner
  accepted the terms risk. A live stream is analyzed on the server for every viewer; when the server cannot read it,
  YouTube/Kick/Facebook fall back to tab or microphone capture and the others to "Watch on …". Discord stays refused;
  Instagram Live usually cannot be read.
- An offline Twitch channel falls back to capture and says the server could not read it.
- Captions follow the viewer's language (2026-11-24): a speaker in the viewer's language is shown word for word; any
  other language is shown only as its translation (the original appears only if the translation is 12 s late).
- Cards say what the stream is (news, a song, a match, a game) and who is in it when the stream, the screen or a web
  search makes it clear; a song is "someone sings X by Y", never "the speaker says". Summaries are written in the
  speaker's language and translated for each viewer.
- The platform's live chat follows the app theme (dark or light); YouTube channel links get their live chat too.

## Acceptance (user journey)

Open a supported stream, pick a language and mode, start, get captions, cards and highlights, pause
(the feed freezes and billing stops), resume (DVR or Live Edge with a visible gap), seek, close,
reopen at the Live Edge, browse paginated history, enhance a card, export, use up the free minutes,
approve credits, use up credits, get the 60 s grace, delete the history and see it cleaned up.

## States the user can see

Connecting, Analyzing, Paused, Delayed, Recovering, Free minutes used up, Credits required, Grace,
Unsupported source, Capacity reached, Stream ended, Completed. No fake success state is ever shown.

## Marketing pages (2026-11-24)

The feature is marketed as **Live & Video Intelligence** (nav label "Live & Videos"); the URLs keep
their old name. `/features/live-intelligence` is the overview (hero, two portrait clips, four steps,
three phone screenshots, outcomes, live analysis vs one-click summary, modes, languages, platforms
teaser, limits, FAQ); `/features/live-intelligence/platforms` lists every platform by group. Both are
in 13 locales and registered in the content registry (sitemap, llms.txt, hreflang, Lighthouse). The
platform list is ONE constant, `LIVE_MARKETING_PLATFORMS` in
`apps/claw-frontend/src/constants/live-intelligence-marketing-platforms.constants.ts`; correct a
platform there. The copy states no price and no number of free minutes: those are admin policy.
Screenshots live in `apps/claw-frontend/public/marketing/live-and-videos/` (390x844, dark theme).
