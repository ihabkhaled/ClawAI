# ADR-185: The in-chat consent card parks the turn on a stored, argument-bound request

**Status:** Accepted

**Date:** 2026-10-15

Builds on [ADR-179](adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md), [ADR-172](adr-172-plugin-installs-consent-and-credentials.md) and [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Plan: [plugins-roadmap](../02-business-product/plugins-roadmap/PRODUCT-PLAN.md) (gap: the consent channel for chat).

## Context

A WRITE or DESTRUCTIVE plugin tool call (or any non-READ call in a tainted turn) answered `CONSENT_REQUIRED`, and chat-service told the model "not approved". The only way to make a WRITE tool work was to grant it on the Installed page beforehand, and a DESTRUCTIVE tool could never run from chat. The user needs to be asked in the conversation, and the answer has to be safe against replay, another user, changed arguments, double execution and a user who walks away.

## Decision

**plugin-service owns a consent request. The invoke that needs a yes stores one and returns its id. The turn waits on that request. The same call resumes only by spending the approval.**

- **The request** (`plugin_consent_requests`): user, target (install or own server), tool, risk, `call_id`, conversation and message, the **argument hash**, a redacted and truncated preview (same scrubber as `argsPreview`: secret-looking keys and long tokens replaced, 512 characters), the reason, a status (`PENDING`, `APPROVED`, `DENIED`, `EXPIRED`, `CONSUMED`), the choice, and a deadline (120 s, a constant; nothing here is an env var). Unique on `(user_id, call_id)`. The row is the audit of the question and the answer.
- **Raising it.** `POST /plugins/invoke` and `/internal/plugins/invoke` answer `CONSENT_REQUIRED` with `consent.requestId`, `expiresAt` and `options` (which buttons are allowed). Asking again with the same call id and arguments returns the same request. Different arguments, or a request that ran out of time, reset it to a fresh `PENDING` one. A `DENIED` request with the same arguments stays denied, so a model cannot ask its way past a no.
- **Answering.** `POST /plugins/consent-requests/:id/decision {choice, confirmDestructive?}` for the JWT user only. Choices: `ALLOW_ONCE`, `ALLOW_CHAT` (a per-conversation grant, 24 h, WRITE only, pinned to user + conversation + install or server + tool), `ALWAYS_ALLOW` (the existing install consent, or an own server's tool consent; WRITE for a server), `DENY`. The status change is one conditional update (`PENDING` and not lapsed), in one transaction with the grant it creates; two answers racing produce one winner. The same choice repeated is a clean 200, a different one is `409`. A lapsed request is `410`. Another user's id is `404` everywhere (read, decide, wait).
- **DESTRUCTIVE.** `ALLOW_CHAT` is refused. `ALWAYS_ALLOW` needs `confirmDestructive: true` (the card's second question) and is stored with `confirmed_destructive = true` on the tool consent. Only a confirmed row makes the gate skip the DESTRUCTIVE ask; the Installed page's own grant of a DESTRUCTIVE tool keeps its old meaning (stored, still asks every call). A tainted turn asks anyway: neither a chat grant nor a standing grant beats the taint rule. Own servers get no DESTRUCTIVE standing grant.
- **Resuming.** The loop in chat-service waits on `POST /internal/plugins/consent-requests/:id/wait` (service token, owner in the body), a bounded database poll (<= 20 s per call), asking again until the request's own deadline (ceiling 150 s, at most 10 waits). Because the wait lives in the database, any replica answers and a dropped stream or a restarted tab loses nothing. On `APPROVED` it calls invoke again with **the same `callId` and `consentRequestId`**. plugin-service spends the approval in one conditional update bound to user, call id, tool, target, **argument hash**, `APPROVED`, never consumed, not lapsed. Exactly one caller wins it: no double execution, no replay, no other user, no other arguments. Changed arguments fall through to the gate and open a new question.
- **Deny and timeout.** Deny, expiry, a request already spent, or plugin-service unreachable while waiting all end the call as `BLOCKED` with `PLUGIN_CONSENT_DENIED` or `PLUGIN_CONSENT_EXPIRED`, and the model is told in plain words that the user declined (or did not answer), that nothing changed, and not to retry or work around it. Nothing runs without the spent approval. A server that raises no request (older plugin-service) keeps the old behaviour: "not approved" plus the `PLUGIN_CONSENT_NOT_AVAILABLE` notice.
- **The card.** chat-service emits `plugin_consent_requested` / `plugin_consent_resolved` stream frames (redacted preview, tool, risk, deadline, options; never the call id or the hash). The frontend does not rely on the frame: while a reply is in flight `PluginConsentPrompts` lists `GET /plugins/consent-requests` (bounded, 2 s, at most 3 minutes), so a reload shows the same card. Deny takes first focus, Escape denies, the countdown ends at the deadline, the arguments are `dir="ltr"` plain text, and all strings are in `pluginConsent.*` for the 13 locales. Per-chat grants are listed with Revoke on the Installed page (`GET/DELETE /plugins/chat-grants`); "Always allow" is revoked where it always was.
- **Untouched on purpose.** READ stays frictionless (the flow is never consulted). Rate and concurrency limits, the quota hold, the breaker, the fence, the audit row and the `userApproved` flag keep their meaning.

## Consequences

- **Positive**: WRITE and DESTRUCTIVE tools are usable from chat with an informed, bounded, auditable yes.
- **Positive**: no new infrastructure: the request is a table and the wait is a bounded poll.
- **Negative**: a waiting turn holds a chat-service request for up to the deadline (150 s ceiling); closing the tab does not cancel it, it lapses and denies.
- **Negative**: a spent approval followed by a rate or quota refusal costs the user a second question.
- **Negative**: the wait polls the database every 500 ms per waiting turn (a few per user at most).
- **Not done**: purging old `plugin_consent_requests` rows (the retention job is still unbuilt), a "mine"/request history view, push or email when a turn waits in a background tab.
