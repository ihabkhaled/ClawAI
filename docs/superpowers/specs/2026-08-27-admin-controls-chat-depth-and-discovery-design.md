# Admin Controls, Chat Depth and Discovery Design

## Goal

Seven independent asks, delivered as independently gated batches:

1. Create a new administrator from the webapp Users page, with a generated or custom password.
2. Activate a user stranded in `PENDING` email confirmation from the admin panel.
3. Make the seeded super administrator immutable to every other administrator — backend and frontend — while remaining editable by themselves.
4. Split the single `Plan.isDefault` flag into the plan new signups receive and the plan the pricing page badges "Most popular".
5. Stop toasts from covering floating UI, on every breakpoint, in both writing directions.
6. Deepen the chat thread and message surface: publish images in public shares, land quota exhaustion in the transcript, keep streaming history, and ship the brainstormed feature set.
7. Publish the missing public marketing surface: four new rival comparisons, the ClawAI Coding Agent cluster, a homepage band, an in-app nav entry, and full discovery coverage.

`null` means unlimited and `0` means disabled throughout. Money stays in integer minor units.

## Existing State Audit

Evidence gathered by a seven-way parallel code audit on 2026-08-27; every "done" below
names a live call path, every "missing" names the search that failed.

### 1. Admin creates an administrator

- **Done — backend.** `POST /api/v1/users` exists, is guarded by `@Roles(ADMIN)` +
  `@RequirePermissions(Permission.ADMIN_USERS_MANAGE)`, accepts an explicit `role`
  including `ADMIN`, hashes with argon2id and publishes `user.created`. Unit-tested at
  controller and service level.
- **Missing — the entire frontend half.** No repository method, no mutation hook, no
  dialog, no create button, no zod schema. `grep -rn "createUser" apps/claw-frontend/src`
  outside locales returns nothing.
- **Missing — password generator.** Nothing in the tree generates a password.
- **Partial — password policy disagrees with itself.** `validatePasswordStrength`
  (`service.utilities/password-policy.utility.ts`) demands 8–128 + upper + lower + digit;
  `createUserSchema` additionally demands a special character. Two layers, two answers.
- **Partial — admin-created accounts are born stranded.** No `roleId`, no plan,
  `emailVerifiedAt = null`, `mustChangePassword = false` — so the account cannot log in
  until it clears the email wall it was never sent a link for.
- **Scaffolding — `admin.createUser`** exists in all 13 locales and `i18n.types.ts` with
  zero callers.

### 2. Activate a `PENDING` user

- **Done — status is modelled and visible.** Registration lands in `UserStatus.PENDING`
  with `emailVerifiedAt = null`; the admin table shows status and filters by `PENDING` and
  by verified/unverified.
- **Done — exactly one activation path exists.**
  `EmailVerificationRepository.consumeAndActivate`, reached only from
  `POST /api/v1/auth/email-verification/confirm`.
- **Missing — no admin activation.** The action cell renders Reactivate only for
  `SUSPENDED`; `PENDING` gets Deactivate. Two endpoints can technically flip the status
  (`PATCH /users/:id`, `PATCH /users/:id/reactivate`) but neither sets `emailVerifiedAt`,
  neither invalidates the outstanding verification token, and neither writes an audit record.
- **Partial — the events are wrong.** Both publish `EventPattern.USER_CREATED` with a
  payload that does not satisfy `UserCreatedPayload`, and nothing subscribes.
- **Missing — no audit lane for admin user actions.** audit-service has no HTTP write
  endpoint; only `USER_TEMPORARY_PASSWORD_ISSUED` has a consumer.

### 3. Super administrator immutability

- **Done — identity is a real column.** `User.isSuperAdmin`, backed by a partial unique
  index `users_single_super_admin_idx ... WHERE is_super_admin = true` created in raw SQL.
  Not "lowest id", not a role. Settable only by seed and migration; no HTTP path can grant
  or clear it.
- **Done — five admin mutations already refuse the super admin** through the private
  `UsersService.assertMutableUser`: update, deactivate, reactivate, change role, issue
  temporary password. Plus self-service account delete.
