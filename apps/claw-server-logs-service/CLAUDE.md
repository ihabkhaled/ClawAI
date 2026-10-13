# Claw Server Logs Service - Development Rules

## Service Overview

This is the Server Logs microservice for the Claw platform. It owns backend/server-side structured log entries. Uses MongoDB via Mongoose (NOT Prisma).

## Ownership

- **Server Logs**: Ingest, store, search, and query server-side structured logs

## Tech Details

- **Port**: 4011
- **Database**: MongoDB (`claw_server_logs`) via Mongoose
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Collections Owned

- `server_logs`

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-server-logs-service`.

## Container log ingestion (ADR-101)

- `POST /server-logs/ingest/containers` takes every container's stdout from
  `claw-log-shipper` (Vector, `infra/vector/vector.yaml`). It needs the
  service token.
- `utilities/container-log.utility.ts` parses pino JSON, Nest's pretty
  format, pino-pretty and plain text at their real level.
- `POST /server-logs` and `/batch` need the service token too. They were
  public and reachable from the internet.
- Never log per-insert lines at info or above: the shipper skips this
  service's info lines, and anything louder loops.

## Ops read channel (ADR-102)

- `modules/ops`: `GET /ops/logs*` behind `OpsTokenGuard`
  (`Authorization: Ops <token>`). It verifies via auth-service, caches for
  30 s and fails closed.
- Read-only: never add a POST under `/ops`.
