# Password Reset Mission Notes

## Audit Status

- [x] **Checked**: Governing brief located at `docs/16-quality-engineering/coding-agent-lab/password-reset-task.md`
- [x] **Backend**: DONE — verified live, do not touch.
- [ ] **Partial**: Frontend in progress (see DONE/NEXT below).
- [ ] **Missing**: forgot-password/reset-password pages, controller hooks, middleware wiring, login-form toast removal, 13 locales, tests.

## File Plan

1. Database: Prisma schema update + migration for `reset_token` model — DONE.
2. Backend: Request endpoint (rate-limited), Confirmation endpoint (atomic single-use) — DONE (rate limiting deferred, tracked separately).
3. Email: Integration with shared abstraction using `FRONTEND_URL` — deferred, tracked separately, not required for this mission's scope.
4. Security: Token redaction, session revocation, hash-only storage — DONE.
5. Frontend: Forgot password route, Reset password route — IN PROGRESS, see below.
6. i18n: Update all 13 locale dictionaries and types — NOT STARTED.
7. Tests: Unit, Integration, E2E, QA evidence — NOT STARTED for frontend.

## DONE List

- [x] Backend feature complete and verified (password-reset-finish-prompt.md "Already done" section).
- [x] `src/repositories/auth/auth.repository.ts` — `requestPasswordReset(email)` and
      `confirmPasswordReset(token, password)`, hitting the two live endpoints.
- [x] `src/types/auth.types.ts` — `RequestPasswordResetRequest/Response`,
      `ConfirmPasswordResetRequest/Response`.
- [x] `src/lib/validation/password-reset.schema.ts` — `forgotPasswordSchema`,
      `resetPasswordSchema` with the password/confirmPassword `.refine()`.

## Known incident — do not repeat

A prior run used the `update` operation kind (whole-file replace) on
`routes.constants.ts` to add two routes, and in doing so overwrote roughly 80
unrelated, real, in-use routes (CHAT, CONNECTORS, MODELS, ROUTING, WORKSPACE,
ADMIN, BILLING, AGENT, etc.) with hallucinated ones from an unrelated app. This
was caught and reverted before it reached a commit. **`routes.constants.ts`
MUST be edited with `patch` (exact hunks), never `update`** — it is a large,
heavily-depended-on file and a whole-file replace risks silently destroying
unrelated routes that are not in the model's immediate context.

## NEXT Item

1. `src/constants/routes.constants.ts` — add `FORGOT_PASSWORD: '/forgot-password'`
   and `RESET_PASSWORD: '/reset-password'`, and add both to `PUBLIC_ROUTES`. Use
   `patch`, not `update`.
2. `src/hooks/auth/use-forgot-password-form.ts` and
   `src/hooks/auth/use-reset-password-form.ts` — controller hooks.
3. `src/app/(auth)/forgot-password/page.tsx` and
   `src/app/(auth)/reset-password/page.tsx` — dumb pages.
4. middleware — add both routes to `PUBLIC_AUTH_PATHS`.
5. `src/components/auth/login-form.tsx` + `src/hooks/auth/use-login-form.ts` —
   remove the coming-soon toast, navigate to `/forgot-password` instead.
6. All 13 locale files + `src/types/i18n.types.ts`.
7. Vitest tests for each new hook.
8. `cd apps/claw-frontend && npm run typecheck && npm run lint && npm test`.
