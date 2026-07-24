# Backend E2E Standard

End-to-end API testing through the real stack — request enters at nginx (HTTPS :443)
and flows to the owning service, its DB, and the event bus. Proves the wired system
behaves, not just a mocked module.

## Goal

Confirm a real caller, with a real JWT, gets the right result through nginx routing,
auth, validation, business logic, persistence, and (for async flows) eventual
completion — and that logs are clean.

## Setup

1. Obtain a valid JWT via `POST /api/v1/auth/login` (admin seed:
   `admin@claw.local` / `ClawAdmin123!`).
2. Prefer testing **through nginx** (port 443 / `https://claw.local`) to catch routing
   and SSE-buffering issues; test **direct to the service port** (e.g. 4002) only to
   isolate a service bug from an nginx bug.

## What to cover (risk-based, not a quota)

For each endpoint, cover the behaviors that matter:

- **Status codes actually returned** — 200/201 on success; 400 (validation), 401
  (unauthenticated), 403/404 (wrong-user), 409 (conflict), 422 (upload security) on the
  paths that produce them. Never assume a code — assert the real one.
- **Response shape** — required fields present; **forbidden fields absent**
  (`passwordHash`, `encryptedTokens`, `encryptedSecret`, tokens) — see
  [security-testing-standard](security-testing-standard.md).
- **Validation** — over-length inputs, missing required fields, invalid enum values →
  the documented error code.
- **Async flows** — message → SSE events → DB records → poll terminates. Verify a
  terminal record exists even on total downstream failure (else the poller hangs, per
  [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md)).

## SSE endpoints

- Consume with `fetch` + `Authorization` header + `ReadableStream` — **never**
  `EventSource` (it can't authenticate; see
  [`../memory/authentication-lessons.md`](../memory/authentication-lessons.md)).
- Assert stage/content/error events arrive and the stream closes cleanly. Confirm nginx
  `proxy_buffering off` is in effect (events arrive incrementally, not in one buffered
  burst).

## Verification beyond the response

- **DB:** `docker exec … psql -tAc "SELECT …"` — row created/updated/deleted as expected.
- **Logs:** scan the service logs; zero `UnhandledPromiseRejection | FATAL | Cannot read
properties of undefined` — any hit is a blocker
  ([`../memory/observability-lessons.md`](../memory/observability-lessons.md)).

## Idempotency

E2E scripts must be re-runnable without breaking (clean up or upsert). Migrations
additive.

## Related

- [Integration testing](integration-testing-standard.md) · [Frontend E2E](frontend-e2e-standard.md) ·
  [Security testing](security-testing-standard.md) · [Quality gates](quality-gates.md)
