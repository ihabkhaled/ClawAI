# ADR-076: Chat stream durability — keep the in-process bus, rely on the database as the record

**Status**: Superseded in part by [ADR-077](adr-077-chat-service-horizontal-scaling.md)

> The single-replica constraint below no longer holds: the stream bus and the
> Stop broadcast moved to Redis on 2026-08-28 and production runs 4 replicas.
> The rest of this ADR — that a restart loses the partial text but not the
> answer, and that durable partials are not worth building — still stands.
> **Date**: 2026-08-28
> **Deciders**: ClawAI core team

## Context

The chat SSE path is entirely in-process. `ChatStreamService` holds three
in-memory structures: `eventBus` (an RxJS `Subject`), `recentEvents` (a per-thread
replay buffer) and `sequenceByThread` (the event-id counter). Nothing survives a
process restart, and nothing is shared between replicas.

Two consequences follow, and they are not equally serious:

1. **A restart mid-answer loses the partial text.** The half-streamed tokens are
   gone. The answer itself is not: `chat-messages.service` writes the assistant
   row when the run completes, and the client's 2-second poll — which runs for
   ten minutes — picks it up. What the reader loses is the live typing effect,
   after which the finished answer appears a second or two later.
2. **More than one chat-service replica would break streaming outright.** A
   client connected to replica A never sees events emitted on replica B, and no
   poll disguises that during the run. This is a hard constraint on horizontal
   scaling, not a degradation.

A durable alternative already exists in this service. The runtime-v2 store
(`runtime-v2.store.ts` plus the Lua scripts in
`runtime-v2-redis-scripts.constants.ts`) is a Redis-backed event journal with
per-run sequences, cursor reads, idempotency keys and TTLs. `chat-stream.controller`
already routes to it — but only when the client asks for `?protocol=v2`. Ordinary
chat takes the legacy branch in `RuntimeV2StreamService.selectEvents`.

## Decision

**Keep the in-process bus for now. Do not migrate the chat path onto the runtime-v2
journal as part of the current work.**

The reasoning is about cost against realised benefit:

- The user-visible defect is small and already mitigated. Losing a typing
  animation on a restart is not the same class of problem as an answer never
  appearing — which was a real defect, had a different cause, and is fixed
  separately (see the frontend's "A run that starts without announcing itself is
  invisible").
- The replica constraint is real but not currently binding: the stack runs one
  chat-service. It becomes binding the moment a second replica is introduced, and
  that is the trigger for revisiting this, not a date.
- Migrating a streaming path is high-risk work with a wide blast radius — every
  orchestration mode in this service emits through `ChatStreamService`. Doing it
  at the end of an unrelated batch, without a load test, would trade a cosmetic
  defect for a chance of a real one.

## Consequences

**Accepted:**

- A chat-service restart during a run drops the live stream. The reader sees the
  answer complete via the poll rather than token by token.
- `chat-service` must run as **exactly one replica**. This is now a documented
  constraint rather than an accident of deployment.
- The runtime-v2 journal stays reachable through `?protocol=v2` for clients that
  want durability today.

**Revisit when any of these becomes true:**

- A second chat-service replica is needed. This ADR is then the blocker, and the
  migration is the work.
- The poll safety net is weakened or removed — it is what makes consequence (1)
  cosmetic instead of severe.
- Runs become long enough that losing a partial is expensive rather than
  annoying (a multi-minute research or agent run is closer to this than a chat
  turn).

**The migration, when it happens**, is to route the legacy branch of
`selectEvents` at the runtime-v2 journal rather than to build a second durable
store. Backing `ChatStreamService`'s two Maps with Redis directly would create a
parallel mechanism that does the same job with weaker guarantees — no
idempotency, no cursor contract — and this service already decided against
parallel stream channels once (see `apps/claw-chat-service/CLAUDE.md`, "Do not
introduce a parallel SSE channel for local runtimes").

## Alternatives considered

**Back the in-memory Maps with Redis.** Cheapest to write and the worst outcome:
it produces a second durable event store alongside runtime-v2, with none of its
sequencing or idempotency guarantees, and two things to keep correct forever.

**Migrate chat to `?protocol=v2` now.** The right destination, the wrong moment.
It touches every orchestration mode's emission path and needs a load test to be
credible.

**Persist partials to Postgres as they stream.** A write per token-batch against
the row being streamed, to salvage an animation. The cost lands on every run to
benefit the rare restart.
