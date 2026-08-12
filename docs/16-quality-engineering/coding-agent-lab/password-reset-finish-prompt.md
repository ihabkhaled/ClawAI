# ClawAI prompt — finish Password Reset end to end

Paste the block below into the ClawAI Coding Agent panel. It is written for a
single run with ULTRA effort and AUTONOMOUS_SCOPED permission, against a model
that has proven it can use tools (`kimi-k2.7-code:cloud`, `glm-5.2`,
`qwen3.5:397b`).

It assumes the backend already shipped (see "Already done" below) and asks only
for the remaining work. Do not paste the "Already done" section — it is context
for the human, not the agent.

---

## Already done (do not re-implement)

Verified live against `https://claw.local`:

- `PasswordResetToken` Prisma model + migration `20260809120000_add_password_reset_tokens`, applied; table `password_reset_tokens` exists.
- `PasswordResetRepository` — create / findActiveByTokenHash / consume (atomic `updateMany` + `count === 1`) / deleteAllForUser.
- `PasswordResetManager` — request() and confirm(); argon2id, HMAC token-at-rest, bounded expiry, session revocation.
- `PasswordResetService`, `password-reset.dto.ts`, two `@Public()` endpoints:
  - `POST /api/v1/auth/password-reset/request` → `{ accepted: true }` always
  - `POST /api/v1/auth/password-reset/confirm` → `{ reset: boolean }`
- Module wiring in `auth.module.ts`.
- 11 acceptance checks passed: no enumeration, single-use, replay rejected, old password rejected, new accepted, expired rejected, weak password rejected without burning the token.

## Still missing

Frontend pages, routes, middleware, validation, hooks, 13 locales, the
coming-soon toast, rate limiting, email delivery, and unit tests.

---

## The prompt

```
Finish the Password Reset feature. The backend is DONE and working — do not touch it.

BRIEF: docs/16-quality-engineering/coding-agent-lab/password-reset-task.md
NOTES: docs/16-quality-engineering/coding-agent-lab/password-reset-notes.md — keep DONE/NEXT current.

HARD RULES
1. Every reply is exactly ONE tool call in JSON. No prose until the feature is complete.
2. Never announce. "I will now create X" without a tool call is a failed run.
3. SEND CODE AS LINES: use contentLines / beforeLines / afterLines (arrays, one line per element, no line break inside an element). A raw line break inside a JSON string is what breaks these requests.
4. Read a file and patch it IMMEDIATELY on the next call. Never read two files in a row — an older read is trimmed from your history and you will lose it.
5. Re-read a file for its fresh sha256 before every patch; the hash changes after each write.
6. Keep every call small — under about 20 lines of file content.
7. Command execution works. cwdRootKey is "workspace-1". Use it to verify your own work.

THE BACKEND CONTRACT YOU ARE BUILDING AGAINST (already live, verified)
POST /api/v1/auth/password-reset/request   body {"email": string}                → 200 {"accepted": true}
POST /api/v1/auth/password-reset/confirm   body {"token": string, "password": string} → 200 {"reset": boolean}
Both are public. request() ALWAYS returns accepted:true, even for an unknown address — the UI must never reveal whether an account exists.

VERIFIED FRONTEND DISCOVERY — use it, do not re-derive
- App: apps/claw-frontend (Next.js App Router, locale-prefixed routes /{locale}/...).
- "Forgot password?" today fires a coming-soon toast. Files: src/components/auth/login-form.tsx and src/hooks/auth/use-login-form.ts. Replace the toast with navigation to the new route.
- Pattern is strict: controller hook + dumb component. ZERO hooks and ZERO logic in any .tsx. One controller hook per page.
- Zod schemas live in src/lib/validation/. Routes in src/constants/routes.constants.ts. Types in src/types/, enums in src/enums/, constants in src/constants/.
- middleware PUBLIC_AUTH_PATHS currently holds ['/login','/register']. The two new routes MUST be added or they redirect to login.
- API calls go through a repository in src/repositories/, never inline fetch.
- 13 locales in src/lib/i18n/locales (en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh) plus src/types/i18n.types.ts. Completeness tests hard-code key counts and WILL fail if any locale is missed.

WHAT TO BUILD, IN THIS ORDER

1. src/constants/routes.constants.ts — add FORGOT_PASSWORD and RESET_PASSWORD routes.
2. src/lib/validation/password-reset.schema.ts — Zod: forgotPasswordSchema { email }, resetPasswordSchema { password, confirmPassword } with a refine that they match.
3. src/repositories/auth.repository.ts — add requestPasswordReset(email) and confirmPasswordReset(token, password) hitting the two endpoints above.
4. src/hooks/auth/use-forgot-password-form.ts — controller hook: form state, submit, success flag. On success show the SAME confirmation regardless of whether the address exists.
5. src/hooks/auth/use-reset-password-form.ts — controller hook: reads the token from the query string, form state, submit, and the four outcome states (submitting, success, invalid-or-expired token, malformed input).
6. src/app/(auth)/forgot-password/page.tsx — dumb page, one controller hook, loading + success + error states.
7. src/app/(auth)/reset-password/page.tsx — dumb page, one controller hook, all four states, plus a link back to login on success.
8. middleware — add both routes to PUBLIC_AUTH_PATHS.
9. login-form.tsx + use-login-form.ts — remove the coming-soon toast, navigate to the forgot-password route instead.
10. All 13 locale files + src/types/i18n.types.ts — every new string, real translations, same keys everywhere.
11. Tests: a Vitest test for each new hook, covering success and the failure states.

ACCESSIBILITY AND UX
Labels tied to inputs, a visible focus ring, the submit button disabled while submitting, errors announced to screen readers, and the whole flow reachable by keyboard alone.

VERIFY YOUR OWN WORK BEFORE REPORTING
Run these with the command tool and fix anything they report:
  cd apps/claw-frontend && npm run typecheck
  cd apps/claw-frontend && npm run lint
  cd apps/claw-frontend && npm test

Then report in one short paragraph: what you created, what the gates said, and anything you could not finish.
```

---

## After the agent reports

Do not trust the report. Verify independently:

1. `git status` — attribute every changed file.
2. `npm run typecheck && npm run lint && npm test` in `apps/claw-frontend`.
3. Browser at `https://claw.local/en/login` → "Forgot password?" must navigate, not toast.
4. Submit a known and an unknown address — the two responses must be indistinguishable.
5. Take a token from `password_reset_tokens`, open `/en/reset-password?token=…`, set a new password, confirm login works and the token cannot be replayed.
6. Check all 13 locales contain the new keys.
