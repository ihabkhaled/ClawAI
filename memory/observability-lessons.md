# Observability Lessons

Durable lessons about being able to see what the system did (structured Pino logging →
RabbitMQ `log.server` → server-logs Mongo, TTL 30d; X-Request-ID correlation; audit
events). See [README](README.md).

---

### A method with zero logs is un-debuggable at 2 AM (2026-07-24, from 2026-04-26 rule)

**What happened.** Methods with no log statements left operators blind: a failing
request left no trace of where it went or why it stopped.

**The durable lesson.** Logging is not optional decoration — it is the only way a
request can be reconstructed after the fact. A silent method is a black box the moment
it misbehaves. "Too small to need logs" is not a real category.

**How to apply.** Every public method in `*.service.ts`/`*.manager.ts`/`*.adapter.ts`/
`*.utility.ts`/`*.repository.ts` emits: `debug` on entry (non-PII inputs), `error` in
every catch before rethrow/fallback, `info` on every side effect (DB write, HTTP call,
publish, file write), `warn` on every retry/fallback/degraded path. Zero-log method =
delivery blocker.

**Related.** `CLAUDE.md` → mindset 21 logging-coverage;
[backend-patterns](backend-patterns.md).

---

### Correlation IDs must flow end-to-end or a distributed trace is impossible (2026-07-24)

**What happened.** With 17 services, a single user action fans out across HTTP hops
and events. Without a shared ID, correlating the pieces after a failure is guesswork.

**The durable lesson.** In a distributed system the correlation ID _is_ the trace.
Drop it at one hop and the causal chain breaks exactly where you most need it.

**How to apply.** Propagate `X-Request-ID` from frontend through every hop; background
jobs mint and log a correlation ID (e.g. retention sweep uses
`requestId=retention-sweep-<runId>`). Include `requestId`/`traceId` in structured
log fields.

**Related.** [rabbitmq-lessons](rabbitmq-lessons.md);
[testing/integration-testing-standard](../testing/integration-testing-standard.md).

---

### Redaction is the default; a leaked secret in a log has a 30-day tail (2026-07-24)

**What happened.** Logging full request/response bodies risks capturing tokens,
passwords, and API keys, which then persist for the log TTL and propagate downstream.

**The durable lesson.** A log line is a durable, replicated artifact. A secret that
reaches it is leaked for as long as the retention window and everywhere the logs ship.

**How to apply.** Use `safeStringify` / the Pino redaction config
(authorization/password/refreshToken/apiKey/token/secret). Extend it for new
sensitive fields; never bypass it; never log full bodies that may hold credentials.

**Related.** [authentication-lessons](authentication-lessons.md).

---

### Scan Docker logs for critical errors as an acceptance gate (2026-07-24)

**What happened.** Features "worked" in the browser while the service logs carried
`UnhandledPromiseRejection` / `FATAL` — real defects invisible from the UI.

**The durable lesson.** The UI shows the happy result; the logs show the truth. An
unhandled rejection is a blocker even when the screen looks fine, because it signals a
path the code didn't actually handle.

**How to apply.** After every test run, scan the service logs; zero
`UnhandledPromiseRejection|FATAL|Cannot read properties of undefined` is required
before "done." Treat any hit as a delivery blocker.

**Related.** `CLAUDE.md` → What Claude Treats as Blockers;
[testing/quality-gates](../testing/quality-gates.md).
