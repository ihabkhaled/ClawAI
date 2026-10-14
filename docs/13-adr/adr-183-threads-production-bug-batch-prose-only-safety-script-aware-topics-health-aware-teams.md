# ADR-183: Threads production bug batch: prose-only safety scan, script-aware topics and slugs, health-aware teams, resolved markers, a wider queue

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-173](adr-173-threads-unknown-model-window-is-assumed-not-fatal.md), [ADR-174](adr-174-threads-refuses-what-cannot-succeed-before-it-queues.md), [ADR-176](adr-176-thread-generation-runs-jobs-concurrently-and-fairly.md), [ADR-177](adr-177-threads-board-search-is-a-postgres-projection.md) and [ADR-181](adr-181-thread-generation-heals-itself-by-failure-class-and-resumes-at-the-failed-phase.md). Rules: [11](../../rules/11-dtos-and-validation.md), [15](../../rules/15-configuration-and-environment.md), [20](../../rules/20-i18n-and-user-facing-messages.md).

## Context

About 35 production generations across the 13 languages found eight defects:

1. A draft whose citation URL held a 16-digit id (a Facebook id) tripped the `\b\d{16}\b` PII check. The draft stayed `DRAFT`, publish answered 409 and the edit endpoint 404 (it only accepted `READY_FOR_REVIEW`, `PUBLISHED`, `UNPUBLISHED`), so the owner could not recover.
2. The 10-character topic minimum counted UTF-16 units, so 9-character Chinese or Japanese topics were refused.
3. Hindi and Thai slugs lost vowel and tone marks (`क-त-र-म-ब-द-ध-`).
4. `recommended-team` listed Gemini as AVAILABLE while nearly every Gemini call was a 503; non-chat models (`grok-imagine-*`) were offered.
5. A fallback could turn two authors into the same model.
6. Raw evidence markers (`[a5505c418699ab68]`) appeared in published ru, ar and ja text.
7. Jobs sat QUEUED for 15 to 40 minutes under load.
8. A note said older Threads vanish from the unfiltered Board first page.

## Decision

1. **Safety scan on prose, with an edit path.**
   - Secrets and e-mail addresses are matched on the whole text, URLs included. Card, national-id and IBAN shapes are matched only on **prose**: link targets, bare URLs and evidence markers are removed first (`stripNonProse`).
   - A card candidate is a digit run with word edges (spaces and dashes allowed) that passes the **Luhn** check. Digits in any script are folded to 0-9 first, which strengthens the scan.
   - `describePublicationSafety` also returns the flagged excerpts (secrets and card numbers masked). `generation-state` carries `safetyBlock { reasons, findings }` and swaps in the newest stored text; the edit result carries `findings` too.
   - The edit route now accepts a `DRAFT` publication that already holds a stored revision (blocked or failed review), and a passing review moves it to `READY_FOR_REVIEW`.
2. **Topic minimum by user-perceived characters.** Letters and numbers only, counted per grapheme; a Chinese, Japanese or Korean character weighs 2.5, so 10 letters or 4 such characters pass. Backend (`topic-length.utility.ts`) and frontend (`thread-topic-length.utility.ts`) hold the same vectors; the form shows a localized hint and keeps Start disabled. The two copies are deliberate: shared-types holds types, and a runtime change there rebuilds every service image.
3. **Slugs keep combining marks.** `[\p{L}\p{M}\p{N}]` survive, text is NFKC then NFC, the cap is 60 code points applied per grapheme, never inside a cluster. The frontend validator allows 96 (60 + `-` + 8 = 69 was beyond the old 64). Stored slugs are untouched, so old links still resolve.
4. **Health-aware recommended team.** The generation service exposes the last hour's per-model success counts (`GET internal/threads/generations/model-health`, the same counts the healing ranking reads). A model with at least 5 calls and under 40% success, or whose provider as a whole shows that, is `DEGRADED`: still selectable with a warning, never preselected, ranked after healthy models; recommendations are ordered by success rate first. A failed health read means no demotion. Names that are not chat models (image, video, embedding, speech) and rows flagged `kind != CHAT`, `REMOVED` or `UNEXPOSED` are dropped from the Threads catalog read.
5. **Distinct authors under fallback.** When an author swaps model, candidates another author uses (its pick, or what it runs now) move behind the unused ones. The step log already records the real provider and model.
6. **Markers resolved server-side, stripped defensively.** `findPublic` turns known evidence ids into `[n]` (citation order), removes unresolved 16-hex ids, and unwraps bracketed addresses, in ASCII, full-width and CJK brackets and any digit script. The frontend `stripUnresolvedSourceMarkers` covers the same forms. Stored revisions are not rewritten (their hash identifies what the Critic reviewed); the public read is the server-side layer.
7. **Wider queue and a visible place in line.** Production runs one generation replica, so the per-replica prefetch (3) was the whole service's concurrency. It is now 6, with 12 worker slots (migration `20261014180000_threads_generation_more_slots`). There is no new `.env` variable: no settings table exists in this service, and these are bounded constants. Owner progress carries `queue { state: WAITING_FOR_WORKER | BACKOFF, ahead, retryAt }` while a job is QUEUED. A job-level retry already releases its slot (QUEUED with `nextAttemptAt`); the in-attempt healing waits (30 s at most, 6 minutes per role) keep the slot, because the slot row is the lease heartbeat's anchor.
8. **Board first page is only pagination.** The unfiltered list is `ORDER BY published_at DESC, slug DESC` with no age window; older Threads are on later pages. Members start filtered to their own language (a filter, shown in the toolbar); guests start on every language. No change.

## Consequences

- A blocked draft is recoverable: the owner sees the excerpt, edits, and the new text is re-scanned. Real secrets, e-mails, Luhn-valid card numbers, SSNs and IBANs still block.
- Six concurrent jobs per replica cost sockets, not CPU; the per-owner cap (2) is unchanged. If provider rate limits bite, lower `GENERATION_REPLICA_CONCURRENCY` (slots stay).
- `ThreadModelAvailability` gained `DEGRADED`; clients treat unknown values as unavailable, so an older frontend simply greys the model.
- Not done: releasing the slot during in-attempt healing waits; fixing the connector sync that labels `grok-imagine-*` as `CHAT`; a DB-level settings table for the queue numbers.
