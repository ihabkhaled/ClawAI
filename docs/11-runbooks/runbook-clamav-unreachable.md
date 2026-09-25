# Runbook: uploads refused — virus scanner (ClamAV) unreachable

## Symptom

- Users see **"The virus scanner is restarting. Please try again in a minute."**
  (API: HTTP 503, `code: ANTIVIRUS_UNAVAILABLE`).
- Before 2026-09-25 the same outage read "File rejected by security checks:
  antivirus_scan: scan_error: connect ECONNREFUSED <ip>:3310" — the raw socket
  error, internal IP included. That text no longer reaches users or logs.
- file-service `/api/v1/health` shows `"clamav": "down"` and `status: "degraded"`.

Port 3310 is clamd (ClamAV). File-service fails closed on purpose: no scan, no
file. It never accepts an unscanned upload.

## What file-service does on its own (2026-09-25)

`ClamavClient.scan` (`apps/claw-file-service/src/infrastructure/clamav/`)
retries transient socket errors (`ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`,
`EPIPE`, `EHOSTUNREACH`, `ENOTFOUND`, `EAI_AGAIN`, closed-without-reply) with
exponential backoff (1 s, 2 s, 4 s, 8 s cap) up to **90 s**
(`CLAMAV_SCAN_DEADLINE_MS`) — long enough for a restarted clamd to load its
database. So a short clamd restart only makes uploads slow, not failed. After
the deadline the upload fails closed with `ANTIVIRUS_UNAVAILABLE`, and for the
next 30 s (`CLAMAV_FAIL_FAST_WINDOW_MS`) scans try once instead of waiting 90 s
each (an archive with 100 entries must not hold a request for 100 × 90 s).

Log line format (host-free, socket error code only; numbers illustrative):

```
WARN  [ClamavClient] scan: clamd unreachable (ECONNREFUSED), attempt 3, retrying in 4000 ms (3012/90000 ms)
LOG   [ClamavClient] scan: clamd answered after 7 attempts (41230 ms)
ERROR [ClamavClient] scan: FAIL CLOSED — clamd unreachable (ECONNREFUSED) after 15 attempts in 90000 ms
```

nginx's `/api/v1/files` location has `proxy_read_timeout 150s` so the 90 s
wait is not cut into a 504. Keep it above the deadline.

## Cause seen in production (2026-09-24 / 25)

The host ran short of memory (deploy builds + unintended scraper sidecars) and
the kernel OOM-killed `clamd` (~1 GB resident, so always the biggest target).
The `clamav/clamav-debian` image's `/init` ends in `exec tail -f /dev/null`, so
the container stayed "running" and `restart: unless-stopped` never fired —
Docker does not restart a merely _unhealthy_ container. Uploads failed for ~10
hours on 2026-09-24.

## Diagnose

```bash
docker exec claw-file-service wget --no-check-certificate -qO- https://localhost:4006/api/v1/health
docker inspect claw-clamav --format '{{.State.Health.Status}} oom={{.State.OOMKilled}} restarts={{.RestartCount}}'
docker stats --no-stream claw-clamav        # ~1 GB = clamd alive; ~25 MB = clamd dead
docker exec claw-file-service node -e "const s=require('net').connect(3310,'claw-clamav',()=>s.write('zPING\\0'));s.on('data',d=>{console.log(d.toString());s.end()});s.on('error',e=>console.log(e.message))"
docker logs claw-file-service 2>&1 | grep ClamavClient | tail
```

`PONG` means clamd answers. file-service's `/health` does the same PING (2 s
timeout) and reports `services.clamav` as `up` / `down` / `disabled`.

Where it shows up without a shell:

- **Admin → Observability → Service status**: the **Antivirus scanner (ClamAV)**
  row (`StatusComponent.ANTIVIRUS`), with 24 h / 7 d / 30 d uptime and incidents.
- **health-service** `/api/v1/health`: a `clamav` row (derived from file-service's
  body via `DEPENDENCY_PROBES`; no row = not measured).
- **Prometheus**: `claw_service_up{service="clamav"}` (0 = down). E.g.
  `min_over_time(claw_service_up{service="clamav"}[1h])`.

## Fix

- Immediate: `docker restart claw-clamav`, wait for `healthy` (clamd loads its
  database in ~1 min), re-run the PING above.
- Already in both `docker-compose.{dev,prod}.databases.yml`:
  - **Watchdog.** The ClamAV service wraps `/init` in a loop that exits once
    `clamdscan --ping 5:2` fails, so the restart policy brings clamd back.
    Proven on dev by `kill -9` of clamd: restarted in ~50 s, returned `healthy`.
  - **`oom_score_adj: -900`.** Under memory pressure the kernel now reclaims
    from other, self-restarting containers before clamd. Not `-1000`: clamd
    must stay killable if it is itself the leak.
- A compose change to a database-file service is applied with
  `./scripts/claw.sh --prod db:up` (recreates only changed containers).
- Check the setting took: `docker inspect claw-clamav --format '{{.HostConfig.OomScoreAdj}}'` → `-900`.

## Also check

What exhausted memory. On 2026-09-25 the same deploy also started the
profile-gated scraper sidecars unintentionally (Firecrawl alone is multi-GB);
see ADR-121 and `scripts/deploy-prod.sh` profile handling.
