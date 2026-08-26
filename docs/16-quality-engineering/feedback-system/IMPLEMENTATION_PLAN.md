# Feedback / Bug-Report / Ticket System — implementation plan

Branch `feature/full-feedback-system` · worktree `D:\Freelance\Claw-feedback-system`
Base `origin/main` @ 75426b6d.

Every decision below was checked against the code in this worktree. Follow it —
do not invent a different architecture.

---

## 0. Architecture decisions (already made, do not re-litigate)

| Question                              | Decision                                                                                                                                             | Why                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which service owns tickets?           | **`apps/claw-audit-service`** (MongoDB/Mongoose), new module `src/modules/feedback`                                                                  | It already owns audit/history semantics, has `AuthGuard` + `RolesGuard` + `@RequirePermissions` + `ZodValidationPipe` + pagination constants, and Mongo needs no Prisma migration across 13 clients. A new microservice would drag in the whole 18-item infra checklist for no benefit. |
| Rich text format                      | **Markdown, never HTML**                                                                                                                             | The frontend already renders Markdown with `react-markdown` + `remark-gfm` (`src/lib/markdown/markdown-renderer.tsx`) and **does not** use `rehype-raw`, so raw HTML is inert by construction. This removes the entire stored-XSS class instead of trying to sanitize HTML.             |
| Attachments                           | **Reuse `claw-file-service`** (`POST /api/v1/files/upload`, base64 `content`)                                                                        | It already runs ClamAV, magic-byte checks, filename checks, ZIP guards, size caps, and stores privately with generated IDs. Do not build a second upload pipeline.                                                                                                                      |
| Admin viewing a reporter's attachment | feedback module proxies `GET /api/v1/internal/files/download-internal/:id` on file-service using `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>` | Same pattern as `apps/claw-chat-service/src/common/utilities/inter-service-auth.utility.ts`. **No new env var** — `INTER_SERVICE_AUTH_TOKEN` and `FILE_SERVICE_URL` already exist in root `.env`.                                                                                       |
| Screenshot capture                    | `navigator.mediaDevices.getDisplayMedia()` → `<canvas>` → PNG data URL → upload as an attachment                                                     | No new dependency, works in Chrome/Edge, user explicitly picks what is shared. Paste/upload stays as the always-available fallback; a capture failure must never block submission.                                                                                                      |
| Ticket numbers                        | Mongo counter doc, `findOneAndUpdate({_id:'feedback'}, {$inc:{seq:1}}, {upsert:true, returnDocument:'after'})` → `FDB-000001`                        | Atomic and race-safe server-side; unique index on `ticketNumber`.                                                                                                                                                                                                                       |
| RBAC                                  | two new `Permission` values: `FEEDBACK_SUBMIT` (user) and `ADMIN_FEEDBACK_MANAGE` (admin)                                                            | The repo uses permission-level RBAC with a DB-backed role→permission matrix. Do not add a role.                                                                                                                                                                                         |

---

## 1. Batches

### Batch 1 — shared contracts + persistence

1. `packages/shared-types/src/enums/permission.enum.ts` — add `FEEDBACK_SUBMIT`,
   `ADMIN_FEEDBACK_MANAGE`.
2. `packages/shared-types/src/enums/` — add `feedback-type.enum.ts`
   (`BUG_REPORT`, `GENERAL_FEEDBACK`, `FEATURE_REQUEST`, `UI_UX`, `PERFORMANCE`,
   `DATA_ISSUE`, `INTEGRATION_ISSUE`, `DOCUMENTATION`, `SECURITY_CONCERN`,
   `OTHER`) and `feedback-status.enum.ts` (`OPEN`, `IN_PROGRESS`, `RESOLVED`,
   `CLOSED`, `ARCHIVED`). Export both from the package index.
3. `packages/shared-constants/src/` — `feedback.constants.ts`:
   `FEEDBACK_TICKET_PREFIX = 'FDB'`, `FEEDBACK_TICKET_NUMBER_PAD = 6`,
   `FEEDBACK_MAX_TITLE_LENGTH = 160`, `FEEDBACK_MAX_SUBJECT_LENGTH = 200`,
   `FEEDBACK_MAX_CONTENT_LENGTH = 20000`, `FEEDBACK_MAX_ATTACHMENTS = 5`,
   `FEEDBACK_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024`,
   `FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES = ['image/png','image/jpeg','image/webp','image/gif']`,
   `FEEDBACK_ALLOWED_LINK_PROTOCOLS = ['https:','http:','mailto:']`,
   and the transition map
   `FEEDBACK_STATUS_TRANSITIONS` (OPEN→IN_PROGRESS|RESOLVED|CLOSED|ARCHIVED,
   IN_PROGRESS→OPEN|RESOLVED|CLOSED, RESOLVED→OPEN|CLOSED|ARCHIVED,
   CLOSED→OPEN|ARCHIVED, ARCHIVED→OPEN).
