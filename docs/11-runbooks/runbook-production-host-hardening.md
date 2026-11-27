# Runbook: production host hardening (after the 2026-11-27 incident)

Report: [incident-2026-11-27](../security/incident-2026-11-27-open-ports-and-signup-farm.md).

Docker publishes container ports on `0.0.0.0` and inserts its own iptables rules, so `ufw` and the `INPUT` chain do
not protect containers. Everything below lives on the host, outside the repository; re-apply it on a new server.

## 1. Only 22, 80 and 443 are public

- `/usr/local/sbin/claw-docker-firewall.sh` inserts `DROP` rules into `DOCKER-USER` (IPv4 and IPv6) for traffic on
  `eth0` to 3000, 3310, 4000, 5441-5460, 5672, 6380, 15672, 27017-27018. Idempotent.
- `claw-docker-firewall.service` (oneshot, after `docker.service`) runs it at boot.
- Check from OUTSIDE the server (not over SSH on it):
  `for p in 3000 5441 6380 15672 27018; do timeout 4 bash -c "echo > /dev/tcp/92.205.176.113/$p" && echo OPEN $p; done`
  must print nothing.
- Port values in `/srv/clawai/.env` are bare numbers (`PG_THREADS_PORT=5458`): the compose files add `127.0.0.1:`.
  A value that already carries a host (`127.0.0.1:5458`) makes `docker compose` refuse every file ("invalid IP
  address: 127.0.0.1:127.0.0.1") and the deploy stops before building anything.
- A new published port needs either an nginx route (preferred) or a line in that script. The compose files bind
  internal ports to `127.0.0.1`; the database containers take that binding only when recreated (the deploy never
  recreates databases).

## 2. SSH

`/etc/ssh/sshd_config.d/01-claw-hardening.conf`: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
`PermitRootLogin no`, `X11Forwarding no`, `MaxAuthTries 3`, `LoginGraceTime 30`, `AllowUsers ihabkhaled deploy`.
The name must sort before `60-cloudimg-settings.conf` (the first value wins and that file enables passwords).
After editing: `sudo sshd -t && sudo systemctl reload ssh`, then open a NEW session before closing the old one.

## 3. fail2ban

- `sshd` jail: 4 tries / 10 min → 24 h, increasing.
- `claw-nginx-logtap.service` copies `docker logs -f claw-nginx` to `/var/log/claw-nginx/access.log`
  (logrotate daily, 14 days, `copytruncate`).
- Jails on that file ban in `DOCKER-USER` (`banaction = iptables-allports`, `chain = DOCKER-USER`; web traffic is
  forwarded, an `INPUT` ban would not stop it):
  - `claw-nginx-scan`: 2 probes for `.env`, `.git`, `wp-*`, `actuator`, `@id/__vite`, … in 1 h → 7 days.
  - `claw-nginx-flood`: 40 × HTTP 429 in 5 min → 1 h.
  - `claw-nginx-auth`: 25 failed sign-in / sign-up / bot-check answers in 10 min → 6 h.
- Status: `sudo fail2ban-client status claw-nginx-scan`. Unban: `sudo fail2ban-client set <jail> unbanip <ip>`.
- Test a filter: `sudo fail2ban-regex /var/log/claw-nginx/access.log /etc/fail2ban/filter.d/claw-nginx-scan.conf`.

## 4. Redis password (one short window, ~2 min)

1. Generate: `openssl rand -hex 24`.
2. In `/srv/clawai/.env` (the live one, owned by `deploy`): `REDIS_PASSWORD=<value>` and
   `REDIS_URL=redis://:<value>@redis:6379`.
3. Recreate Redis from the live compose: `cd /srv/clawai && docker compose --env-file .env -p claw -f
docker/docker-compose.prod.databases.yml up -d redis` and wait for `healthy`.
4. Recreate every service that reads `REDIS_URL` with the new env (no rebuild):
   `docker compose --env-file .env -p claw -f docker/docker-compose.prod.databases.yml -f
docker/docker-compose.prod.services.yml up -d --no-build --no-deps <services>`.
5. Verify: `docker exec claw-redis redis-cli ping` answers `NOAUTH`; the site and `/api/v1/health` answer 200;
   `docker logs --since 2m claw-auth-service | grep -i redis` shows no errors.

## 5. Recurring checks

- `sudo journalctl -u ssh --since "1 day ago" | grep Accepted` — only `ihabkhaled` (owner) and `deploy` (GitHub
  Actions ranges from `api.github.com/meta`).
- `docker exec claw-redis redis-cli --scan | grep -vE '^(quota|display-fx|claw:)'` — no unexpected keys.
- Sign-ups by email domain per day (auth DB `users`): a spike on one unknown domain is a farm.
