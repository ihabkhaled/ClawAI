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

Live generation with cloud models (Ollama Cloud, Gemini fallback) found four launch
blockers in `apps/claw-thread-generation-service`, all fixed here:

- **Schema/migration mismatch.** The first migration created
  `spend_cap_micro_credits`; the schema and queries read `spend_cap_micro_usd`, so a
  database built from migrations failed every job. New migration
  `20261006120000_threads_generation_spend_cap_usd` renames it where needed;
  `tools/__tests__/threads-schema-migrations.test.mjs` fails when a mapped column or
  table is missing from a Threads service's migrations.
- **Impossible consensus.** Consensus required byte-identical independent drafts.
  It is now one candidate plus an exact-hash vote by every author.
- **Brittle model output.** Fenced JSON, wrong keys and ungrounded citations failed a
  whole attempt. Prompts now state the exact JSON shape; fences are stripped; a wrong
  or ungrounded answer is retried once per model before its fallback.
- **Silent failures.** Attempt failures are now logged with the failing step and an
  allow-listed gateway error code (never prompts, drafts or provider text).

**Create from chat.** The pack puts the action inside the chat, but Threads could only
be started from the `/threads` portal. The chat header menu now has **Turn into
public Thread**, opening `ThreadCreateDialog` for that chat. Portal and modal share
`useThreadGenerationForm` and `ThreadGenerationForm`, so consent, spend cap and model
roles cannot drift. New: an explicit consent checkbox (the form only had a note),
defaults spread across established cloud providers (they were five copies of the
first model), on-device models excluded, `?publication=` opens the portal on a
publication. 3 strings added in 13 locales; tests for the form, dialog, menu item and
defaults.

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
