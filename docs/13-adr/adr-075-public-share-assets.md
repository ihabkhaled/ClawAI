# ADR-075: A public share owns copies of its images, and unscanned images cost it its ad and index eligibility

**Status**: Accepted
**Date**: 2026-08-27
**Deciders**: ClawAI core team
**Slice**: Chat sharing — public assets

## Context

Sharing a conversation that contains a generated image publishes a transcript
with the image missing. Three independent decisions cause it, and all three were
deliberate:

1. `chat_share_messages` has no asset columns, and `buildSnapshotMessages` copies
   only `content`, `role`, `providerLabel`, `modelLabel` and the timestamp. The
   `metadata.fileIds` that carry attachments are dropped at publish time.
2. The public DTO is an allow-list whose own doc comment names "attachment ids or
   storage URLs" as absent by construction.
3. The public markdown renderer maps `img` to an alt-text placeholder.

Worse, an assistant turn that generated an image stores the literal string
`'Generating image…'` as its content — so a share of that conversation publishes
that sentence as the answer.

Two things make this more than a rendering fix.

**Public share pages carry advertising and ask to be indexed.**
`resolveAdsEligibility` and `indexEligible` both turn on when the safety scan
approves, and that scan — `evaluateSnapshotSafety` — reads
`messages.map((m) => m.content).join()` and nothing else. Publishing images
unchanged would put unscanned user uploads on an ad-serving, Google-indexed page.
The code already prices that risk: "an ad we did not serve costs a fraction of a
cent, and an ad on a revoked or unsafe page costs the AdSense account."

**File retention reaps.** `FileRetentionSweeperManager` deletes files whose
`retentionExpiresAt` has passed — blob first, then row, on a nightly cron. A
snapshot holding a reference to a user's file would rot into 404s on a page that
is already in a search index.

## Decision

**1. A share owns copies of its images, not references to the user's.**

At publish time, chat-service reads each referenced file through file-service's
existing `download-internal/:id` and writes it back through `upload-internal`,
receiving a new file id with `retentionExpiresAt = null`. The snapshot stores
that id.

The copy is what makes the page durable: it survives the retention sweep, it
survives the user deleting the original, and it survives the user editing the
thread. A public page that Google indexed in March must not 404 in April.

**Rejected: keep a reference and exempt the original from retention.** Cheapest,
and wrong in two ways. It mutates a row the user owns to serve a decision they
made about a copy, and it still breaks when they delete the file — which they are
entitled to do, and which a public page must not be able to prevent.

**Rejected: a short-lived signed URL redeemed at file-service.** No duplication,
but it points the dependency the wrong way — file-service would have to ask
chat-service whether a share is still live — and a signed URL that escapes the
page outlives the revocation that was supposed to kill it.

**2. Bytes stay in file-service; chat-service proxies.**

Storage ownership does not move. The public route lives on chat-service, because
chat-service is the service that knows whether a share is live, and it fetches
through the service-token path that already exists. This is the direction the
dependency already runs.

**3. Revocation takes the images with it.**

Revoking or deleting a share deletes its owned copies. The share-scoped route
resolves `(publicShareId, publicMessageId, assetId)` and refuses anything whose
share is not currently published — so a leaked asset URL dies with the share, and
an asset id from one share cannot be read through another.

**4. Unscanned images cost the share its ad and index eligibility.**

`evaluateSnapshotSafety` is text-only and stays that way. A separate image scan
runs at publish time; until an image passes it, the share is neither ad-eligible
nor index-eligible — it is still publishable and still readable by anyone with
the link.

That ordering is the point. The user's ask is that their images appear in a
shared chat, and they do, immediately. What waits on the scan is whether ClawAI
monetises that page and asks Google to list it — which is ClawAI's decision to
make about its own inventory, not a restriction on the user.

**Rejected: publish images and keep ads and indexing unchanged.** That is an
unscanned screenshot, possibly containing a credential or a face, on a page that
serves ads and invites indexing. The failure is not hypothetical and it is not
cheap.

**Rejected: block image publishing until the scan exists.** It withholds the
feature that was asked for in order to protect ad inventory, which is the wrong
way round.

**5. The contract comment changes in the same commit.**

`chat-shares.types.ts` says attachment ids and storage URLs are "absent by
construction". After this, share-owned asset ids are present and storage URLs
still are not. Leaving that comment saying the old thing is worse than either
outcome, so it changes with the code, and the reversal is appended — never edited
in place — to the public-share documentation.

## Consequences

- Publishing a conversation with images costs a copy per image, and revoking it
  frees them.
- A share published before this change has no assets. There is no backfill: the
  snapshot is immutable by design, and re-publishing is the supported way to pick
  up new content.
- The share dialog must say what publishing an image does, in all 13 locales.
- `'Generating image…'` as stored assistant content is a separate defect. It is
  what makes an image-only turn publish as a sentence about waiting, and it needs
  fixing at the point the assistant row is written, not at publish time.

## Revisit when

- The image scan gains a cost that makes per-publish scanning uneconomic — at
  which point the decision becomes when to scan, not whether.
- A share needs to carry non-image attachments. The asset table is shaped for it,
  but a PDF on a public page is a different content-rights question and needs its
  own answer.
