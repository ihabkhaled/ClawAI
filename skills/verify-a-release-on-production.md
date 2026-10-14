# Skill — Verify a release on production

**Use when**: a release has been pushed and you must say whether production is
healthy. Production is read-only for you unless the owner says otherwise.

**Related**: [runbook-prod-service-crash-loop](../docs/11-runbooks/runbook-prod-service-crash-loop.md) ·
[add-a-service-to-production](../docs/11-runbooks/add-a-service-to-production.md) ·
[verify-a-batch-live](verify-a-batch-live.md) · [rules/44](../rules/44-live-verification-before-done.md)

---

## 1. Read CI and the Release run (no server access)

1. `gh run list --branch main --limit 10`. The push's CI run must be green, and
   the Release / Deploy run for the same commit must have finished.
2. A red or still-running Release run means the deploy has not happened. Stop and
   report that; do not test the old build and call it the new one.
3. Note the released version (`chore(release): Deployment Release vX.Y.Z`).

## 2. Read the health endpoint

`curl -s https://<prod-host>/api/v1/health` (public, no credentials). Record the
overall status and every service listed as down, with its error text.

## 3. Classify each "down" (three kinds)

| Kind              | Signature in the health error                               | Meaning                                             | Next step                                                   |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Not deployed      | `getaddrinfo ENOTFOUND ollama-service` / `llamacpp-service` | The service is not part of the prod stack by design | Note it; overall "degraded" is expected                     |
| Env / DI crash    | `ECONNREFUSED` or 502 for a service that SHOULD be deployed | Container restarting                                | Host `docker logs` (section 4)                              |
| Stale TLS / hosts | `Hostname doesn't match`, certificate expired, wrong IP     | Certificate or hosts entry, not the app             | [troubleshoot-tls](../docs/11-runbooks/troubleshoot-tls.md) |

Do not fix a "not deployed" service. Do not call a crash "expected".

## 4. Read-only host diagnostics (SSH, only if you were given access)

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -v healthy
docker logs --tail 200 claw-<service>
sudo -u <deploy-user> bash /srv/clawai/scripts/ensure-prod-env.sh --env /srv/clawai/.env --check
```

`--check` never writes. Read the log for `Nest can't resolve dependencies`,
`ERR_MODULE_NOT_FOUND`, `__dirname is not defined`, or a missing env var.

## 5. What needs the owner's explicit OK first

Never do these on your own initiative; ask, name the exact command, wait:

- appending to the production `.env` (`ensure-prod-env.sh` without `--check`)
- starting a database container
- re-issuing a certificate and restarting nginx (a restart window)
- any restart, recreate, rollback or deploy
- any write to production data other than your own QA test data

## 6. Prod test rounds with the QA accounts

- Use the dedicated QA accounts (free, pro, viewer). Passwords come from the
  owner at run time and are held in your shell only: never write them to a file,
  a doc, a log, an evidence record or a commit.
- Order: auth (login, refresh, wrong password, rate limit), entitlements, chat
  (AUTO and a picked model, ledger parity), the feature released, security
  (anonymous 401, viewer 403, foreign-id IDOR, `/api/v1/internal/*` 404), then
  the browser pass at 375 and 1280 in `/en` and `/ar`.
- Record each line PASS / FAIL / OBSERVE / NOT TESTED with the observed value.

## 7. Clean up test data

Delete the threads, files and context items you created through the product's own
API with the QA account. List what remains if something cannot be deleted
(report it; do not touch the database).

## 8. Report template

```
Release: vX.Y.Z   commit: <sha>   CI: green/red   Release run: green/red
Health: <overall>; down: <service> = not deployed | crash | TLS
Rounds: auth PASS/FAIL ... chat ... security ... browser ...
Defects: <id> <one line> <evidence>
Not tested: <list>
Test data left: <list or none>
Changed on prod: none | <owner-approved action>
```