- **Missing — "except themselves".** `assertMutableUser` is absolute and takes no actor.
  The super admin cannot edit their own row, rotate their own admin password, or reach any
  admin surface about themselves.
- **Missing — actor authority on four paths.** `PATCH /users/:id` accepts `role` and
  `status` and forwards both with no super-admin-actor gate, so any `ADMIN` can promote
  themselves; `POST /users` can mint a peer `ADMIN` with no actor check at all;
  deactivate/reactivate of an `ADMIN` is ungated; `PUT /admin/roles/:id/permissions` is
  gated on the role enum alone and can strip `ADMIN_USERS_MANAGE` from the ADMIN role.
- **Missing — target protection off the users module.** `PlansService.assignUserToPlan`,
  the plan-retirement transaction and the RabbitMQ entitlement applier all write
  `activePlanId` on any row with no `isSuperAdmin` check.
- **Missing at audit time, present now — the reusable primitive.** The audit found no shared
  predicate; batch A1 added `resolveSuperAdminMutability` plus its scope enum, refusal codes
  and self-permitted scope set during this same pass. A1's remaining job is to **adopt** it at
  every call site and delete the private `assertMutableUser` — not to write a second one.
  `UsersService.assertSuperAdminActor` remains the actor half and is not duplicated.
  The frontend still repeats `user.isSuperAdmin` at six JSX sites and cannot tell
  "this row is me"; that is A2.
- **Partial — refusals are untranslated.** An error-code → `t()` map does exist —
  `utilities/api-error-message.utility.ts` already maps `PLAN_TRIAL_EXPIRED` and six quota
  codes — but it carries no super-admin code, and `toast.apiError` bypasses it entirely and
  prints the backend's English verbatim. The map is extended, not created.
- **Missing — no rule, no ADR, no service-guide section.**

### 4. Signup plan versus most popular

- **Load-bearing correction.** `Plan` and `PlanPriceVersion` live in **claw-auth-service**,
  not payment-service. payment-service has no `Plan` model.
- **Done — one flag does both jobs.** `Plan.isDefault` is read by `auth.manager.ts` to pick
  the plan a new signup receives _and_ by `plan-tier-card.tsx` to render
  `t('marketing.pricing.mostPopular')`.
- **Missing — `isPopular` does not exist.** No badge column, no sort order.
- **Done — the single-writer shape already exists.** `POST /admin/plans/:id/set-default`
  is the only write path; `isDefault` is deliberately absent from both plan DTOs.
- **Done — precedent for a DB-enforced single winner.** `PlanPriceVersion.activeKey` is a
  nullable `@unique` column emulating a partial unique index.

### 5. Toasts versus floating UI

- **Done — one Radix toast viewport, mounted globally** in `providers.tsx`, so toasts exist
  on marketing, auth and portal surfaces alike.
- **Partial — the reservation knows about exactly one obstacle.**
  `components/ui/toast.tsx` hardcodes `safe-bottom safe-bottom-base-nav fixed bottom-0
z-[100] ... sm:right-0 sm:bottom-0 md:max-w-[420px]`, reserving the mobile bottom nav and
  nothing else.
- **Partial — a two-slot rail exists but is frozen.**
  `constants/floating-action.constants.ts` defines `FLOATING_ACTION_RAIL_SLOT_ONE/_TWO`
  shared by the chat FAB and the feedback launcher. It carries no extent, no z-index, no
  visibility predicate, and the toast viewport does not import it.
- **Measured collision (desktop, 929×861, verified in-browser).** Toast column occupies
  x 509–929 rising from y 845; the feedback launcher occupies 861–913 × 797–837 and the PWA
  install prompt 209–721 × 670–829. Both are covered.
- **Missing — no z-index registry, no floating context, no portal manager.**

### 6. Chat threads and messages

- **Done — the surface is large and wired.** Thread list with search, pin, archive, date
  grouping and infinite scroll; a Virtuoso-virtualised message list with a live progress
  panel fed by SSE; a composer with model picker, attachments, research toggle and
  per-thread settings.
- **Done — public sharing is a real immutable snapshot** (`chat_shares` +
  `chat_share_messages`), with a public endpoint, a server-rendered page, feeds, a
  secret/PII scan and ad eligibility.
