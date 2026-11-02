# Skill: verify Thread translations on a live stack

Use after a deploy that touches `apps/claw-threads-service/src/modules/publication-translations/`, the Thread page `?lang=` handling or the `translated-threads` sitemap (ADR-217).

## Steps

1. **Rows.** In the threads database: `select status, count(*) from thread_publication_translations group by 1;` then `select locale, failure_code, attempts, count(*) from thread_publication_translations where status <> 'READY' group by 1,2,3;`. Goal: every public Thread has 12 `READY` rows (13 languages minus its own) and no `FAILED`.
2. **Failures.** Read the worker log: `Translation <id> ->xx failed (<code>)`. `BAD_TITLE_SHAPE` is a reply without `TITLE:`/`BODY:` (log shows the first 160 characters); `IMPLAUSIBLE_TRANSLATION` is a cut-off or runaway reply; `MODEL_HTTP_<n>` is the provider (429 is the free-tier limit, it retries with a back-off); `CONNECTOR_NOT_CONFIGURED` means the connector has no key. Reset a row with `update thread_publication_translations set status = 'PENDING' where id = ...` to retry at once.
3. **API.** `GET /api/v1/thread-publications/public/<slug>?lang=ar` returns `translated: true`, the Arabic title and `availableLocales`; `?lang=xx` and a language with no copy return the written text.
4. **Page.** Open `/<app-locale>/threads/<slug>`, pick a language in the dropdown: the URL gains `?lang=`, the article changes language and direction, the app stays in its own language, comments and reactions are untouched. `<link rel="canonical">` is `/<lang>/threads/<slug>?lang=<lang>`.
5. **Sitemap.** `/sitemap.xml` lists `/sitemaps/<lang>/translated-threads-1.xml` for languages with copies; the child lists `/<lang>/threads/<slug>?lang=<lang>`.
6. **Republish.** After an edit or republish the old copies disappear from the API at once and are rebuilt within a few passes (30 s each).
7. **Spec.** `THREAD_TRANSLATION_E2E_SLUG=<slug> PLAYWRIGHT_BASE_URL=<origin> npx playwright test threads-translation`. The local `https://claw.local` dev site reloads in a loop; use `http://localhost:3000` there.

## Traps

- Never route translation through chat-service: that path meters a user's wallet.
- Gemma reasoning blocks (`<thought>`) are stripped before parsing; a new model with another tag needs a `TRANSLATION_REASONING_TAGS` entry.
- A new model must be a credit-free one (owner rule, 2026-11-02). Measure it first: send one 3,000 character chunk through the connector (see the chain comment in `publication-translation.constants.ts`); the order of the chain is the order of measured speed.
