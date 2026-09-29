# ADR-130 — Quotes are structured, provenance-checked, and assembled per request

## Status

Accepted — 2026-09-30. Chat-supremacy Batch 2 (pack batch B), after
[ADR-129](adr-129-branch-lineage-and-family-isolation.md). Audit:
[chat capability audit](../14-risk-debt/chat-capability-audit-2026-09.md).

## Context

A user could not point at part of an earlier answer and ask about it. The only
way was to copy the text into the prompt, which loses where it came from and
bloats the stored message. Perplexity documents "highlight to add to a
follow-up"; ChatGPT's quote-reply is widely used but not first-party
documented ([benchmark](../02-business-product/chat-competitive-benchmark-2026-09.md)).

## Decision

1. **A structured field, not pasted text.** `POST /chat-messages` accepts
   `quotes: [{ sourceMessageId, text }]` — at most 3, text 1–2,000 characters
   (`message-quotes.constants.ts`; the frontend mirrors them in
   `chat-quote.constants.ts`). A quote alone makes a sendable turn ("explain
   this" with nothing typed), exactly as a file does.
2. **Provenance is checked before anything is stored.** Every
   `sourceMessageId` is read under `WHERE threadId = <this thread>` and role
   USER/ASSISTANT (`ChatMessagesRepository.findQuotableInThread`). A missing id —
   deleted, rewound, or from another conversation — is **404
   `QUOTE_SOURCE_NOT_FOUND`**, never a silent drop. The stored quote records the
   source's role.
3. **Stored on the user row's `metadata.quotes`; `content` stays what the user
   typed.** The model sees the quote because the three prompt builders (chat,
   Gemini-native, single-string) wrap the turn with `withQuotedContext`: a
   one-line heading and a Markdown blockquote above the typed text. It is
   applied to **every** quoted turn in history, not only the latest, so a
   follow-up still knows what was being discussed. Every other path that hands
   the user's request to a model — judge, critic, the image prompt, the file
   prompt, the estimate fallback — reads it through `latestUserTurnText`, and
   `quoted-turn-accessor.spec.ts` fails if a manager reads the last user
   `content` raw again. Paths that detect what the USER typed ("continue",
   "remember this", image-edit intent) and the `userContent` handed to memory
   extraction read `content` directly **on purpose**: a quote is someone
   else's words.
4. **Routing and memory relevance see the quote too.** `resolveRoutingContent`
   wraps EVERY quoted turn, so `message.created.content` carries the heading and
   blockquote whenever quotes exist (and a quote-only turn is never empty, which
   routing would drop). The memory-relevance intent includes the quote as well.
5. **Frontend.** A selection inside ONE message element (`data-quote-source-id`)
   offers a floating "Quote" button; a selection spanning two messages has no
   single source and is not offered. Quotes wait per thread in a small Zustand
   store (`quote-draft.store.ts`), show as removable chips above the textarea,
   ride on the next send, and are cleared only when the send succeeds — a failed
   send keeps them, like the draft. The user bubble shows what it replied to.
   `QUOTE_SOURCE_NOT_FOUND` renders as translated text (`chat.quote.sourceMissing`).

## Rejected alternatives

- **Verify the quoted text is a substring of the source.** A selection is taken
  from the rendered Markdown, which drops `**`, list markers and code fences, so
  honest quotes would fail. The id is the provenance; the text is the user's
  chosen words.
- **Persist the quote inside `content`.** It would show in the bubble, feed the
  edit box, and make "what the user typed" unrecoverable.
- **Pass the quote only on the latest turn.** The next question ("and the
  price?") would lose its referent.

## Consequences

- Quoting from citations, file previews, research reports and generated
  documents is **not** in this batch — those surfaces have no message id to cite
  and arrive with batches M and D (a `sourceKind` field will be added then).
- A quoted source that is later edited keeps the quote readable: the words are
  stored with the turn.
- A branch (ADR-129) copies `metadata.quotes` with the rest of the metadata, so
  a branched turn's `sourceMessageId` points into the SOURCE thread. Harmless:
  rendering and prompts use the stored `text`, and nothing re-resolves the id.
- The one line in `useThreadDataController.handleSend` that attaches the waiting
  quotes has no dedicated hook test (that controller has no test harness); it is
  covered by `toQuoteRequest`'s unit test and is the path the live check walks.
- Tests: `quoted-turn.utility.spec.ts`, `quote-fields.dto.spec.ts`,
  `context-assembly-quoted-turn.spec.ts`, `chat-messages.service.spec.ts`
  (quotes); frontend `message-quote.utility.test.ts`,
  `quote-draft.store.test.ts`, `quote-components.test.tsx`,
  `use-selection-quote.test.tsx`, `use-send-message.test.tsx`,
  `api-error-message.utility.test.ts`.

## What would make this stale

A new prompt builder that reads `message.content` without `withQuotedContext`,
or a manager that reads the last user turn raw — the model would silently stop
seeing quotes on that path. The second is caught by
`quoted-turn-accessor.spec.ts`; the first only by
`context-assembly-quoted-turn.spec.ts` covering the builder.