- **Missing — images never reach a public share, for three independent reasons.**
  `chat_share_messages` has no asset columns and `buildSnapshotMessages` copies only
  `content/role/providerLabel/modelLabel`; the public DTO is an allow-list documented as
  excluding attachment ids and storage URLs; the public markdown renderer maps `img` to an
  alt-text placeholder. Worse, a generated-image turn stores the literal string
  `'Generating image…'` as its content, so the share publishes that sentence as the answer.
- **Partial — quotas enforce three of six windows.** Daily tokens, messages/day and
  chats/day are live. `QuotaService.reserveWeighted`, `EntitlementsAdapter.reserveQuota`
  and `releaseQuota` are fully implemented with **zero callers**; weekly and monthly
  ceilings are unenforced.
- **Missing — exhaustion is a disappearing toast.** Nothing lands in the transcript, and
  `quota.dailyLimitExceeded` is absent from the frontend error-code map, so raw English leaks.
- **Missing — streaming is not durable.** Partial content lives in React state plus a
  100-frame in-process replay buffer; reasoning is produced but never persisted. A refresh
  mid-run loses the reasoning entirely and the head of any answer over ~100 frames.
- **Partial — mobile.** Shell-level handling is good (bottom nav, safe areas, bottom-sheet
  sidebar and model picker, touch-visible actions), but the thread list is unreachable from
  inside a thread below `md`.
- **Missing** — thread export, message edit, branch/fork, composer drafts, in-thread search
  with jump-to-match, auto-titling.
- **Waste** — an idle thread refetches page one every 5s forever, plus a second 2s interval
  while awaiting a reply, despite a deterministic `DONE` signal.
- **Dead** — `messages-content.tsx` has no mount point; `thinking-indicator.tsx` is a shim
  its own comment asks to delete.

### 7. Public marketing and discovery

- **Done — one registry drives everything.** `PUBLIC_CONTENT_DEFINITIONS` in
  `constants/content-registry.constants.ts` feeds the sitemap index, per-locale child
  sitemaps, all four RSS feeds, `/llms.txt`, `robots.txt`, canonical/hreflang/OG/Twitter
  metadata, the marketing footer, AdSense eligibility and the middleware `X-Robots-Tag`
  backstop. A `(marketing)` route without a registry entry renders and is invisible
  everywhere; `sitemap-coverage.test.ts` fails in both directions.
- **Done — the comparison cluster is fully built for five rivals** (ChatGPT, Claude,
  Gemini, Perplexity, Copilot): one enum, a shared `ComparisonPage`, 13 locale content
  files (~270 lines each) and a `@graph` WebPage+BreadcrumbList+FAQPage JSON-LD builder.
- **Missing — Kimi, Qwen, GLM, DeepSeek** appear nowhere in that machinery.
- **Missing — the Coding Agent has no public surface.** `apps/claw-coding-agent` is a git
  submodule, a real VS Code extension, publisher `clawai`, extension id
  `clawai.clawai-coding-agent`, **published and verified on the Marketplace**
  (first published 2026-07-27, v0.64.0 as of 2026-08-23). The frontend knows about it only
  through the portal OAuth approval screen. No marketing page, no marketplace link, no
  homepage band, no sidenav entry.
- **Done — the repo ships its own runbook**, `skills/publish-a-public-marketing-page.md`.

## Decisions Taken

Answered by the product owner on **2026-08-27**; recorded here because none of them is
derivable from the code, and four of them reverse or qualify something the tree currently
asserts.

### Super-administrator scope table (supersedes the prose in D1)

`SUPER_ADMIN_SELF_PERMITTED_SCOPES` is the machine-readable form of this table. They change
together or not at all.

| Scope                                         | Another administrator | The super administrator, on themselves | Why                                                                                                                      |
| --------------------------------------------- | --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `PROFILE` (username, first/last name)         | refused               | **permitted**                          | Renaming yourself is ordinary and reversible.                                                                            |
| `ROLE`                                        | refused               | refused                                | Demoting the only super administrator is unrecoverable through the product.                                              |
| `STATUS` (deactivate / reactivate / activate) | refused               | refused                                | Self-suspension locks the platform's only super administrator out.                                                       |
| `DELETE`                                      | refused               | refused                                | `users_single_super_admin_idx` guarantees at most one, and only a fresh seed against an empty admin table re-creates it. |
| `PLAN`                                        | refused               | refused                                | The super administrator bypasses plans; an assignment would be meaningless and would let a plan expiry gate them.        |
| `TEMPORARY_PASSWORD`                          | refused               | refused                                | Self password change goes through `/users/me/password`, which proves knowledge of the current one.                       |

