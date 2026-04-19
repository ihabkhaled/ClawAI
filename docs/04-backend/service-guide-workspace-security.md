# Workspace Security Hardening

## Overview

Prompt 07 of the workspace pack adds the security layer the platform needs before shipping provider adapters that make real outbound calls: SSRF prevention, webhook signature verification, idempotency for write actions, and log redaction for workspace-specific secret paths.

## Controls delivered

### 1. Anti-SSRF — `common/utilities/url-safety.utility.ts`

Any caller-supplied URL (provider `baseUrl`, custom `siteUrl`, PAT test endpoint) passes through `assertSafeOutboundUrl(url, options?)` before it reaches the HTTP client.

Rejects:

- Malformed URLs
- Non-http(s) protocols (`file://`, `ftp://`, `gopher://`, …)
- IPv4 literals in private ranges: `127/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` (AWS metadata), `0.0.0.0`
- IPv6 loopback `::1`
- Bare hostnames `localhost`
- Hosts not on the provided `allowedHosts` list (with `*.example.com` wildcard support)

Wired into:

- `WorkspaceConnectorService.testPat(input.baseUrl)` — rejects with `UNSAFE_BASE_URL` (400)
- `ProviderAppConfigService.validateField` — rejects any `type: 'url'` field that fails safety check with `UNSAFE_URL_FIELD` (400)

### 2. Webhook signature framework — `common/utilities/webhook-signature.utility.ts` + guard

- `verifyHmacSignature(body, hex, secret, 'sha256'|'sha1')` — constant-time HMAC check
- `verifyGithubSignature(body, headerValue, secret)` — expects `X-Hub-Signature-256: sha256=<hex>`
- `verifySlackSignature(body, timestamp, signature, signingSecret, nowMs)` — Slack `v0=<hex>` with 5-minute replay window

Guard: `common/guards/webhook-signature.guard.ts` + decorator `@WebhookProvider('github' | 'slack')`.

Usage pattern (applied per-controller-method when a webhook endpoint is introduced):

```ts
@Post('webhooks/github')
@WebhookProvider('github')
@UseGuards(WebhookSignatureGuard)
handleGithubWebhook(@Body() body: unknown) { … }
```

The guard reads the resolved webhook secret from `request.webhookSecret`. Controllers MUST set this from the matching `WorkspaceProviderAppConfig` (via upstream middleware/interceptor) before the guard runs — otherwise the request is rejected with `WEBHOOK_SECRET_MISSING`.

### 3. Idempotency — `WorkspaceAction.idempotencyKey`

Schema additions:

- `idempotency_key VARCHAR(128)` — caller-supplied; unique per user
- `retry_count INT` — incremented on transient failures
- Unique index `(user_id, idempotency_key)` — a duplicate submit returns the existing action row instead of creating a new one

The action executor (Phase C-2 / Prompt 22) will consume this: same key + same user + same payload → same result, no double-write.

### 4. Log redaction

Pino redact config extended with workspace-specific paths:

- `req.headers["x-slack-signature"]`
- `req.headers["x-hub-signature"]`, `["x-hub-signature-256"]`
- `req.body.clientSecret`, `req.body.personalAccessToken`, `req.body.apiToken`
- `req.body.secretConfig` and `req.body.secretConfig.*`
- `*.encryptedSecret`, `*.encryptedTokens` (anywhere in log object)

Verified by `qa/test-workspace-security.sh` section 6: a PAT test hit with a `super_secret_token_redact_me` value produces zero matches in the last 100 log lines.

## Tests

- `url-safety.utility.spec.ts` — 18 assertions
- `webhook-signature.utility.spec.ts` — 13 assertions
- `qa/test-workspace-security.sh` — 14 assertions (SSRF 5 IPs + protocol + safe URL + config field + schema + redaction + Docker logs)

## Open items (next phases)

- **Rate-limit-aware retry base class** — designed; implementation happens in adapter base class during Phase B (provider implementations). Each provider exposes its rate-limit headers (GitHub `X-RateLimit-*`, Slack `Retry-After`, Jira `Retry-After`).
- **Webhook route wiring** — guard + decorator exist; actual route handlers live in each provider's adapter (Phase B).
- **Connector allowlist** — currently only asserts safe URL; per-provider host allowlists will be added alongside each provider adapter.
- **Tenant isolation tests** — `qa/test-workspace-tenant-isolation.sh` comes with Phase A-5 (test strategy).

## Blockers and evidence

| Gate                                       | Evidence                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| 0 typecheck errors                         | `npm run typecheck`                                              |
| 152 unit tests pass                        | `npx jest`                                                       |
| SSRF QA 14/14                              | `qa/test-workspace-security.sh`                                  |
| Provider registry QA 41/41 (no regression) | `qa/test-workspace-provider-registry.sh`                         |
| OAuth flow QA 24/24 (no regression)        | `qa/test-workspace-oauth-flow.sh`                                |
| Docker logs clean                          | grep of `FATAL\|UnhandledPromiseRejection\|ERR_MODULE_NOT_FOUND` |
