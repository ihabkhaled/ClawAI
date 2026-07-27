# ADR-064: Session-bound user tokens

**Status**: Accepted
**Date**: 2026-07-27
**Deciders**: ClawAI core team
**Slice**: VS Code extension authentication foundation

## Context

User refresh tokens were stored in plaintext, access tokens were not bound to a
server-side session, and refresh rotation deleted the old row. That design could
not reliably detect replay and increased the impact of a session-table leak.

## Decision

- Store only HMAC-SHA-256 refresh-token digests.
- Bind every user access token to a session with strict issuer, audience,
  algorithm, token-kind, and payload validation.
- Rotate refresh tokens atomically while retaining the used digest for replay
  detection.
- Revoke the full token family when a used, revoked, or expired refresh token is
  presented.
- Scope logout by both authenticated user ID and session ID.
- Delete all existing session rows during the cutover migration, then remove the
  plaintext refresh-token column and require digest and family identifiers.

## Consequences

The migration causes a deliberate one-time sign-out for every active user. Users
must authenticate again after deployment. No password, access token, or refresh
token is logged or migrated.

## Validation

Repository transaction tests, token-session manager replay/expiry/ownership
tests, strict JWT tests, shared guard tests, and the full auth-service gates.

## Rollback

Roll back the application and database together. Restoring the old schema does
not restore deleted sessions; users still authenticate again.
