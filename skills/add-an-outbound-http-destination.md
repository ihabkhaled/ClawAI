# Skill — Call a host this platform has never called before

**When you need this**: a service must make an HTTP request to a host it does
not already reach, and the call fails with

```
httpRequest: refusing a host this service does not call: <host>
```

That is not a bug. Since 2026-09-20 the shared HTTP client
(`packages/shared-utilities/src/http-client`) refuses every host that is not on
its allowlist — no opt-out, no default-allow. It closes CodeQL alert #58
(js/request-forgery): the URL goes straight to `fetch`, so the chokepoint, not
each caller, decides where this process may connect.

**Related**: [`rules/21-security-and-secrets.md`](../rules/21-security-and-secrets.md) ·
[`rules/08-security-rules.md`](../rules/08-security-rules.md) ·
TD-037 / TD-038 in [`docs/14-risk-debt/technical-debt.md`](../docs/14-risk-debt/technical-debt.md)

---

## Pick the right of the three sources

The allowlist is the union of exactly three things. Which one you add to depends
on where the host comes from — not on which is easiest.

| The host is…                                             | Add it to                                                   | How                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| another ClawAI service, or a component we deploy         | the **environment**                                         | nothing to do — any `*_SERVICE_URL`, `*_BASE_URL`, `*_API_URL` or `*_ENDPOINT` variable is picked up automatically |
| a third party whose address is a decision, not a setting | **`EXTERNAL_ENDPOINT_HOSTS`** in `request-url.constants.ts` | add the base URL to `EXTERNAL_ENDPOINT_URLS`; the host is derived, so it cannot drift                              |
| set by an operator in the admin UI (a connector)         | **the call site**                                           | pass `declaredHost(baseUrl)` as the last argument                                                                  |

```ts
import { declaredHost, httpGet } from '@claw/shared-utilities';

await httpGet<Stats>(`${baseUrl}/system_stats`, { timeout: 5_000 }, declaredHost(baseUrl));
```

## The rules that do not bend

- **Never widen the check to make a call work.** Removing the argument, passing
  an empty set, or reaching for `fetch` directly is the hole the alert names.
  If none of the three sources fits, the destination is the thing to question.
- **Never add a host to `EXTERNAL_ENDPOINT_HOSTS` that an operator can change.**
  A configurable host belongs at the call site, where it is visible per request.
- **A shared package may not import a service.** The payment gateway hosts are
  therefore written twice, and
  `apps/claw-payment-service/src/modules/gateways/__tests__/gateway-hosts-allowlisted.spec.ts`
  fails if the copies drift. Any other duplicated literal needs the same pin.
- **Redirects are refused** (`redirect: 'error'`, `maxRedirects: 0`). An
  allowlisted host that answers with a 302 would otherwise take the call
  somewhere nothing checked.

## The one stand-down, and what it is for

A process whose environment names no service at all — a unit test, a one-off
script — skips the host check. The protocol, credential and metadata rejections
still apply. A deployed service always has those variables, so this never
relaxes production. Do not lean on it: a test that needs a specific host should
pass `declaredHost(...)` and prove the real path.

## Verify

```bash
cd packages/shared-utilities && npm test -- http-client
cd ../../apps/claw-payment-service && npm test -- gateway-hosts
```

Then the live lane for the service you changed: make the real call and read the
log line, per [`rules/44`](../rules/44-live-verification-before-done.md). A
refusal in production looks like a provider outage in the logs, so prove the
allowed path before calling it done.
