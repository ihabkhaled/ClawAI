# Password Reset Mission Notes

## Audit Status

- [x] **Checked**: Governing brief located at `docs/16-quality-engineering/coding-agent-lab/password-reset-task.md`
- [ ] **Partial**: Feature implementation pending
- [ ] **Missing**: Prisma model, endpoints, frontend routes, locales, tests

## File Plan

1. Database: Prisma schema update + migration for `reset_token` model
2. Backend: Request endpoint (rate-limited), Confirmation endpoint (atomic single-use)
3. Email: Integration with shared abstraction using `FRONTEND_URL`
4. Security: Token redaction, session revocation, hash-only storage
5. Frontend: Forgot password route, Reset password route
6. i18n: Update all 13 locale dictionaries and types
7. Tests: Unit, Integration, E2E, QA evidence

## DONE List

- [x] Mission initialized
- [x] Notes file created

## NEXT Item

Read the governing brief at `docs/16-quality-engineering/coding-agent-lab/password-reset-task.md` to extract detailed requirements before implementation.
