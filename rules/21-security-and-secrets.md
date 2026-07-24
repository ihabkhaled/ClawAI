# 21 — Security and Secrets

## Purpose

Secrets stay server-side and encrypted; input is validated and bounded; every
service ships the same hardening. Security in ClawAI is layered and uniform — one
service that skips a layer weakens the whole stack.

## Applies to

All services (especially `auth`, `connector`, `file`, `workspace`, `agent`), the
frontend, and `infra/`.

## Mandatory rules

1. **Secrets never reach the frontend and never hit a log.** API keys, tokens,
   passwords, refresh tokens, and encrypted config are stripped from every response
   and redacted in every log (see [19](19-logging-observability-and-redaction.md)).
2. **Encrypt at rest.** Connector credentials use AES-256-GCM (`encryptedConfig`);
   `ENCRYPTION_KEY` is 64 hex chars. Passwords use argon2. Decryption happens only
   in the owning service/adapter, never returned in plaintext.
3. **Validate and bound all input** with Zod, including `.max()` on strings/arrays
   (see [11](11-dtos-and-validation.md)) — the first defense against injection/flooding.
4. **No raw SQL** (Prisma only) and **strict equality** everywhere — mitigates
   injection and coercion bugs.
5. **File uploads run the 4-check pipeline** (`FileSecurityManager`): ClamAV scan,
   magic-byte MIME validation, filename/extension validation, ZIP-bomb detection.
   Failed checks → HTTP 422 with reason codes; ClamAV down → fail-safe reject.
6. **Rate limiting + Helmet on every service** (`@nestjs/throttler`, configurable
   `THROTTLE_TTL/LIMIT`); SSE endpoints `@SkipThrottle()` (long-lived).
7. **TLS end-to-end in local/prod** via mkcert — browser → nginx → services all
   HTTPS with verification; `NODE_EXTRA_CA_CERTS` trusts the local CA. A new
   service's docker hostname is appended to the `install-tls` `HOSTS` array.
8. **Auth enforced everywhere** — the shared guard stack, RBAC, and entitlements
   (see [16](16-authentication-and-authorization.md)); internal endpoints require the service token.

## Prohibited patterns

- Returning `encryptedConfig`, `passwordHash`, `refreshToken`, or tokens in an API response.
- Storing a plaintext credential, or logging a decrypted secret.
- Skipping the upload security pipeline for "trusted" files.
- Adding a new service without its `install-tls` SAN entry (breaks inter-service TLS).

## Correct pattern

```ts
// connector responses map to a sanitized DTO — encryptedConfig never leaves the service
return { id, name, provider, status, baseUrl }; // no encryptedConfig field
```

## Enforcement

- **ESLint** (`eslint-plugin-security`, `no-restricted-syntax`, redaction config) +
  **TS config**.
- **Unit test / QA script** — responses asserted free of sensitive fields; 401/403
  and 422 paths covered (see [22](22-testing-and-coverage.md)).
- **Review checklist** — TLS SAN + upload pipeline confirmed for new surfaces.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Security", "File Upload Security", "TLS via mkcert".

## Definition of done

- [ ] No secret in any response or log; credentials encrypted at rest.
- [ ] Input validated/bounded; no raw SQL; strict equality.
- [ ] Uploads run the full security pipeline; throttler + Helmet present.
- [ ] New service added to `install-tls` HOSTS; auth enforced.