**Own-row affordance.** On their own row the super administrator sees Edit enabled with only
the profile fields writable; role, status, plan and Issue-temporary-password stay disabled.
The `admin.editUserSuperAdminNotice` copy is replaced by a distinct
`admin.editUserSelfSuperAdminNotice` string explaining that profile fields are editable and
the rest is locked — in all 13 locales.

### The rest

| #   | Decision                                                                                                                                                                                                                                                                   | Consequence accepted                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Close every super-administrator hole: actor gating on `POST /users`, `PATCH /users/:id`, deactivate, reactivate, plan assignment and system-role permission changes.                                                                                                       | An ordinary `ADMIN` can no longer promote themselves, mint a peer administrator, suspend another administrator, or degrade the `ADMIN` role's grant set.                                                                                                                                                                                                                                                                             |
| D2  | The signup plan becomes **Free**; **Pro** keeps the "Most popular" badge. Admin buttons read "Set as signup plan" and "Set as most popular".                                                                                                                               | Free is `isTrial` with a 30-day duration, so a new user gets 30 days and then `PLAN_TRIAL_EXPIRED`. Accepted deliberately: this is what the pricing page's "Start free" CTA already implies. Batch F1's transcript notice therefore covers `PLAN_TRIAL_EXPIRED`, not only quota exhaustion.                                                                                                                                          |
| D2a | The migration adds `isPopular` **only**. It must not write `isDefault` on any row.                                                                                                                                                                                         | `POST /admin/plans/:id/set-default` is a live operator endpoint; an install may deliberately point signup at a paid plan (this one currently points at Pro). Moving the signup plan to Free is an **operator action** through the renamed button, performed and recorded per install — never forced by a migration. `isPopular` is backfilled to slug `pro` where it exists, null otherwise.                                         |
| D3  | Build the full brainstormed chat set.                                                                                                                                                                                                                                      | Sequenced across batches F1–F12, each landing green on its own.                                                                                                                                                                                                                                                                                                                                                                      |
| D4  | Administrator-created accounts are `ACTIVE`, `emailVerifiedAt` set, granted the signup plan and the matching `roleId`, and `mustChangePassword = true`.                                                                                                                    | `mustChangePassword` is **inert today** — it exists only as a type field on the frontend, with no route guard. Batch B therefore ships the forced-rotation gate as well; D4's rationale is not allowed to rest on a flag the product ignores.                                                                                                                                                                                        |
| D5  | Weekly / monthly / provider-cost / concurrency enforcement: **fix the numbers first, then enable.**                                                                                                                                                                        | Blocked on `docs/business/quotas-and-plan-ceilings.md` landing with each corrected number signed off. Free's weekly (20,000) is 15× smaller than its daily (300,000) where every other plan runs weekly at 5–6× daily; Unlimited publishes `monthlyTokens: null` while carrying a $50 provider-cost ceiling. Existing subscribers are grandfathered to the end of their current cycle. Nothing is wired before that document exists. |
| D6  | Public shares publish images, **and** keep ads and indexing — with an image safety scan added to the publish path first.                                                                                                                                                   | The current scan reads message text only. Batch F2 does not ship until the image scan does; a share whose images have not been scanned is not ad- or index-eligible. `chat-shares.types.ts`'s "attachment ids or storage URLs absent by construction" contract comment is amended in the same commit, and the reversal is appended (never edited in place) to `docs/.../public-chat-shares.md`.                                      |
| D7  | The database is the source of truth for plan limits. The 13 locale strings that hardcode Free's limits are **removed**, and the pricing highlights are fetched from the plan-catalog API dynamically, exactly as the plan cards already are.                               | Ends the class of bug where advertised and enforced limits drift. Today the copy says "2 chats and 12 messages per day" while the database enforces 5 and 250.                                                                                                                                                                                                                                                                       |
| D8  | Admin activation of a `PENDING` user invalidates the outstanding verification token, and the verify-email page gains an "already active, please sign in" state in all 13 locales. The user is **not** emailed about the activation.                                        | A user who later clicks the emailed link sees a real explanation instead of a silent bounce to login.                                                                                                                                                                                                                                                                                                                                |
| D9  | The quota / trial notice in the transcript is **render-only**, not persisted. It is de-duplicated to one per thread per limit kind, it disappears on the next successful send, and the blocked prompt is restored into the composer so the user can retry after upgrading. | Avoids a stale "you hit your limit — upgrade" sitting in the history of someone who upgraded twenty minutes ago, and avoids five identical notices from five retries.                                                                                                                                                                                                                                                                |

