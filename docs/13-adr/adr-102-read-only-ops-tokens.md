# ADR-102: Read-only ops tokens are the no-SSH channel into production logs

**Status**: Accepted
**Date**: 2026-09-19

## Context

Reading production logs needed SSH to the host, or a browser session on the
admin Logs page. An operator script or an AI agent had no safe way in. The
existing service token is one shared secret for all service-to-service
traffic, and it can write, so handing it out was not an option.

## Decision

- **Minting:** auth-service owns `ops_access_tokens`. An admin with
  `ADMIN_PERMISSIONS_MANAGE` mints a token on
  `POST /api/v1/admin/ops-tokens` and gets:
  - `claw_ops_` followed by 256 random bits;
  - shown **once**. Only its SHA-256 is stored, plus a 13-character display
    prefix.
- **Limits:** scoped (`LOGS_READ`, the only scope), expiring (1–90 days,
  default 30), at most 10 live tokens per admin, revocable with `DELETE`.
  Every verify counts a use and stamps `lastUsedAt`.
- **Reading:** `GET /api/v1/ops/logs`, `/stats` and `/timeseries`, served by
  server-logs-service, take `Authorization: Ops <token>`. `OpsTokenGuard`:
  - asks auth-service `POST /internal/ops-tokens/verify` over the service
    token;
  - caches a yes for 30 s, keyed by the token's hash;
  - **fails closed** when auth-service is down.
- **Separate from sessions:** the `Ops` scheme cannot be mistaken for a
  Bearer session. An ops token is refused everywhere else, and a session is
  refused on `/ops`.
- **Health** needs no token: `/api/v1/health` is already public.

## Consequences

- A revoked token keeps working for up to 30 s (the cache). Measured live:
  refused 22 s after revoke.
- A leaked token can read logs until it is revoked or expires. It cannot
  write, it cannot act as a user, and it cannot reach any other API.
- Logs can hold user ids and request metadata, so tokens are admin-minted,
  short-lived by default, and every use is counted.

## Verified live (2026-09-19)

| Case                                | Result          |
| ----------------------------------- | --------------- |
| valid token reads                   | 200             |
| no header                           | 401             |
| Bearer session on /ops              | 401             |
| fake token                          | 401             |
| valid token plus one character      | 401             |
| ops token as Bearer on /server-logs | 401             |
| ops token on /admin/ops-tokens      | 401             |
| POST /ops/logs                      | 404             |
| revoked                             | 401 within 30 s |
