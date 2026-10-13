# Claw Client Logs Service - Development Rules

## Service Overview

This is the Client Logs microservice for the Claw platform. It owns frontend/client log ingestion, storage, and querying. Uses MongoDB via Mongoose (NOT Prisma).

## Ownership

- **Client Logs**: Ingest, store, search, and query frontend client logs

## Tech Details

- **Port**: 4010
- **Database**: MongoDB (`claw_client_logs`) via Mongoose
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Collections Owned

- `client_logs`

## Ingestion Has Two Doors, and Only One Is The Right One

- `POST /client-logs` takes ONE event. It stays for compatibility and nothing
  new should use it.
- `POST /client-logs/batch` takes `{ events: [...] }`, up to
  `CLIENT_LOG_BATCH_MAX_EVENTS` (100), and writes them with
  `insertMany(..., { ordered: false })`.

Both are `@Public()` on purpose: a signed-out page failing is exactly the
telemetry worth having.

**Do not add per-event logging to the ingest path.** Telemetry ingestion that
logs about itself at debug AND at info turns a 20-event burst into ~80 server
log lines, which reproduces one layer down the problem the batch endpoint
exists to solve. The repository logs once per batch at debug; the service logs
once per batch. That is the budget.

The client's batch ceiling must stay at or below this service's
`CLIENT_LOG_BATCH_MAX_EVENTS`, or a large flush is rejected whole. See
`docs/04-backend/service-guide-client-logs.md`.

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-client-logs-service`.
