# Service Guide: claw-client-logs-service

## Overview

| Property    | Value                             |
| ----------- | --------------------------------- |
| Port        | 4010                              |
| Database    | MongoDB (`claw_client_logs`)      |
| ODM         | Mongoose 8.x via @nestjs/mongoose |
| Env prefix  | `CLIENT_LOGS_`                    |
| Nginx route | `/api/v1/client-logs`             |

The client logs service ingests, stores, and queries frontend application logs. It receives batched log entries from the Next.js frontend and stores them in MongoDB with a 30-day TTL for automatic cleanup.

## Data Model (MongoDB)

### ClientLog

| Field     | Type    | Notes                                           |
| --------- | ------- | ----------------------------------------------- |
| level     | String  | LogLevel enum (DEBUG, INFO, WARN, ERROR, FATAL) |
| message   | String  | Log message text                                |
| component | String  | Frontend component name                         |
| action    | String? | User action that triggered the log              |
| userId    | String? | Authenticated user ID                           |
| route     | String? | Current page route                              |
| userAgent | String? | Browser user agent                              |
| metadata  | Object? | Additional context data                         |
| timestamp | Date    | When the log was generated                      |
| createdAt | Date    | When stored (TTL index anchor)                  |

### TTL Configuration

A MongoDB TTL index on `createdAt` automatically deletes documents after 30 days:

```javascript
{ createdAt: 1 }, { expireAfterSeconds: 2592000 }
```

## API Endpoints

| Method | Path      | Auth           | Description                        |
| ------ | --------- | -------------- | ---------------------------------- |
| POST   | /         | Public         | Ingest ONE event (compatibility)   |
| POST   | /batch    | Public         | Ingest up to 100 events at once    |
| GET    | /         | ADMIN/OPERATOR | Query logs (paginated, filterable) |
| GET    | /stats    | ADMIN/OPERATOR | Level/component/route distribution |
| GET    | /distinct | ADMIN/OPERATOR | Distinct values for one field      |

Both ingest routes are `@Public()`: telemetry from a signed-out page — the
sign-in screen failing, a marketing page throwing — is exactly the telemetry
worth having, and requiring a bearer token would lose it.

## Batch Ingestion

Until 2026-09-10 this section described a batching design that **did not
exist**. The frontend buffered for five seconds and then issued one HTTP
request per buffered entry in a loop. The buffer was never a batch; it was a
delay that guaranteed the requests left together, which is what turned a page
mount into a burst of twenty-odd calls in the same millisecond. Measured on the
chat page, a single send-and-answer cost 20 requests, **12 of them
`/client-logs`**.

It is real now:

1. The frontend logger buffers for `CLIENT_LOG_FLUSH_INTERVAL_MS` (5 s).
2. On flush, identical events inside that window collapse to one event carrying
   an `occurrences` count. Identity is level + component + action + message;
   metadata is deliberately excluded, so two events differing only by a
   timestamp are the same event.
3. The collapsed list is sliced into requests of at most
   `CLIENT_LOG_MAX_BATCH_EVENTS` (100) and each slice is POSTed to `/batch`.
4. `POST /batch` validates the envelope with Zod in a `ZodValidationPipe`, then
   writes the whole slice with `insertMany(..., { ordered: false })`.
5. The response reports `accepted`, which is the number the write actually
   persisted rather than the number submitted.

**Validation is all-or-nothing; the write is not.** Zod runs over the entire
envelope before anything reaches Mongo, so **one malformed event rejects the
whole batch with a 400** — the good events go with it. `ordered: false` covers
only the narrower case of documents that pass validation and then fail at the
driver level, and the service rethrows there, so no client observes `accepted`
below the number submitted today. Do not read `accepted` as evidence that
partial acceptance is implemented; it is reported honestly so that adding it
later is a behaviour change and not a contract change.

Two limits must be read together: the client's `CLIENT_LOG_MAX_BATCH_EVENTS`
**must stay at or below** the server's `CLIENT_LOG_BATCH_MAX_EVENTS`, or a
large flush is rejected whole by the `.max()` on the schema.

### Severity gate

`CLIENT_LOG_MIN_TRANSPORT_LEVEL` is `INFO` in production and `DEBUG`
everywhere else. Debug lines live inside `queryFn`s, so they fire on every
mount, refetch and invalidation — a fifth of the call sites and the majority of
the volume. The in-memory log store keeps every level regardless, so the
developer log view is unaffected by the gate.

### Unload

A flush pending when the page goes away used to be dropped in silence. A
`pagehide` listener now re-sends the buffer through `navigator.sendBeacon`,
which survives unload where a normal request is cancelled. `pagehide` rather
than `beforeunload` because it also fires for bfcache navigations.

### Buffer cap

`CLIENT_LOG_MAX_BUFFER_EVENTS` (500) bounds the buffer between flushes. An
error loop can produce events faster than the interval clears them. The oldest
are dropped: growing without bound in a tab left open all day is not an option,
and the newest event is usually the interesting one.

### Batch request format

```json
{
  "events": [
    {
      "level": "error",
      "message": "Failed to load thread messages",
      "component": "ChatPage",
      "action": "FETCH_MESSAGES",
      "route": "/chat/abc123",
      "metadata": { "threadId": "abc123", "occurrences": 3 }
    }
  ]
}
```

The events are wrapped in an object rather than sent as a bare array so the
payload has somewhere to grow — a clock-skew hint, a session id, a
dropped-event count — without another breaking change.

## Query Filters

The GET endpoint supports these query parameters:

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| level     | String   | Filter by log level         |
| component | String   | Filter by component name    |
| userId    | String   | Filter by user              |
| route     | String   | Filter by page route        |
| startDate | DateTime | Logs after this date        |
| endDate   | DateTime | Logs before this date       |
| search    | String   | Full-text search in message |
| page      | Number   | Pagination page             |
| pageSize  | Number   | Items per page (max 100)    |

## Frontend Logger Utility

The frontend uses a centralized logger at `src/utilities/logger.utility.ts` that:

- Adds route, user agent and the signed-in user id automatically
- Redacts sensitive keys from `details` and `metadata` before anything leaves
  the browser
- Applies the severity gate, then buffers, collapses and batches as above
- Writes every level to the in-memory store regardless of what is transported
- Never throws: an enqueue failure is swallowed, because logging must not break
  the app

## Why Separate from Server Logs

Client and server logs are separated because:

- Different schemas (component/route vs. serviceName/module)
- Different ingestion patterns (batched HTTP vs. RabbitMQ events)
- Different access patterns (debugging frontend issues vs. backend issues)
- Different retention policies may be needed
- Separate MongoDB collections allow independent indexing
