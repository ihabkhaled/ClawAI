# Skill — Run the whole QA team over a change

**Use when**: you changed anything at all — UI, API, backend behaviour, a bug
fix, a security control, a performance tweak, a benchmark, an audit result.
Before you say "done". Every time.

**Governing rules**: [rules/49](../rules/49-qa-team-discipline-and-test-evidence.md)
(the team you must be, and the evidence) ·
[rules/44](../rules/44-live-verification-before-done.md) (nothing is done until
it has been seen running)

**Companion**: [skills/verify-a-batch-live.md](verify-a-batch-live.md) — the
stale-container traps and the restart/recreate/rebuild table. Read that first if
your result looks impossible.

---

## 0. Prove the stack is running YOUR code

Skipping this makes every later result meaningless.

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "frontend|chat|auth"
docker restart claw-<svc>-1                     # dev containers bind-mount src/
docker logs claw-<svc>-1 --tail 5               # wait for "successfully started"
```

Frontend also needs the service worker unregistered, or you measure an old build.

## 1. API lane — curl the running service

Assert the status, the body, and the log line that proves the branch you meant
was taken.

```bash
TOK=$(curl -sk -X POST https://claw.local/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['tokens']['accessToken'])")

curl -sk -o /tmp/r.out -w "HTTP %{http_code}\n" \
  -X POST https://claw.local/api/v1/<route> \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{...}'

docker logs claw-<svc>-1 --since 2m 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -i "<the decision>"
```

**The log line is the real assertion.** A 201 only says the request was accepted;
it does not say your new branch ran. A feature that is silently bypassed returns
201 exactly like one that works — that is how a gate wired into the wrong call
path passed every HTTP check while never executing.

## 2. RBAC + plan lane — every role AND every tier

Run the same call as **admin, a paid user, and a free user**. Free is the one
that breaks: it is the tier you are never logged in as, and the default state
nobody tests.

```bash
# free tier must not 403 on an ordinary action, and must not get a paid feature
curl -sk -o /dev/null -w "free: %{http_code}\n" ... -H "Authorization: Bearer $FREE_TOK"
```

## 3. Browser lane — Playwright against https://claw.local

Drive the real flow. Assert on the **computed style / served class list**, never
on the `.tsx` source.

```bash
cd apps/claw-frontend && npx playwright test          # the suite
npx playwright test --headed                          # watch it happen
npx playwright test --debug                           # step through a failure
```

For exploratory work, drive the browser directly (Playwright MCP or
chrome-devtools MCP): navigate, snapshot, click, resize, screenshot. Look at it
with your own eyes — the designer hat cannot be delegated to an assertion.

## 4. Responsive lane — ≥3 widths per platform, both orientations

```js
// per breakpoint: resize, screenshot, then assert no horizontal overflow
await page.setViewportSize({ width: 820, height: 1180 }); // iPad portrait
await page.setViewportSize({ width: 1180, height: 820 }); // iPad landscape
document.documentElement.scrollWidth <= window.innerWidth; // must be true
```

| Platform | Widths             | Orientations        |
| -------- | ------------------ | ------------------- |
| Mobile   | 360 · 390 · 430    | portrait, landscape |
| Tablet   | 768 · 820 · 1024   | portrait, landscape |
| Desktop  | 1280 · 1440 · 1920 | —                   |

Check at each: no horizontal scroll, nothing overlapping or clipped, nothing
hidden under a fixed bar, navigation present, tap targets reachable. Then one
Arabic locale per platform for RTL.

## 5. The remaining hats (one line of evidence each)

- **Regression** — exercise the states you did _not_ change.
- **Security / pen** — authz bypass, IDOR, injection, leaked secret in the
  response or the log, unsafe default.
- **Performance** — two numbers, before and after. Payload size, latency, score.
- **Stress** — repeat it, run it concurrently, feed it something big, take a
  dependency down and confirm it fails the way you claimed.
- **Product** — reread the user's own words and confirm this is what they asked
  for.

## 6. Automate what you just proved

Anything you verified by hand that can be a test becomes one **in this batch**:
a Playwright spec for the flow, a unit spec for the branch, a scripted `curl`
for the contract.

## 7. Report the evidence

In the batch report, per claim: the command or action, and its real result.

```
- free user, AUTO research  → HTTP 201 (was 403)   [log: plan feature locked → research=NONE]
- "latest news" as admin    → evidence=6 tools=[web_search]   [log: AUTO -> SEARCH "current event"]
- iPad 820 portrait         → sidenav present, no horizontal scroll   [screenshot]
```

A lane you could not run is reported as not run, naming what is therefore
unproven. Never write a result you did not observe.
