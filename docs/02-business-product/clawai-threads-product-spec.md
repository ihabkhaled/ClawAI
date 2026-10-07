# ClawAI Threads product spec

**Status:** Approved for implementation planning, 2026-10-04
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
- Use three to five author models, exact-draft-hash unanimous agreement, Judge
  score of at least 80, Critic score of at least 75, and at most three rounds.
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
author consensus plus Judge/Critic thresholds. A revision becomes eligible
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
above by their own rules. Administrators are not counted. A person who has used the allowance sees
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
change requests from the same portal. Rejection can include a private response;
acceptance requires an edited revision, selected spend cap, and fresh paid review.
The accepted revision stays private until the owner approves it. The public
reader page and contribution controls are implemented; browser/accessibility/
device QA remains open.

Generation cancellation is owner-scoped. The portal shows a request in
progress, confirms when the service accepts it, and prevents duplicate requests
while accepted. A failed request stays retryable; accepted cancellation is not
presented as complete until the worker reports the terminal cancelled state.
