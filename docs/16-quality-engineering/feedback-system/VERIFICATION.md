# Verification record — Feedback System

Everything below was executed against the running stack on 2026-08-23. Each
line is a command that ran and the result it produced, not a claim.

## Gates

| Gate                           | Result                        |
| ------------------------------ | ----------------------------- |
| `claw-audit-service` typecheck | 0 errors                      |
| `claw-audit-service` lint      | 0 errors                      |
| `claw-audit-service` tests     | **148 passed**                |
| `claw-frontend` typecheck      | 0 errors                      |
| `claw-frontend` lint           | 0 errors                      |
| `claw-frontend` tests          | **1993 passed / 340 files**   |
| `knowledge:test` (repo-wide)   | 184 passed, 0 failed          |
| pre-commit / pre-push hooks    | OK on every commit, no bypass |

## Live API security assertions — 18/18 passed

Run with `live-pentest.sh` against `https://claw.local`.

**Authentication required** — POST /feedback, GET /feedback/admin,
GET /feedback/mine, PATCH status and a garbage bearer token all answer **401**.

**Admin surface reachable with the right permission** — list, stats and the
own-ticket list all answer **200**.

**Validation is server-side** — empty body, missing title, unknown type,
over-length title, disallowed attachment MIME, `limit=100000`,
`sortBy=password` and `status=PWNED` all answer **400**.

**Not-found is not a crash** — an unknown ticket id answers **404**, not 500.

## Ticket numbering

Six tickets created through the API produced `FDB-000001` … `FDB-000006`,
sequential and unique, allocated by an atomic `$inc` with `upsert`.

## Lifecycle — verified live

```
OPEN         -> IN_PROGRESS : 200
IN_PROGRESS  -> RESOLVED    : 200
RESOLVED     -> ARCHIVED    : 200
ARCHIVED     -> CLOSED      : 409   <- correctly refused
ARCHIVED     -> OPEN        : 200   <- reopen
```

Final state carried `resolvedAt`, `archivedAt` and `reopenedAt`, and the
history held all five entries with the acting admin's address.

## Stored XSS — verified inert end to end

A ticket was submitted containing `<script>`, `<img onerror>`, `<iframe>`,
`<svg onload>`, `javascript:`, entity- and percent-encoded `javascript:`,
`vbscript:` and the nesting payload `<scr<!-- -->ipt>`. What was stored:

```
title  : XSS attempt &lt;script>alert(1)&lt;/script>
subject: &lt;img src=x onerror=alert(1)>
content: &lt;script>alert(document.cookie)&lt;/script> | click | &lt;scr&lt;!-- -->ipt>…
```

- no raw `<` anywhere in the stored ticket
- no `javascript:`, `vbscript:` or `data:text/html` survived
- the admin page raised **no `alert()`** and rendered **no** injected
  `script` or `iframe` element

## Browser end-to-end — 20/20 passed

| Check                                                 | Result |
| ----------------------------------------------------- | ------ |
| admin can sign in                                     | PASS   |
| floating launcher present on a portal page            | PASS   |
| feedback dialog opens                                 | PASS   |
| dialog exposes its controls (15)                      | PASS   |
| title field present                                   | PASS   |
| markdown toolbar rendered                             | PASS   |
| screen capture offered                                | PASS   |
| attachment drop zone offered                          | PASS   |
| dialog closes after a successful submission           | PASS   |
| ticket filed through the UI appears in the admin list | PASS   |
| admin route renders                                   | PASS   |
| admin list shows seeded ticket numbers                | PASS   |
| type labels translated, not raw keys                  | PASS   |
| status labels translated, not raw keys                | PASS   |
| no `alert()` raised by stored content                 | PASS   |
| no injected script or iframe in the DOM               | PASS   |
| escaped markup shown as text                          | PASS   |
| no horizontal overflow at 390 px                      | PASS   |
| launcher reachable at 390 px                          | PASS   |
| no console errors from feedback surfaces              | PASS   |

Ticket detail dialog, separately: opens from a row click, shows the ticket
number and history, renders no script or iframe, raises no `alert()` — 5/5.

Screenshots: [`evidence/`](evidence/) — launcher (desktop and mobile), the
dialog, the admin list, the mobile admin layout, post-submission, and the
ticket detail dialog showing hostile content rendered as inert text.

## RBAC boundary against a real non-admin session — 9/9 passed

Run with `rbac-boundary.sh`. An unauthenticated 401 does not prove the admin
boundary; this uses a second, genuine account (`feedback.user@claw.local`,
role USER) and makes the calls an attacker would make by hand.

**Every admin route refuses a normal user with 403**

```
GET   /feedback/admin                        403
GET   /feedback/admin/stats                  403
GET   /feedback/admin/:id                    403
PATCH /feedback/admin/:id/status             403
GET   /feedback/admin/:id/attachments/:file  403
```

**The same user can still use what they are entitled to**

```
POST /feedback        201
GET  /feedback/mine   200
```

**Tenant isolation — the IDOR is closed against a live second identity**

```
user's own list : 1 ticket,   reporters = [feedback.user@claw.local]
admin total     : 13 tickets
```

The own-ticket list contains only the caller's tickets and is a strict subset
of all tickets. Before the fix this returned all 13.

**The permission upgrade path works on an existing install.** auth-service
logged on boot:

```
PermissionsSeederService reconcileRole: drift detected —
  roleSlug=USER added=[JUDGE_USE,FEEDBACK_SUBMIT] removed=[] finalGrantCount=25
```

so `FEEDBACK_SUBMIT` reaches an already-seeded database without a manual step.

## Defects this verification found

Live testing found seven defects that the unit suite had not:

1. **IDOR** — `GET /feedback/mine` returned every user's tickets; `userId` was
   accepted by the manager and then dropped when the query was built.
2. **Incomplete sanitization** (CodeQL High) — tag removal by pattern is
   defeated by nesting; replaced with escaping.
3. **Attachment metadata spoofing** — the caller's MIME claim was stored and
   later echoed as `Content-Type`.
4. **Title and subject unsanitised** — the body was cleaned, the headline was not.
5. **Stray bracket on stripped links** — `[x](javascript:alert(1))` became `x)`.
6. **Ticket-number search returned everything** — Mongo tokenises the hyphen,
   so `FDB` matched every row.
7. **Raw Mongo documents in responses** — `_id`, `__v` and the internal
   `searchText` reached the client while `id` never did.

Every one is fixed, and every one now has a regression test.
