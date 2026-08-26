# Verification record — Feedback System

Everything below was executed against the running stack on 2026-08-23. Each
line is a command that ran and the result it produced, not a claim.

## Gates

| Gate                           | Result                        |
| ------------------------------ | ----------------------------- |
| `claw-audit-service` typecheck | 0 errors                      |
| `claw-audit-service` lint      | 0 errors                      |
| `claw-audit-service` tests     | **273 passed** (152 feedback) |
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
boundary; this uses a second, genuine account with role USER and makes the calls
an attacker would make by hand. The account is supplied by environment variable
so no new credential is committed:

```
FEEDBACK_USER_EMAIL=<address> FEEDBACK_USER_PASSWORD=<password> ./rbac-boundary.sh
```

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

## Attachment round trip — 9/9 passed

Run with `attachment-round-trip.sh`. The unit suite covers the attachment rules
with a mocked file-service; this drives a real image through the real pipeline.

```
upload a real PNG to file-service            201  (fileId returned)
attach it to a ticket                        201  FDB-000014
attachment fileId that does not exist        400  <- was 500
admin streams the attachment                 200
  Content-Type                               image/png
  X-Content-Type-Options                     nosniff
  Content-Security-Policy                    default-src 'none'; sandbox
  bytes returned                             identical PNG
a fileId not attached to this ticket         404
```

file-service also rejected a deliberately wrong `sizeBytes` in the harness
(`FILE_SIZE_MISMATCH`), so the declared size is checked against the decoded
bytes rather than believed.

## ReDoS check on the link rewriter — measured, not assumed

ESLint's `security/detect-unsafe-regex` flags the Markdown link pattern
`/(!?)\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g`. It is a heuristic false
positive: the two alternatives are disjoint on their first character, so each
position has exactly one way to match and backtracking stays linear. Measured at
the 8000-character content cap:

```
unclosed target, all safe chars   0.06 ms
unclosed nested parens            0.02 ms
open parens only                  0.01 ms
alternating "x(" ...              0.00 ms
400 complete links                0.05 ms
```

The warning is left standing rather than suppressed — suppressing findings is
prohibited, and a warning that is explained is more useful than one that is hidden.

## Defects this verification found

Live testing found eight defects that the unit suite had not:

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
8. **A bogus attachment reference crashed the request with a 500.**
   file-service answers **200 with an empty body** for an id that does not
   exist, so `!response.ok` never fired and `response.json()` threw an unhandled
   `SyntaxError`. The caller saw a 500, and the ownership, MIME and size checks
   never ran on that path. The peer's payload is now parsed defensively and
   shape-checked with Zod, so an empty, non-JSON, `null` or incomplete body is a
   400 `FEEDBACK_ATTACHMENT_INVALID` like any other bad reference.

Every one is fixed, and every one now has a regression test.
