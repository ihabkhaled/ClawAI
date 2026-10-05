# Threads generation cancellation feedback

Paths covered: `apps/claw-frontend/src/app/(portal)/threads/page.tsx`,
`apps/claw-frontend/src/lib/i18n/locales/ar.ts`,
`apps/claw-frontend/src/lib/i18n/locales/de.ts`,
`apps/claw-frontend/src/lib/i18n/locales/en.ts`,
`apps/claw-frontend/src/lib/i18n/locales/es.ts`,
`apps/claw-frontend/src/lib/i18n/locales/fa.ts`,
`apps/claw-frontend/src/lib/i18n/locales/fr.ts`,
`apps/claw-frontend/src/lib/i18n/locales/hi.ts`,
`apps/claw-frontend/src/lib/i18n/locales/it.ts`,
`apps/claw-frontend/src/lib/i18n/locales/ja.ts`,
`apps/claw-frontend/src/lib/i18n/locales/pt.ts`,
`apps/claw-frontend/src/lib/i18n/locales/ru.ts`,
`apps/claw-frontend/src/lib/i18n/locales/th.ts`,
`apps/claw-frontend/src/lib/i18n/locales/zh.ts`,
`apps/claw-frontend/src/repositories/threads/thread-publications.repository.ts`,
`apps/claw-frontend/src/repositories/threads/__tests__/thread-publications.repository.test.ts`,
`apps/claw-frontend/src/types/i18n.types.ts`, `docs/02-business-product/clawai-threads-product-spec.md`,
`docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`,
`wiki/Threads.md`, this change record, and
`docs/qa-evidence/2026-10-05-threads-generation-cancellation-ux.md`.

The owner portal now distinguishes a cancellation request in progress, an
accepted request, a retryable request failure, and the worker's terminal
cancelled state. Accepted requests disable the cancel control to avoid duplicate
submissions. The frontend repository retains the API's `CANCEL_REQUESTED`
response.

Added matching translations for all 13 supported locales. The cancellation
endpoint, authorization, job state machine, and worker stop behavior are
unchanged.

Validation and QA lane evidence: [QA record](../qa-evidence/2026-10-05-threads-generation-cancellation-ux.md).