## Architecture

Extend existing seams; do not add parallel systems.

1. **Super-admin authority becomes one predicate, in one place.** A pure utility decides
   both halves — is the target immutable to this actor, and does this actor have super-admin
   authority for this class of mutation — and every mutation path calls it. Target
   protection and actor authority are decided together, never separately, because a
   self-permissive target rule combined with an ungated actor rule is an escalation.
2. **The super admin's identity stays a DB read.** The access token is not re-shaped; the
   claim would be absent from every already-issued token until expiry.
3. **Plan flags follow the existing single-winner precedent** — a nullable unique key
   column, not application-level "unset the others", so Postgres rejects a second winner.
4. **Both plan flags keep the dedicated-endpoint shape.** Neither is writable through the
   plan DTOs.
5. **Floating UI becomes a registry with extent.** Every floating element declares its
   anchor, extent, breakpoint visibility and z-index in one constants file; the toast
   viewport derives its offset from the tallest registered obstacle currently visible on
   this breakpoint and writing direction, instead of hardcoding one nav height.
6. **Public share assets are share-scoped, not file-scoped.** The snapshot copies asset
   references at publish time and they are served through a share-scoped public route, so
   revoking a share revokes its images and no authenticated storage URL is ever exposed.
7. **Quota exhaustion is a transcript citizen.** The 429 is raised before the user row
   exists, so the message is a synthetic render item carrying limit kind, reset time and an
   upgrade CTA — translated from a machine-readable code, never from backend English.
8. **Every backend refusal joins the existing code → `t()` map** at
   `utilities/api-error-message.utility.ts`, and `toast.apiError` is routed through it
   instead of printing `apiErr.message`. Building a second map would be the mistake here;
   the fault is that one code path never consults the one that exists.
9. **New public pages are registry entries first.** A page that is not in
   `PUBLIC_CONTENT_DEFINITIONS` does not exist.

## Batches

Each batch is independently reviewable, independently gated, committed and pushed before the
next begins. Scoped gates only — never all-workspace. Every batch stays at or under 40 files,
because lint-staged on Windows dies at an 8191-character argument list and the only escape is
the banned `--no-verify`.

