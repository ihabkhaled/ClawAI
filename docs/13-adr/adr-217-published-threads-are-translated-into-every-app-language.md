# ADR-217: Published Threads are translated into every app language

**Status:** Accepted

**Date:** 2026-11-02

Builds on [ADR-182](adr-182-all-threads-sitemaps-list-every-language-under-each-app-locale.md). Guide: [multilingual discovery](../05-frontend/multilingual-discovery.md). Rules: [rule 38](../../rules/38-adsense-eligibility-and-low-value-content.md).

## Context

A Thread is written in one language. Readers of the other twelve app languages could open it but not read it, and search engines indexed it in one language only. The owner wanted every published Thread readable in every app language, with the reader choosing the language on the Thread while the app itself stays in the app language, and with each translation reachable by search engines.

## Decision

1. **A translation is a stored copy.** `thread_publication_translations` holds one row per (publication, language): title, Markdown, the revision it was made from (`source_revision`), status (`PENDING`, `RUNNING`, `READY`, `FAILED`), the model, the attempt count and a failure code. Readers see a copy only while `source_revision` equals the revision being served, so an edit or republish hides the old copy at once and the worker rebuilds it.
2. **A reconciler, not an event.** `PublicationTranslationWorkerService` in threads-service wakes every 30 seconds and asks the database which (published Thread, language) pairs have no current copy. First publish, republish, edit, a missed pass and Threads published before this existed are the same case. Replicas share the work through an atomic claim (`INSERT ... ON CONFLICT DO UPDATE ... WHERE`) with a 15 minute lease, so a dead worker's row is taken over. A failed pair retries with a growing back-off, up to 6 attempts per revision. Six translations run at once in a slot pool (a tick fills only the free slots), two chunks of one translation at a time, newest Thread first so a Thread published today is not queued behind a backfill, and each finished chunk refreshes the claim so a long Thread keeps it past the lease.
3. **The platform pays, with models that cost no credit.** The worker calls the provider directly with the connector's key (as image-service does), never through a user's wallet. The chain is ordered by measured speed on production (a 3,000 character chunk): the included Ollama cloud models first (`gemma4:31b` 2.7 s, `deepseek-v4.1-flash` 2.5 s, `gpt-oss:120b` 7.9 s), then the free Gemma models on the Gemini API (`gemma-4-31b-it` 95 s, because it reasons first). `glm-5.3-flash` is excluded: it answered without the title and body shape. The first that answers wins; a refused or failing model is skipped. Owner decision, 2026-11-02.
4. **Long text is translated in chunks** of about 3,000 characters at blank lines, never inside a code fence. The title rides with the first chunk. Reasoning blocks (`<thought>`) are stripped; a reply that does not follow the shape, is implausibly short or long, or breaks the code fences is a failure, not a translation. A copy that brings a link, an HTML tag or a script address the source did not have is rejected too (`UNEXPECTED_LINK_OR_MARKUP`), so text inside an article cannot talk the model into planting one.
5. **The language of the text is not the language of the app.** `GET /thread-publications/public/:slug?lang=xx` returns the translated title and text when a current copy exists, otherwise the Thread in its own language. The response names `sourceLocale`, `translated` and `availableLocales`. The page shows a language select; choosing a language changes only `?lang`. The app locale in the path, the comments and the reactions are untouched.
6. **Each translation is its own crawlable page.** `/<lang>/threads/<slug>?lang=<lang>` canonicalises to itself; the written language keeps its own canonical; every language is listed as an `hreflang` alternate. A new sitemap family `/sitemaps/<lang>/translated-threads-N.xml` lists the current copies of that language (threads-service `scope=translated`), and the sitemap index lists it only for languages that have copies.
7. **The home page leads with Public Threads.** A card under the logo links to `/threads/discover` with a one-line description.

## Consequences

- Up to 12 model calls (more for long Threads) per published Thread, at no credit cost but with free-tier rate limits; a burst of publishes drains over several passes.
- A translation is machine output. The page says so and links to the original.
- `source_revision` makes staleness structural: there is no invalidation event to lose.
- Reversible: dropping the table and the worker returns the previous behaviour; the `?lang` parameter is ignored when no copy exists.
- Open: quality review per language by a native reader; Search Console watch for "duplicate, Google chose different canonical" on `?lang` pages.
