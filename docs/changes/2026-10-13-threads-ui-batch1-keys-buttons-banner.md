# Threads UI batch 1: raw keys, publish banner, shared buttons, contrast, honest progress copy (2026-10-13)

**Why.** The Threads report-reason picker showed `threadPublicReportSPAM`, the owner's suggestion list showed
`threadChangeRequestPENDING`, Publish ended in one line of text with no link, the buttons were plain text, light-theme
progress and review pages failed axe contrast, a queued job said "Freezing your chat" and every job said
"Spent so far: $0.00". The key test only matched `t('literal')`, and component tests echoed the key, so none of it was caught.

**What.**

- Enum-dependent labels go through literal key maps; the key test now reads quoted `chat.`/`common.` literals across the
  Threads files, rejects template keys and checks the maps in 13 locales; label tests use the real dictionary.
- `ThreadLiveBanner` after Publish: live address, copy button, Open live Thread (new tab, no redirect). 4 new keys x 13 locales.
- Shared `Button`/`Checkbox`/`Select`/`Textarea`/`Input`/`Badge` plus lucide icons on the owner action bars, export format
  cards, share icon row (inline SVG marks for Facebook, LinkedIn, X, Reddit), community and report controls; 44px touch
  targets; logical spacing for RTL. Reader suggestions state moved from the TSX into three hooks.
- Light-theme contrast: darker tones with `dark:` tokens for step outcomes, failure card, change-request badges and
  warnings; the draft preview is a focusable read-only field instead of a scrollable `<pre>`.
- `QUEUED` reads "Waiting in the queue" (no stage, no attempt counter, no "still working"); "Spent so far" hidden until above zero.
- A signed-in reader's own like is remembered per user and Thread in `localStorage` and fills the `null` the public
  reactions endpoint returns.
- Frontend keys for the codes the backend work in flight now emits (`QUEUE_EXPIRED` and six start refusals), 13 locales, because
  the contract tests in `thread-generation-code-keys.test.ts` read the service enum and failed without them.

**Not changed.** Backend services. The public reactions endpoint still cannot name the viewer: it needs an optional-auth
read in threads-service (the service and repository already accept a viewer id). Design tokens in `globals.css`. The
generation wizard's three native `<select>` fields (source chat, type, language). The community-load error handling and
Retry from the design (a later batch).

**Prove it.** `npx vitest run` on `src/components/threads`, `src/hooks/threads`, `src/lib/i18n` and the Threads utility
and constants tests; on a running stack: publish a Thread and see the banner, open the report form on a public Thread and
read the reasons, view the review page in the light theme.

Docs: [`docs/05-frontend/threads-buttons-and-publish-banner.md`](../05-frontend/threads-buttons-and-publish-banner.md).
QA: `docs/qa-evidence/2026-10-13-threads-ui-batch1-keys-buttons-banner.md`.
