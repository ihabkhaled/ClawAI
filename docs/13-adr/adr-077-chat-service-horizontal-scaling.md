# ADR-077: chat-service scales horizontally — the stream bus and Stop move to Redis

**Status**: Accepted (supersedes the operational constraint in [ADR-076](adr-076-chat-stream-durability.md))
**Date**: 2026-08-28
**Deciders**: ClawAI core team

## Context

[ADR-076](adr-076-chat-stream-durability.md) accepted that chat-service runs
**exactly one replica**, because `ChatStreamService` kept its event bus, replay
buffer and event-id sequence in process memory. It named the trigger for
revisiting: _"a second chat-service replica is needed."_ That is now the case.

Auditing the service for what actually blocks scaling turned up more than the
stream:

1. **The stream bus was in-process.** RabbitMQ delivers a routed message to
   exactly one replica (competing consumers on a shared durable queue), while
   the browser's SSE connection is pinned to whichever replica nginx routed it
   to. With four replicas an answer streams to its reader roughly one time in
   four.
2. **Cancellation was in-process.** `StreamCancellationService` held its
   `AbortController`s in a `Map`, so Stop would post to whichever replica nginx
   picked, find nothing, and return quietly — while the model kept generating
   and kept being billed. This is the one that costs money.
3. **Docker refused to scale the service at all.** `container_name` and a
   published host port each make four containers impossible.
4. **The deploy would have recreated every replica at once**, dropping every
   in-flight stream on each release, and `wait_for_service_health` only checked
   the first replica — so a bad image could crash-loop the rest and still be
   recorded as a successful rollout.

Several things were already correct and needed no work: nginx resolves the
service alias per request (`resolver 127.0.0.11 valid=5s` plus a variable
`proxy_pass`) and round-robins replicas; RabbitMQ consumers share one durable
queue, so each message is handled exactly once across all replicas; Postgres and
Redis are shared already.

## Decision

**Move the stream transport and the cancellation decision into Redis, and run
chat-service with `CHAT_SERVICE_REPLICAS` replicas (4 in production).**

Not the runtime-v2 journal migration ADR-076 named as "the right destination".
That would rewrite every orchestration mode's emission path — compare, judge,
consensus, research, best-of-n and the rest — to carry turn ids, claim ids and
idempotency keys. Redis pub/sub behind `ChatStreamService`'s existing interface
achieves replica-safety with **zero** changes to any mode, which is a materially
smaller blast radius for the same outcome. The journal remains the destination
for durability across restarts; this ADR is about reach, not persistence.

## Consequences

**Gained:**

- chat-service scales horizontally. Production runs 4 replicas.
- Deploys are genuinely zero-downtime for chat: replicas roll one at a time,
  each awaited healthy before the next is replaced.
- A replica dying mid-run no longer loses the answer — the RabbitMQ ack happens
  after the handler, so the message is requeued and a surviving replica finishes
  it. Verified by killing a replica mid-run and watching the reply arrive.

**Accepted:**

- Every stream frame now costs a Redis round-trip and is delivered to every
  replica, which each filter by thread. At this volume that is free; the signal
  to move to per-thread channels is a replica spending real CPU discarding
  frames, not a message count.
- Redis is now on the critical path for streaming. It already was for sessions
  and caching, and the bus degrades to local-only delivery rather than silence
  when Redis is unreachable, so a single-replica install is unaffected.
- Container indices climb across deploys (1-4, then 5-8, …) because the rolling
  replacement removes a container and compose fills the gap with the next free
  index. Cosmetic; the count is always the configured replica count.

**Still true from ADR-076:** a restart mid-run loses the partial text but not the
answer — the assistant row is written on completion and the client's poll renders
it. Durable partials remain unbuilt and remain low value.

## Alternatives considered

**Migrate every mode onto the runtime-v2 journal.** The architecturally pure
option and far larger. It buys cursor-based resume, which is durability, not the
reach problem that blocked scaling.

**Sticky sessions in nginx.** Pin a thread's SSE connection and its work to one
replica. Cheap to configure and wrong: the work is assigned by RabbitMQ, not by
the HTTP request, so there is nothing for nginx to be sticky _to_.

**Leave it at one replica and scale vertically.** Defers the problem and leaves
the single point of failure that killing one container demonstrates.
