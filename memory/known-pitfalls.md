# Known Pitfalls

Recurring traps that have bitten this codebase more than once. Each is abstracted
from a real incident so the lesson transfers beyond the specific symptom. See
[README](README.md) for entry format.

---

### SSE endpoints crash when a logger writes headers after the stream opens (2026-07-24, from earlier SSE work)

**What happened.** Server-Sent-Events routes crashed with `Cannot set headers
after they are sent to the client`. The cause was request logging middleware
(`pino-http` `autoLogging`) and a logging interceptor calling
`response.setHeader()` _after_ the SSE response had already begun streaming.

**The durable lesson.** Any long-lived streaming response is fundamentally
incompatible with middleware that assumes a single request→response→headers
lifecycle. The framework's default logging, rate-limiting, and error-filtering all
assume they can still touch headers late; a stream has already committed them.

**How to apply.**

- Mark streaming controllers to skip request logging (`@SkipLogging()`) and skip
  throttling (`@SkipThrottle()`).
- Exclude stream URLs from `autoLogging` in `app.module.ts`
  (`ignore: (req) => req.url?.includes('/stream/') ?? false`).
- The global exception filter MUST check `response.headersSent` before writing an
  error body.
- In nginx, streaming locations MUST set `proxy_buffering off`, `proxy_cache off`,
  `proxy_http_version 1.1`, `Connection ""`, and a long `proxy_read_timeout`. Put
  the stream location block _before_ the generic service location.

**Related.** Root `CLAUDE.md` → "SSE Streaming" gotchas; SDLC Phase 4.

---

### On total downstream failure you MUST persist a terminal record, or the client polls forever (2026-07-24, from earlier chat work)

**What happened.** When every LLM provider in the fallback chain failed, the
backend threw and stored nothing. The frontend's poll loop waited for an ASSISTANT
message that never arrived, so "AI is thinking…" spun indefinitely.

**The durable lesson.** A poll/wait loop's exit condition is a piece of data that
_must exist on the failure path too_. If the only thing that satisfies the loop is
a success record, failure becomes an infinite wait. Error is a first-class outcome
that needs a first-class record.

**How to apply.**

- On terminal failure, write a real record the poller already recognizes (e.g. an
  ASSISTANT message with `metadata.error = true`) _before_ re-throwing.
- Emit the fast-path signal (SSE error event) too, but never rely on it alone — the
  persisted record is the fallback the poller can always find.
- Give every poll loop a hard max (bounded attempts) as a final safety net.
- Wrap the failure-path persistence in its own try/catch so a secondary error
  can't swallow the primary one.

**Related.** `CLAUDE.md` → "Fallback & Error Handling"; SDLC Phase 5;
[rabbitmq-lessons](rabbitmq-lessons.md).

---

### `EventSource` cannot authenticate — use `fetch` + `ReadableStream` for authed streams (2026-07-24, from earlier SSE work)

**What happened.** Authenticated SSE could not send a bearer token because the
browser `EventSource` API cannot set request headers. The workaround of putting the
JWT in a URL query param leaks the token into server logs, browser history, and the
`Referer` header.

**The durable lesson.** Convenience streaming APIs that hide the request often hide
the ability to authenticate it. Never smuggle credentials into a URL to work around
an API's limitation — the URL is the least private part of an HTTP request.

**How to apply.** Consume authed streams with `fetch()` + `Authorization: Bearer`

- a `ReadableStream` reader (see the frontend `sse.utility.ts` pattern). Keep tokens
  in headers only. The REST token-refresh interceptor does NOT cover raw stream
  connections — handle 401 on the stream explicitly.

**Related.** `CLAUDE.md` → "Authentication" gotchas; [authentication-lessons](authentication-lessons.md).

---

### The i18n schema type and the locale files are one atomic change (2026-07-24, recurring since 2026-05-10)

**What happened.** New translation keys were added to locale files without updating
the `TranslationDictionary` schema type (`i18n.types.ts`), or vice-versa. The next
`typecheck` failed for everyone because the locale files became provably wrong at
the type level. Separately, English strings were copied verbatim into non-English
locales as placeholders, shipping an English UI to German/Arabic users (caught by an
audit script, not by typecheck — 1131 such entries in one sweep).

**The durable lesson.** A schema and its instances are a single unit of change; a
type that isn't updated with its data is a latent build break. And a placeholder in
the wrong human language is a shipped defect, not a TODO — no compiler catches it.

