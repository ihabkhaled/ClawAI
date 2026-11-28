# Research engine: marketing screenshots and video

The public page is the narrated-research capability page,
`/features/narrated-research-and-web-crawling` (rule 66 for the research engine, ADR-223/224/225). It shows
`public/marketing/app/chat-research-rounds.png` (1440x900) and the existing `chat-research.png`.

## How to retake `chat-research-rounds.png`

1. Run the local stack and sign in as a test account whose plan includes research (never a real person's account).
2. In a new chat with research on **Automatic**, ask a question that needs several rounds, for example
   "Is intermittent fasting safe for people with heart disease? Compare recent studies and cite sources."
3. Wait for the answer, open **How I worked on this**, and scroll so the search lines (queries, languages, source
   types) and the start of the cited answer are both visible.
4. Capture at a 1440x900 viewport. Hide the PWA install button before the shot.
5. Never show a real person's email, a token or a private chat.

## Demo video

`public/marketing/videos/research-rounds.mp4` (with its poster) records the same flow, sped up, with a text summary
on the page. Re-record it with the same account and question when the work log changes.