4. `apps/claw-audit-service/src/modules/feedback/schemas/`
   - `feedback-ticket.schema.ts` — `ticketNumber` (unique index), `userId`,
     `reporterEmail`, `reporterName`, `type`, `title`, `subject`, `contentMarkdown`,
     `searchText`, `status`, `attachments[]` (`fileId`, `filename`, `mimeType`,
     `sizeBytes`, `isScreenshot`), `pageContext` (`route`, `url`, `viewportWidth`,
     `viewportHeight`, `appVersion`, `userAgent`, `locale`, `timestamp`),
     `history[]` (`action`, `fromStatus`, `toStatus`, `actorId`, `actorEmail`,
     `note`, `at`), `createdAt`, `updatedAt`, `resolvedAt`, `closedAt`,
     `archivedAt`, `reopenedAt`, `lastActorId`.
     Indexes: unique `ticketNumber`; `{status, createdAt:-1}`; `{userId, createdAt:-1}`;
     `{type}`; text index over `title`/`subject`/`searchText`/`ticketNumber`.
   - `feedback-counter.schema.ts` — `_id`, `seq`.
5. `feedback.repository.ts` — the only place with Mongoose calls: `create`,
   `findByTicketNumber`, `findById`, `findPaginated(filter)`, `countByStatus`,
   `updateStatus`, `nextTicketNumber`, `findByIdForUser`.

### Batch 2 — backend API + lifecycle + RBAC

Layering is **controller → service → manager → repository**; no business logic in
controllers, no Mongoose outside the repository.

- `dto/create-feedback.dto.ts`, `dto/list-feedback-query.dto.ts`,
  `dto/update-feedback-status.dto.ts` — Zod, enforcing every cap in §1.3.
- `sanitizers/feedback-markdown.sanitizer.ts` (**authoritative, server-side**):
  strip every `<...>` HTML tag and HTML comment, decode-then-recheck entity and
  URL-encoded forms, reject/neutralise `javascript:`, `data:`, `vbscript:`,
  `file:` in Markdown link/image targets (allowlist only the protocols in
  `FEEDBACK_ALLOWED_LINK_PROTOCOLS`), drop control characters, collapse the
  result to `FEEDBACK_MAX_CONTENT_LENGTH`, and derive `searchText` (Markdown
  syntax removed). Client-side validation is convenience only.
- `feedback.manager.ts` — create (sanitize → validate attachment metadata
  against file-service → allocate ticket number → write first history entry),
  `changeStatus` (validate against `FEEDBACK_STATUS_TRANSITIONS`, stamp
  `resolvedAt`/`closedAt`/`archivedAt`/`reopenedAt`, append history), `list`,
  `getForAdmin`, `getOwn`, `streamAttachment`.
- `feedback.controller.ts` — `@RequirePermissions(Permission.FEEDBACK_SUBMIT)`
  - `POST /api/v1/feedback` → `{ ticketNumber }`
  - `GET  /api/v1/feedback/mine` (paginated, own tickets only)
  - `GET  /api/v1/feedback/mine/:id`
- `feedback-admin.controller.ts` — `@RequirePermissions(Permission.ADMIN_FEEDBACK_MANAGE)`
  - `GET   /api/v1/feedback/admin` (search + status + type + pagination + sort)
  - `GET   /api/v1/feedback/admin/:id`
  - `PATCH /api/v1/feedback/admin/:id/status`
  - `GET   /api/v1/feedback/admin/:id/attachments/:fileId` (proxied stream)
  - `GET   /api/v1/feedback/admin/stats` (per-status counts for the tabs)
- Ownership: `GET /mine/:id` must filter by `userId` in the query itself, never
  fetch-then-compare. Admin routes must fail with 403 for a non-admin — verified
  by test, not by hiding the nav item.
- Publish `feedback.created` / `feedback.status_changed` on `claw.events` using
  the existing `@claw/shared-rabbitmq` publisher, and add the payloads to
  `packages/shared-types/src/events/event-payloads.type.ts`.
- `apps/claw-audit-service/src/app/config/app.config.ts` — read the **existing**
  `FILE_SERVICE_URL` and `INTER_SERVICE_AUTH_TOKEN`; add them to the
  audit-service `environment:` block in
  `docker/docker-compose.dev.services.yml` and
  `docker/docker-compose.prod.services.yml` if missing. **No new env var.**
