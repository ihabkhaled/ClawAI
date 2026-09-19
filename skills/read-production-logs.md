# Skill — Read every log in one place

**Use when**: something is wrong in production, and you need logs from any
service, nginx or a database without SSH.

**Governing**: [ADR-101](../docs/13-adr/adr-101-every-container-log-in-one-store.md)

---

## 1. Where logs are

Every container's stdout/stderr lands in `server_logs` (MongoDB, 30-day TTL):

- shipped rows have `action=container_log`;
- app-published request lines have no action, or their own.

`serviceName` is the compose service: `chat-service`, `nginx`, `pg-chat`, and
so on.

## 2. Query them without SSH or a browser (ops token, ADR-102)

An admin mints a read-only token once:

```bash
curl -sk -X POST https://claw-ai.co/api/v1/admin/ops-tokens -H "Authorization: Bearer $ADMIN"   -H 'Content-Type: application/json' -d '{"name":"agent channel","scopes":["LOGS_READ"],"ttlDays":30}'
# -> {"token":"claw_ops_...","view":{...}}   the token is shown ONCE
```

Then anyone holding it can read (and nothing else):

```bash
curl -sk "https://claw-ai.co/api/v1/ops/logs?level=ERROR&limit=50" -H "Authorization: Ops $OPS"
curl -sk "https://claw-ai.co/api/v1/ops/logs/stats" -H "Authorization: Ops $OPS"
curl -sk "https://claw-ai.co/api/v1/ops/logs/timeseries?interval=5" -H "Authorization: Ops $OPS"
curl -sk "https://claw-ai.co/api/v1/health"   # public, no token
```

Revoke: `DELETE /api/v1/admin/ops-tokens/<id>`. Takes effect within 30 s.

## 3. Query them with an admin session

```bash
TOK=<admin access token>
curl -sk "https://claw-ai.co/api/v1/server-logs?action=container_log&level=ERROR&limit=50" -H "Authorization: Bearer $TOK"
# one request across services:
curl -sk "https://claw-ai.co/api/v1/server-logs?requestId=<id>" -H "Authorization: Bearer $TOK"
```

Filters include `serviceName`, `level`, `search`, `messageContains`,
`startDate`/`endDate`, `traceId` and `statusCode`.

## 4. When nothing arrives

1. `docker logs claw-log-shipper`:
   - `400` means the payload shape is wrong;
   - `401` means the service token is wrong;
   - a TLS error means `/certs/rootCA.pem` is missing.
2. `docker inspect <container> --format '{{json .HostConfig.LogConfig}}'`
   must show `labels: claw.service`. If it doesn't, the container predates the
   anchor: recreate it with `./scripts/claw.sh up -d`.
3. Test the config itself:
   `docker run --rm -v "$PWD/infra/vector/vector.yaml:/etc/vector/vector.yaml:ro" timberio/vector:0.46.1-debian test /etc/vector/vector.yaml`

## 5. Traps

- **Never** mount `/var/run/docker.sock` into the shipper. It is root on
  the host.
- **Never** let server-logs ship its own info lines. Each insert logs a line,
  and each shipped line is an insert.
- Batches must stay under the service's 100 KB body limit (`max_bytes`).