**How to apply.**

- Add a new key to `en.ts`, the schema type, and all 8 other locales **in the same
  commit**, with real native translations (loanwords allowed only when genuinely
  identical in the target language).
- Run the untranslated-audit script before committing.
- Spot-check one non-English locale (e.g. `de`, `ar`) in the browser after adding
  keys.

**Related.** `CLAUDE.md` → i18n rules; [frontend-patterns](frontend-patterns.md);
[documentation-lessons](documentation-lessons.md).

---

### `t()` is not type-safe against the dictionary — a wrong key renders raw to the user (2026-07-24, from 2026-05-10 incident)

**What happened.** Entire admin pages rendered raw strings like
`admin.policies.title` because the frontend called keys under `admin.*` while the
dictionary declared them under `adminAutomation.*`. `t()`'s first parameter is plain
`string`, not `keyof TranslationDictionary`, so typecheck, lint, and tests were all
green. Only a browser visit caught it.

**The durable lesson.** A stringly-typed lookup gives zero compile-time protection.
Green gates are necessary, not sufficient — anything the type system can't see needs
a human eye or a runtime assertion.

**How to apply.** When you add a `t('a.b.c')` call, immediately verify the exact key
chain exists in the dictionary. Visually spot-check the page. Long term, make `t()`
generic over the dictionary so unknown keys become type errors.

**Related.** `CLAUDE.md` → "`t()` is NOT type-safe"; [frontend-patterns](frontend-patterns.md).

---

### Frontend type field names MUST mirror backend DTO/Prisma names verbatim (2026-07-24, from WebhookDelivery bug 2026-05-10)

**What happened.** A frontend type renamed the backend's `createdAt` field to
`receivedAt`. Date rendering silently broke because `new Date(undefined)` is
`Invalid Date`. Typecheck stayed green — the FE type was internally consistent, just
disconnected from the wire shape.

**The durable lesson.** At a service boundary, the field name _is_ the contract. A
"nicer" local name silently drops data because the wire payload never had it. Type
consistency within one side proves nothing about cross-boundary correctness.

**How to apply.** FE types mirror BE DTO/Prisma field names exactly. If you want a
friendlier label, rename only the UI string, never the type field. When a BE
`.strict()` Zod schema is involved, the FE filter type must be the exact accepted-key
set, not a superset — a stray field 400s the whole request.

**Related.** `CLAUDE.md` → Frontend Key Rules; [backend-patterns](backend-patterns.md);
[testing/contract-testing-standard](../testing/contract-testing-standard.md).

---

### `localeCompare` and other locale-sensitive APIs are non-deterministic across environments (2026-07-24)

**What happened.** Sorting and string comparison via `String.prototype.localeCompare`
(and `toLocaleLowerCase`, `Intl.Collator` with default locale) produced different
orderings depending on the host's ICU/locale configuration. Tests passed on one
machine and failed in CI/containers whose default locale differed.

**The durable lesson.** Any API whose behavior depends on ambient locale is a hidden
environment dependency. Determinism requires pinning the locale explicitly, or using
a locale-independent comparison for machine-facing ordering.

**How to apply.** For user-facing display sort, pass an explicit locale
(`localeCompare(b, 'en')` or a fixed `Intl.Collator('en')`). For stable
machine ordering (query keys, cache keys, canonical IDs), use byte/codepoint
comparison, not locale collation. Never rely on the host default locale in code
that must be deterministic across dev, CI, and containers.

**Related.** [testing/flaky-test-policy](../testing/flaky-test-policy.md);
[deployment-lessons](deployment-lessons.md).

---

### Not every service has a shared port/name constant — verify before assuming (2026-07-24)

**What happened.** Code assumed every service exposed a constant in
`shared-constants`, but `client-logs` and `server-logs` were referenced without a
dedicated port constant, so a lookup returned undefined.

**The durable lesson.** "There's a constant for everything" is an assumption, not a
guarantee. Missing-by-omission is a real state; guard for it instead of trusting the
happy shape.

**How to apply.** Before referencing a `shared-constants` entry, confirm it exists.
When adding a service, add its port and name constants as part of the same change
(the 18-item infra checklist). Prefer a typed lookup that fails loudly on a missing
key over silent `undefined`.

**Related.** `CLAUDE.md` → shared-constants rule; [deployment-lessons](deployment-lessons.md).
