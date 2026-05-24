# ADR-038 — Context Receipt Store

## Status

Accepted (2026-05-24)

## Context

To answer "why did the AI know that?", each assistant message needs a tamper-evident record of which memories + pack items influenced its prompt. Building this from logs would be brittle and not user-readable.

## Decision

Chat-service owns `chat_message_context_receipts` (id, messageId UNIQUE, threadId, userId, payloadJson, createdAt). After every assistant message, the chat flow writes the `RetrievalBundle` it received from memory-service as the receipt payload. The frontend reads receipts via `GET /chat-messages/:id/context-receipt`, which enforces per-user ownership. REDACTED memories include only the badge + id, never the raw content. Receipts that have no influencing items are not persisted (saves storage; UI shows "no context used").

The endpoint is the foundation for the receipt popover, the "why was this used?" navigation between chat → /memory and chat → /context, and the audit-service consumption of `CONTEXT_RECEIPT_WRITTEN`.

## Consequences

- Adds one DB write per assistant message (when context was used). Acceptable; storage is bounded by message volume.
- Backfill of receipts for historical messages is **not** attempted — the API returns 404 with `legacy: true` for those.

## Related

- ADR-037 (retrieval bundle)
