# Live Intelligence fixtures

Bundled media for `fixture:<name>` sources (architecture section 1). `FixtureBroadcasterService`
loops a file with ffmpeg into a local live HLS window (4 s segments, 150-segment window,
`EXT-X-PROGRAM-DATE-TIME`), so QA runs the real pipeline (STT, summaries, highlights,
translation, vision) against a real live source. Nothing about the AI output is mocked.

Only names in `LIVE_FIXTURE_FILES` (`src/modules/sources/constants/sources.constants.ts`)
resolve. The directory is read from `<cwd>/fixtures`, so the image must copy it next to `dist`.

| Name        | File            | Content                                                                                           |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------- |
| `live-demo` | `live-demo.mp4` | 122 s, 685 KB. H.264 320x180 at 2 fps with a slowly shifting colour, plus AAC mono 24 kHz speech. |

`live-demo.mp4` holds real speech: ten English paragraphs of a "quarterly product briefing"
(mobile release, a delay decision, a storage announcement, an infrastructure migration, a
dashboard demonstration, hiring, an audience question, a closing milestone). They were synthesised
on 2026-11-22 with the dev stack's Kokoro-82M TTS (`claw-speech`, voice `af_heart`), with 1.5 s
pauses and one 9 s pause after paragraph six, to exercise the 8 s summary-pause trigger. The
topics are distinct so `topicShift` and each highlight type have something real to find.

To replace it, keep the file under 5 MB, with real speech in at least one audio track and an
optional video track.
