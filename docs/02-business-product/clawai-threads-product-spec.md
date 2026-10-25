# ClawAI Threads product spec

**Status:** Baseline workflow observed in production; reliability fixes are in local development, 2026-10-25
**Canonical design:** [Threads design](../superpowers/specs/2026-10-04-clawai-threads-design.md)

## Product promise

Threads turns a private chat into a sourced article or thread through a
multi-model review workflow. The owner controls publication; community
participation is open to authenticated users under existing moderation rules.

## Launch decisions

- Content types: article, research article, guide, and technical explanation.
- The owner selects one of the thirteen supported content languages; generation,
  canonical metadata, hub results, and discovery feeds use that stored locale.
- Generation begins only after a clear disclosure that it records intent to
  publish and may be indexed. The draft stays private until the owner approves.
- Require a selected maximum spend before enqueue. Existing plan entitlement and
  credit reservation apply; no new pay-as-you-go price is introduced.
- Use three to five author models. They vote for a draft and report their
  plurality agreement percentage; the Judge selects and reviews a candidate,
  then the Critic independently reviews it. Require Judge score of at least 80,
  Critic score of at least 75, and at most three rounds. Author disagreement
  alone does not fail a round or require identical drafts.
- Require citations for factual claims and keep source links with the revision.
- Authenticated users may comment, react, and request changes regardless of
  generation entitlement. Existing reporting, rate limits, owner controls, and
  admin moderation apply.
- Approved publications are independently eligible for indexing. Chat-share
  indexing lockdown remains unchanged.
- On account deletion, keep approved revisions public with anonymous
  attribution; delete private snapshots and generation artifacts, remove
  reactions, anonymize public comments, and delete pending private requests.
  Auth records a durable outbox event with deletion; each Threads service applies
  this policy in its own database. Delayed and duplicate delivery is safe, and
  tombstones prevent later jobs from restoring deleted account data.

## Board (signed-in browse and search)

Signed-in users get a Board at `/board`: a grid of published Threads with search-as-you-type, sort (latest, trending, discussed, liked), language and type filters, and a reader at `/board/[slug]` with the existing reactions and comments. Defaults: the language filter is the UI locale with an "All languages" option; the member Board is behind login and noindex (the public guest board below is its read-only, indexable twin); the sidebar entry "Board" sits beside Threads; publishing does not redirect there. Cards and the reader show the publisher's display name, @username and an initials avatar (updated 2026-10-14, see Community below); an account that is gone or unreadable shows no byline. The public `/threads/[slug]` page stays the canonical, indexable copy. See ADR-177 and ADR-178 and [the change record](../changes/2026-10-14-threads-board.md).

## Public board (guests, read-only)

Visitors without an account get a clear, easy-to-find **Public Threads board** at `/threads/board` in the marketing site (navigation, footer and the Threads hub link to it). It lists every public Thread (published, owner-approved, safety-approved, index-eligible) with the same typo-tolerant search, the suggestions panel of about ten nearest results with a "show all N results" row, did-you-mean, language and type filters, sorts, pagination and cards with like, comment and suggestion counts. Opening a card goes to the canonical `/threads/<slug>` page.

Guests are read-only: they see counts and existing comments, and every action (like, comment, request a change, report with an account, bookmark) shows a friendly "Sign in to ..." prompt linking to login or register. The page exposes no internal owner id, hash or safety data; it shows only the public display name and @username of the publisher and of commenters. It is indexable, listed in the sitemap in all 13 locales and carries real introductory copy. Decision: [ADR-178 addendum](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md); change record: [2026-10-14-public-threads-board](../changes/2026-10-14-public-threads-board.md).

## Community: names, threaded comments, reactions (2026-10-14)

Every Thread shows who published it (name and @username) on the public page, the in-app reader and Board cards. Comments are threaded: any comment or reply has a Reply button that opens an inline box starting with `@username `; a reply to a reply stays in the same list under its top-level comment with a "Replying to @name" chip (unlimited chain, one visual level). Each comment has Like and Dislike with live counts; guests see the counts and are sent to sign in on a click. `@username` in a comment is styled text, never a link. People are notified (in-app, email and push as set in settings) when someone comments on their Thread, replies to their comment, mentions them, reacts to their Thread or comment, or requests a change; each notification opens the Thread at `#comment-<id>`. Frontend notes: `apps/claw-frontend/CLAUDE.md`, section "Threaded comments and names".

## Timestamps (2026-10-15)

A Thread shows when it was published and every comment and reply shows when it was written. Times are stored in UTC and shown in each visitor's own time zone as a relative label ("just now", "20 minutes ago", "yesterday", weeks, months, years) in the page language; hovering shows the full local date and time. Labels refresh while the page is open (not while the tab is hidden). A future timestamp from a skewed clock reads "just now". See `apps/claw-frontend/CLAUDE.md` (Thread timestamps).

## Change requests (2026-10-15)

