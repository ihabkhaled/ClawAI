# ADR-018 — Universal Webhook Receiver

**Status:** Accepted (2026-05-01)
**Supersedes:** ADR-018 reservation in `adr-018-027-workspace-automation-reservations.md`
**Stream:** 11

## Context

The workspace-automation initiative needs a single, secure entry-point for inbound webhooks from every supported provider (GitHub, GitLab, Bitbucket, Atlassian, Slack, Figma, etc.). Each provider signs payloads differently, requires distinct delivery-id headers, and expects different acknowledgement semantics. Building one verifier per consumer module would scatter the secret-handling and replay-protection logic.

## Decision

Implement a single receiver module (`apps/claw-workspace-service/src/modules/webhooks/`) with:

- One public route: `POST /api/v1/workspace/webhooks/:provider/:connectorId`. Marked `@Public()` (no JWT) — auth is the HMAC signature.
- A pluggable verifier registry keyed by provider; verifiers use `crypto.createHmac` + `crypto.timingSafeEqual` only.
- A request-scoped raw-body middleware (`/api/v1/workspace/webhooks/.+`) captures the byte-exact body before the JSON parser sees it. Without this, recomputed HMAC drifts.
- Idempotency via `WebhookDelivery (provider, externalDeliveryId)` unique constraint. Replays return `200 IDEMPOTENT` rather than reprocessing.
- Body-size cap (`WEBHOOK_BODY_MAX_BYTES`, default 1 MiB). Oversized → `200 REJECTED` with reason code (HTTP 200 by design — providers retry on 4xx/5xx, but the receipt is still recorded for visibility).
- Always return HTTP 200 with `{ status }`. The provider treats anything non-2xx as a failure and may retry indefinitely; we keep status detail in the response body.

## Consequences

- One audit-logged code path for every provider.
- Replay-protection coverage is uniform; we don't accidentally forget it for one provider.
- Adding a new provider is a 30-line `webhook-signature-verifiers.utility.ts` addition + a verifier registration.
- `200 REJECTED` semantics are non-standard and need to be documented; the alternative (real 4xx) caused infinite retry storms in early prototypes.

## Verification

- `qa/test-stream-11-webhook-receiver.sh` exercises ACCEPTED, REJECTED, IDEMPOTENT.
- 9 unit tests in `webhook-signature-verifiers.utility.spec.ts` cover each provider's HMAC quirks.
