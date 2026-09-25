# Runbook: a web scraper sidecar is down (Crawl4AI / FlareSolverr / Firecrawl)

## Symptom

- Admin status page: **Web scraper: Crawl4AI** (or FlareSolverr / Firecrawl)
  reads **Down**; research-service itself stays Operational.
- `claw_service_up{service="crawl4ai"} == 0` (or `flaresolverr` / `firecrawl`).
- research-service `/api/v1/health` answers `status: "degraded"` with
  `services.<key>: "down"`. HTTP is still 200.

Research keeps working: the fetch escalation chain (ADR-121) skips a tier that
fails. What is lost is the pages only that tier could open (JS challenges,
heavy SPAs), so hard sites fall through to the reader proxy or the archive.

**Disabled is not down.** A sidecar whose `fetch_strategy_configs` row is off
reads **Disabled**, has no metric series and is never probed. That is the
seeded default; nothing to fix.

## How it is measured

research-service (on `claw-scrapers`) probes each ENABLED sidecar once per 15 s
at most, 2 s timeout, no credential: Crawl4AI `GET /health`, FlareSolverr
`GET /`, Firecrawl `GET /`, against the row's `publicConfig.baseUrl`.
health-service lifts `services.<key>` into a row (`DEPENDENCY_PROBES`); it never
connects to a sidecar itself.

## Diagnose

```bash
docker exec claw-research-service wget --no-check-certificate -qO- https://localhost:4016/api/v1/health
docker ps -a --filter name=claw-crawl4ai --filter name=claw-flaresolverr --filter name=claw-firecrawl
docker logs --tail 50 claw-crawl4ai        # or claw-flaresolverr / claw-firecrawl-api
docker logs claw-research-service 2>&1 | grep "SidecarHealthService" | tail
grep CLAW_SCRAPER_PROFILES .env            # is the sidecar's compose profile started at all?
```

Common causes, in order seen:

1. **Enabled in the DB, container never started.** The row was switched on but
   its compose profile is not in `CLAW_SCRAPER_PROFILES`, so the container does
   not exist. Either start the profile (`./scripts/claw.sh up` after adding it)
   or disable the row again.
2. **Crawl4AI without `CRAWL4AI_API_TOKEN`.** Since 0.9.2 the server binds
   loopback only when no token is set, so research-service cannot reach it and
   it reads Down. Set the same token for both (see service-guide-research).
3. **Out of memory.** Browsers are heavy; check `docker stats` and
   `docker inspect <container> --format '{{.State.OOMKilled}}'`.
4. **An admin typed a wrong `baseUrl`.** A metadata host or non-http(s) value is
   refused and reads Down. Check the row.

## Fix

- Restart the sidecar: `docker restart claw-crawl4ai` (etc.).
- Or turn the tier off until it is fixed — it then reads Disabled:
  `PATCH /api/v1/research/fetch-strategies/CRAWL4AI` `{ "enabled": false }`
  (admin session).

## Verify

`/api/v1/health` on research-service shows `services.<key>: "up"` and
`status: "ok"`; within one health snapshot (~15 s) the status page row is
Operational.
