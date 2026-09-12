# Skill — Verify a batch live (API + Playwright)

**Use when**: you are about to call any batch done. Every batch, every fix.

**Governing rule**: [rules/44](../rules/44-live-verification-before-done.md)

---

## 0. Is the stack up, and is it running YOUR code?

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "frontend|auth|connector"
```

Anything not `healthy` invalidates the run. A crash-looping service reads as "my
feature is broken".

**Restart vs recreate vs rebuild** decides whether your edit is even in there:

| You changed                                          | You need                                   |
| ---------------------------------------------------- | ------------------------------------------ |
| a `src/**` file in a dev container                   | `docker restart <svc>` (bind-mounted)      |
| a runtime `.env` value                               | `./scripts/claw.sh service:recreate <svc>` |
| a `NEXT_PUBLIC_*`, a shared package, or a dependency | `./scripts/claw.sh service:rebuild <svc>`  |

A shared-package change that is only restarted shows up as a silent crash-loop,
or worse as old behaviour: the image BAKES `node_modules` and the shared
packages while bind-mounting only `src`, so the container keeps running the
stale `dist`. Symptom to recognise: `ERR_MODULE_NOT_FOUND` on
`packages/shared-*/dist/<file>`, or a `TS2305: has no exported member` for a
symbol you just added to a shared package.

Confirm the source actually landed:

```bash
MSYS_NO_PATHCONV=1 docker exec claw-frontend sh -c 'grep -n "MY_NEW_SYMBOL" /app/apps/claw-frontend/src/...'
```

## 1. API lane

Real service, real TLS, real payloads. `https://claw.local/api/v1/...`.

```bash
# Status + body
curl -sk -X POST https://claw.local/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' -w "\nHTTP=%{http_code}\n"

# Timing, when the contract is "these must be indistinguishable".
# One sample is noise — loop, and compare averages.
for i in 1 2 3 4 5; do
  curl -sk -o /dev/null -X POST ... -w "unknown %{time_total}\n"
  curl -sk -o /dev/null -X POST ... -w "known   %{time_total}\n"
done
```

**Build real fixtures rather than asserting against seeds.** Register a throwaway
account to get a genuine `PENDING` row; do not assume one exists.

**A stateful contract needs a second call after real time has passed.** A
cooldown that answers `60` twice tells you nothing; `60` then `47` proves the
window exists.

Log in for authenticated routes — the token is at `tokens.accessToken`, **not**
`accessToken`:

```bash
TOKEN=$(curl -sk -X POST https://claw.local/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' | jq -r '.tokens.accessToken')
```

## 2. Browser lane

**Always start here, or you will debug a cache:**

```js
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
```

Then reload and **prove the new code is present before measuring behaviour**.
For a visual change, read the live DOM — never the source file:

```js
const b = [...document.querySelectorAll('button')].find((x) => /Send again/.test(x.textContent));
getComputedStyle(b).columnGap; // "normal" means your class never arrived
b.className; // does it contain what you added?
b.disabled;
```

Note the URL shape: routes are locale-prefixed, so `/check-email` redirects to
`/en/check-email`. Assert against the final URL.

Then drive the flow — fill, click, read the accessibility snapshot — and check
every state from rule 44 §5, not just the happy one.

Responsive and RTL, when layout or i18n moved:

```js
await page.setViewportSize({ width: 390, height: 844 }); // phone
await page.setViewportSize({ width: 820, height: 1180 }); // tablet
await page.setViewportSize({ width: 1440, height: 900 }); // desktop
```

plus `/ar/...` for a right-to-left pass.

## 3. Write down what you saw

Copy the observed values into the batch report. Not "verified" — the numbers:

> `60 → 47` after 13 s, same address; different address `60`; unknown address
> limited identically. Login: unknown 0.0708 s vs known 0.0692 s over 5 samples.

## Failure modes this exists to catch

- **A route resolving to `/undefined`** — a stale chunk, not a code bug.
- **A class missing from the DOM** while present in the file.
- **A cooldown that never actually ticks** because Redis was unreachable and the
  code failed open.
- **A page that works signed out and breaks signed in** (or the reverse).
- **A translated string that renders as the raw key** — `t()` is not type-safe
  against `TranslationDictionary`.
- **RTL layout collapsing** on `ar`/`fa` while `en` looks perfect.
