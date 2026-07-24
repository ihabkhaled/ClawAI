---
name: security-review
summary: Review a ClawAI change for secrets handling, AES-256-GCM encryption, Pino redaction, Zod .max() input validation, no-secret-to-frontend exposure, and helmet/throttle transport hardening.
task_keywords:
  [
    security review,
    secrets,
    encryption,
    aes-256-gcm,
    redaction,
    zod max,
    input validation,
    secret exposure,
    helmet,
    throttle,
    ssrf,
    injection,
    sensitive fields,
  ]
applies_to: [apps/claw-*, apps/claw-frontend, packages/shared-auth, packages/shared-utilities]
required_rules: [08-security-rules, 02-backend-rules]
required_context:
  [security-architecture, api-security-checklist, CODE_REVIEW_AND_PR_REVIEW_STANDARD]
affected_workspaces: [apps/claw-*, apps/claw-frontend]
required_tests: [review-only]
required_docs:
  [docs/03-architecture/security-architecture, docs/03-architecture/api-security-checklist]
validation_lane: cd apps/claw-<service> && npm run typecheck && npm run lint && npm test && npm run build
---

**When to use**

- Any change touching secrets, connector configs, encryption, logging, DTO validation, headers, or API response shapes.

**When NOT to use**

- Pure RBAC/permission/ownership questions → use `./authorization-review.md`.
- Event payload validation focus → use `./event-contract-review.md`.

**Read first**

- `./resolve-task-context.md` — run the context resolver.
- `rules/08-security-rules.md` (secrets, input validation, injection, transport, sensitive-data exposure, OWASP checklist).

**Repository discovery steps**

1. `git diff` and flag any file referencing `encrypt`, `token`, `apiKey`, `password`, `secret`, `config`.
2. Locate all new/changed Zod DTOs and API response mappers.
3. Identify new outbound HTTP calls (SSRF surface) and any file-upload endpoints.

**Tests-first plan**

- Confirm DTO fuzz tests exist (valid + boundary + null/empty/overflow) for every changed Zod schema.
- Confirm response-shape tests assert sensitive fields are ABSENT.

**Implementation steps (review checklist)**

1. **Secrets never logged**: no `authorization`, `password`, `refreshToken`, `apiKey`, `token`, `secret` in log statements; Pino redaction covers new sensitive fields.
2. **Encryption**: connector API keys stored AES-256-GCM (`encryptedConfig`); `ENCRYPTION_KEY` 64 hex; never home-rolled crypto.
3. **No secret in responses**: `encryptedConfig`/`encryptedTokens`/`passwordHash` stripped in the REPOSITORY mapping layer, never returned to FE.
4. **Zod validation**: every DTO validated; every `z.string()` has `.max()`, every `z.array()` has `.max()`; validate at HTTP controllers AND RabbitMQ consumers.
5. **Injection**: Prisma only (no raw SQL); no `eval`/`new Function`; no `dangerouslySetInnerHTML`; no `child_process.exec` with user input; filename sanitization on uploads.
6. **File uploads** go through `FileSecurityManager` (antivirus + magic byte + filename + zip-bomb); failed check → 422.
7. **Transport**: Helmet headers present; CORS limited to `CORS_ORIGINS`; `@nestjs/throttler` active; `@SkipThrottle()` on SSE endpoints; `X-Request-ID` propagated.
8. **Tokens**: never in URL query params; SSE uses `fetch()` + Authorization header, never `EventSource`.
9. **SSRF**: connector/config URLs validated before outbound requests.

**Security considerations**

- Fail-safe defaults: if antivirus/ClamAV is down, reject rather than pass.
- Secrets never surface to the frontend bundle or client logs.

**Failure modes**

- New DTO string missing `.max()` → payload-flood DoS.
- Sensitive field stripped in service layer instead of repository (leaks on alternate read path).
- Refresh token or apiKey appearing in a log line.
- SSE endpoint missing `@SkipThrottle()`.

**Validation commands**

- `rg -n "z\.string\(\)(?!.*\.max)" apps/claw-<service>/src` — strings lacking `.max()`.
- `rg -n "encryptedConfig|encryptedTokens|passwordHash" apps/claw-<service>/src/**/*.repository.ts` — confirm stripped, not returned.
- `rg -n "console\.log|EventSource|new Function|eval\(" apps/claw-<service>/src apps/claw-frontend/src`.
- Gate lane: `cd apps/claw-<service> && npm run typecheck && npm run lint && npm test && npm run build`.

**Documentation updates**

- Update `docs/03-architecture/security-architecture.md` / `api-security-checklist` if a boundary changed.

**Definition of done**

- Per-PR security checklist in `rules/08-security-rules.md` fully checked; no secret in logs/responses; gate lane green.
