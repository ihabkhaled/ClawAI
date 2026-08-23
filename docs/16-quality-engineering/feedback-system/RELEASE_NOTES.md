# Release notes — in-app Feedback & Admin ticket management

Branch `feature/full-feedback-system`. Targets the next minor release after
`v1.33.0`. The version itself is stamped by the release lane's
`chore(release): Deployment Release vX.Y.Z` commit, not by this feature branch.

## New

- **Floating in-app feedback reporter.** A single launcher mounted once in the
  portal shell, so every authenticated page has it. Fixed bottom-right, above
  the mobile bottom nav, inside `env(safe-area-inset-*)`, keyboard reachable and
  labelled.
- **Ten feedback types** — Bug Report, General Feedback, Feature Request,
  UI/UX, Performance, Data Issue, Integration Issue, Documentation, Security
  Concern, Other — defined once in `@claw/shared-types` and used by both sides.
- **Rich-text feedback in Markdown**, written with a small formatting toolbar
  (bold, italic, bullet and numbered lists, heading, link, inline code) and a
  live preview rendered through the app's existing `react-markdown` pipeline.
- **Image attachments** by file picker, drag and drop, or clipboard paste, with
  per-file upload progress and per-file errors.
- **Screen capture** via `getDisplayMedia`, previewed before sending and
  removable. A capture failure never blocks submission — paste or upload always
  works instead.
- **Automatic ticket numbers** — `FDB-000001`, allocated server-side from an
  atomic Mongo counter and unique-indexed.
- **Dedicated Admin → Feedback module** with a purpose-built list, status tabs
  carrying live counts, type filter, debounced search, server-side pagination,
  and a responsive card layout below `md` instead of a broken overflow.
- **Full ticket lifecycle** — OPEN, IN_PROGRESS, RESOLVED, CLOSED, ARCHIVED,
  plus reopening — with a central transition map, per-transition timestamps
  (`resolvedAt`, `closedAt`, `archivedAt`, `reopenedAt`) and an append-only
  history trail recording the actor and time of every change.
- **Ticket detail view** showing reporter, page route and URL, viewport, app
  version, browser and locale, the rendered description, attachment thumbnails
  with an enlarged viewer, and the history timeline.

## Security

- **Server-side sanitisation is authoritative.** `feedback-markdown.sanitizer.ts`
  strips every HTML tag and comment, removes C0 control characters, repeatedly
  decodes entity and percent encodings before deciding, and rewrites any
  Markdown link or image whose scheme is not `https:`, `http:` or `mailto:` down
  to plain text. `javascript:`, `data:`, `vbscript:` and `file:` are rejected in
  every encoded and whitespace-padded form. Client-side checks are convenience
  only.
- **Stored XSS is structurally impossible on render.** Feedback is stored and
  rendered as Markdown through `react-markdown` without `rehype-raw`, and no
  feedback surface uses `dangerouslySetInnerHTML` — so raw HTML in a ticket is
  inert even in the Admin panel.
- **Attachment handling reuses the hardened file-service pipeline** (ClamAV,
  magic-byte checks, filename checks, size caps, generated storage ids). The
  feedback layer re-validates ownership, MIME against an image-only allowlist,
  and size on the server, then serves attachments only through an authorised
  admin endpoint that proxies the private internal download — object URLs are
  never exposed.
- **Server-enforced RBAC.** `FEEDBACK_SUBMIT` gates the user endpoints and
  `ADMIN_FEEDBACK_MANAGE` gates every admin endpoint. Hiding the nav item is not
  the control: a non-admin calling an admin route is rejected by the guard.
- **No IDOR.** A user's own-ticket lookup filters by `userId` inside the query
  rather than fetching then comparing.
- **Resource limits** on title, subject, content length, attachment count, per
  file size, total payload size, filename length and search length, enforced by
  Zod on the server.
- **No secrets collected or logged.** The page context deliberately excludes
  cookies, `localStorage`, `sessionStorage`, tokens and authorization headers,
  and failures log context without tokens, headers or file bytes.

## Verified

Full record in [VERIFICATION.md](VERIFICATION.md). In short: 148 audit-service
tests, 1993 frontend tests, 18 live API security assertions, and 25 browser
checks against the running stack — all passing. Live testing found seven
defects, including an IDOR on the own-ticket list and a sanitizer that could be
defeated by nesting; all are fixed with regression coverage.

## Migration

No SQL migration. Tickets live in MongoDB (`feedback_tickets`,
`feedback_counters`) and their indexes — unique `ticketNumber`,
`{status, createdAt}`, `{userId, createdAt}`, `{type, createdAt}` and a text
index over ticket number, title, subject and searchable text — are created by
Mongoose on boot.

Two permissions are added to the fixed catalog. `FEEDBACK_SUBMIT` is granted to
the USER role through the existing boot-time permission reconciler, and ADMIN
receives `ADMIN_FEEDBACK_MANAGE` automatically because the ADMIN seed grants
every permission.

Nginx gains one route, `/api/v1/feedback` → audit-service. No new environment
variable: the feedback module reads the existing `FILE_SERVICE_URL` and
`INTER_SERVICE_AUTH_TOKEN`, already delivered to audit-service through
`env_file`.
