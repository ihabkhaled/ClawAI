# Runbook: uploads rejected — `antivirus_scan: scan_error: connect ECONNREFUSED …:3310`

## Symptom

Every upload fails with "File rejected by security checks: antivirus_scan:
scan_error: connect ECONNREFUSED <ip>:3310". Port 3310 is clamd (ClamAV).
File-service fails closed on purpose: no scan, no file.

## Cause seen in production (2026-09-24)

The host ran short of memory and the kernel OOM-killed `clamd` (~1 GB
resident). The `clamav/clamav-debian` image's `/init` ends in
`exec tail -f /dev/null`, so the container stayed "running" (only
`freshclam` left, ~23 MB) and `restart: unless-stopped` never fired — Docker
does not restart a merely _unhealthy_ container. Uploads failed for ~10 hours.

## Diagnose

```bash
docker inspect claw-clamav --format '{{.State.Health.Status}} oom={{.State.OOMKilled}}'
docker stats --no-stream claw-clamav        # ~1 GB = clamd alive; ~25 MB = clamd dead
docker exec claw-file-service node -e "const s=require('net').connect(3310,'claw-clamav',()=>s.write('zPING\\0'));s.on('data',d=>{console.log(d.toString());s.end()});s.on('error',e=>console.log(e.message))"
```

`PONG` means clamd answers.

## Fix

- Immediate: `docker restart claw-clamav`, wait for `healthy` (clamd loads its
  database in ~1 min), re-run the PING above.
- Permanent (in both `docker-compose.{dev,prod}.databases.yml`): the ClamAV
  service wraps `/init` in a watchdog that exits once `clamdscan --ping 5:2`
  fails, so the restart policy brings clamd back. Proven on dev by `kill -9`
  of clamd: the container restarted in ~50 s and returned `healthy`.
- A compose change to a database-file service is applied with
  `./scripts/claw.sh --prod db:up` (recreates only changed containers).

## Also check

What exhausted memory. On 2026-09-25 the same deploy also started the
profile-gated scraper sidecars unintentionally (Firecrawl alone is multi-GB);
see ADR-121 and `scripts/deploy-prod.sh` profile handling.