A signed-in reader can suggest a change to a public Thread (up to 5000 characters). Decision: [ADR-188](../13-adr/adr-188-reader-change-requests-are-answered-by-the-owner-and-credited-once-applied.md).

**Owner flow.** The owner's notification ("<name> suggested a change to your Thread", with the real Thread title) opens the review screen `/threads/review/<publicationId>` at that request, highlighted. The same screen is reached from the owner-only bar "Pending change requests: N - Review" at the top of their own public Thread, and from the pending badge on the Threads list. Each request shows who asked (name and @username), how long ago, the text and its status (Pending, Accepted, Declined, Applied). The owner, and only the owner, can:

- **Accept**, then choose how to apply it: **Apply with AI review** (edit the article in the form; the new version goes through the capped automatic review before it can be published) or **I will edit it myself** (accepts it and opens the editor). When the owner publishes the updated Thread, an accepted request becomes **Applied** automatically.
- **Decline**, with an optional short reason that the requester can read.

Not built: a model that rewrites the article from the suggestion by itself.

**The requester is told** (in-app, email and push as set in notification settings): accepted, applied (links to the Thread, which now credits them) and declined. **My suggestions** (`/threads/my/suggestions`, linked from the Threads list and from those notifications) lists their own suggestions with status and the owner's reply.

**Public visibility.** A pending or declined suggestion is never shown or returned publicly. The public Thread page shows only a small credit line, "Improved with suggestions from @name", for people whose suggestion was accepted or applied. The requester sees their own pending and declined ones only in My suggestions.

**Limits.** At most 3 pending suggestions per person per Thread and 50 pending per Thread; the owner cannot suggest to their own Thread; the existing rate limits stay.

## Article formatting (2026-10-16)

AI-written Thread articles are laid out as clean GitHub-flavoured Markdown and drawn as a well-designed article. Decision: [ADR-189](../13-adr/adr-189-thread-articles-are-typeset-by-a-guarded-format-stage-and-rendered-as-rich-safe-html.md).

**What a reader sees.** One title; a short "Key takeaways" list or summary; sections with clear headings (each with a copy-link anchor); paragraphs of at most four sentences; bullet and numbered lists; tables for comparison data (they scroll inside their own box on a phone, with a header row and striped rows, and mirror in right-to-left languages); Note, Tip and Warning boxes with an icon and colour; a Sources list; reading time; and, for an article with three or more sections, a table of contents (a collapsible block on a phone, a sticky column on a desktop). The text keeps a readable line length, prints cleanly and never runs scripts: raw HTML in an article is dropped and images are not loaded.

**Generation.** The authors are asked for this structure. After the Judge and Critic pass, one cheap model retypesets the article; a checker then proves that nothing but layout changed (every citation marker, number, date and table kept, no new link, word count within 15 percent, headings in the article language). If the check fails, the model fails, or 85 percent of the job spend cap is already used, the article is kept exactly as reviewed and the step log says why (a `FORMAT_*` code). The step never fails a job and never runs twice.

**Existing Threads.** On the owner review screen, **Improve formatting with AI** previews the improved version next to the current one (rendered, Before/After). **Use improved version** saves it as a new version that goes through the safety check and the Judge and Critic again before it can be published; **Discard** changes nothing. Three passes per Thread per day; the same key never spends twice; only the owner can run it. A pass uses a small part of the plan Threads allowance, like an edit review.

Known gaps: no "last updated" line yet (the public API carries only the publish date); the daily pass limit is a constant, not an admin setting.

## Budget and plan enforcement

Reserve the existing research, judge, and critic plan allowances once per job.
Each paid model call reserves its existing wallet hold against the selected job
cap before provider execution. A denied sub-hold releases the wallet hold. A
successful call settles actual cost into the aggregate; failed calls release
both holds. A job cannot close while a call reservation is unresolved.

## Launch boundary

Generation obtains source text from Chat through an owner-scoped internal
snapshot request. Chat returns a deterministic versioned snapshot containing
only eligible user/assistant text, with a digest and explicit complete-transcript
limits. Every durable job retains its own snapshot version and digest, and a
new generation takes a new snapshot. The authenticated Threads API passes the
selected cap and starts the job; generation validates snapshot ownership before
reserving it through the existing Auth entitlement system. Threads allows
owner-scoped progress/cancellation and persists ready output as a private
pending revision.
JSON, Markdown and TOON (Token-Oriented Object Notation) are supported owner exports. TOON is
verified to decode back to the canonical JSON before it is returned; prompts to models keep
canonical JSON.

The public reader shows only approved, safety-checked fields. It does not show a
reader identity list. Public reads require a published, owner-approved,
safety-approved, index-eligible revision. Secret or PII matches remain private
and store only machine-readable reason codes. Owners can export JSON or Markdown
and unpublish approved work. Public community UI, localization, and discovery
integration are implemented; full browser, role, device, and production evidence
remains a release gate.

