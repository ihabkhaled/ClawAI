# Runbook: the status page shows Degraded or Down

The service-status section on `/observability` (admin-only) reports ten coarse
components. It never names the service behind one, so this runbook is how you
get from "Chat is degraded" to the container that is failing.

## 1. Which services make up the component

`apps/claw-health-service/src/modules/health/constants/status-page.constants.ts`
→ `COMPONENT_MEMBERS`:

| Component            | Services                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Sign-in and accounts | auth-service                                                     |
| Chat                 | chat-service, routing-service, connector-service, memory-service |
| Files                | file-service, file-generation-service                            |
| Image generation     | image-service                                                    |
| Research             | research-service                                                 |
| Payments             | payment-service                                                  |
| Workspaces           | workspace-service                                                |
| Coding agent         | agent-service                                                    |
| Local models         | ollama-service, llamacpp-service                                 |
| Logs and audit       | audit-service, client-logs-service, server-logs-service          |

**Degraded** = some of those services failed their health check. **Down** = all
of them did. **Unknown** = none of them was measured.

## 2. Which one is failing right now

```bash
# The live fan-out, with service names (internal; not on the status page)
docker exec claw-health-service sh -c \
  'wget --no-check-certificate -qO- https://localhost:4009/api/v1/health'

# Or ask Prometheus which service reports 0
docker exec claw-prometheus sh -c \
  'wget -qO- "http://localhost:9090/api/v1/query?query=claw_service_up==0"'
```

Then follow [runbook-service-crash.md](runbook-service-crash.md) for that
container (`./scripts/claw.sh logs <service>`).

## 3. Known, expected cases

- **Local models is Down in production.** Production runs no
  `ollama-service` (see `memory/project_router_candidates_and_window_fit.md`);
  if `llamacpp-service` is also absent the component is Down permanently. That
  is the truth, not a bug in the page. It also keeps **Overall** at Degraded.
- **Every component Unknown.** health-service could not produce a snapshot.
  Check the health-service container first; the page cannot be more right
  than the fan-out it reads.

## 4. "History is unavailable"

The current state is still live; only uptime and incidents are missing.
health-service could not read Prometheus. It tries **once**, with a 5-second
timeout, then waits 30 seconds before trying again — it does not retry in a
loop.

```bash
docker ps --filter name=claw-prometheus           # is it running?
docker logs --tail 50 claw-health-service | grep readHistory   # the reason
docker exec claw-prometheus sh -c 'wget -qO- http://localhost:9090/-/healthy'
```

Prometheus config is a bind-mounted single file: after editing
`infra/prometheus/prometheus.yml`, **recreate** it
(`./scripts/claw.sh service:recreate prometheus`), never restart — see
[metrics-and-dashboards.md](../08-runtime-devops/metrics-and-dashboards.md).

## 5. Uptime looks worse than the outage felt

By design. History is counted in 5-minute buckets and a bucket counts against
a component if any single 15-second check in it failed. A 20-second blip
costs 5 minutes of uptime. Short windows right after Prometheus was first
created also show "Measured for N % of this period" — the fraction is over
measured time only, never padded with assumed-up time.

## 6. The page itself errors

`GET /api/v1/health/status` is admin-only (401 without a token, 403 for a
non-admin). It is rate-limited at 120 requests per minute per client and
`Cache-Control: private, max-age=30`.

```bash
curl -sk -H "Authorization: Bearer $ADMIN_TOKEN" https://claw.local/api/v1/health/status | jq '.overall, .historyAvailable'
```

A 404 served as HTML means nginx is on a stale config inode:
[runbook-nginx-stale-config.md](runbook-nginx-stale-config.md).
