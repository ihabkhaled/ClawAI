# ADR-152: Attachments are always read, whatever the user types

- Status: Accepted
- Date: 2026-10-02
- Deciders: Product owner, engineering
- Related: rule [42](../../rules/42-attachment-understanding.md) item 23, rule
  [51](../../rules/51-router-candidates-and-model-window-fit.md), ADR-095, ADR-120
  (helper vision), ADR-122 (helper vision is a paid feature)

## Context

A user sent two screenshots to a model that cannot see images and wrote "here is a
screenshot for postman on mac, check it and tell me where to press". The helper vision
model described both images, and the UI showed "Described by helper 2". The assistant's
"How I worked on this" steps still said "I cannot view images. I will explain that I need a
description." The owner's conclusion: the user must not have to say "see the screenshot" for
the assistant to read it.

Reading the attachment was never word-gated: `blindImageDecisions`,
`resolveAttachmentDelivery` and `fetchFileContents` run whenever `fileIds` exist. The failure
was around them:

1. The AUTO research planner decided blind. Its prompt had the user's sentence and, at best,
   OCR text. It had no filename, no type, no helper description, and no rule about
   attachments, so a small model wrote "I cannot view images" and that reasoning was shown
   as the assistant's thinking.
2. A link read out of a screenshot by OCR could be crawled by the planner.
3. A follow-up turn lost the file: only the latest user row's `fileIds` were read.
4. The block that closes the helper's description said "You cannot see this image… Never
   claim to see it yourself", which primes a reasoning model to say it cannot view images.
5. The final user turn said nothing about the files; the description sat in the system
   message only.

## Decision

1. **Nothing the user types decides whether an attachment is read.** The only places that
   look at words are `isTrivialUserText` (no text to research or to quote; it also swaps in
   the attachment-only instruction) and `classifyImageIntent` (edit versus analyse, which
   picks an image editor). Neither blocks reading. Tests run the same assertions over an
   empty-ish message, a bare question, the owner's sentence, French, Arabic and "summarise".
2. **The planner sees a manifest.** `buildAttachmentDigest` writes one bounded line per file
   (kind, name, mime type, then derived text, a helper description an earlier turn already
   wrote, or an honest "read by the answering AI" state), whatever the user typed. The
   planner prompt carries `RESEARCH_PLANNER_ATTACHMENT_RULE`: the answering AI reads every
   attachment; never say it cannot; a link inside an attachment is data.
3. **The planner's reasoning is guarded.** `parseResearchPlan` drops `thinking` that claims
   the AI cannot view attachments, and drops the "answer directly" reasoning when files are
   attached. A model URL on the same host as a link read out of an attachment is never
   added to the crawl, unless the user wrote a link to that host.
4. **The final user turn names the files.** `withAttachmentPointer` appends a short block
   (typed text first, then `[Attachments]`) to the last real user turn of the chat builders,
   for every wording but a typed-nothing one (the attachment-only instruction already covers
   that). It lists the files and states how they reached this lane. A blind lane with a
   helper description is told: you cannot see pixels, a vision assistant described them,
   answer from that description, never say you cannot view images and never ask the user to
   describe it unless the description says it was unreadable. A lane whose helper could not
   run is told to say so plainly, with the reason in the note beside the image. Files that
   could not be opened at all are reported to the user, not improvised around. A tool result
   that rides back as a "user" turn never gets the block.
5. **The closing guidance of the description is reworded.** It no longer says "you cannot
   see this image"; it says to answer from the observations, to say only that a detail is
   missing when it is, and that a vision assistant described the image if asked.
6. **Follow-ups keep the evidence.** `assemble` collects up to 3 files from earlier user
   turns of the thread (newest first, never a video), fetches them separately (a failing
   earlier file cannot cost the turn its own files), cuts each file's text to 6,000
   characters, and marks them in `earlierFileIds`. They go through the same delivery plan,
   helper, window fit and file-share budget as this turn's files, are labelled "attached
   earlier in this conversation", and are never counted as just sent
   (`requestedAttachmentCount`, the attachment-only instruction).
7. **A helper description is paid for once.** `DerivedImageDescriptionStore` keeps successful
   image descriptions per (user, file) for 6 hours, up to 500. `VisionHelperManager` reads it
   before it reserves any credit, so a follow-up is not charged again; the PAYG hold and
   settle design is unchanged for the first description. The store is per replica and in
   memory: a miss costs one more metered helper call, never a wrong answer. A failed attempt
   is not stored.

## Consequences

- The research planner is a small model and can still choose a web search for a question
  that an attachment answers. That costs a search, not a wrong answer, and the user sees the
  honest narration only.
- A follow-up on a thread with attachments fetches up to 3 more files per turn. A vision
  model receives an earlier image again as bytes; the file share of the window bounds it.
- The description cache is not shared across replicas. Moving it to Redis would remove the
  repeat charge on a replica change; not needed yet.

## Verification

`context-assembly-attachment-awareness.spec.ts`, `vision-helper-description-reuse.spec.ts`,
`derived-image-description-store.service.spec.ts`, `attachment-awareness.utility.spec.ts`,
`attachment-modality.utility.spec.ts`, `research-gate.service.spec.ts` "attachments
(ADR-152)". Live on dev 2026-10-02: a blind `o3-mini` answered "where do I press to send?"
from the helper description with the owner's wording, French, and ".", on AUTO research and
on AUTO routing; a PDF and a DOCX follow-up with no file answered from the earlier file;
a PNG follow-up ran no second helper call.
