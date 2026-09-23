# Add a Grafana dashboard

Dashboards are code ([ADR-115](../docs/13-adr/adr-115-grafana-behind-the-admin-session.md)).
The Grafana UI cannot save or delete one — `allowUiUpdates: false` in
`infra/grafana/provisioning/dashboards/claw.yml` — so a dashboard only exists
if its JSON is committed.

## Steps

1. Write the JSON at `infra/grafana/dashboards/<name>.json`. Easiest path:
   build it in a running Grafana (see "Try it live" below), then **Dashboard
   settings → JSON Model**, copy it out, and clean it up:
   - Give it a stable `uid` — the file name convention is
     `claw-<topic>` (e.g. `claw-service-health`). Grafana keys provisioned
     dashboards by `uid`; changing it creates a second dashboard instead of
     updating the first.
   - Every panel's `datasource.uid` must be `claw-prometheus` — the id in
     `infra/grafana/provisioning/datasources/prometheus.yml`. A panel with no
     `datasource` or the wrong uid renders "Datasource not found" for every
     viewer, and the root test below catches it before that ships.
   - Strip anything the UI adds that you did not ask for: `time` picker
     history, `iteration`, a stray `id`. Keep `schemaVersion` and `version`.
2. Add the file to `infra/grafana/dashboards/`. Nothing else lists it —
   `foldersFromFilesStructure: false` in `claw.yml` means every `.json` file in
   that directory loads, flat, into the "ClawAI" folder.
3. Recreate the container so the new bind-mounted file is seen:
   `./scripts/claw.sh service:recreate grafana` locally. In production,
   `scripts/deploy-prod.sh` already treats `infra/grafana` as a
   `CONFIG_DIR_SERVICES` trigger — a PR touching this directory recreates
   `grafana` automatically, not `service:rebuild` (there is no build context).
4. Run `node --test tools/__tests__/observability-stack.test.mjs` — it fails
   if the dashboard has no `uid`, if any panel points at another datasource,
   or if a JSON file does not parse.

## Try it live, without touching the real stack

Grafana needs no other container to render a dashboard you are only editing —
Prometheus is only queried when a panel actually runs:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e GF_AUTH_ANONYMOUS_ENABLED=true -e GF_AUTH_ANONYMOUS_ORG_ROLE=Editor \
  -v "$(pwd)/infra/grafana/provisioning:/etc/grafana/provisioning:ro" \
  -v "$(pwd)/infra/grafana/dashboards:/etc/grafana/dashboards:ro" \
  grafana/grafana-oss:12.1.1
```

This is a throwaway container with its own anonymous-admin login — it does
NOT use `grafana.ini` or the real auth flow, so it is safe to run against your
own machine without touching the deployed stack or its cookie/nginx wiring.
Open `http://localhost:3000`, edit the dashboard, then copy its JSON Model
back into the repo per step 1. Stop the container when done; nothing here
persists.

## What the home dashboard is

`infra/grafana/grafana.ini` sets `default_home_dashboard_path` to one
provisioned file. Changing which dashboard is "home" is a one-line edit there,
not a Grafana setting — the UI's "set as home dashboard" does not persist
across a recreate.

## Common mistakes

- **Editing in the Grafana UI and expecting it to stick.** It renders, you can
  even "save", but a recreate reverts it — the file on disk is the truth.
- **A panel with no explicit `datasource`.** Grafana falls back to whatever is
  marked default in that Grafana's UI state, which is not guaranteed to be
  `claw-prometheus` for every viewer. Always set it per panel.
- **Forgetting the recreate.** `grafana.ini` and the dashboards directory are
  both single bind mounts; a plain restart keeps the old inode
  (`docs/11-runbooks/runbook-nginx-stale-config.md` explains the general trap).
