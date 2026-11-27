# Incident 2026-11-27: open internal ports and a sign-up bot farm

Status: contained on 2026-11-27. App-side defences ship with ADR-222.

## What the owner saw

Many unfamiliar pending users with random names and emails from many countries, and a long list of names on the
connectors page.

## What was found (production, read from the server)

| Area       | Finding                                                                                                                                                                                                                                                                                                                                                                                                  | Verdict                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Network    | Every Postgres (5441-5460), Redis 6380, MongoDB 27018, RabbitMQ 5672/15672, ClamAV 3310, the frontend 3000 and nginx 4000 were reachable from the internet. `ufw` was inactive and Docker publishes on 0.0.0.0, which bypasses host firewalls.                                                                                                                                                           | Critical, fixed                |
| Redis      | No password, `protected-mode no`. An attacker stored an SSH public key in key `crack` (the classic `CONFIG SET dir` + `SAVE` attack). It failed: Redis 7.4 keeps `enable-protected-configs` and `enable-module-command` off, so no file was written and no module loaded. Redis held quota counters, FX caches and the chat stream bus only.                                                             | Attempted, failed; key deleted |
| Postgres   | ~39k failed logins, mostly user `postgres`, also `claw` and `clawai` (the attacker knew our naming). 20-character mixed passwords. No extra roles, databases, ransom tables or dangerous statements in the logs.                                                                                                                                                                                         | Brute force, no success found  |
| Web        | 1,898 probes for `.env`, `.git`, `actuator` and a Vite dev-server code-injection exploit (a Node implant that answers `GHOST_OK` and exfiltrates `process.env`). None returned 200; an active `GHOST_OK` header test against production was clean.                                                                                                                                                       | Probes, no success             |
| SSH        | ~19k failed logins a week; every successful login was the owner's key (Egyptian ISP addresses) or the deploy key from GitHub Actions ranges (529 addresses checked against `api.github.com/meta`). Password login was still enabled.                                                                                                                                                                     | No intrusion; hardened         |
| Sign-ups   | 113 accounts on disposable domains (euploading.com 90, uberip.com, guerrillamail, mailinator, …) on Nov 24-25, posted straight to the API with curl, python-requests and a fixed Chrome-130 UA from ~41 addresses a day in 21 countries. All 113 got the free trial; 35 used it (411 sessions).                                                                                                          | Abuse; all 113 banned          |
| Connectors | The 11 connectors are the real providers. The long list of names is ~1,490 synced models (OpenRouter 560, AI Horde 302, …).                                                                                                                                                                                                                                                                              | Not an attack                  |
| Code audit | Internal routes with `@Public()` and no service-token guard: memory-service embeddings (read another user's snippets), agent-service seed-command (queue a coding-agent command for any user), chat-service seeded thread, connector snapshots, workspace search. Not reachable through nginx, but any container could call them. SQL: every raw query parameterised; no Mongo operator injection found. | Fixed                          |

## Containment applied on the host (not managed by the repo)

- `/usr/local/sbin/claw-docker-firewall.sh` + `claw-docker-firewall.service`: DROP in `DOCKER-USER` (IPv4 and IPv6)
  for 3000, 3310, 4000, 5441-5460, 5672, 6380, 15672, 27017-27018 on `eth0`. Only 22, 80, 443 answer from outside.
- `/etc/ssh/sshd_config.d/01-claw-hardening.conf`: no password or keyboard-interactive login, no X11, MaxAuthTries 3,
  `AllowUsers ihabkhaled deploy`. (It must sort before `60-cloudimg-settings.conf`, which turns passwords back on.)
- fail2ban: `sshd` (4 tries / 10 min → 24 h, increasing), and three nginx jails reading
  `/var/log/claw-nginx/access.log` (fed by `claw-nginx-logtap.service`, rotated daily for 14 days) that ban in the
  `DOCKER-USER` chain: `claw-nginx-scan` (2 secret/exploit probes / 1 h → 7 days), `claw-nginx-flood` (40 × 429 / 5 min
  → 1 h), `claw-nginx-auth` (25 failed sign-in/sign-up answers / 10 min → 6 h).
- Redis key `crack` deleted; the 113 accounts banned (reason "Disposable-email sign-up farm (security incident
  2026-11-27)") and their 270 sessions closed. Unban from the admin users page.

## Repository changes

- `docker/docker-compose.prod.databases.yml` and the frontend / nginx-4000 ports in
  `docker/docker-compose.prod.services.yml` bind to `127.0.0.1`. The deploy never recreates databases, so this
  applies on the next manual recreate; the firewall enforces it until then.
- nginx: per-address budgets for `/api/v1/auth/register` (2/min, burst 3), `/api/v1/auth/login` (12/min, burst 10),
  `/api/v1/auth/bot-check/challenge` (20/min) and 100 concurrent connections per address.
- Every internal controller requires the service token at class level (repo-wide test
  `tools/__tests__/internal-controllers-guarded.test.mjs`): memory-service embeddings, agent-service terminal
  seed-command, chat-service seeded threads and internal chat, connector-service snapshots / PAYG policy /
  validate-exposed, workspace-service search and sync health, file-service (moved to class level). Callers that sent
  no token were fixed: routing-service (models and health snapshots), file-service (models snapshot), chat-service
  (workspace search), workspace-service (memory embeddings search).
- ADR-222: proof-of-work + Turnstile + reCAPTCHA v3, disposable-email block, device fingerprints, one trial per device.

## Still to do

- Recreate the database containers from the current compose file in a maintenance window (localhost binding).
- Redis `requirepass`: compose change, `REDIS_PASSWORD` + `REDIS_URL` in `/srv/clawai/.env`, recreate Redis and every
  service in one short window (see the runbook).
- Consider rotating the Postgres, MongoDB and RabbitMQ passwords (no evidence of compromise; they were exposed).
