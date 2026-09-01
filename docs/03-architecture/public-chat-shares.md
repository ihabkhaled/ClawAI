# Public shared chats

Lets a user publish one of their conversations at a URL anyone can open, with
no account. Owned entirely by `claw-chat-service`.

## The one rule that shapes everything else

**A published chat is an immutable snapshot, not a live view of the thread.**

Someone shares a conversation about nginx config. Three weeks later they use the
same thread to debug a production incident, paste a connection string, and
discuss a customer by name. If the public page were a live projection, all of
that would already be on the internet.

So publishing **copies** the messages into `chat_share_messages`. Later messages
stay private until the owner explicitly presses _Update shared version_. The
private thread and the public page are two different sets of rows.

That also means the filtering happens at **write** time, not read time. A
message that was never copied cannot be leaked by a later bug in the read
path — it simply is not in the table the public endpoint queries.

## Visibility

Three states, not two booleans:

| State             | Reachable by URL | In sitemap | Robots                         | Ads              |
| ----------------- | ---------------- | ---------- | ------------------------------ | ---------------- |
| `PRIVATE`         | no — 404         | no         | noindex                        | no               |
| `PUBLIC_UNLISTED` | yes              | no         | `noindex, nofollow, noarchive` | only if eligible |
| `PUBLIC_INDEXED`  | yes              | yes        | `index, follow`                | only if eligible |

Indexing is **granted, not requested**. The owner asking for it is necessary but
not sufficient: a snapshot that trips the safety scan or is too thin stays
`PUBLIC_UNLISTED`. Reachable by URL for the people the owner sent it to, absent
from every search engine.

## What never leaves

The public DTO is an **allow-list**. A field appears only because somebody added
it deliberately, and every mapping is an explicit field list — a spread would
publish the next column somebody adds to the model.

Never published: `userId`, the private `threadId`, original message ids, system
prompts, tool output, context receipts, memory records, routing metadata, token
counts, cost estimates, latency, provider response bodies, moderation state,
attachment ids and storage URLs, error messages, empty messages.

`SYSTEM` and `TOOL` messages are excluded permanently. A system prompt is the
operator's — business instructions, jailbreak defences, customer-specific
configuration. Tool output can carry raw connector responses including
credentials and internal endpoints. Neither is part of the conversation the user
had.

## The public identifier

base64url of 16 random bytes from the CSPRNG — 128 bits, 22 characters,
URL-safe.

- **Unguessable.** An unlisted share's only protection is that nobody can find
  its URL, so the id space must not be walkable.
- **Non-sequential.** A counter would let anyone enumerate every share ever
  published and leak roughly how many exist.
- **Opaque.** No thread id, no user id, no timestamp. Nothing decodes back into
  private state.
- **Spent on revocation.** Revoking marks the row `REVOKED` rather than deleting
  it, so the identifier can never be reissued and resolve to different content.
  Re-publishing mints a new one.

Shape is validated before the database is touched, so an enumeration sweep is
refused at the edge rather than costing a query per attempt.

## Safety scanning

Before a snapshot can be indexed it is scanned for credential- and PII-shaped
content. The realistic failure is not an attacker — it is a user who pasted an
API key into a chat six weeks ago and forgot.

A hit sets `REQUIRES_REVIEW`: the owner can still share unlisted, but the page
does not go into a search index with an apparent credential in it. Thin content
is not a safety problem, just not worth indexing, so it stays `PENDING`.

**Reasons are machine codes. The matched text is never returned or logged** —
echoing a detected secret into an error payload is precisely the leak being
prevented. The codes are also deliberately coarse; a code naming which detector
fired would tell somebody how to evade it.

Every pattern is anchored and bounded, and
`secret-patterns.constants.spec.ts` runs each one against adversarial inputs
with a time bound. These regexes execute against attacker-supplied chat content,
so a catastrophic backtrack would turn "user pastes a long string" into a denial
of service on the publish path.

## Ad eligibility

Server-derived and fail-closed. `indexEligible` and `adsEligible` are separate
snapshot decisions. A safe, substantial chat may be indexed while remaining
ad-ineligible. Discovery queries never filter on `adsEligible`.

A URL matching `/share/chat/*` is never enough on its own. That is the
difference between "this page is allowed to show ads" and "this page has the
right shape".

