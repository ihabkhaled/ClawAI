# Observability

Observability is split by concern rather than one generic logger.

## Dedicated services
- `claw-client-logs-service` — browser/client ingestion and querying.
- `claw-server-logs-service` — backend log ingestion and querying.
- `claw-audit-service` — audit records, feedback and usage views.
- `claw-health-service` — aggregate health surface.

## Cross-cutting observability
- structured logging;
- redaction rules;
- RabbitMQ event evidence;
- usage/cost/latency audit views;
- runtime progress streaming;
- deployment and release evidence;
- Coding Agent OTLP/observability surfaces.

References: [docs/LOGGING_OBSERVABILITY_ARCHITECTURE.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/LOGGING_OBSERVABILITY_ARCHITECTURE.md) · [rules/19-logging-observability-and-redaction.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/19-logging-observability-and-redaction.md).
