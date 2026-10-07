# Threads views and signed-in readers counter (2026-10-07)

**Why.** The pack asked for reach numbers on public Threads without turning the page into a tracker.

**What.**

- threads-service: `POST /thread-publications/public/:slug/view` (public) and `.../reader-view` (signed in). Only public (published, approved, safe, indexable) Threads count; anything else is 404.
- Humans only: crawlers, link previews and scripted clients are never counted (`isBotUserAgent`). A reload inside 30 minutes is one view.
- Privacy: only keyed HMAC hashes are stored (address+browser for visitors, account id for readers), never the address or id. Raw view rows are purged after 30 days; the counters stay. Account deletion removes the reader's hash row and lowers `readerCount`.
- 30 requests per minute per address on both endpoints.
- frontend: the article counts the visit once on load and shows "{views} views · {readers} signed-in readers" (`chat.threadPublicViews`, 13 locales).

**Not built (owner decision).** A modal listing who read a Thread. It needs a consent and privacy decision first.

**Migration.** `20261007110000_threads_views` (additive; counters default 0).

## Code paths traced

apps/claw-threads-service/src/modules/publications/services/publication-views.service.ts
apps/claw-threads-service/src/modules/publications/repositories/publication-views.repository.ts
apps/claw-threads-service/src/modules/publications/controllers/publication-views.controller.ts
apps/claw-threads-service/src/modules/publications/utilities/publication-viewer.utility.ts
apps/claw-threads-service/src/modules/account-deletion/repositories/account-deletion.repository.ts
apps/claw-frontend/src/hooks/threads/use-thread-public-view.ts
apps/claw-frontend/src/components/threads/thread-public-article.tsx