| #   | Batch                                                                                                                                                                                                                                                                      | Workspaces                                                | Migration                                 | Knowledge delta                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| A1  | Super-administrator authority, backend. Adopt the existing `resolveSuperAdminMutability` at every call site and delete `assertMutableUser`; actor gating on create / update / deactivate / reactivate / plan-assign / system-role permissions; structured refusal logging. | auth-service                                              | none                                      | `rules/35`, ADR, `docs/04-backend/service-guide-auth.md`, `apps/claw-auth-service/CLAUDE.md` |
| A2  | Super-administrator authority, frontend. Per-row capability resolver, acting-user identity threaded to the table, the three refusal codes added to the existing error map, `showToast.apiError` routed through that map, own-row notice copy.                              | frontend                                                  | none                                      | `context/` note, skill                                                                       |
| B   | Admin create-user dialog: password generator, strength meter, zod schema, repository + hook + dialog; forced-rotation gate for `mustChangePassword`; password-policy reconciliation.                                                                                       | auth-service, frontend                                    | none                                      | skill runbook, service-guide                                                                 |
| C   | Activate a pending user: dedicated endpoint setting status + `emailVerifiedAt` + token invalidation, correct event, audit consumer, admin action, verify-page "already active" state.                                                                                      | auth-service, audit-service, frontend                     | none                                      | event-flow map, service-guide                                                                |
| D   | Plan flag split: `isPopular` column + nullable unique key + migration (D2a — `isPopular` only), second endpoint, renamed admin buttons, pricing-page re-point.                                                                                                             | auth-service, frontend                                    | **yes**                                   | ADR, business map, service-guide                                                             |
| E   | Floating-element registry with extent, and an obstacle-aware toast viewport; RTL and breakpoint aware.                                                                                                                                                                     | frontend                                                  | none                                      | rule, `context/` map, skill                                                                  |
| F1  | Quota / trial exhaustion as a translated in-chat notice (render-only, de-duplicated, composer restore), covering `PLAN_TRIAL_EXPIRED` and every quota code.                                                                                                                | chat-service, frontend                                    | none                                      | rule, service-guide                                                                          |
| F2  | Public share assets: image safety scan on the publish path, share-owned asset storage, share-scoped public route, public renderer. **Blocked on the share-asset ADR.**                                                                                                     | chat-service, file-service, frontend                      | **yes**                                   | ADR (+ appended reversal note), service-guide                                                |
| F3  | Durable streaming: partial answer and reasoning survive a refresh. **Blocked on the streaming-persistence ADR.**                                                                                                                                                           | chat-service, frontend                                    | maybe                                     | ADR, service-guide                                                                           |
| F4  | Mobile: thread-list drawer reachable from inside a thread; thread-page overflow fix.                                                                                                                                                                                       | frontend                                                  | none                                      | `context/` map                                                                               |
| F5  | Thread export to Markdown / JSON, reusing the compare-run export utility.                                                                                                                                                                                                  | frontend                                                  | none                                      | skill                                                                                        |
| F6  | Message editing and re-run.                                                                                                                                                                                                                                                | chat-service, frontend                                    | **yes**                                   | service-guide                                                                                |
| F7  | Thread branching / forking from any message.                                                                                                                                                                                                                               | chat-service, frontend                                    | **yes**                                   | ADR, service-guide                                                                           |
| F8  | Composer drafts, per thread, surviving navigation.                                                                                                                                                                                                                         | frontend                                                  | none                                      | —                                                                                            |
| F9  | In-thread message search with jump-to-match, plus the tsvector index behind it.                                                                                                                                                                                            | chat-service, frontend                                    | **yes**                                   | service-guide                                                                                |
| F10 | Auto-title a thread from its first exchange.                                                                                                                                                                                                                               | chat-service                                              | none                                      | service-guide                                                                                |
| F11 | Polling reduction on an open thread, now that `DONE` is deterministic.                                                                                                                                                                                                     | frontend                                                  | none                                      | `context/` note                                                                              |
| F12 | Retire the dead renderers (`messages-content.tsx`, `thinking-indicator.tsx`) and their prop types.                                                                                                                                                                         | frontend                                                  | none                                      | —                                                                                            |
| F13 | Weekly / monthly / provider-cost / concurrency enforcement. **Blocked on `docs/business/quotas-and-plan-ceilings.md` (D5).**                                                                                                                                               | auth-service, chat-service, shared-entitlements, frontend | **yes** (catalog version bump + backfill) | business doc, ADR, service-guide                                                             |
| O1  | Comparison rivals: Kimi, Qwen, GLM, DeepSeek — enum, registry entries, 13 locale content files each, JSON-LD.                                                                                                                                                              | frontend                                                  | none                                      | skill update, `context/` route map                                                           |
| O2  | ClawAI Coding Agent marketing cluster: overview page, install page with the Marketplace deep link, 13 locales, registry entries, JSON-LD (`SoftwareApplication`).                                                                                                          | frontend                                                  | none                                      | skill update, `context/` route map                                                           |
| O3  | Homepage Coding Agent band + portal sidenav entry.                                                                                                                                                                                                                         | frontend                                                  | none                                      | `context/` map                                                                               |
| O4  | Discovery coverage for everything O1–O3 added: sitemap, RSS, `llms.txt`, footer, Lighthouse CI URL list, coverage test.                                                                                                                                                    | frontend                                                  | none                                      | skill update                                                                                 |

