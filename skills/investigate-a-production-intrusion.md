# Skill: investigate a suspected production intrusion or abuse wave

Use when the owner reports odd users, traffic, data or behaviour in production. Read-only first: collect evidence,
then contain with reversible steps (firewall rules, bans), then fix in the repo. Proven on the 2026-11-27 incident
([report](../docs/security/incident-2026-11-27-open-ports-and-signup-farm.md), rules/68, ADR-222).

## 1. Who logged in to the host

```bash
ssh ClawAI 'sudo journalctl -u ssh --no-pager | grep -oE "Accepted [a-z-]+ for [a-zA-Z0-9_-]+" | sort | uniq -c'
ssh ClawAI 'sudo journalctl -u ssh --no-pager | grep "Accepted publickey for deploy" | grep -oE "from [0-9.]+" | sort -u' > ips.txt
gh api meta --jq '.actions[]'   # deploy logins must fall inside these ranges
```

Expect only the owner's key and `deploy` from GitHub Actions. Also: `awk -F: '$7 !~ /nologin|false/' /etc/passwd`,
`authorized_keys` of every home, `/etc/cron.d`, top CPU processes.

## 2. What is reachable from outside (run from YOUR machine, not the server)

```bash
for p in 22 80 443 3000 3310 4000 5441 5460 5672 6380 15672 27018; do
  timeout 4 bash -c "echo > /dev/tcp/92.205.176.113/$p" 2>/dev/null && echo "OPEN $p"; done
```

Anything but 22/80/443 open → contain with `DOCKER-USER` DROP rules (runbook §1) before anything else.

## 3. Data stores

- Redis: `CONFIG GET requirepass`, `protected-mode`, `enable-protected-configs`, `--scan` for odd keys (`crack`,
  `backup*` = SSH-key / cron planting), `INFO keyspace`, `CLIENT LIST` peers.
- Postgres (every `claw-pg-*`): failed logins by user (`docker logs ... | grep "password authentication failed"`),
  roles and databases (`pg_roles`, `pg_database`), tables named like readme/recover/bitcoin (ransom), non-172.x
  peers in `pg_stat_activity`, dangerous statements (`FROM PROGRAM`, `pg_read_file`, `COPY ... TO`).
- MongoDB / RabbitMQ: auth failures, users (`rabbitmqctl list_users`).

## 4. Web traffic (nginx)

```bash
ssh ClawAI 'docker logs claw-nginx > /tmp/ngx.log 2>&1; grep -E "^[0-9a-f.:]+ - " /tmp/ngx.log > /tmp/a.log'
# sign-ups per day, status codes, user agents, top source addresses
grep '"POST /api/v1/auth/register' /tmp/a.log | awk -F\" '{print $6}' | sort | uniq -c | sort -rn | head
# probes: any 200 on .env / .git / actuator / @id/__vite is an incident
grep -E '"(GET|POST) /(\.env|\.git/|actuator|@id/__vite)' /tmp/a.log | awk '$9==200'
```

Backdoor check for the Vite/Node "GHOST" implant: send `x-amzn-trace-context: Root=1-672e9988-<base64 of return 'probe'>`
to `/`, `/api/version`, `/api/v1/health`; a body containing `GHOST_OK` or `probe` means a compromised process.

## 5. Accounts (auth DB `users`)

Sign-ups per day with pending count, distinct `registration_ip` and countries; top email domains for the last 21 days;
addresses with more than one sign-up; staff/admin rows. A spike on one unknown domain is a farm. For the farm, measure
sessions, trial redemptions, weighted usage and free-allowance rows before deciding.

## 6. Contain, then fix

- Reversible first: firewall rules, fail2ban, admin bans (same fields as `POST /users/:id/ban`, sessions revoked).
- Ask the owner before deleting data or rotating credentials that would restart services.
- Then the repo: compose bindings, guards, limits, tests (rules/68 mechanisms), the incident report, ADR, runbook,
  QA evidence, memory.
