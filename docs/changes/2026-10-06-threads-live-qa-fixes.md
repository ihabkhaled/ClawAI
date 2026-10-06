# Change - Threads live QA fixes

Live browser and API QA of the shipped Threads reader and owner portal found two
defects, both fixed in `apps/claw-frontend`:

- **Raw translation keys.** Threads components called `t('threadX')`, but the keys
  live in the `chat` namespace and `t()` returns a dotless key unchanged, so every
  Threads label rendered as its key. Calls are now `t('chat.threadX')`; the create
  heading uses a new `chat.threadCreateTitle` (13 locales). The new
  `threads-translation-keys.test.ts` resolves every key the Threads UI uses against
  all 13 real dictionaries, because component tests mock `t()` and cannot see this.
- **No article structured data.** The public article now emits `Article` JSON-LD
  (headline, description, canonical URL, publish date, language, real sources as
  `citation`). It is never `ScholarlyArticle` and never claims peer review.

Local-only findings (no repo change): a stale `claw_threads` schema missed
`accepted_revision_id`, and host-generated `src/generated/prisma/package.json`
files carried a UTF-8 BOM that broke the Docker `prisma generate` step.

Evidence: `docs/qa-evidence/2026-10-06-clawai-threads-launch.md` (PARTIAL).

## Code paths traced

apps/claw-frontend/src/app/(marketing)/threads/[slug]/page.tsx
apps/claw-frontend/src/app/(portal)/threads/page.tsx
apps/claw-frontend/src/components/threads
apps/claw-frontend/src/constants/thread-publication.constants.ts
apps/claw-frontend/src/utilities/structured-data.utility.ts
apps/claw-frontend/src/lib/i18n/**tests**/threads-translation-keys.test.ts