## Error Handling

- Known refusals carry stable machine-readable codes; the frontend maps every code to a
  locale key in all 13 locales. Raw backend English is never the primary user message.
- Super-administrator refusals are `403` and carry exactly three codes, all of which must have
  a `t()` key in all 13 locales:
  `SUPER_ADMIN_IMMUTABLE` (the target is the super administrator and you are not),
  `SUPER_ADMIN_SELF_LOCKED` (you are the super administrator and this scope is never
  self-permitted), and `SUPER_ADMIN_REQUIRED` (the actor lacks super-administrator authority
  for an administrator-class mutation). Each is logged as a structured WARN, because repeated
  attempts are a security signal.
- Quota exhaustion stays `429` with a code naming the window and the reset instant.
- System-driven writes — billing entitlement events, plan retirement — are explicitly
  exempt from super-admin target protection, so a legitimate event cannot poison a consumer
  retry loop. The exemption is named in code, not implied by omission.

## Acceptance criteria

Written in user terms, checkable without reading code. Each names the file that asserts it.

**A1 — super-administrator authority (backend).**

- An `ADMIN` who is not the super administrator calls `PATCH /users/:id` with `role: ADMIN` on
  themselves and gets `403 SUPER_ADMIN_REQUIRED`. The row is unchanged.
  → `apps/claw-auth-service/src/modules/users/__tests__/users.service.spec.ts`
- The same administrator calls `POST /users` with `role: ADMIN` and gets `403`. No user row is
  created. → same file
- The same administrator deactivates another `ADMIN` and gets `403`; deactivating a `USER`
  still succeeds. → same file
- Any administrator who is not the super administrator edits, deactivates, rotates the password
  of, or assigns a plan to the super administrator and gets `403 SUPER_ADMIN_IMMUTABLE`.
  → same file + `modules/plans/__tests__/plans.service.spec.ts`
- The super administrator changes their own first name through `PATCH /users/:id` and it
  succeeds; the same call carrying `status` or `role` gets `403 SUPER_ADMIN_SELF_LOCKED` and
  writes nothing. → `users.service.spec.ts`
- A non-super `ADMIN` calls `PUT /admin/roles/:id/permissions` on the `ADMIN` system role and
  gets `403`; the same call on a custom role succeeds.
  → `apps/claw-auth-service/src/modules/roles/__tests__/roles.service.spec.ts`
- **Empty state:** an unknown target id returns `404`, not `403` — absence is not a refusal.
- **Concurrent case:** two administrators deactivating the same user simultaneously produce one
  suspension and no error; the second is idempotent.

**A2 — super-administrator authority (frontend).**

- Signed in as a non-super administrator, every destructive control on the super
  administrator's row is disabled and the row shows the immutable notice, translated.
- Signed in as the super administrator, my own row's Edit is enabled, role/status/plan/rotate
  stay disabled, and the notice is the self variant.
  → `apps/claw-frontend/src/components/admin/__tests__/user-table.test.tsx`
- A refused action shows translated copy in the active locale, never backend English.
  → `apps/claw-frontend/src/utilities/__tests__/api-error-message.utility.test.ts`

**B — create an administrator.**

- The Users page has a Create user button; the dialog validates exactly what the backend
  validates; Generate produces a password that passes on the first try.
- Creating a user with role `ADMIN` as a non-super administrator shows a translated refusal.
- The created account can sign in immediately and is sent straight to the change-password
  screen; no other route is reachable until the password is changed.
- **Empty state:** the generator is available before any field is filled.
- **Concurrent case:** two administrators submitting the same email — the second gets a
  translated duplicate error, not a 500.

**C — activate a pending user.**

- A `PENDING` row shows an Activate action; after it, status is `ACTIVE`, the verified badge is
  set, and the user can sign in.
- The user's outstanding verification link, clicked afterwards, shows "already active, please
  sign in" in the active locale — not a silent bounce to login.
- The action appears in the audit log with the acting administrator.
- **Concurrent case:** the user clicking their link at the same moment as the admin activates
  produces one `ACTIVE` row and no error.

