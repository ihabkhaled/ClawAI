# ADR-101: Every container's log goes to one store, shipped read-only by Vector

**Status**: Accepted
**Date**: 2026-09-19

## Context

Only one summary line per HTTP request reached `server_logs`: the logging
interceptor's `log.server` event, plus a handful of `logAction` calls. Other
output went only to container stdout: every Nest `Logger` line, stack traces,
crashes, RabbitMQ consumers, nginx, Postgres, Redis and the coding agent. It
was readable only with `docker logs` over SSH, and it was lost when a container
was recreated. No compose file set a `logging:` key, so the json-file logs grew
without bound.

The write endpoints `POST /server-logs` and `/server-logs/batch` were
`@Public()`, and nginx proxies the service. On 2026-09-19 production answered
an anonymous request to them from the internet.

## Decision

1. **All containers log through one anchor** (`x-claw-logging`) in every
   base compose file: json-file, `max-size` 20m, `max-file` 5, and the
   `claw.service` label recorded on every line. json-file keeps no container
   name, so the label is what attributes a line.
2. **A Vector log shipper** (`claw-log-shipper`, pinned
   `timberio/vector:0.46.1-debian`) reads
   `/var/lib/docker/containers/*/*-json.log` **read-only**. It never uses the
   Docker socket, because read access to the socket is root on the host.
   `infra/vector/vector.yaml`:
   - drops health probes and debug/trace lines;
   - keeps only warn-or-worse lines from server-logs and itself, so there is
     no feedback loop;
   - joins multi-line entries into one row;
   - batches under the 100 KB body limit;
   - buffers on disk up to 256 MB, dropping the newest lines when full.

   It has its own `vector test` cases.

3. **Ingest endpoint:** `POST /server-logs/ingest/containers`, service token
   only. It parses pino JSON, Nest's pretty format, pino-pretty and plain text
   into rows at their real level, and keeps request and trace ids. These rows
   are tagged `action=container_log`.
4. **Both older write routes now require the service token.** Nothing
   legitimate wrote to them without it.

## Consequences

- One query surface, the existing `GET /server-logs` filters, covers
  everything. The 30-day TTL still applies.
- The shipper starts at the end of each file, so history from before a
  restart stays only in `docker logs`.
- Debug lines are not shipped. Chasing a debug-level issue still needs the
  container itself.
- Logging config changes need a container recreate (`claw.sh up`), not a
  restart.
