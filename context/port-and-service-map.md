# Port & Service Map

The canonical port table. Ground truth: `.ai/manifests/ports.json` (the 16
`*_SERVICE_PORT` constants in `@claw/shared-constants`) and
`.ai/manifests/services.json` (per-service `port` + `portSource`).

## Port table

| Service         | Port     | Port source                       | DB                     |
| --------------- | -------- | --------------------------------- | ---------------------- |
| frontend        | 3000     | env (`FRONTEND_PORT`)             | —                      |
| auth            | 4001     | shared-constants                  | Postgres               |
| chat            | 4002     | shared-constants                  | Postgres               |
| connector       | 4003     | shared-constants                  | Postgres               |
| routing         | 4004     | shared-constants                  | Postgres               |
| memory          | 4005     | shared-constants                  | Postgres               |
| file            | 4006     | shared-constants                  | Postgres               |
| audit           | 4007     | shared-constants                  | Mongo                  |
| ollama          | 4008     | shared-constants                  | Postgres               |
| health          | 4009     | shared-constants                  | none                   |
| **client-logs** | **4010** | **env-only (`CLIENT_LOGS_PORT`)** | Mongo                  |
| **server-logs** | **4011** | **env-only (`SERVER_LOGS_PORT`)** | Mongo                  |
| image           | 4012     | shared-constants                  | Postgres               |
| file-generation | 4013     | shared-constants                  | Postgres               |
| workspace       | 4014     | shared-constants                  | Postgres               |
| agent           | 4015     | shared-constants                  | Postgres               |
| research        | 4016     | shared-constants                  | Postgres               |
| llamacpp        | 4017     | shared-constants                  | Postgres (Debian base) |
| payment         | 4018     | shared-constants                  | Postgres               |

Backend services occupy **4001–4018** contiguously. The next new backend service
takes **4019** — add its constant to `@claw/shared-constants`.

## ⚠️ The client-logs / server-logs env-only gap

**`client-logs-service` (4010) and `server-logs-service` (4011) have NO
`*_SERVICE_PORT` constant in `@claw/shared-constants`.** Their port is defined
only by the env vars `CLIENT_LOGS_PORT` / `SERVER_LOGS_PORT`. This is a real,
audited gap — the inventory audit reports it as `portCoverageGaps` /
`service-without-port-constant` (severity: medium), and `services.json` records
`"port": null, "portSource": "env-only (no constant)"` for both.

Consequences and cautions:

- The canonical port catalog in `@claw/shared-constants` lists **16** services,
  not 18. Any code that iterates the port constants will **miss these two**.
- nginx still routes them (`/api/v1/client-logs` → 4010, `/api/v1/server-logs` →
  4011, from `nginx-routes.json`) because those ports are hard-configured, not
  read from the constant.
- If you standardize ports, **add `CLIENT_LOGS_SERVICE_PORT` and
  `SERVER_LOGS_SERVICE_PORT` to `@claw/shared-constants`** and update the two
  services to read them — closing the gap. Until then, treat 4010/4011 as
  env-only and never assume a constant exists.

## Related maps

- Full gateway route table → [request-flow-map.md](request-flow-map.md) and
  `.ai/manifests/nginx-routes.json`.
- DB ownership per port → [database-ownership-map.md](database-ownership-map.md).
- Port env vars and propagation → [environment-ownership-map.md](environment-ownership-map.md).
