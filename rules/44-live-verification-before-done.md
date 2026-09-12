# Rule 44 — Nothing is done until it has been seen running

**Applies to**: every batch, every fix, every change that reaches a user or an
API client. No exceptions for "small".

**Related**: [rules/22](22-testing-and-coverage.md) ·
[rules/34](34-gate-economy-and-machine-resources.md) ·
[rules/03](03-frontend-rules.md) ·
[skills/verify-a-batch-live.md](../skills/verify-a-batch-live.md)

---

## 1. Green unit tests are not evidence that the feature works

They are evidence that the code you wrote does what you thought it did. They
cannot tell you that the container is running your code, that the route resolves,
that the CSS class reached the DOM, or that the service worker is not serving a
build from an hour ago.

Every one of those has shipped a "done" change that was visibly broken:

| Proven green                                     | Actually served                                            |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `ROUTES.CHECK_EMAIL` correct, tests pass         | `/en/undefined` — a stale service-worker chunk             |
| `className="w-full gap-2"` in source, tests pass | `gap-2` absent from the live DOM, icon welded to the label |
| Cooldown unit-tested with a mocked Redis         | Needed a live call to prove the window decrements at all   |

**A batch is not done until it has been exercised against the running stack.**

## 2. Both lanes, every batch

**API lane — `curl` against the real service.** Assert the status code, the body
AND, where the contract is about indistinguishability, the timing. One call is
not a test: a cooldown that returns `60` twice in a row proves nothing until you
wait and see `47`.

```bash
# Both branches must be identical in body and in cost
curl -sk -X POST https://claw.local/api/v1/auth/login -d '{"email":"nope@example.com",...}'
curl -sk -X POST https://claw.local/api/v1/auth/login -d '{"email":"real@example.com",...}'
```

**Browser lane — Playwright against `https://claw.local`.** Drive the real flow:
fill the form, click the button, read the rendered result. Check the state you
changed AND the states you did not.

For anything visual, **assert on the computed style or the served class list**,
not on the source file:

```js
// This is what catches a stale container. Reading the .tsx never does.
getComputedStyle(button).columnGap;
button.className;
```

## 3. Before you believe a browser result, make sure it is your code

A frontend container can serve stale output three different ways, and each looks
exactly like "my change did not work":

1. **The PWA service worker** re-serves cached chunks. `docker restart` does NOT
   clear it. Unregister it and clear caches, then reload.
2. **The dev container** may not have picked up the bind-mounted edit.
3. **A `NEXT_PUBLIC_*` or shared-package change** needs a rebuild, not a restart.
   Restart, recreate and rebuild are three different things: a runtime `.env`
   value needs `service:recreate`, and a `NEXT_PUBLIC_*` or shared package needs
   `service:rebuild` — see [`skills/06-docker-toolkit.md`](../skills/06-docker-toolkit.md).

```js
// Run this first, every browser session, before concluding anything
const regs = await navigator.serviceWorker.getRegistrations();
for (const r of regs) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
```

**Then prove the new code is present** — find the string, class or route you
added in the live DOM — before measuring whether it behaves.

## 4. Report what you ran, not that you ran it

"Tested end to end" is not a report. Name the lane, the input and the observed
output:

> Cooldown: `60 → 47` after 13 s on the same address; a different address got a
> fresh `60`; an unknown address is limited identically. Login timing over 5
> samples: unknown 0.0708 s avg, known 0.0692 s — indistinguishable.

If a lane was skipped, say which and why. If the stack was not running, the batch
is not verified — say that rather than implying it was.

## 5. Every state, not the happy path

The one that breaks is the one nobody opened. For each change, exercise:

- the success path;
- every failure the user can actually reach (wrong password, unverified account,
  suspended, rate-limited, expired link);
- the empty/absent-parameter state (`?email=` missing, no results, zero rows);
- the disabled/cooldown state, by clicking the control again;
- at least one non-English locale when the change touched i18n, and an RTL one
  (`ar` / `fa`) when it touched layout.

---

## Enforcement

This rule is enforced by review and by the batch report, not by a hook — a git
hook cannot drive a browser, and gating commits on a running stack would make
the stack a dependency of version control.

What that means in practice: **a batch report with no observed outputs in it is
an incomplete batch**, and the next agent should treat its claims as unverified.

Runbook: [skills/verify-a-batch-live.md](../skills/verify-a-batch-live.md)
