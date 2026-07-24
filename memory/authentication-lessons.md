# Authentication Lessons

Durable lessons about proving _who_ a caller is (JWT + refresh rotation, argon2,
service tokens, inter-service TLS). Authorization (_what_ they may do) is in
[authorization-lessons](authorization-lessons.md). See [README](README.md).

---

### Streaming auth can't ride convenience APIs — and never in the URL (2026-07-24)

**What happened.** Authenticated SSE couldn't set an `Authorization` header via
`EventSource`; the tempting fix (token in a query param) leaks it into logs, history,
and `Referer`.

**The durable lesson.** Credentials belong in headers, full stop. If an API can't
carry a header, it's the wrong API for an authenticated request — not an invitation
to put the token somewhere less private.

**How to apply.** Authed streams use `fetch()` + `Authorization: Bearer` +
`ReadableStream`. Never place tokens in URLs. The REST 401→refresh→retry interceptor
does NOT cover streams — handle stream 401s explicitly (reconnect with a fresh token,
bounded retries).

**Related.** [known-pitfalls](known-pitfalls.md); `CLAUDE.md` → Authentication gotchas.

---

### Refresh-token rotation only works if every hop actually rotates (2026-07-24)

**What happened.** JWT access tokens are short-lived with rotating refresh tokens.
Any code path that reuses a stale token (e.g. a background lane re-issuing an old
service token) breaks the security property.

**The durable lesson.** Rotation is a whole-system invariant, not a login-only step.
A single path that clings to an old credential reopens the window rotation was meant
to close.

**How to apply.** Centralize token acquisition; never cache a token past its rotation
boundary. When one lane re-issues a service token for an internal call, ensure the
receiving guard accepts freshly-issued service tokens (a past parallel-compare bug was
exactly a `ServiceTokenGuard` rejecting a re-issued token).

**Related.** [authorization-lessons](authorization-lessons.md).

---

### Inter-service HTTPS needs the new hostname on the cert (2026-07-24)

**What happened.** Local TLS via mkcert secures every hop browser→nginx→service. A
new service's docker hostname absent from the leaf cert's SAN list causes inter-service
calls to fail with `Hostname/IP doesn't match certificate`.

**The durable lesson.** Adding a TLS-terminating endpoint is incomplete until the
certificate names it. The failure is silent until the first cross-service call.

**How to apply.** When adding a service, append its docker hostname to the `HOSTS`
array in `scripts/install-tls.{sh,ps1}` and reissue. `NODE_EXTRA_CA_CERTS` must point
at the local CA so node's fetch trusts it. `resolveHttpsOptions()` falls back to HTTP
gracefully if certs are missing — don't mistake that fallback for "TLS works."

**Related.** ADR-049 local-tls-everywhere-mkcert;
[deployment-lessons](deployment-lessons.md).

---

### Never log secrets — extend redaction, don't bypass it (2026-07-24)

**What happened.** Tokens/passwords/api-keys risk landing in logs via full
request/response dumps.

**The durable lesson.** A secret in a log is a leaked secret with a long tail (30-day
log TTL, downstream aggregation). Redaction must be the default, applied before the
log line is built.

**How to apply.** Use `safeStringify` (redacts token/password/apiKey/refreshToken/
secret/authorization). Extend the Pino redaction config for new sensitive fields;
never disable it. Never log full bodies that may contain credentials.

**Related.** [observability-lessons](observability-lessons.md).