**D — signup plan versus most popular.**

- The plans page has two distinct buttons; exactly one plan can hold each flag.
- Setting a second plan as most popular clears the first, in one transaction.
- The public pricing page badges the `isPopular` plan and never the signup plan.
- The migration changes no row's `isDefault`.
- **Empty state:** with no plan marked popular, the pricing page renders with no badge and no
  layout shift.

**E — toasts and floating UI.**

- At 390×844, 768×1024 and 1440×900, in `en` and in `ar`, a toast never overlaps the feedback
  launcher, the chat FAB, the PWA install prompt or the mobile bottom nav.
- Dismissing the install prompt moves the toast band down; it does not leave a gap.
  → `apps/claw-frontend/src/components/ui/__tests__/toast-offset.test.ts`

**F1 — limits in the transcript.**

- Hitting the daily message limit puts a translated notice in the thread naming the window and
  the reset time, with an upgrade link; the composer keeps the text I typed.
- Hitting it three more times leaves one notice, not four.
- After upgrading, the next successful send removes the notice.
- Day 31 on the Free trial produces the trial-expired notice, not a generic failure.

**F2 — images in public shares.**

- A shared conversation containing a generated image renders that image on the public page.
- Revoking the share makes the image URL stop resolving.
- A share whose images have not passed the scan is neither ad-eligible nor index-eligible.

**O1–O4 — public pages.**

- Each new page is reachable, renders in all 13 locales, appears in the sitemap and the
  relevant feed, and is asserted by `sitemap-coverage.test.ts` in both directions.
- The Coding Agent install page's Marketplace link resolves to the live listing.
- Lighthouse CI asserts accessibility, including `color-contrast`, on every new public URL.

## Decision records required before their batch starts

| ADR                           | Question it settles                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Blocks |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Super-administrator invariant | Why authority is one pure scope predicate plus a DB actor read rather than a guard or a JWT claim; why the claim was rejected (already-issued tokens would lack it until expiry).                                                                                                                                                                                                                                                                                    | A1     |
| Plan flag split               | Why a nullable unique key emulating a partial index, following `PlanPriceVersion.activeKey`, rather than an application-level "unset the others"; why the migration must not touch `isDefault`.                                                                                                                                                                                                                                                                      | D      |
| Share asset persistence       | Copy bytes into a share-owned store at publish, keep a reference and exempt it from retention, or issue a short-lived signed URL redeemed at file-service. Must settle which service owns the public route, the dependency direction, what revocation and re-publish do to the bytes, the backfill for already-published shares, and where the image safety scan runs. Records the reversal of the "attachment ids or storage URLs absent by construction" contract. | F2     |
| Streaming persistence         | Extend the runtime-v2 Redis journal, add a new Redis partial store, or persist partials and reasoning on `ChatMessage`. Must settle whether reasoning traces are retained and for how long.                                                                                                                                                                                                                                                                          | F3     |
| Thread branching              | Whether a branch is a `parentMessageId` tree on `ChatMessage` or a copied thread, and how the flat DESC pagination renders it.                                                                                                                                                                                                                                                                                                                                       | F7     |

`docs/business/quotas-and-plan-ceilings.md` is not an ADR but blocks F13 the same way: it must
carry each corrected number, the decider, an absolute date, the effective date, and the
grandfathering rule.

## Risks

- `PATCH /users/:id` accepting `role` is reachable today by any `ADMIN`. Until it is gated,
  every other super-admin protection is decorative.
- `users_single_super_admin_idx` exists only in raw migration SQL and is invisible to
  `schema.prisma`; a future `prisma migrate dev` diff can propose dropping it.
- The dynamic `Role`/`RolePermission` tables are scaffolding — `RolesGuard` resolves
  permissions from the role enum slug, and no endpoint assigns a `roleId`. Do not build
  super-admin authority on top of that layer.
- Publishing share assets widens the public attack surface; the share-scoped route must not
  become a general file-read primitive.
- Touching the users service, plans service, entitlement applier, controllers, DTOs,
  frontend table/dialog/props/types and 13 locale files at once exceeds the lint-staged
  Windows 8191-character argument limit. Batches stay at or under 40 files.