- `infra/nginx/nginx.conf` — add the `/api/v1/feedback` location pointing at
  audit-service, copying the neighbouring `/api/v1/audits` block.
- Auth-service seed: grant `FEEDBACK_SUBMIT` to every existing role and
  `ADMIN_FEEDBACK_MANAGE` to ADMIN, idempotently, in the existing permission
  seeder.

### Batch 3 — frontend reporter

- `src/components/feedback/feedback-launcher.tsx` — the floating button, mounted
  **once** in `src/components/layout/portal-shell.tsx`. Fixed bottom-right,
  `env(safe-area-inset-*)` aware, `z-index` below existing chat controls, real
  `<button>` with `aria-label`, keyboard reachable, hidden on the chat composer
  overlap at `< sm` if it collides.
- `src/components/feedback/feedback-dialog.tsx` — uses the existing
  `components/ui/dialog.tsx` on desktop and `components/ui/sheet.tsx` on mobile.
- `feedback-type-select.tsx`, `feedback-markdown-editor.tsx` (toolbar → Markdown
  text, live preview through the existing `markdown-renderer`),
  `feedback-attachments.tsx` (picker + drag/drop + clipboard paste + progress +
  remove), `feedback-screenshot-capture.tsx` (`getDisplayMedia`, preview,
  remove).
- Hooks in `src/hooks/feedback/`, service calls in
  `src/services/feedback/feedback.service.ts`, Zod schema in
  `src/lib/validation/feedback.schema.ts`, types in `src/types/feedback.types.ts`,
  constants in `src/constants/feedback.constants.ts`. **TSX files contain only
  components** — no inline hooks, types, constants or helpers.
- Submission: disable submit while pending, show progress, surface field errors,
  and on success show the toast `Feedback submitted — Ticket FDB-000123`.
- Never collect tokens, cookies, `localStorage`, `Authorization` headers or
  hidden form values in `pageContext`.

### Batch 4 — admin module

- Route `src/app/(portal)/admin/feedback/page.tsx` (+ `ROUTES.ADMIN_FEEDBACK`,
  `route-permissions.constants.ts` → `ADMIN_FEEDBACK_MANAGE`, sidebar entry
  `nav.adminFeedback` under the existing Admin group with a `MessageSquare`-family
  icon).
- Components under `src/components/admin/feedback/`: list table (Ticket #, Type,
  Title, Reporter, Status, Created, Updated, attachment indicator), status tabs
  (All/Open/In Progress/Resolved/Closed/Archived), debounced search, server-side
  pagination reusing the existing admin table/pagination conventions, and a
  responsive card layout below `md` instead of a broken overflow.
- Detail drawer: full metadata, rendered Markdown (existing renderer — never
  `dangerouslySetInnerHTML`), attachment thumbnails with an enlarged preview,
  history timeline, and the lifecycle actions (In Progress / Resolve / Close /
  Archive / Reopen) with a confirm step on Archive.

### Batch 5 — i18n + docs + release

- All **13** locales (`en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh`) plus
  `src/types/i18n.types.ts` in the same change, as real translations. RTL check
  for `ar`/`fa`.
- `docs/03-architecture/` feedback-system page + service-guide update for
  audit-service + `apps/claw-audit-service/CLAUDE.md`.
- Release notes + version bump per the repo release policy.

### Batch 6 — tests, then gates (LAST)

Write tests as the last coding step, then run the gates **once**, only in the
touched workspaces:

```
cd apps/claw-audit-service && npx tsgo --noEmit && npm run lint && npm test && npm run build
cd apps/claw-frontend     && npx tsgo --noEmit && npm run lint && npm test && npm run build
cd packages/shared-types  && npm run build
```

Do **not** run lint/test/build after every file. The machine is CPU-bound —
repeated full-suite runs are forbidden.

Required coverage: creation (valid, each type, attachments, screenshot, empty
subject), validation (missing title/description, invalid type, over-length, too
many files, oversized file, unsupported MIME), **security** (`<script>alert(1)</script>`,
`<img src=x onerror=alert(1)>`, `[x](javascript:alert(1))`, entity- and
percent-encoded variants, `<iframe>`, SVG script payload, malformed markup,
`{"$ne":null}` style payloads, `../../etc/passwd` filenames, `shot.png.html`
double extension, fake MIME), RBAC (non-admin blocked on every admin route,
unauthenticated rejected, cross-user ticket read blocked), lifecycle (each valid
transition + rejected invalid transitions), and search/filter/pagination.

---

## 2. Definition of done

The user's checklist in the mission brief is the acceptance gate. Nothing is
"done" without evidence: a command output, a diff, or a screenshot.
