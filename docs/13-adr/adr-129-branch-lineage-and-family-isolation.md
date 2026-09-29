# ADR-129 — Branch lineage, and a branch family never feeds itself

## Status

Accepted — 2026-09-29. Extends the 2026-08-28 branching design
(`apps/claw-chat-service/CLAUDE.md` "Branching copies a conversation") and
narrows [ADR-087](adr-087-cross-thread-retrieval.md)'s cross-thread retrieval.
First batch of the chat-supremacy program
([audit](../14-risk-debt/chat-capability-audit-2026-09.md)).

## Context

Branching (`POST /chat-threads/:id/branch`) already copied a conversation up to
one message into a new thread. The audit found four problems:

1. **No lineage.** The branch kept no pointer to its source or fork message, so
   neither thread could say the other existed. Every competitor that ships
   branching (ChatGPT, Gemini, Perplexity Computer — see the
   [benchmark](../02-business-product/chat-competitive-benchmark-2026-09.md))
   lets you get back to where you came from.
2. **The copy lost facts.** Only text/role/model were copied. `metadata` (which
   holds the attachment `fileIds` later turns read back, plus reasoning,
   research and delivery panels) was dropped, and so was `createdAt` — every
   copied row took the same transaction timestamp, and messages are ordered by
   `createdAt` alone, so a branch came back in an order Postgres chose.
3. **The copy reset privacy switches.** `useMemory`, `useContext` and
   `useCrossThreadContext` fell back to column defaults (all `true`), so a
   branch of a memory-off conversation had memory on.
4. **A branch could read its own future.** Cross-thread retrieval excluded only
   the current thread, so a branch could retrieve what the SOURCE said after the
   fork point — exactly what branching is meant to leave behind.

## Decision

1. **Three nullable columns on `chat_threads`** — `branched_from_thread_id`,
   `branched_from_message_id`, `branch_root_thread_id` — plain ids, not
   relations. Deleting a source must neither cascade to nor be blocked by its
   branches; a branch whose source is gone says so (`parentDeleted`).
2. **The root is inherited** (`source.branchRootThreadId ?? source.id`), so a
   branch of a branch shares its grandparent's family and one indexed read
   (`userId, branchRootThreadId`) finds every alternate future of a conversation.
3. **The copy keeps every descriptive field** — metadata, token/cost/latency,
   `originalContent`/`editedAt`, and the original `createdAt`. Only the id is
   fresh (two threads must not claim one message id; receipts hang off it).
4. **The copy carries the three privacy switches** from the source.
5. **Cross-thread retrieval excludes the whole branch family** (root + every
   thread with that root), not just the current thread. Siblings are alternate
   futures of the same fork; none may feed another as "a previous chat".
6. **`GET /chat-threads/:id/lineage`** returns `{ parent, parentDeleted,
forkMessageId, branches }`, owner-checked first and every read user-scoped.
   The frontend renders it as a one-line strip that is `null` for ordinary
   threads (no height cost, rule 40) and a branch icon in the thread list.

## Rejected alternatives

- **Prisma self-relation with `onDelete: SetNull`.** Works, but couples delete
  semantics to a relation for no read benefit; `parentDeleted` is derived from a
  failed owner-scoped lookup instead.
- **Walking ancestors at retrieval time.** N queries per turn and unbounded
  depth; the stored root makes it two indexed reads.
- **Branches as a view over the source (no copy).** Rejected in 2026-08: edit
  truncates, share snapshots and context receipts all assume a thread owns its
  rows.
- **Merge a branch back.** Deferred — needs a product decision on what a merged
  message is; no competitor documents it.

## Consequences

- Branches made before this migration have no lineage (no backfill is possible:
  the source was never recorded). They behave as roots.
- A user asking a branch "what did we decide in the other branch?" gets no
  cross-thread help — deliberate. Opening that branch is one click in the strip.
- Tests: `branch-copy.spec.ts`, `cross-thread-branch-family.spec.ts`,
  `chat-threads.service.spec.ts` (lineage, IDOR, privacy switches),
  `cross-thread-retrieval.manager.spec.ts` (family exclusion); frontend
  `thread-lineage.utility.test.ts`, `thread-lineage-bar.test.tsx`,
  `use-thread-lineage.test.tsx`.

## What would make this stale

A second way to create a thread from another (import, template, assistant
fork) that does not set `branchRootThreadId` — it would silently rejoin
cross-thread retrieval. Any such path must call `branchLineageFor`.