The publication service owns an isolated PostgreSQL database and an atomic
owner-approval transition. Generation-result handoff stores output as a private
revision; automated review thresholds and safety checks make it eligible for
owner approval. Owners can submit immutable edited revisions with a fresh
user-selected cap and idempotency key. Generation rechecks the exact text and
citation URLs against the parent's pinned source and evidence, using fresh
author preference votes plus Judge/Critic thresholds. For a single edited
draft, the author agreement percentage is informational; Judge and Critic
approval decide readiness. A revision becomes eligible
only after its exact content hash matches the completed review and the owner
approves it. The previously approved revision remains public until then.
Authenticated readers can comment, react once per publication, request changes,
and report publications or visible comments from the public reader page. Public
comments omit reader identity; citation links accept only absolute HTTP(S) URLs.
Owners resolve change requests; accepting one creates a fresh capped immutable
revision and sends it through the existing paid review flow. The current approved
revision stays public until the owner approves a passing replacement. Moderation
report review requires `THREAD_PUBLICATIONS_MODERATE`; moderators can hide a
reported comment. Account deletion, browser, access-control, device, and
production QA remain open. Internationalization and public discovery are
implemented; generation authors are prompted to use the persisted locale.
Generation intent or a private draft alone does not make content public.

## Plans

Threads is open to every plan and to administrators (owner decision 2026-10-07). Creating one
reserves one research, one Judge and one Critic review from the plan's Threads allowance, which is
the catalog's: Free 1 for life, Starter 2 a month (1 Critic), Plus 10 a month (5 Critic), Pro and
above by their own rules. Administrators are not counted. A Free Thread's model calls ride the plan's free credit allowance (its money meter and price limit, not its monthly request count; ADR-162 addendum). A person who has used the allowance sees
that the plan does not include (or has used up) Threads, with a link to the plans page. Chat's own
Research, Judge and Critic switches are unchanged. Reading, commenting, reacting and suggesting
changes are open to every signed-in account.

## Export and sharing

An owner can download a Thread as Markdown, JSON, TOON, HTML or plain text, one at a time or
several together as one ZIP, and can save a PDF through the browser's print dialog. A reader of a
public Thread can download Markdown, JSON, HTML or plain text and save a PDF. Anyone can share a
published Thread by copying its link, through the device share sheet, or to WhatsApp, Facebook,
LinkedIn, X, Telegram, Reddit or email. Sharing sends nothing anywhere until the person clicks.

## Operations: failed jobs

A job that exhausts its retries and fallbacks ends FAILED with no public content and its
credit reservation released. Admins automatically get one ticket in the feedback queue
(source System) with the failed stage, error summary, attempts, queue wait, duration, the
models and fallbacks configured, the credit reservation state and the correlation id. No
conversation text or secret is ever in it.

## Owner creation flow delivery

Where things live: **creating** a Thread is a modal (from the chat header, or the **Create a
Thread** button on the list page, where the owner picks the source chat). `/threads` is only
the list of the owner's publications. Each publication has its own page at
`/threads/review/<id>` for progress, draft preview, capped edits, approve and publish,
unpublish, export and reader suggestions. The five model roles use the chat's grouped,
searchable model picker (providers, capability and credit badges); on-device and image
providers are not offered.

The primary entry point is the chat itself: the chat header menu has **Turn into
public Thread**, which opens a modal for that chat (source chat fixed, topic
pre-filled from the title). It uses the same form as the `/threads` portal, adds an
explicit unchecked consent checkbox ("I understand this publication is intended to
become public and indexable") that must be ticked before generation can start, and
sends the owner to the portal on that publication once it starts. Default models
spread across established cloud providers; on-device models are not offered.

The `/threads` portal now lets an authenticated owner select a source chat,
topic, publication type, author/Judge/Critic models, and a required maximum
spend. Before enqueue, it presents the approved public/indexing intent; the
generation request carries `threads-public-v1` and the selected micro-USD cap
through the existing entitlement and credit-hold path. The portal polls only
owner-scoped generation state and previews the private draft and citations.
The publish action appears only when the publication is marked
`READY_FOR_REVIEW`; generation completion by itself never makes a publication
public. Owners can submit edited content with a user-selected revision cap;
revisions stay private while they pass fresh safety and model review. Owners can
export Markdown or JSON and unpublish a live item. Owners can review reader
change requests from the same portal (see Change requests above). A decline can include a reason;
acceptance either carries an edited revision, selected spend cap and fresh paid review, or is
accepted on its own while the owner edits by hand.
The accepted revision stays private until the owner approves it. The public
reader page and contribution controls are implemented; browser/accessibility/
device QA remains open.

Generation cancellation is owner-scoped. The portal shows a request in
progress, confirms when the service accepts it, and prevents duplicate requests
while accepted. A failed request stays retryable; accepted cancellation is not
presented as complete until the worker reports the terminal cancelled state.
