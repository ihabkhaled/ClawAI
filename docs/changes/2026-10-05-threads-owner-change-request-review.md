# Threads owner change-request review

The owner portal can now list and resolve reader change requests for a selected
published item. Rejection can include a response. Acceptance requires a changed
revision, a user-selected USD cap, and the existing safety/model review; the
revision remains private until the owner separately approves publication.

The UI calls the existing publication-owner endpoints. It adds no permission,
moderation, deletion, public-indexing, or pricing contract. The source language
and public-reader contribution UI remain separate unfinished work.

Paths covered: `apps/claw-frontend/src/app/(portal)/threads/page.tsx`,
`apps/claw-frontend/src/components/threads/thread-change-requests.tsx`,
`apps/claw-frontend/src/components/threads/__tests__/thread-change-requests.test.tsx`,
`apps/claw-frontend/src/repositories/threads/thread-publications.repository.ts`,
`apps/claw-frontend/src/repositories/threads/__tests__/thread-publications.repository.test.ts`,
`apps/claw-frontend/src/enums/thread-publication-change-request-status.enum.ts`,
`apps/claw-frontend/src/types/thread-publication.types.ts`,
`apps/claw-frontend/src/types/i18n.types.ts`,
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
`docs/02-business-product/clawai-threads-product-spec.md`,
`docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`,
`wiki/Threads.md`, this change record, and
`docs/qa-evidence/2026-10-05-threads-owner-change-request-review.md`.

Validation and remaining lanes: [QA evidence](../qa-evidence/2026-10-05-threads-owner-change-request-review.md).
