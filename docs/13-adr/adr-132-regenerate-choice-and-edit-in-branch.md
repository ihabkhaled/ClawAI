# ADR-132 — Regenerate with a chosen model, and edit without losing history

## Status

Accepted — 2026-09-30. Chat-supremacy Batch 4 (pack batch E), after
[ADR-130](adr-130-branch-lineage-and-family-isolation.md) (branch lineage).
Audit: [chat capability audit](../14-risk-debt/chat-capability-audit-2026-09.md).

## Context

- **Regenerate** answered again only with the thread's pinned model, or the
  mode the turn was first routed with. There was no "try again with another
  model" or "let AUTO choose" — Perplexity's "Rewrite with…" is exactly that
  ([benchmark](../02-business-product/chat-competitive-benchmark-2026-09.md)).
- **Regenerate skipped the plan gate.** `regenerateMessage` never called
  `assertCanSendMessage`, and its `message.created` event carried no
  `allowedModels` / `modelAccessMode`. Routing treats a missing mode as
  restricted (fail-closed, not a bypass), so regenerate could be degraded or
  refused for plans that allow the model — and a forbidden manual pick, had one
  been possible, would have met no check before the event.
- **Editing is destructive.** `POST /chat-messages/:id/edit` deletes every
  message after the edited one. The warning is honest, but there was no way to
  ask a question differently while keeping the original answer.

## Decision

1. **`POST /chat-messages/:id/regenerate` takes an optional body**
   `{ routingMode?: AUTO | MANUAL_MODEL, provider?, model? }`
   (`regenerate-message.dto.ts`; manual needs both ids). An empty body — or no
   body at all, which Express delivers as `undefined` — keeps the old rule. `resolveRegenerateRouting` is the one place that decides.
2. **Regenerate AND edit-and-rerun pass the same plan gate as a new message**
   (the edit had the same gap; it now checks BEFORE rewriting or deleting
   anything, so a refused user loses nothing):
   `assertCanSendMessage(userId, { provider, model, promptTokens })` before
   anything is published, and the event carries `allowedModels` and
   `modelAccessMode` like `createMessage`'s. A forbidden model or a spent quota
   is refused up front (rule 46 §1).
3. **"Try again with…"** beside Regenerate reuses the composer's `ModelPicker`
   (same groups, badges, ordering) with an AUTO option; a pick regenerates.
4. **`POST /chat-threads/:id/branch` takes `cut: INCLUDE | BEFORE`**
   (`BranchCut`; default INCLUDE = unchanged). BEFORE stops just short of the
   pivot (`createdAt < pivot`).
5. **"Edit in a new branch"** in the edit dialog branches BEFORE the message,
   writes the edited text into the new branch's composer draft, and opens it.
   **Nothing is sent**: no provider call and no charge until the person presses
   Send, and the original conversation is untouched.

## Rejected alternatives

- **Version arrows on one thread** (ChatGPT/Gemini style). Needs a message-tree
  schema and a variant switcher across every renderer; the branch model already
  exists (ADR-130) and gives the same "keep both" outcome with a real thread.
- **Auto-send the edited question in the branch.** One click would silently
  spend credit; a prefilled composer keeps the cost decision with the person.
- **A separate "regenerate with" endpoint.** Same resource, same checks — one
  endpoint with an optional body.

## Consequences

- A user at quota can no longer regenerate or edit-and-rerun (previously nothing
  stopped the attempt before the event). This is the intended parity with sending.
- "Send this answer to Repair/Verify/Compare" and "continue a truncated answer"
  remain open under batch E; the audit row says so.
- Tests: `regenerate-routing.utility.spec.ts`, `chat-messages.service.spec.ts`
  (AUTO, manual + plan check, refusal before publish, access mode on the event),
  `branch-copy.spec.ts` (cut), `chat-threads.service.spec.ts` (cut passthrough);
  `message-created-publishers.spec.ts` (every publisher carries the access mode);
  frontend `use-regenerate-with-model.test.tsx`, `use-message-edit.test.tsx`.

## What would make this stale

A new re-run path (continue, lane retry, send-to-lab) that publishes
`message.created` without `assertCanSendMessage` and the access fields — the
gap this ADR closed for regenerate and edit. `message-created-publishers.spec.ts`
fails for such a path; the Runtime V2 coding-agent start is its one allowlisted
exception (fail-closed).