### Temporary AdSense review lockdown (2026-09-01)

`CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED`
(`apps/claw-frontend/src/constants/chat-share-review-lockdown.constants.ts`)
overrides the per-snapshot `adsEligible`/`indexEligible` decisions above to
`false`/excluded for **every** share while it is `true`: no ad units, no
`index` robots directive, absent from `sitemap.xml`'s chat child documents,
absent from every RSS/Atom feed. It does not touch the chat-service scan or
the persisted DB columns — it is a frontend-only, one-flag override so lifting
it later needs no backfill. See
[`docs/03-architecture/adsense-eligibility.md`](adsense-eligibility.md) and
[`rules/38-adsense-eligibility-and-low-value-content.md`](../../rules/38-adsense-eligibility-and-low-value-content.md).

Flip it to `false` only after AdSense approves the account AND a dedicated
content-quality review of shared chats has happened — not on the assumption
that the per-snapshot safety scan is sufficient on its own.

## Caching

The public endpoint sends `no-store`, and nginx is configured not to reintroduce
caching in front of it.

Immediate privacy beats cache efficiency. When an owner revokes a share the page
must stop resolving _now_ — "it expires in 60 seconds" is not an answer to
somebody who just realised what they published. Caching can be tightened later
once invalidation is proven; the wrong order would leave revoked conversations
served from a cache.

## Uniform 404

Private, revoked, deleted, malformed and never-existed all return the same bare 404. Any distinction between them would confirm that an identifier was once
valid, which is exactly what the owner revoked.

The status and visibility filters live in the `WHERE` clause rather than being
applied to the result, so the query returns nothing at all for an unavailable
share.

## Canonical URLs

Built from `PUBLIC_SITE_URL`, never from a request `Host` or `X-Forwarded-Host`
header. An attacker who can set that header would otherwise have us mint — and
hand to a search engine — a canonical URL pointing at a domain they control.

## Endpoints

| Method   | Path                                                  | Auth          |
| -------- | ----------------------------------------------------- | ------------- |
| `GET`    | `/api/v1/chat-threads/:threadId/share`                | owner         |
| `POST`   | `/api/v1/chat-threads/:threadId/share`                | owner         |
| `PATCH`  | `/api/v1/chat-threads/:threadId/share`                | owner         |
| `POST`   | `/api/v1/chat-threads/:threadId/share/refresh`        | owner         |
| `POST`   | `/api/v1/chat-threads/:threadId/share/regenerate-url` | owner         |
| `DELETE` | `/api/v1/chat-threads/:threadId/share`                | owner         |
| `GET`    | `/api/v1/public/chat-shares/:publicShareId`           | **none**      |
| `GET`    | `/api/v1/internal/chat-shares/sitemap-feed`           | service token |
| `GET`    | `/api/v1/internal/chat-shares/sitemap-count`          | service token |
| `GET`    | `/api/v1/internal/chat-shares/rss-feed`               | service token |

Owner identity always comes from the verified JWT via `@CurrentUser`, never from
a body or a path. The manager independently re-checks thread ownership, so an
IDOR attempt fails at the data layer even if a future route forgets to.

A thread belonging to someone else reports **not found**, not forbidden —
forbidden would confirm the id exists.

The sitemap feed returns opaque keyset pages containing only
`{ publicShareId, contentLocale, updatedAt }`; the cursor uses `updatedAt` plus
the stable row id to prevent timestamp ties from skipping rows. The RSS feed
adds only a sanitized title/description and publication timestamps. Neither
internal feed exposes transcript content or owner/private identifiers.

Each immutable snapshot stores `contentLocale` (existing rows migrate to
English). Its only canonical public URL is
`/{contentLocale}/share/chat/{publicShareId}`. A request under another supported
locale redirects permanently to that canonical locale; no fake translated
alternate is emitted.

## Environment

| Variable          | Default              | Purpose                         |
| ----------------- | -------------------- | ------------------------------- |
| `PUBLIC_SITE_URL` | `https://claw.local` | Canonical origin for share URLs |

## Related

- `apps/claw-chat-service/src/modules/chat-shares/` — implementation
- `docs/04-backend/service-guide-chat.md` — service overview
