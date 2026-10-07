# ClawAI Threads - launch readiness

**Verdict: NO-GO for general launch. Code is landed; live generation proof and
production rollout are open.** Source of truth: the
[implementation plan](../../superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md),
[product spec](../../02-business-product/clawai-threads-product-spec.md),
[architecture](../../03-architecture/clawai-threads-architecture.md) and
[ADR-159](../../13-adr/adr-159-clawai-threads-two-service-architecture.md) /
[ADR-160](../../13-adr/adr-160-threads-account-deletion-propagation.md).
The plan listed 18 separate SDLC files; this single page replaces them because
each would only restate those documents. That is a stated deviation.

## Landed (Batches 1-7)

Isolated services (4019 and 4020, own databases and queue), immutable chat
snapshots, spend cap and per-call holds, 3-5 author unanimous consensus on one
draft hash, Judge 80 / Critic 75 gates, owner approval, edit revalidation,
change requests, comments, reactions, reports, moderation, account deletion,
13-locale UI, public hub and article, sitemap and RSS.

## Verified live (2026-10-06, local stack)

Public read, community and owner APIs; anonymous/admin/FREE access; IDOR 404s;
XSS inertness; reaction uniqueness under concurrency; 11 widths plus Arabic RTL
on the article. Live cloud-model generation ran through research, authors, consensus vote and Judge. Defects found and fixed (see
[change record](../../changes/2026-10-06-threads-live-qa-fixes.md)).

## Not done - go/no-go blockers

1. A live run that passes the Judge and Critic and reaches owner approval and publication (lane L08). Runs reach the Judge and are rejected on citation quality; see the QA record for the tuning questions.
2. Paid-tier and custom-role matrix and a live plan toggle (L06).
3. Production rollout: v1.194.2 and v1.194.3 builds were stopped by VPS memory
   pressure; production still runs the earlier SHA. Prove host load first.
4. Lighthouse on the article page with JSON-LD (L13).

## Shipped from the pack

TOON export, automatic admin ticket on final failure, and the views/signed-in readers
counter ([change record](../../changes/2026-10-07-threads-views-counter.md); the
reader-identity modal waits on a privacy decision).

## Pack items outside the approved plan (owner decision needed)

Web push and email on "ready for review", dedicated marketing pages with
real screenshots, and a separate plan flag for generation. Each changes scope,
privacy or money, so none was added silently.

## Rollback

Unpublish is atomic and removes an item from reads, sitemap and RSS. The two
services can be stopped without touching chat; the frontend routes fail closed.
