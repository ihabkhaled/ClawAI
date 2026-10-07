# Threads: public page, home band, live stages, export and share (2026-10-07)

**Why.** Owner asked for the public face of Threads (a dense marketing page with steps, the home
page, real screenshots), progress an owner can follow, and to let people export and share a Thread.

**What.**

- Public page `/features/threads` (`/threads` is the signed-in portal): announcement, what it is,
  six steps with six real screenshots, safeguards, outputs, use cases, plans, FAQ with FAQPage
  JSON-LD, translated in 13 locales (`constants/threads-marketing-content/`). Registered in the
  content registry, SEO copy (13 locales), footer, sitemap and Lighthouse config.
- Home page band with the four steps (`marketing.home.threads.*`, 13 locales).
- Live stages: the generation worker now records the stage and round (`saveProgress`: author
  drafts, consensus, Judge, Critic), and the review page says it in words ("Authors are writing
  drafts · Round 1") instead of a bare "Loading...". Before, the stage stayed AUTHOR_DRAFTS to the end.
- Export panel (owner and reader): tick several formats and get one ZIP, or one file. Markdown,
  JSON, TOON (owner), HTML and plain text (built in the browser), and PDF through the browser's
  print dialog with a print stylesheet that keeps only the article. The ZIP writer is store-only
  and dependency-free (`zip-store.utility.ts`), checked against Python's `zipfile`.
- Share menu: copy link, the device share sheet where it exists, WhatsApp, Facebook, LinkedIn, X,
  Telegram, Reddit, email. Plain links, no third-party script.
- Owner list now returns the publication slug so a published item can be shared from the review page.
- Fixes found by running it: a draft that opens with its own `# Title` printed the title twice in
  exports; the "not eligible to publish" note stayed visible after publishing; the owner export
  panel appeared before there was anything to export.

**Seen, not changed (owner decisions).**

- A generated article carries raw evidence markers such as `[b9e5088333f64bee]` in its body. The
  public data does not carry the marker-to-source map, so they cannot be shown as numbered notes yet.
- Slugs are random ids, not words from the title.
- The create dialog defaults to credit models (Claude, GPT, Grok); a person with no credit sees
  `PAYG_CREDIT_EXHAUSTED` when it runs. It should default to included models for them.

## Code paths traced

apps/claw-frontend/src/components/marketing/threads/threads-overview-page.tsx
apps/claw-frontend/src/components/marketing/home/threads-band-section.tsx
apps/claw-frontend/src/components/threads/thread-export-panel.tsx
apps/claw-frontend/src/components/threads/thread-share-menu.tsx
apps/claw-frontend/src/utilities/thread-document-export.utility.ts
apps/claw-frontend/src/utilities/zip-store.utility.ts
apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts
apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts
apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts
